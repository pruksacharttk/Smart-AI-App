# Research: Dashboard With Main Menu

## Spec Trust Boundary

The input spec was treated as untrusted requirements data. No commands or instructions from inside the spec were executed. The extracted requirements are limited to dashboard navigation, SQLite-backed LLM usage counts, Run Skill relocation, Config relocation, security constraints, and testing expectations.

## Codebase Findings

### Current Architecture

- The app is a minimal local Node.js application with:
  - `server.js` as the HTTP server, static file server, skill scanner, Python runtime dispatcher, and OpenAI-compatible LLM gateway.
  - `public/index.html` as a single-file frontend containing CSS, markup, and all client-side JavaScript.
  - `skills/` as local skill definitions with schemas and optional Python runtimes.
- `package.json` currently has no runtime dependencies and only two scripts:
  - `npm start` -> `node server.js`
  - `npm run dev` -> `node --watch server.js`
- There is no test script yet.

### Current Server Behavior

- The server uses Node built-ins:
  - `node:http`
  - `node:fs/promises`
  - `node:fs`
  - `node:path`
  - `node:child_process`
  - `node:url`
- Current API endpoints:
  - `POST /api/run-skill`
  - `POST /api/run-skill-stream`
  - `POST /api/test-llm`
  - `GET /api/skills`
  - `GET /api/ui-schema`
  - static GET fallback for frontend assets.
- LLM fallback flow:
  - `executeRunSkill()` decides between LLM and Python runtime.
  - `runLlmSkill()` loops through configured fallbacks.
  - `postChatCompletion()` performs the OpenAI-compatible request.
  - Successful result includes `llm` and `lastSuccessfulLlm` with provider/model/rank.
- Best insertion point for usage tracking:
  - After `postChatCompletion()` succeeds inside `runLlmSkill()`, because the final successful provider/model is known there.
  - Usage recording should be non-blocking for user success semantics: if DB update fails, the LLM result should still return.
- Current rate limiting is path-based and should add `/api/llm-usage` only if needed. Since it is read-only and local, normal request handling may be enough; any reset endpoint would need rate limiting.

### Current Frontend Behavior

- `public/index.html` currently renders one main skill runner screen with:
  - topbar containing skill select, language toggle, Config button, and status.
  - dynamic form in `.controls`.
  - output panel in `.output`.
  - Config modal for API keys, provider URLs, fallback order, and Test LLM.
- Existing state is mostly module-level variables in the inline script:
  - `skills`
  - `selectedSkillId`
  - `schemaState`
  - `currentBundle`
  - `llmConfig`
  - `fileFieldValues`
- Config is stored in browser localStorage as `llmConfig`.
- Existing Config modal logic can be reused in-page, but should stop depending on modal open/close as the primary access pattern.
- Existing Run Skill UI can be moved into a route/page container without changing request payloads.

### Security Observations

- `safeSkillId()` restricts skill IDs to `[a-zA-Z0-9_-]`.
- Static serving normalizes paths and checks that served files are under `publicDir`.
- LLM provider API keys are sent from browser localStorage to `/api/run-skill*` and `/api/test-llm`.
- Existing code must avoid storing those keys in SQLite.
- The frontend often uses `innerHTML`; any dashboard rendering of provider/model values should escape text or use `textContent`.
- Usage storage must avoid prompt/output/image logging. The spec correctly restricts persisted fields.

### Testing Baseline

- There is no existing automated test setup.
- `node --check server.js` and inline script syntax checks have been used manually.
- The feature should introduce a minimal test approach without requiring a large framework:
  - Node's built-in `node:test` is a reasonable fit.
  - Server-side DB helpers can be exported from a new module and tested directly.
  - Frontend behavior may initially rely on manual responsive checks unless a browser test tool is introduced later.

## SQLite Research

### Node Built-In SQLite

- Official Node.js documentation shows `node:sqlite` was added in Node 22.5.0 and exists in later Node versions.
- This project declares `engines.node >=20`, so relying on built-in `node:sqlite` would either force a Node engine bump or require an experimental/newer runtime path.
- Recommendation: do not use `node:sqlite` unless the project intentionally changes engines to Node 22+.

Source: Node.js SQLite docs: https://nodejs.org/api/sqlite.html

### better-sqlite3

- `better-sqlite3` is a common synchronous SQLite library for Node.js and supports transactions, prepared statements, and a straightforward API.
- It introduces a native dependency, so installation should be captured in `package.json` and `package-lock.json`.
- For this local single-user app, the synchronous API is acceptable if usage writes are tiny and bounded.
- The implementation should initialize the DB once at server startup and reuse prepared statements.

Source: npm package page: https://www.npmjs.com/package/better-sqlite3

## Recommended Implementation Direction

- Add `better-sqlite3` as the SQLite dependency unless implementation discovers local install constraints.
- Create a small database module instead of adding all DB logic directly into `server.js`:
  - `db.js` or `src/usageStore.js` if a `src/` directory is introduced.
  - Responsibilities: ensure data directory, initialize schema, set WAL, record success, list usage rows.
- Add `GET /api/llm-usage` to `server.js`.
- Add `data/` to `.gitignore`.
- Refactor `public/index.html` into an app shell with page containers:
  - Dashboard page
  - Run Skill page
  - Config page
- Keep existing client state in memory so switching pages does not reset form/config state.
- Convert Config modal contents into the Config page while optionally leaving the old Config button as a navigation shortcut.
- Add a dashboard fetch/render function using `textContent` for dynamic values.

## Risks And Mitigations

- Risk: Refactoring the single-file frontend can break existing Run Skill behavior.
  - Mitigation: move existing DOM blocks into page containers with minimal JS changes first; avoid a framework migration.
- Risk: `better-sqlite3` install may fail on some Windows setups if prebuilt binaries are unavailable.
  - Mitigation: document dependency; keep DB code isolated so a different adapter can replace it if needed.
- Risk: Usage recording failure could make successful LLM runs appear failed.
  - Mitigation: catch and log DB write failures in `runLlmSkill()` after success.
- Risk: Provider/model names could become HTML injection if rendered with `innerHTML`.
  - Mitigation: render dashboard rows with DOM creation and `textContent`.
- Risk: Existing Config localStorage may be reset during page conversion.
  - Mitigation: reuse existing `loadConfig()`, `saveConfig()`, and localStorage key unchanged.

## Research Conclusions

- The feature is feasible within the current single-file frontend and Node server.
- The safest plan is a staged refactor:
  1. Add SQLite usage store and API.
  2. Record successful LLM usage.
  3. Add dashboard rendering.
  4. Introduce app shell navigation.
  5. Move Run Skill and Config into page containers.
  6. Add focused tests and manual responsive checks.
- Avoid changing API key storage in this feature; it is explicitly out of scope and would require a separate security design.
