# AGENTS.md

This file is the source of truth for AI agents and contributors working in this repo.
`CLAUDE.md` is a symlink to this file so Claude Code reads the same guidance.

## What this is

**Loop** is a macOS Electron app: a manager for "routines" -- a prompt + schedule +
working directory + model that runs **Claude Code headless (`claude -p`)** on a
recurring basis, with a calendar, run history, and full transcripts (status / duration /
cost / tokens). Stack: electron-vite + React 18 + TypeScript + zustand. Uses **npm**
(not pnpm/yarn).

## Commands

```bash
npm run dev          # electron-vite dev (HMR). Needs the Electron binary (see gotcha below).
npm run build        # electron-vite build -> out/ (main, preload, renderer, daemon). No binary needed.
npm run start        # electron-vite preview (runs the built app)
npm run typecheck    # tsc on both projects (node + web). CI gate; run before committing.
npm run lint         # oxlint
npm run format       # oxfmt --write .
npm run test         # vitest run
npm run dist:mac     # build + electron-builder -> unsigned .dmg in dist/ (arm64 + x64)
npm run pack         # build + electron-builder --dir (unpacked .app, faster)
```

Run a **single test**: `npx vitest run tests/scheduler-fire.test.ts` or filter by name
`npx vitest run -t "fires a daily routine"`.

## Critical environment gotchas

- **Electron binary download is firewalled here.** `npm install` runs Electron's
  postinstall, which fetches the binary from GitHub's release-asset CDN -- blocked by
  the corp proxy (`localhost:3827`). Install with
  `ELECTRON_SKIP_BINARY_DOWNLOAD=1 npm install`, then obtain
  `electron-v<ver>-darwin-arm64.zip` out-of-band, unzip into
  `node_modules/electron/dist/`, and write `node_modules/electron/path.txt` =
  `Electron.app/Contents/MacOS/Electron`. `npm ci` wipes `node_modules` -> re-extract
  afterward. Build/test/typecheck do **not** need the binary; only `dev`/`preview`
  (the GUI) do.
- **The harness sandbox cannot run the GUI or `claude`.** `screencapture`/`ps` are
  blocked, the Electron app fails its sandbox init, and `claude -p` fails with
  `sandbox-exec: Operation not permitted` (nested sandbox). Verify GUI / real-run
  behavior by asking the user to run it in a normal terminal, or test the underlying
  code headlessly.
- **`package-lock.json` must reference the public registry.** Generating it behind
  Apple's internal registry writes `npm.apple.com` / `artifacts.apple.com` `resolved`
  URLs, which are unreachable from GitHub runners -> CI `npm ci` installs nothing ->
  build fails (exit 127). Keep `resolved` hosts as `registry.npmjs.org` (integrity
  hashes are content-based and unchanged; local installs still resolve via npm
  host-replacement).

## Architecture

Four entry points, built by electron-vite (`electron.vite.config.ts`). Path aliases:
`@shared`, `@core`, `@renderer`.

```text
src/shared/   Pure TS, no node/electron. The single source of truth for data + logic.
              types.ts (Routine/Run/Schedule/Tweaks/Settings/AppData), schedule.ts
              (freq engine + natural-language parser, ported from project/app/data.js),
              format.ts, seed.ts (first-run routines), ipc.ts (IPC channel constants).
src/core/     Node-only, shared by BOTH the main process and the daemon:
              persistence.ts (Store), claude-runner.ts (real execution), scheduler.ts (tick).
src/main/     Electron main process: index.ts (lifecycle), window.ts, ipc.ts (handlers +
              broadcast), tray.ts (menu-bar item), launchd.ts (background daemon install).
src/preload/  contextBridge -> window.api (typed in api-types.ts). The only
              renderer<->main surface.
src/daemon/   Standalone Node process launched by launchd so routines fire when the app is
              QUIT. Reuses @core Store + Scheduler.
src/renderer/ React UI. store.ts (zustand, mirrors main over IPC), App.tsx (shell +
              routing), views.ts (View/Nav/ScreenProps contract), components.tsx,
              screens/*, MenuBar, TweaksPanel.
```

### Data flow and persistence

- All state lives in **one atomic JSON file** at
  `~/Library/Application Support/loop/loop-data.json` (`core/persistence.ts`, `Store`),
  with rotating backups. The path is hardcoded (not `app.getPath`) so the daemon and
  the app resolve the _same_ file.
- The main process owns the authoritative `Store`. The renderer holds a zustand mirror:
  it loads via IPC and re-syncs on a `data:changed` push that main broadcasts after
  every mutation (and on a `fs.watch` of the data file, so daemon-written changes reach
  the UI live).
- Because main **and** daemon may both write, every `Store` mutation does
  **reload-from-disk -> mutate -> atomic write** (`mtime`-based `reloadIfStale`) to
  avoid clobbering.
- Screens read from `useStore` directly and mutate via store actions; they receive only
  `{ nav, now, openEditor }` (`ScreenProps`). Adding a screen = add a `View` variant +
  a case in `App.tsx`.

