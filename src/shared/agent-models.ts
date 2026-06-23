import type { AgentId, AgentModel, AgentModelCatalog } from './types'

export const BUNDLED_AGENT_MODELS: Record<AgentId, AgentModel[]> = {
  // Claude Code has no non-interactive catalog; stable aliases follow the active provider.
  claude: [
    { id: 'sonnet', label: 'Sonnet', description: 'Fast, balanced — good default' },
    { id: 'opus', label: 'Opus', description: 'Most capable, slower' },
    { id: 'haiku', label: 'Haiku', description: 'Cheapest, light tasks' }
  ],
  codex: [
    { id: 'gpt-5.5', label: 'GPT-5.5' },
    { id: 'gpt-5.4', label: 'GPT-5.4' },
    { id: 'gpt-5.4-mini', label: 'GPT-5.4 Mini' },
    { id: 'gpt-5.3-codex', label: 'GPT-5.3 Codex' },
    { id: 'gpt-5.3-codex-spark', label: 'GPT-5.3 Codex Spark' },
    { id: 'gpt-5.2', label: 'GPT-5.2' }
  ]
}

export const DEFAULT_AGENT_MODEL: Record<AgentId, string> = {
  claude: 'sonnet',
  codex: 'gpt-5.5'
}

export function bundledModelCatalog(agent: AgentId, error?: string): AgentModelCatalog {
  return {
    models: BUNDLED_AGENT_MODELS[agent],
    defaultModelId: DEFAULT_AGENT_MODEL[agent],
    source: 'bundled',
    ...(error ? { error } : {})
  }
}
