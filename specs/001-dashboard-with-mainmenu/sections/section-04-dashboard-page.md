# Section 04: Dashboard Page

## Purpose

Implement the Dashboard page that displays successful LLM usage counts from `/api/llm-usage`.

## Dependencies

Requires:

- Section 02 backend API.
- Section 03 app shell.

## Scope

Implement:

- Fetching usage data.
- Empty state.
- Error state with retry.
- Populated usage table/list.
- Summary counts.
- Safe rendering with `textContent`.
- Refresh/stale behavior after successful runs.

## Files To Change

- `public/index.html`

## Dashboard Data Flow

Add frontend functions equivalent to:

```text
loadUsageDashboard()
renderUsageDashboard(rows)
renderUsageDashboardEmpty()
renderUsageDashboardError(error)
markUsageDashboardStale()
```

Fetch usage:

- on app init
- when navigating to Dashboard
- after successful Run Skill if Dashboard is active
- on next Dashboard navigation if marked stale

## Display Requirements

Show:

- total successful LLM calls
- number of distinct provider/model rows
- table/list rows sorted by API response order

Each row:

- rank
- provider
- model
- usage count
- latest used timestamp

Empty state:

- clear message that no successful LLM usage has been recorded yet.

Error state:

- safe generic message
- retry button

## Security Requirements

- Render provider/model using `textContent`.
- Do not insert provider/model into raw `innerHTML`.
- Do not display API keys, prompts, generated outputs, image data, or raw provider payloads.

## Tests And Checks

- Check empty API response renders empty state.
- Check populated response renders rows correctly.
- Check provider/model values are assigned safely.
- Check error response renders retry state.
- Check successful Run Skill updates Dashboard when returning to Dashboard.
- Check table remains readable at mobile width.

## Acceptance Criteria

- Dashboard works as the first page.
- Usage rows are clear and sorted by backend order.
- No sensitive data is displayed.
- Dashboard can be refreshed manually or automatically through navigation.

## Implemented

- Added Dashboard metrics for total successful calls and provider/model row count.
- Added empty, error, retry, and populated table states.
- Dashboard fetches `/api/llm-usage`.
- Provider/model values are rendered through `textContent`.
- Successful Run Skill marks Dashboard stale and refreshes it when appropriate.
