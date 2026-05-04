# Section 05: Run Skill Page

## Purpose

Rebuild the dynamic skill runner in React while preserving schema-driven forms, image uploads, local runtime execution, LLM fallback execution, and output behavior.

## Dependencies

Requires Sections 01, 02, and 03.

## Scope

Implement:

- Skill selector.
- Dynamic schema form renderer.
- Required validation.
- Image upload controls.
- Run/reset/sample buttons.
- SSE run flow.
- Output tabs.
- Review renderer.
- Copy and Download JSON.

## Files To Change

- `frontend/src/pages/RunSkillPage.tsx`
- `frontend/src/features/skills/*`
- `frontend/src/components/OutputTabs.tsx`
- `frontend/src/components/ImageUploadField.tsx`
- `frontend/src/styles/app.css`

## Preserve Existing Behavior

- `/api/skills` populates valid and invalid skills.
- Invalid skills appear disabled with reason in title/text.
- Skill selector must not stay visually empty after successful `/api/skills`.
- `/api/ui-schema?skill=...` drives form rendering.
- If no local runtime and no configured LLM, user sees the no-runtime message.
- `POST /api/run-skill-stream` is used for execution.
- SSE status events update LLM/runtime status.
- Local runtime execution metadata displays correctly.
- `lastSuccessfulLlm`, `usageRecorded`, and fallback errors remain visible in JSON output.
- Dashboard usage is marked stale after successful run.

## Dynamic Form Requirements

Support existing field types:

- input
- textarea
- select
- boolean checkbox/toggle
- number
- JSON/array/object input
- image upload fields

Image upload requirements:

- Accept image files only.
- Encode to data URLs.
- Support single and multi-image fields.
- Preserve thumbnail display and remove action.
- Do not send local/private paths to LLM.

## Sample Button

- Thai Cats Sample appears only for `gpt-image-prompt-engineer`.
- It fills the same payload as current UI and starts run if current behavior does.

## Output Requirements

- Prompt tab.
- JSON tab.
- Review tab.
- Copy active output.
- Download JSON.
- No image model guidance box under Prompt output.

## Tests And Checks

- Typecheck.
- Smoke test skill dropdown has at least one option.
- Smoke test selecting a skill renders form.
- Smoke test Run Skill page does not show image model guidance.
- Smoke test app has no console `ReferenceError` during initial load and skill selection.
- Manual test image upload field.
- Manual test local runtime skill.
- Manual test LLM-only skill with configured model.

## Acceptance Criteria

- Run Skill page reaches feature parity with current UI.
- Skill dropdown regression is covered by a smoke test.
- Missing frontend helper errors are prevented by TypeScript build.
