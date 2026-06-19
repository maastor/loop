import type { Routine, Schedule } from '@shared/types'
import { uid, parseNL, describeSchedule } from '@shared/schedule'
import { Store } from '@core/persistence'
import { startRoutineExecution } from '@core/routine-execution'
import {
  parseArgs,
  has,
  flagStr,
  requireStr,
  flagBool,
  flagNum,
  flagEnum,
  resolvePrompt,
  type ParsedArgs
} from '../args'
import { CliError, emit } from '../output'
import { AGENT_IDS, PERMISSION_MODE_IDS } from '../values'

const USAGE = `loop routines <command>

  list [--enabled|--disabled] [--agent claude|codex]
  get <id>
  create --name <s> --dir <path> --agent claude|codex --model <s> --schedule <"nl">
         (--prompt <s> | --prompt-file <path> | --prompt -)  [--enabled true|false]
         [--permission-mode bypass|acceptEdits|default] [--grace <minutes>]
  update <id> [--name] [--prompt|--prompt-file] [--dir] [--agent] [--model]
         [--schedule] [--enabled true|false] [--permission-mode] [--grace]
  delete <id>
  toggle <id>
  enable <id>
  disable <id>
  run <id> [--no-wait]`

function parseSchedule(nl: string): Schedule {
  const s = parseNL(nl)
  if (!s) {
    throw new CliError(`could not parse schedule from "${nl}"`)
  }
  return s
}

function routineLine(r: Routine): string {
  return `${r.id}  ${r.enabled ? 'on ' : 'off'}  ${r.agent}/${r.model}  ${describeSchedule(
    r.schedule
  )}  —  ${r.name}`
}

function requireRoutine(store: Store, id: string): Routine {
  const r = store.getRoutine(id)
  if (!r) {
    throw new CliError(`no routine with id "${id}"`, 2)
  }
  return structuredClone(r)
}

function list(store: Store, args: ParsedArgs): void {
  let routines = store.listRoutines()
  if (has(args, 'enabled')) {
    routines = routines.filter((r) => r.enabled)
  }
  if (has(args, 'disabled')) {
    routines = routines.filter((r) => !r.enabled)
  }
  const agent = flagEnum(args, 'agent', AGENT_IDS)
  if (agent) {
    routines = routines.filter((r) => r.agent === agent)
  }
  emit(routines, () => routines.map(routineLine).join('\n') || '(no routines)')
}

function create(store: Store, args: ParsedArgs): void {
  const prompt = resolvePrompt(args)
  if (prompt === undefined) {
    throw new CliError('a prompt is required (--prompt, --prompt-file, or --prompt -)')
  }
  const routine: Routine = {
    id: `rt-${uid()}`,
    name: requireStr(args, 'name'),
    prompt,
    dir: requireStr(args, 'dir'),
    agent: flagEnum(args, 'agent', AGENT_IDS) ?? throwMissing('agent'),
    model: requireStr(args, 'model'),
    enabled: flagBool(args, 'enabled') ?? true,
    schedule: parseSchedule(requireStr(args, 'schedule')),
    permissionMode: flagEnum(args, 'permission-mode', PERMISSION_MODE_IDS),
    missedRunGraceMinutes: flagNum(args, 'grace')
  }
  const saved = store.upsertRoutine(routine)
  emit(saved, () => `created ${saved.id}\n${routineLine(saved)}`)
}

function throwMissing(key: string): never {
  throw new CliError(`--${key} is required`)
}

function update(store: Store, args: ParsedArgs, id: string): void {
  const routine = requireRoutine(store, id)
  const name = flagStr(args, 'name')
  if (name !== undefined) {
    routine.name = name
  }
  const prompt = resolvePrompt(args)
  if (prompt !== undefined) {
    routine.prompt = prompt
  }
  const dir = flagStr(args, 'dir')
  if (dir !== undefined) {
    routine.dir = dir
  }
  const agent = flagEnum(args, 'agent', AGENT_IDS)
  if (agent) {
    routine.agent = agent
  }
  const model = flagStr(args, 'model')
  if (model !== undefined) {
    routine.model = model
  }
  const enabled = flagBool(args, 'enabled')
  if (enabled !== undefined) {
    routine.enabled = enabled
  }
  const schedule = flagStr(args, 'schedule')
  if (schedule !== undefined) {
    routine.schedule = parseSchedule(schedule)
  }
  const permissionMode = flagEnum(args, 'permission-mode', PERMISSION_MODE_IDS)
  if (permissionMode) {
    routine.permissionMode = permissionMode
  }
  const grace = flagNum(args, 'grace')
  if (grace !== undefined) {
    routine.missedRunGraceMinutes = grace
  }
  const saved = store.upsertRoutine(routine)
  emit(saved, () => routineLine(saved))
}

function setEnabled(store: Store, id: string, enabled: boolean): void {
  const routine = requireRoutine(store, id)
  routine.enabled = enabled
  const saved = store.upsertRoutine(routine)
  emit(saved, () => routineLine(saved))
}

async function run(store: Store, args: ParsedArgs, id: string): Promise<void> {
  const routine = store.getRoutine(id)
  if (!routine) {
    throw new CliError(`no routine with id "${id}"`, 2)
  }
  const wait = flagBool(args, 'wait') ?? true
  // Unlike the app's fire-and-forget IPC handler, the CLI must await completion or the
  // process exits before the agent finishes. --no-wait restores fire-and-forget.
  const started = startRoutineExecution(store, routine, { trigger: 'manual' })
  if (!wait) {
    emit(started.run, () => `started ${started.run.id} (not waiting)`)
    return
  }
  await started.completion
  const final = store.getRun(started.run.id) ?? started.run
  emit(final, () => `${final.status}  ${final.summary}`)
}

export async function routinesCommand(tokens: string[]): Promise<void> {
  const args = parseArgs(tokens)
  const sub = args.positionals[0]
  if (!sub || has(args, 'help')) {
    process.stdout.write(`${USAGE}\n`)
    return
  }
  const store = new Store()
  const id = (): string => {
    const value = args.positionals[1]
    if (!value) {
      throw new CliError(`"${sub}" requires a routine id`)
    }
    return value
  }
  switch (sub) {
    case 'list':
      return list(store, args)
    case 'get':
      return emit(requireRoutine(store, id()))
    case 'create':
      return create(store, args)
    case 'update':
      return update(store, args, id())
    case 'delete': {
      const target = id()
      requireRoutine(store, target)
      store.deleteRoutine(target)
      return emit({ deleted: target }, () => `deleted ${target}`)
    }
    case 'toggle': {
      const toggled = store.toggleRoutine(id())
      if (!toggled) {
        throw new CliError(`no routine with id "${id()}"`, 2)
      }
      return emit(toggled, () => routineLine(toggled))
    }
    case 'enable':
      return setEnabled(store, id(), true)
    case 'disable':
      return setEnabled(store, id(), false)
    case 'run':
      return run(store, args, id())
    default:
      throw new CliError(`unknown routines command "${sub}"`)
  }
}
