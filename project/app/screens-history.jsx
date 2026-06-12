// screens-history.jsx — run history + run detail (transcript)
const histUtil = window.CCR;

function HistoryScreen({ routines, runs, now, nav }) {
  const [statusFilter, setStatusFilter] = React.useState('all');
  const [routineFilter, setRoutineFilter] = React.useState('all');

  const routineName = (id) => (routines.find((r) => r.id === id) || { name: 'Deleted routine' }).name;

  const filtered = runs.filter((r) =>
    (statusFilter === 'all' || r.status === statusFilter) &&
    (routineFilter === 'all' || r.routineId === routineFilter)
  );

  // group by day
  const groups = React.useMemo(() => {
    const m = new Map();
    for (const r of filtered) {
      const d = new Date(r.start);
      const k = `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`;
      if (!m.has(k)) m.set(k, { date: d, runs: [] });
      m.get(k).runs.push(r);
    }
    return [...m.values()];
  }, [filtered]);

  const totalCost = filtered.reduce((a, r) => a + (r.costUsd || 0), 0);

  return (
    <div className="screen" data-screen-label="History">
      <ScreenHead title="History" sub={`${filtered.length} runs · ${histUtil.fmtCost(totalCost)} total`}>
        <select className="select" value={routineFilter} onChange={(e) => setRoutineFilter(e.target.value)}>
          <option value="all">All routines</option>
          {routines.map((r) => <option key={r.id} value={r.id}>{r.name}</option>)}
        </select>
        <Seg value={statusFilter} onChange={setStatusFilter}
          options={[
            { value: 'all', label: 'All' },
            { value: 'success', label: 'Success' },
            { value: 'failed', label: 'Failed' },
          ]} />
      </ScreenHead>

      {groups.length === 0 ? (
        <EmptyState icon="history" title="No runs match"
          body="Adjust the filters, or wait for the next scheduled run." />
      ) : (
        <div className="hist-groups">
          {groups.slice(0, 21).map((g) => (
            <div key={g.date.toISOString()} className="hist-group">
              <div className="hist-date mono">{histUtil.fmtDate(g.date)}</div>
              <div className="run-list">
                {g.runs.map((run) => (
                  <div key={run.id} className="run-row" onClick={() => nav({ screen: 'run', runId: run.id, from: { screen: 'history' } })}>
                    <StatusDot status={run.status} />
                    <span className="mono run-row-time">{histUtil.fmtTime(run.start)}</span>
                    <span className="run-row-name">{routineName(run.routineId)}</span>
                    <span className="run-row-summary">{run.summary}</span>
                    <RunStats run={run} />
                    <Icon name="chevR" size={13} style={{ color: 'var(--text-3)' }} />
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ── run detail ───────────────────────────────────────────────
function RunDetailScreen({ routines, run, now, nav, from }) {
  const routine = routines.find((r) => r.id === run.routineId);
  const backTarget = from || { screen: 'history' };
  const backLabel = { history: 'History', calendar: 'Calendar', routine: routine ? routine.name : 'Routine', routines: 'Routines' }[backTarget.screen] || 'Back';

  return (
    <div className="screen" data-screen-label="Run detail">
      <div className="crumbs">
        <button type="button" className="crumb-link" onClick={() => nav(backTarget)}>
          <Icon name="chevL" size={13} /> {backLabel}
        </button>
      </div>

      <ScreenHead
        title={routine ? routine.name : 'Deleted routine'}
        sub={histUtil.fmtDateTime(run.start)}>
        <StatusBadge status={run.status} />
      </ScreenHead>

      <div className="run-meta-strip panel">
        <div className="run-meta"><span className="kv-k mono">duration</span><span className="mono">{histUtil.fmtDur(run.durationSec)}</span></div>
        <div className="run-meta"><span className="kv-k mono">cost</span><span className="mono">{histUtil.fmtCost(run.costUsd)}</span></div>
        <div className="run-meta"><span className="kv-k mono">tokens</span><span className="mono">{histUtil.fmtTokens(run.tokens)}</span></div>
        <div className="run-meta"><span className="kv-k mono">model</span>{routine ? <ModelChip model={routine.model} /> : <span className="mono">—</span>}</div>
        <div className="run-meta"><span className="kv-k mono">directory</span><span className="mono">{routine ? routine.dir : '—'}</span></div>
      </div>

      <div className="run-detail-grid">
        <div className="panel">
          <div className="panel-label mono">summary</div>
          <p className="run-summary-text">{run.summary}</p>
          {run.changes && run.changes.length > 0 ? (
            <div>
              <div className="panel-label mono" style={{ marginTop: 14 }}>changes</div>
              <div className="change-list">
                {run.changes.map((c, i) => <ChangeItem key={i} change={c} />)}
              </div>
            </div>
          ) : run.status === 'success' ? (
            <div className="dim mono" style={{ fontSize: 12, marginTop: 12 }}>no changes made</div>
          ) : null}
        </div>

        <div className="panel transcript-panel">
          <div className="panel-label mono">transcript</div>
          <Transcript entries={run.transcript || []} />
          {run.status === 'running' ? (
            <div className="tr-line tr-result">
              <span className="tr-mark mono blink">▊</span>
              <span className="tr-text mono dim">working…</span>
            </div>
          ) : null}
        </div>
      </div>
    </div>
  );
}

Object.assign(window, { HistoryScreen, RunDetailScreen });
