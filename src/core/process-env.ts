// core/process-env.ts — child-process environment shared by git and Claude runners.
import { homedir } from 'os'
import { join } from 'path'

/** Build an augmented PATH so spawned tools can find node, git, gh, claude, etc. */
export function buildChildEnv(): NodeJS.ProcessEnv {
  const extra = [
    join(homedir(), '.local', 'bin'),
    '/opt/homebrew/bin',
    '/usr/local/bin',
    '/usr/bin',
    '/bin'
  ]
  const current = process.env.PATH ? process.env.PATH.split(':') : []
  const merged = Array.from(new Set([...current, ...extra])).join(':')
  return { ...process.env, PATH: merged }
}