### Execution

`runClaude` (`core/claude-runner.ts`) spawns the real CLI:
`claude -p <prompt> --output-format stream-json --verbose --model <id>` with `cwd` =
the routine's dir (`~` expanded). It parses the NDJSON event stream into transcript
entries (assistant text / tool_use / tool_result) and a final `result` event -> summary +
cost + tokens + duration, deriving "changes" (edits/commits/PRs) from tool usage.
`resolveClaudeCommand()` probes common install paths and augments `PATH` because GUI and
daemon processes start with a sparse environment.

### Scheduling model

Most subtle bugs live here:

- `Scheduler` (`core/scheduler.ts`) is a `setInterval` tick (60s). Each tick fires every
  enabled routine whose **latest schedule occurrence at-or-before now** is within a
  30-min grace window and not already satisfied (deduped by `Run.scheduledFor` ISO
  string).
- **The in-app scheduler runs whenever the app is open**, regardless of the daemon. The
  launchd daemon covers the fully-quit case. Both share the data file; the
  `scheduledFor` dedup prevents double-runs across processes.
- A run stuck in `status: 'running'` (from a crashed/quit process) must NOT block
  scheduling: the running-guard ignores runs older than `STALE_RUN_MS` (2h), and
  `Store.reconcileStaleRuns()` is called at app + daemon startup to fail them. Manual
  "Run now" bypasses scheduling entirely (always works) -- keep this asymmetry in mind
  when debugging "scheduled never fires but manual does".

### IPC pattern

The renderer talks to the main process **only** through `window.api` (preload bridge).
To add capability: channel constant in `shared/ipc.ts` -> handler in `main/ipc.ts`
(`ipcMain.handle`, call `broadcast()` after mutations) -> preload binding in
`preload/index.ts` -> typed method in `preload/api-types.ts` (`window.api.*`).
Renderer calls `window.api.<ns>.<method>()`.

## Coding standards

### Code comments

When code is driven by a non-obvious constraint (a safety rule, a compatibility shim, a
design-doc decision), add a one- or two-line comment explaining **why**. Don't restate
what the code does.

### Lint and format

Run `npm run lint` (oxlint) and `npm run format` (oxfmt) before committing;
`npm run typecheck` is the CI gate. Never add a `max-lines` disable -- split the file or
extract a focused module instead. Fix lint findings rather than suppressing them; the
only sanctioned rule-off is global `Window` augmentation needing `interface` (already
scoped in `.oxlintrc.json`).

`oxfmt` uses single quotes, no semicolons, and 100 cols (`.oxfmtrc.json`).

### File and module naming

Name files after what they concretely contain (`claude-runner.ts`, `scheduler.ts`), never
vague buckets like `utils`, `helpers`, `common`, or `misc`. If you're reaching for
`helpers`, the file probably has more than one responsibility.

### Types

- Prefer `type` over `interface` (enforced) except where declaration merging is required.
- Project-owned types belong in `.ts`, not `.d.ts` -- `skipLibCheck` makes unresolved refs
  in `.d.ts` silently become `any`.
- No `any` in `src/` (tests may stub). Validate/narrow `unknown` instead of casting
  through it.
- `shared/` must stay pure: no `node`/`electron` imports there, since it's consumed by the
  renderer too.

### Core and persistence

- All persisted state goes through the `core/persistence.ts` `Store` (atomic JSON). Don't
  read/write the data file directly.
- `core/` is shared by the app **and** the standalone daemon -- keep it free of Electron
  and renderer assumptions.
- Scheduling: manual "Run now" bypasses the scheduler; scheduled runs go through
  `Scheduler.shouldFire`. When touching scheduling, preserve the `scheduledFor` dedup and
  the stale-running guard.

### UI

- The UI is a faithful port of the original design prototype, which lives on the
  **`design-archive`** branch (`project/Claude Routines.html` + `project/app/*.jsx`), not
  on `main`.
- `src/renderer/src/theme.css` is that design's CSS ported verbatim -- reuse its classes;
  don't restyle.

## Platform

Loop targets **macOS only**. Use Node/Electron path utilities (`path.join`, never
hardcoded separators), and keep secrets/signing config out of the repo.

## Builds and releases

- DMGs are **unsigned / ad-hoc signed** (no Apple cert in CI). Do not set
  `mac.identity: null` -- that disables ad-hoc signing and makes arm64 launch as
  "damaged". Downloaded builds need `xattr -dr com.apple.quarantine` or right-click ->
  Open. See `BUILD.md`.
- Releases are cut by pushing a `vX.Y.Z` tag (see `BUILD.md`), not by hand-editing
  release assets. Bump `version` in **both** `package.json` and `package-lock.json`
  (root) or `npm ci` fails in CI.

## Git

- Conventional-commit style messages (`feat:`, `fix:`, `chore:`, `docs:`, `ci:`).
- Don't commit build output (`out/`, `dist/`), `.DS_Store`, or screenshots -- attach
  evidence to the PR instead.
