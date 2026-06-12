// tests/routine-detail.test.tsx — RoutineDetail screen render + delete-confirm flow.
import { describe, it, expect, beforeEach } from 'vitest'
import { render, screen, fireEvent, cleanup } from '@testing-library/react'
import { useStore } from '../src/renderer/src/store'
import { RoutineDetailScreen } from '../src/renderer/src/screens/RoutineDetail'
import type { Routine, Run } from '../src/shared/types'

const routine: Routine = {
  id: 'r1',
  name: 'Nightly dependency audit',
  prompt: 'Audit dependencies and open a PR for any safe upgrades.',
  dir: '~/code/app',
  model: 'sonnet',
  enabled: true,
  schedule: { freq: 'daily', time: '21:00', days: [], everyHours: 0 }
}

const run: Run = {
  id: 'run1',
  routineId: 'r1',
  start: new Date('2026-06-11T21:00:00').toISOString(),
  durationSec: 142,
  status: 'success',
  costUsd: 0.42,
  tokens: 12000,
  summary: 'Upgraded 3 dependencies, opened PR #42.',
  changes: [],
  transcript: []
}

beforeEach(() => {
  cleanup()
  ;(globalThis as unknown as { window: { api: unknown } }).window.api = {
    routines: {
      list: async () => [routine],
      get: async () => routine,
      create: async () => routine,
      update: async () => routine,
      delete: async () => {},
      toggle: async () => routine,
      runNow: async () => run
    },
    runs: { list: async () => [run], get: async () => run },
    tweaks: { get: async () => useStore.getState().tweaks, set: async () => useStore.getState().tweaks },
    settings: { get: async () => useStore.getState().settings, set: async () => useStore.getState().settings },
    daemon: { status: async () => ({ installed: false, loaded: false }), install: async () => ({ installed: true, loaded: true }), uninstall: async () => ({ installed: false, loaded: false }) },
    app: { openWindow: async () => {} },
    onDataChanged: () => () => {}
  }
  useStore.setState({ routines: [routine], runs: [run] })
})

describe('RoutineDetailScreen', () => {
  it('renders the routine name and prompt', () => {
    render(
      <RoutineDetailScreen
        routineId="r1"
        nav={() => {}}
        now={new Date('2026-06-12T08:00:00')}
        openEditor={() => {}}
      />
    )
    expect(screen.getByText('Nightly dependency audit')).toBeTruthy()
    expect(
      screen.getByText('Audit dependencies and open a PR for any safe upgrades.')
    ).toBeTruthy()
  })

  it('shows the inline confirm row when Delete routine is clicked', () => {
    render(
      <RoutineDetailScreen
        routineId="r1"
        nav={() => {}}
        now={new Date('2026-06-12T08:00:00')}
        openEditor={() => {}}
      />
    )
    expect(screen.queryByText(/Delete this routine and keep its history/)).toBeNull()
    fireEvent.click(screen.getByText('Delete routine'))
    expect(
      screen.getByText('Delete this routine and keep its history?')
    ).toBeTruthy()
  })

  it('renders a missing-routine fallback', () => {
    render(
      <RoutineDetailScreen
        routineId="nope"
        nav={() => {}}
        now={new Date('2026-06-12T08:00:00')}
        openEditor={() => {}}
      />
    )
    expect(screen.getByText('Routine not found.')).toBeTruthy()
  })
})
