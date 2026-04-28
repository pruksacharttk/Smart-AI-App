# Section 01: SQLite Usage Store

## Purpose

Add local SQLite persistence for successful LLM usage counts. This section does not change the UI and does not record usage from live runs yet. It creates the storage foundation used by later backend and dashboard work.

## Scope

Implement:

- `better-sqlite3` runtime dependency.
- `data/` `.gitignore` entry.
- A testable usage store module.
- Store-level tests with isolated test database paths.
- `npm test` script using Node's built-in test runner.

Do not implement dashboard UI or backend route integration in this section.

## Files To Change

- `package.json`
- `package-lock.json`
- `.gitignore`
- `src/usage-store.js` or `usage-store.js`
- `test/usage-store.test.js`

Prefer `src/usage-store.js` if introducing `src/` is acceptable. Keep the module small and dependency-free except for `better-sqlite3` and Node built-ins.

## Store Contract

Expose a factory similar to:

```text
createUsageStore(options)
  - init()
  - recordSuccess(provider, model, usedAt)
  - listUsage()
  - close()
```

Options should include:

- `dbPath`: optional explicit SQLite path for tests.
- `dataDir`: optional data directory override if useful.

Default database path:

```text
data/smart-ai-app.sqlite
```

## Database Requirements

Create `data/` automatically when using default path.

Create table `llm_usage` idempotently:

- `id`
- `provider`
- `model`
- `usage_count`
- `last_used_at`
- `created_at`
- `updated_at`
- unique `(provider, model)`

Use UTC ISO-8601 timestamps.

Use WAL mode when supported. Initialization should not fail solely because WAL cannot be enabled in an unusual environment.

## Write Behavior

`recordSuccess(provider, model, usedAt)`:

- Requires provider/model strings.
- Treats provider/model as untrusted data.
- Uses prepared SQL statements.
- Inserts a new row with count 1 when missing.
- Atomically increments count when row exists.
- Updates `last_used_at` and `updated_at`.
- Does not accept or persist prompts, API keys, image data, generated output, raw requests, or raw responses.

## Read Behavior

`listUsage()`:

- Returns rows sorted by usage count descending, provider ascending, model ascending.
- Returns camelCase fields:
  - `provider`
  - `model`
  - `usageCount`
  - `lastUsedAt`
- Does not return internal DB fields unless needed by tests.

## Tests To Write First

- Test schema initialization creates the table in a temporary/test database.
- Test initialization creates missing parent directory.
- Test `recordSuccess()` inserts first row with count 1.
- Test repeated `recordSuccess()` increments the same provider/model row.
- Test separate models produce separate rows.
- Test `listUsage()` sort order.
- Test returned rows use camelCase API-facing field names.

## Acceptance Criteria

- `npm test` runs store tests without touching `data/smart-ai-app.sqlite`.
- `data/` is ignored by git.
- No secrets or prompt content are accepted by the store API.
- Store module can be imported by `server.js` in the next section.

## Implemented

- Added `better-sqlite3` dependency.
- Added `npm test` using Node's built-in test runner.
- Added `data/` to `.gitignore`.
- Created `src/usage-store.js`.
- Created `test/usage-store.test.js`.
- Store tests use temporary database paths and do not touch the real app database.
