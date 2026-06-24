import { describe, expect, it, afterEach } from 'vitest'
import { mkdtempSync, mkdirSync, rmSync } from 'fs'
import { tmpdir } from 'os'
import { basename, join } from 'path'
import { prepareGitWorktree, WorktreeSetupError, type GitRunner } from '@core/git-worktree'

const tempDirs: string[] = []

function tempRoot(name: string): string {
  const parent = mkdtempSync(join(tmpdir(), 'loop-worktree-test-'))
  tempDirs.push(parent)
  const root = join(parent, name)
  mkdirSync(root, { recursive: true })
  return root
}

afterEach(() => {
  for (const dir of tempDirs.splice(0)) {
    rmSync(dir, { recursive: true, force: true })
  }
})

describe('prepareGitWorktree', () => {
  it('creates a unique branch and runs in the matching worktree subdirectory', async () => {
    const repoRoot = tempRoot('Repo Name')
    const sourceDir = join(repoRoot, 'packages', 'app')
    const baseDir = join(repoRoot, '..', 'worktrees')
    mkdirSync(sourceDir, { recursive: true })
    const calls: { args: string[]; cwd: string }[] = []
    const git: GitRunner = async (args, cwd) => {
      calls.push({ args, cwd })
      if (args.join(' ') === 'rev-parse --show-toplevel') {
        return repoRoot
      }
      if (args[0] === 'worktree' && args[1] === 'add') {
        return ''
      }
      throw new Error(`unexpected git call: ${args.join(' ')}`)
    }

    const result = await prepareGitWorktree({
      sourceDir,
      baseDir,
      routineName: 'Nightly Audit!',
      runId: 'run-rt-1-1234-abcd',
      git
    })

    const worktreeDir = join(
      baseDir,
      basename(repoRoot)
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '-'),
      'nightly-audit-run-rt-1-1234-abcd'
    )
    expect(result).toEqual({
      repoRoot,
      worktreeDir,
      executionDir: join(worktreeDir, 'packages', 'app'),
      branch: 'loop/nightly-audit/run-rt-1-1234-abcd'
    })
    expect(calls).toEqual([
      { args: ['rev-parse', '--show-toplevel'], cwd: sourceDir },
      {
        args: ['worktree', 'add', '-b', result.branch, result.worktreeDir, 'HEAD'],
        cwd: repoRoot
      }
    ])
  })

  it('fails clearly when the source directory is not in a git repo', async () => {
    const repoRoot = tempRoot('plain-dir')
    const git: GitRunner = async () => {
      throw new Error('fatal: not a git repository')
    }

    await expect(
      prepareGitWorktree({
        sourceDir: repoRoot,
        baseDir: '',
        routineName: 'No Git',
        runId: 'run-1',
        git
      })
    ).rejects.toThrow(WorktreeSetupError)
  })
})
