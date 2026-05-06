#!/usr/bin/env python3
from __future__ import annotations

import json
import sys
from typing import Any


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


def enabled_labels(item: Any) -> list[str]:
    if not isinstance(item, dict):
        return []
    return [key.replace("_", " ") for key, is_enabled in item.items() if is_enabled is True]


def continuity_text(subject_preservation: Any, continuity_locks: Any) -> str:
    subject_parts = enabled_labels(subject_preservation)
    lock_parts = enabled_labels(continuity_locks)
    lines = []
    if subject_parts:
        lines.append("Preserve exactly: " + ", ".join(subject_parts) + ".")
    else:
        lines.append("Preserve identity, face, hair, wardrobe, materials, lighting, environment, and color grade.")
    if lock_parts:
        lines.append("Do not change: " + ", ".join(lock_parts) + ".")
    else:
        lines.append("Do not redesign wardrobe, background, lighting direction, or color interpretation.")
    return "\n".join(lines)


def reference_summary(refs: list[Any]) -> str:
    if not refs:
        return "No reference images supplied; preserve only the written continuity notes."
    lines = []
    for index, ref in enumerate(refs, 1):
        if isinstance(ref, str):
            lines.append(f"{index}. uploaded reference image")
            continue
        role = ref.get("role") or ref.get("image_id_or_path") or ref.get("id") or "reference"
        note = ref.get("description") or ref.get("notes") or ""
        lines.append(f"{index}. {role}: {note}".strip(": "))
    return "\n".join(lines)


def negative_text(items: list[Any]) -> str:
    cleaned = []
    for item in items:
        text = str(item).strip().rstrip(".")
        lowered = text.lower()
        if lowered.startswith("no "):
            text = text[3:].strip()
        if text:
            cleaned.append(text)
    if cleaned:
        return "Avoid " + ", avoid ".join(cleaned) + "."
    return "Avoid adding extra people, warped anatomy, unwanted text except requested panel labels, watermarks, style drift, reference mismatch, wardrobe redesign, and background changes."


def reference_phrase(refs: list[Any]) -> str:
    if not refs:
        return "Use the provided reference image"
    names = [f"@image{index}" for index, _ in enumerate(refs, 1)]
    if len(names) == 1:
        return f"Use reference image {names[0]}"
    return "Use reference images " + ", ".join(names[:-1]) + f", and {names[-1]}"


def mode_instruction(mode: str, aspect: str) -> str:
    if mode == "angle_grid_3x3":
        return (
            "Create one photorealistic cinematic 3x3 angle grid as a single clean contact-sheet image with nine panels. "
            "Arrange the panels in this order: row one MCU, MS, OS; row two WS, HA, LA; row three P, ThreeQ, B. "
            "The MCU panel is a macro close-up of the face, eyes, lips, skin texture, jewelry, neckline, or fabric detail; the MS panel is a chest-up or waist-up editorial portrait; the OS panel gives an over-the-shoulder feeling using only the same subject or a blurred foreground edge from the same scene; the WS panel shows the full body, posture, outfit, and environment; the HA panel is a high-angle view; the LA panel is a low-angle view; the P panel is a strict side profile; the ThreeQ panel is a 45-degree three-quarter view; and the B panel is a back view that keeps the same hair, outfit, fabric, and environment. "
            f"Use small white labels in the top-left corner of each panel and keep clean editorial borders, with the overall contact sheet in {aspect}."
        )
    if mode == "contact_sheet_2x3":
        return (
            "Create one photorealistic 2x3 cinematic contact sheet with exactly six frames, all captured as different camera placements within the same scene. "
            "The six frames should include a close high-fashion beauty portrait, a high-angle three-quarter frame, a low-angle oblique full-body frame, a side-on compressed profile or near-profile frame, an intimate close portrait from an unexpected camera height, and one extreme detail frame of a real wardrobe, hair, neckline, jewelry, fabric, hand, shoe, or set detail visible or logically implied by the reference. "
            f"Use thin clean borders and keep the overall contact sheet in {aspect}."
        )
    if mode == "cinematic_variation_pack":
        return f"Create a set of distinct cinematic portrait variations in {aspect}, varying only camera distance, camera height, crop, subtle pose, lens feel, and composition while preserving the same character and scene."
    if mode == "macro_detail_pack":
        return f"Create a cinematic macro detail pack in {aspect}, focusing on real visible or conservatively inferred details such as eyes, lips, skin texture, hair, fabric, collar, neckline, jewelry, hands, accessories, or set texture."
    if mode == "video_start_stop_frames":
        return f"Create two distinct reference-locked still frames in {aspect}: a start frame and a stop frame. The stop frame should clearly differ by camera distance, pose, gaze, crop, or camera angle while remaining the same scene."
    return f"Create one cinematic editorial portrait in {aspect}, improving camera placement, framing, focus, and composition while staying faithful to the reference."


