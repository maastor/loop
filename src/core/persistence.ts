import type { AppData, Routine, Run, Tweaks, Settings } from '@shared/types'
import { AppDataFile, type AppDataPersistence } from './app-data-file'

export class Store {
  private state: AppData
  private changeListeners = new Set<() => void>()

  constructor(private readonly persistence: AppDataPersistence = new AppDataFile()) {
    this.state = this.persistence.load()
  }

  // Cross-process writes bypass this listener and arrive through the directory watcher.
  onChange(listener: () => void): () => void {
    this.changeListeners.add(listener)
    return () => this.changeListeners.delete(listener)
  }

  private emitChange(): void {
    for (const listener of this.changeListeners) {
      try {
        listener()
      } catch {
        /* a bad listener must not break persistence */
      }
    }
  }

  private mutate<T>(fn: (state: AppData) => T): T {
    this.reloadIfStale()
    const result = fn(this.state)
    this.persistence.save(this.state)
    this.emitChange()
    return result
  }

  private reloadIfStale(): void {
    this.state = this.persistence.reloadIfChanged(this.state)
  }

  getAll(): AppData {
    this.reloadIfStale()
    return structuredClone(this.state)
  }

  listRoutines(): Routine[] {
    this.reloadIfStale()
    return structuredClone(this.state.routines)
  }

  getRoutine(id: string): Routine | undefined {
    this.reloadIfStale()
    return this.state.routines.find((r) => r.id === id)
  }

  listRuns(routineId?: string): Run[] {
    this.reloadIfStale()
    const runs = routineId
      ? this.state.runs.filter((r) => r.routineId === routineId)
      : this.state.runs
    return structuredClone(runs).sort(
      (a, b) => new Date(b.start).getTime() - new Date(a.start).getTime()
    )
  }

  getRun(id: string): Run | undefined {
    this.reloadIfStale()
    return this.state.runs.find((r) => r.id === id)
  }

  getTweaks(): Tweaks {
    this.reloadIfStale()
    return structuredClone(this.state.tweaks)
  }

  getSettings(): Settings {
    this.reloadIfStale()
    return structuredClone(this.state.settings)
  }

  upsertRoutine(routine: Routine): Routine {
    return this.mutate((s) => {
      const i = s.routines.findIndex((r) => r.id === routine.id)
      if (i === -1) {
        s.routines = [routine, ...s.routines]
      } else {
        s.routines[i] = routine
      }
      return routine
    })
  }

  deleteRoutine(id: string): void {
    this.mutate((s) => {
      s.routines = s.routines.filter((r) => r.id !== id)
    })
  }

  toggleRoutine(id: string): Routine | undefined {
    return this.mutate((s) => {
      const r = s.routines.find((x) => x.id === id)
      if (r) {
        r.enabled = !r.enabled
      }
      return r
    })
  }

  addRun(run: Run): Run {
    return this.mutate((s) => {
      s.runs = [run, ...s.runs]
      return run
    })
  }

  updateRun(id: string, patch: Partial<Run>): Run | undefined {
    return this.mutate((s) => {
      const i = s.runs.findIndex((r) => r.id === id)
      if (i === -1) {
        return undefined
      }
      s.runs[i] = { ...s.runs[i], ...patch }
      return s.runs[i]
    })
  }

  // Crashed owners leave running rows that would otherwise block future schedules.
  reconcileStaleRuns(maxAgeMs: number): number {
    return this.mutate((s) => {
      const now = Date.now()
      let count = 0
      for (const r of s.runs) {
        if (r.status === 'running' && now - new Date(r.start).getTime() >= maxAgeMs) {
          r.status = 'failed'
          r.durationSec = r.durationSec ?? Math.round((now - new Date(r.start).getTime()) / 1000)
          r.summary = 'Run interrupted — Loop was restarted before it finished.'
          count++
        }
      }
      return count
    })
  }

  setTweaks(patch: Partial<Tweaks>): Tweaks {
    return this.mutate((s) => {
      s.tweaks = { ...s.tweaks, ...patch }
      return s.tweaks
    })
  }

  setSettings(patch: Partial<Settings>): Settings {
    return this.mutate((s) => {
      s.settings = { ...s.settings, ...patch }
      return s.settings
    })
  }
}
