# Auto Cinematic Storyboard Master Skill v1.0.0

This package combines story generation + storyboard design + image prompt generation + video prompt generation into one skill.

## What it does

From a short user story seed and optional reference images, the skill can generate:

- Expanded story
- Beat sheet
- Continuity bible
- Full storyboard
- Image prompt for each shot
- Start frame prompt for each shot
- Stop frame prompt for each shot
- Video prompt for each shot
- Timing plan
- Production notes

## Main idea

The user may give only:
- a short story summary,
- a genre,
- a tone,
- optional reference images,
- target runtime,
- target shot count,
- aspect ratios.

The skill then expands the story and writes the full cinematic package.

## Important workflow

For each shot:
- start frame prompt = opening frame
- stop frame prompt = ending frame
- video prompt = animated shot from start to stop
- stop frame of shot N should be usable as start frame of shot N+1

## Files

- `SKILL.md`
- `skill.json`
- `schemas/input.schema.json`
- `schemas/ui.schema.json`
- `schemas/output.schema.json`
- `templates/`
- `presets/`
- `examples/`
