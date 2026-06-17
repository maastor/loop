import { describe, it, expect, beforeEach } from 'vitest'
import { render, screen, fireEvent, within, act } from '@testing-library/react'

const flush = (): Promise<void> =>
  act(async () => {
    await Promise.resolve()
  })
import { useStore } from '@renderer/store'
import { TweaksPanel } from '@renderer/TweaksPanel'
import { MenuBar } from '@renderer/MenuBar'
import type { Routine } from '@shared/types'

beforeEach(() => {
  ;(globalThis as any).window.api = {
    tweaks: {
      set: async (p: any) => ({
        accent: '#E8703F',
        layout: 'rows',
        density: 'comfortable',
        routineGroupBy: 'project',
        routineSortBy: 'name',
        ...p
      })
    },
    settings: {
      set: async (p: any) => ({ daemonEnabled: false, pausedAll: false, ...p })
    }
  }
})

const routine: Routine = {
  id: 'r1',
  name: 'Nightly tidy',
  prompt: 'tidy up',
  dir: '~/proj',
  agent: 'claude',
  model: 'sonnet',
  enabled: true,
  schedule: { freq: 'daily', time: '09:00', days: [], everyHours: 0 }
}

describe('TweaksPanel', () => {
  it('opens and lets you pick a layout without throwing', async () => {
    useStore.setState({ routines: [routine], runs: [] })
    render(<TweaksPanel />)

    fireEvent.click(screen.getByTitle('Tweaks'))

    fireEvent.click(screen.getByRole('button', { name: 'Cards' }))

    fireEvent.click(screen.getByRole('radio', { name: '#FF5300' }))
    await flush()
  })
})

describe('MenuBar', () => {
  it('opens the dropdown and toggles pause-all without throwing', async () => {
    useStore.setState({ routines: [routine], runs: [] })
    render(<MenuBar nav={() => {}} now={new Date()} />)

    fireEvent.click(screen.getByTitle('Loop quick status'))
    expect(screen.getByText('Routines')).toBeTruthy()

    const pause = screen.getByText(/pause all/i).closest('label') as HTMLElement
    fireEvent.click(within(pause).getByRole('switch'))
    await flush()
  })
})
