import type {
  AgentId,
  AgentModelCatalog,
  Routine,
  Run,
  Tweaks,
  Settings,
  AppData,
  UpdateStatus
} from '@shared/types'
import type { RoutineCreateInput, DaemonStatus } from '@shared/ipc'

export type LoopApi = {
  data: {
    get: () => Promise<AppData>
    onChanged: (cb: (data: AppData) => void) => () => void
  }
  agents: {
    models: (agent: AgentId) => Promise<AgentModelCatalog>
  }
  routines: {
    create: (input: RoutineCreateInput) => Promise<Routine>
    update: (routine: Routine) => Promise<Routine>
    delete: (id: string) => Promise<void>
    toggle: (id: string) => Promise<Routine | undefined>
    runNow: (id: string) => Promise<Run | undefined>
  }
  tweaks: {
    set: (patch: Partial<Tweaks>) => Promise<Tweaks>
  }
  settings: {
    set: (patch: Partial<Settings>) => Promise<Settings>
  }
  daemon: {
    status: () => Promise<DaemonStatus>
    install: () => Promise<DaemonStatus>
    uninstall: () => Promise<DaemonStatus>
  }
  app: {
    openWindow: () => Promise<void>
  }
  update: {
    check: () => Promise<UpdateStatus>
    start: () => Promise<void>
    openRelease: () => Promise<void>
    onStatus: (cb: (status: UpdateStatus) => void) => () => void
  }
  dialog: {
    selectDirectory: () => Promise<string | null>
  }
}

declare global {
  // Augmenting the global Window type requires an interface (declaration merging).
  interface Window {
    api: LoopApi
  }
}
