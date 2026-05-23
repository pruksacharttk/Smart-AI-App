# Orchestra Plan

## Task
Review UI completeness across all frontend pages.

## Classification
- scope: medium
- risk: low
- affected_domains: frontend UI, shared shell/styles
- estimated_file_count: 6
- chosen_route: direct review
- task_summary: Inspect Dashboard, Run Skill, and Config for layout, completeness, and state coverage.
- bug_route: false

## Task Classification
- Scope: medium
- Risk: low
- Affected domains: frontend UI, shared shell/styles
- Estimated file count: 6
- Chosen route: direct review
- Bug route: false
- Classification notes: Three user-facing pages plus shared shell/styles. Review-only work, no code change requested.

## Task
Update product_reference_storyboard form inputs so image fields support drag/drop upload and choice-capable fields use select controls with Auto.

## Task Classification
- Scope: small
- Risk: low
- Affected domains: frontend form UI, server schema normalization, skill schemas
- Estimated file count: 6
- Chosen route: single-agent direct implementation
- Bug route: false
- Classification notes: The request affects one skill schema and the existing schema-driven form renderer. No auth, persistence, or external integration changes were needed.

## Task
Reduce image upload token/payload usage by optimizing reference images before sending them to vision LLMs.

## Task Classification
- Scope: small
- Risk: medium
- Affected domains: frontend image upload pipeline, server multimodal payload construction
- Estimated file count: 2
- Chosen route: single-agent direct implementation
- Bug route: false
- Classification notes: The change modifies how uploaded image data is serialized and sent to LLM providers. No auth or persistence changes, but runtime payload behavior changes enough to treat risk as medium.

## Task
Make product_reference_storyboard generation mode choices readable and prevent multi-frame storyboard prompts from requesting visible frame descriptions.

## Task Classification
- Scope: small
- Risk: low
- Affected domains: skill schema, server schema normalization, LLM prompt instructions
- Estimated file count: 3
- Chosen route: single-agent direct implementation
- Bug route: false
- Classification notes: The change is limited to UI option labels and prompt guidance for one skill. No persistence, auth, or provider configuration changes.

## Task
Add a prompt completeness check before product_reference_storyboard returns its final output.

## Task Classification
- Scope: small
- Risk: low
- Affected domains: server LLM result normalization, test coverage
- Estimated file count: 2
- Chosen route: single-agent direct implementation
- Bug route: false
- Classification notes: The change adds a post-processing quality guard for one skill and includes focused unit tests. No auth, persistence, or provider configuration changes.

## Task
Expand product_reference_storyboard testing and prompt safeguards so cosmetic products generate realistic usage-oriented storyboard prompts across multiple product categories.

## Task Classification
- Scope: small
- Risk: low
- Affected domains: server prompt post-processing, product_reference_storyboard skill instructions, unit tests
- Estimated file count: 3
- Chosen route: single-agent direct implementation
- Bug route: false
- Classification notes: The work extends existing prompt completeness logic with category-specific cosmetic usage checks and focused tests. No API contract, auth, storage, or provider integration changes.

## Task
Add hand anatomy safeguards to product_reference_storyboard prompts to reduce reversed hands, unnatural wrist rotation, fused fingers, and unrealistic product grips.

## Task Classification
- Scope: small
- Risk: low
- Affected domains: server prompt post-processing, product_reference_storyboard skill instructions, unit tests
- Estimated file count: 3
- Chosen route: single-agent direct implementation
- Bug route: true
- Classification notes: This is a prompt-quality defect fix based on generated storyboard output. The fix adds auto-repair validation and skill guidance without changing API contracts or persistence.

## Task
Test product_reference_storyboard with a beach character, eyebrow mascara product, and luxury walk-in closet environment, then patch any discovered category inference issues.

## Task Classification
- Scope: small
- Risk: low
- Affected domains: product_reference_storyboard prompt checks, skill instructions, unit tests
- Estimated file count: 3
- Chosen route: single-agent direct implementation
- Bug route: true
- Classification notes: The test uncovered a prompt-quality classification edge case where eyebrow mascara could also activate eyelash mascara rules. The fix narrows mascara handling and lets category checks use inferred prompt text.
