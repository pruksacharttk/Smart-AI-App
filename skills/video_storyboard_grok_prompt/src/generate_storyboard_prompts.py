#!/usr/bin/env python3
"""
Generate Thai long-form video storyboard prompts.

Usage:
    python src/generate_storyboard_prompts.py examples/input.example.json > output.json
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
DEFAULT_SHOT_TYPES = [
    "wide establishing shot",
    "medium tracking shot",
    "close-up emotional shot",
    "over-the-shoulder shot",
    "low-angle hero shot",
    "high-angle reflective shot",
    "insert detail shot",
    "slow dolly-in shot",
    "profile silhouette shot",
    "final cinematic wide shot",
]


def sha256_text(text: str) -> str:
    return hashlib.sha256(text.encode("utf-8")).hexdigest()


def normalize_story_bible(text: str) -> str:
    # Keep a single canonical version. The exact result is reused in every shot.
    return text.strip()


def get_value(data: Dict[str, Any], key: str, default: str = "") -> str:
    value = data.get(key, default)
    if value is None:
        return default
    return str(value)


def make_outline(data: Dict[str, Any]) -> List[Dict[str, str]]:
    shot_count = int(data["shot_count"])
    provided = data.get("shot_outline") or []
    outline_by_number: Dict[int, Dict[str, str]] = {}
    for item in provided:
        try:
            n = int(item.get("shot_number", len(outline_by_number) + 1))
        except Exception:
            n = len(outline_by_number) + 1
        outline_by_number[n] = {k: str(v) for k, v in item.items() if v is not None}

    outline: List[Dict[str, str]] = []
    for n in range(1, shot_count + 1):
        item = outline_by_number.get(n, {})
        shot_type = item.get("shot_type") or DEFAULT_SHOT_TYPES[(n - 1) % len(DEFAULT_SHOT_TYPES)]
        beat = item.get("beat") or f"Beat {n}: ดำเนินเหตุการณ์ตาม plot summary อย่างต่อเนื่อง โดยรักษา continuity จาก shot ก่อนหน้า"
        action = item.get("action") or f"ให้ตัวละครหลักเคลื่อนไหวและแสดงอารมณ์ตาม Beat {n} โดยไม่มี character drift"
        thai_dialogue = item.get("thai_dialogue") or f"บทพูดไทยสำหรับ Shot {n} ที่สอดคล้องกับเรื่อง {DIALOGUE_MARKER}"
        if DIALOGUE_MARKER not in thai_dialogue:
            thai_dialogue = f"{thai_dialogue} {DIALOGUE_MARKER}"
        voiceover = item.get("voiceover") or "เสียงบรรยายไทยเสริมเฉพาะเมื่อจำเป็น ไม่ทับบทพูดหลัก"
        audio_notes = item.get("audio_notes") or "เสียงพูดชัดเจน lip-sync ตรงปาก มี ambient และ music ต่อเนื่อง"
        outline.append(
            {
                "shot_number": str(n),
                "shot_type": shot_type,
                "beat": beat,
                "action": action,
                "thai_dialogue": thai_dialogue,
                "voiceover": voiceover,
                "audio_notes": audio_notes,
            }
        )
    return outline


def forbidden_text(data: Dict[str, Any]) -> str:
    forbidden = data.get("forbidden_elements") or []
    if not forbidden:
        forbidden = [
            "phantom hands",
            "extra fingers",
            "unwanted second person POV",
            "English dialogue or English translation",
            "character face drift",
            "inconsistent clothing",
            "unwanted extra people",
        ]
    return "; ".join(str(x) for x in forbidden)


def make_phase_1_prompt(data: Dict[str, Any], story_bible: str) -> str:
    shot_count = int(data["shot_count"])
    return f"""# PHASE 1 — STORYBOARD FIRST PROMPT

{STORY_START}
{story_bible}
{STORY_END}

HEADER — video type: {get_value(data, 'video_type')}; total clips: {shot_count}; duration: 10 seconds per shot; character: {get_value(data, 'main_character')}; setting: {get_value(data, 'setting')}.

WORKFLOW block — ทำ storyboard ก่อนเสมอ ห้ามข้ามไป generate clip ทันที ต้องแตกเรื่องเป็น {shot_count} shots ตามลำดับเหตุการณ์ก่อน แล้วจึงใช้แต่ละ shot ไปสร้าง clip.

CHARACTER LOCK — รักษาหน้าตา เสื้อผ้า อายุ สัดส่วน สีผิว ทรงผม บุคลิก และ prop ของตัวละครให้ตรง Story Bible ทุก shot. ป้องกัน phantom hands, extra fingers, unwanted second person POV, character drift, face drift, outfit drift, และ unwanted extra people. Forbidden: {forbidden_text(data)}.

AUDIO RULE — ทุก clip ต้องมีเสียงเสมอ ทั้ง lip-sync เมื่อมีบทพูด, voiceover เมื่อมี narration, music bed และ ambient sound ที่ตรงกับฉาก. ห้าม silent clip.

