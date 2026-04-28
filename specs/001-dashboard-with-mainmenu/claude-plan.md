# Implementation Plan: Dashboard With Main Menu

## Overview

This plan converts Smart AI App from a single skill-runner screen into a dashboard-first local app shell. The final app has three pages inside one frontend:

- Dashboard: default page, showing successful LLM usage counts by provider/model.
- Run Skill: the current skill runner, moved into a page container.
- Config: the current LLM provider/API key/fallback setup, moved from modal into a page container.

The backend adds a small SQLite-backed usage store and a read-only dashboard API. Usage increments only after an LLM fallback succeeds. Failed attempts are not counted in v1.

The implementation should be incremental and conservative. The existing app is a single Node server plus a single HTML file, so the plan keeps that shape and avoids a framework migration.

## Key Decisions

- Use `better-sqlite3` for SQLite because the project supports Node `>=20`, while built-in `node:sqlite` starts in newer Node versions.
- Store SQLite data at `data/smart-ai-app.sqlite`.
- Add `data/` to `.gitignore`.
- Store only successful LLM usage counts.
- Do not add a Reset Usage button or reset API in v1.
- Keep API keys in browser localStorage using the existing `llmConfig` key.
- Convert Config to a page. The existing topbar Config button becomes a shortcut to that page.

## Target File Changes

Expected files:

```text
package.json
package-lock.json
.gitignore
server.js
public/index.html
src/usage-store.js
test/usage-store.test.js
test/llm-usage-api.test.js
```

If the implementer prefers not to introduce `src/`, `usage-store.js` may live at repo root. The important constraint is that SQLite logic is isolated from `server.js` enough to test directly.

## Phase 1: SQLite Usage Store

### Goal

Create a focused module that owns usage persistence. `server.js` should not contain raw SQLite setup and SQL details.

### Dependency

Add `better-sqlite3` as a runtime dependency. Update `package-lock.json`.

### Data Directory

Add `data/` to `.gitignore`.

The store module should:

- Resolve the database path as `data/smart-ai-app.sqlite` by default.
- Accept an explicit database path for tests so automated tests never write to the real local app database.
- Create `data/` automatically.
- Open the database once.
- Initialize schema idempotently.
- Enable WAL mode when supported.
- Expose a small API for recording and listing usage.

Suggested module surface:

```text
createUsageStore(options)
  - init()
  - recordSuccess(provider, model, usedAt)
  - listUsage()
  - close()
```

### Schema

Use a single table named `llm_usage`.

Fields:

- `id`
- `provider`
- `model`
- `usage_count`
- `last_used_at`
- `created_at`
- `updated_at`

Add a unique constraint on `(provider, model)`.

### Write Behavior

`recordSuccess(provider, model, usedAt)`:

- Treats provider/model as untrusted strings.
- Uses prepared statements.
- Inserts count 1 for new rows.
- Atomically increments count for existing rows.
- Updates `last_used_at` and `updated_at`.
- Uses UTC ISO-8601 timestamps.

### Read Behavior

`listUsage()` returns rows sorted:

1. `usage_count` descending
2. provider ascending
3. model ascending

Return camelCase fields to API callers:

- `provider`
- `model`
- `usageCount`
- `lastUsedAt`

## Phase 2: Backend Integration

### Goal

Expose usage data through an API and increment counts when LLM calls succeed.

### Server Initialization

Initialize the usage store when `server.js` starts.

If initialization fails:

- Log a safe server-side error.
- Continue serving the app if possible.
- Dashboard API returns a clear safe error state.
- Do not log secrets, prompts, uploaded image data, or raw provider payloads.

### Record Successful LLM Usage

The best insertion point is inside `runLlmSkill()` after `postChatCompletion()` succeeds and before returning the result.

Use:

- `result.llm.provider` or `target.provider`
- `result.llm.model` or `target.model`

If usage recording fails:

- Catch the error.
- Log provider/model plus safe error message.
- Return the successful LLM result unchanged.
- Optionally add a non-blocking warning to the result only if it does not confuse existing UI behavior.

### Dashboard API

Add:

```text
GET /api/llm-usage
```

Response:

```text
{ rows: UsageRow[] }
```

Constraints:

- Allow only GET.
- Do not include prompt/output/image/API key data.
- Use existing `sendJson()`.
- Do not put the endpoint after static fallback in a way that makes it unreachable.
- Keep unknown methods returning `405`.

### Server Testability

To test the API without making real LLM calls, isolate handler logic or support dependency injection for the usage store. Avoid test designs that require live provider keys.

## Phase 3: Frontend App Shell

### Goal

Create a persistent shell with left navigation and page containers while preserving existing Run Skill state.

### Layout

Introduce a shell structure:

- left menu / side panel
- main content area
- page containers:
  - Dashboard
  - Run Skill
  - Config

The left menu should be visible on desktop. On mobile, it can become a top horizontal nav or a stacked menu, as long as it does not overlap content.

### Navigation State

Use a small client-side page state variable, such as:

```text
activePage = "dashboard" | "run" | "config"
```

If hash routing is used, only allow known page ids. Unknown route values fall back to Dashboard.

### Topbar Changes

The existing topbar skill selector currently assumes the Run Skill page is primary. Keep it usable, but avoid making Dashboard feel like a skill form.

Recommended approach:

