// screens-editor.jsx — create / edit routine sheet
const edUtil = window.CCR;

const ED_DAYS = [
  { v: 1, l: 'Mon' }, { v: 2, l: 'Tue' }, { v: 3, l: 'Wed' }, { v: 4, l: 'Thu' },
  { v: 5, l: 'Fri' }, { v: 6, l: 'Sat' }, { v: 0, l: 'Sun' },
];

function EditorSheet({ routine, onSave, onClose }) {
  const isNew = !routine;
  const [name, setName] = React.useState(routine ? routine.name : '');
  const [prompt, setPrompt] = React.useState(routine ? routine.prompt : '');
  const [dir, setDir] = React.useState(routine ? routine.dir : '~/work/');
  const [model, setModel] = React.useState(routine ? routine.model : 'sonnet');
  const [schedule, setSchedule] = React.useState(
    routine ? { ...routine.schedule } : { freq: 'daily', time: '09:00', days: [1], everyHours: 6 }
  );
  const [nl, setNl] = React.useState(routine ? edUtil.scheduleToNL(routine.schedule) : '');
  const [nlState, setNlState] = React.useState(routine ? 'ok' : 'idle'); // idle | ok | bad
  const [structured, setStructured] = React.useState(false);

  // natural language → schedule
  const onNlChange = (v) => {
    setNl(v);
    if (!v.trim()) { setNlState('idle'); return; }
    const parsed = edUtil.parseNL(v);
    if (parsed) { setSchedule((s) => ({ ...s, ...parsed })); setNlState('ok'); }
    else setNlState('bad');
  };

  // structured → schedule (+ regenerate NL)
  const patchSchedule = (patch) => {
    const next = { ...schedule, ...patch };
    setSchedule(next);
    setNl(edUtil.scheduleToNL(next));
    setNlState('ok');
  };

  const toggleDay = (d) => {
    const days = schedule.days.includes(d)
      ? schedule.days.filter((x) => x !== d)
      : [...schedule.days, d].sort();
    if (days.length === 0) return;
    patchSchedule({ days });
  };

  const valid = name.trim() && prompt.trim() && (nlState !== 'bad' || structured);
  const preview = edUtil.computeNextRun(schedule, new Date());

  const save = () => {
    if (!valid) return;
    onSave({
      id: routine ? routine.id : 'rt-' + edUtil.uid(),
      name: name.trim(), prompt: prompt.trim(), dir: dir.trim() || '~/',
      model, schedule, enabled: routine ? routine.enabled : true,
    });
  };

  React.useEffect(() => {
    const onKey = (e) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  return (
    <div className="sheet-backdrop" onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}>
      <div className="sheet" data-screen-label="Routine editor">
        <div className="sheet-head">
          <div className="sheet-title">{isNew ? 'New routine' : 'Edit routine'}</div>
          <button type="button" className="icon-btn" onClick={onClose} aria-label="Close"><Icon name="x" size={15} /></button>
        </div>

        <div className="sheet-body">
          <label className="field">
            <span className="field-label mono">name</span>
            <input className="input" value={name} placeholder="Morning issue triage"
              autoFocus={isNew} onChange={(e) => setName(e.target.value)} />
          </label>

          <label className="field">
            <span className="field-label mono">prompt</span>
            <div className="prompt-input-wrap">
              <span className="prompt-mark">❯</span>
              <textarea className="textarea mono" rows={5} value={prompt}
                placeholder="What should Claude Code do each time this runs?"
                onChange={(e) => setPrompt(e.target.value)}></textarea>
            </div>
            <span className="field-hint">Runs headless in the working directory with this prompt.</span>
          </label>

          <div className="field">
            <div className="field-label-row">
              <span className="field-label mono">schedule</span>
              <button type="button" className="link-btn mono" onClick={() => setStructured(!structured)}>
                {structured ? 'use natural language' : 'set manually'}
              </button>
            </div>

            {!structured ? (
              <div>
                <div className={'nl-wrap' + (nlState === 'bad' ? ' bad' : '')}>
                  <Icon name="clock" size={14} style={{ color: 'var(--text-3)' }} />
                  <input className="input nl-input" value={nl}
                    placeholder={'try "every weekday at 9am" or "every 6 hours"'}
                    onChange={(e) => onNlChange(e.target.value)} />
                  {nlState === 'ok' ? <Icon name="check" size={14} style={{ color: 'var(--green)' }} /> : null}
                </div>
                {nlState === 'bad' ? (
                  <span className="field-hint" style={{ color: 'var(--red)' }}>
                    Couldn't parse that — try "every day at 7pm", or set it manually.
                  </span>
                ) : (
                  <span className="field-hint">{edUtil.describeSchedule(schedule)}{preview ? ` · next: ${edUtil.fmtDateTime(preview)}` : ''}</span>
                )}
              </div>
            ) : (
              <div className="sched-structured">
                <Seg value={schedule.freq} onChange={(v) => patchSchedule({ freq: v })}
                  options={[
                    { value: 'daily', label: 'Daily' },
                    { value: 'weekdays', label: 'Weekdays' },
                    { value: 'weekly', label: 'Weekly' },
                    { value: 'hourly', label: 'Hourly' },
                  ]} />
                {schedule.freq === 'weekly' ? (
                  <div className="day-picker">
                    {ED_DAYS.map((d) => (
                      <button key={d.v} type="button"
                        className={'day-btn mono' + (schedule.days.includes(d.v) ? ' active' : '')}
                        onClick={() => toggleDay(d.v)}>{d.l}</button>
                    ))}
                  </div>
                ) : null}
                {schedule.freq === 'hourly' ? (
                  <label className="inline-field">
                    <span className="mono dim">every</span>
                    <select className="select mono" value={schedule.everyHours}
                      onChange={(e) => patchSchedule({ everyHours: +e.target.value })}>
                      {[1, 2, 3, 4, 6, 8, 12].map((n) => <option key={n} value={n}>{n}</option>)}
                    </select>
                    <span className="mono dim">hours</span>
                  </label>
                ) : (
                  <label className="inline-field">
                    <span className="mono dim">at</span>
                    <input type="time" className="input time-input mono" value={schedule.time}
                      onChange={(e) => patchSchedule({ time: e.target.value || '09:00' })} />
                  </label>
                )}
                <span className="field-hint">{edUtil.describeSchedule(schedule)}{preview ? ` · next: ${edUtil.fmtDateTime(preview)}` : ''}</span>
              </div>
            )}
          </div>

          <div className="field-row">
            <label className="field" style={{ flex: 1.6 }}>
              <span className="field-label mono">working directory</span>
              <div className="dir-wrap">
                <Icon name="folder" size={14} style={{ color: 'var(--text-3)' }} />
                <input className="input mono dir-input" value={dir} onChange={(e) => setDir(e.target.value)} />
              </div>
            </label>
            <div className="field" style={{ flex: 1 }}>
              <span className="field-label mono">model</span>
              <Seg value={model} onChange={setModel}
                options={edUtil.MODELS.map((m) => ({ value: m.id, label: m.label }))} />
              <span className="field-hint">{(edUtil.MODELS.find((m) => m.id === model) || {}).desc}</span>
            </div>
          </div>
        </div>

        <div className="sheet-foot">
          <Btn ghost onClick={onClose}>Cancel</Btn>
          <Btn primary disabled={!valid} onClick={save}>{isNew ? 'Create routine' : 'Save changes'}</Btn>
        </div>
      </div>
    </div>
  );
}

Object.assign(window, { EditorSheet });
