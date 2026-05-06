# Master Prompt Template

Use the attached reference image(s) as absolute ground truth. Preserve the same subject identity, face, body proportions, hair, makeup, wardrobe, fabric materials, colors, textures, accessories, environment, lighting direction, shadow quality, color grade, and photographic style. Do not add or remove people, props, accessories, jewelry, glasses, logos, furniture, scenery, creatures, text, or objects unless explicitly present in the reference image(s) or explicitly requested.

Reference roles:
- Primary identity reference: {{primary_identity_reference}}
- Wardrobe/material reference: {{wardrobe_material_reference}}
- Lighting/color-grade reference: {{lighting_colorgrade_reference}}
- Pose/composition reference: {{pose_composition_reference}}
- Environment/set reference: {{environment_set_reference}}

Generation mode: {{mode}}
Aspect ratio: {{aspect_ratio}}
Style preset: {{style_preset}}
Custom style notes: {{custom_style_notes}}

Continuity locks:
{{continuity_locks}}

Camera/composition request:
{{camera_and_composition}}

Video keyframe anti-duplicate rule:
{{start_stop_anti_duplicate_rule}}

Rendering requirements:
Photorealistic cinematic image, physically plausible lighting, accurate anatomy, consistent subject design, realistic fabric behavior, realistic skin texture, realistic hair texture, correct perspective, consistent depth of field for the selected focal length and camera distance.

Negative constraints:
{{negative_constraints}}

Output format:
{{output_format}}
