---
name: video_storyboard_grok_prompt
description: Generate Thai long-form video storyboard prompts for Grok or video generation workflows, including fixed 10-second shots, Phase 1/Phase 2 prompt blocks, Thai dialogue, audio rules, character continuity locks, repeated Story Bible markers, and validation.
---

# Thai Video Storyboard Prompt Skill

## Purpose

Generate video prompts for a long-form storyboard in Thai. The skill creates a consistent sequence of shots where every shot is exactly 10 seconds long and every shot prompt repeats the same Story Bible verbatim to preserve continuity from start to finish.

## Required Inputs

- `shot_count`: number of shots to create
- `video_type`: type of video
- `main_character`: primary character description
- `setting`: story setting
- `story_bible`: canonical continuity bible that must be repeated exactly in every prompt
- `plot_summary`: the overall story arc

Optional inputs include genre, style, lighting, aspect ratio, music, voice tone, ambient sound, forbidden elements, and a shot outline.

## Mandatory Structure

Every generated prompt must include all of the following blocks.

### Phase 1

1. `HEADER` — video type + duration + character + setting
2. `WORKFLOW block` — must storyboard first before clip generation
3. `CHARACTER LOCK` — prevent phantom hands, unwanted extra people, second-person POV, character drift
4. `AUDIO RULE` — every clip must have sound, lip-sync, and voiceover when dialogue exists
5. `PRODUCTION SPECS` — duration, style, lighting, camera continuity, aspect ratio
6. `THE N SCENES` — the exact number of shots, varied shot types, and Thai dialogue
7. `AUDIO global` — music, voice tone, ambient sound

### Phase 2

1. `LANGUAGE LOCK` — Thai voice only; do not translate Thai dialogue into English
2. `AUDIO RULE` — audio requirements for every clip
3. `GENERATE N CLIPS instruction` — generate exactly N clips
4. `THAI DIALOGUE PER CLIP` — Thai dialogue for each clip with `(เสียงไทย)` marker
5. `GLOBAL AUDIO MIX` — voice + music + ambient balance
6. `CHARACTER LOCK reminder` — reinforce character and visual continuity

## Story Bible Rule

- Wrap the Story Bible in these exact markers:
  - `<<<STORY_BIBLE_START>>>`
  - `<<<STORY_BIBLE_END>>>`
- The content between markers must be byte-for-byte identical in every shot prompt.
- Do not paraphrase or summarize the Story Bible per shot.
- Do not translate the Story Bible unless the user explicitly provides a translated Story Bible.

## Output Rule

Return JSON matching `schemas/output.schema.json`. Include:

- `master_prompt_phase_1`
- `master_prompt_phase_2`
- `shot_prompts`
- `validation`

Run or mirror the validator logic before finalizing the output. If validation fails, revise the prompts until every shot contains the identical Story Bible and required blocks.
