import { spawn } from 'child_process'
import { homedir } from 'os'
import { join } from 'path'
import { bundledModelCatalog } from '@shared/agent-models'
import type { AgentId, AgentModel, AgentModelCatalog } from '@shared/types'
import { resolveCodexCommand } from './codex-runner'

const DISCOVERY_TIMEOUT_MS = 15_000
const MAX_OUTPUT_BYTES = 2 * 1024 * 1024

function buildEnv(): NodeJS.ProcessEnv {
  const extra = [
    join(homedir(), '.local', 'bin'),
    '/opt/homebrew/bin',
    '/usr/local/bin',
    '/usr/bin',
    '/bin'
  ]
  const current = process.env.PATH ? process.env.PATH.split(':') : []
  return { ...process.env, PATH: Array.from(new Set([...current, ...extra])).join(':') }
}

function uniqueModels(models: AgentModel[]): AgentModel[] {
  const seen = new Set<string>()
  return models.filter((model) => {
    if (!model.id || seen.has(model.id)) {
      return false
    }
    seen.add(model.id)
    return true
  })
}

/** Parse the JSON emitted by `codex debug models`, matching Orca's discovery path. */
export function parseCodexModels(output: string): AgentModel[] {
  try {
    const parsed = JSON.parse(output) as {
      models?: {
        slug?: string
        display_name?: string
        description?: string
      }[]
    }
    return uniqueModels(
      (parsed.models ?? [])
        .filter((model) => model.slug && model.display_name)
        .map((model) => ({
          id: model.slug!,
          label: model.display_name!,
          ...(model.description ? { description: model.description } : {})
        }))
    )
  } catch {
    return []
  }
}

function discoverCodexModels(): Promise<AgentModelCatalog> {
  return new Promise((resolve) => {
    let child
    try {
      child = spawn(resolveCodexCommand(), ['debug', 'models'], {
        env: buildEnv(),
        stdio: ['ignore', 'pipe', 'pipe']
      })
    } catch (error) {
      resolve(bundledModelCatalog('codex', `Codex model discovery failed: ${String(error)}`))
      return
    }

    let stdout = ''
    let stderr = ''
    let settled = false
    const finish = (catalog: AgentModelCatalog): void => {
      if (settled) {
        return
      }
      settled = true
      clearTimeout(timer)
      resolve(catalog)
    }
    const timer = setTimeout(() => {
      child.kill('SIGTERM')
      finish(bundledModelCatalog('codex', 'Codex model discovery timed out.'))
    }, DISCOVERY_TIMEOUT_MS)

    const append = (current: string, chunk: Buffer): string | null => {
      if (stdout.length + stderr.length + chunk.byteLength > MAX_OUTPUT_BYTES) {
        child.kill('SIGTERM')
        finish(bundledModelCatalog('codex', 'Codex returned too much model data.'))
        return null
      }
      return current + chunk.toString('utf-8')
    }

    child.stdout?.on('data', (chunk: Buffer) => {
      stdout = append(stdout, chunk) ?? stdout
    })
    child.stderr?.on('data', (chunk: Buffer) => {
      stderr = append(stderr, chunk) ?? stderr
    })
    child.on('error', (error) => {
      finish(bundledModelCatalog('codex', `Codex model discovery failed: ${error.message}`))
    })
    child.on('close', (code) => {
      if (settled) {
        return
      }
      const models = code === 0 ? parseCodexModels(stdout) : []
      if (models.length === 0) {
        const detail = stderr.trim().split('\n').at(-1)
        finish(
          bundledModelCatalog(
            'codex',
            detail || `Codex model discovery returned no models${code ? ` (exit ${code})` : ''}.`
          )
        )
        return
      }
      const preferred = models.some((model) => model.id === 'gpt-5.5') ? 'gpt-5.5' : models[0].id
      finish({ models, defaultModelId: preferred, source: 'agent' })
    })
  })
}

export function discoverAgentModels(agent: AgentId): Promise<AgentModelCatalog> {
  // Claude Code currently exposes stable aliases but no headless catalog command.
  // Returning them through the same API keeps the renderer agent-agnostic.
  return agent === 'codex' ? discoverCodexModels() : Promise.resolve(bundledModelCatalog('claude'))
}
