# Spec: Dashboard With Main Menu

## Objective

Add a dashboard-first application shell for Smart AI App. The first screen should no longer be the skill runner form. Instead, users should land on a dashboard that summarizes LLM usage, then navigate to the existing skill runner and LLM configuration screens through a left-side main menu.

## Scope

This feature covers:

- Dashboard home page with LLM provider/model usage statistics.
- SQLite persistence for LLM usage counts.
- Left-side navigation panel for Dashboard, Run Skill, and Config.
- Moving the existing run-skill workflow into a Run Skill page.
- Moving the existing LLM provider/API key/fallback configuration UI into a Config page.

This feature does not require multi-user accounts, remote database hosting, billing, cost estimation, or authentication.

## Assumptions

- The app is a local-first single-user tool.
- The HTTP server should bind to localhost by default.
- API keys remain browser-local unless a later feature explicitly adds secure server-side secret storage.
- Usage analytics are operational counters only. They must not become prompt logging, request logging, or secret logging.
- Existing LLM fallback behavior remains the source of truth for which provider/model succeeded.

## User Stories

### US-001: View LLM Usage Dashboard

As a user, I want the first page to show how often each LLM provider and model has been used, so I can understand which models are used most.

Acceptance criteria:

- The app opens to a Dashboard page by default.
- The Dashboard shows usage rows grouped by provider and model.
- Each row includes:
  - provider name
  - LLM model name
  - usage count
  - optional latest-used timestamp if available
- Rows are sorted by usage count from highest to lowest.
- If no usage has been recorded yet, the Dashboard shows a clear empty state.

### US-002: Persist Usage Counts In SQLite

As a user, I want LLM usage counts to persist after restarting the app, so the Dashboard remains useful over time.

Acceptance criteria:

- Usage data is stored in a local SQLite database.
- The database is created automatically if it does not exist.
- Each successful LLM call increments the count for its provider/model pair.
- Failed fallback attempts should be recorded separately only if the implementation explicitly adds a failure metric; they must not increment successful usage count.
- The same provider/model pair should update the existing row instead of creating duplicate rows.
- Usage counts must survive server restart.
- Usage increments are atomic, so simultaneous successful requests cannot overwrite each other.
- Timestamps are stored in UTC ISO-8601 format.

Suggested table:

```sql
CREATE TABLE IF NOT EXISTS llm_usage (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  provider TEXT NOT NULL,
  model TEXT NOT NULL,
  usage_count INTEGER NOT NULL DEFAULT 0,
  last_used_at TEXT,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(provider, model)
);
```

Suggested upsert:

```sql
INSERT INTO llm_usage (provider, model, usage_count, last_used_at, updated_at)
VALUES (?, ?, 1, ?, ?)
ON CONFLICT(provider, model) DO UPDATE SET
  usage_count = usage_count + 1,
  last_used_at = excluded.last_used_at,
  updated_at = excluded.updated_at;
```

Suggested query:

```sql
SELECT provider, model, usage_count, last_used_at
FROM llm_usage
ORDER BY usage_count DESC, provider ASC, model ASC;
```

### US-003: Navigate With Left-Side Main Menu

As a user, I want a persistent menu on the left side, so I can switch between Dashboard, Run Skill, and Config without hunting for controls.

Acceptance criteria:

- A left-side panel is visible on desktop layouts.
- The menu contains at minimum:
  - Dashboard
  - Run Skill
  - Config
- The active menu item is visually clear.
- On mobile/narrow screens, the menu must remain usable without overlapping content.
- Switching menu items should not lose already-entered form data unless the user resets or reloads.

### US-004: Move Run Skill Into A Subpage

As a user, I want the existing skill runner to live under a Run Skill menu item, so the dashboard can become the home page.

Acceptance criteria:

