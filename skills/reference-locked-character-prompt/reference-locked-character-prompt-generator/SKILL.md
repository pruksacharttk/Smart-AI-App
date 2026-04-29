# Reference-Locked Character Prompt Generator

## Purpose
Generate a high-quality plain-text image-generation prompt from 1–5 attached reference images, with strong emphasis on preserving the same character identity, facial structure, hairstyle, body proportions, outfit, accessories, color palette, and distinctive visual details.

This skill outputs prompt text only. It must never generate, edit, or render images.

## Primary behavior
When invoked, inspect the provided reference images and the structured input that conforms to `schemas/input.schema.json`.

Return only the final image-generation prompt as raw plain text, conforming to `output.schema.json`.

Do not return:
- JSON
- Markdown code fences
- a `prompt` key
- explanatory notes before or after the prompt
- image-generation tool calls
- generated images

Correct output style:

Create a professional ultra-realistic character breakdown sheet of the same exact character from reference image @img1...

Incorrect output style:

```json
{
  "prompt": "Create a professional..."
}
```

## Image reference rules
- Accept between 1 and 5 image references.
- Use the image IDs exactly as provided, such as `@img1`, `@img2`, `@img3`, `@img4`, and `@img5`.
- If only one reference image is provided, treat it as the single source of truth.
- If multiple reference images are provided, use the image with role `primary_identity` as the identity anchor.
- Use secondary images only for the roles specified in the input: outfit details, facial detail, pose style, accessories, hairstyle, color reference, or environment style.
- Do not invent identity, clothing, accessories, hairstyle, body type, facial structure, or palette details beyond what is visible or conservatively inferable from the references.
- If reference images conflict with written instructions, follow `conflict_priority` from the input. The recommended default is `reference_image_over_text`.

## Real-person and likeness handling
- The skill may describe visible attributes from provided references for the purpose of creating a fictional or production character prompt.
- Do not identify, name, authenticate, or infer private or sensitive identity information about a real person.
- Do not add claims about nationality, ethnicity, religion, politics, medical status, or other sensitive attributes unless the user explicitly supplied them as fictional character metadata and they are necessary for the creative prompt.
- Preserve visible appearance without making identity claims.

## Output language
Write the generated prompt in the requested `output_language`.

Supported language codes:
- `th` Thai
- `en` English
- `ja` Japanese
- `ko` Korean
- `zh` Chinese
- `es` Spanish
- `fr` French
- `de` German
- `pt` Portuguese
- `id` Indonesian
- `vi` Vietnamese
- `ar` Arabic
- `hi` Hindi
- `auto` choose the best language from the user request

Keep image reference tokens such as `@img1` unchanged in every language.

## Style selection
Use `style_family` from the input:
- If `style_family` is `auto`, infer the best style from the reference images and the requested purpose.
- If the reference is a real photo or realistic human image, default to realistic or ultra-realistic character presentation.
- If the reference is cartoon, anime, manga, stylized, 3D, chibi, watercolor, comic, or pixel art, match that visual family unless the user explicitly requests otherwise.
- Never force cartoon stylization when the input requests realistic or no cartoon stylization.

## Target model adaptation
Use `target_model` to tune wording, while still returning only prompt text:
- `gpt_image_2`: use clear natural language, strong reference-lock wording, explicit layout, and detailed consistency instructions.
- `nano_banana`: use concise but strict image-reference wording, direct constraints, and explicit no-redesign instructions.
- `auto`: create a model-neutral prompt suitable for modern image generators.

Do not include API code or tool-call instructions.

## Action pose randomization
Use the action fields in the input to create varied pose panels while preserving the same character identity.

- `action_category` selects the action pool: `posing_eye_contact`, `movement_dynamics`, `emotional_actions`, `interactions`, or `mixed`.
- `action_selection_mode` controls how actions are chosen. When it is `random` or `auto`, use `selected_action_prompts` from the app as the action list for this run.
- `selected_action_prompts` is the authoritative randomized list. Include those actions as pose variations or action panels.
- If `custom_action_prompts` is provided, blend those into the action choices; if `custom_only`, use only custom actions.
- Every action must preserve the same face, hairstyle, body proportions, outfit, accessories, shoes, silhouette, and color palette from the references.
- Do not let dynamic movement cause identity drift, costume redesign, extra limbs, duplicated poses, or unrelated props.

## K-pop choreography instruction sheet
When `task_type` is `kpop_dance_sequence_sheet` or `choreography_preset` is `kpop_4x4_instruction_sheet`, generate a prompt for a professional dance-sequence instruction sheet.

- Use `reference_identity_anchor` or the primary reference image, usually `@img1`, as the base dancer identity in every panel.
- The same single female dancer must appear consistently across all frames with the same likeness, face structure, hairstyle, body proportions, silhouette, outfit identity, accessories, and shoes from the attached reference image.
- Use a clean 4x4 grid for 16 frames when requested. Panels must be evenly sized, separated by thin black divider lines, and numbered clearly from 1 to 16.
- Visual style: high-detail 3D grayscale rendering, professional choreography design manual, diagram-inspired layout, clean white background, soft studio lighting, strong contrast, polished concept-art clarity.
- Each frame must contain: top-left step number plus a short dance move name, centered full-body pose capturing one precise choreography moment, bottom-left 3-4 concise instruction lines, and motion overlays.
- Motion overlays should include curved arrows for flowing movement, straight arrows for directional steps, circular indicators for spins or turns, weight-transfer markers, and body-isolation guide lines.
- Wardrobe may be performance-ready K-pop styling only when requested, but it must stay compatible with the reference identity and must not change the character's face, proportions, or core recognizable outfit traits unless the user explicitly allows it.
- Restrictions: no color, no background scene, no additional characters, no clutter, no unrelated props, only the dancer and instructional elements.

## Prompt construction checklist
The final prompt should include, when requested:
1. Reference image source-of-truth rule.
2. Character identity lock: face structure, eyes, nose, lips, skin tone, hairstyle, hair color, body proportions, outfit, accessories, shoes, silhouette, and overall appearance.
3. Conservative inference rule for unclear details.
4. Requested sheet content: front/side/back views, expression close-ups, randomized action pose variations from `selected_action_prompts`, choreography sequence panels when requested, detail callouts, color palette swatches, design notes.
5. Style requirements.
6. Layout requirements.
7. Consistency requirements.
8. Negative constraints: no redesign, no extra characters, no duplicated pose, no changed color palette, no unrelated costume changes, no identity drift.
9. Conflict priority rule.

## Character sheet defaults
When `task_type` is `character_breakdown_sheet` and no custom list is given, include:
- 1 full-body front view
- 1 full-body side view
- 1 full-body back view
- 3 facial expression close-ups: neutral, slight smile, serious
- 4-8 full-body randomized action pose variations selected from posing and eye contact, movement and dynamics, emotional actions, and interactions with objects or the environment
- close-up detail callouts for outfit, accessories, shoes, hairstyle, and unique features
- color palette swatches sampled from the reference images
- small design notes labels
- clean white or light gray character sheet layout

## Required output format
Always output the finished image prompt as plain text only.

The response must start directly with the prompt content, for example:

Create a professional ultra-realistic character breakdown sheet of the same exact character from reference image @img1, shown with strong visual consistency across all views...

Do not wrap the prompt in JSON, quotes, Markdown fences, or explanations.
