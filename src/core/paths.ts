import { homedir } from 'os'
import { join } from 'path'

export function dataDir(): string {
  if (process.env.LOOP_DATA_DIR) {
    return process.env.LOOP_DATA_DIR
  }
  // We deliberately use a fixed path (not app.getPath) so the daemon — which runs
  // outside Electron — resolves the exact same directory as the app.
  return join(homedir(), 'Library', 'Application Support', 'loop')
}

export function dataFile(): string {
  return join(dataDir(), 'loop-data.json')
}

export function backupFile(index: number): string {
  return join(dataDir(), `loop-data.json.bak.${index}`)
}

export function logFile(): string {
  return join(dataDir(), 'daemon.log')
}

export function launchAgentPlistPath(): string {
  return join(homedir(), 'Library', 'LaunchAgents', `${LAUNCH_AGENT_LABEL}.plist`)
}

export const LAUNCH_AGENT_LABEL = 'com.loop.routines.daemon'

export function expandHome(p: string): string {
  if (p === '~') {
    return homedir()
  }
  if (p.startsWith('~/')) {
    return join(homedir(), p.slice(2))
  }
  return p
}
