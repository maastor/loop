// screens-menubar.jsx — macOS menu bar + quick-status dropdown
const mbUtil = window.CCR;

function MenuBar({ routines, runs, now, open, setOpen, pausedAll, setPausedAll, onOpenApp, clock }) {
  const running = runs.filter((r) => r.status === 'running');
  const recent = runs.filter((r) => r.status !== 'running').slice(0, 3);
  const nextUp = routines
    .filter((r) => r.enabled && !pausedAll)
    .map((r) => ({ r, next: mbUtil.computeNextRun(r.schedule, now) }))
    .filter((x) => x.next)
    .sort((a, b) => a.next - b.next)
    .slice(0, 2);

  const routineName = (id) => (routines.find((r) => r.id === id) || { name: 'Deleted routine' }).name;

  return (
    <div className="menubar" data-screen-label="Menu bar">
      <div className="menubar-left">
        <span className="mb-apple"></span>
        <span className="mb-item bold">Routines</span>
        <span className="mb-item">File</span>
        <span className="mb-item">Edit</span>
        <span className="mb-item">View</span>
        <span className="mb-item">Window</span>
        <span className="mb-item">Help</span>
      </div>
      <div className="menubar-right">
        <button type="button" className={'mb-status' + (open ? ' open' : '')} onClick={() => setOpen(!open)}
          title="Claude Routines quick status">
          <Icon name="spark" size={13} />
          {running.length > 0 && !pausedAll ? <span className="mb-status-dot"></span> : null}
        </button>
        <span className="mb-item mono">{clock}</span>
      </div>

      {open ? (
        <div className="mb-panel" data-screen-label="Menu bar dropdown">
          <div className="mb-panel-head">
            <span className="mb-panel-title">Routines</span>
            <label className="mb-pause mono">
              pause all
              <Toggle value={pausedAll} onChange={setPausedAll} small />
            </label>
          </div>

          {pausedAll ? (
            <div className="mb-section">
              <div className="mb-paused-note mono"><StatusDot status="paused" /> all routines paused</div>
            </div>
          ) : (
            <div>
              {running.length > 0 ? (
                <div className="mb-section">
                  <div className="mb-section-label mono">running now</div>
                  {running.map((run) => (
                    <div key={run.id} className="mb-run">
                      <StatusDot status="running" />
                      <div className="mb-run-main">
                        <span className="mb-run-name">{routineName(run.routineId)}</span>
                        <span className="mono dim mb-run-sub">started {mbUtil.relTime(run.start, now)}</span>
                      </div>
                    </div>
                  ))}
                </div>
              ) : null}
              <div className="mb-section">
                <div className="mb-section-label mono">next up</div>
                {nextUp.length === 0 ? (
                  <div className="dim mono" style={{ fontSize: 11, padding: '4px 2px' }}>nothing scheduled</div>
                ) : nextUp.map(({ r, next }) => (
                  <div key={r.id} className="mb-run">
                    <Icon name="clock" size={12} style={{ color: 'var(--text-3)' }} />
                    <div className="mb-run-main">
                      <span className="mb-run-name">{r.name}</span>
                      <span className="mono dim mb-run-sub">{mbUtil.relUntil(next, now)} · {mbUtil.fmtTime(next)}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          <div className="mb-section">
            <div className="mb-section-label mono">recent</div>
            {recent.map((run) => (
              <div key={run.id} className="mb-run">
                <StatusDot status={run.status} size={6} />
                <div className="mb-run-main">
                  <span className="mb-run-name">{routineName(run.routineId)}</span>
                  <span className="mono dim mb-run-sub">{mbUtil.relTime(run.start, now)}</span>
                </div>
              </div>
            ))}
          </div>

          <div className="mb-foot">
            <button type="button" className="mb-open-btn" onClick={() => { setOpen(false); onOpenApp(); }}>
              Open Routines…
            </button>
          </div>
        </div>
      ) : null}
    </div>
  );
}

Object.assign(window, { MenuBar });
