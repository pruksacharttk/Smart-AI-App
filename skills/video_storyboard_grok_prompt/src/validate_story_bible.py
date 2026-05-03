#!/usr/bin/env python3
"""
Validate that every shot prompt contains the same Story Bible and required Phase blocks.

Usage:
    python src/validate_story_bible.py output.json
"""
from __future__ import annotations

import hashlib
import json
import sys
from pathlib import Path
from typing import Any, Dict, List

STORY_START = "<<<STORY_BIBLE_START>>>"
STORY_END = "<<<STORY_BIBLE_END>>>"
DIALOGUE_MARKER = "(เสียงไทย)"
REQUIRED_BLOCKS = [
    "HEADER",
    "WORKFLOW block",
    "CHARACTER LOCK",
    "AUDIO RULE",
    "PRODUCTION SPECS",
    "THE N SCENES",
    "AUDIO global",
    "LANGUAGE LOCK",
    "GENERATE N CLIPS instruction",
    "THAI DIALOGUE PER CLIP",
    "GLOBAL AUDIO MIX",
    "CHARACTER LOCK reminder",
]


def sha256_text(text: str) -> str:
    return hashlib.sha256(text.encode("utf-8")).hexdigest()


def extract_story_bible(prompt: str) -> str | None:
    start = prompt.find(STORY_START)
    end = prompt.find(STORY_END)
    if start < 0 or end < 0 or end <= start:
        return None
    return prompt[start + len(STORY_START):end].strip()


def validate(output: Dict[str, Any]) -> Dict[str, Any]:
    errors: List[str] = []
    shot_prompts = output.get("shot_prompts", [])
    expected_count = output.get("shot_count")
    if not isinstance(shot_prompts, list) or not shot_prompts:
        errors.append("Missing or empty shot_prompts")
        return {
            "passed": False,
            "all_prompts_contain_identical_story_bible": False,
            "all_shots_are_10_seconds": False,
            "all_required_blocks_present": False,
            "errors": errors,
        }

    if expected_count != len(shot_prompts):
        errors.append(f"shot_count is {expected_count}, but shot_prompts has {len(shot_prompts)} items")

    canonical: str | None = None
    canonical_hash: str | None = output.get("story_bible_hash")
    all_story = True
    all_duration = True
    all_blocks = True

    for shot in shot_prompts:
        shot_no = shot.get("shot_number", "?")
        prompt = shot.get("prompt", "")
        story = extract_story_bible(prompt)
        if story is None:
            all_story = False
            errors.append(f"Shot {shot_no}: missing Story Bible markers")
        else:
            if canonical is None:
                canonical = story
                if not canonical_hash:
                    canonical_hash = sha256_text(story)
            if story != canonical:
                all_story = False
                errors.append(f"Shot {shot_no}: Story Bible text is not identical to Shot 1")
            if canonical_hash and sha256_text(story) != canonical_hash:
                all_story = False
                errors.append(f"Shot {shot_no}: Story Bible hash mismatch")

        if shot.get("duration_seconds") != 10:
            all_duration = False
            errors.append(f"Shot {shot_no}: duration_seconds must be 10")
        if "duration: exactly 10 seconds" not in prompt and "duration exactly 10 seconds" not in prompt:
            all_duration = False
            errors.append(f"Shot {shot_no}: prompt does not explicitly lock duration to exactly 10 seconds")

        missing = [block for block in REQUIRED_BLOCKS if block not in prompt]
        if missing:
            all_blocks = False
            errors.append(f"Shot {shot_no}: missing required blocks: {', '.join(missing)}")
        if DIALOGUE_MARKER not in prompt:
            all_blocks = False
            errors.append(f"Shot {shot_no}: missing Thai dialogue marker {DIALOGUE_MARKER}")

    passed = all_story and all_duration and all_blocks and not errors
    return {
        "passed": passed,
        "all_prompts_contain_identical_story_bible": all_story,
        "all_shots_are_10_seconds": all_duration,
        "all_required_blocks_present": all_blocks,
        "errors": errors,
    }


def main() -> None:
    if len(sys.argv) != 2:
        print("Usage: python validate_story_bible.py output.json", file=sys.stderr)
        sys.exit(2)
    path = Path(sys.argv[1])
    output = json.loads(path.read_text(encoding="utf-8"))
    result = validate(output)
    print(json.dumps(result, ensure_ascii=False, indent=2))
    sys.exit(0 if result["passed"] else 1)


if __name__ == "__main__":
    main()
