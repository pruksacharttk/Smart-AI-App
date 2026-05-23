# Decisions

- 2026-05-10T11:01:36+07:00 - Archived stale orchestra session state and restarted fresh review session.
- 2026-05-10T11:01:36+07:00 - Kept decision mode at auto_by_default for this review session.
- 2026-05-10T11:01:36+07:00 - Logged incomplete Thai localization as follow-up rather than code change.
- 2026-05-10T11:26:00+07:00 - Completed Thai localization fixes for visible dashboard, config, run skill, and image upload UI copy.
- 2026-05-14T13:45:43+07:00 - Treated product_reference_storyboard image arrays as uploaded image data URLs rather than manually entered URL strings, matching the existing app image-upload payload behavior.
- 2026-05-14T13:45:43+07:00 - Added Auto directly to product_reference_storyboard enum fields so the UI can default to Auto without relying on free-text input.
- 2026-05-14T13:57:30+07:00 - Chose a conservative 1024px max image dimension and JPEG quality 0.72 for vision uploads to reduce payload/token cost while preserving enough visual information for product/reference understanding.
- 2026-05-14T13:57:30+07:00 - Moved image detail preference into the OpenAI-compatible `image_url.detail` field as `low` so compatible providers can use lower-cost image processing.
- 2026-05-14T14:33:48+07:00 - Used schema enum display metadata rather than changing stored enum values, preserving backend compatibility while showing user-friendly dropdown names.
- 2026-05-14T14:33:48+07:00 - For multi-frame storyboard mode, kept textual frame guidance in the generated prompt allowed, but explicitly forbade rendering any visible frame text/descriptions in the generated image.
- 2026-05-14T14:40:45+07:00 - Implemented prompt completeness as an auto-repairing post-processing guard instead of a blocking error, so users receive a usable corrected prompt rather than a failed run when the LLM omits required constraints.
- 2026-05-14T14:40:45+07:00 - Exposed prompt completeness results in output metadata and review data so users can inspect which safeguards were added.
- 2026-05-14T15:36:00+07:00 - Modeled cosmetic product usage as category-specific prompt guard rules instead of hard-coding one product, allowing the skill to infer plausible storyboard actions for many product types.
- 2026-05-14T15:36:00+07:00 - Required category usage checks to include application/handling/result beats, because category-name-only matches would let weak prompts pass without demonstrating real product-use understanding.
- 2026-05-14T16:02:00+07:00 - Added hand anatomy as a required multi-frame storyboard guard because product-use storyboards frequently show close-up hands, and weak hand prompts lead to reversed palms, fused fingers, and implausible wrist rotation.
- 2026-05-14T16:02:00+07:00 - Preferred simpler one-active-hand close-up guidance over only negative anatomy wording, because reducing pose complexity is more reliable for image models than listing defects alone.
- 2026-05-14T19:50:00+07:00 - Let product category checks inspect the generated prompt text because vision-only tests may infer the product category from images without any typed `product_type` input.
- 2026-05-14T19:50:00+07:00 - Split brow mascara from eyelash mascara behavior, because eyebrow mascara uses a mascara-like wand but the correct application target is brow hair, not lashes.
- 2026-05-14T20:04:00+07:00 - Kept product_reference_storyboard focused on cosmetics rather than adding appliance-specific taxonomy, because the strongest product need is cosmetic usage intelligence and broad appliance rules would dilute the skill.
- 2026-05-14T20:18:00+07:00 - Distinguished storyboard overlay text from product packaging text, because product labels and brand markings are part of product fidelity and should not be removed by no-caption storyboard rules.
- 2026-05-14T20:31:00+07:00 - Added multi-variant product consistency as a required guard only when multiple product references are supplied, because cosmetic products often come in different colors/formulas and image generation may otherwise blend them.
- 2026-05-14T20:45:00+07:00 - Split toner/exfoliating acid toner from serum usage, because products labeled essence toner may include the word essence while requiring cotton-pad or thin-layer toner behavior rather than serum dropper behavior.
- 2026-05-14T20:45:00+07:00 - Added acid toner care as a separate guard for glycolic/salicylic/AHA/BHA products so storyboard prompts include realistic avoid-eye/lip/irritated-skin and gentle-use constraints.
- 2026-05-14T21:37:00+07:00 - Added eyeshadow palette as its own cosmetic usage category because palette products need brush/shade/pan/eyelid-result actions rather than generic makeup handling.
- 2026-05-14T21:37:00+07:00 - Generalized product variant consistency wording from bottle-focused details to container/case/palette details so non-bottle cosmetics are not over-constrained incorrectly.
- 2026-05-20T07:11:15+07:00 - Expanded the furniture skill's taxonomy support across 12 specific categories (Seating, Sleeping, Tables, Storage, Office, Dining, Entryway, Bathroom, Outdoor, Kids & Pet, Commercial, Modular/Transformable) with custom 3x3 role grids.
- 2026-05-20T07:11:15+07:00 - Implemented static background anchor locks, ambient shadow rigidity, uniform camera panning vectors, and clothing/pose progression constraints under the Video-Friendly Storyboard Continuity rule to ensure video-ready frame-to-frame flow.
- 2026-05-20T07:11:15+07:00 - Implemented mechanical component lock-in (joinery, reveal gaps, wood grains, textile weave density, brand markings) to guarantee perfect physical detail preservation across frames.
- 2026-05-20T07:24:07+07:00 - Reinforced vertical layout mapping to strictly enforce 9:16 aspect ratio/size as the default canvas ratio when vertical storyboard (ภาพแนวตั้ง) is requested or implied.
- 2026-05-20T07:38:43+07:00 - Mandated zero frame-divider lines, gutters, or borders (Seamless Grid) and strict mathematically identical cell sizing inside skill instructions to enable easy slide/crop automation.
- 2026-05-20T08:15:00+07:00 - Fully aligned cosmatic-reference-storyboard skill with zero-drift face lock, borderless contiguous grid layout, global material anti-hallucination (no imaginary wands/pumps/hardware), and video-friendly cinematic camera/light continuity.
- 2026-05-20T08:42:00+07:00 - Enabled prompt completeness validation and auto-repair checking for the furniture-reference-storyboard skill (in addition to the cosmetic skill). Added the new required `borderless_layout` rule to ensure all vertical grids strictly contain zero white divider lines, borders, or gutters, thus dynamically patching any prompt variations at runtime.
- 2026-05-20T08:52:00+07:00 - Determined that the default 'auto' generation mode was bypassing multi-frame validation and repair because `isMultiFrame` was checked strictly against 'multi_frame_storyboard'. Solved this by dynamically checking if the generation mode is 'auto' or empty, combined with checking if the skill is one of the target storyboard skills or the prompt itself contains multi-panel/storyboard keywords.
- 2026-05-20T08:58:00+07:00 - Restructured the borderless_layout test condition in server.js to require both positive terms and negative constraints, preventing prompts from bypassing grid layout validations. Added a dedicated cabinet_drawer_fidelity rule in server.js to enforce base/leg stance protection and recessed scoop handle preservation for drawers and cabinets, specifically banning the creation of modern tapered legs when a product reference has a flat legless base.


