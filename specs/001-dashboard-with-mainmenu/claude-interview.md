# Interview Transcript: Dashboard With Main Menu

## Interview Mode

The user explicitly asked the planner to make the best implementation decisions without waiting for repeated confirmation. The following decisions resolve the open questions from the initial spec and become binding requirements for the implementation plan.

## Decisions

### 1. Successful Usage vs Failed Attempts

Decision: Store only successful LLM usage in v1.

Rationale:

- The dashboard requirement is "จำนวนการเรียกใช้งาน" by provider/model, and the safest interpretation for an initial operational dashboard is successful usage.
- Counting failed fallback attempts in the same table would confuse model popularity with model failure frequency.
- Failure analytics can be added later as a separate table and dashboard view if needed.

Requirement:

- Only the provider/model that actually returns a successful LLM result increments usage count.
- Failed fallback attempts must not increment `llm_usage.usage_count`.
- The implementation must not create a failed-attempt table in this feature.

### 2. Reset Usage Button

Decision: Do not add a Reset Usage button in v1.

Rationale:

- Reset is destructive and introduces extra security/UX requirements.
- The current feature is dashboard visibility, not analytics management.
- Avoiding reset reduces accidental data loss and narrows implementation risk.

Requirement:

- Dashboard v1 is read-only.
- Do not implement a reset endpoint.
- Do not implement destructive dashboard controls.

### 3. SQLite Database Path

Decision: Use `data/smart-ai-app.sqlite`.

Rationale:

- The path is deterministic and easy to inspect locally.
- It is outside `public/`, so it cannot be served as a static file.
- It works with the local-first app model.

Requirement:

- Create `data/` automatically if missing.
- Add `data/` to `.gitignore`.
- Do not commit the SQLite database file.

### 4. Config Page vs Modal

Decision: Move Config out of the modal and into a full page. Keep the existing topbar Config button only as a navigation shortcut to the Config page.

Rationale:

- The requested dashboard shell should have a real Config menu item.
- A full page is easier to scan and maintain than a modal for provider/API key/fallback setup.
- Preserving the topbar Config button as a shortcut reduces user friction without keeping duplicate modal behavior.

Requirement:

- The left menu must include Config.
- The topbar Config button should navigate to the Config page.
- The modal overlay should be removed or left unused only if removal would create unnecessary risk; the final UI should not require opening a modal for normal Config work.

## Final Scope Clarifications

- Keep API keys in browser localStorage for this feature.
- Do not add authentication.
- Do not introduce a remote database.
- Do not store prompts, generated outputs, uploaded images, API keys, raw provider request bodies, or raw provider responses in SQLite.
- Preserve existing Run Skill behavior and existing LLM fallback behavior.
