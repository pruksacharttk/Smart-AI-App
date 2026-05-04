# Interview Notes: Vite React TypeScript Migration

No live user interview was required during this planning pass. The initial spec already states the business goal, required providers, security constraints, and migration behavior. The remaining open questions can be resolved with conservative implementation defaults.

## Planner Decisions

### State Management

Use plain React state, context, reducers, and feature hooks first. Do not introduce Zustand, Redux, Jotai, or another state library in the migration baseline. The current app's state is important but not yet large enough to justify extra dependency surface.

### Frontend Tests

Use two layers:

- TypeScript compile gate: `npm run typecheck`
- Browser smoke gate: Playwright

Do not require Vitest + Testing Library in the baseline unless helper logic becomes awkward to test through Playwright. Pure helper functions may use Node's built-in test runner if they do not depend on DOM APIs.

### Localization

Keep bilingual text in typed TypeScript dictionaries for this migration. Move to JSON/resource files only after the React app is stable or if copy grows enough to require translator-friendly assets.

### Build Output

Use `frontend/dist` as Vite build output. This keeps generated frontend assets scoped under `frontend/` and makes backend static serving explicit.

### Production Start Behavior

`npm start` should continue to run `server.js`. In production static serving, prefer `frontend/dist` if it exists. During the migration window, fall back to `public/` only if `frontend/dist/index.html` does not exist. Final cleanup may remove the fallback after smoke tests pass and the user accepts the React cutover.

### Development Workflow

Use separate scripts:

- `npm run dev:server`
- `npm run dev:frontend`

Optionally add a combined `npm run dev` only if the implementation adds a small cross-platform runner dependency. Do not rely on shell-specific `&` behavior.

## Non-Negotiable Carryovers

- Config API secret responses remain masked.
- Legacy localStorage API keys migrate once, are sanitized, and never overwrite DB-saved keys.
- Config loading failures must not block skill loading.
- Image-capable model guidance belongs on Config, not Run Skill output.
- Provider-key test results must never echo secrets.
- Backend API response shapes remain stable unless changes are additive.
