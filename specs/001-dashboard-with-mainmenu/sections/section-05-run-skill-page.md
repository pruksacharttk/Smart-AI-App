# Section 05: Run Skill Page

## Purpose

Move the existing skill runner into the `Run Skill` page while preserving current behavior.

## Dependencies

Requires Section 03 app shell.

## Scope

Refactor DOM placement and navigation only. Avoid changing existing skill execution semantics unless needed for Dashboard stale refresh.

## Files To Change

- `public/index.html`

## Preserve Existing Behavior

Keep:

- skill list loading
- skill select
- schema loading
- dynamic form rendering
- image upload controls and previews
- `buildPayload()`
- streaming run flow
- top and bottom Run Skill buttons
- Reset and sample behavior
- Prompt/JSON/Review tabs
- copy and download JSON
- LLM status messages
- image model guidance under Prompt output
- language switching

## Dashboard Interaction

After successful `runSkill()`:

- keep user on Run Skill page
- render output exactly as before
- mark Dashboard usage data stale
- if Dashboard is active for any reason, refresh immediately

## Tests And Checks

- Check Run Skill page loads and renders selected skill schema.
- Check form values survive switching to Dashboard and back.
- Check uploaded image previews survive page switching.
- Check both Run Skill buttons trigger same flow.
- Check Reset clears form as before.
- Check sample behavior remains unchanged.
- Check output tabs still switch correctly.
- Check LLM status events still render.

## Acceptance Criteria

- Existing Run Skill workflow remains usable from the Run Skill menu item.
- No request payload compatibility is broken.
- Dashboard integration does not interrupt skill runs.

## Implemented

- Moved the existing Run Skill layout into the Run Skill page container.
- Preserved top and bottom action buttons, output tabs, LLM status, copy/download, and image model guidance.
- Successful run now marks dashboard usage data stale without navigating away.
