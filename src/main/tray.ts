// main/tray.ts — macOS menu-bar status item with a quick-status dropdown.
//
// Mirrors the design's menu-bar quick-status panel (project/app/screens-menubar.jsx):
// a ✱ status item whose native dropdown shows running/next-up/recent runs, a
// "Pause all" toggle, "Open Loop…", and "Quit Loop". refreshTray() rebuilds the
// menu from the Store and is called by main/ipc.ts after every data change.
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

// ── pure menu model (testable without electron) ──────────────────────────────
// A serializable description of the menu, deliberately close to Electron's
// MenuItemConstructorOptions so the wiring is a thin mapping. It carries no
// functions/electron refs so it can be unit-tested with plain data.
export type MenuModelItem =
  | { type: 'header'; label: string }
  | { type: 'label'; label: string }
  | { type: 'separator' }
  | { type: 'checkbox'; id: 'pauseAll'; label: string; checked: boolean }
  | { type: 'action'; id: 'openLoop'; label: string }
  | { type: 'quit'; label: string }

/**
 * Build the serializable menu model from plain data. Pure: no electron, no I/O.
 * `now` is injected so tests are deterministic.
 */
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

  // Running now
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

  // Next up — next 2 enabled routines, unless globally paused.
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

  // Recent — last 3 non-running runs (runs arrive newest-first from the store).
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

  // Controls
  items.push({ type: 'separator' })
  items.push({ type: 'checkbox', id: 'pauseAll', label: 'Pause all', checked: settings.pausedAll })
  items.push({ type: 'action', id: 'openLoop', label: 'Open Loop…' })
  items.push({ type: 'separator' })
  items.push({ type: 'quit', label: 'Quit Loop' })

  return items
}

// ── electron wiring ───────────────────────────────────────────────────────────
let tray: Tray | null = null
let deps: TrayDeps | null = null

/** Map the pure model into Electron's menu template, attaching click handlers. */
function toTemplate(model: MenuModelItem[]): MenuItemConstructorOptions[] {
  return model.map((item): MenuItemConstructorOptions => {
    switch (item.type) {
      case 'header':
      case 'label':
        // Disabled informational rows.
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
  // A template image adapts to light/dark menu bars. We start empty and rely on
  // setTitle('✱'); an empty template image avoids a broken-image placeholder.
  const img = nativeImage.createEmpty()
  img.setTemplateImage(true)
  return img
}

export function createTray(d: TrayDeps): void {
  deps = d
  try {
    tray = new Tray(trayImage())
    tray.setTitle('✱')
    tray.setToolTip('Loop — Claude Code routines')
    refreshTray()
  } catch {
    // Some headless/non-darwin environments can't create a Tray; degrade gracefully.
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
    /* ignore */
  }
  tray = null
  deps = null
}
