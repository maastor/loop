import type {
  Settings,
  Tweaks,
  LayoutVariant,
  Density,
  RoutineGroupBy,
  RoutineSortBy
} from '@shared/types'
import { Store } from '@core/persistence'
import { parseArgs, has, flagStr, flagBool, flagNum, flagEnum, type ParsedArgs } from '../args'
import { CliError, emit } from '../output'
import { AGENT_IDS, PERMISSION_MODE_IDS } from '../values'

const LAYOUTS: readonly LayoutVariant[] = ['rows', 'cards', 'table']
const DENSITIES: readonly Density[] = ['compact', 'comfortable']
const GROUP_BYS: readonly RoutineGroupBy[] = ['project', 'status', 'schedule', 'none']
const SORT_BYS: readonly RoutineSortBy[] = ['name', 'nextRun', 'lastRun']

const SETTINGS_USAGE = `loop settings <command>

  get
  set [--default-agent claude|codex] [--daemon-enabled true|false]
      [--paused-all true|false] [--default-permission-mode bypass|acceptEdits|default]
      [--default-missed-run-grace-minutes <n>] [--run-timeout-minutes <n>]
      [--notify-on-complete true|false]`

const TWEAKS_USAGE = `loop tweaks <command>

  get
  set [--accent <#hex>] [--layout rows|cards|table] [--density compact|comfortable]
      [--group-by project|status|schedule|none] [--sort-by name|nextRun|lastRun]`

function prettyRecord(obj: Record<string, unknown>): string {
  return Object.entries(obj)
    .map(([k, v]) => `${k}: ${String(v)}`)
    .join('\n')
}

function settingsPatch(args: ParsedArgs): Partial<Settings> {
  const patch: Partial<Settings> = {}
  const agent = flagEnum(args, 'default-agent', AGENT_IDS)
  if (agent) {
    patch.defaultAgent = agent
  }
  const daemonEnabled = flagBool(args, 'daemon-enabled')
  if (daemonEnabled !== undefined) {
    patch.daemonEnabled = daemonEnabled
  }
  const pausedAll = flagBool(args, 'paused-all')
  if (pausedAll !== undefined) {
    patch.pausedAll = pausedAll
  }
  const permissionMode = flagEnum(args, 'default-permission-mode', PERMISSION_MODE_IDS)
  if (permissionMode) {
    patch.defaultPermissionMode = permissionMode
  }
  const grace = flagNum(args, 'default-missed-run-grace-minutes')
  if (grace !== undefined) {
    patch.defaultMissedRunGraceMinutes = grace
  }
  const timeout = flagNum(args, 'run-timeout-minutes')
  if (timeout !== undefined) {
    patch.runTimeoutMinutes = timeout
  }
  const notify = flagBool(args, 'notify-on-complete')
  if (notify !== undefined) {
    patch.notifyOnComplete = notify
  }
  return patch
}

function tweaksPatch(args: ParsedArgs): Partial<Tweaks> {
  const patch: Partial<Tweaks> = {}
  const accent = flagStr(args, 'accent')
  if (accent !== undefined) {
    patch.accent = accent
  }
  const layout = flagEnum(args, 'layout', LAYOUTS)
  if (layout) {
    patch.layout = layout
  }
  const density = flagEnum(args, 'density', DENSITIES)
  if (density) {
    patch.density = density
  }
  const groupBy = flagEnum(args, 'group-by', GROUP_BYS)
  if (groupBy) {
    patch.routineGroupBy = groupBy
  }
  const sortBy = flagEnum(args, 'sort-by', SORT_BYS)
  if (sortBy) {
    patch.routineSortBy = sortBy
  }
  return patch
}

export async function settingsCommand(tokens: string[]): Promise<void> {
  const args = parseArgs(tokens)
  const sub = args.positionals[0]
  if (!sub || has(args, 'help')) {
    process.stdout.write(`${SETTINGS_USAGE}\n`)
    return
  }
  const store = new Store()
  switch (sub) {
    case 'get':
      return emit(store.getSettings(), () => prettyRecord(store.getSettings()))
    case 'set': {
      const patch = settingsPatch(args)
      if (Object.keys(patch).length === 0) {
        throw new CliError('no settings provided to set')
      }
      const updated = store.setSettings(patch)
      return emit(updated, () => prettyRecord(updated))
    }
    default:
      throw new CliError(`unknown settings command "${sub}"`)
  }
}

export async function tweaksCommand(tokens: string[]): Promise<void> {
  const args = parseArgs(tokens)
  const sub = args.positionals[0]
  if (!sub || has(args, 'help')) {
    process.stdout.write(`${TWEAKS_USAGE}\n`)
    return
  }
  const store = new Store()
  switch (sub) {
    case 'get':
      return emit(store.getTweaks(), () => prettyRecord(store.getTweaks()))
    case 'set': {
      const patch = tweaksPatch(args)
      if (Object.keys(patch).length === 0) {
        throw new CliError('no tweaks provided to set')
      }
      const updated = store.setTweaks(patch)
      return emit(updated, () => prettyRecord(updated))
    }
    default:
      throw new CliError(`unknown tweaks command "${sub}"`)
  }
}
