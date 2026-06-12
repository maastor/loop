// renderer/src/screens/Settings.tsx — settings: background daemon + global pause.
// Functional in the foundation; worker unit 8 enhances the daemon toggle once launchd works.
import React from 'react'
import { useStore } from '../store'
import { ScreenHead, Toggle } from '../components'
import type { ScreenProps } from '../views'

export function SettingsScreen(_props: ScreenProps): React.JSX.Element {
  const settings = useStore((s) => s.settings)
  const daemon = useStore((s) => s.daemon)
  const setPausedAll = useStore((s) => s.setPausedAll)
  const setDaemonEnabled = useStore((s) => s.setDaemonEnabled)
  const [busy, setBusy] = React.useState(false)

  const toggleDaemon = async (enabled: boolean): Promise<void> => {
    setBusy(true)
    try {
      await setDaemonEnabled(enabled)
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="screen" data-screen-label="Settings">
      <ScreenHead title="Settings" sub="Scheduling and background behavior" />

      <div className="panel settings-section">
        <div className="settings-row">
          <div>
            <div className="settings-label">Run routines in the background</div>
            <div className="settings-desc">
              Installs a macOS background agent so scheduled routines fire even when Loop is fully
              quit. When off, routines only run while Loop is open.
              {daemon.installed ? ' Background agent is installed.' : ''}
            </div>
          </div>
          <Toggle value={settings.daemonEnabled} onChange={(v) => !busy && void toggleDaemon(v)} />
        </div>

        <div className="settings-row">
          <div>
            <div className="settings-label">Pause all routines</div>
            <div className="settings-desc">
              Temporarily stops all scheduled runs without changing each routine&apos;s enabled
              state.
            </div>
          </div>
          <Toggle value={settings.pausedAll} onChange={(v) => void setPausedAll(v)} />
        </div>
      </div>
    </div>
  )
}
