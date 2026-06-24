import pkg from '../../package.json'
import { CliError, fail, setPretty } from './output'
import { routinesCommand } from './commands/routines'
import { runsCommand } from './commands/runs'
import { settingsCommand, tweaksCommand } from './commands/config'
import { scheduleCommand } from './commands/schedule'
import { agentsCommand } from './commands/agents'
import { daemonCommand } from './commands/daemon'

type GroupHandler = (tokens: string[]) => Promise<void>

const GROUPS: Record<string, GroupHandler> = {
  routines: routinesCommand,
  runs: runsCommand,
  settings: settingsCommand,
  tweaks: tweaksCommand,
  schedule: scheduleCommand,
  agents: agentsCommand,
  daemon: daemonCommand
}

const HELP = `loop — manage Loop routines from the command line

Usage: loop <group> <command> [options]

Groups:
  routines   list | get | create | update | delete | toggle | enable | disable | run
  runs       list | get
  settings   get | set
  tweaks     get | set
  schedule   parse <"natural language">
  agents     models <claude|codex>
  daemon     status | install | uninstall

Global options:
  --pretty       human-readable output (default is JSON)
  --version,-v   print version
  --help,-h      show this help

Run "loop <group> --help" for group-specific commands.
Output is JSON by default; commands exit non-zero on error with { "error": ... } on stderr.`

async function main(): Promise<void> {
  const argv = process.argv.slice(2)

  // --pretty may appear anywhere; strip it before group dispatch.
  const prettyIndex = argv.indexOf('--pretty')
  if (prettyIndex !== -1) {
    setPretty(true)
    argv.splice(prettyIndex, 1)
  }

  if (argv.length === 0 || argv[0] === '--help' || argv[0] === '-h' || argv[0] === 'help') {
    process.stdout.write(`${HELP}\n`)
    return
  }
  if (argv[0] === '--version' || argv[0] === '-v') {
    process.stdout.write(`${pkg.version}\n`)
    return
  }

  const group = argv[0]
  const handler = GROUPS[group]
  if (!handler) {
    throw new CliError(`unknown command "${group}". Run "loop --help".`)
  }
  await handler(argv.slice(1))
}

main().catch((error: unknown) => {
  if (error instanceof CliError) {
    fail(error.message, error.code)
  }
  fail(error instanceof Error ? error.message : String(error))
})
