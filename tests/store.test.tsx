import { beforeEach, describe, expect, it, vi } from 'vitest'
import { defaultAppData } from '@shared/seed'
import type { AppData, Run } from '@shared/types'
import { subscribeToDataChanges, useStore } from '../src/renderer/src/store'

function run(id: string, start: string): Run {
  return {
    id,
    routineId: 'rt-1',
    start,
    durationSec: 1,
    status: 'success',
    costUsd: null,
    tokens: null,
    summary: '',
    changes: [],
    transcript: []
  }
}

describe('renderer store bootstrap', () => {
  beforeEach(() => {
    useStore.setState({ loaded: false, loadError: null })
  })

  it('loads one AppData snapshot and sorts its runs', async () => {
    const data: AppData = {
      ...defaultAppData(),
      runs: [run('older', '2026-06-16T10:00:00.000Z'), run('newer', '2026-06-17T10:00:00.000Z')]
    }
    const getData = vi.fn(async () => data)
    ;(globalThis as unknown as { window: { api: unknown } }).window.api = {
      data: { get: getData },
      daemon: { status: async () => ({ installed: true, loaded: true }) }
    }

    await useStore.getState().load()

    expect(getData).toHaveBeenCalledOnce()
    expect(useStore.getState()).toMatchObject({
      runs: [{ id: 'newer' }, { id: 'older' }],
      daemon: { installed: true, loaded: true },
      loaded: true,
      loadError: null
    })
  })

  it('applies snapshots pushed through the data namespace', () => {
    const data = { ...defaultAppData(), routines: [] }
    const unsubscribe = vi.fn()
    const onChanged = vi.fn((listener: (next: AppData) => void) => {
      listener(data)
      return unsubscribe
    })
    ;(globalThis as unknown as { window: { api: unknown } }).window.api = {
      data: { onChanged }
    }

    const result = subscribeToDataChanges()

    expect(onChanged).toHaveBeenCalledOnce()
    expect(useStore.getState().routines).toEqual([])
    expect(result).toBe(unsubscribe)
  })
})