- The current skill selection, dynamic form rendering, upload handling, run button, reset button, sample button, output tabs, copy, download JSON, and LLM status behavior remain available.
- The Run Skill page is reachable from the left-side menu.
- The existing run-skill API behavior remains compatible with current skills.
- Existing image model guidance under the Prompt output remains visible on the Run Skill page.
- Existing top and bottom Run Skill action buttons remain available unless replaced by an equivalent fixed/sticky action pattern.

### US-005: Move LLM Config Into A Config Page

As a user, I want LLM provider settings to have their own Config page, so API keys and fallback settings are easier to find.

Acceptance criteria:

- The existing modal-based Config UI is converted into a page accessible from the left-side menu.
- The Config page supports provider API key setup for each supported provider.
- The Config page supports provider base URL setup.
- The Config page supports choosing default LLM models and fallback order.
- The Config page keeps the current Test LLM behavior or equivalent.
- The Config page preserves existing local browser storage behavior unless a separate secure storage implementation is explicitly added.
- The Config page clearly indicates which models support image input.

## Functional Requirements

### Dashboard Data Collection

- The server must record a successful LLM usage event after an LLM fallback call succeeds.
- The recorded provider/model should use the final provider/model that actually succeeded, not merely the first configured fallback.
- If the provider response returns a canonical model name, the app may store that canonical model; otherwise it should store the configured model id.
- Usage increments must happen server-side to avoid trusting client-side counters.
- The Dashboard must fetch usage data through an API endpoint.

Suggested endpoint:

```http
GET /api/llm-usage
```

The endpoint must be read-only and must not expose prompts, API keys, request payloads, uploaded image data, or raw provider responses.

Suggested response:

```json
{
  "rows": [
    {
      "provider": "openrouter",
      "model": "qwen/qwen3-vl-32b-instruct",
      "usageCount": 12,
      "lastUsedAt": "2026-04-28T10:00:00.000Z"
    }
  ]
}
```

### Navigation And Page Shell

- The app should use one application shell with a left menu and main content area.
- The Dashboard page should be the default selected page on initial load.
- The Run Skill page should contain the existing skill runner interface.
- The Config page should contain provider/API/fallback settings.
- Page state should be managed client-side unless a router is introduced intentionally.

### SQLite Storage

- Use a local SQLite database file in the project/runtime data area.
- The database path must be deterministic and documented.
- Database initialization should run during server startup.
- SQLite errors must return clear server-side errors without crashing the process.
- The implementation should avoid recording API keys or prompts in the usage table.
- SQLite writes must use parameterized statements only.
- Database schema initialization must be idempotent.
- Database migrations must be additive and safe to run more than once.
- The database should use WAL mode if supported by the selected SQLite library to reduce read/write blocking.
- The database file should live outside `public/` so it cannot be served as a static asset.

Recommended local path:

```text
data/smart-ai-app.sqlite
```

The `data/` folder should be created automatically and added to `.gitignore` unless a sample database is intentionally introduced.

### Error Handling

- Dashboard API failures should show a clear in-page error state with a retry action.
- SQLite initialization failure should be reported in server logs and through a safe generic UI message.
- Usage recording failure must not cause an otherwise successful LLM run to be reported as failed. It should be logged server-side and surfaced as a non-blocking warning only if practical.
- Config page test failures should continue to show provider/model-specific errors without leaking API keys.

## UI Requirements

### Dashboard

- Use a compact, scan-friendly dashboard layout.
- Show a table or dense list of provider/model usage.
- Sort by usage count descending.
- Include a clear zero-state message when there is no usage.
- Avoid marketing-style hero content; this is an operational dashboard.

### Left Menu

- The left-side menu should remain visually separate from page content.
- Menu labels should be concise.
- The active page should be indicated with color, background, or border.
- The menu must not cover form fields or output content on small screens.

### Run Skill Page

- Preserve existing output tabs: Prompt, JSON, Review.
- Preserve LLM status messaging.
- Preserve image-input model guidance under Prompt output.
- Preserve top action buttons for convenience.

### Config Page

- Preserve the current provider sections:
  - NVIDIA NIM
  - OpenRouter
