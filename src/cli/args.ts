import { readFileSync } from 'fs'
import { CliError } from './output'

// Minimal zero-dependency argument parser. Supports `--key value`, `--key=value`, bare
// boolean `--flag`, negation `--no-flag`, and positionals. A value that begins with `--`
// must use the `--key=value` form (so prompts can start with a dash).

export type ParsedArgs = {
  positionals: string[]
  flags: Record<string, string | boolean>
}

export function parseArgs(tokens: string[]): ParsedArgs {
  const positionals: string[] = []
  const flags: Record<string, string | boolean> = {}
  for (let i = 0; i < tokens.length; i++) {
    const tok = tokens[i]
    if (!tok.startsWith('--')) {
      positionals.push(tok)
      continue
    }
    const body = tok.slice(2)
    const eq = body.indexOf('=')
    if (eq !== -1) {
      flags[body.slice(0, eq)] = body.slice(eq + 1)
      continue
    }
    if (body.startsWith('no-')) {
      flags[body.slice(3)] = false
      continue
    }
    const next = tokens[i + 1]
    if (next === undefined || next.startsWith('--')) {
      flags[body] = true
    } else {
      flags[body] = next
      i++
    }
  }
  return { positionals, flags }
}

export function has(args: ParsedArgs, key: string): boolean {
  return key in args.flags
}

export function flagStr(args: ParsedArgs, key: string): string | undefined {
  const v = args.flags[key]
  if (v === undefined) {
    return undefined
  }
  if (typeof v === 'boolean') {
    throw new CliError(`--${key} requires a value`)
  }
  return v
}

export function requireStr(args: ParsedArgs, key: string): string {
  const v = flagStr(args, key)
  if (v === undefined) {
    throw new CliError(`--${key} is required`)
  }
  return v
}

export function flagBool(args: ParsedArgs, key: string): boolean | undefined {
  const v = args.flags[key]
  if (v === undefined) {
    return undefined
  }
  if (typeof v === 'boolean') {
    return v
  }
  if (v === 'true') {
    return true
  }
  if (v === 'false') {
    return false
  }
  throw new CliError(`--${key} must be true or false`)
}

export function flagNum(args: ParsedArgs, key: string): number | undefined {
  const v = flagStr(args, key)
  if (v === undefined) {
    return undefined
  }
  const n = Number(v)
  if (!Number.isFinite(n)) {
    throw new CliError(`--${key} must be a number`)
  }
  return n
}

/** Choose one of a fixed set of values, validating membership. */
export function flagEnum<T extends string>(
  args: ParsedArgs,
  key: string,
  allowed: readonly T[]
): T | undefined {
  const v = flagStr(args, key)
  if (v === undefined) {
    return undefined
  }
  if (!allowed.includes(v as T)) {
    throw new CliError(`--${key} must be one of: ${allowed.join(', ')}`)
  }
  return v as T
}

/**
 * Resolve a prompt value from `--prompt` (literal, or `-` for stdin) or `--prompt-file`.
 * Returns undefined when neither is supplied so callers can decide whether it is required.
 */
export function resolvePrompt(args: ParsedArgs): string | undefined {
  const file = flagStr(args, 'prompt-file')
  if (file !== undefined) {
    try {
      return readFileSync(file, 'utf-8')
    } catch (error) {
      throw new CliError(`could not read --prompt-file ${file}: ${String(error)}`)
    }
  }
  const prompt = flagStr(args, 'prompt')
  if (prompt === '-') {
    try {
      return readFileSync(0, 'utf-8')
    } catch (error) {
      throw new CliError(`could not read prompt from stdin: ${String(error)}`)
    }
  }
  return prompt
}
