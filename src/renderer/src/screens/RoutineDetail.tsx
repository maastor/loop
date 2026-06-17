// renderer/src/screens/RoutineDetail.tsx — routine detail: prompt block, stats,
// danger-zone delete, recent runs. Ported from project/app/screens-routines.jsx
// (RoutineDetailScreen).
import React from 'react'
import { useStore } from '../store'
import {
  ScreenHead,
  Btn,
  Icon,
  Toggle,
  AgentChip,
  ModelChip,
  StatusDot,
  RunStats
} from '../components'
import { describeSchedule, computeNextRun } from '@shared/schedule'
import { fmtDateTime, relUntil } from '@shared/format'
import type { ScreenProps } from '../views'

export function RoutineDetailScreen({
  routineId,
  nav,
  now,
  openEditor
}: ScreenProps & { routineId: string }): React.JSX.Element {
  const routine = useStore((s) => s.routines.find((r) => r.id === routineId))
  const allRuns = useStore((s) => s.runs)
  const toggleRoutine = useStore((s) => s.toggleRoutine)
  const runNow = useStore((s) => s.runNow)
  const deleteRoutine = useStore((s) => s.deleteRoutine)
  const [confirmDelete, setConfirmDelete] = React.useState(false)

  if (!routine) {
    return <div className="screen stub-note">Routine not found.</div>
  }

  const myRuns = allRuns.filter((r) => r.routineId === routine.id)
  const next = routine.enabled ? computeNextRun(routine.schedule, now) : null
  const ok = myRuns.filter((r) => r.status === 'success').length
  const fail = myRuns.filter((r) => r.status === 'failed').length
  const totalCost = myRuns.reduce((a, r) => a + (r.costUsd || 0), 0)

  return (
    <div className="screen" data-screen-label="Routine detail">
      <div className="crumbs">
        <button type="button" className="crumb-link" onClick={() => nav({ screen: 'routines' })}>
          <Icon name="chevL" size={13} /> Routines
        </button>
      </div>
      <ScreenHead
        title={routine.name}
        sub={routine.enabled ? describeSchedule(routine.schedule) : 'Paused'}
      >
        <Btn ghost icon="play" onClick={() => runNow(routine.id)}>
          Run now
        </Btn>
        <Btn ghost icon="edit" onClick={() => openEditor(routine.id)}>
          Edit
        </Btn>
        <Toggle value={routine.enabled} onChange={() => toggleRoutine(routine.id)} />
      </ScreenHead>

      <div className="detail-grid">
        <div className="panel">
          <div className="panel-label mono">prompt</div>
          <div className="prompt-block mono">
            <span className="prompt-mark">❯</span>
            {routine.prompt}
          </div>
          <div className="kv-grid">
            <div className="kv">
              <span className="kv-k mono">agent</span>
              <span className="kv-v">
                <AgentChip agent={routine.agent} />
              </span>
            </div>
            <div className="kv">
              <span className="kv-k mono">working dir</span>
              <span className="kv-v mono">
                <Icon name="folder" size={13} /> {routine.dir}
              </span>
            </div>
            <div className="kv">
              <span className="kv-k mono">model</span>
              <span className="kv-v">
                <ModelChip model={routine.model} />
              </span>
            </div>
            <div className="kv">
              <span className="kv-k mono">next run</span>
              <span className="kv-v mono">
                {next ? `${fmtDateTime(next)} (${relUntil(next, now)})` : '—'}
              </span>
            </div>
          </div>
        </div>
        <div className="panel">
          <div className="panel-label mono">last 30 days</div>
          <div className="stat-row">
            <div className="stat">
              <div className="stat-n">{myRuns.length}</div>
              <div className="stat-l mono">runs</div>
            </div>
            <div className="stat">
              <div className="stat-n" style={{ color: 'var(--green)' }}>
                {ok}
              </div>
              <div className="stat-l mono">succeeded</div>
            </div>
            <div className="stat">
              <div className="stat-n" style={{ color: fail ? 'var(--red)' : undefined }}>
                {fail}
              </div>
              <div className="stat-l mono">failed</div>
            </div>
            <div className="stat">
              <div className="stat-n">${totalCost.toFixed(0)}</div>
              <div className="stat-l mono">total cost</div>
            </div>
          </div>
          <div className="panel-label mono" style={{ marginTop: 18 }}>
            danger zone
          </div>
          {confirmDelete ? (
            <div className="confirm-row">
              <span className="dim" style={{ fontSize: 12.5 }}>
                Delete this routine and keep its history?
              </span>
              <Btn
                danger
                small
                onClick={async () => {
                  await deleteRoutine(routine.id)
                  nav({ screen: 'routines' })
                }}
              >
                Delete
              </Btn>
              <Btn ghost small onClick={() => setConfirmDelete(false)}>
                Cancel
              </Btn>
            </div>
          ) : (
            <Btn ghost small icon="trash" onClick={() => setConfirmDelete(true)}>
              Delete routine
            </Btn>
          )}
        </div>
      </div>

      <div className="panel" style={{ marginTop: 14 }}>
        <div className="panel-label mono">recent runs</div>
        {myRuns.length === 0 ? (
          <div className="dim" style={{ padding: '14px 2px', fontSize: 13 }}>
            This routine hasn&apos;t run yet.
          </div>
        ) : (
          <div className="run-list">
            {myRuns.slice(0, 8).map((run) => (
              <div
                key={run.id}
                className="run-row"
                onClick={() =>
                  nav({
                    screen: 'run',
                    runId: run.id,
                    from: { screen: 'routine', routineId: routine.id }
                  })
                }
              >
                <StatusDot status={run.status} />
                <span className="mono run-row-time">{fmtDateTime(run.start)}</span>
                <span className="run-row-summary">{run.summary}</span>
                <RunStats run={run} />
                <Icon name="chevR" size={13} style={{ color: 'var(--text-3)' }} />
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
