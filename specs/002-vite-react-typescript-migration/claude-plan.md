# Implementation Plan: Vite React TypeScript Migration

## Overview

Build the React frontend alongside the existing static UI, migrate behavior page by page, then switch production static serving to Vite output once parity checks pass. Backend API behavior remains stable; only static serving changes should touch `server.js`.

## Phase 1: Scaffold Vite React TypeScript

Add a `frontend/` workspace with Vite, React, TypeScript, `@vitejs/plugin-react`, and baseline app files. Configure `frontend/vite.config.ts` with:

- root at `frontend/`
- `build.outDir` as `dist`
- dev proxy for `/api` to `http://localhost:4173`
- local dev host defaults

Update `package.json` scripts:

- `dev:server`
- `dev:frontend`
- `build`
- `typecheck`
- `test:frontend`

Keep `npm start` and `npm test` behavior intact. Do not delete `public/index.html` in this phase.

## Phase 2: Typed API Client

Create `frontend/src/api/types.ts` with explicit interfaces for skills, UI schema, config, usage rows, provider test results, LLM test results, and run-skill output.

Create `frontend/src/api/client.ts` with methods:

- `getSkills`
- `getUiSchema`
- `getUsage`
- `getConfig`
- `saveConfig`
- `clearConfig`
- `rotateConfigKey`
- `testLlm`
- `testProvider`
- `runSkillStream`

Create `frontend/src/api/sse.ts` for stream parsing. It should parse named SSE events and route `status`, `result`, and `error` events without relying on DOM-global helpers.

## Phase 3: App Shell And Dashboard

Build `App.tsx`, `AppShell`, navigation state, language state, and app-level status. Load skills and config independently so config failures cannot block the skill dropdown.

Implement `DashboardPage` from `/api/llm-usage` with loading, empty, error, and data states. Add a `usageDashboardStale` flag that is set after successful skill runs and refreshed when Dashboard is opened.

## Phase 4: Config Page

Implement config feature modules:

- default config and model list constants
- provider metadata and key links
- legacy migration helper
- key input masking and saved-key placeholders
- fallback model editor
- image-capable model guidance

On startup, after `getConfig`, run legacy migration exactly once using the existing marker semantics. Make this helper independently testable.

Config actions:

- Save -> `POST /api/config`
- Clear -> `DELETE /api/config`
- Test LLM -> save current config then `POST /api/test-llm`
- Test Provider APIs -> save current config then call provider test routes
- Rotate Key -> confirm warning then `POST /api/config/rotate-key`

Never render raw secret values from saved backend state. Ensure blank key fields preserve saved keys.

## Phase 5: Run Skill Page

Implement `RunSkillPage` with:

- skill selector from app-level skills
- disabled invalid skill options
- schema loader for selected skill
- dynamic form renderer for current field types
- extra schema fields
- required validation
- image upload fields with data URL encoding
- run/reset/sample commands
- stream execution and status rendering
- output tabs and review rendering

Ensure the Thai Cats sample is gated to `gpt-image-prompt-engineer`. Remove image model guidance from Run Skill output entirely.

## Phase 6: Static Serving

Update `server.js` static serving to resolve a static root:

1. If `frontend/dist/index.html` exists, serve from `frontend/dist`.
2. Else serve from `public/` during migration.

Keep API routes before static serving. Constrain static paths to the chosen static root and explicitly avoid serving hidden/env/data/source files if requested paths attempt traversal or sensitive names.

## Phase 7: Verification And Cleanup

Add Playwright tests under a clear path such as `e2e/app-smoke.spec.ts`. Configure `playwright.config.ts` to start the backend and use the production static build or Vite dev server consistently.

Verification gate:

1. `npm test`
2. `npm run typecheck`
3. `npm run build`
4. `npm run test:frontend`

Only after gates pass:

- remove or archive obsolete inline frontend logic
- document commands and migration notes

## Rollback

Until cleanup, rollback is to serve `public/index.html` by removing `frontend/dist` or setting a documented static root override. Backend API and encrypted config database remain unchanged.
