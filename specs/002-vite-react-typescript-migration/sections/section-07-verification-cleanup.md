# Section 07: Verification And Cleanup

## Purpose

Verify React migration parity, add regression checks, and remove obsolete inline UI only after the migrated frontend is proven stable.

## Dependencies

Requires Sections 03, 04, 05, and 06.

## Scope

Implement:

- Typecheck in regular verification flow.
- Browser smoke tests.
- Manual QA checklist.
- Cleanup of obsolete inline UI.
- Documentation updates.

## Files To Change

- `package.json`
- `test/` or `frontend/tests/`
- `README.md` and/or `Readme-TH.md`
- Remove or archive old `public/index.html` only after verified.

## Required Automated Checks

- `npm test`
- `npm run typecheck`
- `npm run build`
- Browser smoke test command if added.
- No browser console `ReferenceError` on initial load or skill selection.

## Required Smoke Tests

Minimum browser-level checks:

1. Load app home page.
2. Assert no console errors.
3. Assert skill dropdown has at least one option.
4. Navigate to Config.
5. Assert provider cards for NVIDIA, OpenRouter, fal.ai, Kie.ai, WaveSpeedAI.
6. Assert image model guidance is visible on Config.
7. Navigate to Run Skill.
8. Assert image model guidance is not visible under Prompt output.
9. Fetch `/api/config` and assert provider `apiKey` values are empty strings.
10. Assert Dashboard loads without exposing prompt or secret fields.

## Manual QA Checklist

- Save config with a test key.
- Reload page and confirm key is shown as saved placeholder, not plaintext.
- Leave key blank and save; existing saved key remains.
- Rotate encryption key; existing saved key remains usable.
- Test LLM with a valid configured key.
- Test provider APIs with valid keys.
- Legacy localStorage migration:
  - seed old `llmConfig` with keys
  - load app
  - verify DB has saved key status
  - verify localStorage API key values are removed
  - verify marker blocks second migration
- Run local runtime skill.
- Run LLM-only skill.
- Upload image field and run with image-capable model.
- Mobile viewport check.

## Cleanup Rules

- Do not delete old static UI until automated and manual checks pass.
- Remove duplicate CSS/JS only after React page parity.
- Preserve backend tests and security tests.
- Keep `.env.example` current.
- Keep `.gitignore` protecting `.env` and `data/`.

## Acceptance Criteria

- React frontend fully replaces old inline script UI.
- No known console errors on load.
- Skill dropdown regression is covered.
- Config secret privacy is covered.
- The old UI is removed or explicitly retained as fallback with clear documentation.
