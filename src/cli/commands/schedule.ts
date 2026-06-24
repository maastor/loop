import { parseNL, describeSchedule, computeNextRun } from '@shared/schedule'
import { parseArgs, has, type ParsedArgs } from '../args'
import { CliError, emit } from '../output'

const USAGE = `loop schedule <command>

  parse "<natural language>"   e.g. "every weekday at 9am", "every 3 hours"

Outputs the parsed Schedule object plus a description and the next occurrence.`

function parse(args: ParsedArgs): void {
  const input = args.positionals.slice(1).join(' ').trim()
  if (!input) {
    throw new CliError('"parse" requires a natural-language schedule (quote it)')
  }
  const schedule = parseNL(input)
  if (!schedule) {
    throw new CliError(`could not parse schedule from "${input}"`)
  }
  const next = computeNextRun(schedule)
  const result = {
    input,
    schedule,
    description: describeSchedule(schedule),
    nextRun: next ? next.toISOString() : null
  }
  emit(result, () => `${result.description}\nnext: ${result.nextRun ?? '(none in 14 days)'}`)
}

export async function scheduleCommand(tokens: string[]): Promise<void> {
  const args = parseArgs(tokens)
  const sub = args.positionals[0]
  if (!sub || has(args, 'help')) {
    process.stdout.write(`${USAGE}\n`)
    return
  }
  switch (sub) {
    case 'parse':
      return parse(args)
    default:
      throw new CliError(`unknown schedule command "${sub}"`)
  }
}
