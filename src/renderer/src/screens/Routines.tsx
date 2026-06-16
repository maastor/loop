// renderer/src/screens/Routines.tsx — routines screen data wiring.
// Ported from project/app/screens-routines.jsx.
import React from 'react'
import { useStore } from '../store'
import type { Run } from '@shared/types'
import type { ScreenProps } from '../views'
import { NoRoutines, RoutinesHeader, ROUTINE_VARIANTS } from './routine-list-variants'

export function RoutinesScreen({ nav, now, openEditor }: ScreenProps): React.JSX.Element {
  const routines = useStore((s) => s.routines)
  const runs = useStore((s) => s.runs)
  const layout = useStore((s) => s.tweaks.layout)
  const toggleRoutine = useStore((s) => s.toggleRoutine)
  const runNow = useStore((s) => s.runNow)

  const runsByRoutine = React.useMemo(() => {
    const grouped: Record<string, Run[]> = {}
    for (const run of runs) {
      ;(grouped[run.routineId] = grouped[run.routineId] || []).push(run)
    }
    return grouped
  }, [runs])

  const active = routines.filter((routine) => routine.enabled).length
  const Variant = ROUTINE_VARIANTS[layout] || ROUTINE_VARIANTS.rows

  const onOpen = (id: string): void => nav({ screen: 'routine', routineId: id })
  const onOpenRun = (id: string): void =>
    nav({ screen: 'run', runId: id, from: { screen: 'routines' } })

  return (
    <div className="screen" data-screen-label="Routines list">
      <RoutinesHeader active={active} paused={routines.length - active} onCreate={openEditor} />
      {routines.length === 0 ? (
        <NoRoutines onCreate={openEditor} />
      ) : (
        <Variant
          routines={routines}
          runsByRoutine={runsByRoutine}
          now={now}
          onOpen={onOpen}
          onToggle={(id) => void toggleRoutine(id)}
          onOpenRun={onOpenRun}
          onRunNow={(id) => void runNow(id)}
        />
      )}
    </div>
  )
}
