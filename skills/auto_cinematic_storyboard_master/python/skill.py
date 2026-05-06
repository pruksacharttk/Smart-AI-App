#!/usr/bin/env python3
from __future__ import annotations

import json
import math
import re
import sys
from typing import Any


LABEL_OVERVIEW = "\u0e20\u0e32\u0e1e\u0e23\u0e27\u0e21 Storyboard"
LABEL_IMAGE_PROMPT = "Prompt \u0e2a\u0e23\u0e49\u0e32\u0e07\u0e20\u0e32\u0e1e:"
LABEL_VIDEO_PROMPT = "Prompt \u0e2a\u0e23\u0e49\u0e32\u0e07\u0e27\u0e35\u0e14\u0e35\u0e42\u0e2d:"


def value(data: dict[str, Any], key: str, default: Any = "") -> Any:
    item = data.get(key, default)
    if isinstance(item, str):
        raw = item.strip()
        if raw.startswith(("{", "[")):
            try:
                return json.loads(raw)
            except json.JSONDecodeError:
                return item
    return item


def number_value(item: Any, default: float) -> float:
    try:
        if item in (None, ""):
            return default
        return float(item)
    except (TypeError, ValueError):
        return default


def int_value(item: Any, default: int) -> int:
    try:
        if item in (None, ""):
            return default
        return int(float(item))
    except (TypeError, ValueError):
        return default


def as_list(item: Any) -> list[Any]:
    if item in (None, ""):
        return []
    if isinstance(item, list):
        return item
    return [item]


def compact(item: Any) -> str:
    if item in (None, "", [], {}):
        return ""
    if isinstance(item, str):
        return item.strip()
    return json.dumps(item, ensure_ascii=False)


def reference_phrase(refs: list[Any]) -> str:
    if not refs:
        return "Use the written story idea as the main visual reference"
    names = [f"@image{index}" for index, _ in enumerate(refs, 1)]
    if len(names) == 1:
        return f"Use reference image {names[0]} as the visual source of truth"
    return "Use reference images " + ", ".join(names[:-1]) + f", and {names[-1]} as the visual sources of truth"


def negative_sentence(text: str) -> str:
    cleaned_items = []
    for part in text.strip().rstrip(".").split(","):
        item = part.strip()
        if item.lower().startswith("no "):
            item = item[3:].strip()
        if item:
            cleaned_items.append(item)
    if not cleaned_items:
        cleaned_items = [
            "continuity drift",
            "flat coverage",
            "warped anatomy",
            "mismatched wardrobe",
            "random character redesign",
            "unstable lighting",
        ]
    return "Avoid " + ", ".join(cleaned_items) + "."


def total_seconds_from_params(params: dict[str, Any]) -> float:
    minutes = number_value(value(params, "target_duration_minutes", ""), 0)
    if minutes > 0:
        return max(5.0, min(900.0, minutes * 60.0))
    return max(5.0, min(900.0, number_value(value(params, "target_duration_total_seconds", 60), 60)))


def average_shot_seconds(params: dict[str, Any]) -> float:
    policy = str(value(params, "shot_duration_policy", "auto_balanced"))
    explicit = number_value(value(params, "average_shot_seconds", ""), 0)
    if explicit > 0:
        return max(4.0, min(15.0, explicit))
    if policy == "fast_cut":
        return 6.0
    if policy == "slow_cinematic":
        return 10.0
    if policy == "medium_rhythm":
        return 8.0
    return 8.0


def calculated_shot_count(params: dict[str, Any], total: float, avg: float) -> int:
    use_auto = value(params, "use_auto_shot_count", True)
    if use_auto is False or str(use_auto).lower() in ("false", "0", "no"):
        return max(1, min(60, int_value(value(params, "shot_count_target", 0), max(1, round(total / avg)))))
    return max(1, min(60, int(math.ceil(total / avg))))


