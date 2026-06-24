import { execFileSync } from 'child_process'
import { existsSync, mkdirSync, unlinkSync, writeFileSync } from 'fs'
import { dirname } from 'path'
import type { DaemonStatus } from '@shared/ipc'
import { LAUNCH_AGENT_LABEL, launchAgentPlistPath, logFile } from './paths'
import { buildPlistXml } from './plist'

// Electron-free launchd control shared by the main process (src/main/launchd.ts) and the
// CLI. The caller supplies the program-argument paths because they differ by host: the main
// process derives them from the Electron app bundle, the CLI from its own script location.
export type DaemonInstallTargets = {
  /** Binary that runs the daemon script — Electron with ELECTRON_RUN_AS_NODE=1, or node. */
  electronPath: string
  /** Absolute path to the bundled daemon.js entry. */
  daemonScript: string
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

export function daemonStatus(): DaemonStatus {
  const installed = existsSync(launchAgentPlistPath())
  const loaded = installed && isLoaded()
  return { installed, loaded }
}

export function installDaemon({ electronPath, daemonScript }: DaemonInstallTargets): DaemonStatus {
  const plistPath = launchAgentPlistPath()
  try {
    const xml = buildPlistXml({
      label: LAUNCH_AGENT_LABEL,
      electronPath,
      daemonScript,
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
  return daemonStatus()
}

export function uninstallDaemon(): DaemonStatus {
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
  return daemonStatus()
}
