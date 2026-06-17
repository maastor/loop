import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent, cleanup, waitFor } from '@testing-library/react'
import { Editor } from '@renderer/screens/Editor'
import { buildRoutineEdits } from '@renderer/screens/routine-editor-state'
import { useStore } from '@renderer/store'

// Minimal stub of the preload `window.api` surface used by the store.
function stubApi(): void {
  ;(globalThis as any).window.api = {
    agents: {
      models: async () => new Promise<never>(() => {})
    },
    routines: {
      list: async () => [],
      create: async (i: any) => ({ id: 'rt-x', enabled: true, ...i }),
      update: async (r: any) => r
    },
    runs: { list: async () => [] },
    tweaks: {
      get: async () => ({
        accent: '#E8703F',
        layout: 'rows',
        density: 'comfortable',
        routineGroupBy: 'project',
        routineSortBy: 'name'
      })
    },
    settings: { get: async () => ({ daemonEnabled: false, pausedAll: false }) },
    daemon: { status: async () => ({ installed: false, loaded: false }) },
    onDataChanged: () => () => {}
  }
}

beforeEach(() => {
  cleanup()
  stubApi()
  useStore.setState({
    settings: { ...useStore.getState().settings, defaultAgent: 'claude' }
  })
})

describe('Editor', () => {
  it('renders the New routine title and name input', () => {
    render(<Editor routine={null} onClose={() => {}} />)
    expect(screen.getByText('New routine')).toBeTruthy()
    expect(screen.getByPlaceholderText('Morning issue triage')).toBeTruthy()
  })

  it('accepts a name and a natural-language schedule without erroring', () => {
    render(<Editor routine={null} onClose={() => {}} />)

    const nameInput = screen.getByPlaceholderText('Morning issue triage') as HTMLInputElement
    fireEvent.change(nameInput, { target: { value: 'Morning triage' } })
    expect(nameInput.value).toBe('Morning triage')

    const nlInput = screen.getByPlaceholderText(
      'try "every weekday at 9am" or "every 6 hours"'
    ) as HTMLInputElement
    fireEvent.change(nlInput, { target: { value: 'every weekday at 9am' } })
    expect(nlInput.value).toBe('every weekday at 9am')

    // Parsed successfully → the describe hint reflects the weekday schedule.
    expect(screen.getByText(/Weekdays at 9 AM/)).toBeTruthy()
  })

  it('uses the configured default agent and preserves per-agent model selections', async () => {
    useStore.setState({
      settings: { ...useStore.getState().settings, defaultAgent: 'codex' }
    })
    render(<Editor routine={null} onClose={() => {}} />)

    const codexModel = screen.getByRole('combobox', { name: 'Model' }) as HTMLSelectElement
    expect(codexModel.value).toBe('gpt-5.5')
    await waitFor(() => expect(screen.getByText('GPT-5.4 Mini')).toBeTruthy())
    fireEvent.change(codexModel, { target: { value: 'gpt-5.4-mini' } })

    fireEvent.click(screen.getByText('Claude'))
    expect((screen.getByRole('combobox', { name: 'Model' }) as HTMLSelectElement).value).toBe(
      'sonnet'
    )
    fireEvent.click(screen.getByText('Codex'))
    expect((screen.getByRole('combobox', { name: 'Model' }) as HTMLSelectElement).value).toBe(
      'gpt-5.4-mini'
    )
  })

  it('uses a single-border numeric control for the catch-up override', () => {
    render(<Editor routine={null} onClose={() => {}} />)
    const input = screen.getByPlaceholderText('default')
    expect(input.classList.contains('numeric-input')).toBe(true)
    expect(input.parentElement?.classList.contains('numeric-field')).toBe(true)
  })

  it('calls onClose when Cancel is clicked', () => {
    const onClose = vi.fn()
    render(<Editor routine={null} onClose={onClose} />)
    fireEvent.click(screen.getByText('Cancel'))
    expect(onClose).toHaveBeenCalledTimes(1)
  })

  it('closes on Escape', () => {
    const onClose = vi.fn()
    render(<Editor routine={null} onClose={onClose} />)
    fireEvent.keyDown(window, { key: 'Escape' })
    expect(onClose).toHaveBeenCalledTimes(1)
  })

  it('normalizes save edits before sending them to the store', () => {
    expect(
      buildRoutineEdits({
        name: '  Nightly audit  ',
        prompt: '  Check deps  ',
        dir: '   ',
        agent: 'claude',
        model: 'sonnet',
        schedule: { freq: 'daily', time: '22:00', days: [], everyHours: 0 },
        permissionMode: '',
        grace: '-10'
      })
    ).toEqual({
      name: 'Nightly audit',
      prompt: 'Check deps',
      dir: '~',
      agent: 'claude',
      model: 'sonnet',
      schedule: { freq: 'daily', time: '22:00', days: [], everyHours: 0 },
      permissionMode: undefined,
      missedRunGraceMinutes: 0
    })
  })
})
