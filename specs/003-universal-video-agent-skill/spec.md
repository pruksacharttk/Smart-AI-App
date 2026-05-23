# Universal Video Agent Skill Spec

**Version:** 0.2.0  
**Status:** Revised FFmpeg-only MVP draft for implementation  
**Goal:** Build a backend-agnostic agent skill for generating, editing, validating, and rendering videos with AI agents, while preserving the useful capabilities of Remotion-style skills without depending on Remotion Studio, React, or Remotion APIs.

---

## 1. Executive Summary

This project defines a **Universal Video Generation Skill** and a companion **OpenAI Agents Python orchestration layer**.

The skill should let an AI agent transform a user request such as:

> “Create a 60-second AI news short with Thai narration, subtitles, B-roll, animated cards, and an outro.”

into a structured video production pipeline:

```text
User Request
  -> Video Brief
  -> Script
  -> Scene Plan
  -> Timeline Graph
  -> Asset Plan
  -> Captions
  -> Render Backend Selection
  -> Backend Project Files
  -> Rendered Video
  -> QA Report
```

Unlike a Remotion-only skill, this design separates **video intelligence** from the **rendering backend**.

Supported backends are implemented as adapters, but the first implementation must keep the MVP intentionally narrow:

- FFmpeg adapter
- MoviePy adapter, future
- HTML Canvas / Puppeteer adapter, future
- Remotion adapter, optional
- Blender adapter, optional
- OpenTimelineIO adapter, optional
- External editor/API adapter, optional

The first production-ready MVP must target **FFmpeg only**. MoviePy, Canvas, Remotion, Blender, OpenTimelineIO, and external API adapters are future extensions. This keeps the first version deterministic, CI-friendly, dependency-light, and realistically implementable.

---

## 2. Design Principles

### 2.1 Backend Agnostic

The skill must never assume that a video equals a Remotion composition.

Instead, every video must be represented as an intermediate format:

```text
VideoBrief -> VideoSpec -> SceneGraph -> TimelineGraph -> RenderPlan
```

Only the final adapter converts the `RenderPlan` into backend-specific code or commands.

### 2.2 Agent-Readable Skill Files

The skill should be structured as markdown rule files that AI coding agents can load on demand.

The root `SKILL.md` should act as an index and router.

### 2.3 Explicit Timeline Semantics

Every visual, audio, caption, transition, and effect must have:

- start time
- duration
- layer order
- asset reference
- transform or style
- optional animation
- validation constraints

### 2.4 Deterministic Rendering

The same input spec should produce the same output video.

Avoid hidden timing dependencies, implicit CSS transitions, or non-deterministic animation timing.

### 2.5 Progressive Capability

The system should work at three levels:

1. **Spec-only:** Generate JSON/YAML video plans.
2. **Code generation:** Generate backend files.
3. **Full orchestration:** Agents create assets, render video, run QA, and produce output.

---

## 3. Target Use Cases

### 3.1 AI News Shorts

- 30–90 seconds
- vertical 9:16
- hook, headline, bullets, limitation, implication, outro
- Thai or English narration
- burned-in subtitles
- source cards and disclaimers

### 3.2 Podcast / Interview Clips

- speaker detection
- highlight extraction
- captions
- waveform or speaker labels
- silence trimming

### 3.3 Explainer Videos

- scene-based explanation
- animated cards
- icons, diagrams, charts
- voiceover and subtitles

### 3.4 Product Demo Videos

- screen recordings
- feature callouts
- zoom/pan
- before/after comparison
- CTA outro

### 3.5 Data-Driven Videos

- charts
- rankings
- dashboards
- generated daily/weekly reports

### 3.6 Bulk Template Generation

- one template
- many data rows
- batch output
- CSV/JSON input

---

## 4. Non-Goals

The first version should not attempt to replace a full nonlinear editor such as Premiere, DaVinci Resolve, CapCut, or After Effects.

The first version should not require:

- Remotion Studio
- a browser timeline UI
- manual frame-by-frame editing
- advanced 3D rendering
- real-time collaborative editing

These can become later extensions.

---

## 5. Skill Repository Structure

Recommended repository layout:

```text
universal-video-skill/
├── SKILL.md
├── README.md
├── schemas/
│   ├── video_spec.schema.json
│   ├── scene_graph.schema.json
│   ├── timeline_graph.schema.json
│   ├── render_plan.schema.json
│   └── qa_report.schema.json
├── rules/
│   ├── planning.md
│   ├── scenes.md
│   ├── timeline.md
│   ├── animation.md
│   ├── transitions.md
│   ├── captions.md
│   ├── audio.md
│   ├── narration.md
│   ├── assets.md
│   ├── typography.md
│   ├── layout.md
│   ├── ffmpeg.md
│   ├── moviepy.md
│   ├── canvas.md
│   ├── qa.md
│   ├── safety.md
│   └── packaging.md
├── patterns/
│   ├── ai-news-short.md
│   ├── podcast-clip.md
│   ├── explainer.md
│   ├── product-demo.md
│   ├── data-video.md
│   └── batch-template.md
├── agents/
│   ├── orchestrator.md
│   ├── planner.md
│   ├── scriptwriter.md
│   ├── visual_director.md
│   ├── asset_manager.md
│   ├── captioner.md
│   ├── renderer.md
│   ├── qa.md
│   └── publisher.md
├── examples/
│   ├── ai_news_short/
│   │   ├── brief.md
│   │   ├── video_spec.yaml
│   │   ├── timeline_graph.json
│   │   └── qa_report.json
│   └── podcast_clip/
├── src/
│   ├── universal_video_agent/
│   │   ├── __init__.py
│   │   ├── models.py
│   │   ├── orchestrator.py
│   │   ├── agents.py
│   │   ├── tools.py
│   │   ├── validators.py
│   │   ├── backends/
│   │   │   ├── base.py
│   │   │   ├── ffmpeg.py
│   │   │   ├── moviepy.py
│   │   │   ├── canvas.py
│   │   │   └── remotion.py
│   │   └── cli.py
│   └── tests/
│       ├── test_schema.py
│       ├── test_timeline.py
│       ├── test_backend_selection.py
│       └── test_render_plan.py
├── pyproject.toml
└── docker/
    └── Dockerfile
```

---

