// shared/types.ts — core data model for loop, shared across main, daemon, preload, renderer.
// Pure types only — no node/electron imports.

export type ModelId = 'sonnet' | 'opus' | 'haiku'

export type ScheduleFreq = 'daily' | 'weekdays' | 'weekly' | 'hourly'

/** Day-of-week index, 0 = Sunday … 6 = Saturday (matches Date.getDay()). */
export type DayIndex = 0 | 1 | 2 | 3 | 4 | 5 | 6

export interface Schedule {
  freq: ScheduleFreq
  /** "HH:MM" 24h. Ignored for hourly. */
  time: string
  /** Days of week for weekly freq. */
  days: number[]
  /** Interval in hours for hourly freq. */
  everyHours: number
}

export interface Routine {
  id: string
  name: string
  prompt: string
  /** Working directory; may contain a leading ~. */
  dir: string
  model: ModelId
  enabled: boolean
  schedule: Schedule
}

export type RunStatus = 'running' | 'success' | 'failed'

export type ChangeType = 'edit' | 'commit' | 'pr' | 'label'

export interface Change {
  t: ChangeType
  x: string
}

export type TranscriptRole = 'user' | 'assistant' | 'tool' | 'result'

export interface TranscriptEntry {
  role: TranscriptRole
  text?: string
  /** For tool entries: the tool name (e.g. "Bash"). */
  name?: string
  /** For tool entries: the tool argument summary. */
  arg?: string
  /** For result entries: marks an error result. */
  err?: boolean
}

export interface Run {
  id: string
  routineId: string
  /** ISO timestamp. */
  start: string
  /** null while running. */
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

export interface Tweaks {
  accent: string
  layout: LayoutVariant
  density: Density
}

export interface Settings {
  /** Whether routines should run in the background via the launchd daemon. */
  daemonEnabled: boolean
  /** Global pause — disables all scheduling without touching per-routine enabled flags. */
  pausedAll: boolean
}

/** The full persisted application state (one JSON file). */
export interface AppData {
  version: number
  routines: Routine[]
  runs: Run[]
  tweaks: Tweaks
  settings: Settings
}

export interface ModelMeta {
  id: ModelId
  label: string
  desc: string
}
