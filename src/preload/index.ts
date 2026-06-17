// preload/index.ts — context bridge: the audited contract between renderer and main.
import { contextBridge, ipcRenderer } from 'electron'
import { IPC } from '@shared/ipc'
import type { AppData, UpdateStatus } from '@shared/types'
import type { LoopApi } from './api-types'

const api: LoopApi = {
  data: {
    get: () => ipcRenderer.invoke(IPC.dataGet),
    onChanged: (cb: (data: AppData) => void) => {
      const listener = (_event: unknown, data: AppData): void => cb(data)
      ipcRenderer.on(IPC.dataChanged, listener)
      return () => ipcRenderer.removeListener(IPC.dataChanged, listener)
    }
  },
  routines: {
    create: (input) => ipcRenderer.invoke(IPC.routineCreate, input),
    update: (routine) => ipcRenderer.invoke(IPC.routineUpdate, routine),
    delete: (id) => ipcRenderer.invoke(IPC.routineDelete, id),
    toggle: (id) => ipcRenderer.invoke(IPC.routineToggle, id),
    runNow: (id) => ipcRenderer.invoke(IPC.routineRunNow, id)
  },
  tweaks: {
    set: (patch) => ipcRenderer.invoke(IPC.tweaksSet, patch)
  },
  settings: {
    set: (patch) => ipcRenderer.invoke(IPC.settingsSet, patch)
  },
  daemon: {
    status: () => ipcRenderer.invoke(IPC.daemonStatus),
    install: () => ipcRenderer.invoke(IPC.daemonInstall),
    uninstall: () => ipcRenderer.invoke(IPC.daemonUninstall)
  },
  app: {
    openWindow: () => ipcRenderer.invoke(IPC.openWindow)
  },
  update: {
    check: () => ipcRenderer.invoke(IPC.updateCheck),
    start: () => ipcRenderer.invoke(IPC.updateStart),
    openRelease: () => ipcRenderer.invoke(IPC.updateOpenRelease),
    onStatus: (cb: (status: UpdateStatus) => void) => {
      const listener = (_event: unknown, status: UpdateStatus): void => cb(status)
      ipcRenderer.on(IPC.updateStatus, listener)
      return () => ipcRenderer.removeListener(IPC.updateStatus, listener)
    }
  },
  dialog: {
    selectDirectory: () => ipcRenderer.invoke(IPC.selectDirectory)
  }
}

contextBridge.exposeInMainWorld('api', api)
