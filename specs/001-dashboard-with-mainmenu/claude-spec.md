# Synthesized Spec: Dashboard With Main Menu

## Summary

Smart AI App will become a dashboard-first local application. The current single-screen skill runner remains available, but it moves under a `Run Skill` page in a left-side navigation shell. The new default page is `Dashboard`, which shows successful LLM usage counts grouped by provider and model. LLM provider/API key/fallback configuration moves from a modal into a full `Config` page.

The feature is local-first, single-user, and intentionally does not add authentication, billing, remote persistence, or server-side API key storage.

## Product Decisions

- Dashboard is the default landing page.
- Usage counts include only successful LLM calls.
- Failed fallback attempts are not counted and no failed-attempt table is created in v1.
- No Reset Usage button is included in v1.
- SQLite database path is `data/smart-ai-app.sqlite`.
- `data/` is added to `.gitignore`.
- Config becomes a full page. The existing topbar Config button becomes a shortcut to that page.
- API keys remain stored in browser localStorage using the existing `llmConfig` format.

## Current System Context

The existing app is a local Node.js application:

- `server.js` handles the HTTP server, static asset serving, skill discovery, schema delivery, Python runtime dispatch, and LLM gateway.
- `public/index.html` is a single-file frontend with all CSS, HTML, and client JavaScript.
- `skills/` contains schema-driven local skills.
- Current LLM fallback success is known in `runLlmSkill()` after `postChatCompletion()` returns.
- There is no existing automated test script.

## Functional Requirements

### Dashboard

- The app opens to Dashboard by default.
- Dashboard shows a table or dense list of successful usage rows grouped by provider/model.
- Each row includes:
  - provider
  - model
  - usage count
  - latest used timestamp
- Rows sort by usage count descending, then provider/model ascending for stable ordering.
- Empty state is shown when there is no usage data.
- Dashboard fetches data from `GET /api/llm-usage`.
- Dashboard must not display or fetch prompts, outputs, uploaded images, API keys, or raw provider payloads.

### Usage Persistence

- Usage is stored in local SQLite at `data/smart-ai-app.sqlite`.
- The server creates `data/` and the database automatically if missing.
- The schema is initialized idempotently at server startup.
- A successful LLM call increments exactly one provider/model row.
- Failed fallbacks do not increment usage.
- Usage recording failure does not turn a successful LLM run into a failed run.
- Timestamps are UTC ISO-8601 strings.
- Writes use parameterized SQL.

### API

- Add `GET /api/llm-usage`.
- Response shape:

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

- Endpoint is read-only.
- Unknown methods still return `405`.
- The endpoint must not expose secrets or request content.

### App Shell And Navigation

- Add an application shell with a left-side main menu and main content area.
- Menu items:
  - Dashboard
  - Run Skill
  - Config
- Active menu item is visually clear.
- Mobile layout remains usable and must not overlap content.
- Switching pages preserves already-entered Run Skill form data and current Config state.
- Page state can remain client-side in the existing single HTML file.

### Run Skill Page

- Existing skill runner behavior remains available under `Run Skill`.
- Preserve:
  - skill select
  - dynamic form rendering
  - image upload handling
  - top and bottom Run Skill buttons
  - Reset and sample buttons
  - output tabs: Prompt, JSON, Review
  - LLM status messages
  - image model guidance below Prompt output
  - copy and download JSON actions
- Existing `/api/run-skill` and `/api/run-skill-stream` payload compatibility remains.

### Config Page

- Config moves from modal to a full page.
- Preserve provider sections:
  - NVIDIA NIM
  - OpenRouter
- Preserve:
  - API key inputs, masked by default
  - base URL inputs
  - fallback order rows
  - model dropdowns
  - custom model inputs
  - Save Config, Clear, and Test LLM behavior
  - Test LLM result rendering
- The topbar Config button navigates to Config page.
- Existing localStorage key `llmConfig` remains unchanged.
- Model labels continue indicating whether a model supports uploaded images.

## Data Model

Use a local SQLite table:

```text
llm_usage
- id: integer primary key
- provider: text, required
- model: text, required
- usage_count: integer, required, default 0
- last_used_at: text, nullable UTC ISO-8601 timestamp
- created_at: text, required
- updated_at: text, required
- unique(provider, model)
```

The implementation should use an atomic upsert:

- Insert a new provider/model with count 1.
- On conflict, increment `usage_count` and update `last_used_at`/`updated_at`.

## Security Requirements

- Store only operational counters in SQLite.
- Never store API keys, prompts, generated outputs, uploaded images, base64 payloads, raw provider request bodies, raw provider responses, client IPs, or localStorage contents.
- Database file must not be under `public/`.
- Add `data/` to `.gitignore`.
- Dashboard rendering must use `textContent` or equivalent escaping for provider/model values.
- SQL must use prepared/parameterized statements.
- API keys remain masked by default.
- API keys are not sent to Dashboard APIs.
- API keys are not included in exported JSON.
- No destructive usage reset endpoint is implemented in v1.
- If routing uses hashes or query strings, route names are allowlisted.
- Server remains local-first and binds to localhost by default.

## Non-Functional Requirements

- The app still runs with `npm start`.
- The implementation should avoid a large frontend framework migration.
- Dashboard should handle at least 1,000 provider/model rows without obvious UI lag.
- SQLite dependency and test command are documented in `package.json` and lockfile.
- The app remains responsive on desktop and mobile.

## Testing Requirements

- Add a minimal automated test setup using Node's built-in `node:test`.
- Test SQLite initialization.
- Test usage upsert creates and increments provider/model rows.
- Test usage listing sorts by usage count descending.
- Test successful LLM usage recording can be called without storing secrets.
- Test `/api/llm-usage` response shape and absence of sensitive fields.
- Manual regression checks:
  - Run Skill page still loads skills and schemas.
  - Run Skill still sends LLM requests and renders output.
  - Config page saves/clears/tests LLM config.
  - Dashboard empty and populated states render correctly.
  - Mobile layout is usable.
