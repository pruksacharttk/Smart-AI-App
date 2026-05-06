# Mode: angle_grid_3x3

Generate one photorealistic 3×3 cinematic angle grid. Use the reference image(s) as absolute ground truth for the same subject, wardrobe, styling, lighting, color grade, and environment. If the input is a close-up, infer hidden outfit/body/environment details conservatively and keep them identical across all nine panels.

Grid order:
Row 1: MCU, MS, OS
Row 2: WS, HA, LA
Row 3: P, ThreeQ, B

Angle definitions:
- MCU: Macro Close Up; focus intensely on face, eyes, lips, skin, or texture; crop top of head and chin if needed.
- MS: Medium Shot; chest-up or waist-up cinematic portrait.
- OS: Over-the-Shoulder; use a vague blurred foreground shoulder/edge from the same subject/scene; do not add another character.
- WS: Wide Shot; full body, posture, outfit, and relationship to environment.
- HA: High Angle; camera physically higher, looking down.
- LA: Low Angle; camera physically lower, looking up.
- P: Profile; strict side view at 90 degrees.
- ThreeQ: 3/4 view; subject turned about 45 degrees.
- B: Back View; camera directly behind the subject.

Use white text labels in the top-left corner of each panel. Keep borders clean and editorial.