def build_final_prompt(
    mode: str,
    aspect: str,
    style: str,
    style_notes: str,
    refs: list[Any],
    negatives: list[Any],
    subject_preservation: Any,
    continuity_locks: Any,
) -> str:
    prompt = (
        f"{reference_phrase(refs)} as the primary visual reference. "
        f"{mode_instruction(mode, aspect)} "
        "Preserve the exact subject identity, face structure, body proportions, hairstyle, makeup, wardrobe, fabric material, accessories, lighting direction, background, color grade, and photographic style from the reference image. "
        f"Use a {style.replace('_', ' ')} cinematic editorial look with natural skin texture, sharp realistic detail, and physically plausible shadows. "
    )
    if style_notes:
        prompt += f"Follow this extra direction: {style_notes}. "
    prompt += (
        "If a detail is hidden in the reference, infer it conservatively and keep that inference consistent across the whole result. "
        "Do not create different characters, different outfits, different lighting setups, or different backgrounds unless explicitly requested. "
        f"{negative_text(negatives)}"
    )
    return " ".join(prompt.split())


def build_prompt(params: dict[str, Any]) -> dict[str, Any]:
    mode = str(value(params, "mode", "single_cinematic_portrait"))
    if mode == "auto":
        if as_list(value(params, "shot_list", [])):
            mode = "custom_shot_list"
        else:
            mode = "single_cinematic_portrait"
    project = str(value(params, "project_name", "Auto_Cinematic_Image_Generator"))
    aspect = str(value(params, "aspect_ratio", "9:16"))
    target = str(value(params, "generator_target", "GPT Image 2"))
    style = str(value(params, "style_preset", "reference_locked"))
    style_notes = compact(value(params, "custom_style_notes", ""))
    refs = as_list(value(params, "reference_images", []))
    negatives = as_list(value(params, "negative_constraints", []))
    seed = str(value(params, "seed_strategy", "same_seed_for_continuity"))
    shot_list = as_list(value(params, "shot_list", []))
    subject_preservation = value(params, "subject_preservation", {})
    continuity_locks = value(params, "continuity_locks", {})

    prompt = build_final_prompt(mode, aspect, style, style_notes, refs, negatives, subject_preservation, continuity_locks)
    if shot_list:
        shot_text = " Then follow these custom shot directions in sequence: " + " ".join(
            compact(shot).rstrip(".") + "." for shot in shot_list if compact(shot)
        )
        prompt = " ".join((prompt + shot_text).split())
    per_image = [{
        "id": "image_01",
        "label": mode.replace("_", " ").title(),
        "aspect_ratio": aspect,
        "prompt": prompt,
        "negative_prompt": negative_text(negatives),
        "shot_type": mode,
        "seed_advice": seed,
    }]
    return {
        "success": True,
        "output": {
            "prompt": prompt,
            "project_name": project,
            "mode": mode,
            "status": "ready",
            "messages": [],
            "prompt_package": {
                "master_prompt": prompt,
                "negative_prompt": per_image[0]["negative_prompt"],
                "per_image_prompts": per_image,
                "recommended_aspect_ratio": aspect,
                "reference_usage_summary": reference_summary(refs),
            },
            "keyframe_breakdown": [],
            "metadata": {"runtime": "local-python"},
        },
        "warnings": [],
    }


def run(envelope: dict[str, Any]) -> dict[str, Any]:
    params = envelope.get("params") if isinstance(envelope.get("params"), dict) else envelope
    return build_prompt(params)


def main() -> None:
    envelope = json.loads(sys.stdin.read().strip() or "{}")
    print(json.dumps(run(envelope), ensure_ascii=False, indent=2))


if __name__ == "__main__":
    main()