## 6. Root Skill File: `SKILL.md`

The root skill should be short, strict, and routing-oriented.

Example:

```md
# Universal Video Generation Skill

## When to use

Use this skill whenever an agent needs to create, edit, analyze, storyboard, subtitle, render, or validate a video.

This skill is backend-agnostic. Do not assume Remotion, React, browser DOM, or any specific video editor.

## Required workflow

1. Understand the user goal.
2. Select a video pattern.
3. Produce or update a `VideoSpec`.
4. Convert the `VideoSpec` into a `SceneGraph`.
5. Convert the `SceneGraph` into a `TimelineGraph`.
6. Validate timing, assets, captions, and safety constraints.
7. Select a render backend.
8. Generate backend-specific files or commands.
9. Render or return implementation instructions.
10. Produce a QA report.

## Rule loading

- For planning and structure, read `rules/planning.md`, `rules/scenes.md`, and `rules/timeline.md`.
- For motion, read `rules/animation.md` and `rules/transitions.md`.
- For captions, read `rules/captions.md`.
- For narration and audio, read `rules/narration.md` and `rules/audio.md`.
- For MVP rendering, read `rules/ffmpeg.md`.
- Read `rules/moviepy.md`, `rules/canvas.md`, or another adapter rule only when a future adapter is explicitly selected outside MVP scope.
- For validation, read `rules/qa.md`.

## Core requirement

All video work must be represented using the Universal Video Schema before backend-specific code is generated.
```

---

## 7. Core Data Model

Use Pydantic models in Python.

### 7.1 VideoSpec

`VideoSpec` is the high-level creative and technical contract.

```python
from typing import Literal, Optional, List, Dict, Any
from pydantic import BaseModel, Field

AspectRatio = Literal["9:16", "16:9", "1:1", "4:5"]
VideoIntent = Literal[
    "ai_news_short",
    "podcast_clip",
    "explainer",
    "product_demo",
    "data_video",
    "ad",
    "custom"
]

class VideoOutputSettings(BaseModel):
    width: int = 1080
    height: int = 1920
    fps: int = 30
    duration_seconds: float
    aspect_ratio: AspectRatio = "9:16"
    format: Literal["mp4", "mov", "webm"] = "mp4"
    codec: str = "h264"
    audio_codec: str = "aac"

class BrandStyle(BaseModel):
    palette: str = "dark-tech"
    font_family: str = "Noto Sans Thai"
    title_style: str = "bold"
    motion_style: str = "fast-paced"
    safe_margin_px: int = 72

class VideoSpec(BaseModel):
    title: str
    intent: VideoIntent
    language: str = "th"
    output: VideoOutputSettings
    brand_style: BrandStyle = Field(default_factory=BrandStyle)
    source_material: str
    target_platforms: List[Literal["tiktok", "youtube_shorts", "instagram_reels", "x", "linkedin"]]
    constraints: List[str] = []
    required_elements: List[str] = []
    metadata: Dict[str, Any] = {}
```

---

### 7.2 SceneGraph

`SceneGraph` describes meaning and creative intent.

```python
class SceneBeat(BaseModel):
    id: str
    role: Literal[
        "hook",
        "headline",
        "context",
        "detail",
        "evidence",
        "limitation",
        "implication",
        "cta",
        "outro"
    ]
    start_seconds: float
    duration_seconds: float
    narration: str
    on_screen_text: str
    visual_direction: str
    mood: str = "neutral"
    importance: Literal["low", "medium", "high"] = "medium"
    citations: List[str] = []
```

```python
class SceneGraph(BaseModel):
    video_title: str
    duration_seconds: float
    scenes: List[SceneBeat]
```

---

### 7.3 TimelineGraph

`TimelineGraph` describes exactly what appears and when.

```python
class Transform(BaseModel):
    x: float = 0
    y: float = 0
    scale: float = 1
    rotation: float = 0
    opacity: float = 1

class AnimationKeyframe(BaseModel):
    time_seconds: float
    transform: Transform
    easing: Literal["linear", "ease_in", "ease_out", "ease_in_out", "spring"] = "ease_out"

class Animation(BaseModel):
    property: Literal["x", "y", "scale", "rotation", "opacity", "blur"]
    keyframes: List[AnimationKeyframe]

class Layer(BaseModel):
    id: str
    type: Literal[
        "text",
        "caption",
        "image",
        "video",
        "audio",
        "shape",
        "chart",
        "waveform",
        "background",
        "effect"
    ]
    start_seconds: float
    duration_seconds: float
    z_index: int = 0
    content: Optional[str] = None
    asset_id: Optional[str] = None
    style: Dict[str, Any] = {}
    transform: Transform = Field(default_factory=Transform)
    animations: List[Animation] = []

class TimelineGraph(BaseModel):
    width: int
    height: int
    fps: int
    duration_seconds: float
    layers: List[Layer]
```

---

### 7.4 Asset Manifest

```python
class Asset(BaseModel):
    id: str
    type: Literal["image", "video", "audio", "font", "subtitle", "data"]
    path: str
    source: Literal["local", "remote", "generated", "stock", "user_upload"]
    license: Optional[str] = None
    duration_seconds: Optional[float] = None
    width: Optional[int] = None
    height: Optional[int] = None
    metadata: Dict[str, Any] = {}
```

```python
class AssetManifest(BaseModel):
    assets: List[Asset]
```

---

### 7.5 RenderPlan

```python
class RenderPlan(BaseModel):
    backend: Literal["ffmpeg", "moviepy", "canvas", "remotion", "blender", "external_api"]
    output_path: str
    temp_dir: str
    timeline_graph: TimelineGraph
    asset_manifest: AssetManifest
    backend_options: Dict[str, Any] = {}
```

---

### 7.6 QAReport

```python
class QAIssue(BaseModel):
    severity: Literal["info", "warning", "error"]
    code: str
    message: str
    layer_id: Optional[str] = None
    suggested_fix: Optional[str] = None

class QAReport(BaseModel):
    passed: bool
    issues: List[QAIssue]
    duration_seconds: float
    checked_items: List[str]
```

---

## 8. Universal Video Schema Example

Example YAML for a 55-second Thai AI news short:

