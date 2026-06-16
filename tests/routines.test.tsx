// tests/routines.test.tsx — RoutinesScreen renders and toggle/run-now fire without throwing.
import { describe, it, expect, beforeEach, vi } from 'vitest'
import { render, screen, fireEvent, cleanup } from '@testing-library/react'
import { RoutinesScreen } from '@renderer/screens/Routines'
import { useStore } from '@renderer/store'
import type { Routine } from '@shared/types'

const routine: Routine = {
  id: 'r1',
  name: 'Morning triage',
  prompt: 'Triage open issues',
  dir: '~/proj',
  model: 'sonnet',
  enabled: true,
  schedule: { freq: 'daily', time: '09:00', days: [], everyHours: 0 }
}

beforeEach(() => {
  cleanup()
  // Stub the IPC surface the store touches (toggle/runNow + the load() refresh).
  ;(globalThis as unknown as { window: { api: unknown } }).window.api = {
    routines: {
      list: async () => [routine],
      runs: async () => [],
      toggle: async () => {},
      runNow: async () => {}
    },
    runs: { list: async () => [] },
    tweaks: { get: async () => useStore.getState().tweaks },
    settings: { get: async () => useStore.getState().settings },
    daemon: { status: async () => ({ installed: false, loaded: false }) }
  }
  useStore.setState({
    routines: [routine],
    runs: [],
    toggleRoutine: vi.fn(async () => {}),
    runNow: vi.fn(async () => {})
  })
})

describe('RoutinesScreen', () => {
  it('renders the routine name', () => {
    render(<RoutinesScreen nav={() => {}} now={new Date()} openEditor={() => {}} />)
    expect(screen.getByText('Morning triage')).toBeTruthy()
  })

  it('fires the enable toggle without throwing', () => {
    render(<RoutinesScreen nav={() => {}} now={new Date()} openEditor={() => {}} />)
    const toggle = document.querySelector('.toggle') as HTMLElement
    expect(toggle).toBeTruthy()
    expect(() => fireEvent.click(toggle)).not.toThrow()
  })

  it('fires run-now without throwing', () => {
    render(<RoutinesScreen nav={() => {}} now={new Date()} openEditor={() => {}} />)
    const runNow = screen.getByTitle('Run now')
    expect(() => fireEvent.click(runNow)).not.toThrow()
  })

  it('renders the empty state when there are no routines', () => {
    useStore.setState({ routines: [] })
    render(<RoutinesScreen nav={() => {}} now={new Date()} openEditor={() => {}} />)
    expect(screen.getByText('No routines yet')).toBeTruthy()
  })
})
