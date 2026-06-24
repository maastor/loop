import { dirname, join, resolve } from 'path'
import { daemonStatus, installDaemon, uninstallDaemon } from '@core/daemon-control'
import type { DaemonStatus } from '@shared/ipc'
import { parseArgs, has, flagStr, type ParsedArgs } from '../args'
import { CliError, emit } from '../output'

const USAGE = `loop daemon <command>

  status                              report whether the launchd agent is installed/loaded
  install [--electron-path <p>] [--daemon-script <p>]
                                      install + load the background daemon (launchd)
  uninstall                           unload + remove the launchd agent

The daemon fires scheduled routines while the Loop app is quit. By default the daemon
script is resolved next to this CLI (out/main/daemon.js) and the runner is this process's
own binary; override with --daemon-script / --electron-path when running outside the app.`

// The bundled daemon.js sits beside this CLI in out/main/. process.argv[1] is the invoked
// script path, so its directory yields the daemon entry point.
function defaultDaemonScript(): string {
  const self = process.argv[1]
  if (!self) {
    throw new CliError('cannot resolve daemon script path; pass --daemon-script')
  }
  return join(dirname(self), 'daemon.js')
}

function install(args: ParsedArgs): DaemonStatus {
  const electronPath = flagStr(args, 'electron-path') ?? process.execPath
  const daemonScript = resolve(flagStr(args, 'daemon-script') ?? defaultDaemonScript())
  return installDaemon({ electronPath, daemonScript })
}

function emitStatus(status: DaemonStatus): void {
  emit(status, () => `installed: ${status.installed}\nloaded: ${status.loaded}`)
}

export async function daemonCommand(tokens: string[]): Promise<void> {
  const args = parseArgs(tokens)
  const sub = args.positionals[0]
  if (!sub || has(args, 'help')) {
    process.stdout.write(`${USAGE}\n`)
    return
  }
  switch (sub) {
    case 'status':
      return emitStatus(daemonStatus())
    case 'install':
      return emitStatus(install(args))
    case 'uninstall':
      return emitStatus(uninstallDaemon())
    default:
      throw new CliError(`unknown daemon command "${sub}"`)
  }
}
