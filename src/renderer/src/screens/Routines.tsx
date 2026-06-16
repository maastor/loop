// renderer/src/screens/Routines.tsx — routines screen data wiring.
// Ported from project/app/screens-routines.jsx.
import React from 'react'
import { useStore } from '../store'
import type { RoutineGroupBy, RoutineSortBy, Run } from '@shared/types'
import type { ScreenProps } from '../views'
import { NoRoutines, RoutinesHeader, ROUTINE_VARIANTS } from './routine-list-variants'
import { buildRoutineGroups } from './routine-list-groups'

export function RoutinesScreen({ nav, now, openEditor }: ScreenProps): React.JSX.Element {
  const routines = useStore((s) => s.routines)
  const runs = useStore((s) => s.runs)
  const tweaks = useStore((s) => s.tweaks)
  const toggleRoutine = useStore((s) => s.toggleRoutine)
  const runNow = useStore((s) => s.runNow)
  const setTweak = useStore((s) => s.setTweak)

  const runsByRoutine = React.useMemo(() => {
    const grouped: Record<string, Run[]> = {}
    for (const run of runs) {
      ;(grouped[run.routineId] = grouped[run.routineId] || []).push(run)
    }
    return grouped
  }, [runs])

  const active = routines.filter((routine) => routine.enabled).length
  const Variant = ROUTINE_VARIANTS[tweaks.layout] || ROUTINE_VARIANTS.rows
  const routineGroupBy = tweaks.routineGroupBy ?? 'project'
  const routineSortBy = tweaks.routineSortBy ?? 'name'
  const groups = React.useMemo(
    () =>
      buildRoutineGroups({
        routines,
        runsByRoutine,
        now,
        groupBy: routineGroupBy,
        sortBy: routineSortBy
      }),
    [routines, runsByRoutine, now, routineGroupBy, routineSortBy]
  )

  const onOpen = (id: string): void => nav({ screen: 'routine', routineId: id })
  const onOpenRun = (id: string): void =>
    nav({ screen: 'run', runId: id, from: { screen: 'routines' } })

  return (
    <div className="screen" data-screen-label="Routines list">
      <RoutinesHeader
        active={active}
        paused={routines.length - active}
        onCreate={openEditor}
        groupBy={routineGroupBy}
        sortBy={routineSortBy}
        onGroupByChange={(value: RoutineGroupBy) => void setTweak('routineGroupBy', value)}
        onSortByChange={(value: RoutineSortBy) => void setTweak('routineSortBy', value)}
      />
      {routines.length === 0 ? (
        <NoRoutines onCreate={openEditor} />
      ) : (
        <Variant
          groups={groups}
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
