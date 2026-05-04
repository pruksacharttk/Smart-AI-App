# Section 03: App Shell And Dashboard

## Purpose

Build the React application shell and Dashboard page while preserving the dashboard-first workflow.

## Dependencies

Requires Sections 01 and 02.

## Scope

Implement:

- `App` top-level state.
- App shell navigation.
- Dashboard page.
- Language toggle.
- Status display.
- Usage dashboard refresh behavior.
- Independent startup effects for skills and config.

## Files To Change

- `frontend/src/App.tsx`
- `frontend/src/components/AppShell.tsx`
- `frontend/src/components/StatusBadge.tsx`
- `frontend/src/pages/DashboardPage.tsx`
- `frontend/src/features/i18n/*`
- `frontend/src/features/usage/*`
- `frontend/src/styles/app.css`

## Preserve Existing Behavior

- Dashboard is first page.
- Skills and config load independently so a `/api/config` error cannot keep the skill selector empty when `/api/skills` succeeds.
- Left/main navigation remains usable on desktop and mobile.
- Dashboard fetches `GET /api/llm-usage`.
- Empty state displays when no usage rows exist.
- Refresh button remains.
- Usage table/list escapes provider/model text.

## State Requirements

Top-level state should include:

- `activePage`
- `language`
- `status`
- `usageDashboardStale`

Dashboard feature state should include:

- `loading`
- `error`
- `rows`

## UI Requirements

- Operational dashboard layout, no marketing hero.
- Dense but readable table/list.
- No card nesting.
- Responsive and no text overlap.

## Tests And Checks

- Typecheck.
- Manual check Dashboard loading/empty/error states.
- Manual or smoke check that failed config load does not block skill population.
- Existing `/api/llm-usage` tests pass.

## Acceptance Criteria

- React shell can navigate Dashboard, Run Skill placeholder, Config placeholder.
- Dashboard matches current behavior.
- No API keys or prompts are requested or rendered by Dashboard.
