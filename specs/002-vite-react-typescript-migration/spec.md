# Spec: Vite React TypeScript Migration

## Objective

Migrate the existing Smart AI App frontend from a single large inline script in `public/index.html` to a Vite + React + TypeScript frontend while preserving the current Node/SQLite backend APIs and all user-facing behavior.

The migration should reduce frontend regression risk, make missing helper/function errors compile-time detectable, and create a maintainable structure for Dashboard, Run Skill, Config, provider API testing, encrypted config, and future provider-specific workflows.

## Scope

This feature covers:

- Introduce Vite, React, and TypeScript for the frontend.
- Keep `server.js` as the backend/API server.
- Preserve current API routes and response contracts.
- Replace DOM-driven rendering with React components and typed state.
- Preserve dashboard, skill runner, config page, LLM fallback, encrypted config, key rotation, localStorage one-time migration, provider API key tests, and language toggle behavior.
- Add build/preview/dev scripts and server static serving for Vite `dist`.
- Add smoke tests that catch blank skill dropdown regressions and missing frontend helper regressions.

This feature does not require:

- Rewriting backend APIs into a framework.
- Adding multi-user accounts.
- Adding a remote database.
- Changing provider API semantics beyond the existing endpoints.
- Changing skill schema formats.

## Current Problems To Solve

- `public/index.html` contains too much UI state and behavior in one script.
- Runtime-only helper failures have occurred, for example missing `setStatus` and `updateSampleButtons`.
- Config loading previously blocked skill loading, causing empty skill dropdown symptoms.
- UI concerns are mixed together: Dashboard, Run Skill, Config, migration, provider tests, uploads, SSE parsing, language labels.
- The app lacks a frontend compile step that can detect missing symbols, bad imports, and type mismatches before browser runtime.

## Target Architecture

```text
server.js
  - backend API
  - SQLite initialization
  - encrypted config store
  - provider service endpoints
  - static serving for Vite dist in production

src/
  app-config-store.js
  env-config.js
  legacy-config-migration.js
  provider-services.js
  usage-store.js

frontend/
  index.html
  src/
    main.tsx
    App.tsx
    api/
      client.ts
      sse.ts
    components/
      AppShell.tsx
      StatusBadge.tsx
      OutputTabs.tsx
    pages/
      DashboardPage.tsx
      RunSkillPage.tsx
      ConfigPage.tsx
    features/
      config/
      skills/
      usage/
      providers/
      i18n/
    styles/
      app.css
```

The exact directory names may be adjusted, but the implementation must keep clear module boundaries between backend APIs, shared frontend API client code, pages, and reusable UI components.

## User Stories

### US-001: Load App Without Runtime Helper Errors

As a user, I want the app to load reliably, so the skill dropdown and dashboard work after a normal refresh.

Acceptance criteria:

- App loads without `ReferenceError` from missing frontend helper functions.
- TypeScript build fails if a referenced function/component is missing.
- Initial page shows Dashboard by default.
- Skill dropdown is populated after `/api/skills` returns skills.
- Config loading failure must not prevent skill dropdown population.

### US-002: Use Dashboard Page

As a user, I want to see LLM usage metrics on the Dashboard, so I can inspect provider/model usage.

Acceptance criteria:

- Dashboard fetches `GET /api/llm-usage`.
- Dashboard supports loading, empty, error, and populated states.
- Rows show provider, model, usage count, and last used time.
- Dashboard does not render or request API keys.
- Dashboard can refresh after successful skill runs.

### US-003: Run Existing Skills

As a user, I want the Run Skill page to behave the same as before, so migration does not break current workflows.

Acceptance criteria:

- Skill selector shows all valid skills and disabled invalid skills.
- Dynamic form renders from `/api/ui-schema`.
- Required-field validation remains.
- Image upload fields keep current behavior and data URL transport.
- Local Python runtime and LLM fallback execution continue to work.
- SSE `/api/run-skill-stream` status updates render correctly.
- Output tabs Prompt, JSON, and Review remain.
- Copy and Download JSON remain.
- Thai Cats sample button appears only for `gpt-image-prompt-engineer`.

