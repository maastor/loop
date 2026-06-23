import type { Routine, Run, Settings } from '@shared/types'
import { scheduleTimesForDay } from '@shared/schedule'
import type { Store } from './persistence'
import {
  createRunningRun,
  executeRoutine,
  startRoutineExecution,
  type RoutineExecution
} from './routine-execution'

const DEFAULT_TICK_MS = 60_000
// Older persisted settings may omit the grace value; keep this aligned with defaultSettings.
const DEFAULT_GRACE_MIN = 720
// A crashed process must not leave a routine permanently blocked by a running row.
export const STALE_RUN_MS = 2 * 60 * 60 * 1000

function graceMsFor(routine: Routine, settings: Settings): number {
  const min =
    routine.missedRunGraceMinutes ?? settings.defaultMissedRunGraceMinutes ?? DEFAULT_GRACE_MIN
  return min * 60 * 1000
}

// Fourteen days covers every supported weekly schedule while bounding the scan.
export function latestOccurrenceAtOrBefore(routine: Routine, now: Date): Date | null {
  for (let i = 0; i < 14; i++) {
    const day = new Date(now.getFullYear(), now.getMonth(), now.getDate() - i)
    const times = scheduleTimesForDay(routine.schedule, day)
    for (const t of times.slice().reverse()) {
      const [h, m] = t.split(':').map(Number)
      const cand = new Date(day.getFullYear(), day.getMonth(), day.getDate(), h, m)
      if (cand <= now) {
        return cand
      }
    }
  }
  return null
}

export type SchedulerOptions = {
  tickMs?: number
  execute?: RoutineExecution
  onFire?: (routineIds: string[]) => void
  /** Called once a dispatched run finishes (success/failed), with its final persisted row. */
  onRunComplete?: (routine: Routine, run: Run) => void
  log?: (msg: string) => void
}

export class Scheduler {
  private timer: NodeJS.Timeout | null = null
  private readonly tickMs: number
  private readonly execute: RoutineExecution
  private readonly onFire?: (routineIds: string[]) => void
  private readonly onRunComplete?: (routine: Routine, run: Run) => void
  private readonly log: (msg: string) => void
  private inFlight = new Set<string>()

  constructor(
    private store: Store,
    opts: SchedulerOptions = {}
  ) {
    this.tickMs = opts.tickMs ?? DEFAULT_TICK_MS
    this.execute = opts.execute ?? executeRoutine
    this.onFire = opts.onFire
    this.onRunComplete = opts.onRunComplete
    this.log = opts.log ?? (() => {})
  }

  start(): void {
    if (this.timer) {
      return
    }
    this.log(`scheduler start (tick ${this.tickMs}ms)`)
    void this.tick()
    this.timer = setInterval(() => void this.tick(), this.tickMs)
  }

  stop(): void {
    if (this.timer) {
      clearInterval(this.timer)
      this.timer = null
    }
  }

  async tick(now: Date = new Date()): Promise<string[]> {
    const settings = this.store.getSettings()
    if (settings.pausedAll) {
      return []
    }
    const routines = this.store.listRoutines().filter((r) => r.enabled)
    const fired: string[] = []
    let changed = false
    for (const routine of routines) {
      const action = this.evaluate(routine, now, settings)
      if (action === 'fire') {
        fired.push(routine.id)
        changed = true
        void this.dispatch(routine, now)
      } else if (action === 'skip') {
        this.recordSkipped(routine, now, settings)
        changed = true
      }
    }
    if (changed) {
      this.onFire?.(fired)
    }
    return fired
  }

  private evaluate(routine: Routine, now: Date, settings: Settings): 'fire' | 'skip' | 'none' {
    if (this.inFlight.has(routine.id)) {
      return 'none'
    }
    const occ = latestOccurrenceAtOrBefore(routine, now)
    if (!occ) {
      return 'none'
    }
    const occIso = occ.toISOString()
    const runs = this.store.listRuns(routine.id)
    // scheduledFor is the cross-process deduplication key shared with the daemon.
    if (runs.some((r) => r.scheduledFor === occIso)) {
      return 'none'
    }
    // Ignore stale rows left by crashed processes, but do not overlap live runs.
    if (
      runs.some(
        (r) => r.status === 'running' && now.getTime() - new Date(r.start).getTime() < STALE_RUN_MS
      )
    ) {
      return 'none'
    }
    // Persist expired occurrences so history shows the gap and future ticks deduplicate it.
    if (now.getTime() - occ.getTime() > graceMsFor(routine, settings)) {
      return 'skip'
    }
    return 'fire'
  }

  private recordSkipped(routine: Routine, now: Date, settings: Settings): void {
    const occ = latestOccurrenceAtOrBefore(routine, now)
    if (!occ) {
      return
    }
    const graceMin = Math.round(graceMsFor(routine, settings) / 60000)
    const run = createRunningRun(routine, 'scheduled', occ.toISOString())
    run.status = 'skipped'
    run.durationSec = 0
    run.summary = `Skipped — Loop was offline at the scheduled time and the ${graceMin}-minute catch-up window had passed.`
    run.transcript = [
      {
        role: 'result',
        text: `Missed scheduled occurrence ${run.scheduledFor}; not run.`,
        err: true
      }
    ]
    this.store.addRun(run)
    this.log(`skip ${routine.name} (${routine.id}) missed occurrence ${run.scheduledFor}`)
  }

  private async dispatch(routine: Routine, now: Date): Promise<void> {
    this.inFlight.add(routine.id)
    const occ = latestOccurrenceAtOrBefore(routine, now)
    const { run, completion } = startRoutineExecution(this.store, routine, {
      trigger: 'scheduled',
      scheduledFor: occ?.toISOString(),
      execute: this.execute
    })
    this.log(`dispatch ${routine.name} (${routine.id}) for ${run.scheduledFor}`)
    try {
      await completion
      // Read the final persisted row so notifiers see the resolved status/summary.
      this.onRunComplete?.(routine, this.store.getRun(run.id) ?? run)
    } finally {
      this.inFlight.delete(routine.id)
    }
  }
}