- Keep global language toggle and status in the topbar.
- Move skill selector into the Run Skill page or only show it when Run Skill is active.
- Make the Config button navigate to the Config page.

### State Preservation

Do not destroy Run Skill DOM on page switch. Hide inactive page containers with CSS classes. This preserves:

- current form field values
- uploaded image previews
- output tabs
- current result bundle
- config form state before save

## Phase 4: Dashboard Page

### Goal

Implement the default Dashboard page using `/api/llm-usage`.

### Data Flow

Create frontend functions:

```text
loadUsageDashboard()
renderUsageDashboard(rows)
renderUsageDashboardError(error)
renderUsageDashboardEmpty()
```

Fetch usage when:

- the app initializes
- user navigates to Dashboard
- a successful Run Skill completes

Optionally include a Refresh button.

Use a simple stale flag such as `usageDashboardStale`. A successful Run Skill should mark Dashboard data stale. If the user is already on Dashboard, refresh immediately; otherwise refresh the next time Dashboard becomes active.

### Rendering

Render rows using DOM creation and `textContent`. Do not insert provider/model strings through raw `innerHTML`.

Dashboard should show:

- total successful LLM calls
- number of distinct provider/model rows
- table/list sorted by API response order
- empty state when rows are empty

Suggested columns:

- Rank
- Provider
- Model
- Usage count
- Last used

### Error State

If `/api/llm-usage` fails:

- show a clear message
- include a retry action
- do not expose stack traces or internal filesystem paths in UI

## Phase 5: Run Skill Page Refactor

### Goal

Move the existing skill runner UI into the Run Skill page without changing behavior.

### Preserve Existing Behavior

Keep:

- dynamic schema form rendering
- image upload field detection
- `buildPayload()`
- `postJsonStream()`
- output extraction/cleanup
- output tabs
- top and bottom action buttons
- LLM status updates
- copy/download actions
- image model guidance under Prompt output

### After Successful Run

After `runSkill()` receives a successful result:

- render output as before
- refresh dashboard data in memory or mark it stale
- if active page is Dashboard later, show updated data

Do not navigate away from Run Skill after a run.

## Phase 6: Config Page Refactor

### Goal

Move Config modal contents into a first-class Config page.

### Preserve Existing Behavior

Keep:

- NVIDIA NIM provider card
- OpenRouter provider card
- API key masking and Show/Hide buttons
- base URL inputs
- fallback model rows
- custom model fields
- Save Config
- Clear Config
- Test LLM
- test result rows
- model labels that indicate image support
- language switching through existing `data-i18n` patterns and explicit render functions

### Remove Modal Dependency

The normal flow should not require opening a modal. Functions that previously handled modal open/close should be simplified:

- `openConfig()` becomes navigation to Config page.
- `closeConfig()` is removed or becomes navigation back to previous/default page only if still needed.
- Config rendering happens when page is shown and when language changes.

Avoid duplicating Config DOM in both a page and a modal.

### LocalStorage Compatibility

Keep:

```text
localStorage["llmConfig"]
```

Existing users should not lose saved provider keys or fallback settings.

## Phase 7: Security Hardening

### Data Minimization

Verify only provider/model/count/timestamps enter SQLite.

### Secret Handling

Ensure:

- API keys are not sent to `/api/llm-usage`.
- API keys are not included in Dashboard rendering.
- API keys are not included in downloaded JSON output unless existing output already contains them, which it should not.
- API keys are not logged by usage store or dashboard API.

### HTML Safety

Dashboard table rows must use `textContent` or escaping. Avoid raw `innerHTML` for provider/model values.

### SQL Safety

All SQL writes and reads use prepared statements. Do not build SQL with string interpolation.

### Static File Safety

Ensure `data/` is outside `public/`. Existing static serving path checks remain unchanged.

## Phase 8: Tests And Verification

### Automated Tests

Add `npm test`.

Use Node's built-in test runner unless implementation has a stronger reason to choose another tool.

Recommended tests:

- usage store initializes schema.
- usage store inserts first successful usage.
- usage store increments existing provider/model row.
- usage store sorts rows by usage count descending.
- usage API returns `{ rows: [] }` when empty.
- usage API response excludes sensitive fields.
- usage recording failure does not throw through `runLlmSkill()` success path. This may be tested at helper level if direct `runLlmSkill()` testing is hard.

Automated tests must not call live LLM providers and must not require real API keys. Use direct store tests and mocked/stubbed usage-store dependencies for API behavior.

### Manual Verification

Run:

- `npm test`
- `node --check server.js`
- inline script syntax check for `public/index.html`
- `npm start`

Manual browser checks:

- Dashboard empty state appears on first run.
- Config page saves and tests providers.
- Run Skill page still loads forms and can run a skill.
- Successful LLM run increments dashboard count.
- Switching pages preserves form data.
- Mobile width does not overlap nav/content.

## Rollout Order

Implement in this order:

1. Add SQLite dependency, `.gitignore`, and usage store tests.
2. Add usage store module.
3. Add `/api/llm-usage` and backend usage recording.
4. Add frontend Dashboard rendering against the API.
5. Add app shell and navigation.
6. Move existing Run Skill DOM into its page container.
7. Move Config modal content into Config page.
8. Run full automated and manual verification.

This order keeps backend data correctness testable before the larger frontend refactor.
