#!/usr/bin/env python3
from __future__ import annotations

import importlib.util
import json
import sys
from pathlib import Path
from typing import Any, Dict


SKILL_ROOT = Path(__file__).resolve().parents[1]
GENERATOR_PATH = SKILL_ROOT / "src" / "generate_storyboard_prompts.py"


def load_generator():
    spec = importlib.util.spec_from_file_location(
        "video_storyboard_grok_prompt_generator",
        GENERATOR_PATH,
    )
    if spec is None or spec.loader is None:
        raise RuntimeError(f"Unable to load generator at {GENERATOR_PATH}")
    module = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(module)
    return module


def prompt_text(output: Dict[str, Any]) -> str:
    shots = output.get("shot_prompts") or []
    shot_sections = []
    for shot in shots:
        number = shot.get("shot_number", "?")
        prompt = str(shot.get("prompt", "")).strip()
        shot_sections.append(f"## Shot {number}\n\n{prompt}")
    return "\n\n".join(
        part
        for part in [
            "# Master Prompt Phase 1",
            str(output.get("master_prompt_phase_1", "")).strip(),
            "# Master Prompt Phase 2",
            str(output.get("master_prompt_phase_2", "")).strip(),
            "# Shot Prompts",
            "\n\n".join(shot_sections),
        ]
        if part
    )


def run(input_data: Dict[str, Any]) -> Dict[str, Any]:
    generator = load_generator()
    params = input_data.get("params") if isinstance(input_data.get("params"), dict) else input_data
    output = generator.generate(params)
    return {
        "success": True,
        "output": {
            **output,
            "prompt": prompt_text(output),
        },
        "warnings": [] if output.get("validation", {}).get("passed") else output.get("validation", {}).get("errors", []),
    }


def main() -> None:
    raw = sys.stdin.read().strip()
    envelope = json.loads(raw or "{}")
    result = run(envelope)
    print(json.dumps(result, ensure_ascii=False, indent=2))


if __name__ == "__main__":
    main()
