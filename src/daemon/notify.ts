import { execFile } from 'child_process'
import type { Routine, Run } from '@shared/types'
import { fmtDur } from '@shared/format'

// Only finished runs notify; skipped/running are silent.
const STATUS_LABEL: Partial<Record<Run['status'], string>> = {
  success: '✅ Completed',
  failed: '❌ Failed'
}

// AppleScript string literals escape backslash and double-quote only.
function escapeAppleScript(s: string): string {
  return s.replace(/\\/g, '\\\\').replace(/"/g, '\\"')
}

/**
 * Post a macOS notification from the headless daemon via `osascript`. The daemon has no
 * Electron runtime, so the app's Notification API is unavailable here.
 */
export function notifyRunComplete(routine: Routine, run: Run, enabled: boolean): void {
  if (!enabled) {
    return
  }
  const label = STATUS_LABEL[run.status]
  if (!label) {
    return
  }
  const duration = run.durationSec != null ? ` · ${fmtDur(run.durationSec)}` : ''
  const title = escapeAppleScript(`${label}: ${routine.name}`)
  const body = escapeAppleScript(`${run.summary}${duration}`)
  execFile('osascript', ['-e', `display notification "${body}" with title "${title}"`], () => {
    /* best-effort: a failed notification must not affect scheduling */
  })
}
