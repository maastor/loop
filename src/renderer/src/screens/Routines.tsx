// renderer/src/screens/Routines.tsx — STUB (Phase A). Worker unit 1 implements the
// routines list with rows/cards/table variants, sparkline, and run-now.
// Port from project/app/screens-routines.jsx (RoutinesScreen + 3 variants + RunSpark).
import React from 'react'
import { useStore } from '../store'
import { ScreenHead, Btn } from '../components'
import type { ScreenProps } from '../views'

export function RoutinesScreen({ nav, openEditor }: ScreenProps): React.JSX.Element {
  const routines = useStore((s) => s.routines)
  const active = routines.filter((r) => r.enabled).length
  return (
    <div className="screen" data-screen-label="Routines list">
      <ScreenHead title="Routines" sub={`${active} active · ${routines.length - active} paused`}>
        <Btn primary icon="plus" onClick={() => openEditor()}>
          New routine
        </Btn>
      </ScreenHead>
      <div className="stub-note">
        Routines list (unit 1) — {routines.length} routines.
        <br />
        <button className="link-btn" onClick={() => routines[0] && nav({ screen: 'routine', routineId: routines[0].id })}>
          open first routine
        </button>
      </div>
    </div>
  )
}
