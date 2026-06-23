// core/git-worktree.ts — create one isolated git worktree for a routine run.
import { execFile } from 'child_process'
import { existsSync, mkdirSync, statSync } from 'fs'
import { basename, dirname, isAbsolute, join, relative, resolve, sep } from 'path'
import { promisify } from 'util'
import { DEFAULT_WORKTREE_BASE_DIR } from '@shared/seed'
import { expandHome } from './paths'
import { buildChildEnv } from './process-env'

const execFileAsync = promisify(execFile)

export type GitRunner = (args: string[], cwd: string) => Promise<string>

export type PreparedWorktree = {
  /** Original repository root. */
  repoRoot: string
  /** Worktree root created for this run. */
  worktreeDir: string
  /** Directory Claude should use as cwd; may be a subdirectory inside worktreeDir. */
  executionDir: string
  /** Unique branch created with the worktree. */
  branch: string
}

export class WorktreeSetupError extends Error {
  override name = 'WorktreeSetupError'
}

export async function prepareGitWorktree({
  sourceDir,
  baseDir,
  routineName,
  runId,
  git = execGit
}: {
  sourceDir: string
  baseDir?: string
  routineName: string
  runId: string
  git?: GitRunner
}): Promise<PreparedWorktree> {
  const resolvedSourceDir = resolve(expandHome(sourceDir))
  if (!existsSync(resolvedSourceDir) || !statSync(resolvedSourceDir).isDirectory()) {
    throw new WorktreeSetupError(`Working directory not found: ${resolvedSourceDir}`)
  }

  const repoRoot = await runGit(git, ['rev-parse', '--show-toplevel'], resolvedSourceDir, {
    action: 'find git repository'
  })
  const resolvedRepoRoot = resolve(repoRoot)
  const relativeRunDir = relative(resolvedRepoRoot, resolvedSourceDir)
  if (
    relativeRunDir === '..' ||
    relativeRunDir.startsWith(`..${sep}`) ||
    isAbsolute(relativeRunDir)
  ) {
    throw new WorktreeSetupError(`Working directory is not inside git repo: ${resolvedSourceDir}`)
  }

  const resolvedBaseDir = resolve(expandHome(baseDir?.trim() || DEFAULT_WORKTREE_BASE_DIR))
  const repoSlug = slug(basename(resolvedRepoRoot), 'repo')
  const routineSlug = slug(routineName, 'routine')
  const runSlug = slug(runId, 'run')
  const branch = `loop/${routineSlug}/${runSlug}`
  const worktreeDir = join(resolvedBaseDir, repoSlug, `${routineSlug}-${runSlug}`)
  const executionDir = relativeRunDir ? join(worktreeDir, relativeRunDir) : worktreeDir

  mkdirSync(dirname(worktreeDir), { recursive: true })
  await runGit(git, ['worktree', 'add', '-b', branch, worktreeDir, 'HEAD'], resolvedRepoRoot, {
    action: 'create git worktree'
  })
  mkdirSync(executionDir, { recursive: true })

  return { repoRoot: resolvedRepoRoot, worktreeDir, executionDir, branch }
}

async function execGit(args: string[], cwd: string): Promise<string> {
  const { stdout } = await execFileAsync('git', args, {
    cwd,
    env: buildChildEnv(),
    maxBuffer: 1024 * 1024
  })
  return String(stdout)
}

async function runGit(
  git: GitRunner,
  args: string[],
  cwd: string,
  opts: { action: string }
): Promise<string> {
  try {
    return (await git(args, cwd)).trim()
  } catch (e) {
    throw new WorktreeSetupError(`Could not ${opts.action}: ${errorText(e)}`)
  }
}

function slug(value: string, fallback: string): string {
  const cleaned = value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 64)
  return cleaned || fallback
}

function errorText(e: unknown): string {
  if (e instanceof Error) {
    const withOutput = e as Error & { stderr?: unknown; stdout?: unknown }
    const stderr = typeof withOutput.stderr === 'string' ? withOutput.stderr.trim() : ''
    const stdout = typeof withOutput.stdout === 'string' ? withOutput.stdout.trim() : ''
    return stderr || stdout || e.message
  }
  return String(e)
}
