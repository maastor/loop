import { computeNextRun } from '@shared/schedule'
import type { Routine, RoutineGroupBy, RoutineSortBy, Run, ScheduleFreq } from '@shared/types'

export type RoutineGroup = {
  id: string
  label: string
  routines: Routine[]
}

const collator = new Intl.Collator(undefined, { sensitivity: 'base' })

const STATUS_GROUPS = [
  { id: 'running', label: 'Running' },
  { id: 'attention', label: 'Needs attention' },
  { id: 'active', label: 'Active' },
  { id: 'paused', label: 'Paused' },
  { id: 'never', label: 'Never ran' }
]

const SCHEDULE_LABELS: Record<ScheduleFreq, string> = {
  hourly: 'Hourly',
  weekdays: 'Weekdays',
  daily: 'Daily',
  weekly: 'Weekly'
}

const SCHEDULE_ORDER: ScheduleFreq[] = ['hourly', 'weekdays', 'daily', 'weekly']

function latestRun(runs: Run[] | undefined): Run | undefined {
  if (!runs || runs.length === 0) {
    return undefined
  }
  return runs.reduce((latest, run) =>
    new Date(run.start).getTime() > new Date(latest.start).getTime() ? run : latest
  )
}

export function projectLabel(dir: string): string {
  const trimmed = dir.trim().replace(/[\\/]+$/, '')
  if (!trimmed) {
    return 'Unknown project'
  }
  if (trimmed === '~') {
    return 'Home'
  }
  const last = trimmed.split(/[\\/]/).filter(Boolean).at(-1)
  if (!last) {
    return 'Unknown project'
  }
  return last === '~' ? 'Home' : last
}

function statusGroup(routine: Routine, runs: Run[] | undefined): string {
  const run = latestRun(runs)
  if (!run) {
    return 'never'
  }
  if (run.status === 'running') {
    return 'running'
  }
  if (run.status === 'failed' || run.status === 'skipped') {
    return 'attention'
  }
  return routine.enabled ? 'active' : 'paused'
}

function groupMeta(
  routine: Routine,
  runsByRoutine: Record<string, Run[]>,
  groupBy: RoutineGroupBy
): { id: string; label: string } {
  if (groupBy === 'project') {
    const label = projectLabel(routine.dir)
    return { id: `project:${label.toLocaleLowerCase()}`, label }
  }
  if (groupBy === 'status') {
    const id = statusGroup(routine, runsByRoutine[routine.id])
    return { id, label: STATUS_GROUPS.find((group) => group.id === id)?.label ?? 'Status' }
  }
  if (groupBy === 'schedule') {
    const label = SCHEDULE_LABELS[routine.schedule.freq]
    return { id: routine.schedule.freq, label }
  }
  return { id: 'all', label: 'All routines' }
}

function nameCompare(a: Routine, b: Routine): number {
  return collator.compare(a.name, b.name)
}

function sortRoutines(
  routines: Routine[],
  runsByRoutine: Record<string, Run[]>,
  now: Date,
  sortBy: RoutineSortBy
): Routine[] {
  return [...routines].sort((a, b) => {
    if (sortBy === 'nextRun') {
      const aNext = a.enabled ? computeNextRun(a.schedule, now)?.getTime() : undefined
      const bNext = b.enabled ? computeNextRun(b.schedule, now)?.getTime() : undefined
      if (aNext !== undefined || bNext !== undefined) {
        if (aNext === undefined) {
          return 1
        }
        if (bNext === undefined) {
          return -1
        }
        if (aNext !== bNext) {
          return aNext - bNext
        }
      }
    }
    if (sortBy === 'lastRun') {
      const aLast = latestRun(runsByRoutine[a.id])?.start
      const bLast = latestRun(runsByRoutine[b.id])?.start
      if (aLast || bLast) {
        if (!aLast) {
          return 1
        }
        if (!bLast) {
          return -1
        }
        const delta = new Date(bLast).getTime() - new Date(aLast).getTime()
        if (delta !== 0) {
          return delta
        }
      }
    }
    return nameCompare(a, b)
  })
}

function groupOrder(a: RoutineGroup, b: RoutineGroup, groupBy: RoutineGroupBy): number {
  if (groupBy === 'status') {
    return (
      STATUS_GROUPS.findIndex((group) => group.id === a.id) -
      STATUS_GROUPS.findIndex((group) => group.id === b.id)
    )
  }
  if (groupBy === 'schedule') {
    return (
      SCHEDULE_ORDER.indexOf(a.id as ScheduleFreq) - SCHEDULE_ORDER.indexOf(b.id as ScheduleFreq)
    )
  }
  if (groupBy === 'none') {
    return 0
  }
  return collator.compare(a.label, b.label)
}

export function buildRoutineGroups({
  routines,
  runsByRoutine,
  now,
  groupBy,
  sortBy
}: {
  routines: Routine[]
  runsByRoutine: Record<string, Run[]>
  now: Date
  groupBy: RoutineGroupBy
  sortBy: RoutineSortBy
}): RoutineGroup[] {
  const groups = new Map<string, RoutineGroup>()
  for (const routine of routines) {
    const meta = groupMeta(routine, runsByRoutine, groupBy)
    const group = groups.get(meta.id) ?? { id: meta.id, label: meta.label, routines: [] }
    group.routines.push(routine)
    groups.set(meta.id, group)
  }
  return [...groups.values()]
    .map((group) => ({
      ...group,
      routines: sortRoutines(group.routines, runsByRoutine, now, sortBy)
    }))
    .sort((a, b) => groupOrder(a, b, groupBy))
}
