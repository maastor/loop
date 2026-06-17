// Atomic JSON file adapter for Loop application data.
import { existsSync, mkdirSync, readFileSync, renameSync, statSync, writeFileSync } from 'fs'
import type { AppData } from '@shared/types'
import { APP_DATA_VERSION, defaultAppData } from '@shared/seed'
import { backupFile, dataDir, dataFile } from './paths'

const MAX_BACKUPS = 5

export type AppDataPersistence = {
  load: () => AppData
  reloadIfChanged: (current: AppData) => AppData
  save: (data: AppData) => void
}

function normalize(data: Partial<AppData> | null): AppData {
  const base = defaultAppData()
  if (!data || typeof data !== 'object') {
    return base
  }
  return {
    version: APP_DATA_VERSION,
    routines: Array.isArray(data.routines)
      ? data.routines.map((routine) => ({
          ...routine,
          // Persisted v1 routines predate agent selection and always ran Claude.
          agent: routine.agent === 'codex' ? 'codex' : 'claude'
        }))
      : base.routines,
    runs: Array.isArray(data.runs) ? data.runs : [],
    tweaks: { ...base.tweaks, ...data.tweaks },
    settings: { ...base.settings, ...data.settings }
  }
}

export class AppDataFile implements AppDataPersistence {
  private lastMtimeMs = 0

  load(): AppData {
    const file = dataFile()
    if (!existsSync(file)) {
      const seeded = defaultAppData()
      this.save(seeded)
      return seeded
    }
    try {
      const raw = readFileSync(file, 'utf-8')
      this.lastMtimeMs = statSync(file).mtimeMs
      return normalize(JSON.parse(raw))
    } catch {
      return this.loadBackup()
    }
  }

  /** Return fresh disk state only when another process has written since our last access. */
  reloadIfChanged(current: AppData): AppData {
    const file = dataFile()
    try {
      if (existsSync(file) && statSync(file).mtimeMs > this.lastMtimeMs) {
        return this.load()
      }
    } catch {
      /* keep current state */
    }
    return current
  }

  save(data: AppData): void {
    this.ensureDirectory()
    const file = dataFile()
    this.rotateBackups()
    const temporary = `${file}.tmp`
    writeFileSync(temporary, JSON.stringify(data, null, 2), 'utf-8')
    renameSync(temporary, file)
    try {
      this.lastMtimeMs = statSync(file).mtimeMs
    } catch {
      /* a successful rename is authoritative even if the follow-up stat fails */
    }
  }

  private loadBackup(): AppData {
    for (let index = 0; index < MAX_BACKUPS; index++) {
      try {
        const backup = backupFile(index)
        if (existsSync(backup)) {
          return normalize(JSON.parse(readFileSync(backup, 'utf-8')))
        }
      } catch {
        /* try next backup */
      }
    }
    return defaultAppData()
  }

  private ensureDirectory(): void {
    const directory = dataDir()
    if (!existsSync(directory)) {
      mkdirSync(directory, { recursive: true })
    }
  }

  private rotateBackups(): void {
    const file = dataFile()
    if (!existsSync(file)) {
      return
    }
    try {
      for (let index = MAX_BACKUPS - 1; index > 0; index--) {
        const source = backupFile(index - 1)
        if (existsSync(source)) {
          renameSync(source, backupFile(index))
        }
      }
      writeFileSync(backupFile(0), readFileSync(file))
    } catch {
      /* backups are best-effort; primary atomic write must continue */
    }
  }
}