```yaml
title: "xAI เปิดตัว Custom Voices บน Grok"
intent: ai_news_short
language: th
output:
  width: 1080
  height: 1920
  fps: 30
  duration_seconds: 55
  aspect_ratio: "9:16"
  format: mp4
  codec: h264
  audio_codec: aac
brand_style:
  palette: dark-tech
  font_family: Noto Sans Thai
  title_style: bold
  motion_style: fast-paced
  safe_margin_px: 72
target_platforms:
  - tiktok
  - youtube_shorts
required_elements:
  - hook
  - headline
  - animated_bullets
  - burned_in_subtitles
  - limitation_card
  - outro
source_material: |
  xAI เปิดตัว Custom Voices บน Grok...
constraints:
  - "Use Thai narration"
  - "Use vertical mobile-safe typography"
  - "Do not imply Custom Voices is globally available"
```

---

## 9. Pattern Rules

### 9.1 AI News Short Pattern

File: `patterns/ai-news-short.md`

Required sections:

```text
0–3s: Hook
3–8s: What happened
8–20s: Key feature
20–35s: Why it matters
35–45s: Safety / limitation
45–55s: Industry implication
55–60s: CTA / outro
```

Required visual structure:

- large headline
- one idea per scene
- number cards
- animated bullet cards
- bottom captions
- source/limitation card when needed
- final implication line

Recommended pacing:

- 30 fps
- 2–7 seconds per scene
- text should be readable within 1.2 seconds
- maximum 2 headline lines per scene
- maximum 18 Thai words per caption segment

---

## 10. Agent Architecture

Use OpenAI Agents Python as the orchestration framework.

### 10.1 Agent Roles

#### 10.1.1 Orchestrator Agent

Responsibilities:

- understand user request
- choose workflow pattern
- route to sub-agents
- enforce schema outputs
- choose renderer backend
- return final deliverables

Inputs:

- user request
- optional source assets
- optional brand kit
- optional target platform

Outputs:

- final response
- generated files
- render report

#### 10.1.2 Planner Agent

Responsibilities:

- create `VideoSpec`
- select pattern
- define constraints
- estimate duration
- identify missing assets

Outputs:

- `VideoSpec`

#### 10.1.3 Scriptwriter Agent

Responsibilities:

- convert source material into narration
- split narration into beats
- write on-screen text
- maintain factual boundaries

Outputs:

- script
- scene beats

#### 10.1.4 Visual Director Agent

Responsibilities:

- convert scenes into visual directions
- define layouts, typography, motion, color
- assign visual metaphors

Outputs:

- `SceneGraph`

#### 10.1.5 Asset Manager Agent

Responsibilities:

- create asset manifest
- verify asset existence
- recommend generated or stock assets
- normalize paths
- inspect media duration and dimensions

Outputs:

- `AssetManifest`

#### 10.1.6 Caption Agent

Responsibilities:

- split narration into caption segments
- enforce reading speed
- align captions to scene timing
- produce SRT/VTT/JSON captions

Outputs:

- caption track

#### 10.1.7 Timeline Agent

Responsibilities:

- convert `SceneGraph` into `TimelineGraph`
- ensure no layer overlaps violate design constraints
- assign z-index
- assign transitions
- map seconds to frames

Outputs:

- `TimelineGraph`

#### 10.1.8 Renderer Agent

Responsibilities:

- choose backend
- create `RenderPlan`
- call backend adapter
- generate project files or render commands

Outputs:

- rendered video or render instructions

#### 10.1.9 QA Agent

Responsibilities:

- validate schema
- check asset paths
- check captions
- check timing
- check safe margins
- check output duration
- optionally run media inspection with FFprobe

Outputs:

- `QAReport`

#### 10.1.10 Publisher Agent, optional

Responsibilities:

- write title, description, hashtags
- export platform-specific metadata
- create thumbnail prompt

Outputs:

- publish package

---

## 11. OpenAI Agents Python Implementation

### 11.1 Dependencies

`pyproject.toml`:

```toml
[project]
name = "universal-video-agent"
version = "0.1.0"
requires-python = ">=3.11"
dependencies = [
  "openai-agents>=0.2.0",
  "openai>=1.0.0",
  "pydantic>=2.7.0",
  "ffmpeg-python>=0.2.0",
  "python-dotenv>=1.0.0",
  "rich>=13.7.0",
  "typer>=0.12.0",
  "jsonschema>=4.22.0",
  "Pillow>=10.0.0",
  "numpy>=1.26.0"
]
```

System dependencies:

```bash
ffmpeg
ffprobe
```

Optional:

```bash
node
chromium
playwright
blender
moviepy
```

---

### 11.2 Agent Setup

`src/universal_video_agent/agents.py`:

```python
from agents import Agent, Runner, function_tool
from pydantic import BaseModel
from .models import VideoSpec, SceneGraph, TimelineGraph, RenderPlan, QAReport
from .tools import (
    inspect_media,
    validate_video_spec,
    validate_timeline_graph,
    render_with_ffmpeg,
    write_project_files,
)

planner_agent = Agent(
    name="Video Planner Agent",
    instructions="""
You create backend-agnostic VideoSpec objects.
Never generate backend-specific code.
Respect target platform, duration, language, and factual constraints.
""",
    output_type=VideoSpec,
    tools=[validate_video_spec],
)

scriptwriter_agent = Agent(
    name="Video Scriptwriter Agent",
    instructions="""
Convert source material into concise narration and scene beats.
Preserve factual accuracy.
For news content, separate confirmed facts from interpretation.
""",
)

visual_director_agent = Agent(
    name="Visual Director Agent",
    instructions="""
Convert scene beats into a SceneGraph.
Use mobile-safe layout, clear text hierarchy, and deterministic motion.
Do not mention Remotion APIs.
""",
    output_type=SceneGraph,
)

timeline_agent = Agent(
    name="Timeline Agent",
    instructions="""
Convert SceneGraph into TimelineGraph.
Every layer must have start_seconds, duration_seconds, z_index, and type.
Use explicit animations and transitions.
""",
    output_type=TimelineGraph,
    tools=[validate_timeline_graph],
)

renderer_agent = Agent(
    name="Renderer Agent",
    instructions="""
For the MVP, always choose ffmpeg.
Reject or defer timeline features that cannot be rendered by the FFmpeg MVP.
Future versions may choose moviepy, canvas, remotion, blender, or external_api adapters.
Return a RenderPlan and call the renderer tool only when all inputs are valid.
""",
    output_type=RenderPlan,
    tools=[render_with_ffmpeg, write_project_files],
)

qa_agent = Agent(
    name="Video QA Agent",
    instructions="""
Validate the final video plan and rendered output.
Check schema validity, timing, captions, media paths, duration, safe margins, and output format.
Return a QAReport.
""",
    output_type=QAReport,
    tools=[inspect_media, validate_timeline_graph],
)

orchestrator_agent = Agent(
    name="Universal Video Orchestrator",
    instructions="""
You coordinate a backend-agnostic video generation workflow.
Use handoffs for specialized work.
Always produce or update Universal Video Schema objects before rendering.
Never assume Remotion is available.
""",
    handoffs=[
        planner_agent,
        scriptwriter_agent,
        visual_director_agent,
        timeline_agent,
        renderer_agent,
        qa_agent,
    ],
)
```

