import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import { mkdtempSync, rmSync, readFileSync, writeFileSync, existsSync, utimesSync } from 'fs'
import { tmpdir } from 'os'
import { join } from 'path'
import { defaultAppData } from '@shared/seed'
import type { AppData } from '@shared/types'
import type { AppDataPersistence } from '@core/app-data-file'

let dir: string

async function freshStore() {
  const { Store } = await import('@core/persistence')
  return new Store()
}

beforeEach(() => {
  dir = mkdtempSync(join(tmpdir(), 'loop-store-'))
  process.env.LOOP_DATA_DIR = dir
})

afterEach(() => {
  delete process.env.LOOP_DATA_DIR
  rmSync(dir, { recursive: true, force: true })
})

function aRun(id: string, status: 'running' | 'success' | 'failed', start: string) {
  return {
    id,
    routineId: 'rt-1',
    start,
    durationSec: null,
    status,
    costUsd: null,
    tokens: null,
    summary: '',
    changes: [],
    transcript: []
  }
}

describe('Store', () => {
  it('supports an in-memory persistence adapter', async () => {
    const { Store } = await import('@core/persistence')
    let data = defaultAppData()
    const persistence: AppDataPersistence = {
      load: () => structuredClone(data),
      reloadIfChanged: (current) => current,
      save: (next: AppData) => {
        data = structuredClone(next)
      }
    }
    const store = new Store(persistence)

    store.setTweaks({ accent: '#123456' })

    expect(data.tweaks.accent).toBe('#123456')
  })

  it('migrates legacy routines and settings to Claude defaults', async () => {
    writeFileSync(
      join(dir, 'loop-data.json'),
      JSON.stringify({
        version: 1,
        routines: [
          {
            id: 'legacy',
            name: 'Legacy routine',
            prompt: 'Do it',
            dir: '~',
            model: 'sonnet',
            enabled: true,
            schedule: { freq: 'daily', time: '09:00', days: [], everyHours: 0 }
          }
        ],
        runs: [],
        tweaks: {},
        settings: { daemonEnabled: false }
      })
    )
    const store = await freshStore()
    expect(store.getRoutine('legacy')?.agent).toBe('claude')
    expect(store.getSettings().defaultAgent).toBe('claude')
  })

  it('writes valid JSON atomically and reloads it', async () => {
    const store = await freshStore()
    store.addRun(aRun('run-1', 'success', new Date().toISOString()))
    const onDisk = JSON.parse(readFileSync(join(dir, 'loop-data.json'), 'utf-8'))
    expect(onDisk.runs.find((r: { id: string }) => r.id === 'run-1')).toBeTruthy()
  })

  it('fires onChange listeners on every mutation (the live-refresh mechanism)', async () => {
    const store = await freshStore()
    let calls = 0
    const unsub = store.onChange(() => calls++)
    store.addRun(aRun('run-1', 'running', new Date().toISOString()))
    store.updateRun('run-1', { status: 'success' })
    store.setTweaks({ accent: '#fff' })
    expect(calls).toBe(3)
    unsub()
    store.setTweaks({ accent: '#000' })
    expect(calls).toBe(3)
  })

  it('reloads data written by another process before reads', async () => {
    const store = await freshStore()
    const file = join(dir, 'loop-data.json')
    const external = JSON.parse(readFileSync(file, 'utf-8')) as AppData
    external.tweaks.accent = '#fedcba'
    writeFileSync(file, JSON.stringify(external), 'utf-8')
    const future = new Date(Date.now() + 1000)
    utimesSync(file, future, future)

    expect(store.getTweaks().accent).toBe('#fedcba')
  })

  it('reconcileStaleRuns fails only runs older than the cutoff', async () => {
    const store = await freshStore()
    const now = Date.now()
    store.addRun(aRun('old', 'running', new Date(now - 3 * 3600_000).toISOString()))
    store.addRun(aRun('fresh', 'running', new Date(now - 60_000).toISOString()))
    const cleaned = store.reconcileStaleRuns(2 * 3600_000)
    expect(cleaned).toBe(1)
    expect(store.getRun('old')?.status).toBe('failed')
    expect(store.getRun('fresh')?.status).toBe('running')
  })

  it('recovers from a corrupt data file via backup', async () => {
    const store = await freshStore()
    store.setTweaks({ accent: '#abcabc' })
    store.setTweaks({ density: 'compact' })
    writeFileSync(join(dir, 'loop-data.json'), '{ not json', 'utf-8')
    const store2 = await freshStore()
    expect(store2.getTweaks().accent).toBe('#abcabc')
    expect(existsSync(join(dir, 'loop-data.json'))).toBe(true)
  })
})
