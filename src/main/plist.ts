// main/plist.ts — pure LaunchAgent plist XML builder.
//
// Factored out of launchd.ts so it can be unit-tested without importing Electron.
export type PlistOptions = {
  label: string
  electronPath: string
  daemonScript: string
  logPath: string
}

function xmlEscape(s: string): string {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
}

/**
 * Returns the LaunchAgent plist XML. Side-effect-free. The daemon is launched as Node
 * via the Electron binary (ELECTRON_RUN_AS_NODE=1) so it shares the app's runtime.
 */
export function buildPlistXml({
  label,
  electronPath,
  daemonScript,
  logPath
}: PlistOptions): string {
  // PATH must include common locations for the `claude` CLI; launchd gives a minimal PATH.
  const path = '/usr/bin:/bin:/usr/sbin:/sbin:/usr/local/bin:/opt/homebrew/bin:~/.local/bin'
  return `<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
  <key>Label</key>
  <string>${xmlEscape(label)}</string>
  <key>ProgramArguments</key>
  <array>
    <string>${xmlEscape(electronPath)}</string>
    <string>${xmlEscape(daemonScript)}</string>
  </array>
  <key>EnvironmentVariables</key>
  <dict>
    <key>ELECTRON_RUN_AS_NODE</key>
    <string>1</string>
    <key>PATH</key>
    <string>${xmlEscape(path)}</string>
  </dict>
  <key>RunAtLoad</key>
  <true/>
  <key>KeepAlive</key>
  <true/>
  <key>StandardOutPath</key>
  <string>${xmlEscape(logPath)}</string>
  <key>StandardErrorPath</key>
  <string>${xmlEscape(logPath)}</string>
</dict>
</plist>
`
}
