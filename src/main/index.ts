import { watch, type FSWatcher } from 'fs'
import { basename } from 'path'
import { app, BrowserWindow, powerMonitor } from 'electron'
import { electronApp } from '@electron-toolkit/utils'
import { Store } from '@core/persistence'
import { Scheduler, STALE_RUN_MS } from '@core/scheduler'
import { dataDir, dataFile } from '@core/paths'
import { createMainWindow, showMainWindow } from './window'
import { registerIpcHandlers, broadcastData } from './ipc'
import { createTray } from './tray'
import { startAutoChecks } from './updater'

let store: Store
let scheduler: Scheduler | null = null
let watcher: FSWatcher | null = null
let broadcastTimer: NodeJS.Timeout | null = null

process.on('unhandledRejection', (reason) => {
  console.error('[main] unhandled rejection:', reason)
})
process.on('uncaughtException', (err) => {
  console.error('[main] uncaught exception:', err)
})

function broadcast(): void {
  broadcastData(store)
}

function scheduleBroadcast(): void {
  if (broadcastTimer) {
    clearTimeout(broadcastTimer)
  }
  broadcastTimer = setTimeout(() => broadcast(), 60)
}

function startSync(): void {
  store.onChange(() => scheduleBroadcast())
  const file = basename(dataFile())
  const attach = (): void => {
    // Atomic saves replace the file inode, so a file-level watcher would stop after one write.
    watcher = watch(dataDir(), (_event, name) => {
      if (!name || name === file) {
        scheduleBroadcast()
      }
    })
  }
  try {
    attach()
  } catch {
    setTimeout(() => {
      try {
        attach()
      } catch {
        /* give up; in-process changes still broadcast via store.onChange */
      }
    }, 1000)
  }
}

function reconcileScheduler(): void {
  if (!store) {
    return
  }
  if (scheduler) {
    return
  }
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
    // Crashed processes can leave running rows that block future schedules.
    store.reconcileStaleRuns(STALE_RUN_MS)
    registerIpcHandlers({ store, broadcast, reconcileScheduler })
    createMainWindow()
    createTray({ store, showWindow: showMainWindow })
    startSync()
    reconcileScheduler()
    startAutoChecks()

    // setInterval pauses during sleep; check missed occurrences immediately on wake.
    powerMonitor.on('resume', () => {
      void scheduler?.tick()
    })

    app.on('activate', () => {
      if (BrowserWindow.getAllWindows().length === 0) {
        createMainWindow()
      } else {
        showMainWindow()
      }
    })
  })

  app.on('window-all-closed', () => {
    if (process.platform !== 'darwin') {
      app.quit()
    }
  })

  app.on('before-quit', () => {
    scheduler?.stop()
    watcher?.close()
  })
}
