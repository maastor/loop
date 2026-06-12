// renderer/src/screens/Calendar.tsx — STUB (Phase A). Worker unit 4 implements the
// month/week calendar of runs with status dots and a day panel.
// Port from project/app/screens-calendar.jsx (CalendarScreen).
import React from 'react'
import { useStore } from '../store'
import { ScreenHead } from '../components'
import type { ScreenProps } from '../views'

export function CalendarScreen(_props: ScreenProps): React.JSX.Element {
  const runs = useStore((s) => s.runs)
  return (
    <div className="screen" data-screen-label="Calendar">
      <ScreenHead title="Calendar" sub="Every run, where it landed" />
      <div className="stub-note">Calendar (unit 4) — {runs.length} runs to plot.</div>
    </div>
  )
}
