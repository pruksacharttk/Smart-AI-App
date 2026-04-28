# Self-Review Round 1: Dashboard With Main Menu Plan

## Scorecard

| Category | Status | Notes |
|---|---|---|
| Structural Integrity | PASS | Plan is staged by backend, shell, dashboard, Run Skill, Config, security, tests. |
| Completeness vs Spec | PASS | Covers dashboard, SQLite, successful-only counts, left menu, Run Skill relocation, Config page, security, tests. |
| Implementability | PASS WITH FIXES | Plan needs a few more concrete notes on module exports, test isolation, and no live LLM calls in tests. |
| Internal Consistency | PASS | Decisions match interview: no reset, successful-only, `data/smart-ai-app.sqlite`, Config page. |
| Edge Cases | PASS WITH FIXES | Needs explicit stale dashboard behavior and DB path override for tests. |

## Findings

### Finding 1: Test DB Isolation Needs To Be Explicit

The plan recommends tests but does not state how tests avoid writing to production `data/smart-ai-app.sqlite`. Add a requirement that `createUsageStore()` accepts a test database path or in-memory path.

### Finding 2: No Live LLM Calls In Tests

The plan implies API testing but should explicitly forbid live provider calls in automated tests.

### Finding 3: Dashboard Refresh Staleness

The plan says refresh after successful run, but page switch behavior should be deterministic. Add a dirty/stale flag so Dashboard refreshes when navigated to after a successful run.

### Finding 4: Frontend Config Migration Risk

The plan should explicitly preserve `data-i18n` updates for Config page buttons and labels because current language switching relies on that mechanism.

## Fixes Applied To Plan

- Added test database path option.
- Added no-live-LLM testing constraint.
- Added dashboard stale flag behavior.
- Added language/i18n preservation note for Config page.
