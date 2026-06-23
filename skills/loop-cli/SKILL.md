---
name: loop-cli
description: >-
  Use the Loop CLI to create, inspect, update, delete, run, and schedule Loop
  "routines" (a prompt + schedule + working dir + agent + model that runs Claude
  Code or Codex headlessly) from the command line, plus read/write Loop settings,
  manage the background daemon, and discover agent models. Use whenever you need
  to manage Loop routines, runs, or settings without the GUI — e.g. "add a Loop
  routine", "list my routines", "run routine X now", "what does routine Y do",
  "change Loop's default agent", "parse this schedule".
---

# Loop CLI

A headless companion to the Loop macOS app. It reads and writes the **same** data
file the app uses (`~/Library/Application Support/loop/loop-data.json`), so changes
made here appear live in the running app and fire on schedule via the daemon.

## Invocation

Build once, then call the bundled entry with Node:

```bash
npm run build                 # produces out/main/cli.js (skip if already built)
node out/main/cli.js <group> <command> [options]
```

If the package is linked (`npm link`), the `loop` bin works too: `loop <group> <command>`.
Examples below use `loop` as shorthand for `node out/main/cli.js`.

**Output is JSON by default** (one JSON document on stdout) — parse it. Add `--pretty`
anywhere for human-readable text instead. On error the process exits non-zero and writes
`{"error":"..."}` to **stderr** (or `Error: ...` with `--pretty`). Exit code `2` means
"not found" (unknown routine/run id); `1` means a usage/validation error.

Run `loop --help` or `loop <group> --help` for inline usage.

## Routines

```bash
loop routines list [--enabled | --disabled] [--agent claude|codex]
loop routines get <id>
loop routines create --name <s> --dir <path> --agent claude|codex --model <s> \
     --schedule "<natural language>" \
     (--prompt <s> | --prompt-file <path> | --prompt -)   # `-` reads stdin \
     [--enabled true|false]                               # default true \
     [--permission-mode bypass|acceptEdits|default] \
     [--grace <minutes>]                                  # missed-run grace
loop routines update <id> [--name] [--prompt|--prompt-file] [--dir] [--agent] \
     [--model] [--schedule] [--enabled true|false] [--permission-mode] [--grace]
loop routines delete <id>
loop routines toggle <id>          # flip enabled
loop routines enable <id>
loop routines disable <id>
loop routines run <id> [--no-wait] # manual "Run now"
```

`create` and `get`/`update` print the full `Routine` object:

```json
{
  "id": "rt-ab12cd34",
  "name": "Nightly deps",
  "prompt": "Update deps and open a PR",
  "dir": "~/proj",
  "agent": "claude",
  "model": "sonnet",
  "enabled": true,
  "schedule": { "freq": "daily", "time": "22:00", "days": [], "everyHours": 0 },
  "permissionMode": "bypass",
  "missedRunGraceMinutes": 120
}
```

`permissionMode` / `missedRunGraceMinutes` are optional; when omitted the routine inherits
the matching Settings default. `dir` may start with `~` (expanded at run time).

### Running a routine

`loop routines run <id>` triggers an immediate run and, by default, **blocks until the agent
finishes**, then prints the final `Run`. Pass `--no-wait` to start it and return immediately
with the `running` row. Running actually executes `claude -p` / `codex exec`, so the agent
CLI must be installed and on `PATH`.

## Runs

```bash
loop runs list [--routine <id>] [--status running|success|failed|skipped] [--limit <n>]
loop runs get <id> [--transcript]
```

Runs are returned newest-first. `list` and `get` omit the (potentially large) `transcript`
array unless `get --transcript` is given. A `Run` includes `status`, `durationSec`, `costUsd`,
`tokens`, `summary`, `changes` (edits/commits/PRs), and `trigger` (`manual`|`scheduled`).

## Settings

```bash
loop settings get
loop settings set [--default-agent claude|codex] [--daemon-enabled true|false] \
     [--paused-all true|false] [--default-permission-mode bypass|acceptEdits|default] \
     [--default-missed-run-grace-minutes <n>] [--run-timeout-minutes <n>] \
     [--notify-on-complete true|false]
```

`set` requires at least one flag and prints the full updated `Settings`.

## Tweaks (UI preferences)

```bash
loop tweaks get
loop tweaks set [--accent <#hex>] [--layout rows|cards|table] \
     [--density compact|comfortable] [--group-by project|status|schedule|none] \
     [--sort-by name|nextRun|lastRun]
```

## Schedule parsing

```bash
loop schedule parse "<natural language>"
```

Resolves natural language to a `Schedule` object plus a description and the next occurrence —
useful to preview before passing the same string to `routines create --schedule`.

```json
{
  "input": "every weekday at 9am",
  "schedule": { "freq": "weekdays", "time": "09:00", "days": [], "everyHours": 0 },
  "description": "Weekdays at 9 AM",
  "nextRun": "2026-06-22T08:00:00.000Z"
}
```

Recognised phrases include: `every hour`, `every N hours`, `every day at 9am`,
`weekdays at 5pm`, `monday and friday at 3pm`, `every morning`, `every evening`.

## Agent models

```bash
loop agents models claude|codex
```

Lists the models the installed agent CLI offers (`source: "agent"`), or a bundled fallback
catalog (`source: "bundled"`, with an `error` note) when discovery isn't possible. Claude
always returns the bundled catalog (it has no headless model-list command).

## Daemon (launchd background scheduler)

```bash
loop daemon status
loop daemon install [--electron-path <p>] [--daemon-script <p>]
loop daemon uninstall
```

The daemon fires scheduled routines while the Loop app is **quit**. `status` is read-only.
`install`/`uninstall` modify the real per-user launchd agent (`com.loop.routines.daemon`) —
the app normally manages this, so only touch it when you intend to. By default `install`
resolves the daemon script next to this CLI (`out/main/daemon.js`) and runs it with the
current binary; override with the flags when running outside the app bundle.

## Tips for agents

- Prefer `--prompt-file` or `--prompt -` (stdin) for multi-line prompts; literal values that
  begin with `-` must use the `--key=value` form (e.g. `--prompt="--fix it"`).
- Parse stdout as JSON; check the exit code and read stderr on failure.
- To target a throwaway data file (e.g. dry runs), set `LOOP_DATA_DIR=/some/dir` in the
  environment — the CLI reads/writes `loop-data.json` there instead of the default location.
