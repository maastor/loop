import React from 'react'
import { Btn, EmptyState, Icon, ModelChip, ScreenHead, StatusDot, Toggle } from '../components'
import { computeNextRun, describeSchedule } from '@shared/schedule'
import { fmtTime, relTime, relUntil } from '@shared/format'
import type { Routine, Run } from '@shared/types'

export function RoutinesHeader({
  active,
  paused,
  onCreate
}: {
  active: number
  paused: number
  onCreate: () => void
}): React.JSX.Element {
  return (
    <ScreenHead title="Routines" sub={`${active} active · ${paused} paused`}>
      <Btn primary icon="plus" onClick={onCreate}>
        New routine
      </Btn>
    </ScreenHead>
  )
}

export function NoRoutines({ onCreate }: { onCreate: () => void }): React.JSX.Element {
  return (
    <EmptyState
      icon="routines"
      title="No routines yet"
      body="A routine is a prompt Claude Code runs on a schedule — triage issues every morning, audit dependencies nightly."
    >
      <Btn primary icon="plus" onClick={onCreate}>
        Create your first routine
      </Btn>
    </EmptyState>
  )
}

function NextRunLabel({ routine, now }: { routine: Routine; now: Date }): React.JSX.Element {
  if (!routine.enabled) {
    return <span className="mono dim">paused</span>
  }
  const next = computeNextRun(routine.schedule, now)
  if (!next) {
    return <span className="mono dim">—</span>
  }
  return (
    <span className="mono">
      {relUntil(next, now)} · {fmtTime(next)}
    </span>
  )
}

function LastRunCell({
  run,
  now,
  onOpen
}: {
  run: Run | undefined
  now: Date
  onOpen: (id: string) => void
}): React.JSX.Element {
  if (!run) {
    return <span className="dim mono">never ran</span>
  }
  return (
    <button
      type="button"
      className="lastrun-link"
      onClick={(e) => {
        e.stopPropagation()
        onOpen(run.id)
      }}
    >
      <StatusDot status={run.status} size={6} />
      <span className="mono">
        {run.status === 'running' ? 'running now' : relTime(run.start, now)}
      </span>
    </button>
  )
}

function RunSpark({ runs }: { runs: Run[] }): React.JSX.Element {
  const last = runs.slice(0, 12).reverse()
  return (
    <div className="spark" aria-hidden="true">
      {last.map((run, index) => (
        <span
          key={index}
          className="spark-bar"
          style={{
            background:
              run.status === 'failed'
                ? 'var(--red)'
                : run.status === 'running'
                  ? 'var(--accent)'
                  : 'var(--green-dim)',
            height: run.status === 'failed' ? 14 : 8 + ((run.durationSec || 120) % 7)
          }}
        />
      ))}
    </div>
  )
}

export type RoutineVariantProps = {
  routines: Routine[]
  runsByRoutine: Record<string, Run[]>
  now: Date
  onOpen: (id: string) => void
  onToggle: (id: string) => void
  onOpenRun: (id: string) => void
  onRunNow: (id: string) => void
}

function RoutineRows({
  routines,
  runsByRoutine,
  now,
  onOpen,
  onToggle,
  onOpenRun,
  onRunNow
}: RoutineVariantProps): React.JSX.Element {
  return (
    <div className="row-list">
      {routines.map((routine) => {
        const runs = runsByRoutine[routine.id] || []
        return (
          <div
            key={routine.id}
            className={`rt-row${routine.enabled ? '' : ' off'}`}
            onClick={() => onOpen(routine.id)}
          >
            <Toggle value={routine.enabled} onChange={() => onToggle(routine.id)} small />
            <div className="rt-row-main">
              <div className="rt-row-name">{routine.name}</div>
              <div className="rt-row-meta mono">
                {describeSchedule(routine.schedule)} · {routine.dir}
              </div>
            </div>
            <RunSpark runs={runs} />
            <div className="rt-row-cell">
              <div className="cell-label mono">last run</div>
              <LastRunCell run={runs[0]} now={now} onOpen={onOpenRun} />
            </div>
            <div className="rt-row-cell">
              <div className="cell-label mono">next run</div>
              <NextRunLabel routine={routine} now={now} />
            </div>
            <Btn
              ghost
              small
              icon="play"
              title="Run now"
              onClick={(e) => {
                e.stopPropagation()
                onRunNow(routine.id)
              }}
            />
          </div>
        )
      })}
    </div>
  )
}

function RoutineCards({
  routines,
  runsByRoutine,
  now,
  onOpen,
  onToggle,
  onOpenRun,
  onRunNow
}: RoutineVariantProps): React.JSX.Element {
  return (
    <div className="card-grid">
      {routines.map((routine) => {
        const runs = runsByRoutine[routine.id] || []
        const last = runs[0]
        return (
          <div
            key={routine.id}
            className={`rt-card${routine.enabled ? '' : ' off'}`}
            onClick={() => onOpen(routine.id)}
          >
            <div className="rt-card-top">
              <div className="rt-card-name">{routine.name}</div>
              <Toggle value={routine.enabled} onChange={() => onToggle(routine.id)} small />
            </div>
            <div className="rt-card-prompt">{routine.prompt}</div>
            <div className="rt-card-sched mono">
              <Icon name="clock" size={13} /> {describeSchedule(routine.schedule)}
            </div>
            <div className="rt-card-foot">
              <LastRunCell run={last} now={now} onOpen={onOpenRun} />
              <div style={{ flex: 1 }} />
              <ModelChip model={routine.model} />
              <Btn
                ghost
                small
                icon="play"
                title="Run now"
                onClick={(e) => {
                  e.stopPropagation()
                  onRunNow(routine.id)
                }}
              />
            </div>
          </div>
        )
      })}
    </div>
  )
}

function RoutineTable({
  routines,
  runsByRoutine,
  now,
  onOpen,
  onToggle,
  onOpenRun,
  onRunNow
}: RoutineVariantProps): React.JSX.Element {
  return (
    <table className="tbl">
      <thead>
        <tr>
          <th style={{ width: 44 }} />
          <th>Routine</th>
          <th>Schedule</th>
          <th>Model</th>
          <th>Last run</th>
          <th>Next run</th>
          <th style={{ width: 40 }} />
        </tr>
      </thead>
      <tbody>
        {routines.map((routine) => {
          const runs = runsByRoutine[routine.id] || []
          return (
            <tr
              key={routine.id}
              className={routine.enabled ? '' : 'off'}
              onClick={() => onOpen(routine.id)}
            >
              <td>
                <Toggle value={routine.enabled} onChange={() => onToggle(routine.id)} small />
              </td>
              <td>
                <div className="tbl-name">{routine.name}</div>
                <div className="tbl-dir mono dim">{routine.dir}</div>
              </td>
              <td className="mono">{describeSchedule(routine.schedule)}</td>
              <td>
                <ModelChip model={routine.model} />
              </td>
              <td>
                <LastRunCell run={runs[0]} now={now} onOpen={onOpenRun} />
              </td>
              <td>
                <NextRunLabel routine={routine} now={now} />
              </td>
              <td>
                <Btn
                  ghost
                  small
                  icon="play"
                  title="Run now"
                  onClick={(e) => {
                    e.stopPropagation()
                    onRunNow(routine.id)
                  }}
                />
              </td>
            </tr>
          )
        })}
      </tbody>
    </table>
  )
}

export const ROUTINE_VARIANTS: Record<string, (props: RoutineVariantProps) => React.JSX.Element> = {
  rows: RoutineRows,
  cards: RoutineCards,
  table: RoutineTable
}
