# Section 06: Config Page

## Purpose

Move LLM provider configuration from modal into a full `Config` page while preserving existing localStorage and Test LLM behavior.

## Dependencies

Requires Section 03 app shell.

## Scope

Implement:

- Config page container.
- Existing provider cards in-page.
- Existing fallback order controls in-page.
- Config button navigation.
- Removal or deactivation of modal dependency.

## Files To Change

- `public/index.html`

## Preserve Existing Behavior

Keep:

- `llmConfig` localStorage key and shape.
- NVIDIA NIM API key and base URL fields.
- OpenRouter API key and base URL fields.
- password masking by default.
- Show/Hide secret buttons.
- fallback rows 1-4.
- model dropdowns and custom model option.
- image support labels in model dropdown.
- Save Config.
- Clear Config.
- Test LLM and result rows.
- language switching for labels/buttons.

## Navigation

- Left menu Config item shows Config page.
- Topbar Config button navigates to Config page.
- Normal Config usage must not require a modal.

## DOM Refactor Notes

Avoid maintaining two copies of Config controls. Prefer moving existing modal contents into the page. If a temporary modal wrapper remains, it should not be part of the normal user flow and should not cause duplicate IDs.

## Tests And Checks

- Check existing saved `llmConfig` still loads.
- Check Save Config writes same localStorage shape.
- Check Clear Config resets to default fallback order.
- Check Test LLM displays row-level OK/FAIL/SKIP.
- Check API keys are masked by default.
- Check Show/Hide works.
- Check language toggle updates Config copy.
- Check no duplicate IDs exist after moving modal content.

## Acceptance Criteria

- Config is available as a full page.
- Existing config data remains compatible.
- Test LLM still works.
- API keys are not exposed outside intended inputs.

## Implemented

- Added Config page container.
- Existing Config panel is moved from the modal container into the Config page at startup.
- Topbar Config button navigates to Config page.
- Existing `llmConfig` localStorage behavior, Test LLM, Save, Clear, and secret toggle logic are preserved.
