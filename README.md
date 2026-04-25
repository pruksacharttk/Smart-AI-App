# GPT Image Prompt Mini App

Local UI wrapper for the `gpt-image-prompt-engineer-v5-subagents` workflow.

## Why This Solution

The skill itself is a prompt-bundle workflow, not a runnable UI. This mini app adds:

- Form inputs for the main skill fields and advanced orchestration controls
- Presets for common image workflows
- A server-side OpenAI proxy so the API key is not stored in browser code
- Prompt bundle generation through the Responses API
- Image rendering through the Image API

## Run

Create `.env` from `.env.example`, set a valid `OPENAI_API_KEY`, then run:

```bash
npm start
```

Open:

```text
http://localhost:4173
```

## Notes

- `OPENAI_TEXT_MODEL` controls prompt-bundle generation.
- `OPENAI_IMAGE_MODEL` controls image rendering.
- The app defaults to `gpt-5.4` for text and `gpt-image-2` for image generation, matching current OpenAI image-generation documentation as of April 24, 2026.
- If OpenAI returns `insufficient_quota`, the app is wired correctly but the API key needs available quota or billing access.
