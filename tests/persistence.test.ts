import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import { mkdtempSync, rmSync, readFileSync, writeFileSync, existsSync } from 'fs'
import { tmpdir } from 'os'
import { join } from 'path'

// Redirect Store storage to a temp dir BEFORE importing the module that reads paths.
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
    expect(calls).toBe(3) // no longer notified after unsubscribe
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
    store.setTweaks({ accent: '#abcabc' }) // creates a backup of the prior good state
    writeFileSync(join(dir, 'loop-data.json'), '{ not json', 'utf-8')
    const store2 = await freshStore()
    // Should not throw and should yield usable data (from backup or defaults).
    expect(store2.getAll().tweaks).toBeTruthy()
    expect(existsSync(join(dir, 'loop-data.json'))).toBe(true)
  })
})
