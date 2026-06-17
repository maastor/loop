import type { Change, PermissionMode, Run, Routine, TranscriptEntry } from '@shared/types'
import { runClaude } from './claude-runner'
import { runCodex } from './codex-runner'

export type RunCallbacks = {
  /** Called whenever a new transcript entry is produced. */
  onTranscript?: (entry: TranscriptEntry, all: TranscriptEntry[]) => void
}

export type RunResult = {
  status: 'success' | 'failed'
  durationSec: number
  costUsd: number | null
  tokens: number | null
  summary: string
  changes: Change[]
  transcript: TranscriptEntry[]
}

export type AgentRunOptions = {
  prompt: string
  dir: string
  model: string
  permissionMode?: PermissionMode
  timeoutMs?: number
}

export function runAgent(
  routine: Routine,
  opts: Omit<AgentRunOptions, 'prompt' | 'dir' | 'model'>,
  cb: RunCallbacks = {}
): Promise<RunResult> {
  const run = routine.agent === 'codex' ? runCodex : runClaude
  return run(
    {
      prompt: routine.prompt,
      dir: routine.dir,
      model: routine.model,
      ...opts
    },
    cb
  )
}

/** Build the in-progress Run record stored while a routine is executing. */
export function createRunningRun(
  routineId: string,
  prompt: string,
  dir: string,
  trigger: Run['trigger']
): Run {
  return {
    id: `run-${routineId}-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
    routineId,
    start: new Date().toISOString(),
    durationSec: null,
    status: 'running',
    costUsd: null,
    tokens: null,
    summary: 'Run started…',
    changes: [],
    transcript: [
      { role: 'user', text: prompt },
      { role: 'result', text: `Session started in ${dir}` }
    ],
    trigger
  }
}
