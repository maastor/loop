// tests/history.test.tsx — HistoryScreen + RunDetailScreen render and basic interaction.
import { describe, it, expect, beforeEach } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { useStore } from '@renderer/store'
import { HistoryScreen } from '@renderer/screens/History'
import { RunDetailScreen } from '@renderer/screens/RunDetail'
import type { Routine, Run } from '@shared/types'

const routine: Routine = {
  id: 'rt-1',
  name: 'Morning issue triage',
  prompt: 'Do the thing.',
  dir: '~/work/app',
  agent: 'claude',
  model: 'sonnet',
  enabled: true,
  schedule: { freq: 'daily', time: '09:00', days: [], everyHours: 0 }
}

const run: Run = {
  id: 'run-1',
  routineId: 'rt-1',
  start: new Date('2026-06-12T09:00:00').toISOString(),
  durationSec: 92,
  status: 'success',
  costUsd: 0.42,
  tokens: 12500,
  summary: 'Triaged 7 issues and labeled them.',
  changes: [{ t: 'commit', x: 'abc123 triage notes' }],
  transcript: [
    { role: 'user', text: 'Triage the issues' },
    { role: 'assistant', text: 'Working on it.' }
  ]
}

beforeEach(() => {
  useStore.setState({ routines: [routine], runs: [run] })
})

const noop = (): void => {}

describe('HistoryScreen', () => {
  it('renders the routine name and summary', () => {
    render(<HistoryScreen nav={noop} now={new Date()} openEditor={noop} />)
    // Name appears in both the routine-filter <option> and the run row.
    expect(screen.getAllByText('Morning issue triage').length).toBeGreaterThan(0)
    expect(screen.getByText('Triaged 7 issues and labeled them.')).toBeTruthy()
  })

  it('does not throw when the status Seg changes', () => {
    render(<HistoryScreen nav={noop} now={new Date()} openEditor={noop} />)
    expect(() => fireEvent.click(screen.getByText('Failed'))).not.toThrow()
  })
})

describe('RunDetailScreen', () => {
  it('renders the transcript and summary', () => {
    render(<RunDetailScreen runId={run.id} nav={noop} now={new Date()} openEditor={noop} />)
    expect(screen.getByText('Triaged 7 issues and labeled them.')).toBeTruthy()
    expect(screen.getByText('Working on it.')).toBeTruthy()
  })
})
