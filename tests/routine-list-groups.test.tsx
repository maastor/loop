import { describe, expect, it } from 'vitest'
import { buildRoutineGroups, projectLabel } from '@renderer/screens/routine-list-groups'
import type { Routine, Run } from '@shared/types'

const now = new Date(2026, 5, 16, 8, 0, 0)

function routine(patch: Partial<Routine> & { id: string; name: string }): Routine {
  return {
    prompt: 'prompt',
    dir: '~/loop',
    model: 'sonnet',
    enabled: true,
    schedule: { freq: 'daily', time: '09:00', days: [], everyHours: 0 },
    ...patch
  }
}

function run(patch: Partial<Run> & { id: string; routineId: string; start: string }): Run {
  return {
    durationSec: 10,
    status: 'success',
    costUsd: null,
    tokens: null,
    summary: '',
    changes: [],
    transcript: [],
    ...patch
  }
}

function groupNames(groups: ReturnType<typeof buildRoutineGroups>): string[][] {
  return groups.map((group) => group.routines.map((r) => r.name))
}

describe('routine list grouping', () => {
  it('uses only the last directory segment as the project label', () => {
    expect(projectLabel('/Users/me/work/loop/')).toBe('loop')
    expect(projectLabel('~/code/loop')).toBe('loop')
    expect(projectLabel('~')).toBe('Home')
    expect(projectLabel('   ')).toBe('Unknown project')
  })

  it('groups by project label derived from the last directory segment', () => {
    const groups = buildRoutineGroups({
      routines: [
        routine({ id: 'a', name: 'Alpha', dir: '/Users/me/work/app' }),
        routine({ id: 'b', name: 'Beta', dir: '/tmp/app/' }),
        routine({ id: 'c', name: 'Gamma', dir: '/Users/me/work/site' })
      ],
      runsByRoutine: {},
      now,
      groupBy: 'project',
      sortBy: 'name'
    })

    expect(groups.map((group) => [group.label, group.routines.length])).toEqual([
      ['app', 2],
      ['site', 1]
    ])
  })

  it('groups by operational status with latest-run precedence', () => {
    const groups = buildRoutineGroups({
      routines: [
        routine({ id: 'running', name: 'Running routine' }),
        routine({ id: 'failed', name: 'Failed routine' }),
        routine({ id: 'active', name: 'Active routine' }),
        routine({ id: 'paused', name: 'Paused routine', enabled: false }),
        routine({ id: 'never', name: 'Never routine' })
      ],
      runsByRoutine: {
        running: [
          run({
            id: 'old-success',
            routineId: 'running',
            start: '2026-06-15T08:00:00.000Z'
          }),
          run({
            id: 'new-running',
            routineId: 'running',
            status: 'running',
            start: '2026-06-16T08:00:00.000Z'
          })
        ],
        failed: [
          run({
            id: 'failed-run',
            routineId: 'failed',
            status: 'failed',
            start: '2026-06-16T07:00:00.000Z'
          })
        ],
        active: [
          run({
            id: 'active-run',
            routineId: 'active',
            start: '2026-06-16T06:00:00.000Z'
          })
        ],
        paused: [
          run({
            id: 'paused-run',
            routineId: 'paused',
            start: '2026-06-16T05:00:00.000Z'
          })
        ]
      },
      now,
      groupBy: 'status',
      sortBy: 'name'
    })

    expect(groups.map((group) => group.label)).toEqual([
      'Running',
      'Needs attention',
      'Active',
      'Paused',
      'Never ran'
    ])
    expect(groupNames(groups)).toEqual([
      ['Running routine'],
      ['Failed routine'],
      ['Active routine'],
      ['Paused routine'],
      ['Never routine']
    ])
  })
})

describe('routine list sorting', () => {
  it('sorts by next run and places routines without a next run last', () => {
    const groups = buildRoutineGroups({
      routines: [
        routine({
          id: 'late',
          name: 'Late',
          schedule: { freq: 'daily', time: '23:00', days: [], everyHours: 0 }
        }),
        routine({ id: 'paused', name: 'Paused', enabled: false }),
        routine({
          id: 'early',
          name: 'Early',
          schedule: { freq: 'daily', time: '22:00', days: [], everyHours: 0 }
        })
      ],
      runsByRoutine: {},
      now,
      groupBy: 'none',
      sortBy: 'nextRun'
    })

    expect(groupNames(groups)).toEqual([['Early', 'Late', 'Paused']])
  })

  it('sorts by latest run and places routines that never ran last', () => {
    const groups = buildRoutineGroups({
      routines: [
        routine({ id: 'never', name: 'Never' }),
        routine({ id: 'old', name: 'Old' }),
        routine({ id: 'new', name: 'New' })
      ],
      runsByRoutine: {
        old: [run({ id: 'old-run', routineId: 'old', start: '2026-06-15T08:00:00.000Z' })],
        new: [run({ id: 'new-run', routineId: 'new', start: '2026-06-16T08:00:00.000Z' })]
      },
      now,
      groupBy: 'none',
      sortBy: 'lastRun'
    })

    expect(groupNames(groups)).toEqual([['New', 'Old', 'Never']])
  })
})
