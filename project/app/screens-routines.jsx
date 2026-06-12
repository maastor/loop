// screens-routines.jsx — routines list (3 layout variants) + routine detail
const routinesUtil = window.CCR

// ── shared row pieces ────────────────────────────────────────
function NextRunLabel({ routine, now }) {
  if (!routine.enabled) return <span className="mono dim">paused</span>
  const next = routinesUtil.computeNextRun(routine.schedule, now)
  if (!next) return <span className="mono dim">—</span>
  return (
    <span className="mono">
      {routinesUtil.relUntil(next, now)} · {routinesUtil.fmtTime(next)}
    </span>
  )
}

function LastRunCell({ run, now, onOpen }) {
  if (!run) return <span className="dim mono">never ran</span>
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
        {run.status === 'running' ? 'running now' : routinesUtil.relTime(run.start, now)}
      </span>
    </button>
  )
}

// sparkline of last 12 run outcomes
function RunSpark({ runs }) {
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
        ></span>
      ))}
    </div>
  )
}

// ── variant: rows ────────────────────────────────────────────
function RoutineRows({ routines, runsByRoutine, now, onOpen, onToggle, onOpenRun, onRunNow }) {
  return (
    <div className="row-list">
      {routines.map((r) => {
        const runs = runsByRoutine[r.id] || []
        return (
          <div
            key={r.id}
            className={'rt-row' + (r.enabled ? '' : ' off')}
            onClick={() => onOpen(r.id)}
          >
            <Toggle value={r.enabled} onChange={() => onToggle(r.id)} small />
            <div className="rt-row-main">
              <div className="rt-row-name">{r.name}</div>
              <div className="rt-row-meta mono">
                {routinesUtil.describeSchedule(r.schedule)} · {r.dir}
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
function RoutineCards({ routines, runsByRoutine, now, onOpen, onToggle, onOpenRun, onRunNow }) {
  return (
    <div className="card-grid">
      {routines.map((r) => {
        const runs = runsByRoutine[r.id] || []
        const last = runs[0]
        return (
          <div
            key={r.id}
            className={'rt-card' + (r.enabled ? '' : ' off')}
            onClick={() => onOpen(r.id)}
          >
            <div className="rt-card-top">
              <div className="rt-card-name">{r.name}</div>
              <Toggle value={r.enabled} onChange={() => onToggle(r.id)} small />
            </div>
            <div className="rt-card-prompt">{r.prompt}</div>
            <div className="rt-card-sched mono">
              <Icon name="clock" size={13} /> {routinesUtil.describeSchedule(r.schedule)}
            </div>
            <div className="rt-card-foot">
              <LastRunCell run={last} now={now} onOpen={onOpenRun} />
              <div style={{ flex: 1 }}></div>
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
function RoutineTable({ routines, runsByRoutine, now, onOpen, onToggle, onOpenRun, onRunNow }) {
  return (
    <table className="tbl">
      <thead>
        <tr>
          <th style={{ width: 44 }}></th>
          <th>Routine</th>
          <th>Schedule</th>
          <th>Model</th>
          <th>Last run</th>
          <th>Next run</th>
          <th style={{ width: 40 }}></th>
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
              <td className="mono">{routinesUtil.describeSchedule(r.schedule)}</td>
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

// ── routines screen ──────────────────────────────────────────
function RoutinesScreen({ routines, runs, now, layout, nav, onToggle, onRunNow, onNew }) {
  const runsByRoutine = React.useMemo(() => {
    const m = {}
    for (const run of runs) (m[run.routineId] = m[run.routineId] || []).push(run)
    return m
  }, [runs])

  const active = routines.filter((r) => r.enabled).length
  const Variant =
    { rows: RoutineRows, cards: RoutineCards, table: RoutineTable }[layout] || RoutineRows

  return (
    <div className="screen" data-screen-label="Routines list">
      <ScreenHead title="Routines" sub={`${active} active · ${routines.length - active} paused`}>
        <Btn primary icon="plus" onClick={onNew}>
          New routine
        </Btn>
      </ScreenHead>
      {routines.length === 0 ? (
        <EmptyState
          icon="routines"
          title="No routines yet"
          body="A routine is a prompt Claude Code runs on a schedule — triage issues every morning, audit dependencies nightly."
        >
          <Btn primary icon="plus" onClick={onNew}>
            Create your first routine
          </Btn>
        </EmptyState>
      ) : (
        <Variant
          routines={routines}
          runsByRoutine={runsByRoutine}
          now={now}
          onOpen={(id) => nav({ screen: 'routine', routineId: id })}
          onToggle={onToggle}
          onOpenRun={(id) => nav({ screen: 'run', runId: id })}
          onRunNow={onRunNow}
        />
      )}
    </div>
  )
}

// ── routine detail ───────────────────────────────────────────
function RoutineDetailScreen({ routine, runs, now, nav, onToggle, onRunNow, onEdit, onDelete }) {
  const myRuns = runs.filter((r) => r.routineId === routine.id)
  const next = routine.enabled ? routinesUtil.computeNextRun(routine.schedule, now) : null
  const ok = myRuns.filter((r) => r.status === 'success').length
  const fail = myRuns.filter((r) => r.status === 'failed').length
  const totalCost = myRuns.reduce((a, r) => a + (r.costUsd || 0), 0)
  const [confirmDelete, setConfirmDelete] = React.useState(false)

  return (
    <div className="screen" data-screen-label="Routine detail">
      <div className="crumbs">
        <button type="button" className="crumb-link" onClick={() => nav({ screen: 'routines' })}>
          <Icon name="chevL" size={13} /> Routines
        </button>
      </div>
      <ScreenHead
        title={routine.name}
        sub={routine.enabled ? routinesUtil.describeSchedule(routine.schedule) : 'Paused'}
      >
        <Btn ghost icon="play" onClick={() => onRunNow(routine.id)}>
          Run now
        </Btn>
        <Btn ghost icon="edit" onClick={() => onEdit(routine.id)}>
          Edit
        </Btn>
        <Toggle value={routine.enabled} onChange={() => onToggle(routine.id)} />
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
                {next
                  ? `${routinesUtil.fmtDateTime(next)} (${routinesUtil.relUntil(next, now)})`
                  : '—'}
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
              <Btn danger small onClick={() => onDelete(routine.id)}>
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
            This routine hasn't run yet.
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
                <span className="mono run-row-time">{routinesUtil.fmtDateTime(run.start)}</span>
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

Object.assign(window, { RoutinesScreen, RoutineDetailScreen, RunSpark })