### US-004: Configure LLM And Provider API Keys

As a user, I want the Config page to preserve encrypted config behavior, so secrets remain secure.

Acceptance criteria:

- Config page loads `GET /api/config`.
- Save uses `POST /api/config`.
- Clear uses `DELETE /api/config`.
- Rotate Key uses `POST /api/config/rotate-key`.
- Test LLM uses `POST /api/test-llm`.
- Test Provider APIs uses:
  - `POST /api/providers/fal/test`
  - `POST /api/providers/kie/test`
  - `POST /api/providers/wavespeed/test`
- API keys are masked by default.
- Saved keys are represented by `hasApiKey`, not returned secret values.
- Leaving an API key input blank preserves existing saved secret.
- The DB + `.env` backup warning is visible on Config.
- The image-capable model guidance appears on Config, not Run Skill.

### US-005: Preserve One-Time LocalStorage Migration

As a user who previously ran the old version, I want browser-local keys migrated automatically to encrypted DB storage once, so I do not have to move them manually.

Acceptance criteria:

- If `localStorage.llmConfig` contains API keys and DB has no saved keys, the frontend migrates once via `POST /api/config`.
- After successful migration, API key values are sanitized from `localStorage.llmConfig`.
- `localStorage.llmConfigDbMigrationCompleted=true` blocks future migrations.
- If DB already has saved keys, legacy browser keys must not overwrite DB keys.
- If marker exists, the frontend must not migrate again and must still sanitize API keys from localStorage.

### US-006: Keep Backend API Compatibility

As a developer, I want the backend routes to remain stable, so migration is isolated to frontend unless a backend static-serving change is required.

Acceptance criteria:

- Existing backend tests remain passing.
- Existing API response shapes do not change except for additive fields.
- `server.js` serves Vite build output in production.
- Development mode supports Vite dev server proxy to backend APIs.
- `npm start` still runs the backend app.

## Functional Requirements

### Package Scripts

Add or update scripts:

```json
{
  "dev": "run backend and Vite dev server, or document two commands",
  "dev:server": "node --watch server.js",
  "dev:frontend": "vite --config frontend/vite.config.ts",
  "build": "vite build --config frontend/vite.config.ts",
  "typecheck": "tsc --noEmit -p frontend/tsconfig.json",
  "test": "node --test",
  "test:frontend": "typecheck and smoke tests if available"
}
```

Exact script names may differ, but the final workflow must be documented and easy to run.

### API Client

The frontend must use a typed API client module instead of scattered `fetch` calls.

Required methods:

- `getSkills()`
- `getUiSchema(skillId)`
- `getUsage()`
- `getConfig()`
- `saveConfig(config)`
- `clearConfig()`
- `rotateConfigKey()`
- `testLlm(config)`
- `testProvider(providerId)`
- `runSkillStream(payload, onStatus)`

### State Ownership

Recommended top-level state:

- `activePage`
- `language`
- `skills`
- `invalidSkills`
- `selectedSkillId`
- `schemaState`
- `llmConfig`
- `status`
- `llmStatus`
- `usageDashboardStale`

State should be split into hooks or feature modules if it becomes large.

### Static Serving

Production behavior:

- If Vite `dist` exists, `server.js` serves built frontend assets from that directory.
- API routes remain handled before static asset fallback.
- `data/`, `.env`, source files, and SQLite database must never be served as static assets.

Development behavior:

- Vite dev server should proxy `/api/*` to backend.
- Backend can continue serving existing static page temporarily during migration, but final migrated frontend should use Vite dev server for UI development.

## UI Requirements

### App Shell

- Preserve work-focused dashboard layout.
- Keep navigation predictable.
- Avoid marketing hero pages.
- Keep text sizing appropriate for operational UI.
- Must be responsive on desktop and mobile.

### Config Page