---

### 11.3 Function Tools

`src/universal_video_agent/tools.py`:

```python
import json
import subprocess
from pathlib import Path
from agents import function_tool
from pydantic import ValidationError
from .models import VideoSpec, TimelineGraph, RenderPlan, QAReport, QAIssue

@function_tool
def inspect_media(path: str) -> dict:
    """Inspect media using ffprobe and return duration, streams, width, height, and codec info."""
    p = Path(path)
    if not p.exists():
        return {"exists": False, "error": f"File not found: {path}"}

    cmd = [
        "ffprobe",
        "-v", "error",
        "-print_format", "json",
        "-show_format",
        "-show_streams",
        str(p),
    ]
    result = subprocess.run(cmd, capture_output=True, text=True, check=False)
    if result.returncode != 0:
        return {"exists": True, "error": result.stderr}

    return {"exists": True, "ffprobe": json.loads(result.stdout)}

@function_tool
def validate_video_spec(spec: dict) -> dict:
    """Validate a VideoSpec dictionary."""
    try:
        VideoSpec.model_validate(spec)
        return {"valid": True, "errors": []}
    except ValidationError as e:
        return {"valid": False, "errors": e.errors()}

@function_tool
def validate_timeline_graph(graph: dict) -> dict:
    """Validate a TimelineGraph dictionary and run basic timing checks."""
    errors = []
    try:
        tg = TimelineGraph.model_validate(graph)
    except ValidationError as e:
        return {"valid": False, "errors": e.errors()}

    for layer in tg.layers:
        if layer.start_seconds < 0:
            errors.append({"layer_id": layer.id, "error": "Negative start time"})
        if layer.duration_seconds <= 0:
            errors.append({"layer_id": layer.id, "error": "Non-positive duration"})
        if layer.start_seconds + layer.duration_seconds > tg.duration_seconds + 0.01:
            errors.append({"layer_id": layer.id, "error": "Layer exceeds video duration"})

    return {"valid": len(errors) == 0, "errors": errors}

@function_tool
def write_project_files(base_dir: str, files: dict) -> dict:
    """Write generated backend project files to disk."""
    root = Path(base_dir)
    root.mkdir(parents=True, exist_ok=True)

    written = []
    for rel_path, content in files.items():
        path = root / rel_path
        path.parent.mkdir(parents=True, exist_ok=True)
        path.write_text(content, encoding="utf-8")
        written.append(str(path))

    return {"written": written}

@function_tool
def render_with_ffmpeg(render_plan: dict) -> dict:
    """Render a video using the FFmpeg backend adapter."""
    # MVP implementation should call UniversalFFmpegRenderer(render_plan).render()
    plan = RenderPlan.model_validate(render_plan)
    return {
        "backend": "ffmpeg",
        "status": "ready_to_render",
        "message": "Validate and pass this plan to backends/ffmpeg.py",
        "output_path": plan.output_path,
    }
```

---

### 11.4 Orchestrator Runner

`src/universal_video_agent/orchestrator.py`:

```python
from agents import Runner
from .agents import orchestrator_agent

async def generate_video_from_prompt(prompt: str):
    result = await Runner.run(
        orchestrator_agent,
        prompt,
    )
    return result.final_output
```

CLI:

```python
import asyncio
import typer
from .orchestrator import generate_video_from_prompt

app = typer.Typer()

@app.command()
def generate(prompt_file: str):
    prompt = open(prompt_file, "r", encoding="utf-8").read()
    result = asyncio.run(generate_video_from_prompt(prompt))
    print(result)

if __name__ == "__main__":
    app()
```

### 11.5 Required CLI: `uvideo`

`uvideo` is a required MVP command-line tool implemented by this project. It is not an external dependency and must not be assumed to exist before implementation.

The CLI must live at:

```text
src/universal_video_agent/cli.py
```

It must be exposed through `pyproject.toml`:

```toml
[project.scripts]
uvideo = "universal_video_agent.cli:app"
```

Minimum required commands:

```bash
uvideo plan <prompt_file> --out <project_dir>
uvideo validate <timeline_graph>
uvideo render <render_plan> --backend ffmpeg
uvideo qa <video_file>
uvideo generate <prompt_file> --backend ffmpeg --out <output_path>
uvideo --help
```

Command responsibilities:

- `plan` reads a prompt or brief and writes `video_spec.yaml`, `scene_graph.json`, `timeline_graph.json`, `asset_manifest.json`, `render_plan.json`, and an initial `qa_report.json`.
- `validate` validates one or more schema artifacts and returns stable `UVS_*` error codes on failure.
- `render` renders a validated `render_plan.json` with the FFmpeg backend only in the MVP.
- `qa` inspects the rendered MP4 with ffprobe and validates duration, streams, captions, safe margins where metadata exists, and expected output settings.
- `generate` runs `plan`, `validate`, `render`, and `qa` in sequence.

Exit code contract:

- `0`: command completed successfully.
- `1`: user input, schema validation, timeline validation, or QA validation failed.
- `2`: render backend failed.
- `3`: unsafe file path or security policy violation.
- `4`: missing required system dependency such as `ffmpeg` or `ffprobe`.

Every command must support `--json` for machine-readable output and default to concise human-readable console output.

---

## 12. Backend Adapter Interface

`src/universal_video_agent/backends/base.py`:

