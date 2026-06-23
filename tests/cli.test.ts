import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { mkdtempSync, rmSync, readFileSync } from 'fs'
import { tmpdir } from 'os'
import { join } from 'path'
import type { AppData } from '@shared/types'
import { routinesCommand } from '../src/cli/commands/routines'
import { runsCommand } from '../src/cli/commands/runs'
import { settingsCommand, tweaksCommand } from '../src/cli/commands/config'
import { scheduleCommand } from '../src/cli/commands/schedule'

let dir: string

beforeEach(() => {
  dir = mkdtempSync(join(tmpdir(), 'loop-cli-'))
  process.env.LOOP_DATA_DIR = dir
})

afterEach(() => {
  delete process.env.LOOP_DATA_DIR
  rmSync(dir, { recursive: true, force: true })
})

// Commands print results via process.stdout.write; capture and parse the single JSON doc.
async function run(fn: () => Promise<void>): Promise<unknown> {
  let out = ''
  const spy = vi.spyOn(process.stdout, 'write').mockImplementation((chunk: unknown) => {
    out += String(chunk)
    return true
  })
  try {
    await fn()
  } finally {
    spy.mockRestore()
  }
  return out.trim() ? JSON.parse(out) : undefined
}

function onDisk(): AppData {
  return JSON.parse(readFileSync(join(dir, 'loop-data.json'), 'utf-8'))
}

type RoutineOut = { id: string; name: string; enabled: boolean; agent: string }

async function createSample(): Promise<string> {
  const created = (await run(() =>
    routinesCommand([
      'create',
      '--name',
      'Test routine',
      '--dir',
      '~/proj',
      '--agent',
      'claude',
      '--model',
      'sonnet',
      '--schedule',
      'every day at 9am',
      '--prompt',
      'Do the thing'
    ])
  )) as RoutineOut
  return created.id
}

describe('routines command', () => {
  it('creates a routine with a generated id and persists it', async () => {
    const id = await createSample()
    expect(id).toMatch(/^rt-/)
    expect(onDisk().routines.find((r) => r.id === id)?.name).toBe('Test routine')
  })

  it('defaults enabled to true and parses the schedule', async () => {
    const id = await createSample()
    const got = (await run(() => routinesCommand(['get', id]))) as {
      enabled: boolean
      schedule: { freq: string; time: string }
    }
    expect(got.enabled).toBe(true)
    expect(got.schedule).toEqual({ freq: 'daily', time: '09:00', days: [], everyHours: 0 })
  })

  it('requires a prompt on create', async () => {
    await expect(
      run(() =>
        routinesCommand([
          'create',
          '--name',
          'No prompt',
          '--dir',
          '~',
          '--agent',
          'claude',
          '--model',
          'sonnet',
          '--schedule',
          'every day at 9am'
        ])
      )
    ).rejects.toThrow(/prompt/)
  })

  it('rejects an invalid agent', async () => {
    await expect(
      run(() =>
        routinesCommand([
          'create',
          '--name',
          'Bad agent',
          '--dir',
          '~',
          '--agent',
          'gpt',
          '--model',
          'x',
          '--schedule',
          'every day at 9am',
          '--prompt',
          'p'
        ])
      )
    ).rejects.toThrow(/--agent/)
  })

  it('updates only the provided fields', async () => {
    const id = await createSample()
    const updated = (await run(() =>
      routinesCommand(['update', id, '--name', 'Renamed', '--enabled', 'false'])
    )) as RoutineOut
    expect(updated.name).toBe('Renamed')
    expect(updated.enabled).toBe(false)
    // Untouched field preserved.
    expect(onDisk().routines.find((r) => r.id === id)?.agent).toBe('claude')
  })

  it('enable / disable / toggle flip the flag', async () => {
    const id = await createSample()
    expect(((await run(() => routinesCommand(['disable', id]))) as RoutineOut).enabled).toBe(false)
    expect(((await run(() => routinesCommand(['enable', id]))) as RoutineOut).enabled).toBe(true)
    expect(((await run(() => routinesCommand(['toggle', id]))) as RoutineOut).enabled).toBe(false)
  })

  it('filters list by enabled state and agent', async () => {
    await createSample() // enabled claude
    const enabled = (await run(() => routinesCommand(['list', '--enabled']))) as RoutineOut[]
    expect(enabled.every((r) => r.enabled)).toBe(true)
    expect(enabled.some((r) => r.name === 'Test routine')).toBe(true)
  })

  it('deletes a routine; subsequent get fails', async () => {
    const id = await createSample()
    await run(() => routinesCommand(['delete', id]))
    expect(onDisk().routines.find((r) => r.id === id)).toBeUndefined()
    await expect(run(() => routinesCommand(['get', id]))).rejects.toThrow(/no routine/)
  })

  it('reads a prompt from --prompt-file', async () => {
    const file = join(dir, 'prompt.txt')
    const { writeFileSync } = await import('fs')
    writeFileSync(file, 'prompt from file')
    const created = (await run(() =>
      routinesCommand([
        'create',
        '--name',
        'File prompt',
        '--dir',
        '~',
        '--agent',
        'claude',
        '--model',
        'sonnet',
        '--schedule',
        'every day at 9am',
        '--prompt-file',
        file
      ])
    )) as { id: string }
    expect(onDisk().routines.find((r) => r.id === created.id)?.prompt).toBe('prompt from file')
  })
})

describe('runs command', () => {
  it('lists an empty array before any runs', async () => {
    expect(await run(() => runsCommand(['list']))).toEqual([])
  })

  it('fails for an unknown run id', async () => {
    await expect(run(() => runsCommand(['get', 'missing']))).rejects.toThrow(/no run/)
  })
})

describe('settings + tweaks commands', () => {
  it('round-trips settings', async () => {
    await run(() =>
      settingsCommand(['set', '--default-agent', 'codex', '--run-timeout-minutes', '5'])
    )
    const got = (await run(() => settingsCommand(['get']))) as {
      defaultAgent: string
      runTimeoutMinutes: number
    }
    expect(got.defaultAgent).toBe('codex')
    expect(got.runTimeoutMinutes).toBe(5)
  })

  it('rejects an empty settings set', async () => {
    await expect(run(() => settingsCommand(['set']))).rejects.toThrow(/no settings/)
  })

  it('round-trips tweaks', async () => {
    await run(() => tweaksCommand(['set', '--accent', '#abcdef', '--layout', 'table']))
    const got = (await run(() => tweaksCommand(['get']))) as { accent: string; layout: string }
    expect(got.accent).toBe('#abcdef')
    expect(got.layout).toBe('table')
  })
})

describe('schedule command', () => {
  it('parses natural language into a Schedule with a description', async () => {
    const result = (await run(() => scheduleCommand(['parse', 'every 3 hours']))) as {
      schedule: { freq: string; everyHours: number }
      description: string
    }
    expect(result.schedule).toEqual({ freq: 'hourly', everyHours: 3, time: '00:00', days: [] })
    expect(result.description).toBe('Every 3 hours')
  })

  it('fails on unparseable input', async () => {
    await expect(run(() => scheduleCommand(['parse', 'sometime maybe']))).rejects.toThrow(/parse/)
  })
})