def shot_durations(total: float, count: int) -> list[float]:
    if count <= 1:
        return [round(total, 2)]
    base = math.floor((total / count) * 100) / 100
    durations = [base for _ in range(count)]
    remainder = round(total - sum(durations), 2)
    durations[-1] = round(durations[-1] + remainder, 2)
    return durations


def split_story_events(seed: str) -> list[str]:
    cleaned = " ".join(seed.replace("\r", " ").replace("\n", " ").split())
    if not cleaned:
        return ["A cinematic character moment unfolds from the supplied references"]
    separators = [
        r",\s*",
        r"\s+then\s+",
        r"\s+and then\s+",
        r"\s+and\s+",
        r"\s+before\s+",
        r"\s+after\s+",
        r"\s+until\s+",
        r"\s+but\s+",
        r"\s+while\s+",
        r"\s*เมื่อ\s*",
        r"\s*แล้ว\s*",
        r"\s*จากนั้น\s*",
        r"\s*ต่อมา\s*",
        r"\s*ก่อนจะ\s*",
        r"\s*จนกระทั่ง\s*",
        r"\s*แต่\s*",
        r"\s*ระหว่างที่\s*",
        r"[.!?;]+",
        r"[。！？；]+",
    ]
    pattern = "|".join(f"(?:{item})" for item in separators)
    parts = [part.strip(" ,،،.:-") for part in re.split(pattern, cleaned, flags=re.IGNORECASE)]
    events = []
    for part in parts:
        item = part.strip()
        item = re.sub(r"^(and|then|and then)\s+", "", item, flags=re.IGNORECASE).strip()
        if len(item) >= 2:
            events.append(item)
    return events or [cleaned]


def shot_phase(index: int, count: int) -> tuple[str, str]:
    if count <= 3:
        phases = [
            ("Setup", "introduce the character, place, and goal"),
            ("Development", "show the main action and the first change"),
            ("Payoff", "resolve the moment with a readable ending"),
        ]
        return phases[min(index, len(phases) - 1)]
    ratio = index / max(1, count - 1)
    if ratio < 0.12:
        return ("Opening", "establish the character, setting, and immediate goal")
    if ratio < 0.28:
        return ("Setup Action", "begin the first clear story action")
    if ratio < 0.45:
        return ("Complication", "add a visual obstacle, reaction, or change of plan")
    if ratio < 0.62:
        return ("Escalation", "push the action forward with stronger visual contrast")
    if ratio < 0.80:
        return ("Turn", "show the emotional or comedic turn before the ending")
    if ratio < 0.94:
        return ("Climax", "deliver the most important visual story beat")
    return ("Payoff", "finish the mini-story with a clear final image")


def event_for_shot(events: list[str], index: int, count: int) -> str:
    if not events:
        return "the next important story beat"
    if count == 1:
        return events[0]
    event_index = min(len(events) - 1, round(index * (len(events) - 1) / max(1, count - 1)))
    return events[event_index]


def action_direction(event: str, phase_name: str, phase_goal: str, index: int, count: int) -> str:
    event = event.strip().rstrip(".")
    if count == 1:
        return f"compress the full idea into one readable cinematic moment: {event}"
    if index == 0:
        return f"{phase_goal} by showing {event}"
    if index == count - 1:
        return f"{phase_goal} by completing the consequence of {event}"
    return f"{phase_goal} through this beat: {event}"


def build_transition(index: int, count: int) -> str:
    if index == count - 1:
        return "End on a final readable pose or reaction that completes the scene."
    return "End with an action, gaze, gesture, or camera position that can cut cleanly into the next shot."


