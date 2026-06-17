import { spawn } from 'child_process'
import { existsSync } from 'fs'
import { homedir } from 'os'
import { join } from 'path'
import type { PermissionMode } from '@shared/types'
import { expandHome } from './paths'
import type { AgentRunOptions, RunCallbacks, RunResult } from './agent-runner'
import { type CodexEvent, createCodexTranscriptCollector } from './codex-transcript'

export function resolveCodexCommand(): string {
  if (process.env.LOOP_CODEX_BIN) {
    return process.env.LOOP_CODEX_BIN
  }
  const candidates = [
    join(homedir(), '.local', 'bin', 'codex'),
    '/opt/homebrew/bin/codex',
    '/usr/local/bin/codex'
  ]
  return candidates.find(existsSync) ?? 'codex'
}

function buildEnv(): NodeJS.ProcessEnv {
  const extra = [
    join(homedir(), '.local', 'bin'),
    '/opt/homebrew/bin',
    '/usr/local/bin',
    '/usr/bin',
    '/bin'
  ]
  const current = process.env.PATH ? process.env.PATH.split(':') : []
  return { ...process.env, PATH: Array.from(new Set([...current, ...extra])).join(':') }
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null
}

export function codexErrorMessage(stderr: string): string {
  const lines = stderr.trim().split('\n')
  for (const line of lines.toReversed()) {
    try {
      const event: unknown = JSON.parse(line)
      if (!isRecord(event)) {
        continue
      }
      const error = event.error
      if (isRecord(error) && typeof error.message === 'string') {
        return error.message
      }
      if (typeof event.message === 'string') {
        return event.message
      }
    } catch {
      /* fall through to plain stderr */
    }
  }
  return lines.slice(-3).join(' ').slice(0, 240)
}

export function codexPermissionArgs(mode: PermissionMode): string[] {
  switch (mode) {
    case 'bypass':
      return ['--dangerously-bypass-approvals-and-sandbox']
    case 'acceptEdits':
      return ['--sandbox', 'workspace-write']
    case 'default':
      return ['--sandbox', 'read-only']
  }
}

export function buildCodexArgs(opts: AgentRunOptions): string[] {
  return [
    'exec',
    '--json',
    '--model',
    opts.model || 'gpt-5.5',
    '--skip-git-repo-check',
    '--ephemeral',
    ...codexPermissionArgs(opts.permissionMode ?? 'bypass'),
    opts.prompt
  ]
}

export function runCodex(opts: AgentRunOptions, cb: RunCallbacks = {}): Promise<RunResult> {
  return new Promise<RunResult>((resolve) => {
    const cwd = expandHome(opts.dir)
    const startedAt = Date.now()
    const collector = createCodexTranscriptCollector(opts.prompt, cb.onTranscript)

    if (!existsSync(cwd)) {
      const summary = `Working directory not found: ${cwd}`
      collector.push({ role: 'result', text: summary, err: true })
      resolve({
        status: 'failed',
        durationSec: 0,
        costUsd: null,
        tokens: null,
        summary: `Run failed — ${summary}`,
        changes: [],
        transcript: collector.transcript
      })
      return
    }

    const child = spawn(resolveCodexCommand(), buildCodexArgs(opts), { cwd, env: buildEnv() })
    let buffer = ''
    let stderr = ''
    let timedOut = false
    let malformedOutput = false
    let finished = false

    child.stdin?.end()

    let timer: NodeJS.Timeout | null = null
    if (opts.timeoutMs && opts.timeoutMs > 0) {
      timer = setTimeout(() => {
        timedOut = true
        collector.push({
          role: 'result',
          text: `Run timed out after ${Math.round(opts.timeoutMs! / 60000)}m`,
          err: true
        })
        child.kill('SIGTERM')
        setTimeout(() => child.kill('SIGKILL'), 5000)
      }, opts.timeoutMs)
    }

    const processLine = (line: string): void => {
      const trimmed = line.trim()
      if (!trimmed) {
        return
      }
      try {
        collector.handleEvent(JSON.parse(trimmed) as CodexEvent)
      } catch {
        malformedOutput = true
      }
    }

    child.stdout.on('data', (chunk: Buffer) => {
      buffer += chunk.toString('utf-8')
      let idx: number
      while ((idx = buffer.indexOf('\n')) !== -1) {
        processLine(buffer.slice(0, idx))
        buffer = buffer.slice(idx + 1)
      }
    })
    child.stderr.on('data', (chunk: Buffer) => {
      stderr += chunk.toString('utf-8')
    })

    const finish = (code: number | null): void => {
      if (finished) {
        return
      }
      finished = true
      if (timer) {
        clearTimeout(timer)
      }
      processLine(buffer)
      const failed = timedOut || malformedOutput || collector.isError || code !== 0
      let summary = collector.finalSummary.replace(/\n{3,}/g, '\n\n').trim()
      if (!summary) {
        summary = codexErrorMessage(stderr)
      }
      if (!summary) {
        summary = failed ? 'Codex run failed.' : 'Completed — see transcript for details.'
      }
      if (malformedOutput) {
        summary = 'Codex returned malformed JSON output.'
        collector.push({ role: 'result', text: summary, err: true })
      }
      resolve({
        status: failed ? 'failed' : 'success',
        durationSec: Math.round((Date.now() - startedAt) / 1000),
        costUsd: null,
        tokens: collector.tokens,
        summary: failed ? `Run failed — ${summary}` : summary,
        changes: collector.changes,
        transcript: collector.transcript
      })
    }

    child.on('error', (error) => {
      collector.push({ role: 'result', text: `Process error: ${error.message}`, err: true })
      stderr = error.message
      finish(1)
    })
    child.on('close', finish)
  })
}
