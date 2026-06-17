import { afterEach, describe, expect, it } from 'vitest'
import { chmodSync, mkdtempSync, rmSync, writeFileSync } from 'fs'
import { tmpdir } from 'os'
import { join } from 'path'
import { discoverAgentModels, parseCodexModels } from '@core/agent-models'

const tempDirs: string[] = []

afterEach(() => {
  delete process.env.LOOP_CODEX_BIN
  for (const dir of tempDirs.splice(0)) {
    rmSync(dir, { recursive: true, force: true })
  }
})

function fakeCodex(body: string): string {
  const dir = mkdtempSync(join(tmpdir(), 'loop-models-test-'))
  tempDirs.push(dir)
  const command = join(dir, 'codex')
  writeFileSync(command, `#!/bin/sh\n${body}\n`)
  chmodSync(command, 0o755)
  return command
}

describe('agent model discovery', () => {
  it('parses and deduplicates the Codex JSON catalog', () => {
    const output = JSON.stringify({
      models: [
        { slug: 'gpt-5.5', display_name: 'GPT-5.5', description: 'Frontier model' },
        { slug: 'gpt-5.5', display_name: 'Duplicate' },
        { slug: 'gpt-5.4-mini', display_name: 'GPT-5.4 Mini' },
        { display_name: 'Missing slug' }
      ]
    })
    expect(parseCodexModels(output)).toEqual([
      { id: 'gpt-5.5', label: 'GPT-5.5', description: 'Frontier model' },
      { id: 'gpt-5.4-mini', label: 'GPT-5.4 Mini' }
    ])
  })

  it('loads Codex models from the installed agent command', async () => {
    const output = JSON.stringify({
      models: [
        { slug: 'gpt-next', display_name: 'GPT Next' },
        { slug: 'gpt-5.5', display_name: 'GPT-5.5' }
      ]
    })
    process.env.LOOP_CODEX_BIN = fakeCodex(`printf '%s' '${output}'`)

    await expect(discoverAgentModels('codex')).resolves.toEqual({
      models: [
        { id: 'gpt-next', label: 'GPT Next' },
        { id: 'gpt-5.5', label: 'GPT-5.5' }
      ],
      defaultModelId: 'gpt-5.5',
      source: 'agent'
    })
  })

  it('falls back to bundled Codex models when discovery fails', async () => {
    process.env.LOOP_CODEX_BIN = fakeCodex("echo 'catalog unavailable' >&2; exit 1")
    const catalog = await discoverAgentModels('codex')
    expect(catalog.source).toBe('bundled')
    expect(catalog.models[0].id).toBe('gpt-5.5')
    expect(catalog.error).toContain('catalog unavailable')
  })

  it('provides Claude Code stable aliases through the same API', async () => {
    const catalog = await discoverAgentModels('claude')
    expect(catalog.models.map((model) => model.id)).toEqual(['sonnet', 'opus', 'haiku'])
    expect(catalog.defaultModelId).toBe('sonnet')
  })
})
