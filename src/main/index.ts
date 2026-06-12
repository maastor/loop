// main/index.ts — Electron main-process entry: app lifecycle, IPC wiring,
// window + tray, and the in-app scheduler (active only when the daemon is not installed).
import { watch, type FSWatcher } from 'fs'
import { app, BrowserWindow } from 'electron'
import { electronApp } from '@electron-toolkit/utils'
import { Store } from '@core/persistence'
import { Scheduler } from '@core/scheduler'
import { dataFile } from '@core/paths'
import { createMainWindow, showMainWindow } from './window'
import { registerIpcHandlers, broadcastData } from './ipc'
import { createTray } from './tray'
import { getDaemonStatus } from './launchd'

let store: Store
let scheduler: Scheduler | null = null
let watcher: FSWatcher | null = null

function broadcast(): void {
  broadcastData(store)
}

/** Watch the data file so changes written by the daemon reach the renderer live. */
function startDataFileWatch(): void {
  try {
    let debounce: NodeJS.Timeout | null = null
    watcher = watch(dataFile(), () => {
      if (debounce) clearTimeout(debounce)
      debounce = setTimeout(() => broadcast(), 200)
    })
  } catch {
    // The file may not exist yet on very first launch; Store creates it, retry once.
    setTimeout(() => {
      try {
        watcher = watch(dataFile(), () => broadcast())
      } catch {
        /* give up; renderer still gets local-mutation broadcasts */
      }
    }, 1000)
  }
}

/** Start the in-app scheduler only when the background daemon is not handling scheduling. */
function startInAppSchedulerIfNeeded(): void {
  const { installed } = getDaemonStatus()
  if (installed) {
    scheduler?.stop()
    scheduler = null
    return
  }
  if (scheduler) return
  scheduler = new Scheduler(store, {
    onFire: () => broadcast(),
    log: (m) => console.log('[scheduler]', m)
  })
  scheduler.start()
}

const gotLock = app.requestSingleInstanceLock()
if (!gotLock) {
  app.quit()
} else {
  app.on('second-instance', () => showMainWindow())

  app.whenReady().then(() => {
    electronApp.setAppUserModelId('com.loop.routines')

    store = new Store()
    registerIpcHandlers({ store, broadcast })
    createMainWindow()
    createTray({ store, showWindow: showMainWindow })
    startDataFileWatch()
    startInAppSchedulerIfNeeded()

    app.on('activate', () => {
      if (BrowserWindow.getAllWindows().length === 0) createMainWindow()
      else showMainWindow()
    })
  })

  // Keep running in the tray when all windows are closed (macOS tray app behavior).
  app.on('window-all-closed', () => {
    if (process.platform !== 'darwin') app.quit()
  })

  app.on('before-quit', () => {
    scheduler?.stop()
    watcher?.close()
  })
}
