// renderer/src/screens/History.tsx — STUB (Phase A). Worker unit 5 implements run history
// grouped by day with status/routine filters.
// Port from project/app/screens-history.jsx (HistoryScreen).
import React from 'react'
import { useStore } from '../store'
import { ScreenHead } from '../components'
import type { ScreenProps } from '../views'

export function HistoryScreen({ nav }: ScreenProps): React.JSX.Element {
  const runs = useStore((s) => s.runs)
  return (
    <div className="screen" data-screen-label="History">
      <ScreenHead title="History" sub={`${runs.length} runs`} />
      <div className="stub-note">
        History (unit 5) — {runs.length} runs.
        {runs[0] ? (
          <>
            <br />
            <button className="link-btn" onClick={() => nav({ screen: 'run', runId: runs[0].id, from: { screen: 'history' } })}>
              open latest run
            </button>
          </>
        ) : null}
      </div>
    </div>
  )
}
