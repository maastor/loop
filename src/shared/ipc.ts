import type { AgentId, PermissionMode, Schedule } from './types'

export const IPC = {
  dataGet: 'data:get',
  routineCreate: 'routines:create',
  routineUpdate: 'routines:update',
  routineDelete: 'routines:delete',
  routineToggle: 'routines:toggle',
  routineRunNow: 'routines:runNow',
  agentModels: 'agents:models',
  tweaksSet: 'tweaks:set',
  settingsSet: 'settings:set',
  daemonStatus: 'daemon:status',
  daemonInstall: 'daemon:install',
  daemonUninstall: 'daemon:uninstall',
  selectDirectory: 'dialog:selectDirectory',
  openWindow: 'app:openWindow',
  updateCheck: 'update:check',
  updateStart: 'update:start',
  updateOpenRelease: 'update:openRelease',
  dataChanged: 'data:changed',
  updateStatus: 'update:status'
} as const

export type IpcChannel = (typeof IPC)[keyof typeof IPC]

export type RoutineCreateInput = {
  name: string
  prompt: string
  dir: string
  executeInWorktree?: boolean
  agent: AgentId
  model: string
  schedule: Schedule
  enabled?: boolean
  permissionMode?: PermissionMode
  missedRunGraceMinutes?: number
}

export type DaemonStatus = {
  installed: boolean
  loaded: boolean
}
