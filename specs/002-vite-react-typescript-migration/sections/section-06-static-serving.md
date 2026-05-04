# Section 06: Static Serving

## Purpose

Update backend static serving so the production app can serve the Vite build while preserving API route behavior and protecting sensitive files.

## Dependencies

Requires Section 01. Can be implemented before all pages reach parity if the old UI fallback remains.

## Scope

Implement:

- Static root selection for Vite build output.
- API route precedence.
- SPA fallback to Vite `index.html`.
- Safe fallback to old `public/index.html` only during migration if configured.
- Documentation of dev and production workflows.
- Sensitive path denial.

## Files To Change

- `server.js`
- `package.json`
- Optional README updates.

## Static Root

Recommended:

```text
frontend/dist
```

The backend should serve `frontend/dist` when it exists after build.

If `frontend/dist/index.html` does not exist during migration, the backend may continue serving `public/`. After final cleanup, this fallback can be removed or documented as rollback behavior.

Optional env override:

```text
FRONTEND_DIST_DIR=frontend/dist
```

## Route Precedence

API routes must be handled before static serving:

- `/api/run-skill`
- `/api/run-skill-stream`
- `/api/test-llm`
- `/api/llm-usage`
- `/api/config`
- `/api/config/rotate-key`
- `/api/providers/:provider/test`
- `/api/skills`
- `/api/ui-schema`

## Security Requirements

- Never serve `.env`.
- Never serve `data/`.
- Never serve SQLite files.
- Never serve source files outside the configured static root.
- Path normalization and traversal protection must remain.
- Config/admin API guard remains unchanged.

## Development Workflow

Document one of:

- Two terminal workflow:
  - `npm run dev:server`
  - `npm run dev:frontend`
- Or a single script using a cross-platform process runner.

Vite dev server proxies `/api/*` to backend.

## Tests And Checks

- Existing backend tests.
- Manual `npm run build`.
- Manual `npm start` after build.
- Check `/api/skills` still returns JSON.
- Check unknown frontend route serves React `index.html`.
- Check `.env` and `data/smart-ai-app.sqlite` are not accessible.
- Check source files and repository metadata are not accessible through static serving.

## Acceptance Criteria

- Production build can be served by `server.js`.
- API behavior remains stable.
- Static serving cannot expose secrets or database files.
