import { describe, expect, it } from 'vitest'
import { createTranscriptCollector } from '@core/claude-run-transcript'

describe('createTranscriptCollector', () => {
  it('records user prompt, assistant text, tool usage, changes, and metrics', () => {
    const seen: number[] = []
    const collector = createTranscriptCollector({
      prompt: 'do work',
      onTranscript: (_entry, all) => seen.push(all.length)
    })

    collector.handleEvent({
      type: 'assistant',
      message: {
        content: [
          { type: 'text', text: '  done\n' },
          { type: 'tool_use', name: 'Edit', input: { file_path: 'src/app.ts' } }
        ]
      }
    })
    collector.handleEvent({
      type: 'result',
      result: 'final summary',
      total_cost_usd: 0.123456,
      usage: { input_tokens: 1, output_tokens: 2, cache_read_input_tokens: 3 },
      is_error: true
    })

    expect(collector.transcript).toEqual([
      { role: 'user', text: 'do work' },
      { role: 'assistant', text: 'done' },
      { role: 'tool', name: 'Edit', arg: 'src/app.ts' }
    ])
    expect(collector.changes).toEqual([{ t: 'edit', x: 'src/app.ts' }])
    expect(collector.finalSummary).toBe('final summary')
    expect(collector.costUsd).toBe(0.1235)
    expect(collector.tokens).toBe(6)
    expect(collector.isError).toBe(true)
    expect(seen).toEqual([1, 2, 3])
  })

  it('compacts tool result content into transcript entries', () => {
    const collector = createTranscriptCollector({ prompt: 'run tests' })

    collector.handleEvent({
      type: 'user',
      message: {
        content: [
          {
            type: 'tool_result',
            content: [{ text: 'line one\n\n' }, { text: 'line two' }],
            is_error: true
          }
        ]
      }
    })

    expect(collector.transcript[1]).toEqual({
      role: 'result',
      text: 'line one line two',
      err: true
    })
  })
})
