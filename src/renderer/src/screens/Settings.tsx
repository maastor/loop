// renderer/src/screens/Settings.tsx — settings: background daemon + global pause.
// Functional in the foundation; worker unit 8 enhances the daemon toggle once launchd works.
import React from 'react'
import { useStore } from '../store'
import { ScreenHead, Toggle } from '../components'
import type { ScreenProps } from '../views'

export function SettingsScreen(_props: ScreenProps): React.JSX.Element {
  const settings = useStore((s) => s.settings)
  const daemon = useStore((s) => s.daemon)
  const update = useStore((s) => s.update)
  const setPausedAll = useStore((s) => s.setPausedAll)
  const setDaemonEnabled = useStore((s) => s.setDaemonEnabled)
  const checkUpdate = useStore((s) => s.checkUpdate)
  const startUpdate = useStore((s) => s.startUpdate)
  const openRelease = useStore((s) => s.openRelease)
  const [busy, setBusy] = React.useState(false)

  const toggleDaemon = async (enabled: boolean): Promise<void> => {
    setBusy(true)
    try {
      await setDaemonEnabled(enabled)
    } finally {
      setBusy(false)
    }
  }

  const checking = update.phase === 'checking'
  const downloading = update.phase === 'downloading'
  const updateMsg = ((): string => {
    switch (update.phase) {
      case 'checking':
        return 'Checking for updates…'
      case 'available':
        return `Version ${update.info?.latestVersion} is available.`
      case 'downloading':
        return `Downloading… ${update.percent ?? 0}%`
      case 'ready':
        return 'Downloaded — opening the installer. Drag Loop to Applications to finish.'
      case 'error':
        return `Couldn't check for updates — ${update.error ?? 'unknown error'}`
      default:
        return update.info?.checkedAt ? "You're up to date." : ''
    }
  })()

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

      <div className="panel settings-section">
        <div className="settings-row">
          <div>
            <div className="settings-label">Updates</div>
            <div className="settings-desc">
              Loop {update.info?.currentVersion ?? ''} — checks GitHub for new releases.
              {updateMsg ? <> {updateMsg}</> : null}
            </div>
          </div>
          <div style={{ display: 'flex', gap: 8, flexShrink: 0 }}>
            {update.phase === 'available' ? (
              <button
                type="button"
                className="btn btn-sm btn-primary"
                disabled={downloading}
                onClick={() => void startUpdate()}
              >
                {downloading ? `${update.percent ?? 0}%` : 'Download & install'}
              </button>
            ) : (
              <button
                type="button"
                className="btn btn-sm"
                disabled={checking}
                onClick={() => void checkUpdate()}
              >
                {checking ? 'Checking…' : 'Check for updates'}
              </button>
            )}
            {update.info?.releaseUrl &&
            (update.phase === 'available' || update.phase === 'ready') ? (
              <button
                type="button"
                className="btn btn-sm btn-ghost"
                onClick={() => void openRelease()}
              >
                Release notes
              </button>
            ) : null}
          </div>
        </div>
      </div>
    </div>
  )
}
