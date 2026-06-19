// Output + error helpers shared by every CLI command. Default output is machine-readable JSON
// (the CLI is driven mostly by AI agents); `--pretty` switches to human-readable text.

export class CliError extends Error {
  readonly code: number
  constructor(message: string, code = 1) {
    super(message)
    this.name = 'CliError'
    this.code = code
  }
}

let pretty = false

export function setPretty(value: boolean): void {
  pretty = value
}

export function isPretty(): boolean {
  return pretty
}

/**
 * Print a result. In JSON mode (default) the data is serialised verbatim; in `--pretty`
 * mode the optional `prettyText` formatter renders human-readable output, falling back to
 * pretty JSON when no formatter is supplied.
 */
export function emit(data: unknown, prettyText?: () => string): void {
  if (pretty) {
    const text = prettyText ? prettyText() : JSON.stringify(data, null, 2)
    process.stdout.write(`${text}\n`)
    return
  }
  process.stdout.write(`${JSON.stringify(data, null, 2)}\n`)
}

/** Report a failure and exit non-zero. JSON mode emits `{ "error": ... }` on stderr. */
export function fail(message: string, code = 1): never {
  if (pretty) {
    process.stderr.write(`Error: ${message}\n`)
  } else {
    process.stderr.write(`${JSON.stringify({ error: message })}\n`)
  }
  process.exit(code)
}
