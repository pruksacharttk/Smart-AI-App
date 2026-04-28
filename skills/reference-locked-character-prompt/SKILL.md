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

## Prompt construction checklist
The final prompt should include, when requested:
1. Reference image source-of-truth rule.
2. Character identity lock: face structure, eyes, nose, lips, skin tone, hairstyle, hair color, body proportions, outfit, accessories, shoes, silhouette, and overall appearance.
3. Conservative inference rule for unclear details.
4. Requested sheet content: front/side/back views, expression close-ups, pose variations, detail callouts, color palette swatches, design notes.
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
- 6 full-body pose variations: standing naturally, walking, arms crossed, waving, sitting casually, dynamic action pose
- close-up detail callouts for outfit, accessories, shoes, hairstyle, and unique features
- color palette swatches sampled from the reference images
- small design notes labels
- clean white or light gray character sheet layout

## Required output format
Always output the finished image prompt as plain text only.

The response must start directly with the prompt content, for example:

Create a professional ultra-realistic character breakdown sheet of the same exact character from reference image @img1, shown with strong visual consistency across all views...

Do not wrap the prompt in JSON, quotes, Markdown fences, or explanations.
