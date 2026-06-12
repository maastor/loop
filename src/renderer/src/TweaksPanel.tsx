// renderer/src/TweaksPanel.tsx — STUB (Phase A). Worker unit 6 implements the floating
// Tweaks toggle + panel: layout (rows/cards/table), density, accent color — persisted.
// Port from project/app/tweaks-panel.jsx + main.jsx (TweaksPanel + TweakRadio/TweakColor).
import React from 'react'
import { useStore } from './store'

export function TweaksPanel(): React.JSX.Element {
  const tweaks = useStore((s) => s.tweaks)
  const setTweak = useStore((s) => s.setTweak)
  const [open, setOpen] = React.useState(false)
  return (
    <div style={{ position: 'fixed', right: 16, bottom: 16, zIndex: 150 }}>
      {open ? (
        <div className="panel" style={{ width: 220, marginBottom: 8 }}>
          <div className="panel-label mono">tweaks (unit 6)</div>
          <div className="settings-row">
            <span className="settings-label">Layout</span>
            <select
              className="select"
              value={tweaks.layout}
              onChange={(e) => void setTweak('layout', e.target.value as typeof tweaks.layout)}
            >
              <option value="rows">Rows</option>
              <option value="cards">Cards</option>
              <option value="table">Table</option>
            </select>
          </div>
        </div>
      ) : null}
      <button className="btn btn-sm" onClick={() => setOpen(!open)}>
        Tweaks
      </button>
    </div>
  )
}