```python
from abc import ABC, abstractmethod
from pathlib import Path
from universal_video_agent.models import RenderPlan

class RenderResult:
    def __init__(self, output_path: str, logs: list[str], artifacts: list[str]):
        self.output_path = output_path
        self.logs = logs
        self.artifacts = artifacts

class RendererBackend(ABC):
    name: str

    @abstractmethod
    def supports(self, plan: RenderPlan) -> bool:
        pass

    @abstractmethod
    def render(self, plan: RenderPlan) -> RenderResult:
        pass

    @abstractmethod
    def dry_run(self, plan: RenderPlan) -> dict:
        pass
```

---

## 13. FFmpeg Backend

### 13.1 When to Use

Use FFmpeg when:

- video consists mostly of existing media clips
- simple text overlays are enough
- captions can be burned in
- transitions are simple
- speed and reliability matter

Avoid FFmpeg-only rendering when:

- there are many complex animated text layers
- layout requires rich typography
- chart rendering is needed
- dynamic vector graphics are required

### 13.2 Implementation Strategy

FFmpeg adapter should generate:

- normalized media
- caption files
- filter_complex graph
- render command
- logs
- output video

### 13.3 FFmpeg Adapter Skeleton

```python
import subprocess
from pathlib import Path
from .base import RendererBackend, RenderResult
from universal_video_agent.models import RenderPlan

class FFmpegBackend(RendererBackend):
    name = "ffmpeg"

    def supports(self, plan: RenderPlan) -> bool:
        allowed = {"video", "audio", "image", "caption", "text", "background"}
        return all(layer.type in allowed for layer in plan.timeline_graph.layers)

    def dry_run(self, plan: RenderPlan) -> dict:
        cmd = self._build_command(plan)
        return {"command": cmd}

    def render(self, plan: RenderPlan) -> RenderResult:
        cmd = self._build_command(plan)
        result = subprocess.run(cmd, capture_output=True, text=True, check=False)
        if result.returncode != 0:
            raise RuntimeError(result.stderr)
        return RenderResult(
            output_path=plan.output_path,
            logs=[result.stdout, result.stderr],
            artifacts=[plan.output_path],
        )

    def _build_command(self, plan: RenderPlan) -> list[str]:
        width = plan.timeline_graph.width
        height = plan.timeline_graph.height
        fps = plan.timeline_graph.fps
        duration = plan.timeline_graph.duration_seconds

        # MVP: create blank background and audio mix.
        # Later: generate full filter_complex from layers.
        return [
            "ffmpeg",
            "-y",
            "-f", "lavfi",
            "-i", f"color=c=black:s={width}x{height}:r={fps}:d={duration}",
            "-t", str(duration),
            "-c:v", "libx264",
            "-pix_fmt", "yuv420p",
            plan.output_path,
        ]
```

### 13.4 Required FFmpeg Features

MVP:

- solid color background
- generated PNG text/card overlays for typography that is too complex for `drawtext`
- `drawtext` for simple text overlays when font support is available
- image overlays
- video overlays
- audio mixing
- burned-in captions from SRT
- trim and concat
- fade in/out
- ffprobe media inspection
- deterministic command generation saved with the render plan

V1:

- animated text via generated transparent PNG sequences
- waveform generation
- lower thirds
- pan/zoom
- basic transitions

V2:

- complex timeline graph to `filter_complex`
- hardware acceleration
- batch rendering
- template rendering

---

## 14. Future MoviePy Adapter

MoviePy is explicitly outside the MVP. Keep this section as future design guidance only.

### 14.1 When to Consider Later

Consider MoviePy after the FFmpeg MVP is stable and only when:

- text rendering and captions are central
- dynamic overlays are needed
- layout logic is easier in Python
- charts/images need to be generated with Python
- FFmpeg plus pre-rendered PNG/SVG assets cannot meet the visual requirement

### 14.2 Future MoviePy Adapter Skeleton

```python
from pathlib import Path
from moviepy import ColorClip, CompositeVideoClip, AudioFileClip, TextClip
from .base import RendererBackend, RenderResult
from universal_video_agent.models import RenderPlan

class MoviePyBackend(RendererBackend):
    name = "moviepy"

    def supports(self, plan: RenderPlan) -> bool:
        return True

    def dry_run(self, plan: RenderPlan) -> dict:
        return {"backend": self.name, "layers": len(plan.timeline_graph.layers)}

    def render(self, plan: RenderPlan) -> RenderResult:
        tg = plan.timeline_graph
        base = ColorClip(
            size=(tg.width, tg.height),
            color=(5, 8, 22),
            duration=tg.duration_seconds,
        )

        clips = [base]

        for layer in sorted(tg.layers, key=lambda l: l.z_index):
            if layer.type in ["text", "caption"] and layer.content:
                clip = TextClip(
                    text=layer.content,
                    font_size=int(layer.style.get("font_size", 64)),
                    color=layer.style.get("color", "white"),
                    size=(
                        int(layer.style.get("box_width", tg.width * 0.84)),
                        None,
                    ),
                    method="caption",
                )
                clip = clip.with_start(layer.start_seconds).with_duration(layer.duration_seconds)
                clip = clip.with_position((
                    layer.transform.x,
                    layer.transform.y,
                ))
                clips.append(clip)

            # Add image, video, audio, shape handling in V1.

        final = CompositeVideoClip(clips, size=(tg.width, tg.height))
        final.write_videofile(
            plan.output_path,
            fps=tg.fps,
            codec="libx264",
            audio_codec="aac",
        )

        return RenderResult(
            output_path=plan.output_path,
            logs=["moviepy render complete"],
            artifacts=[plan.output_path],
        )
```

### 14.3 Future MoviePy Features

Future adapter baseline:

- background
- text layers
- caption layers
- image overlays
- audio track
- simple fade/slide effects

Future V1:

- generated chart layers
- Ken Burns image motion
- waveform
- scene transitions
- SRT import/export

V2:

- per-frame custom animations
- external font management
- automatic layout constraints
- batch rendering

---

## 15. Canvas / Browser Backend

### 15.1 When to Use

Use Canvas when:

- web-style layout is important
- animated SVG/Canvas graphics are needed
- the team wants browser-based preview
- a future timeline editor is planned

