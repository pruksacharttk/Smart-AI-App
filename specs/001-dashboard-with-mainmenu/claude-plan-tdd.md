# TDD Plan: Dashboard With Main Menu

This document mirrors `claude-plan.md` and defines tests to write before implementation. Test descriptions are stubs, not full implementations.

## Phase 1: SQLite Usage Store

Test first:

- Test: usage store initializes the SQLite schema in an explicit test database path.
- Test: usage store creates the data directory when it does not exist.
- Test: usage store enables WAL mode when supported without failing initialization.
- Test: `recordSuccess()` inserts a new provider/model row with count 1.
- Test: `recordSuccess()` increments an existing provider/model row atomically.
- Test: `listUsage()` returns rows sorted by usage count descending and stable provider/model ordering.
- Test: `listUsage()` maps DB snake_case fields to API camelCase fields.
- Test: usage store accepts provider/model strings as data and does not interpolate them into SQL.

## Phase 2: Backend Integration

Test first:

- Test: `GET /api/llm-usage` returns `{ rows: [] }` against an empty store.
- Test: `GET /api/llm-usage` returns populated rows using the expected response shape.
- Test: `/api/llm-usage` response does not include API keys, prompts, uploaded image data, generated output, or raw provider payloads.
- Test: successful LLM result path records exactly one successful usage event for the final provider/model.
- Test: failed fallback attempts do not record successful usage.
- Test: usage recording failure is caught and does not convert an otherwise successful LLM result into an error.
- Test: non-GET requests to `/api/llm-usage` are rejected or fall through to the existing method handling without mutating data.

Automated tests must use stubs/mocks and must not call live LLM providers.

## Phase 3: Frontend App Shell

Manual and lightweight syntax checks first:

- Check: inline script syntax remains valid after DOM restructuring.
- Check: app initializes to Dashboard by default.
- Check: left menu shows Dashboard, Run Skill, and Config.
- Check: active menu item updates when navigating.
- Check: invalid hash/query route falls back to Dashboard if routing uses hash/query state.
- Check: switching pages preserves Run Skill form state and uploaded image previews.

## Phase 4: Dashboard Page

Test/check first:

- Test or manual check: Dashboard renders empty state for empty rows.
- Test or manual check: Dashboard renders provider/model/count/last-used rows from API response.
- Test or manual check: provider/model values are assigned with `textContent` or an equivalent escaped path.
- Test or manual check: Dashboard error state appears when `/api/llm-usage` fails.
- Test or manual check: successful Run Skill marks Dashboard stale and refreshes it on return.
- Test or manual check: Dashboard can display at least 1,000 rows without layout failure.

## Phase 5: Run Skill Page Refactor

Regression checks first:

- Check: skill list loads.
- Check: selecting a skill loads schema and renders the form.
- Check: image upload controls still render and preserve previews.
- Check: top and bottom Run Skill buttons both trigger the same run flow.
- Check: Reset and sample buttons still work.
- Check: Prompt/JSON/Review tabs still work.
- Check: copy and download JSON actions still work.
- Check: LLM status updates still render during streaming.
- Check: image model guidance remains below Prompt output.

## Phase 6: Config Page Refactor

Regression checks first:

- Check: Config page renders NVIDIA and OpenRouter sections.
- Check: API key inputs are password fields by default.
- Check: Show/Hide toggles still work.
- Check: fallback rows render model dropdowns and custom model fields.
- Check: image-capable model labels remain visible.
- Check: Save Config preserves existing `localStorage["llmConfig"]` format.
- Check: Clear Config resets to default Qwen fallback order.
- Check: Test LLM displays per-row results without leaking API keys.
- Check: language switching updates Config page labels and buttons.

## Phase 7: Security Hardening

Test/check first:

- Test: usage database contains only allowed usage columns.
- Test: `/api/llm-usage` never includes sensitive fields.
- Check: `data/` is in `.gitignore`.
- Check: SQLite database path is outside `public/`.
- Check: dashboard does not use raw `innerHTML` for provider/model values.
- Check: SQL uses prepared/parameterized statements.
- Check: no reset usage endpoint exists in v1.

## Phase 8: Tests And Verification

Final commands/checks:

- `npm test`
- `node --check server.js`
- inline script syntax check for `public/index.html`
- `npm start`
- manual desktop responsive check
- manual mobile/narrow responsive check
