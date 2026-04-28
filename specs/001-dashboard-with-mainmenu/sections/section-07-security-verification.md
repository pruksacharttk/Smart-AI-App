# Section 07: Security And Final Verification

## Purpose

Perform final security hardening, automated test verification, and regression checks across the completed dashboard feature.

## Dependencies

Requires Sections 01-06.

## Scope

Verify and fix:

- sensitive data minimization
- SQL safety
- static asset safety
- API response safety
- Run Skill regression
- Config regression
- responsive layout

## Security Checklist

### SQLite Data Minimization

Confirm `llm_usage` stores only:

- provider
- model
- usage_count
- last_used_at
- created_at
- updated_at
- internal id

Confirm it does not store:

- API keys
- prompts
- generated outputs
- uploaded images
- base64 image data
- provider request bodies
- provider response bodies
- client IPs
- localStorage contents

### SQL Safety

Confirm all DB writes/reads use prepared statements. No SQL string interpolation for provider/model.

### Static Asset Safety

Confirm:

- DB path is outside `public/`.
- `data/` is in `.gitignore`.
- static file serving still rejects traversal.

### API Safety

Confirm:

- `GET /api/llm-usage` is read-only.
- no reset usage endpoint exists.
- response includes only `rows`.
- response rows include only provider/model/usageCount/lastUsedAt.
- non-supported methods do not mutate usage data.

### Frontend HTML Safety

Confirm Dashboard uses `textContent` or equivalent escaping for provider/model. Avoid raw `innerHTML` with server-provided values.

### Secret Handling

Confirm:

- Config API key fields are password fields by default.
- API keys are not sent to `/api/llm-usage`.
- API keys are not rendered in Dashboard.
- API keys are not included in downloaded output JSON.

## Automated Verification

Run:

- `npm test`
- `node --check server.js`
- inline script syntax check for `public/index.html`

All must pass before completion.

## Manual Regression Verification

Check desktop and mobile/narrow widths:

- Dashboard empty state.
- Dashboard populated state after a successful LLM run.
- Dashboard retry/error state if API is unavailable.
- Run Skill page loads skills and renders schemas.
- Run Skill page preserves form/upload state when switching pages.
- Config page loads saved config and can save/clear/test.
- Topbar Config button navigates to Config page.
- Left menu active state is clear.
- No obvious overlap or horizontal scroll on mobile.

## Acceptance Criteria

- Security checklist is satisfied.
- Tests pass.
- Existing Run Skill and Config behavior remain intact.
- Dashboard correctly reflects successful LLM usage without storing sensitive data.

## Implemented Verification

- `npm test` passed.
- `node --check server.js` passed.
- Inline script syntax check for `public/index.html` passed.
- Smoke test confirmed `/api/llm-usage` and `/` return HTTP 200.
- Dashboard rendering uses DOM creation and `textContent` for provider/model rows.
- Usage store persists only provider/model/count/timestamps.
