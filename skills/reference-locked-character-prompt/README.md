# Reference-Locked Character Prompt Generator

This package defines a plain-text prompt generation skill for creating character-focused image prompts from 1–5 attached reference images.

The skill is designed for workflows where the output prompt must preserve the visible identity, face structure, hairstyle, body proportions, clothing, accessories, color palette, and unique features of a person or character across a professional character sheet or production reference sheet.

## Files

```text
reference-locked-character-prompt-generator/
├── SKILL.md
├── schemas/
│   ├── input.schema.json
│   └── ui.schema.json
├── output.schema.json
└── examples/
    ├── example-input.en.json
    └── example-input.th.json
```

## Output contract

The skill returns only the final prompt as raw plain text.

It does **not** return JSON.

Correct output:

```text
Create a professional ultra-realistic character breakdown sheet of the same exact character from reference image @img1...
```

Incorrect output:

```json
{
  "prompt": "Create a professional..."
}
```

It must not generate images.

## Key features

- Accepts 1–5 attached reference images.
- Uses `@img1`–`@img5` image tokens directly inside the final prompt.
- Supports GPT Image 2, Nano Banana, and general image-model wording.
- Supports Thai, English, Japanese, Korean, Chinese, Spanish, French, German, Portuguese, Indonesian, Vietnamese, Arabic, Hindi, and auto language selection.
- Supports realistic, photorealistic, anime, manga, cartoon, 3D animation, comic, chibi, game concept art, watercolor, pixel art, vector, and auto style selection.
- Preserves facial identity, face structure, eye shape, nose, lips, skin tone, hairstyle, hair color, body proportions, outfit, accessories, shoes, palette, and unique features from reference images.
- Includes conservative inference rules for details hidden or partially unclear in the reference images.

## Output schema change

`output.schema.json` uses root-level string output:

```json
{
  "type": "string",
  "minLength": 1
}
```

This keeps the final response as a normal text prompt instead of:

```json
{
  "prompt": "..."
}
```

## Recommended default

For a realistic character breakdown sheet from one reference image, use `examples/example-input.en.json` or `examples/example-input.th.json` as a starting point.
