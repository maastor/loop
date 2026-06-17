import { afterEach, describe, expect, it } from 'vitest'
import { chmodSync, mkdtempSync, rmSync, writeFileSync } from 'fs'
import { tmpdir } from 'os'
import { join } from 'path'
import {
  buildCodexArgs,
  codexErrorMessage,
  codexPermissionArgs,
  resolveCodexCommand,
  runCodex
} from '@core/codex-runner'
import { createCodexTranscriptCollector } from '@core/codex-transcript'

const tempDirs: string[] = []

afterEach(() => {
  delete process.env.LOOP_CODEX_BIN
  for (const dir of tempDirs.splice(0)) {
    rmSync(dir, { recursive: true, force: true })
  }
})

function fakeCodex(body: string): { command: string; cwd: string } {
  const cwd = mkdtempSync(join(tmpdir(), 'loop-codex-test-'))
  tempDirs.push(cwd)
  const command = join(cwd, 'codex')
  writeFileSync(command, `#!/bin/sh\n${body}\n`)
  chmodSync(command, 0o755)
  return { command, cwd }
}

describe('Codex runner', () => {
  it('maps shared permission modes to Codex sandbox levels', () => {
    expect(codexPermissionArgs('bypass')).toEqual(['--dangerously-bypass-approvals-and-sandbox'])
    expect(codexPermissionArgs('acceptEdits')).toEqual(['--sandbox', 'workspace-write'])
    expect(codexPermissionArgs('default')).toEqual(['--sandbox', 'read-only'])
  })

  it('builds an unattended JSONL command with the selected model', () => {
    expect(
      buildCodexArgs({
        prompt: 'Inspect the repo',
        dir: '~',
        model: 'gpt-5.5',
        permissionMode: 'acceptEdits'
      })
    ).toEqual([
      'exec',
      '--json',
      '--model',
      'gpt-5.5',
      '--skip-git-repo-check',
      '--ephemeral',
      '--sandbox',
      'workspace-write',
      'Inspect the repo'
    ])
  })

  it('honors an existing LOOP_CODEX_BIN override', () => {
    process.env.LOOP_CODEX_BIN = process.execPath
    expect(resolveCodexCommand()).toBe(process.execPath)
  })

  it('extracts a readable message from Codex JSON errors on stderr', () => {
    expect(
      codexErrorMessage('{"type":"error","status":400,"error":{"message":"Unsupported model"}}')
    ).toBe('Unsupported model')
  })

  it('collects messages, tools, file changes, tokens, and final summary', () => {
    const collector = createCodexTranscriptCollector('Do work')
    collector.handleEvent({
      type: 'item.completed',
      item: { type: 'command_execution', command: 'git commit -m done', aggregated_output: 'ok' }
    })
    collector.handleEvent({
      type: 'item.completed',
      item: { type: 'file_change', changes: [{ path: 'src/app.ts', kind: 'update' }] }
    })
    collector.handleEvent({
      type: 'item.completed',
      item: { type: 'agent_message', text: 'Finished the task.' }
    })
    collector.handleEvent({
      type: 'turn.completed',
      usage: { input_tokens: 100, cached_input_tokens: 40, output_tokens: 25 }
    })

    expect(collector.finalSummary).toBe('Finished the task.')
    expect(collector.tokens).toBe(125)
    expect(collector.changes).toEqual([
      { t: 'commit', x: 'commit -m done' },
      { t: 'edit', x: 'src/app.ts' }
    ])
    expect(collector.transcript).toContainEqual({ role: 'assistant', text: 'Finished the task.' })
  })

  it('turns Codex error events into failed transcript state', () => {
    const collector = createCodexTranscriptCollector('Do work')
    collector.handleEvent({ type: 'turn.failed', error: { message: 'Unknown model' } })
    expect(collector.isError).toBe(true)
    expect(collector.finalSummary).toBe('Unknown model')
    expect(collector.transcript.at(-1)).toEqual({
      role: 'result',
      text: 'Unknown model',
      err: true
    })
  })

  it('returns a failed run for malformed JSON output', async () => {
    const { command, cwd } = fakeCodex("printf 'not-json\\n'")
    process.env.LOOP_CODEX_BIN = command
    const result = await runCodex({ prompt: 'Do work', dir: cwd, model: 'gpt-5.5' })
    expect(result.status).toBe('failed')
    expect(result.summary).toContain('malformed JSON')
  })

  it('returns a failed run for CLI errors such as an invalid model', async () => {
    const { command, cwd } = fakeCodex("echo 'Unknown model gpt-nope' >&2; exit 1")
    process.env.LOOP_CODEX_BIN = command
    const result = await runCodex({ prompt: 'Do work', dir: cwd, model: 'gpt-nope' })
    expect(result.status).toBe('failed')
    expect(result.summary).toContain('Unknown model gpt-nope')
  })

  it('returns a failed run when the configured executable is missing', async () => {
    const cwd = mkdtempSync(join(tmpdir(), 'loop-codex-test-'))
    tempDirs.push(cwd)
    process.env.LOOP_CODEX_BIN = join(cwd, 'missing-codex')
    const result = await runCodex({ prompt: 'Do work', dir: cwd, model: 'gpt-5.5' })
    expect(result.status).toBe('failed')
    expect(result.summary).toContain('ENOENT')
  })
})
