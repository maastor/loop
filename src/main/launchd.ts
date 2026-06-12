// main/launchd.ts — install/uninstall/status of the background LaunchAgent daemon.
//
// STUB (Phase A foundation). Worker unit 8 implements real launchd plist generation,
// `launchctl bootstrap`/`bootout`, and status checks. The signatures here are the
// contract the IPC layer and renderer Settings UI depend on.
import type { DaemonStatus } from '@shared/ipc'

export function getDaemonStatus(): DaemonStatus {
  return { installed: false, loaded: false }
}

export async function installDaemon(): Promise<DaemonStatus> {
  return getDaemonStatus()
}

export async function uninstallDaemon(): Promise<DaemonStatus> {
  return getDaemonStatus()
}
