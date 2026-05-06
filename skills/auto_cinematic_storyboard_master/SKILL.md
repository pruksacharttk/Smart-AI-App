---
name: auto_cinematic_storyboard_master
description: Generate complete cinematic story, beat sheet, storyboard, image prompts, start/stop frame prompts, and video prompt packages.
---

# Auto Cinematic Storyboard Master Skill

## Purpose

This unified skill converts a short user story idea into a complete cinematic storyboard package.

It is designed for workflows where the user wants:
- a rewritten / expanded story,
- a shot-by-shot storyboard,
- prompt packages for still images,
- prompt packages for videos,
- a start frame and stop frame for every shot,
- and a cohesive cinematic language from beginning to end.

The intended workflow is:
1. User provides a short synopsis and desired genre/tone.
2. Skill expands the story into a stronger cinematic structure.
3. Skill creates a beat sheet and shot list.
4. For each shot, skill writes:
   - image prompt,
   - start-frame prompt,
   - stop-frame prompt,
   - video prompt.
5. The stop frame of one shot should be usable as the start frame of the next shot.

---

## Core Creative Philosophy

Everything must feel cinematic.

This skill should not create dull coverage, flat “walking with a handheld camera” staging, or repetitive visual grammar unless the user explicitly asks for it.

The default behavior is:
- vary shot scale,
- vary camera angle,
- vary emotional distance,
- include close-ups and detail shots,
- include strong visual hooks,
- give the sequence rhythm and escalation,
- preserve continuity.

---

## Story Expansion Rule

If the user gives only a rough summary, the skill must creatively expand it into a stronger story while remaining faithful to the central idea, genre, and tone.

The skill should:
- invent connective beats,
- add setup, complication, and payoff,
- create visually interesting situations,
- maintain coherence,
- avoid overcomplicating the story.

Example:
User seed: “A neat young woman sneaks to the kitchen at midnight to steal snacks, but a smart cat keeps exposing her.”

The skill may expand that into:
- setup: the house is asleep, she tiptoes out,
- complication: the cat appears,
- escalation: each attempt gets blocked or revealed,
- twist: she finally succeeds but drops everything,
- payoff: she and the cat end up sharing the snack.

---

## Storyboard Design Rule

The storyboard must be designed like a film, not like random independent pictures.

Each shot should have:
- clear story purpose,
- emotional role,
- camera logic,
- action logic,
- transition logic.

The storyboard should alternate between:
- wide/environmental shots,
- medium shots,
- close-ups,
- detail shots,
- high angle / low angle / profile / over-shoulder when useful.

Do not stack too many visually similar shots in a row.

---

## Start / Stop Frame Rule

Every shot must include:
- Start Frame Prompt
- Stop Frame Prompt

These are not optional in the full-story mode.

### Important continuity rule:
The stop frame of shot N should be usable as the start frame of shot N+1 with minimal adaptation.

That means:
- same character identity,
- same wardrobe,
- same environment,
- same prop continuity,
- compatible pose progression,
- compatible camera logic.

### Important non-duplication rule:
Within a single shot, the start frame and stop frame must not be near-duplicates.

They must differ in at least two meaningful axes:
- camera angle,
- camera distance,
- pose,
- body orientation,
- gaze direction,
- composition,
- environment reveal,
- focus target,
- visual emphasis.

Examples:
- start = wide room shot, stop = close face shot
- start = profile pose, stop = front-facing emotional close-up
- start = lace detail, stop = upper-body reveal
- start = low-angle confidence shot, stop = high-angle comic reaction shot

---

## Prompt Output Rule

Each shot must produce four prompt families:

### 1) Image Prompt
Designed for GPT Image 2 or similar still-image generation.

### 2) Start Frame Prompt
A still-image prompt that creates the first frame of the shot.

### 3) Stop Frame Prompt
A still-image prompt that creates the final frame of the shot.

### 4) Video Prompt
Designed for Seedance 2 or similar video generation. It should explicitly describe:
- opening visual state,
- camera motion,
- subject action,
- ending visual state,
- continuity requirements.

---

## Cinematic Coverage Strategy

The skill should prefer visual variation and escalation.

Useful shot roles:
- Establishing wide
- Character introduction medium portrait
- Over-the-shoulder reveal
- Profile shot
- Low-angle emphasis
- High-angle vulnerability or comedy
- Extreme close-up for tension or humor
- Detail shot on props or costume
- Beauty close-up
- Final payoff frame

For comedy:
- time the visual punchline,
- use reaction close-ups,
- contrast wide setups and tight punch-in shots,
- use exaggerated but elegant framing.

For romance:
- use softer lensing,
- intimate close-ups,
- slower motion,
- emotional gaze changes.

For fashion/editorial:
- emphasize wardrobe, silhouette, texture, and strong poses.

---

## Output Package

A strong full output should include:

1. Logline
2. Expanded story
3. Beat sheet
4. Continuity bible
5. Storyboard array
6. Timing plan
7. Master image prompt rules
8. Master video prompt rules
9. Production notes

---

## Quality Checklist

Before finalizing:
- story is coherent,
- beats connect logically,
- shots feel cinematic,
- shot scales vary,
- close-ups and detail shots are used well,
- no boring repetitive coverage,
- start/stop are not duplicates,
- continuity is preserved,
- stop of shot N can lead into start of shot N+1,
- image prompt and video prompt are both usable.
