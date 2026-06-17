export type AgentId = 'claude' | 'codex'
export type ModelId = 'sonnet' | 'opus' | 'haiku'

export type AgentModel = {
  id: string
  label: string
  description?: string
}

export type AgentModelCatalog = {
  models: AgentModel[]
  defaultModelId: string
  source: 'agent' | 'bundled'
  error?: string
}

/** Unattended permission policy; scheduled agents have no TTY for interactive approval. */
export type PermissionMode = 'bypass' | 'acceptEdits' | 'default'

export type ScheduleFreq = 'daily' | 'weekdays' | 'weekly' | 'hourly'

export type DayIndex = 0 | 1 | 2 | 3 | 4 | 5 | 6

export type Schedule = {
  freq: ScheduleFreq
  /** "HH:MM" 24h. Ignored for hourly. */
  time: string
  days: number[]
  everyHours: number
}

export type Routine = {
  id: string
  name: string
  prompt: string
  /** Working directory; may contain a leading ~. */
  dir: string
  agent: AgentId
  model: string
  enabled: boolean
  schedule: Schedule
  /** Per-routine permission mode. Undefined → inherit Settings.defaultPermissionMode. */
  permissionMode?: PermissionMode
  /**
   * How late (minutes) a missed scheduled occurrence may still fire after the machine
   * comes back online. Undefined → inherit Settings.defaultMissedRunGraceMinutes.
   */
  missedRunGraceMinutes?: number
}

export type RunStatus = 'running' | 'success' | 'failed' | 'skipped'

export type ChangeType = 'edit' | 'commit' | 'pr' | 'label'

export type Change = {
  t: ChangeType
  x: string
}

export type TranscriptRole = 'user' | 'assistant' | 'tool' | 'result'

export type TranscriptEntry = {
  role: TranscriptRole
  text?: string
  name?: string
  arg?: string
  err?: boolean
}

export type Run = {
  id: string
  routineId: string
  start: string
  durationSec: number | null
  status: RunStatus
  costUsd: number | null
  tokens: number | null
  summary: string
  changes: Change[]
  transcript: TranscriptEntry[]
  /** Whether this run was triggered manually ("Run now") vs. on schedule. */
  trigger?: 'manual' | 'scheduled'
  /** For scheduled runs: ISO timestamp of the schedule occurrence this run satisfies (dedup key). */
  scheduledFor?: string
}

export type LayoutVariant = 'rows' | 'cards' | 'table'
export type Density = 'compact' | 'comfortable'
export type RoutineGroupBy = 'project' | 'status' | 'schedule' | 'none'
export type RoutineSortBy = 'name' | 'nextRun' | 'lastRun'

export type Tweaks = {
  accent: string
  layout: LayoutVariant
  density: Density
  routineGroupBy: RoutineGroupBy
  routineSortBy: RoutineSortBy
}

export type Settings = {
  defaultAgent: AgentId
  daemonEnabled: boolean
  pausedAll: boolean
  /** Default permission mode for routines that don't override it. */
  defaultPermissionMode: PermissionMode
  /**
   * Default missed-run grace (minutes) for routines that don't override it. A scheduled
   * occurrence missed while the machine was offline still fires on wake if it is no more
   * than this many minutes stale; otherwise it is recorded as a skipped run.
   */
  defaultMissedRunGraceMinutes: number
  /** Kill a single run after this many minutes (0 = no timeout). Guards against a hung CLI. */
  runTimeoutMinutes: number
}

export type UpdatePhase = 'idle' | 'checking' | 'available' | 'downloading' | 'ready' | 'error'

export type UpdateInfo = {
  currentVersion: string
  latestVersion: string | null
  available: boolean
  releaseUrl: string | null
  assetUrl: string | null
  assetName: string | null
  notes: string | null
  checkedAt: string
}

export type UpdateStatus = {
  phase: UpdatePhase
  info: UpdateInfo | null
  percent?: number
  error?: string
}

export type AppData = {
  version: number
  routines: Routine[]
  runs: Run[]
  tweaks: Tweaks
  settings: Settings
}

export type ModelMeta = {
  id: ModelId
  label: string
  desc: string
}
