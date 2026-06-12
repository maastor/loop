// main/tray.ts — macOS menu-bar status item with a quick-status dropdown.
//
// STUB (Phase A foundation). Worker unit 7 implements the real Tray: a ✱ status item
// that shows running/next-up/recent runs, pause-all, "Open Loop…", and Quit, refreshed
// when data changes. The exported signatures are the contract main/index.ts wires up.
import type { Store } from '@core/persistence'

export interface TrayDeps {
  store: Store
  showWindow: () => void
}

export function createTray(_deps: TrayDeps): void {
  // no-op until unit 7
}

export function refreshTray(): void {
  // no-op until unit 7
}

export function destroyTray(): void {
  // no-op until unit 7
}