PRODUCTION SPECS — ทุก shot ยาว 10 seconds เท่านั้น; style: {get_value(data, 'style', 'cinematic realistic')}; lighting: {get_value(data, 'lighting', 'soft cinematic lighting')}; camera rules: {get_value(data, 'camera_rules', 'varied shot types with continuity')}; aspect ratio: {get_value(data, 'aspect_ratio', '16:9')}.

THE N SCENES — สร้าง storyboard จำนวน {shot_count} scenes/shots ให้ครบถ้วน แต่ละ shot ต้องใช้ shot type ที่ต่างกันหรือมี camera movement ต่างกัน มี action ต่อเนื่อง และมีบทพูดไทยหรือเสียงบรรยายไทยที่เหมาะสม.

AUDIO global — music: {get_value(data, 'music', 'subtle cinematic underscore')}; voice tone: {get_value(data, 'voice_tone', 'natural Thai voice')}; ambient: {get_value(data, 'ambient', 'realistic ambience matching the setting')}.

PLOT SUMMARY — {get_value(data, 'plot_summary')}"""


def make_phase_2_prompt(data: Dict[str, Any], story_bible: str) -> str:
    shot_count = int(data["shot_count"])
    return f"""# PHASE 2 — GENERATE CLIPS PROMPT

{STORY_START}
{story_bible}
{STORY_END}

LANGUAGE LOCK — ใช้เสียงไทยเท่านั้น ห้ามแปลบทพูดไทยเป็น English ห้ามใส่ English subtitles เว้นแต่ผู้ใช้สั่งเพิ่มเอง ทุก dialogue ต้องเป็นภาษาไทยและคง marker {DIALOGUE_MARKER}.

AUDIO RULE — ทุก clip ต้องมี audio ครบ: dialogue/lip-sync เมื่อมีคนพูด, voiceover เมื่อมี narration, music, ambient, room tone/scene tone. ห้าม silent clip และห้ามเสียงขาดช่วง.

GENERATE N CLIPS instruction — Generate exactly {shot_count} clips. Each clip is exactly 10 seconds. Create one prompt per clip and preserve story continuity from Shot 1 to Shot {shot_count}.

THAI DIALOGUE PER CLIP — ทุก clip ต้องระบุบทพูดไทยพร้อม marker {DIALOGUE_MARKER}. ถ้า shot ไม่มีบทพูด ให้ใช้ voiceover ไทยสั้น ๆ พร้อม marker {DIALOGUE_MARKER}.

GLOBAL AUDIO MIX — mix voice + music + ambient ให้บาลานซ์ เสียงพูดไทยต้องชัดกว่า music, ambient ต้อง support setting, music ต้องต่อเนื่องตลอดเรื่อง.

CHARACTER LOCK reminder — ใช้ตัวละครเดิมจาก Story Bible แบบไม่เปลี่ยนหน้า เสื้อผ้า ทรงผม prop และบุคลิก ห้าม phantom hands, ห้าม second-person POV ที่ทำให้มือ/ร่างของผู้ชมโผล่เข้าฉาก, ห้าม extra limbs, ห้ามตัวละครใหม่ที่ไม่ได้ระบุ."""


def make_shot_prompt(data: Dict[str, Any], story_bible: str, shot: Dict[str, str]) -> str:
    shot_count = int(data["shot_count"])
    shot_number = int(shot["shot_number"])
    return f"""# VIDEO PROMPT — SHOT {shot_number:02d}/{shot_count:02d}

{STORY_START}
{story_bible}
{STORY_END}

PHASE 1 — STORYBOARD STRUCTURE

HEADER — video type: {get_value(data, 'video_type')}; shot: {shot_number}/{shot_count}; duration: exactly 10 seconds; character: {get_value(data, 'main_character')}; setting: {get_value(data, 'setting')}.

WORKFLOW block — ใช้ Story Bible ก่อน วาง storyboard ของ shot นี้ให้ต่อเนื่องกับ shot ก่อนหน้าและ shot ถัดไป จากนั้นจึง generate clip ห้ามข้ามขั้นตอน storyboard.

CHARACTER LOCK — ตัวละครต้องเหมือนเดิม 100% ตาม Story Bible: หน้า เสื้อผ้า ทรงผม อายุ สัดส่วน สีผิว prop และบุคลิกต้องต่อเนื่อง. ห้าม phantom hands, extra fingers, second-person POV, extra limbs, face drift, outfit drift, และ unwanted extra people. Forbidden: {forbidden_text(data)}.

AUDIO RULE — shot นี้ต้องมีเสียงครบ: lip-sync ตรงบทพูด, voiceover ถ้ามี narration, music bed, ambient sound, room tone. ห้าม silent clip.

PRODUCTION SPECS — duration exactly 10 seconds; style: {get_value(data, 'style', 'cinematic realistic')}; lighting: {get_value(data, 'lighting', 'soft cinematic lighting')}; camera rules: {get_value(data, 'camera_rules', 'varied shot types with continuity')}; aspect ratio: {get_value(data, 'aspect_ratio', '16:9')}.