### 15.2 Implementation Strategy

Generate:

```text
renderer/
├── index.html
├── render.js
├── timeline.json
└── package.json
```

Render via:

```bash
node render.js timeline.json out.mp4
```

Possible implementation:

- Puppeteer renders frames to PNG
- FFmpeg encodes PNG sequence to MP4
- audio mixed separately with FFmpeg

This backend is more complex than MoviePy but useful for web-like rendering without Remotion.

---

## 16. Optional Remotion Adapter

The project should not depend on Remotion, but a Remotion adapter can exist.

Rules:

- The core skill must not mention Remotion APIs unless the selected backend is `remotion`.
- Remotion adapter receives `TimelineGraph`.
- It generates React/Remotion project files.
- It does not control planning or schema.

This preserves compatibility while preventing lock-in.

---

## 17. Validation Rules

### 17.1 Schema Validation

Every generated object must pass Pydantic validation.

### 17.2 Timeline Validation

Check:

- no negative start times
- no non-positive duration
- no layer exceeds video duration
- captions do not overlap unless explicitly allowed
- audio does not exceed timeline unless trimmed
- scene durations sum to expected duration
- frame conversion is stable

Frame conversion:

```python
frame = round(seconds * fps)
seconds = frame / fps
```

### 17.3 Visual Safety

For mobile videos:

- keep critical text inside safe margins
- avoid captions behind platform UI zones
- keep headline under 2 lines when possible
- avoid too many simultaneous text layers
- maintain contrast ratio target

### 17.4 Caption QA

Check:

- caption segment duration >= 0.8s
- caption segment duration <= 6s
- Thai captions should avoid overly long lines
- maximum two lines per segment
- no caption extends beyond narration duration

### 17.5 Audio QA

Check:

- narration exists if required
- background music volume below narration
- no clipping
- sample rates are compatible
- final audio duration matches video duration

### 17.6 Factual QA for News

For news videos:

- separate confirmed facts from interpretation
- do not overstate availability
- include limitation cards when feature is region-limited, beta-only, enterprise-only, or not globally available
- include source notes in metadata

---

## 18. Caption Model

```python
class CaptionSegment(BaseModel):
    id: str
    start_seconds: float
    end_seconds: float
    text: str
    speaker: Optional[str] = None
    confidence: Optional[float] = None
```

Caption output formats:

- JSON for internal timeline
- SRT for FFmpeg
- VTT for web preview
- ASS for styled subtitles

SRT export:

```python
def to_srt_timestamp(seconds: float) -> str:
    millis = int(round(seconds * 1000))
    h = millis // 3_600_000
    millis %= 3_600_000
    m = millis // 60_000
    millis %= 60_000
    s = millis // 1000
    ms = millis % 1000
    return f"{h:02}:{m:02}:{s:02},{ms:03}"
```

---

## 19. Asset Management

### 19.1 Asset Sources

Assets can come from:

- local files
- user uploads
- generated images
- generated audio
- stock media
- remote URLs
- data files

### 19.2 Asset Normalization

Every asset must be copied or referenced in a project directory:

```text
project/
├── assets/
│   ├── audio/
│   ├── images/
│   ├── video/
│   ├── fonts/
│   └── data/
├── build/
├── renders/
└── manifests/
```

### 19.3 Media Inspection

Use FFprobe for:

- duration
- dimensions
- codec
- frame rate
- audio sample rate
- stream count

---

## 20. Animation System

The universal animation system must use keyframes, not backend-specific animation APIs.

Example:

```json
{
  "property": "opacity",
  "keyframes": [
    {"time_seconds": 0.0, "transform": {"opacity": 0}, "easing": "ease_out"},
    {"time_seconds": 0.4, "transform": {"opacity": 1}, "easing": "ease_out"}
  ]
}
```

### 20.1 Required Animation Types

MVP:

- fade in
- fade out
- slide up
- slide down
- scale in
- simple pan/zoom

V1:

- bounce
- spring-like entrance
- parallax
- blur in/out
- staggered bullet reveal

V2:

- custom curves
- graph-based animation editor
- motion presets library

---

## 21. Transition System

Transitions are represented between scenes:

```python
class Transition(BaseModel):
    id: str
    from_scene_id: str
    to_scene_id: str
    type: Literal["cut", "fade", "wipe", "slide", "zoom", "glitch"]
    duration_seconds: float
    easing: str = "ease_out"
```

MVP transitions:

- cut
- fade
- slide

---

## 22. Skill Rule Files

### 22.1 `rules/planning.md`

Must define:

- how to turn user request into `VideoSpec`
- how to select a pattern
- when to ask clarification vs choose defaults
- default output settings by platform

Defaults:

```yaml
tiktok:
  width: 1080
  height: 1920
  fps: 30
  max_duration_seconds: 90

youtube_shorts:
  width: 1080
  height: 1920
  fps: 30
  max_duration_seconds: 60

linkedin:
  width: 1920
  height: 1080
  fps: 30
```

### 22.2 `rules/scenes.md`

Must define:

- scene roles
- beat duration
- text hierarchy
- one idea per scene
- visual density rules

### 22.3 `rules/timeline.md`

Must define:

- seconds-to-frames conversion
- layer ordering
- z-index conventions
- audio and visual sync
- scene boundaries

### 22.4 `rules/captions.md`

Must define:

- caption splitting
- reading speed
- style rules
- SRT/VTT/ASS export
- mobile safe zones

### 22.5 `rules/audio.md`

Must define:

- narration track
- music track
- SFX track
- volume ducking
- loudness target
- clipping prevention

### 22.6 `rules/ffmpeg.md`

Must define:

- media inspection
- filter graph generation
- concat
- overlay
- drawtext
- subtitles
- final encoding settings

### 22.7 `rules/moviepy.md`

Must define:

- text rendering
- image/video/audio clips
- CompositeVideoClip strategy
- performance constraints
- font handling

### 22.8 `rules/qa.md`

Must define:

- checks
- error codes
- auto-fix options
- human review triggers

---

## 23. End-to-End Workflow

### 23.1 Generate Video Plan

```bash
uvideo plan prompt.md --out project/video_spec.yaml
```

Output:

```text
project/
├── video_spec.yaml
├── scene_graph.json
├── timeline_graph.json
├── asset_manifest.json
└── render_plan.json
```

