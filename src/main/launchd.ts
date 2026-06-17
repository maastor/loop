import { execFileSync } from 'child_process'
import { existsSync, mkdirSync, unlinkSync, writeFileSync } from 'fs'
import { dirname } from 'path'
import { app } from 'electron'
import type { DaemonStatus } from '@shared/ipc'
import { LAUNCH_AGENT_LABEL, launchAgentPlistPath, logFile } from '@core/paths'
import { buildPlistXml } from './plist'
function daemonScriptPath(): string {
  return `${app.getAppPath()}/out/main/daemon.js`
}

function guiTarget(): string {
  return `gui/${process.getuid?.() ?? 0}`
}

function isLoaded(): boolean {
  try {
    execFileSync('launchctl', ['print', `${guiTarget()}/${LAUNCH_AGENT_LABEL}`], {
      stdio: 'ignore'
    })
    return true
  } catch {
    return false
  }
}

export function getDaemonStatus(): DaemonStatus {
  const installed = existsSync(launchAgentPlistPath())
  const loaded = installed && isLoaded()
  return { installed, loaded }
}

export async function installDaemon(): Promise<DaemonStatus> {
  const plistPath = launchAgentPlistPath()
  try {
    const xml = buildPlistXml({
      label: LAUNCH_AGENT_LABEL,
      electronPath: process.execPath,
      daemonScript: daemonScriptPath(),
      logPath: logFile()
    })
    mkdirSync(dirname(plistPath), { recursive: true })
    mkdirSync(dirname(logFile()), { recursive: true })
    writeFileSync(plistPath, xml)

    // `load` supports macOS versions predating `bootstrap`.
    try {
      execFileSync('launchctl', ['bootstrap', guiTarget(), plistPath], { stdio: 'ignore' })
    } catch {
      try {
        execFileSync('launchctl', ['load', '-w', plistPath], { stdio: 'ignore' })
      } catch {
        /* leave the plist in place; status will report installed but not loaded */
      }
    }
  } catch {
    /* never throw out of install; return whatever status we can observe */
  }
  return getDaemonStatus()
}

export async function uninstallDaemon(): Promise<DaemonStatus> {
  const plistPath = launchAgentPlistPath()
  try {
    execFileSync('launchctl', ['bootout', `${guiTarget()}/${LAUNCH_AGENT_LABEL}`], {
      stdio: 'ignore'
    })
  } catch {
    try {
      execFileSync('launchctl', ['unload', '-w', plistPath], { stdio: 'ignore' })
    } catch {
      /* already unloaded or never loaded */
    }
  }
  try {
    if (existsSync(plistPath)) {
      unlinkSync(plistPath)
    }
  } catch {
    /* ignore unlink failures */
  }
  return getDaemonStatus()
}
