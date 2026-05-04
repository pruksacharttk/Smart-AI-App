# Section 04: Config Page

## Purpose

Rebuild the Config page in React with encrypted config storage, LLM fallback setup, key rotation, provider tests, and legacy migration preserved.

## Dependencies

Requires Sections 01, 02, and 03.

## Scope

Implement:

- Provider key cards.
- LLM fallback order editor.
- Model dropdowns and custom model fields.
- Save, Clear, Test LLM, Test Provider APIs, Rotate Key.
- API key setup guide.
- Image model guidance on Config page.
- DB + `.env` backup warning.
- One-time browser-local key migration.

## Files To Change

- `frontend/src/pages/ConfigPage.tsx`
- `frontend/src/features/config/*`
- `frontend/src/features/providers/*`
- `frontend/src/features/i18n/*`
- `frontend/src/styles/app.css`

## Provider Cards

Required providers:

- NVIDIA NIM
- OpenRouter
- fal.ai
- Kie.ai
- WaveSpeedAI

Each card must include:

- API key input masked by default.
- Show/Hide toggle.
- Base URL input.
- Provider-specific key creation link where relevant.
- Saved key placeholder when `hasApiKey=true`.

## Guide Links

- NVIDIA: `https://build.nvidia.com/settings/api-keys`
- OpenRouter: `https://openrouter.ai/settings/keys`
- fal.ai: `https://fal.ai/dashboard/keys`
- Kie.ai: `https://kie.ai/api-key`
- WaveSpeedAI: `https://www.wavespeed.ai/dashboard`

## Image Model Guidance

The image model guidance must appear in Config near fallback order and must not appear in Run Skill output.

Recommended models:

- `qwen/qwen3-vl-32b-instruct`
- `qwen/qwen3-vl-8b-instruct`
- `qwen/qwen3-vl-235b-a22b-instruct`
- `qwen/qwen3.5-35b-a3b`
- `qwen/qwen3.5-plus-02-15`
- `qwen/qwen3.5-397b-a17b`

## Security Requirements

- Never display returned secret values because backend must not return them.
- Blank API key input preserves existing saved key.
- `Rotate Key` must confirm before calling the API.
- Warning must state that `.env` and SQLite DB must stay together.
- Provider API test result must not reveal API keys.

## Legacy Migration

Run after `getConfig()`:

- If `llmConfigDbMigrationCompleted=true` already exists, sanitize legacy API key values and do not migrate.
- If legacy localStorage has API keys and DB has no saved key, save legacy config to DB.
- If DB has saved keys, do not overwrite them.
- Sanitize API key values from localStorage after either migration or skip.
- Set `llmConfigDbMigrationCompleted=true` after a successful migration or safe skip.

## Tests And Checks

- Typecheck.
- Unit/helper tests for migration marker, sanitization, and overwrite prevention.
- Smoke test Config page renders all provider cards.
- Smoke test image guidance appears on Config.
- Smoke test `/api/config` response has no API key values.
- Manual test Rotate Key with saved test key.

## Acceptance Criteria

- Config page reaches feature parity with current UI.
- Encrypted storage behavior remains.
- Provider test endpoints are reachable through UI.
- No localStorage storage of new API key values.
