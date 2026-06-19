import type { AgentId, PermissionMode, ScheduleFreq } from '@shared/types'

// Enumerated flag values, kept in one place so commands validate identically.
export const AGENT_IDS: readonly AgentId[] = ['claude', 'codex']
export const PERMISSION_MODE_IDS: readonly PermissionMode[] = ['bypass', 'acceptEdits', 'default']
export const SCHEDULE_FREQS: readonly ScheduleFreq[] = ['daily', 'weekdays', 'weekly', 'hourly']
