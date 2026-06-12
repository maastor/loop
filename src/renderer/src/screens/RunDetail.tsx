// renderer/src/screens/RunDetail.tsx — STUB (Phase A). Worker unit 5 implements the run
// detail: meta strip (duration/cost/tokens/model/dir), summary + changes, transcript.
// Port from project/app/screens-history.jsx (RunDetailScreen).
import React from 'react'
import { useStore } from '../store'
import { ScreenHead, StatusBadge, Transcript, Icon } from '../components'
import { fmtDateTime } from '@shared/format'
import type { ScreenProps, View } from '../views'

export function RunDetailScreen({
  runId,
  from,
  nav
}: ScreenProps & { runId: string; from?: View }): React.JSX.Element {
  const run = useStore((s) => s.runs.find((r) => r.id === runId))
  const routine = useStore((s) => s.routines.find((r) => r.id === run?.routineId))
  if (!run) return <div className="screen stub-note">Run not found.</div>
  const back: View = from || { screen: 'history' }
  return (
    <div className="screen" data-screen-label="Run detail">
      <div className="crumbs">
        <button type="button" className="crumb-link" onClick={() => nav(back)}>
          <Icon name="chevL" size={13} /> Back
        </button>
      </div>
      <ScreenHead title={routine ? routine.name : 'Deleted routine'} sub={fmtDateTime(run.start)}>
        <StatusBadge status={run.status} />
      </ScreenHead>
      <div className="panel transcript-panel" style={{ marginTop: 14 }}>
        <div className="panel-label mono">transcript</div>
        <Transcript entries={run.transcript || []} />
      </div>
    </div>
  )
}
