# Section 02: Typed API Client

## Purpose

Centralize frontend API calls and response types so React pages do not scatter raw `fetch` logic.

## Dependencies

Requires Section 01.

## Scope

Implement:

- Typed API response interfaces.
- API client functions.
- SSE client helper for run-skill stream.
- Provider id and config types.
- Legacy localStorage migration helpers usable by React.
- Secret-safe error/result formatting.

## Files To Change

- `frontend/src/api/client.ts`
- `frontend/src/api/sse.ts`
- `frontend/src/api/types.ts`
- `frontend/src/features/config/legacyMigration.ts`
- Optional frontend unit test files if a test runner is introduced.

## API Client Methods

Required methods:

- `getSkills()`
- `getUiSchema(skillId: string)`
- `getUsage()`
- `getConfig()`
- `saveConfig(config)`
- `clearConfig()`
- `rotateConfigKey()`
- `testLlm(config)`
- `testProvider(providerId)`
- `runSkillStream(payload, onStatus)`

All methods must live behind this API boundary so React page components do not scatter raw `fetch` calls.

## Type Requirements

Types must cover at minimum:

- Skill summary.
- Invalid skill summary and issues.
- UI schema response.
- Config shape and provider config shape.
- Public config provider with `hasApiKey`.
- Usage row.
- LLM test result.
- Provider test result.
- Run-skill SSE status events.

## Error Handling

- Non-2xx API responses should throw typed/structured errors.
- API key values must not be interpolated into error messages.
- SSE `error` event should reject or call an error callback with a safe message.
- Provider test and LLM test helpers must sanitize any user-entered key from returned messages before rendering.

## Legacy Migration

Preserve behavior:

- Read `localStorage.llmConfig` only for one-time migration.
- Do not migrate if `llmConfigDbMigrationCompleted=true`.
- Do not overwrite DB-saved keys.
- Sanitize API keys from `localStorage.llmConfig`.

## Tests And Checks

- Typecheck catches API method misuse.
- Unit-test migration helper if a frontend test runner exists.
- Existing backend migration helper tests remain passing.

## Acceptance Criteria

- React pages can import API methods instead of using raw `fetch`.
- No component directly parses SSE wire format except through the SSE helper.
- Config migration behavior is preserved.
