// Core routine execution lifecycle shared by manual and scheduled runs.
import type { Routine, Run } from '@shared/types'
import type { Store } from './persistence'
import { runAgent } from './agent-runner'

export type RoutineExecution = (routine: Routine, run: Run, store: Store) => Promise<void>

export type StartedRoutineExecution = {
  /** Persisted running record, available synchronously to IPC callers. */
  run: Run
  /** Always resolves after the run reaches a terminal persisted state. */
  completion: Promise<void>
}

/** Build the initial persisted record for any routine execution. */
export function createRunningRun(
  routine: Routine,
  trigger: Run['trigger'],
  scheduledFor?: string
): Run {
  return {
    id: `run-${routine.id}-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
    routineId: routine.id,
    start: new Date().toISOString(),
    durationSec: null,
    status: 'running',
    costUsd: null,
    tokens: null,
    summary: 'Run started…',
    changes: [],
    transcript: [
      { role: 'user', text: routine.prompt },
      { role: 'result', text: `Session started in ${routine.dir}` }
    ],
    trigger,
    scheduledFor
  }
}

/** Execute a routine end-to-end and stream its selected agent into the run record. */
export async function executeRoutine(routine: Routine, run: Run, store: Store): Promise<void> {
  const settings = store.getSettings()
  const permissionMode = routine.permissionMode ?? settings.defaultPermissionMode ?? 'bypass'
  const timeoutMs = (settings.runTimeoutMinutes ?? 0) * 60 * 1000
  const result = await runAgent(
    routine,
    { permissionMode, timeoutMs },
    {
      onTranscript: (_entry, all) => {
        store.updateRun(run.id, { transcript: all })
      }
    }
  )
  store.updateRun(run.id, {
    status: result.status,
    durationSec: result.durationSec,
    costUsd: result.costUsd,
    tokens: result.tokens,
    summary: result.summary,
    changes: result.changes,
    transcript: result.transcript
  })
}

/** Persist a running record now, then drive it to a terminal state in the background. */
export function startRoutineExecution(
  store: Store,
  routine: Routine,
  options: {
    trigger: Run['trigger']
    scheduledFor?: string
    execute?: RoutineExecution
  }
): StartedRoutineExecution {
  const run = createRunningRun(routine, options.trigger, options.scheduledFor)
  store.addRun(run)
  const execute = options.execute ?? executeRoutine
  const completion = (async (): Promise<void> => {
    try {
      await execute(routine, run, store)
    } catch (error) {
      store.updateRun(run.id, {
        status: 'failed',
        durationSec: 0,
        summary: `Run failed — ${String(error)}`
      })
    }
  })()
  return { run, completion }
}
