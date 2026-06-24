import { app } from 'electron'
import type { DaemonStatus } from '@shared/ipc'
import {
  daemonStatus,
  installDaemon as installDaemonCore,
  uninstallDaemon as uninstallDaemonCore
} from '@core/daemon-control'

function daemonScriptPath(): string {
  return `${app.getAppPath()}/out/main/daemon.js`
}

export function getDaemonStatus(): DaemonStatus {
  return daemonStatus()
}

export async function installDaemon(): Promise<DaemonStatus> {
  return installDaemonCore({ electronPath: process.execPath, daemonScript: daemonScriptPath() })
}

export async function uninstallDaemon(): Promise<DaemonStatus> {
  return uninstallDaemonCore()
}
