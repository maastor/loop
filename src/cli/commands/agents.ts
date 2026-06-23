import { discoverAgentModels } from '@core/agent-models'
import type { AgentId } from '@shared/types'
import { parseArgs, has, type ParsedArgs } from '../args'
import { CliError, emit } from '../output'
import { AGENT_IDS } from '../values'

const USAGE = `loop agents <command>

  models <claude|codex>   discover the models the installed agent CLI offers`

async function models(args: ParsedArgs): Promise<void> {
  const agent = args.positionals[1]
  if (!agent) {
    throw new CliError('"models" requires an agent: claude or codex')
  }
  if (!AGENT_IDS.includes(agent as AgentId)) {
    throw new CliError(`agent must be one of: ${AGENT_IDS.join(', ')}`)
  }
  const catalog = await discoverAgentModels(agent as AgentId)
  emit(catalog, () =>
    [
      `source: ${catalog.source}${catalog.error ? ` (${catalog.error})` : ''}`,
      `default: ${catalog.defaultModelId}`,
      ...catalog.models.map((m) => `  ${m.id}  ${m.label}`)
    ].join('\n')
  )
}

export async function agentsCommand(tokens: string[]): Promise<void> {
  const args = parseArgs(tokens)
  const sub = args.positionals[0]
  if (!sub || has(args, 'help')) {
    process.stdout.write(`${USAGE}\n`)
    return
  }
  switch (sub) {
    case 'models':
      return models(args)
    default:
      throw new CliError(`unknown agents command "${sub}"`)
  }
}