def camera_design_for(index: int, camera_style: str) -> dict[str, str]:
    framings = [
        "wide establishing",
        "medium action",
        "close emotional reaction",
        "insert detail",
        "over-the-shoulder",
        "full-body movement",
        "tight portrait",
        "environmental wide",
    ]
    angles = ["eye-level", "low-angle", "high-angle", "three-quarter", "side profile", "over-shoulder"]
    lenses = ["24mm environmental", "35mm natural", "50mm intimate", "85mm compressed portrait", "macro detail"]
    movements = ["slow push-in", "gentle lateral track", "locked-off hold", "controlled reveal", "subtle handheld drift", "slow pull-back"]
    if camera_style == "comedy_visual_variety":
        framings = ["wide comic reveal", "medium reaction", "tight deadpan close-up", "insert gag detail"] + framings
        movements = ["locked-off comic timing", "quick motivated push-in", "gentle reveal pan", "reaction hold"] + movements
    return {
        "framing": framings[index % len(framings)],
        "angle": angles[index % len(angles)],
        "lens_language": lenses[index % len(lenses)],
        "movement": movements[index % len(movements)],
    }


def build_storyboard(params: dict[str, Any]) -> dict[str, Any]:
    mode = str(value(params, "mode", "full_story_package"))
    refs = as_list(value(params, "reference_images", []))
    if mode == "auto":
        mode = "storyboard_from_reference_images" if refs else "storyboard_from_synopsis"
    seed = str(value(params, "story_seed", "")).strip()
    genre = str(value(params, "genre", "comedy"))
    tone = ", ".join(str(x) for x in as_list(value(params, "tone", ["cinematic"])))
    total = total_seconds_from_params(params)
    avg = average_shot_seconds(params)
    shot_count = calculated_shot_count(params, total, avg)
    durations = shot_durations(total, shot_count)
    aspect = str(value(params, "aspect_ratio", "16:9"))
    video_aspect = str(value(params, "video_aspect_ratio", aspect))
    style = str(value(params, "visual_style_preset", "cinematic_reference_locked"))
    camera_style = str(value(params, "camera_style", "dynamic_cinematic"))
    negative = str(value(params, "negative_prompt_global", "no continuity drift, no flat coverage, no warped anatomy"))
    events = split_story_events(seed)
    story_context = seed or "a concise cinematic story built from the provided references"
    reference_text = reference_phrase(refs)
    negative_text = negative_sentence(negative)

    beat_sheet = []
    storyboard = []
    for index in range(shot_count):
        shot_id = f"shot_{index + 1:02d}"
        title, phase_goal = shot_phase(index, shot_count)
        event = event_for_shot(events, index, shot_count)
        action = action_direction(event, title, phase_goal, index, shot_count)
        transition = build_transition(index, shot_count)
        camera_design = camera_design_for(index, camera_style)
        duration = durations[index]
        beat_id = f"beat_{index + 1:02d}"
        summary = f"{title}: {action}."

        image_prompt = " ".join((
            f"{reference_text}. Create one {aspect} cinematic storyboard still image for shot {index + 1} of {shot_count}, titled {title}. "
            f"This shot must only cover this story beat: {action}. "
            f"Use {camera_design['framing']} framing from a {camera_design['angle']} angle with a {camera_design['lens_language']} lens feeling. "
            f"Render it in a {genre} {style.replace('_', ' ')} style with cinematic lighting, readable composition, realistic materials, and consistent character identity, wardrobe, props, location, and color grade. "
            "Do not summarize the entire story inside this image; freeze only this single beat into one clear frame."
        ).split())
        video_prompt = " ".join((
            f"{reference_text}. Create a {duration:g}-second cinematic video prompt for shot {index + 1} of {shot_count}, titled {title}, in {video_aspect}. "
            f"The video must perform only this beat: {action}. Start with a clear readable pose, move through the action with {camera_design['movement']} and a {camera_design['lens_language']} lens feeling, then {transition} "
            "Preserve the same identity, wardrobe, hair, makeup, props, environment, lighting direction, material fidelity, and color grade throughout this shot and across the full storyboard. "
            f"{negative_text}"
        ).split())

        beat_sheet.append({
            "beat_id": beat_id,
            "title": title,
            "summary": summary,
            "source_story_event": event,
            "emotion_shift": tone,
            "story_function": phase_goal,
        })
        storyboard.append({
            "shot_id": shot_id,
            "title": title,
            "beat_id": beat_id,
            "duration_seconds": duration,
            "story_purpose": summary,
            "source_story_event": event,
            "emotional_tone": tone,
            "shot_type": camera_design["framing"],
            "camera_design": camera_design,
            "subject_action": action,
            "start_frame_description": f"Start of {title}: establish the first readable pose for this beat.",
            "stop_frame_description": f"End of {title}: {transition}",
            "image_prompt": image_prompt,
            "start_frame_prompt": image_prompt + " Start frame only, no motion blur.",
            "stop_frame_prompt": image_prompt + " Stop frame only, distinct pose, crop, expression, or action endpoint from the start.",
            "video_prompt": video_prompt,
            "continuity_notes": "Keep identity, wardrobe, props, lighting direction, material fidelity, and color grade consistent.",
            "transition_to_next_shot": transition,
            "negative_prompt": negative_text,
        })

    overview = " ".join((
        f"{LABEL_OVERVIEW}: {reference_text}. Expand the short story idea into {shot_count} connected cinematic shots, not one repeated prompt. "
        f"Total runtime is about {total:g} seconds, with each shot planned around {avg:g} seconds and actual shot durations listed per block. "
        f"Story idea: {story_context}. Use a {genre} genre, {tone} tone, {style.replace('_', ' ')} visual style, {aspect} image prompts, and {video_aspect} video prompts. "
        "Each shot below is a separate copy-ready unit: first the still-image prompt for that shot, then the video prompt for the same shot. "
        f"{negative_text}"
    ).split())
    prompt_blocks = [overview]
    for index, shot in enumerate(storyboard, 1):
        prompt_blocks.append(
            "\n".join([
                f"SHOT {index:02d} - {shot['title']} ({shot['duration_seconds']:g}s)",
                LABEL_IMAGE_PROMPT,
                shot["image_prompt"],
                "",
                LABEL_VIDEO_PROMPT,
                shot["video_prompt"],
            ])
        )
    prompt = "\n\n".join(prompt_blocks)
    return {
        "success": True,
        "output": {
            "prompt": prompt,
            "version": "1.1.0-local",
            "mode": mode,
            "logline": seed,
            "expanded_story": f"{story_context} Expanded into {shot_count} connected cinematic shots totaling about {total:g} seconds.",
            "duration_plan": {
                "target_duration_total_seconds": total,
                "target_duration_minutes": round(total / 60.0, 2),
                "average_shot_seconds": avg,
                "shot_count": shot_count,
                "shot_durations": durations,
            },
            "source_story_events": events,
            "beat_sheet": beat_sheet,
            "continuity_bible": {
                "characters": compact(value(params, "character_bible", "")) or "Use user-supplied character details or infer conservatively from the story seed and reference images.",
                "wardrobe": "Preserve wardrobe across every shot unless the story explicitly changes it.",
                "environment": compact(value(params, "location_bible", "")) or "Keep location geography coherent.",
                "lighting": "Maintain one motivated lighting direction and color temperature.",
                "props": "Keep key props visible and consistent.",
                "color_grade": style,
                "camera_language": camera_style,
                "must_keep_consistent": ["identity", "wardrobe", "environment", "lighting", "color grade", "props"],
            },
            "storyboard": storyboard,
            "master_image_prompt_rules": "Each image prompt covers one shot beat only, not the whole story.",
            "master_video_prompt_rules": "Each video prompt covers one shot beat, its camera movement, start state, end state, and continuity locks.",
            "production_notes": ["Local deterministic runtime splits the story seed into events, calculates shot count from duration, and creates copy-ready image/video prompt pairs per shot."],
        },
        "warnings": [],
    }


def run(envelope: dict[str, Any]) -> dict[str, Any]:
    params = envelope.get("params") if isinstance(envelope.get("params"), dict) else envelope
    return build_storyboard(params)


def main() -> None:
    envelope = json.loads(sys.stdin.read().strip() or "{}")
    print(json.dumps(run(envelope), ensure_ascii=False, indent=2))


if __name__ == "__main__":
    main()
