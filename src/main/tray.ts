import { Tray, Menu, nativeImage } from 'electron'
import type { MenuItemConstructorOptions, NativeImage } from 'electron'
import type { Store } from '@core/persistence'
import type { Routine, Run, Settings } from '@shared/types'
import { computeNextRun } from '@shared/schedule'
import { relTime, relUntil, fmtTime } from '@shared/format'

export type TrayDeps = {
  store: Store
  showWindow: () => void
}

export type MenuModelItem =
  | { type: 'header'; label: string }
  | { type: 'label'; label: string }
  | { type: 'separator' }
  | { type: 'checkbox'; id: 'pauseAll'; label: string; checked: boolean }
  | { type: 'action'; id: 'openLoop'; label: string }
  | { type: 'quit'; label: string }

export function buildMenuModel(
  routines: Routine[],
  runs: Run[],
  settings: Settings,
  now: Date = new Date()
): MenuModelItem[] {
  const items: MenuModelItem[] = []
  const nameOf = (id: string): string =>
    routines.find((r) => r.id === id)?.name ?? 'Deleted routine'

  items.push({ type: 'header', label: 'Loop' })

  const running = runs.filter((r) => r.status === 'running')
  if (running.length > 0) {
    items.push({ type: 'separator' })
    items.push({ type: 'label', label: 'Running now' })
    for (const run of running) {
      items.push({
        type: 'label',
        label: `• ${nameOf(run.routineId)} — started ${relTime(run.start, now)}`
      })
    }
  }

  items.push({ type: 'separator' })
  items.push({ type: 'label', label: 'Next up' })
  if (settings.pausedAll) {
    items.push({ type: 'label', label: 'all routines paused' })
  } else {
    const nextUp = routines
      .filter((r) => r.enabled)
      .map((r) => ({ r, next: computeNextRun(r.schedule, now) }))
      .filter((x): x is { r: Routine; next: Date } => x.next != null)
      .sort((a, b) => a.next.getTime() - b.next.getTime())
      .slice(0, 2)
    if (nextUp.length === 0) {
      items.push({ type: 'label', label: 'nothing scheduled' })
    } else {
      for (const { r, next } of nextUp) {
        items.push({
          type: 'label',
          label: `${r.name} — ${relUntil(next, now)} · ${fmtTime(next)}`
        })
      }
    }
  }

  const recent = runs.filter((r) => r.status !== 'running').slice(0, 3)
  if (recent.length > 0) {
    items.push({ type: 'separator' })
    items.push({ type: 'label', label: 'Recent' })
    for (const run of recent) {
      items.push({
        type: 'label',
        label: `${nameOf(run.routineId)} — ${relTime(run.start, now)}`
      })
    }
  }

  items.push({ type: 'separator' })
  items.push({ type: 'checkbox', id: 'pauseAll', label: 'Pause all', checked: settings.pausedAll })
  items.push({ type: 'action', id: 'openLoop', label: 'Open Loop…' })
  items.push({ type: 'separator' })
  items.push({ type: 'quit', label: 'Quit Loop' })

  return items
}

let tray: Tray | null = null
let deps: TrayDeps | null = null

function toTemplate(model: MenuModelItem[]): MenuItemConstructorOptions[] {
  return model.map((item): MenuItemConstructorOptions => {
    switch (item.type) {
      case 'header':
      case 'label':
        return { label: item.label, enabled: false }
      case 'separator':
        return { type: 'separator' }
      case 'checkbox':
        return {
          label: item.label,
          type: 'checkbox',
          checked: item.checked,
          click: () => {
            const current = deps?.store.getSettings().pausedAll ?? false
            deps?.store.setSettings({ pausedAll: !current })
            refreshTray()
          }
        }
      case 'action':
        return { label: item.label, click: () => deps?.showWindow() }
      case 'quit':
        return { label: item.label, role: 'quit' }
    }
  })
}

function trayImage(): NativeImage {
  // Empty template image avoids a broken icon while `setTitle` supplies the menu-bar mark.
  const img = nativeImage.createEmpty()
  img.setTemplateImage(true)
  return img
}

export function createTray(d: TrayDeps): void {
  deps = d
  try {
    tray = new Tray(trayImage())
    tray.setTitle('✱')
    tray.setToolTip('Loop — coding agent routines')
    refreshTray()
  } catch {
    tray = null
  }
}

export function refreshTray(): void {
  if (!tray || !deps) {
    return
  }
  try {
    const model = buildMenuModel(
      deps.store.listRoutines(),
      deps.store.listRuns(),
      deps.store.getSettings(),
      new Date()
    )
    const menu = Menu.buildFromTemplate(toTemplate(model))
    tray.setContextMenu(menu)
  } catch {
    /* best-effort; a failed refresh leaves the previous menu in place */
  }
}

export function destroyTray(): void {
  try {
    tray?.destroy()
  } catch {
    /* tray may already be destroyed by Electron shutdown */
  }
  tray = null
  deps = null
}