- Preserve the fallback order rows.
- Include model labels that identify image-capable models.
- Keep Test LLM results visible in-page.
- Keep Save/Clear controls visible and easy to find.

## Security Requirements

### Data Minimization

- Store only `provider`, `model`, `usage_count`, `last_used_at`, `created_at`, and `updated_at` for usage reporting.
- Do not store prompts, generated outputs, uploaded image data, base64 payloads, API keys, provider request bodies, provider response bodies, client IPs, or browser local storage contents in SQLite.
- Do not log API keys, uploaded images, or full prompts to console/server logs.

### Secret Handling

- API keys entered on the Config page must remain masked by default.
- API keys must not be sent to Dashboard APIs.
- API keys must not be included in exported JSON outputs.
- API keys must not be stored in SQLite.
- If server-side secret storage is added later, it must include encryption at rest and a separate migration/security review.

### API And Input Validation

- `/api/llm-usage` must allow only `GET`.
- Any future usage reset endpoint must require `POST`, a deliberate confirmation value, and rate limiting.
- Provider and model values written to SQLite must be treated as untrusted strings and written only through parameterized SQL.
- Provider and model values displayed in the UI must be escaped as text, never injected as HTML.
- The app must preserve existing rate limits for run-skill and test-LLM endpoints.
- The server should reject unknown methods with `405`.

### Browser And Static Asset Safety

- The SQLite database path must not be under `public/`.
- The UI must not render provider/model names with `innerHTML` unless values are escaped first.
- Navigation state must not allow arbitrary file paths or dynamic script injection.
- If URL hash/query routing is introduced, route names must be allowlisted.

### Local Network Exposure

- The app should bind to `localhost` by default.
- If binding to `0.0.0.0` is introduced later, document the risk and require an explicit environment variable.
- CORS should remain restrictive unless a documented integration requires otherwise.

### Auditability

- Usage count updates should be deterministic and easy to verify through a local SQLite query.
- Server logs may include provider/model ids and usage update errors, but never prompts, images, or keys.

## Non-Functional Requirements

- Existing run-skill behavior must remain backwards compatible.
- The app must run locally with `npm start`.
- SQLite dependency choice must work on the target local environment.
- No external database is required.
- Secrets must not be written to the SQLite usage database.
- UI must remain responsive on desktop and mobile.
- Dashboard should load quickly with at least 1,000 provider/model rows.
- SQLite dependency installation must be documented in `package.json` and lockfile.
- The implementation should avoid adding a large frontend framework unless the existing app is intentionally migrated.

## Testing Requirements

- Unit or integration test for SQLite initialization.
- Test that a successful LLM run increments exactly one provider/model row.
- Test that failed fallback attempts do not increment successful usage count.
- Test that repeated successful calls to the same provider/model increment the same row.
- Test that `/api/llm-usage` returns rows sorted by `usageCount` descending.
- Test that `/api/llm-usage` response does not include API keys, prompts, image data, or generated output.
- Manual responsive check for Dashboard, Run Skill, and Config pages on desktop and mobile widths.
- Manual regression check for existing Run Skill behavior, including image upload and LLM fallback error messaging.

## Implementation Notes

- Current run-skill UI can be moved into a page container rather than rewritten from scratch.
- Existing Config modal logic can be converted into a page container and reused.
- LLM usage should be recorded in the same server path where the successful fallback is known.
- The Dashboard should refresh after successful runs or when the user navigates back to Dashboard.
- Consider adding a small manual refresh button if auto-refresh is not implemented.

## Open Questions

- Should usage statistics include failed attempts in a separate failure table or only successful calls?
- Should there be a Reset Usage button on Dashboard?
- Should usage be shown as all-time only, or include day/week/month filters later?
- Should the SQLite database live in the repo root, a `data/` folder, or an OS-specific app data folder?
- Should the Dashboard include per-provider totals in addition to provider/model rows?
- Should usage counts be exportable as CSV or JSON?
- Should API keys remain browser-local permanently, or should a later secure server-side config store be planned?
