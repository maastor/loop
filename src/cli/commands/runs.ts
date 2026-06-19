import type { Run, RunStatus } from '@shared/types'
import { Store } from '@core/persistence'
import { parseArgs, has, flagStr, flagNum, flagEnum, type ParsedArgs } from '../args'
import { CliError, emit } from '../output'

const RUN_STATUSES: readonly RunStatus[] = ['running', 'success', 'failed', 'skipped']

const USAGE = `loop runs <command>

  list [--routine <id>] [--status running|success|failed|skipped] [--limit <n>]
  get <id> [--transcript]`

// Transcripts can be large; list/get omit them unless explicitly requested.
function slim(run: Run): Omit<Run, 'transcript'> {
  const { transcript: _transcript, ...rest } = run
  return rest
}

function runLine(run: Run): string {
  const dur = run.durationSec === null ? '—' : `${run.durationSec}s`
  return `${run.id}  ${run.status}  ${run.start}  ${dur}  —  ${run.summary}`
}

function list(store: Store, args: ParsedArgs): void {
  let runs = store.listRuns(flagStr(args, 'routine'))
  const status = flagEnum(args, 'status', RUN_STATUSES)
  if (status) {
    runs = runs.filter((r) => r.status === status)
  }
  const limit = flagNum(args, 'limit')
  if (limit !== undefined) {
    runs = runs.slice(0, Math.max(0, limit))
  }
  const slimmed = runs.map(slim)
  emit(slimmed, () => runs.map(runLine).join('\n') || '(no runs)')
}

function get(store: Store, args: ParsedArgs, id: string): void {
  const run = store.getRun(id)
  if (!run) {
    throw new CliError(`no run with id "${id}"`, 2)
  }
  const payload = has(args, 'transcript') ? run : slim(run)
  emit(payload, () => runLine(run))
}

export async function runsCommand(tokens: string[]): Promise<void> {
  const args = parseArgs(tokens)
  const sub = args.positionals[0]
  if (!sub || has(args, 'help')) {
    process.stdout.write(`${USAGE}\n`)
    return
  }
  const store = new Store()
  switch (sub) {
    case 'list':
      return list(store, args)
    case 'get': {
      const id = args.positionals[1]
      if (!id) {
        throw new CliError('"get" requires a run id')
      }
      return get(store, args, id)
    }
    default:
      throw new CliError(`unknown runs command "${sub}"`)
  }
}
