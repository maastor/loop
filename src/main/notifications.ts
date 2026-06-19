import { Notification } from 'electron'
import type { Routine, Run } from '@shared/types'
import { fmtDur } from '@shared/format'
import { showMainWindow } from './window'

// Map run status to a leading glyph + word; skipped/running never notify.
const STATUS_LABEL: Partial<Record<Run['status'], string>> = {
  success: '✅ Completed',
  failed: '❌ Failed'
}

/**
 * Post a native macOS notification for a finished run. No-op when notifications are
 * disabled, unsupported, or the run did not actually finish (running/skipped).
 */
export function notifyRunComplete(routine: Routine, run: Run, enabled: boolean): void {
  if (!enabled || !Notification.isSupported()) {
    return
  }
  const label = STATUS_LABEL[run.status]
  if (!label) {
    return
  }
  const duration = run.durationSec != null ? ` · ${fmtDur(run.durationSec)}` : ''
  const notification = new Notification({
    title: `${label}: ${routine.name}`,
    body: `${run.summary}${duration}`,
    silent: false
  })
  // Clicking the banner should surface the app so the user can read the transcript.
  notification.on('click', () => showMainWindow())
  notification.show()
}
