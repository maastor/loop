// renderer/src/screens/Routines.tsx — routines list with rows/cards/table variants,
// run sparkline, last/next run cells, enable toggle, run-now, and empty state.
// Ported from project/app/screens-routines.jsx.
import React from 'react'
import { useStore } from '../store'
import { Icon, StatusDot, Toggle, Btn, ModelChip, ScreenHead, EmptyState } from '../components'
import { describeSchedule, computeNextRun } from '@shared/schedule'
import { relTime, relUntil, fmtTime } from '@shared/format'
import type { Routine, Run } from '@shared/types'
import type { ScreenProps } from '../views'

// ── shared row pieces ────────────────────────────────────────
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

// sparkline of last 12 run outcomes
function RunSpark({ runs }: { runs: Run[] }): React.JSX.Element {
  const last = runs.slice(0, 12).reverse()
  return (
    <div className="spark" aria-hidden="true">
      {last.map((r, i) => (
        <span
          key={i}
          className="spark-bar"
          style={{
            background:
              r.status === 'failed'
                ? 'var(--red)'
                : r.status === 'running'
                  ? 'var(--accent)'
                  : 'var(--green-dim)',
            height: r.status === 'failed' ? 14 : 8 + ((r.durationSec || 120) % 7)
          }}
        />
      ))}
    </div>
  )
}

type VariantProps = {
  routines: Routine[]
  runsByRoutine: Record<string, Run[]>
  now: Date
  onOpen: (id: string) => void
  onToggle: (id: string) => void
  onOpenRun: (id: string) => void
  onRunNow: (id: string) => void
}

// ── variant: rows ────────────────────────────────────────────
function RoutineRows({
  routines,
  runsByRoutine,
  now,
  onOpen,
  onToggle,
  onOpenRun,
  onRunNow
}: VariantProps): React.JSX.Element {
  return (
    <div className="row-list">
      {routines.map((r) => {
        const runs = runsByRoutine[r.id] || []
        return (
          <div
            key={r.id}
            className={`rt-row${r.enabled ? '' : ' off'}`}
            onClick={() => onOpen(r.id)}
          >
            <Toggle value={r.enabled} onChange={() => onToggle(r.id)} small />
            <div className="rt-row-main">
              <div className="rt-row-name">{r.name}</div>
              <div className="rt-row-meta mono">
                {describeSchedule(r.schedule)} · {r.dir}
              </div>
            </div>
            <RunSpark runs={runs} />
            <div className="rt-row-cell">
              <div className="cell-label mono">last run</div>
              <LastRunCell run={runs[0]} now={now} onOpen={onOpenRun} />
            </div>
            <div className="rt-row-cell">
              <div className="cell-label mono">next run</div>
              <NextRunLabel routine={r} now={now} />
            </div>
            <Btn
              ghost
              small
              icon="play"
              title="Run now"
              onClick={(e) => {
                e.stopPropagation()
                onRunNow(r.id)
              }}
            />
          </div>
        )
      })}
    </div>
  )
}

// ── variant: cards ───────────────────────────────────────────
function RoutineCards({
  routines,
  runsByRoutine,
  now,
  onOpen,
  onToggle,
  onOpenRun,
  onRunNow
}: VariantProps): React.JSX.Element {
  return (
    <div className="card-grid">
      {routines.map((r) => {
        const runs = runsByRoutine[r.id] || []
        const last = runs[0]
        return (
          <div
            key={r.id}
            className={`rt-card${r.enabled ? '' : ' off'}`}
            onClick={() => onOpen(r.id)}
          >
            <div className="rt-card-top">
              <div className="rt-card-name">{r.name}</div>
              <Toggle value={r.enabled} onChange={() => onToggle(r.id)} small />
            </div>
            <div className="rt-card-prompt">{r.prompt}</div>
            <div className="rt-card-sched mono">
              <Icon name="clock" size={13} /> {describeSchedule(r.schedule)}
            </div>
            <div className="rt-card-foot">
              <LastRunCell run={last} now={now} onOpen={onOpenRun} />
              <div style={{ flex: 1 }} />
              <ModelChip model={r.model} />
              <Btn
                ghost
                small
                icon="play"
                title="Run now"
                onClick={(e) => {
                  e.stopPropagation()
                  onRunNow(r.id)
                }}
              />
            </div>
          </div>
        )
      })}
    </div>
  )
}

// ── variant: table ───────────────────────────────────────────
function RoutineTable({
  routines,
  runsByRoutine,
  now,
  onOpen,
  onToggle,
  onOpenRun,
  onRunNow
}: VariantProps): React.JSX.Element {
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
        {routines.map((r) => {
          const runs = runsByRoutine[r.id] || []
          return (
            <tr key={r.id} className={r.enabled ? '' : 'off'} onClick={() => onOpen(r.id)}>
              <td>
                <Toggle value={r.enabled} onChange={() => onToggle(r.id)} small />
              </td>
              <td>
                <div className="tbl-name">{r.name}</div>
                <div className="tbl-dir mono dim">{r.dir}</div>
              </td>
              <td className="mono">{describeSchedule(r.schedule)}</td>
              <td>
                <ModelChip model={r.model} />
              </td>
              <td>
                <LastRunCell run={runs[0]} now={now} onOpen={onOpenRun} />
              </td>
              <td>
                <NextRunLabel routine={r} now={now} />
              </td>
              <td>
                <Btn
                  ghost
                  small
                  icon="play"
                  title="Run now"
                  onClick={(e) => {
                    e.stopPropagation()
                    onRunNow(r.id)
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

const VARIANTS: Record<string, (p: VariantProps) => React.JSX.Element> = {
  rows: RoutineRows,
  cards: RoutineCards,
  table: RoutineTable
}

// ── routines screen ──────────────────────────────────────────
export function RoutinesScreen({ nav, now, openEditor }: ScreenProps): React.JSX.Element {
  const routines = useStore((s) => s.routines)
  const runs = useStore((s) => s.runs)
  const layout = useStore((s) => s.tweaks.layout)
  const toggleRoutine = useStore((s) => s.toggleRoutine)
  const runNow = useStore((s) => s.runNow)

  const runsByRoutine = React.useMemo(() => {
    const m: Record<string, Run[]> = {}
    for (const run of runs) {
      ;(m[run.routineId] = m[run.routineId] || []).push(run)
    }
    return m
  }, [runs])

  const active = routines.filter((r) => r.enabled).length
  const Variant = VARIANTS[layout] || RoutineRows

  const onOpen = (id: string): void => nav({ screen: 'routine', routineId: id })
  const onOpenRun = (id: string): void =>
    nav({ screen: 'run', runId: id, from: { screen: 'routines' } })

  return (
    <div className="screen" data-screen-label="Routines list">
      <ScreenHead title="Routines" sub={`${active} active · ${routines.length - active} paused`}>
        <Btn primary icon="plus" onClick={() => openEditor()}>
          New routine
        </Btn>
      </ScreenHead>
      {routines.length === 0 ? (
        <EmptyState
          icon="routines"
          title="No routines yet"
          body="A routine is a prompt Claude Code runs on a schedule — triage issues every morning, audit dependencies nightly."
        >
          <Btn primary icon="plus" onClick={() => openEditor()}>
            Create your first routine
          </Btn>
        </EmptyState>
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
