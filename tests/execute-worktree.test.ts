import { beforeEach, describe, expect, it, vi } from 'vitest'
import type { Store } from '@core/persistence'
import type { Routine, Run, Settings } from '@shared/types'

const mocks = vi.hoisted(() => ({
  runClaude: vi.fn(),
  prepareGitWorktree: vi.fn()
}))

vi.mock('@core/claude-runner', async (importOriginal) => {
  const actual = (await importOriginal()) as Record<string, unknown>
  return { ...actual, runClaude: mocks.runClaude }
})

vi.mock('@core/git-worktree', () => ({
  prepareGitWorktree: mocks.prepareGitWorktree
}))

const settings: Settings = {
  defaultAgent: 'claude',
  daemonEnabled: false,
  pausedAll: false,
  defaultPermissionMode: 'bypass',
  defaultMissedRunGraceMinutes: 720,
  runTimeoutMinutes: 60,
  notifyOnComplete: true,
  worktreeBaseDir: '/tmp/loop-worktrees'
}

const routine: Routine = {
  id: 'rt-1',
  name: 'Nightly Audit',
  prompt: 'do work',
  dir: '/repo/packages/app',
  executeInWorktree: true,
  agent: 'claude',
  model: 'sonnet',
  enabled: true,
  schedule: { freq: 'daily', time: '09:00', days: [], everyHours: 0 }
}

function runningRun(): Run {
  return {
    id: 'run-rt-1-1234-abcd',
    routineId: 'rt-1',
    start: new Date().toISOString(),
    durationSec: null,
    status: 'running',
    costUsd: null,
    tokens: null,
    summary: 'Run started…',
    changes: [],
    transcript: [{ role: 'user', text: 'do work' }]
  }
}

function fakeStore(run: Run) {
  const state = { run }
  return {
    getSettings: () => settings,
    updateRun: (id: string, patch: Partial<Run>) => {
      if (id === state.run.id) {
        state.run = { ...state.run, ...patch }
      }
      return state.run
    },
    state
  }
}

describe('executeRoutine worktree handling', () => {
  beforeEach(() => {
    mocks.runClaude.mockReset()
    mocks.prepareGitWorktree.mockReset()
  })

  it('creates a worktree before launching Claude in the worktree subdirectory', async () => {
    const { executeRoutine } = await import('@core/routine-execution')
    const run = runningRun()
    const store = fakeStore(run)
    mocks.prepareGitWorktree.mockResolvedValue({
      repoRoot: '/repo',
      worktreeDir: '/tmp/loop-worktrees/repo/nightly-audit-run-rt-1-1234-abcd',
      executionDir: '/tmp/loop-worktrees/repo/nightly-audit-run-rt-1-1234-abcd/packages/app',
      branch: 'loop/nightly-audit/run-rt-1-1234-abcd'
    })
    mocks.runClaude.mockResolvedValue({
      status: 'success',
      durationSec: 3,
      costUsd: null,
      tokens: null,
      summary: 'done',
      changes: [],
      transcript: [
        { role: 'user', text: 'do work' },
        { role: 'assistant', text: 'done' }
      ]
    })

    await executeRoutine(routine, run, store as unknown as Store)

    expect(mocks.prepareGitWorktree).toHaveBeenCalledWith({
      sourceDir: routine.dir,
      baseDir: settings.worktreeBaseDir,
      routineName: routine.name,
      runId: run.id
    })
    expect(mocks.runClaude).toHaveBeenCalledWith(
      expect.objectContaining({
        dir: '/tmp/loop-worktrees/repo/nightly-audit-run-rt-1-1234-abcd/packages/app'
      }),
      expect.any(Object)
    )
    expect(store.state.run.worktreeDir).toBe(
      '/tmp/loop-worktrees/repo/nightly-audit-run-rt-1-1234-abcd'
    )
    expect(store.state.run.worktreeBranch).toBe('loop/nightly-audit/run-rt-1-1234-abcd')
    expect(store.state.run.transcript.map((entry) => entry.role)).toEqual([
      'user',
      'result',
      'result',
      'assistant'
    ])
  })

  it('fails clearly and does not launch Claude when worktree setup fails', async () => {
    const { executeRoutine } = await import('@core/routine-execution')
    const run = runningRun()
    const store = fakeStore(run)
    mocks.prepareGitWorktree.mockRejectedValue(new Error('Could not find git repository'))

    await executeRoutine(routine, run, store as unknown as Store)

    expect(mocks.runClaude).not.toHaveBeenCalled()
    expect(store.state.run.status).toBe('failed')
    expect(store.state.run.summary).toBe('Run failed — Could not find git repository')
    expect(store.state.run.transcript).toContainEqual({
      role: 'result',
      text: 'Could not find git repository',
      err: true
    })
  })
})
