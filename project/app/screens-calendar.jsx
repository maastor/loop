// screens-calendar.jsx — month / week calendar of runs
const calUtil = window.CCR

function dayKey(d) {
  d = new Date(d)
  return `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`
}

function CalendarScreen({ routines, runs, now, nav }) {
  const [mode, setMode] = React.useState('month')
  const [cursor, setCursor] = React.useState(
    new Date(now.getFullYear(), now.getMonth(), now.getDate())
  )
  const [selected, setSelected] = React.useState(dayKey(now))

  const runsByDay = React.useMemo(() => {
    const m = {}
    for (const r of runs) (m[dayKey(r.start)] = m[dayKey(r.start)] || []).push(r)
    for (const k of Object.keys(m)) m[k].sort((a, b) => new Date(a.start) - new Date(b.start))
    return m
  }, [runs])

  const routineName = (id) =>
    (routines.find((r) => r.id === id) || { name: 'Deleted routine' }).name

  const shift = (dir) => {
    if (mode === 'month') setCursor(new Date(cursor.getFullYear(), cursor.getMonth() + dir, 1))
    else setCursor(new Date(cursor.getFullYear(), cursor.getMonth(), cursor.getDate() + dir * 7))
  }
  const goToday = () => {
    const t = new Date(now.getFullYear(), now.getMonth(), now.getDate())
    setCursor(t)
    setSelected(dayKey(t))
  }

  // ── month grid ──
  const monthCells = React.useMemo(() => {
    if (mode !== 'month') return []
    const first = new Date(cursor.getFullYear(), cursor.getMonth(), 1)
    const startOffset = first.getDay()
    const cells = []
    for (let i = 0; i < 42; i++) {
      const d = new Date(first.getFullYear(), first.getMonth(), 1 - startOffset + i)
      cells.push(d)
    }
    return cells
  }, [cursor, mode])

  // ── week columns ──
  const weekDays = React.useMemo(() => {
    if (mode !== 'week') return []
    const start = new Date(
      cursor.getFullYear(),
      cursor.getMonth(),
      cursor.getDate() - cursor.getDay()
    )
    return Array.from(
      { length: 7 },
      (_, i) => new Date(start.getFullYear(), start.getMonth(), start.getDate() + i)
    )
  }, [cursor, mode])

  const todayKey = dayKey(now)
  const selRuns = runsByDay[selected] || []
  const selDate = (() => {
    const [y, m, d] = selected.split('-').map(Number)
    return new Date(y, m, d)
  })()

  const title =
    mode === 'month'
      ? `${calUtil.MONTHS[cursor.getMonth()]} ${cursor.getFullYear()}`
      : `Week of ${calUtil.MONTHS[weekDays[0].getMonth()].slice(0, 3)} ${weekDays[0].getDate()}`

  return (
    <div className="screen" data-screen-label="Calendar">
      <ScreenHead title="Calendar" sub="Every run, where it landed">
        <Seg
          value={mode}
          onChange={setMode}
          options={[
            { value: 'month', label: 'Month' },
            { value: 'week', label: 'Week' }
          ]}
        />
      </ScreenHead>

      <div className="cal-layout">
        <div className="panel cal-panel">
          <div className="cal-nav">
            <div className="cal-title">{title}</div>
            <div className="cal-nav-btns">
              <Btn ghost small onClick={goToday}>
                Today
              </Btn>
              <Btn ghost small icon="chevL" onClick={() => shift(-1)} title="Previous" />
              <Btn ghost small icon="chevR" onClick={() => shift(1)} title="Next" />
            </div>
          </div>

          {mode === 'month' ? (
            <div>
              <div className="cal-dow mono">
                {calUtil.DAY_NAMES.map((d) => (
                  <div key={d}>{d}</div>
                ))}
              </div>
              <div className="cal-grid">
                {monthCells.map((d, i) => {
                  const k = dayKey(d)
                  const dayRuns = runsByDay[k] || []
                  const inMonth = d.getMonth() === cursor.getMonth()
                  const failed = dayRuns.filter((r) => r.status === 'failed').length
                  const running = dayRuns.some((r) => r.status === 'running')
                  return (
                    <button
                      type="button"
                      key={i}
                      className={
                        'cal-cell' +
                        (inMonth ? '' : ' out') +
                        (k === todayKey ? ' today' : '') +
                        (k === selected ? ' sel' : '')
                      }
                      onClick={() => setSelected(k)}
                    >
                      <span className="cal-cell-n mono">{d.getDate()}</span>
                      {dayRuns.length > 0 ? (
                        <span className="cal-dots">
                          {dayRuns.slice(0, 4).map((r, j) => (
                            <StatusDot key={j} status={r.status} size={5} />
                          ))}
                          {dayRuns.length > 4 ? (
                            <span className="cal-more mono">+{dayRuns.length - 4}</span>
                          ) : null}
                        </span>
                      ) : null}
                      {failed > 0 ? (
                        <span className="cal-fail mono">{failed} failed</span>
                      ) : running ? (
                        <span className="cal-running mono">running</span>
                      ) : null}
                    </button>
                  )
                })}
              </div>
            </div>
          ) : (
            <div className="week-grid">
              {weekDays.map((d) => {
                const k = dayKey(d)
                const dayRuns = runsByDay[k] || []
                return (
                  <div
                    key={k}
                    className={
                      'week-col' + (k === todayKey ? ' today' : '') + (k === selected ? ' sel' : '')
                    }
                    onClick={() => setSelected(k)}
                  >
                    <div className="week-col-head mono">
                      <span>{calUtil.DAY_NAMES[d.getDay()]}</span>
                      <span className="week-col-n">{d.getDate()}</span>
                    </div>
                    <div className="week-col-body">
                      {dayRuns.length === 0 ? (
                        <span className="dim mono week-empty">—</span>
                      ) : (
                        dayRuns.map((r) => (
                          <button
                            type="button"
                            key={r.id}
                            className="week-chip"
                            onClick={(e) => {
                              e.stopPropagation()
                              nav({ screen: 'run', runId: r.id, from: { screen: 'calendar' } })
                            }}
                          >
                            <StatusDot status={r.status} size={5} />
                            <span className="mono week-chip-time">{calUtil.fmtTime(r.start)}</span>
                            <span className="week-chip-name">{routineName(r.routineId)}</span>
                          </button>
                        ))
                      )}
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </div>

        <div className="panel cal-side">
          <div className="panel-label mono">{calUtil.fmtDate(selDate)}</div>
          {selRuns.length === 0 ? (
            <div className="dim" style={{ fontSize: 13, padding: '10px 2px' }}>
              No runs this day.
            </div>
          ) : (
            <div className="run-list">
              {selRuns.map((run) => (
                <div
                  key={run.id}
                  className="run-row compact"
                  onClick={() =>
                    nav({ screen: 'run', runId: run.id, from: { screen: 'calendar' } })
                  }
                >
                  <StatusDot status={run.status} />
                  <div className="cal-side-main">
                    <div className="cal-side-name">{routineName(run.routineId)}</div>
                    <div className="mono dim" style={{ fontSize: 11 }}>
                      {calUtil.fmtTime(run.start)} · {calUtil.fmtDur(run.durationSec)}
                    </div>
                  </div>
                  <Icon name="chevR" size={13} style={{ color: 'var(--text-3)' }} />
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

Object.assign(window, { CalendarScreen })
