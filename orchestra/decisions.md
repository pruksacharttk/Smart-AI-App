# Orchestra Decisions

[2026-05-04T00:00:00+07:00] DECISION: Use deep-plan-chain for `specs/002-vite-react-typescript-migration`.
  Context: The task explicitly requested Orchestra with `deep-plan specs/002`, and the migration spans frontend build tooling, React architecture, backend static serving, API contracts, and verification.
  Alternatives considered: Direct implementation, rejected because the user asked for a planning workflow and the existing spec was missing core deep-plan artifacts.

[2026-05-04T00:00:00+07:00] DECISION: Resolve open spec questions with conservative defaults.
  Context: The initial spec had open questions about state library, test stack, i18n storage, build output, and production fallback.
  Decision: Use plain React state/hooks, TypeScript + Playwright smoke tests, typed TS dictionaries for i18n, `frontend/dist` output, and temporary `public/` fallback while migrating.

[2026-04-28T00:00:00Z] DECISION: Use direct edit route.
  Context: The requested change is localized to frontend header/page state and does not require a planning chain.
  Alternatives considered: Multi-agent or quick-plan flow, rejected as unnecessary overhead for a low-risk UI state fix.
