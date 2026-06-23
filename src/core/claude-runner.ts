import { spawn } from 'child_process'
import { existsSync } from 'fs'
import { homedir } from 'os'
import { join } from 'path'
import type { PermissionMode } from '@shared/types'
import { expandHome } from './paths'
import { type StreamEvent } from './claude-stream'
import { createTranscriptCollector } from './claude-run-transcript'
import { buildChildEnv } from './process-env'
import type { AgentRunOptions, RunCallbacks, RunResult } from './agent-runner'

// GUI and launchd processes do not inherit the user's shell PATH.
export function resolveClaudeCommand(): string {
  if (process.env.LOOP_CLAUDE_BIN && existsSync(process.env.LOOP_CLAUDE_BIN)) {
    return process.env.LOOP_CLAUDE_BIN
  }
  const candidates = [
    join(homedir(), '.local', 'bin', 'claude'),
    '/opt/homebrew/bin/claude',
    '/usr/local/bin/claude',
    join(homedir(), '.claude', 'local', 'claude')
  ]
  for (const c of candidates) {
    if (existsSync(c)) {
      return c
    }
  }
  return 'claude'
}

// Headless runs have no TTY to answer permission prompts.
export function permissionArgs(mode: PermissionMode): string[] {
  switch (mode) {
    case 'bypass':
      return ['--dangerously-skip-permissions']
    case 'acceptEdits':
      return ['--permission-mode', 'acceptEdits']
    case 'default':
      return ['--permission-mode', 'default']
  }
}

export function runClaude(opts: AgentRunOptions, cb: RunCallbacks = {}): Promise<RunResult> {
  return new Promise<RunResult>((resolve) => {
    const cmd = resolveClaudeCommand()
    const cwd = expandHome(opts.dir)
    const startedAt = Date.now()
    const collector = createTranscriptCollector({
      prompt: opts.prompt,
      onTranscript: cb.onTranscript
    })

    if (!existsSync(cwd)) {
      collector.push({ role: 'result', text: `Working directory not found: ${cwd}`, err: true })
      resolve({
        status: 'failed',
        durationSec: Math.round((Date.now() - startedAt) / 1000),
        costUsd: null,
        tokens: null,
        summary: `Run failed — working directory not found: ${cwd}`,
        changes: [],
        transcript: collector.transcript
      })
      return
    }

    const args = [
      '--print',
      opts.prompt,
      '--output-format',
      'stream-json',
      '--verbose',
      '--model',
      opts.model || 'sonnet',
      ...permissionArgs(opts.permissionMode ?? 'bypass')
    ]

    let child
    try {
      child = spawn(cmd, args, { cwd, env: buildChildEnv() })
    } catch (e) {
      collector.push({ role: 'result', text: `Failed to launch claude: ${String(e)}`, err: true })
      resolve({
        status: 'failed',
        durationSec: Math.round((Date.now() - startedAt) / 1000),
        costUsd: null,
        tokens: null,
        summary: `Run failed — could not launch the claude CLI.`,
        changes: [],
        transcript: collector.transcript
      })
      return
    }

    let buffer = ''
    let stderr = ''
    let timedOut = false

    // Send EOF so an unexpected prompt cannot block forever.
    child.stdin?.end()

    // A stale-row sweep cannot terminate a live hung process; enforce the timeout here.
    let timer: NodeJS.Timeout | null = null
    if (opts.timeoutMs && opts.timeoutMs > 0) {
      timer = setTimeout(() => {
        timedOut = true
        collector.push({
          role: 'result',
          text: `Run timed out after ${Math.round(opts.timeoutMs! / 60000)}m`,
          err: true
        })
        try {
          child.kill('SIGTERM')
        } catch {
          /* already gone */
        }
        setTimeout(() => {
          try {
            child.kill('SIGKILL')
          } catch {
            /* already gone */
          }
        }, 5000)
      }, opts.timeoutMs)
    }

    const processLine = (line: string): void => {
      const trimmed = line.trim()
      if (!trimmed) {
        return
      }
      try {
        collector.handleEvent(JSON.parse(trimmed) as StreamEvent)
      } catch {
        /* ignore non-JSON noise */
      }
    }

    child.stdout.on('data', (chunk: Buffer) => {
      buffer += chunk.toString('utf-8')
      let idx
      while ((idx = buffer.indexOf('\n')) !== -1) {
        const line = buffer.slice(0, idx)
        buffer = buffer.slice(idx + 1)
        processLine(line)
      }
    })

    child.stderr.on('data', (chunk: Buffer) => {
      stderr += chunk.toString('utf-8')
    })

    const finish = (code: number | null): void => {
      if (timer) {
        clearTimeout(timer)
        timer = null
      }
      if (buffer.trim()) {
        processLine(buffer)
      }
      const durationSec = Math.round((Date.now() - startedAt) / 1000)
      const failed = timedOut || collector.isError || (code !== 0 && code !== null)
      // Run detail renders Markdown, so retain line structure while capping blank runs.
      let summary = collector.finalSummary.replace(/\n{3,}/g, '\n\n').trim()
      if (timedOut && !summary) {
        summary = `Timed out after ${Math.round((opts.timeoutMs ?? 0) / 60000)} minutes.`
      }
      if (failed && !summary) {
        summary = stderr.trim().split('\n').slice(-3).join(' ').slice(0, 240) || 'Run failed.'
        collector.push({
          role: 'result',
          text: summary || `claude exited with code ${code}`,
          err: true
        })
      }
      if (!summary) {
        summary = 'Completed — see transcript for details.'
      }
      resolve({
        status: failed ? 'failed' : 'success',
        durationSec,
        costUsd: collector.costUsd,
        tokens: collector.tokens,
        summary: failed ? `Run failed — ${summary}` : summary,
        changes: collector.changes,
        transcript: collector.transcript
      })
    }

    child.on('error', (err) => {
      collector.push({ role: 'result', text: `Process error: ${err.message}`, err: true })
      finish(1)
    })
    child.on('close', (code) => finish(code))
  })
}
