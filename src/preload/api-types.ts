// preload/api-types.ts — the typed `window.api` surface exposed by the preload bridge.
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
  agents: {
    models: (agent: AgentId) => Promise<AgentModelCatalog>
  }
  routines: {
    list: () => Promise<Routine[]>
    get: (id: string) => Promise<Routine | undefined>
    create: (input: RoutineCreateInput) => Promise<Routine>
    update: (routine: Routine) => Promise<Routine>
    delete: (id: string) => Promise<void>
    toggle: (id: string) => Promise<Routine | undefined>
    runNow: (id: string) => Promise<Run | undefined>
  }
  runs: {
    list: (routineId?: string) => Promise<Run[]>
    get: (id: string) => Promise<Run | undefined>
  }
  tweaks: {
    get: () => Promise<Tweaks>
    set: (patch: Partial<Tweaks>) => Promise<Tweaks>
  }
  settings: {
    get: () => Promise<Settings>
    set: (patch: Partial<Settings>) => Promise<Settings>
  }
  daemon: {
    status: () => Promise<DaemonStatus>
    install: () => Promise<DaemonStatus>
    uninstall: () => Promise<DaemonStatus>
  }
  app: {
    /** Bring the main window to the front (used by the tray). */
    openWindow: () => Promise<void>
  }
  update: {
    /** Force a check against the GitHub Releases feed; resolves to the new status. */
    check: () => Promise<UpdateStatus>
    /** Download the arch-matched .dmg and open it (mounts the disk image). */
    start: () => Promise<void>
    /** Open the release page in the default browser. */
    openRelease: () => Promise<void>
    /** Subscribe to updater status pushes. Returns an unsubscribe fn. */
    onStatus: (cb: (status: UpdateStatus) => void) => () => void
  }
  dialog: {
    /** Open a native folder picker; resolves to the chosen absolute path, or null if cancelled. */
    selectDirectory: () => Promise<string | null>
  }
  /** Subscribe to "data changed on disk / by another process" pushes. Returns an unsubscribe fn. */
  onDataChanged: (cb: (data: AppData) => void) => () => void
}

declare global {
  // Augmenting the global Window type requires an interface (declaration merging).
  interface Window {
    api: LoopApi
  }
}