### 23.2 Validate

```bash
uvideo validate project/timeline_graph.json
```

### 23.3 Render

```bash
uvideo render project/render_plan.json --backend ffmpeg
```

### 23.4 QA

```bash
uvideo qa project/renders/final.mp4
```

---

## 24. Example Prompt for the Agent

```text
Use the Universal Video Generation Skill.

Create a 55-second Thai AI news short for TikTok and YouTube Shorts.

Source:
xAI เปิดตัว Custom Voices บน Grok...

Requirements:
- 1080x1920
- 30fps
- Thai narration
- burned-in subtitles
- dark tech style
- animated headline
- number cards for "1 minute", "under 2 minutes", "80+ voices", "28 languages"
- limitation card: US only, except Illinois, API creation limited to Enterprise
- output backend: choose automatically, but do not require Remotion
```

---

## 25. Example Output Files

### 25.1 SceneGraph Example

```json
{
  "video_title": "xAI เปิดตัว Custom Voices บน Grok",
  "duration_seconds": 55,
  "scenes": [
    {
      "id": "scene_hook",
      "role": "hook",
      "start_seconds": 0,
      "duration_seconds": 4,
      "narration": "xAI เปิดตัว Custom Voices บน Grok",
      "on_screen_text": "xAI เปิดตัว Custom Voices",
      "visual_direction": "Large breaking-news headline, dark-tech background, pulse glow",
      "mood": "urgent",
      "importance": "high",
      "citations": []
    },
    {
      "id": "scene_speed",
      "role": "detail",
      "start_seconds": 4,
      "duration_seconds": 9,
      "narration": "ใช้เสียงพูดประมาณหนึ่งนาที และสร้างเสียง AI ได้ในไม่ถึงสองนาที",
      "on_screen_text": "1 นาที -> เสียง AI พร้อมใช้",
      "visual_direction": "Number cards and stopwatch animation",
      "mood": "surprising",
      "importance": "high",
      "citations": []
    }
  ]
}
```

### 25.2 TimelineGraph Example

```json
{
  "width": 1080,
  "height": 1920,
  "fps": 30,
  "duration_seconds": 55,
  "layers": [
    {
      "id": "bg",
      "type": "background",
      "start_seconds": 0,
      "duration_seconds": 55,
      "z_index": 0,
      "style": {"color": "#050816"}
    },
    {
      "id": "hook_title",
      "type": "text",
      "start_seconds": 0.2,
      "duration_seconds": 3.5,
      "z_index": 10,
      "content": "xAI เปิดตัว\nCustom Voices",
      "style": {
        "font_size": 84,
        "font_weight": 900,
        "color": "#ffffff",
        "align": "center",
        "box_width": 900
      },
      "transform": {"x": 90, "y": 720, "scale": 1, "opacity": 1},
      "animations": [
        {
          "property": "opacity",
          "keyframes": [
            {"time_seconds": 0.2, "transform": {"opacity": 0}, "easing": "ease_out"},
            {"time_seconds": 0.6, "transform": {"opacity": 1}, "easing": "ease_out"}
          ]
        }
      ]
    }
  ]
}
```

---

## 26. Backend Selection Logic

```python
def select_backend(timeline: TimelineGraph, requested: str | None = None) -> str:
    if requested and requested != "ffmpeg":
        raise ValueError("MVP supports only the ffmpeg backend")
    if requested == "ffmpeg":
        return "ffmpeg"

    layer_types = {layer.type for layer in timeline.layers}
    supported = {"background", "video", "image", "audio", "caption", "text", "shape"}
    unsupported = layer_types - supported
    if unsupported:
        raise ValueError(f"MVP FFmpeg backend does not support layer types: {sorted(unsupported)}")

    return "ffmpeg"
```

---

## 27. Error Codes

```text
UVS_SCHEMA_INVALID
UVS_TIMELINE_NEGATIVE_START
UVS_TIMELINE_LAYER_OVERFLOW
UVS_ASSET_MISSING
UVS_ASSET_UNSUPPORTED_CODEC
UVS_CAPTION_TOO_LONG
UVS_CAPTION_OVERLAP
UVS_AUDIO_MISSING_NARRATION
UVS_AUDIO_CLIPPING_RISK
UVS_SAFE_MARGIN_VIOLATION
UVS_RENDER_BACKEND_UNSUPPORTED_LAYER
UVS_FACTUAL_LIMITATION_MISSING
```

---

## 28. Acceptance Criteria

### AC-001: Generate a Backend-Agnostic Plan

Given a user prompt for a 30-60 second AI news short, `uvideo plan` must produce:

- `video_spec.yaml`
- `scene_graph.json`
- `timeline_graph.json`
- `asset_manifest.json`
- `render_plan.json`
- `qa_report.json`

The command must exit 0 and all generated JSON/YAML files must validate against the Pydantic models.

### AC-002: Validate a Timeline

Given a valid `timeline_graph.json`, `uvideo validate` must return `passed=true`.

Given a timeline with a negative start time, non-positive duration, layer overflow, missing asset, or unsafe caption segment, validation must fail with a stable `UVS_*` error code.

### AC-003: Render With FFmpeg Only

Given a valid MVP `render_plan.json`, `uvideo render --backend ffmpeg` must create an MP4 file without requiring MoviePy, Remotion, Canvas, Blender, or browser dependencies.

The rendered file must pass ffprobe checks for:

- expected width and height
- expected fps
- expected duration within 0.25 seconds
- H.264 video stream
- AAC audio stream when audio is present

### AC-004: Generate a Full AI News Short

Given `examples/ai_news_short/brief.md`, `uvideo generate --backend ffmpeg` must produce a vertical MP4 plus the saved intermediate artifacts.

The generated timeline must include:

- hook scene
- headline or context scene
- at least one detail/evidence scene
- limitation or safety scene when source material includes caveats
- outro or CTA scene
- burned-in captions
- source metadata for factual/news content

### AC-005: Reproducible Render

Running the same validated `render_plan.json` twice with the same assets must produce the same duration, resolution, stream metadata, and command log. Byte-for-byte output is not required because encoder metadata may differ.

### AC-006: Safe File Writes

All generated files must remain inside the requested project/output directory. Any path containing `..`, absolute paths outside the project root, or unsafe filename characters must be rejected before writing.

