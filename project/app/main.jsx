// main.jsx — app shell: state, routing, persistence, tweaks
const U = window.CCR;
const STORE_KEY = 'claude-routines-proto-v1';

const TWEAK_DEFAULTS = /*EDITMODE-BEGIN*/{
  "accent": "#E8703F",
  "layout": "rows",
  "density": "comfortable"
}/*EDITMODE-END*/;

function loadStore() {
  try {
    const raw = localStorage.getItem(STORE_KEY);
    if (raw) return JSON.parse(raw);
  } catch (e) { /* ignore */ }
  return null;
}

function App() {
  const [t, setTweak] = useTweaks(TWEAK_DEFAULTS);
  const [now, setNow] = React.useState(() => new Date());
  React.useEffect(() => {
    const id = setInterval(() => setNow(new Date()), 30000);
    return () => clearInterval(id);
  }, []);

  // ── state: routines persisted, seed runs regenerated, user runs persisted
  const stored = React.useMemo(loadStore, []);
  const [routines, setRoutines] = React.useState(() => (stored && stored.routines) || U.seedRoutines);
  const [userRuns, setUserRuns] = React.useState(() => (stored && stored.userRuns) || []);
  const [pausedAll, setPausedAll] = React.useState(() => (stored && stored.pausedAll) || false);
  const seedRuns = React.useMemo(() => U.genSeedRuns(U.seedRoutines, new Date()), []);
  const runs = React.useMemo(() => {
    const all = [...userRuns, ...seedRuns];
    all.sort((a, b) => new Date(b.start) - new Date(a.start));
    return all;
  }, [userRuns, seedRuns]);

  React.useEffect(() => {
    try { localStorage.setItem(STORE_KEY, JSON.stringify({ routines, userRuns, pausedAll })); } catch (e) { /* ignore */ }
  }, [routines, userRuns, pausedAll]);

  // ── navigation
  const [view, setView] = React.useState({ screen: 'routines' });
  const [editor, setEditor] = React.useState(null); // null | {routineId?} 
  const [mbOpen, setMbOpen] = React.useState(false);
  const nav = (v) => setView(v);

  // ── actions
  const toggleRoutine = (id) =>
    setRoutines((rs) => rs.map((r) => (r.id === id ? { ...r, enabled: !r.enabled } : r)));

  const saveRoutine = (data) => {
    setRoutines((rs) => {
      const i = rs.findIndex((r) => r.id === data.id);
      if (i === -1) return [data, ...rs];
      const copy = rs.slice(); copy[i] = data; return copy;
    });
    setEditor(null);
    setView({ screen: 'routine', routineId: data.id });
  };

  const deleteRoutine = (id) => {
    setRoutines((rs) => rs.filter((r) => r.id !== id));
    setView({ screen: 'routines' });
  };

  const runNow = (id) => {
    const routine = routines.find((r) => r.id === id);
    if (!routine) return;
    const runId = 'run-manual-' + U.uid();
    const start = new Date();
    setUserRuns((prev) => [{
      id: runId, routineId: id, start: start.toISOString(),
      durationSec: null, status: 'running', costUsd: null, tokens: null,
      summary: 'Run started manually…', changes: [],
      transcript: [
        { role: 'user', text: routine.prompt },
        { role: 'result', text: 'Session started in ' + routine.dir },
      ],
    }, ...prev]);
    // simulate completion
    setTimeout(() => {
      const tpl = U.RUN_TEMPLATES[id];
      const dur = 45 + Math.floor(Math.random() * 90);
      const tokens = (14 + Math.floor(Math.random() * 40)) * 1000;
      setUserRuns((prev) => prev.map((r) => r.id === runId ? {
        ...r,
        status: 'success',
        durationSec: dur,
        tokens,
        costUsd: +(tokens / 1000 * 0.012).toFixed(2),
        summary: tpl ? tpl.summaries[0] : 'Completed — see transcript for details.',
        changes: tpl ? tpl.changes[0] : [],
        transcript: tpl ? tpl.transcript(routine.prompt) : [
          { role: 'user', text: routine.prompt },
          { role: 'assistant', text: 'Done — task completed without issues.' },
        ],
      } : r));
      setNow(new Date());
    }, 6000);
  };

  // ── tweak-driven CSS vars
  const density = t.density === 'compact' ? { '--pad-y': '7px', '--pad-card': '12px' } : { '--pad-y': '11px', '--pad-card': '16px' };
  const appVars = { '--accent': t.accent, ...density };

  // ── current screen
  let screen = null;
  if (view.screen === 'routine') {
    const routine = routines.find((r) => r.id === view.routineId);
    screen = routine
      ? <RoutineDetailScreen routine={routine} runs={runs} now={now} nav={nav}
          onToggle={toggleRoutine} onRunNow={runNow}
          onEdit={(id) => setEditor({ routineId: id })} onDelete={deleteRoutine} />
      : <RoutinesScreen routines={routines} runs={runs} now={now} layout={t.layout} nav={nav}
          onToggle={toggleRoutine} onRunNow={runNow} onNew={() => setEditor({})} />;
  } else if (view.screen === 'run') {
    const run = runs.find((r) => r.id === view.runId);
    screen = run
      ? <RunDetailScreen routines={routines} run={run} now={now} nav={nav} from={view.from} />
      : <HistoryScreen routines={routines} runs={runs} now={now} nav={nav} />;
  } else if (view.screen === 'calendar') {
    screen = <CalendarScreen routines={routines} runs={runs} now={now} nav={nav} />;
  } else if (view.screen === 'history') {
    screen = <HistoryScreen routines={routines} runs={runs} now={now} nav={nav} />;
  } else {
    screen = <RoutinesScreen routines={routines} runs={runs} now={now} layout={t.layout} nav={nav}
      onToggle={toggleRoutine} onRunNow={runNow} onNew={() => setEditor({})} />;
  }

  const navItems = [
    { id: 'routines', label: 'Routines', icon: 'routines', match: ['routines', 'routine'] },
    { id: 'calendar', label: 'Calendar', icon: 'calendar', match: ['calendar'] },
    { id: 'history', label: 'History', icon: 'history', match: ['history', 'run'] },
  ];

  const running = runs.filter((r) => r.status === 'running').length;
  const nextAll = routines
    .filter((r) => r.enabled && !pausedAll)
    .map((r) => U.computeNextRun(r.schedule, now))
    .filter(Boolean)
    .sort((a, b) => a - b)[0];

  return (
    <div className="desktop" style={appVars} onClick={() => { if (mbOpen) setMbOpen(false); }}>
      <div style={{ width: '100%' }} onClick={(e) => e.stopPropagation()}>
        <MenuBar routines={routines} runs={runs} now={now} open={mbOpen} setOpen={setMbOpen}
          pausedAll={pausedAll} setPausedAll={setPausedAll}
          onOpenApp={() => setView({ screen: 'routines' })}
          clock={`${U.fmtDate(now).split(', ')[0]} ${U.fmtDate(now).split(', ')[1]}  ${U.fmtTime(now)}`} />
      </div>

      <div className="window" data-screen-label="Main window">
        <div className="sidebar">
          <div className="sidebar-top">
            <MacTrafficLights style={{ transform: 'scale(0.86)', transformOrigin: 'left center' }} />
          </div>
          <div className="sidebar-brand">
            <span className="sidebar-brand-mark"><Icon name="spark" size={15} /></span>
            <div>
              <div className="sidebar-brand-name">Routines</div>
              <div className="sidebar-brand-sub mono">for Claude Code</div>
            </div>
          </div>
          <nav className="sidebar-nav">
            {navItems.map((n) => (
              <button key={n.id} type="button"
                className={'nav-item' + (n.match.includes(view.screen) ? ' active' : '')}
                onClick={() => setView({ screen: n.id })}>
                <Icon name={n.icon} size={15} />
                {n.label}
                {n.id === 'history' && running > 0 ? <span className="nav-badge mono">{running}</span> : null}
              </button>
            ))}
          </nav>
          <div className="sidebar-spacer"></div>
          <div className="sidebar-foot mono">
            {pausedAll ? (
              <span className="sf-line"><StatusDot status="paused" /> all paused</span>
            ) : (
              <span className="sf-line">
                {running > 0
                  ? <span style={{ color: 'var(--accent)' }}><StatusDot status="running" /> {running} running</span>
                  : <span><StatusDot status="success" /> idle</span>}
              </span>
            )}
            {nextAll && !pausedAll ? <span className="sf-line dim">next {U.relUntil(nextAll, now)}</span> : null}
          </div>
        </div>
        <div className="content">{screen}</div>
      </div>

      {editor ? (
        <EditorSheet
          routine={editor.routineId ? routines.find((r) => r.id === editor.routineId) : null}
          onSave={saveRoutine}
          onClose={() => setEditor(null)} />
      ) : null}

      <TweaksPanel>
        <TweakSection label="Routines list" />
        <TweakRadio label="Layout" value={t.layout}
          options={[
            { value: 'rows', label: 'Rows' },
            { value: 'cards', label: 'Cards' },
            { value: 'table', label: 'Table' },
          ]}
          onChange={(v) => setTweak('layout', v)} />
        <TweakRadio label="Density" value={t.density}
          options={['compact', 'comfortable']}
          onChange={(v) => setTweak('density', v)} />
        <TweakSection label="Theme" />
        <TweakColor label="Accent" value={t.accent}
          options={['#E8703F', '#FF5300', '#D4A0FF', '#8FBE5F']}
          onChange={(v) => setTweak('accent', v)} />
      </TweaksPanel>
    </div>
  );
}

ReactDOM.createRoot(document.getElementById('root')).render(<App />);
