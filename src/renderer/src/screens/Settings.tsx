// renderer/src/screens/Settings.tsx — settings: background daemon, global pause,
// default permission mode, missed-run grace, and per-run timeout.
import React from 'react'
import { useStore } from '../store'
import { ScreenHead, Toggle, Seg } from '../components'
import { PERMISSION_MODES } from '@shared/schedule'
import type { PermissionMode } from '@shared/types'
import type { ScreenProps } from '../views'

export function SettingsScreen(_props: ScreenProps): React.JSX.Element {
  const settings = useStore((s) => s.settings)
  const daemon = useStore((s) => s.daemon)
  const setPausedAll = useStore((s) => s.setPausedAll)
  const setDaemonEnabled = useStore((s) => s.setDaemonEnabled)
  const setSetting = useStore((s) => s.setSetting)
  const [busy, setBusy] = React.useState(false)

  const toggleDaemon = async (enabled: boolean): Promise<void> => {
    setBusy(true)
    try {
      await setDaemonEnabled(enabled)
    } finally {
      setBusy(false)
    }
  }

  const permDesc = PERMISSION_MODES.find((m) => m.id === settings.defaultPermissionMode)?.desc

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
            <div className="settings-label">Default permission mode</div>
            <div className="settings-desc">
              How routines handle tool permissions when running unattended. {permDesc} Individual
              routines can override this.
            </div>
          </div>
          <Seg
            value={settings.defaultPermissionMode}
            onChange={(v) => void setSetting('defaultPermissionMode', v as PermissionMode)}
            options={PERMISSION_MODES.map((m) => ({ value: m.id, label: m.label }))}
          />
        </div>

        <div className="settings-row">
          <div>
            <div className="settings-label">Missed-run catch-up window</div>
            <div className="settings-desc">
              If the machine was offline at a scheduled time, the missed run still fires on wake
              when it&apos;s no more than this many minutes late; otherwise it&apos;s recorded as
              skipped. Routines can override this.
            </div>
          </div>
          <label className="inline-field">
            <input
              type="number"
              min={0}
              className="input time-input mono"
              value={settings.defaultMissedRunGraceMinutes}
              onChange={(e) =>
                void setSetting('defaultMissedRunGraceMinutes', Math.max(0, +e.target.value || 0))
              }
            />
            <span className="mono dim">min</span>
          </label>
        </div>

        <div className="settings-row">
          <div>
            <div className="settings-label">Run timeout</div>
            <div className="settings-desc">
              Kill a single run that exceeds this many minutes so a hung CLI can&apos;t stall a
              routine indefinitely. Set to 0 to disable.
            </div>
          </div>
          <label className="inline-field">
            <input
              type="number"
              min={0}
              className="input time-input mono"
              value={settings.runTimeoutMinutes}
              onChange={(e) =>
                void setSetting('runTimeoutMinutes', Math.max(0, +e.target.value || 0))
              }
            />
            <span className="mono dim">min</span>
          </label>
        </div>
      </div>
    </div>
  )
}
