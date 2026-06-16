import type { Change, TranscriptEntry } from '@shared/types'
import { type StreamEvent, deriveChange, sumTokens, summarizeToolArg } from './claude-stream'

export type TranscriptCollector = {
  transcript: TranscriptEntry[]
  changes: Change[]
  finalSummary: string
  costUsd: number | null
  tokens: number | null
  isError: boolean
  push: (entry: TranscriptEntry) => void
  handleEvent: (event: StreamEvent) => void
}

export function createTranscriptCollector({
  prompt,
  onTranscript
}: {
  prompt: string
  onTranscript?: (entry: TranscriptEntry, all: TranscriptEntry[]) => void
}): TranscriptCollector {
  const collector: TranscriptCollector = {
    transcript: [],
    changes: [],
    finalSummary: '',
    costUsd: null,
    tokens: null,
    isError: false,
    push(entry) {
      collector.transcript.push(entry)
      onTranscript?.(entry, collector.transcript)
    },
    handleEvent(event) {
      if (event.type === 'assistant' && event.message?.content) {
        for (const block of event.message.content) {
          if (block.type === 'text' && typeof block.text === 'string' && block.text.trim()) {
            collector.push({ role: 'assistant', text: block.text.trim() })
          } else if (block.type === 'tool_use' && typeof block.name === 'string') {
            const arg = summarizeToolArg(block.name, block.input)
            collector.push({ role: 'tool', name: block.name, arg })
            const change = deriveChange(block.name, arg)
            if (change) {
              collector.changes.push(change)
            }
          }
        }
      } else if (event.type === 'user' && event.message?.content) {
        for (const block of event.message.content) {
          if (block.type === 'tool_result') {
            const text = toolResultText(block.content)
            if (text) {
              collector.push({ role: 'result', text, err: block.is_error === true })
            }
          }
        }
      } else if (event.type === 'result') {
        if (typeof event.result === 'string') {
          collector.finalSummary = event.result
        }
        if (typeof event.total_cost_usd === 'number') {
          collector.costUsd = +event.total_cost_usd.toFixed(4)
        }
        const tokens = sumTokens(event.usage)
        if (tokens != null) {
          collector.tokens = tokens
        }
        if (event.is_error) {
          collector.isError = true
        }
      }
    }
  }

  collector.push({ role: 'user', text: prompt })
  return collector
}

function toolResultText(content: unknown): string {
  let text = ''
  if (typeof content === 'string') {
    text = content
  } else if (Array.isArray(content)) {
    text = content
      .map((item: Record<string, unknown>) => (typeof item.text === 'string' ? item.text : ''))
      .join('')
  }
  return text.replace(/\s+/g, ' ').trim().slice(0, 200)
}