THE N SCENES — This is shot {shot_number} of exactly {shot_count} scenes. Shot type: {shot['shot_type']}. Beat: {shot['beat']}. Action: {shot['action']}.

AUDIO global — music: {get_value(data, 'music', 'subtle cinematic underscore')}; voice tone: {get_value(data, 'voice_tone', 'natural Thai voice')}; ambient: {get_value(data, 'ambient', 'realistic ambience matching the setting')}.

PHASE 2 — CLIP GENERATION RULES

LANGUAGE LOCK — ใช้เสียงไทยเท่านั้น ห้ามแปลเป็น English ห้าม English dialogue ห้าม English subtitles. Dialogue/voiceover ต้องเป็นภาษาไทยและมี marker {DIALOGUE_MARKER}.

AUDIO RULE — audio ของ shot นี้ต้องครบทุกชั้น: Thai dialogue/lip-sync, voiceover if needed, music, ambient, scene tone. เสียงพูดไทยต้องชัดกว่า music.

GENERATE N CLIPS instruction — Generate clip {shot_number}/{shot_count}; this clip duration is exactly 10 seconds; preserve continuity with the same Story Bible used in every prompt.

THAI DIALOGUE PER CLIP — {shot['thai_dialogue']} Voiceover: {shot['voiceover']} {DIALOGUE_MARKER}.

GLOBAL AUDIO MIX — {shot['audio_notes']}. Mix voice + music + ambient naturally; no silent gaps; no mismatched ambience.

CHARACTER LOCK reminder — ย้ำอีกครั้ง: ตัวละคร ฉาก prop เสื้อผ้า สีผม ใบหน้า และโทนภาพต้องตรงกับ Story Bible แบบต่อเนื่อง ห้าม phantom hands และห้าม second-person POV.

FINAL GENERATION INSTRUCTION — สร้างวิดีโอ shot นี้เป็น cinematic clip ความยาว 10 วินาที โดยยึด Story Bible, shot type, action, Thai dialogue, audio mix, production specs และ continuity lock ทั้งหมดข้างต้น."""


def validate_output(output: Dict[str, Any], story_bible: str) -> Dict[str, Any]:
    story_hash = sha256_text(story_bible)
    errors: List[str] = []
    all_story = True
    all_duration = True
    all_blocks = True

    for shot in output.get("shot_prompts", []):
        shot_no = shot.get("shot_number", "?")
        prompt = shot.get("prompt", "")
        start = prompt.find(STORY_START)
        end = prompt.find(STORY_END)
        if start < 0 or end < 0 or end <= start:
            all_story = False
            errors.append(f"Shot {shot_no}: missing Story Bible markers")
        else:
            extracted = prompt[start + len(STORY_START):end].strip()
            if sha256_text(extracted) != story_hash:
                all_story = False
                errors.append(f"Shot {shot_no}: Story Bible hash mismatch")
        if shot.get("duration_seconds") != 10:
            all_duration = False
            errors.append(f"Shot {shot_no}: duration is not 10 seconds")
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


def generate(data: Dict[str, Any]) -> Dict[str, Any]:
    shot_count = int(data["shot_count"])
    if shot_count < 1 or shot_count > 60:
        raise ValueError("shot_count must be between 1 and 60")
    duration = int(data.get("shot_duration_seconds", 10))
    if duration != 10:
        raise ValueError("shot_duration_seconds must be exactly 10")

    story_bible = normalize_story_bible(get_value(data, "story_bible"))
    if len(story_bible) < 20:
        raise ValueError("story_bible must be at least 20 characters")
    story_hash = sha256_text(story_bible)
    outline = make_outline(data)

    shot_prompts = []
    for shot in outline:
        prompt = make_shot_prompt(data, story_bible, shot)
        shot_prompts.append(
            {
                "shot_number": int(shot["shot_number"]),
                "duration_seconds": 10,
                "shot_type": shot["shot_type"],
                "thai_dialogue": shot["thai_dialogue"],
                "prompt": prompt,
                "story_bible_hash": story_hash,
                "contains_story_bible": STORY_START in prompt and STORY_END in prompt,
            }
        )

    output: Dict[str, Any] = {
        "shot_count": shot_count,
        "shot_duration_seconds": 10,
        "story_bible_hash": story_hash,
        "master_prompt_phase_1": make_phase_1_prompt(data, story_bible),
        "master_prompt_phase_2": make_phase_2_prompt(data, story_bible),
        "shot_prompts": shot_prompts,
        "validation": {},
    }
    output["validation"] = validate_output(output, story_bible)
    return output


def main() -> None:
    if len(sys.argv) != 2:
        print("Usage: python generate_storyboard_prompts.py input.json", file=sys.stderr)
        sys.exit(2)
    input_path = Path(sys.argv[1])
    data = json.loads(input_path.read_text(encoding="utf-8"))
    output = generate(data)
    print(json.dumps(output, ensure_ascii=False, indent=2))


if __name__ == "__main__":
    main()