- Provider cards for NVIDIA, OpenRouter, fal.ai, Kie.ai, WaveSpeedAI.
- API key setup guide with links:
  - NVIDIA: `https://build.nvidia.com/settings/api-keys`
  - OpenRouter: `https://openrouter.ai/settings/keys`
  - fal.ai: `https://fal.ai/dashboard/keys`
  - Kie.ai: `https://kie.ai/api-key`
  - WaveSpeedAI: `https://www.wavespeed.ai/dashboard`
- Fallback model order editor.
- Image model guidance under fallback section.
- Encryption backup warning.
- Buttons:
  - Save Config
  - Clear
  - Test LLM
  - Test Provider APIs
  - Rotate Key

### Run Skill Page

- No image model guidance box under output prompt.
- Skill selector must never remain visually empty after successful `/api/skills`.
- Loading and error states must be visible.

## Security Requirements

- Do not send API key values to React state unless the user types them in the current session or one-time localStorage migration reads them.
- Do not render API key values in outputs.
- Do not log API key values.
- `/api/config` endpoints remain protected by localhost/admin-token guard.
- Provider tests must not leak secrets in error output.
- The frontend must not store new API key values in localStorage.
- Legacy localStorage sanitization must remain.
- Vite dev server must not be exposed to untrusted networks with sensitive config access.

## Testing Requirements

### Backend Regression

- Existing `npm test` must pass.
- Add/update backend tests only if static serving changes require it.

### Frontend Type Safety

- `npm run typecheck` must fail on missing functions/components.
- Component props and API response types must be explicit enough to catch major shape errors.

### Smoke Tests

Add a browser smoke test, preferably Playwright or equivalent:

- Load app.
- Assert skill dropdown contains at least one option.
- Navigate to Config.
- Assert provider cards are visible.
- Assert image model guidance is visible on Config.
- Assert image model guidance is not visible on Run Skill output.
- Assert `/api/config` response does not contain API key values.

### Migration Tests

At minimum, unit-test the localStorage migration helpers:

- migrates only once
- sanitizes API keys
- does not overwrite DB-saved keys

If practical, add a browser-level migration smoke test.

## Migration Strategy

### Phase 1: Scaffold Vite React TS

- Add frontend package structure.
- Configure Vite proxy to backend.
- Add TypeScript config.
- Add build/typecheck scripts.
- Keep existing backend tests passing.

### Phase 2: Typed API Client And Shared Types

- Define frontend API types.
- Implement API client.
- Implement SSE parser/client.
- Add small tests for API client helpers where practical.

### Phase 3: App Shell And Dashboard

- Implement `AppShell`.
- Implement Dashboard page.
- Preserve usage dashboard behavior.

### Phase 4: Config Page

- Implement Config page first among complex pages.
- Preserve encrypted DB config behavior.
- Preserve localStorage one-time migration.
- Preserve provider test and rotate key flows.

### Phase 5: Run Skill Page

- Implement dynamic schema form renderer.
- Implement image upload fields.
- Implement SSE run flow.
- Preserve output tabs and sample behavior.

### Phase 6: Production Static Serving

- Update `server.js` static serving to prefer Vite `dist`.
- Keep fallback behavior documented for development.
- Ensure protected files cannot be served.

### Phase 7: Verification And Cleanup

- Remove obsolete inline frontend script.
- Remove duplicate/static old UI only after React replacement passes smoke tests.
- Run backend tests, typecheck, and browser smoke tests.

## Rollback Plan

- Keep the existing `public/index.html` working until the React frontend reaches parity.
- During migration, allow switching static root via env variable if needed, for example `FRONTEND_DIST_DIR`.
- Do not delete old UI until smoke tests pass.
- If React migration fails, backend APIs remain intact and old UI can continue to serve.

## Open Questions

- Should React be plain React state/hooks, or should a small state library be introduced later?
- Should frontend tests use Playwright, Vitest + Testing Library, or both?
- Should the app keep bilingual UI copy in code, or move translations to JSON files?
- Should Vite build output live in `dist/` or `frontend/dist/`?
- Should production `npm start` require `npm run build` first, or fall back to old public UI if no build exists?
