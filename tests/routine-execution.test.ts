import { describe, expect, it } from 'vitest'
import { createRunningRun, startRoutineExecution } from '@core/routine-execution'
import type { Store } from '@core/persistence'
import type { Routine, Run } from '@shared/types'

const routine: Routine = {
  id: 'rt-1',
  name: 'Test',
  prompt: 'Do work',
  dir: '~/work',
  agent: 'claude',
  model: 'sonnet',
  enabled: true,
  schedule: { freq: 'daily', time: '09:00', days: [], everyHours: 0 }
}

function fakeStore() {
  const runs: Run[] = []
  return {
    runs,
    addRun(run: Run) {
      runs.unshift(run)
      return run
    },
    updateRun(id: string, patch: Partial<Run>) {
      const run = runs.find((candidate) => candidate.id === id)
      if (!run) {
        return undefined
      }
      Object.assign(run, patch)
      return run
    }
  }
}

describe('routine execution lifecycle', () => {
  it('creates a scheduled run with its occurrence and initial transcript', () => {
    const run = createRunningRun(routine, 'scheduled', '2026-06-17T09:00:00.000Z')

    expect(run).toMatchObject({
      routineId: routine.id,
      status: 'running',
      trigger: 'scheduled',
      scheduledFor: '2026-06-17T09:00:00.000Z'
    })
    expect(run.transcript).toEqual([
      { role: 'user', text: routine.prompt },
      { role: 'result', text: `Session started in ${routine.dir}` }
    ])
  })

  it('persists immediately and contains executor failures', async () => {
    const store = fakeStore()
    const started = startRoutineExecution(store as unknown as Store, routine, {
      trigger: 'manual',
      execute: async () => {
        throw new Error('boom')
      }
    })

    expect(store.runs).toHaveLength(1)
    expect(started.run.status).toBe('running')
    await expect(started.completion).resolves.toBeUndefined()
    expect(store.runs[0]).toMatchObject({
      status: 'failed',
      durationSec: 0,
      summary: 'Run failed — Error: boom'
    })
  })
})
