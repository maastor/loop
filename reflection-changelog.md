# Reflection changelog

## 2026-06-24 — docs: Are docs and comments accurate, sufficient, and free of staleness? <!-- q:docs -->
**Finding:** `AGENTS.md:108-110` — described the scheduler grace window as a hardcoded "30-min". Stale: `src/core/scheduler.ts:13,17-19` uses a configurable grace (per-routine `missedRunGraceMinutes`, else `Settings.defaultMissedRunGraceMinutes`), default `DEFAULT_GRACE_MIN = 720` min.
**Proposed fix:** reword to describe the configurable grace window with 720-min default; no code change.
**Status:** applied
**Outcome:** AGENTS.md scheduling-model bullet updated.
