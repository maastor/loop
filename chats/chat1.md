# Claude Code Routine Manager

_Started 2026-06-12 10:13 UTC_

---

## User

This should be a Mac OS application for managing Routines for Claude code. 
Should be Electron Mac OS APP.
Functions:
- Create scheduled routines with prompts
- Manage Routines
- See Calendar of runned routines
- Keep history

Take inpiration from Claude Code Routines window

## Assistant

## Assistant

_[tool: list_files]_

_[tool: list_files]_

_[tool: list_files]_

_[tool: read_file]_

_[tool: questions_v2]_

## User

Questions answered:
- visual_direction: Claude Code aesthetic — dark, terminal-inspired, warm orange accent
- theme: Dark only
- fidelity: Hi-fi clickable prototype — navigate all screens, create/edit routines actually works
- screens: Routines list (manage, enable/disable), Create/edit routine (prompt, schedule, working dir, model), Calendar of runs (month/week view), Run history with logs/transcripts, Routine detail (next run, last results), Menu bar / quick status
- schedule_model: Both — natural language with structured fallback
- run_detail: Status (success / failed / running), Full transcript of the Claude session, Summary of what changed (files, commits), Duration + cost/tokens
- window_style: 0
- variations: 2–3 variations of the main screen
- tweaks: Decide for me

## Assistant

_[tool: update_todos]_

_[tool: copy_starter_component]_

_[tool: copy_starter_component]_

Building the prototype now: dark terminal-style macOS app, sidebar layout, working create/edit with persistence, and main-screen variations + accent color exposed as Tweaks.

_[tool: read_file]_

_[tool: write_file]_

_[tool: write_file]_

_[tool: write_file]_

_[tool: write_file]_

_[tool: write_file]_

_[tool: write_file]_

_[tool: write_file]_

_[tool: write_file]_

_[tool: write_file]_

Now the main HTML with the full stylesheet:

_[tool: write_file]_

_[tool: show_html]_

_[tool: show_html]_

_[tool: str_replace_edit]_

_[tool: done]_

_[tool: fork_verifier_agent]_

The Routines app is up — a dark, terminal-styled macOS window with a working prototype behind it:

- **Routines** — list with enable/pause toggles, run sparklines, last/next run; click into a detail view with prompt, stats, recent runs, and delete
- **New/edit routine** — sheet with name, ❯ prompt, natural-language schedule ("every weekday at 9am") that parses live, with a structured fallback, working dir, and model picker. Creates persist across reloads
- **Calendar** — month/week views with status dots per day and a day panel
- **History** — runs grouped by day, filterable; each run opens a full transcript with tool calls, changes (PRs, commits, files), duration/cost/tokens
- **Menu bar** — click the ✱ status item top-right for the quick-status dropdown (running now, next up, recent, pause all)
- **Tweaks** (toolbar toggle) — switch the main screen between the 3 layout variants (rows/cards/table), density, and accent color

Try "Run now" on any routine — it goes live for ~6s, then lands in history. A verifier is double-checking in the background; tell me which list layout you prefer and I'll make it the default.

## User

Found issues — fixing…

## Assistant

_[tool: str_replace_edit]_

_[tool: done]_

_[tool: fork_verifier_agent]_

Fixed both: the editor sheet no longer animates opacity (it was rendering invisible in some contexts — now it only slides in), and week-view chips drop the routine name on narrow windows so the time stays legible. Verifier is re-checking the editor sheet now.

## User

No issues found

## Assistant

Verified — the editor sheet opens fully visible and the week view reads cleanly. The app is ready to explore. Want any changes — default layout (rows/cards/table), more sample routines, or extra screens like settings/notifications?

