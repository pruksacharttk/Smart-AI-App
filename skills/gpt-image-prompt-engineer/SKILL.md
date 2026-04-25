---
name: gpt-image-prompt-engineer
description: Build model-free multilingual GPT Image prompt bundles for generation and editing, with user-locked parameters, deliverable-specific auto choices, reference-image fidelity rules, final safety/quality review, and optional review-module reports compatible with subagent orchestration.
---

# GPT Image Prompt Engineer

Version 5.5.0. Use the Python entrypoint `python/skill.py`; the deterministic core lives in `src/gpt_image_prompt_engineer`.

Runtime metadata and defaults are recorded in `skill.lock.json`. Use `scripts/run_prompt_flow.py` for package-level execution and `scripts/verify.sh` for the bundled verification workflow when a shell environment supports it.

Key guarantees:

- The skill is model-free; callers add the image model externally.
- `response_mode=text_prompt` returns only final-reviewed prompt text.
- `response_mode=json_bundle` returns prompts, `locked_user_params`, auto decision trace, safety review, final review, review-module reports, conflict resolution, reference preflight, and render parameters.
- Deliverable-specific profiles cover posters, social/story posts, presentation slides, product and packaging mockups, storyboards, and other supported image formats.
- Explicit user-supplied values are recorded as locked parameters and must not be overridden by `auto` decisions.
- `final_review` repairs unsafe/high-risk wording before output, reinforces reference fidelity and storyboard continuity, and reports missing inputs plus clarifying questions.
- Real product/place workflows require factual reference grounding through `verified_reference_facts` and `reference_sources`; those references may supplement but never replace user-provided details.
- The native runtime is deterministic and model-free; review-module reports do not call an LLM unless a host application deliberately replaces them with external agents-as-tools.
