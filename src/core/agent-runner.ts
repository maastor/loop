import type { Change, PermissionMode, Routine, TranscriptEntry } from '@shared/types'
import { runClaude } from './claude-runner'
import { runCodex } from './codex-runner'

export type RunCallbacks = {
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
