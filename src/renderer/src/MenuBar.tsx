// renderer/src/MenuBar.tsx — STUB (Phase A). Worker unit 6 implements the in-titlebar
// quick-status pill + dropdown (running now / next up / recent / pause all / open).
// Port the dropdown content from project/app/screens-menubar.jsx; render it as a pill
// docked at the right of the draggable titlebar (the OS menu bar + tray are separate).
import React from 'react'
import { useStore } from './store'
import { StatusDot } from './components'
import type { Nav } from './views'

export function MenuBar({ nav: _nav, now: _now }: { nav: Nav; now: Date }): React.JSX.Element {
  const runs = useStore((s) => s.runs)
  const running = runs.filter((r) => r.status === 'running').length
  return (
    <div
      style={{
        position: 'absolute',
        right: 14,
        top: 5,
        display: 'flex',
        alignItems: 'center',
        gap: 6,
        fontSize: 11.5,
        color: 'var(--text-2)'
      }}
    >
      <StatusDot status={running > 0 ? 'running' : 'success'} size={6} />
      <span className="mono">{running > 0 ? `${running} running` : 'idle'}</span>
    </div>
  )
}
