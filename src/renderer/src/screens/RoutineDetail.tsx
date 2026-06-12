// renderer/src/screens/RoutineDetail.tsx — STUB (Phase A). Worker unit 2 implements the
// routine detail: prompt block, stats, danger-zone delete, recent runs.
// Port from project/app/screens-routines.jsx (RoutineDetailScreen).
import React from 'react'
import { useStore } from '../store'
import { ScreenHead, Btn, Icon } from '../components'
import type { ScreenProps } from '../views'

export function RoutineDetailScreen({
  routineId,
  nav,
  openEditor
}: ScreenProps & { routineId: string }): React.JSX.Element {
  const routine = useStore((s) => s.routines.find((r) => r.id === routineId))
  if (!routine) {
    return <div className="screen stub-note">Routine not found.</div>
  }
  return (
    <div className="screen" data-screen-label="Routine detail">
      <div className="crumbs">
        <button type="button" className="crumb-link" onClick={() => nav({ screen: 'routines' })}>
          <Icon name="chevL" size={13} /> Routines
        </button>
      </div>
      <ScreenHead title={routine.name}>
        <Btn ghost icon="edit" onClick={() => openEditor(routine.id)}>
          Edit
        </Btn>
      </ScreenHead>
      <div className="stub-note">Routine detail (unit 2) for {routine.name}.</div>
    </div>
  )
}
