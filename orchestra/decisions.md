# Orchestra Decisions

- 2026-05-05: Use inline orchestra execution in standard mode. Reason: sub-agent dispatch is not explicitly requested by the user, and the task can be handled with local inspection and focused edits.
- 2026-05-05: Normalize RJSF-style UI schemas in the server API instead of rewriting only the three new skills. Reason: this fixes the current bug and keeps future imported RJSF-style skills compatible with the app.
- 2026-05-05: Add deterministic local Python runtimes for the three auto cinematic skills. Reason: skill packages should be runnable without requiring external LLM fallback configuration.
- 2026-05-05: Treat schema object/array fields as JSON textareas in the generic React form. Reason: this preserves structured values without building custom editors for every nested schema yet.
- 2026-05-05: Replace JSON textareas with generic structured controls for objects, arrays, lists, and multi-select values. Reason: the user explicitly requested easier input forms, choices where possible, auto mode options, and clear help/examples under each input.
- 2026-05-05: Hide non-essential auto cinematic fields from the quick-start UI and apply backend defaults for omitted values. Reason: users should be able to attach an image and run immediately, then only fill optional guidance when they want more control.
- 2026-05-05: Replace the minimal quick-start layout with balanced editable sections. Reason: the intended UX is ready-to-run defaults plus practical customization controls, not a two-field-only form.
- 2026-05-05: Store the file input element before async file reading and clear that element directly. Reason: React may clear event `currentTarget` before the async handler finishes.
- 2026-05-05: Prefer local runtime for the three auto cinematic skills unless `useLlm=true` is explicitly requested. Reason: these skills now have deterministic local runtimes and should not fail because unrelated LLM fallback configuration is unavailable.
- 2026-05-05: Make image skill runtime emit final prompt text directly by mode. Reason: users need copy-ready generation prompts, not internal package metadata.
