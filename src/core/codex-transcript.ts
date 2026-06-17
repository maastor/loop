import type { Change, TranscriptEntry } from '@shared/types'
import type { RunCallbacks } from './agent-runner'
import { deriveChange } from './claude-stream'

type CodexUsage = {
  input_tokens?: number
  cached_input_tokens?: number
  output_tokens?: number
}

type CodexItem = {
  type?: string
  text?: string
  command?: string
  aggregated_output?: string
  name?: string
  tool?: string
  server?: string
  query?: string
  changes?: { path?: string; kind?: string }[]
}

export type CodexEvent = {
  type?: string
  item?: CodexItem
  usage?: CodexUsage
  message?: string
  error?: { message?: string }
}

export type CodexTranscriptCollector = {
  transcript: TranscriptEntry[]
  changes: Change[]
  finalSummary: string
  tokens: number | null
  isError: boolean
  push: (entry: TranscriptEntry) => void
  handleEvent: (event: CodexEvent) => void
}

function compact(text: string | undefined, max = 400): string {
  return (text ?? '').replace(/\s+/g, ' ').trim().slice(0, max)
}

function addUniqueChange(changes: Change[], change: Change): void {
  if (!changes.some((current) => current.t === change.t && current.x === change.x)) {
    changes.push(change)
  }
}

function sumUsage(usage: CodexUsage | undefined): number | null {
  if (!usage) {
    return null
  }
  return (usage.input_tokens ?? 0) + (usage.output_tokens ?? 0)
}

export function createCodexTranscriptCollector(
  prompt: string,
  onTranscript?: RunCallbacks['onTranscript']
): CodexTranscriptCollector {
  const collector: CodexTranscriptCollector = {
    transcript: [],
    changes: [],
    finalSummary: '',
    tokens: null,
    isError: false,
    push(entry) {
      collector.transcript.push(entry)
      onTranscript?.(entry, collector.transcript)
    },
    handleEvent(event) {
      if (event.type === 'item.completed' && event.item) {
        const item = event.item
        if (item.type === 'agent_message' && item.text?.trim()) {
          collector.finalSummary = item.text.trim()
          collector.push({ role: 'assistant', text: item.text.trim() })
        } else if (item.type === 'command_execution') {
          const command = compact(item.command)
          collector.push({ role: 'tool', name: 'Shell', arg: command })
          const change = deriveChange('Bash', command)
          if (change) {
            addUniqueChange(collector.changes, change)
          }
          const output = compact(item.aggregated_output, 200)
          if (output) {
            collector.push({ role: 'result', text: output })
          }
        } else if (item.type === 'file_change') {
          for (const file of item.changes ?? []) {
            if (!file.path) {
              continue
            }
            collector.push({ role: 'tool', name: 'File change', arg: file.path })
            addUniqueChange(collector.changes, { t: 'edit', x: file.path })
          }
        } else if (item.type === 'mcp_tool_call') {
          const name = [item.server, item.tool ?? item.name].filter(Boolean).join('/') || 'MCP'
          collector.push({ role: 'tool', name, arg: '' })
        } else if (item.type === 'web_search') {
          collector.push({ role: 'tool', name: 'Web search', arg: compact(item.query) })
        }
      } else if (event.type === 'turn.completed') {
        collector.tokens = sumUsage(event.usage)
      } else if (event.type === 'turn.failed' || event.type === 'error') {
        const message = event.error?.message ?? event.message ?? 'Codex run failed.'
        collector.isError = true
        collector.finalSummary = message
        collector.push({ role: 'result', text: message, err: true })
      }
    }
  }
  collector.push({ role: 'user', text: prompt })
  return collector
}
