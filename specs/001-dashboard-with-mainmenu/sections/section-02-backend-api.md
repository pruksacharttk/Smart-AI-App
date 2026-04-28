# Section 02: Backend API And Usage Recording

## Purpose

Integrate the usage store into `server.js`, expose dashboard usage data, and record successful LLM usage.

## Dependencies

Requires Section 01 usage store.

## Scope

Implement:

- Usage store initialization on server startup.
- `GET /api/llm-usage`.
- Successful usage recording inside LLM fallback flow.
- API tests with mocked or isolated usage store behavior.

Do not implement frontend dashboard rendering in this section.

## Files To Change

- `server.js`
- `src/usage-store.js` if integration requires small export adjustments
- `test/llm-usage-api.test.js` or equivalent

## Server Initialization

Initialize the usage store once during startup.

If initialization fails:

- Log a safe error.
- Keep the app server available if practical.
- Make `/api/llm-usage` return a safe JSON error rather than crashing.

Do not log API keys, prompts, image data, or raw provider payloads.

## API Contract

Add:

```text
GET /api/llm-usage
```

Response:

```text
{ rows: UsageRow[] }
```

Each `UsageRow`:

- `provider`
- `model`
- `usageCount`
- `lastUsedAt`

The endpoint is read-only and must not include sensitive fields.

## Usage Recording Point

Record successful usage in `runLlmSkill()` after `postChatCompletion()` succeeds.

Use the actual successful provider/model:

- Prefer `result.llm.provider` and `result.llm.model` when available.
- Fall back to `target.provider` and `target.model`.

Failed fallback attempts must not increment counts.

## Non-Blocking Recording

If `recordSuccess()` throws:

- Catch the error.
- Log a safe message with provider/model and error summary.
- Return the successful LLM result unchanged.

The user's successful skill run must not fail because usage analytics failed.

## Testability

Automated tests must not call live LLM providers. Prefer one of:

- Export a request handler factory accepting a usage store dependency.
- Isolate the `/api/llm-usage` handler and test it directly.
- Test usage-recording helper with a stub store.

## Tests To Write First

- Test `GET /api/llm-usage` returns empty rows from an empty store.
- Test `GET /api/llm-usage` returns populated rows in expected shape.
- Test response excludes API keys, prompts, output, image data, and raw provider payloads.
- Test successful usage recording calls the store exactly once with final provider/model.
- Test failed fallback paths do not call successful usage recording.
- Test recording failure is swallowed for successful LLM result path.

## Acceptance Criteria

- Backend can serve `/api/llm-usage`.
- Successful LLM runs increment usage.
- Failed fallback attempts do not increment usage.
- No live LLM calls are required for automated tests.
- `node --check server.js` passes.

## Implemented

- Imported and initialized the usage store in `server.js`.
- Added `GET /api/llm-usage`.
- Exported minimal server hooks for tests.
- Added successful LLM usage recording after `postChatCompletion()` succeeds.
- Recording errors are caught and logged without failing successful LLM runs.
- Added `test/llm-usage-api.test.js`.
