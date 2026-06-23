import type { Routine, Run } from '@shared/types'
import type { Store } from './persistence'
import { runAgent } from './agent-runner'
import { prepareGitWorktree } from './git-worktree'

export type RoutineExecution = (routine: Routine, run: Run, store: Store) => Promise<void>

export type StartedRoutineExecution = {
  run: Run
  completion: Promise<void>
}

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

export async function executeRoutine(routine: Routine, run: Run, store: Store): Promise<void> {
  const settings = store.getSettings()
  const permissionMode = routine.permissionMode ?? settings.defaultPermissionMode ?? 'bypass'
  const timeoutMs = (settings.runTimeoutMinutes ?? 0) * 60 * 1000
  const worktreeEntries: Run['transcript'] = []
  let runDir = routine.dir

  if (routine.executeInWorktree) {
    try {
      const worktree = await prepareGitWorktree({
        sourceDir: routine.dir,
        baseDir: settings.worktreeBaseDir,
        routineName: routine.name,
        runId: run.id
      })
      runDir = worktree.executionDir
      worktreeEntries.push({
        role: 'result',
        text: `Git worktree created at ${worktree.worktreeDir} on ${worktree.branch}`
      })
      if (worktree.executionDir !== worktree.worktreeDir) {
        worktreeEntries.push({ role: 'result', text: `Running in ${worktree.executionDir}` })
      }
      store.updateRun(run.id, {
        worktreeDir: worktree.worktreeDir,
        worktreeBranch: worktree.branch,
        transcript: mergeWorktreeTranscript(
          [{ role: 'user', text: routine.prompt }],
          worktreeEntries
        )
      })
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error)
      store.updateRun(run.id, {
        status: 'failed',
        durationSec: elapsedSeconds(run),
        summary: `Run failed — ${message}`,
        transcript: [
          { role: 'user', text: routine.prompt },
          { role: 'result', text: message, err: true }
        ]
      })
      return
    }
  }

  const result = await runAgent(
    { ...routine, dir: runDir },
    { permissionMode, timeoutMs },
    {
      onTranscript: (_entry, all) => {
        store.updateRun(run.id, { transcript: mergeWorktreeTranscript(all, worktreeEntries) })
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
    transcript: mergeWorktreeTranscript(result.transcript, worktreeEntries)
  })
}

function mergeWorktreeTranscript(
  transcript: Run['transcript'],
  worktreeEntries: Run['transcript']
): Run['transcript'] {
  if (worktreeEntries.length === 0) {
    return transcript
  }
  const [first, ...rest] = transcript
  if (first?.role === 'user') {
    return [first, ...worktreeEntries, ...rest]
  }
  return [...worktreeEntries, ...transcript]
}

function elapsedSeconds(run: Run): number {
  return Math.max(0, Math.round((Date.now() - new Date(run.start).getTime()) / 1000))
}

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
