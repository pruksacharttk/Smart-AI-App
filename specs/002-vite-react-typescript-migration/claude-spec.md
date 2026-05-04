# Refined Specification: Vite React TypeScript Migration

## Goal

Migrate Smart AI App's browser UI from `public/index.html` inline DOM code to a Vite + React + TypeScript frontend while preserving the existing Node/SQLite backend, encrypted config storage, one-time localStorage migration, LLM fallback behavior, provider API key tests, and skill execution workflow.

## Success Definition

The migration is successful when:

- the React app loads without runtime helper `ReferenceError` failures
- `GET /api/skills` populates a visible skill selector in the browser
- Config page can save, clear, test, and rotate encrypted config
- legacy browser-stored API keys are migrated once and sanitized
- Run Skill page preserves dynamic schema rendering, uploads, SSE execution, and output tabs
- `npm test`, `npm run typecheck`, `npm run build`, and browser smoke tests pass
- old `public/index.html` is removed or reduced only after parity is verified

## In Scope

- Add `frontend/` Vite React TypeScript app.
- Add typed frontend API client.
- Add React pages for Dashboard, Run Skill, and Config.
- Add feature modules for config, skills, usage, providers, i18n, and SSE.
- Add production static serving of `frontend/dist`.
- Preserve all current backend API routes and response contracts.
- Add browser smoke tests for known frontend regressions.
- Document dev/build/test commands.

## Out Of Scope

- Backend framework rewrite.
- Multi-user auth.
- Remote database migration.
- Changing provider semantics beyond existing test/config endpoints.
- Implementing full provider-specific generation workflows for fal.ai, Kie.ai, or WaveSpeedAI.
- Introducing a frontend state library in the baseline.

## Required API Contracts

The React frontend must consume the existing routes:

- `GET /api/skills`
- `GET /api/ui-schema?skill={skillId}`
- `GET /api/llm-usage`
- `GET /api/config`
- `POST /api/config`
- `DELETE /api/config`
- `POST /api/config/rotate-key`
- `POST /api/test-llm`
- `POST /api/providers/fal/test`
- `POST /api/providers/kie/test`
- `POST /api/providers/wavespeed/test`
- `POST /api/run-skill-stream`

The typed API client must centralize request/response handling and throw sanitized errors.

## Frontend Structure

Target structure:

```text
frontend/
  index.html
  vite.config.ts
  tsconfig.json
  src/
    main.tsx
    App.tsx
    api/
      client.ts
      sse.ts
      types.ts
    components/
      AppShell.tsx
      OutputTabs.tsx
      StatusBadge.tsx
    pages/
      DashboardPage.tsx
      RunSkillPage.tsx
      ConfigPage.tsx
    features/
      config/
      i18n/
      providers/
      skills/
      usage/
    styles/
      app.css
```

The exact file split can vary, but page, API, and feature boundaries must remain clear.

## Security Requirements

- Do not persist new API keys in localStorage.
- Do not display saved API key values returned from backend because backend should return only `hasApiKey`.
- Blank API key input preserves existing encrypted key.
- Provider and LLM test errors must not reveal secrets.
- Config page shows the warning that `.env` and SQLite DB must be backed up together because losing `.env` makes saved keys undecryptable.
- `/api/config` guard behavior remains enforced by backend.
- Vite dev server must bind to local development defaults; do not recommend exposing it to untrusted networks.

## Legacy Migration Requirements

On startup after loading DB config:

1. Read legacy `localStorage.llmConfig`.
2. If marker `llmConfigDbMigrationCompleted=true` exists, sanitize legacy keys and do not migrate.
3. If DB config already has any saved key, sanitize legacy keys, set marker, and do not overwrite DB.
4. If legacy config has API keys and DB has no saved keys, save legacy config via `POST /api/config`.
5. After successful save, sanitize API keys from `localStorage.llmConfig`.
6. Set `llmConfigDbMigrationCompleted=true`.

## UI Requirements

### App Shell

- Work-focused app layout.
- Navigation between Dashboard, Run Skill, and Config.
- Language toggle for Thai/English labels.
- Status state visible without blocking page content.

### Dashboard

- Fetch usage from `/api/llm-usage`.
- Render loading, error, empty, and populated states.
- Show provider, model, count, and last-used time.
- Refresh after successful skill run.

### Config

- Provider cards: NVIDIA, OpenRouter, fal.ai, Kie.ai, WaveSpeedAI.
- API key creation links:
  - NVIDIA: `https://build.nvidia.com/settings/api-keys`
  - OpenRouter: `https://openrouter.ai/settings/keys`
  - fal.ai: `https://fal.ai/dashboard/keys`
  - Kie.ai: `https://kie.ai/api-key`
  - WaveSpeedAI: `https://www.wavespeed.ai/dashboard`
- Mask API key inputs by default.
- Show saved-key placeholders when `hasApiKey=true`.
- Fallback model editor with image-capable model guidance.
- Buttons: Save Config, Clear, Test LLM, Test Provider APIs, Rotate Key.

### Run Skill

- Skill selector lists valid skills and disabled invalid skills.
- Dynamic form renders from `/api/ui-schema`.
- Required fields are validated before run.
- Image uploads are encoded as data URLs, never local paths.
- Execution uses `/api/run-skill-stream`.
- Output tabs: Prompt, JSON, Review.
- Copy and Download JSON commands remain.
- Thai Cats sample appears only for `gpt-image-prompt-engineer`.
- Image model guidance must not appear in Run Skill output.

## Static Serving

- Development: Vite dev server proxies `/api/*` to backend at `http://localhost:4173` by default.
- Production: `server.js` serves `frontend/dist` when `frontend/dist/index.html` exists.
- Migration fallback: if `frontend/dist` is missing, serve current `public/`.
- API routes must be matched before static fallback.
- Never serve `.env`, `data/`, source files, SQLite DB, or repository metadata as frontend static files.

## Verification

Required checks before completion:

- `npm test`
- `npm run typecheck`
- `npm run build`
- Playwright smoke tests:
  - skill dropdown has at least one option
  - Config provider cards visible
  - Config image model guidance visible
  - Run Skill page does not show image model guidance
  - `/api/config` response has no raw key values