---

## 29. Testing Plan

### 29.1 Unit Tests

Test:

- Pydantic schema validation
- seconds-to-frames conversion
- caption timestamp export
- backend selection
- timeline overflow detection
- missing asset detection

### 29.2 Integration Tests

Test:

- prompt -> VideoSpec
- VideoSpec -> SceneGraph
- SceneGraph -> TimelineGraph
- TimelineGraph -> FFmpeg RenderPlan
- FFmpeg RenderPlan -> MP4

### 29.3 Golden Tests

Maintain sample prompts and expected JSON outputs:

```text
tests/golden/
├── ai_news_short.prompt.md
├── ai_news_short.video_spec.json
├── podcast_clip.prompt.md
└── explainer.prompt.md
```

### 29.4 Render Smoke Tests

Generate short 3-second videos:

- blank video
- text overlay
- PNG card overlay
- caption overlay
- image overlay
- audio mix

Required commands:

```bash
pytest
uvideo plan examples/ai_news_short/brief.md --out tmp/ai_news_short
uvideo validate tmp/ai_news_short/timeline_graph.json
uvideo render tmp/ai_news_short/render_plan.json --backend ffmpeg
uvideo qa tmp/ai_news_short/renders/final.mp4
```

---

## 30. Security and Safety

### 30.1 Voice and Likeness

If the workflow uses voice cloning:

- require explicit user confirmation
- store consent metadata
- mark voice source
- refuse requests to impersonate real people without permission

### 30.2 Copyright

For assets:

- track source and license
- avoid unlicensed downloads
- require user-provided or generated assets when uncertain

### 30.3 News Accuracy

For news content:

- require sources in metadata
- preserve caveats
- do not invent numbers
- mark uncertainty
- include limitation card when needed

### 30.4 File System Safety

Tools must:

- write only inside project directory
- prevent `../` path traversal
- avoid shell=True
- sanitize filenames
- resolve each destination path and verify it remains under the selected project/output root before writing

---

## 31. Development Roadmap

### Phase 0: Research and Extraction

Duration target: 2–4 days

Deliverables:

- map useful Remotion skill concepts to universal rules
- define schemas
- create root `SKILL.md`
- create first rule files
- decide MVP backend

### Phase 1: Spec-Only Skill

Duration target: 4–7 days

Deliverables:

- complete markdown skill files
- `VideoSpec`, `SceneGraph`, `TimelineGraph` schemas
- sample prompts
- sample JSON/YAML output
- validation CLI

Success criteria:

- agent can produce valid video plans without rendering
- plans are backend-agnostic

### Phase 2: Agents Python Orchestration

Duration target: 5–10 days

Deliverables:

- OpenAI Agents Python setup
- orchestrator and sub-agents
- handoff configuration
- function tools
- CLI entrypoint

Success criteria:

- prompt creates valid `VideoSpec`, `SceneGraph`, and `TimelineGraph`
- QA agent catches invalid timing and missing assets

### Phase 3: FFmpeg MVP Renderer

Duration target: 5–10 days

Deliverables:

- FFmpeg backend
- media inspection
- subtitle burn-in
- audio mixing
- basic overlay
- generated PNG text/card overlay support
- final encoding
- MP4 output
- render smoke tests

Success criteria:

- generate a 15-second vertical news video with text, captions, and at least one image/card overlay using FFmpeg only

### Phase 4: QA and Packaging

Duration target: 4–7 days

Deliverables:

- QA report
- test suite
- Dockerfile
- docs
- examples

Success criteria:

- one-command generation for example videos
- reproducible render in Docker

### Phase 5: Advanced Adapters

Duration target: ongoing

Deliverables:

- MoviePy adapter
- Canvas backend
- Remotion adapter
- Blender adapter
- OpenTimelineIO export
- external API adapters

Success criteria:

- adapters remain optional and cannot change the core universal schema contract

---

## 32. MVP Definition

The minimum usable product must support:

- AI news short pattern
- Thai and English text
- `uvideo` CLI implemented by this project and exposed through `pyproject.toml`
- VideoSpec generation
- SceneGraph generation
- TimelineGraph generation
- caption generation
- FFmpeg rendering
- FFmpeg media inspection
- QA validation
- CLI usage

MVP command:

```bash
uvideo generate examples/ai_news_short/brief.md --backend ffmpeg --out out/news.mp4
```

Expected output:

```text
out/
├── news.mp4
├── video_spec.yaml
├── scene_graph.json
├── timeline_graph.json
├── asset_manifest.json
├── render_plan.json
└── qa_report.json
```

---

## 33. Example Dockerfile

```dockerfile
FROM python:3.11-slim

RUN apt-get update && apt-get install -y \
    ffmpeg \
    fonts-noto \
    fonts-noto-cjk \
    fonts-noto-color-emoji \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app

COPY pyproject.toml .
RUN pip install --upgrade pip && pip install .

COPY . .

CMD ["uvideo", "--help"]
```

---

## 34. Implementation Priorities

Build in this order:

1. Pydantic models
2. schema export
3. validation functions
4. skill markdown files
5. Planner Agent
6. SceneGraph generation
7. TimelineGraph generation
8. QA Agent
9. FFmpeg backend
10. `uvideo` CLI entrypoint and `pyproject.toml` script registration
11. examples
12. Docker
13. tests
14. optional adapters, including MoviePy

---

## 35. Done Criteria

The project is considered complete for V1 when:

- A user can input a news article.
- The system creates a complete video plan.
- The system generates narration and subtitles.
- The system renders a vertical MP4 with FFmpeg and without MoviePy, Remotion, Canvas, Blender, or browser dependencies.
- The system produces a QA report.
- The generated video can be reproduced from saved JSON/YAML files.
- Backend adapters are isolated from core planning logic.
- Remotion is optional, not required.

---

## 36. References

- Remotion Agent Skills are designed as best-practice files for AI coding agents.
- Remotion skill concepts worth preserving: project setup guidance, deterministic frame-based animation, asset handling, sequencing, captions, FFmpeg usage, media duration/dimension inspection, and rule-based skill loading.
- OpenAI Agents Python concepts used by this spec: agents, tools, handoffs, structured output, runner execution, and multi-agent delegation.
