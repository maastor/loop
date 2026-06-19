import { ipcMain, BrowserWindow, dialog } from 'electron'
import { homedir } from 'os'
import { IPC } from '@shared/ipc'
import type { RoutineCreateInput } from '@shared/ipc'
import type { AgentId, Routine, Tweaks, Settings } from '@shared/types'
import { uid } from '@shared/schedule'
import type { Store } from '@core/persistence'
import { startRoutineExecution } from '@core/routine-execution'
import { discoverAgentModels } from '@core/agent-models'
import { getDaemonStatus, installDaemon, uninstallDaemon } from './launchd'
import { showMainWindow } from './window'
import { refreshTray } from './tray'
import { notifyRunComplete } from './notifications'
import { checkForUpdate, downloadAndOpen, openReleasePage, getStatus } from './updater'

export type IpcDeps = {
  store: Store
  broadcast: () => void
  reconcileScheduler: () => void
}

export function registerIpcHandlers({ store, broadcast, reconcileScheduler }: IpcDeps): void {
  ipcMain.handle(IPC.dataGet, () => store.getAll())
  ipcMain.handle(IPC.agentModels, (_e, agent: AgentId) => discoverAgentModels(agent))

  ipcMain.handle(IPC.routineCreate, (_e, input: RoutineCreateInput) => {
    const routine: Routine = {
      id: `rt-${uid()}`,
      name: input.name,
      prompt: input.prompt,
      dir: input.dir,
      agent: input.agent,
      model: input.model,
      schedule: input.schedule,
      enabled: input.enabled ?? true,
      permissionMode: input.permissionMode,
      missedRunGraceMinutes: input.missedRunGraceMinutes
    }
    const saved = store.upsertRoutine(routine)
    broadcast()
    return saved
  })

  ipcMain.handle(IPC.routineUpdate, (_e, routine: Routine) => {
    const saved = store.upsertRoutine(routine)
    broadcast()
    return saved
  })

  ipcMain.handle(IPC.routineDelete, (_e, id: string) => {
    store.deleteRoutine(id)
    broadcast()
  })

  ipcMain.handle(IPC.routineToggle, (_e, id: string) => {
    const r = store.toggleRoutine(id)
    broadcast()
    return r
  })

  ipcMain.handle(IPC.routineRunNow, async (_e, id: string) => {
    const routine = store.getRoutine(id)
    if (!routine) {
      return undefined
    }
    const started = startRoutineExecution(store, routine, { trigger: 'manual' })
    broadcast()
    void started.completion.finally(() => {
      broadcast()
      // Read the resolved row so the banner reflects final status, not the running row.
      const run = store.getRun(started.run.id) ?? started.run
      notifyRunComplete(routine, run, store.getSettings().notifyOnComplete)
    })
    return started.run
  })

  ipcMain.handle(IPC.tweaksSet, (_e, patch: Partial<Tweaks>) => {
    const t = store.setTweaks(patch)
    broadcast()
    return t
  })

  ipcMain.handle(IPC.settingsSet, (_e, patch: Partial<Settings>) => {
    const s = store.setSettings(patch)
    broadcast()
    return s
  })

  ipcMain.handle(IPC.daemonStatus, () => getDaemonStatus())
  ipcMain.handle(IPC.daemonInstall, async () => {
    const status = await installDaemon()
    reconcileScheduler()
    broadcast()
    return status
  })
  ipcMain.handle(IPC.daemonUninstall, async () => {
    const status = await uninstallDaemon()
    reconcileScheduler()
    broadcast()
    return status
  })

  ipcMain.handle(IPC.openWindow, () => showMainWindow())

  ipcMain.handle(IPC.updateCheck, async () => {
    await checkForUpdate()
    return getStatus()
  })
  ipcMain.handle(IPC.updateStart, () => downloadAndOpen())
  ipcMain.handle(IPC.updateOpenRelease, () => openReleasePage())

  ipcMain.handle(IPC.selectDirectory, async () => {
    const win = BrowserWindow.getFocusedWindow() ?? BrowserWindow.getAllWindows()[0]
    const properties: ('openDirectory' | 'createDirectory')[] = ['openDirectory', 'createDirectory']
    const opts = { title: 'Choose working directory', defaultPath: homedir(), properties }
    const result = win ? await dialog.showOpenDialog(win, opts) : await dialog.showOpenDialog(opts)
    if (result.canceled || result.filePaths.length === 0) {
      return null
    }
    return result.filePaths[0]
  })
}

export function broadcastData(store: Store): void {
  const data = store.getAll()
  for (const win of BrowserWindow.getAllWindows()) {
    if (!win.isDestroyed()) {
      win.webContents.send(IPC.dataChanged, data)
    }
  }
  refreshTray()
}
