# Research: Vite React TypeScript Migration

## Research Decisions

- Codebase research required: yes. The migration affects the current frontend entrypoint, backend static serving, config/security flows, and skill execution UI.
- Web research required: yes. The target stack is modern Vite + React + TypeScript and should use current official guidance.
- External LLM review: disabled by `deep_plan_config.json`; self-review is used.

## Codebase Findings

### Runtime And Packaging

- `package.json` currently defines a private Node ESM app with scripts:
  - `npm start` -> `node server.js`
  - `npm run dev` -> `node --watch server.js`
  - `npm test` -> `node --test`
- The only runtime dependency is `better-sqlite3`.
- The project requires Node `>=20`, which is compatible with Vite and Playwright requirements, but current Vite docs require Node `20.19+` or `22.12+` for the latest major line. The implementation should either enforce the newer minimum or pin Vite to a compatible version if the local Node is older.

### Backend API

`server.js` owns both API routing and static serving. Relevant routes include:

- `GET /api/skills`
- `GET /api/ui-schema?skill=...`
- `POST /api/run-skill`
- `POST /api/run-skill-stream`
- `GET /api/llm-usage`
- `GET /api/config`
- `POST /api/config`
- `DELETE /api/config`
- `POST /api/config/rotate-key`
- `POST /api/test-llm`
- `POST /api/providers/:provider/test`

Config routes are protected by localhost/admin-token guard. Static serving currently serves from `public/` and falls back to `public/index.html`.

### Config And Secret Storage

The backend already has dedicated modules for encrypted config and provider testing:

- `src/app-config-store.js`
- `src/env-config.js`
- `src/legacy-config-migration.js`
- `src/provider-services.js`
- `src/usage-store.js`

Tests already exist for config encryption, env key generation, legacy migration, provider services, and usage storage. The React migration should not change these contracts unless a section explicitly updates tests.

Security-sensitive frontend behavior currently lives in `public/index.html`:

- saved API keys are represented by `hasApiKey`
- blank key inputs preserve stored secrets
- legacy `localStorage.llmConfig` keys are migrated once, sanitized, then blocked by `llmConfigDbMigrationCompleted=true`
- new API keys should not be written to localStorage
- `.env` + SQLite DB backup warning and key rotation confirmation are present

### Frontend Risks

`public/index.html` contains all UI state and DOM behavior in one inline script. Recent regressions came from missing runtime functions (`setStatus`, `updateSampleButtons`) and config loading interactions that could make the skill dropdown appear empty. These are exactly the failure classes that Vite + React + TypeScript should address:

- compile-time missing symbol detection
- typed API response handling
- isolated page/component state
- smoke tests for skill dropdown and config page visibility

## Official Documentation Findings

### Vite

Official Vite docs describe Vite as a build tool with a dev server over native ES modules and a production build command that outputs optimized static assets. The official guide lists `react-ts` as a supported template, explains that `index.html` is the entrypoint in a Vite project, and documents default scripts such as `vite`, `vite build`, and `vite preview`. Source: [Vite Getting Started](https://vite.dev/guide/).

For backend integration, Vite documents two viable patterns: serve HTML/assets through a traditional backend with Vite-managed assets, or use a dev server setup with the backend proxying or accepting asset requests from Vite. Because this project already has a Node API server and static fallback, the migration should use Vite dev server proxy for `/api/*` in development and have `server.js` serve `frontend/dist` in production. Source: [Vite Backend Integration](https://vite.dev/guide/backend-integration.html).

Vite server options include `server.proxy` and host/allowed-host controls. The implementation should keep dev hosting local by default and avoid exposing a sensitive config UI over an untrusted network. Source: [Vite Server Options](https://vite.dev/config/server-options).

### React + TypeScript

React's official TypeScript guide recommends `.tsx` for files with JSX, installing `@types/react` and `@types/react-dom`, and using typed props/state/hooks to catch shape errors. This maps directly to the project need to prevent missing helper references and untyped config/skill API usage. Source: [React Using TypeScript](https://react.dev/learn/typescript).

### Playwright

Playwright official docs show browser tests using `@playwright/test`, `page.goto`, locators, and `expect`. Playwright supports Node 20/22/24 and can run smoke tests headlessly across browsers. This is appropriate for the blank skill dropdown and config visibility regressions because those require a real browser DOM and networked app server. Sources: [Playwright Installation](https://playwright.dev/docs/intro), [Playwright Writing Tests](https://playwright.dev/docs/writing-tests).

## Architecture Implications

- Keep backend API contracts stable and isolate most work in `frontend/`.
- Add a typed frontend API client before page migration to avoid scattered `fetch` calls.
- Use plain React state/hooks first. A state library would add dependency surface before the app proves it needs shared complex state.
- Implement Config before Run Skill because Config owns LLM availability, legacy migration, and provider-key state that Run Skill reads.
- Add Playwright smoke tests late enough that the React app is functional, but before deleting the old inline frontend.
- Preserve `public/index.html` until React parity and smoke tests pass.

## Testing Implications

Minimum verification gates:

- `npm test`
- `npm run typecheck`
- `npm run build`
- browser smoke test for:
  - skill dropdown contains at least one skill
  - Config page renders provider cards and image model guidance
  - Run Skill page does not render image model guidance
  - `/api/config` does not return secret key values

## Open Technical Risks

- Latest Vite may require a stricter Node minor version than the current `package.json` declares.
- SSE parsing must preserve event ordering and final result/error behavior.
- Dynamic schema rendering has many field variants; a narrow first pass could accidentally drop image, array, JSON, or extra-schema behavior.
- The one-time localStorage migration must remain idempotent and must not overwrite DB-saved secrets.
- Production static fallback must not serve `.env`, SQLite data, or source files.
