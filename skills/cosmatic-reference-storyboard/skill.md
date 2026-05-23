---
name: cosmatic-reference-storyboard
description: Cosmetic reference storyboard prompt skill optimized for premium visual excellence, strict character identity locking, borderless contiguous grids with no white divider lines, global anti-hallucination for packaging and materials, video-friendly storyboard continuity, ambient lighting locks, exact product geometry and scale locks, full label transcription, cosmetic-specific usage intelligence, and natural hand anatomy guidelines while keeping existing schemas compatible.
category: image_prompt_generation
version: 1.1.0
icon: sparkles
tags:
  - shared-skill
  - imported
  - cosmetic
  - product-fidelity
auto_trigger: false
trigger_patterns: []
enabled_by_default: false
credit_multiplier: 1
priority: 50
execution_mode: llm-only
strict_provider_pin: false
---
# Prompt Logic

Every generated prompt MUST independently repeat:
- Character identity lock when people appear
- Character reference lock block when recognizable people appear
- Zero Character & Wardrobe Drift rules
- Cosmetic product packaging geometry lock
- Product reference color, material, and label lock
- Global Anti-Hallucination rules (no imaginary parts or materials)
- Product label transcription lock
- Environment, lighting, and ambient consistency lock
- Video-Friendly Storyboard Continuity & Environment Flow rules
- Equal-frame borderless storyboard grid lock
- Product usage intelligence rules
- Hand anatomy and product grip rules
- Negative constraints

This prevents image drift across storyboard frames and ensures the storyboard is completely animation and video-ready.

Recommended mode:
separate_prompt_per_frame

## Multi-Frame Storyboard Visual Rule

When `generation_mode` is `multi_frame_storyboard`, create a prompt for a clean image-only storyboard/contact sheet.

### Borderless & Contiguous Grid Layout (การควบคุมเลย์เอาต์ช่องแบบไร้กรอบและไร้เส้นขอบสีขาว)
Every storyboard prompt MUST contain **both**:
1. A positive borderless grid declaration (e.g. `seamless edge-to-edge grid`, `borderless contiguous panels`, `contiguous 3×3 panels touching edge-to-edge`)
2. Explicit negative prohibitions (e.g. `zero white divider lines`, `no black separator lines`, `no colored borders`, `no gutters`, `no margins`, `no frame outlines between panels`)

Neither one alone is sufficient. A prompt that only says "borderless grid" without explicit negative prohibitions FAILS this rule.

Default text to include verbatim in every multi-panel prompt:
`seamless borderless edge-to-edge grid, panels touch directly with zero white divider lines, zero black lines, zero gutters, zero margins, zero frame outlines, zero separator lines between panels`

- **No Divider Lines or Spacers**: The final storyboard grid MUST NOT contain any white margins, white divider lines, black lines, grey lines, margins, borders, frames, or gutter spaces between the individual panel frames.
- **Contiguous Touching Frames**: All individual panel frames must touch each other directly at their borders (e.g. edge-to-edge borderless layout). The grid cells must be perfectly adjacent and seamless.
- **Symmetrical equal-sized cells**: Every grid cell must be the exact same width and height.

Use `storyboard_layout_preset` together with `aspect_ratio` as the canvas contract:
- `canvas_1_1_*` presets require the final full storyboard image to be 1:1.
- `canvas_16_9_*` presets require the final full storyboard image to be 16:9.
- `canvas_9_16_*` presets require the final full storyboard image to be 9:16.
- `canvas_4_3_*` presets require the final full storyboard image to be 4:3.
- `canvas_3_4_*` presets require the final full storyboard image to be 3:4.
- `*_exact` presets require every frame to match the stated per-frame ratio exactly.
- `*_crop_safe` presets may have non-exact internal frame ratios, but every frame must include generous safe margins so each frame can be cropped after generation into 1:1, 16:9, or 9:16 without cutting off the product, face, hands, packaging, logo, or key action.
- If `storyboard_layout_preset` conflicts with `aspect_ratio`, prioritize the canvas ratio encoded in `storyboard_layout_preset` and explicitly mention that canvas ratio in the generated prompt.
- If `storyboard_layout_preset` is `auto`, choose the layout from the selected `aspect_ratio`: 1:1 uses 2x2 or 3x3 square frames, 16:9 uses 2x2 or 3x3 exact wide frames when exact per-frame ratio matters and 3x2 crop-safe frames for six-frame storyboards, 9:16 uses 2x2 or 3x3 exact vertical frames when exact per-frame ratio matters and 2x3 crop-safe frames for six-frame storyboards, 4:3 uses 4x3 square frames, and 3:4 uses 3x4 square frames.

When describing a multi-frame storyboard, state the exact grid, total frame count, final canvas aspect ratio, whether the frames are exact-ratio or crop-safe, and explicitly specify that the panels MUST be seamlessly joined with zero divider lines, gutters, borders, or margins between them. The storyboard must be one single generated image containing the requested grid.

The rendered image MUST NOT contain:
- frame numbers
- captions
- text boxes
- lower-third description bars
- subtitles
- overlay labels
- storyboard layout typography or visible frame descriptions
- white lines, black lines, white divider borders, black divider borders, margins, spacers, or grids between panels (must be 100% borderless, seamless, and touching edge-to-edge)

Before finalizing a storyboard prompt, scan the complete prompt text for BOTH of the following:
1. At least one positive borderless keyword: `seamless`, `borderless`, `contiguous`, or `edge-to-edge` paired with `grid`, `panels`, `layout`, or `frames`.
2. At least one explicit negative prohibition: `no white divider`, `no divider line`, `no border`, `no gutter`, `no margin`, or equivalent.

If EITHER check fails, append before output:
> `Seamless borderless edge-to-edge grid, panels touch directly with zero white divider lines, zero black lines, zero colored borders, zero gutters, zero margins, and zero frame separator lines between panels.`

Product packaging text, logos, and brand markings are not storyboard labels. Preserve them when they are part of the referenced product.

Descriptions may exist in the generated prompt text to guide each frame, but they must not be requested as visible text inside the generated storyboard image.

## Video-Friendly Storyboard Continuity & Environment Flow Rule

When `generation_mode` is `multi_frame_storyboard` or any grid/storyboard layout is requested, the generated prompt MUST enforce absolute visual continuity and seamless flow across all panels. The storyboard must feel like a sequence of consecutive frames extracted from a single high-end cinematic video reel. Standard image model background drift, camera jumping, or environment morphing is strictly forbidden.

Every generated storyboard prompt must explicitly detail and lock down these continuity anchors across all cells:

### 1. Static Background Anchor (การล็อกฉากหลังและองค์ประกอบคงที่)
- **Environment Rigidity**: The room architecture (such as vanity dressing table materials, marble countertops, mirror frame styles, bathroom wall tiles, background shelves, and window alignments) must be 100% identical in every panel.
- **Background Prop Locking**: Permanent background items (such as cosmetic organizers, flower vases, secondary product boxes, mirror placements, brushes, and room decorations) must stay in the exact same positions and maintain the same scale. They must not shift, morph, or disappear between frames.
- **Background Contrast**: If the product or face is close up, the background may blur due to camera depth-of-field (bokeh), but the blur color, texture, and shapes must remain logically continuous with the wider panels.

### 2. Consistent Ambient Lighting (ความคงที่ของทิศทางและโทนแสง)
- **Fixed Light Source**: Specify a single, unchanging primary light source (e.g., "Soft warm studio beauty lighting casting a gentle glow from the front-left, creating subtle highlights on the skin and casting consistent, soft shadows to the bottom-right of all cosmetic packaging").
- **No Shadow / Highlight Shifts**: The direction, length, softness, and color temperature of shadows and specular highlights on both the product packaging, the character's face, hands, and background vanity items must remain perfectly aligned across all panels.
- **Consistent Exposure**: All panels must have the same exposure, white balance, and contrast settings. Do not shift from high-contrast midday sunlight in one panel to a low-light moody evening grade in another.

### 3. Camera Motion & Progression Smoothing (การเลียนแบบการขยับมุมกล้องวิดีโอ)
- **Cinematic Framing Sequence**: The panel-to-panel camera positioning must simulate a continuous, smooth movie-camera flight path (e.g., Pan, Tilt, Dolly Push-in, Tracking, or Slow Zoom) rather than chaotic random cuts.
- **Transition Continuity**: The transition between adjacent panels must feel smooth. For example:
  - Panel A (Medium Establishing Shot of a cosmetic jar sitting on a luxury marble vanity table) -> Panel B (Slow Dolly Push-in, closer view of the jar showing the front label clearly) -> Panel C (Macro detail shot of the cream texture inside the open jar).
  - This prevents "visual jump cuts" and allows the storyboard panels to be seamlessly compiled or animated into a fluid short video (simulating a 24fps or 30fps video timeline).

### 4. Zero Character & Prop Drift (การล็อกความต่อเนื่องของบุคคลและพร็อพ)
- **Zero Wardrobe and Accessory Drift**: As defined in the Character Lock section, the clothes, hair, and jewelry must remain perfectly static.
- **Anatomical & Motion Continuity**: Any human action must follow a logical chronological progression. A movement cannot be broken:
  - Panel 5 (Hand holding a dropper vertically 3cm above the palm) -> Panel 6 (Squeezing the rubber bulb, a single clear serum droplet falling in mid-air) -> Panel 7 (The droplet landing softly on the palm, starting to glisten).
  - Do not have the hand jump from opening a bottle in one frame to applying makeup to the eyes in the next without a logical transition frame.
- **Props Consistency**: Small items used for styling or scale (like a white ceramic cup, cotton pads, beauty blenders, or brushes) must maintain their exact shape, color, and placement when visible across panels.

### 5. Continuity QA Verification
Before outputting, the prompt must pass a Continuity QA check. If any panel description would lead to a shifted background, mismatched wall colors, changing lighting angles, or disjointed character clothing, the prompt fails and must be rewritten to lock down these details.

## Product Fidelity Rule

**Core principle — Zero Visual Drift**: The reference product images are sent directly to the image generator as visual truth. The generated image must reproduce every visible attribute of the product exactly as shown — with zero changes of any kind. This includes, but is not limited to: overall silhouette and proportions, bottle/container shape, surface texture and material finish, cap/lid type and shape, label layout, color, hardware, and any other detail visible in the reference.

Reference product images are the highest-priority source of truth. Cinematic style, beauty mood, environment lighting, props, and upscale art direction may change the scene around the product, but they MUST NOT alter any visible attribute of the product itself.

### Global Anti-Hallucination & Packaging Material Fidelity Rule (กฎความแม่นยำและการป้องกันการจินตนาการวัสดุหรือชิ้นส่วนบรรจุภัณฑ์ขึ้นมาเอง ครอบคลุมทุกสินค้า)
To prevent the AI image generator from hallucinating or fabricating unseen packaging components, materials, or features that diverge from the actual product, you MUST enforce the following global rules:
1. **No Invention of Unseen Materials or Parts (ห้ามจินตนาการวัสดุหรือชิ้นส่วนบรรจุภัณฑ์ที่มองไม่เห็นขึ้นมาเอง)**: Do NOT assume, add, or describe any materials, hardware accessories, lid mechanisms, pumps, wands, caps, or packaging components that are not explicitly visible in the provided reference images.
   - **No imaginary pump/sprayer/dropper mechanisms**: If the reference product is a simple jar or squeeze tube, do not add a metallic pump, spray nozzle, chrome dropper, glass pipette, or gold dispenser cap unless they are visible in the reference images.
   - **No imaginary lids or structural materials**: Do not invent wooden caps, gold-plated lids, silver pumps, metal wands, or amber glass bottles if they are not shown in the references.
   - **No imaginary internal materials/appliances**: Do not add slide runners, drawers, drawer materials (like wood inside a cosmetic dresser, unless that is a vanity prop and even then do not mix it with product materials), stainless rails, or other unseen accessories.
2. **Default to Primary Exterior Finish (กำหนดให้ชิ้นส่วนเปิด/ชิ้นส่วนภายในใช้สีและวัสดุเดียวกับภายนอกเป็นค่าเริ่มต้น)**: If a packaging component is opened, unscrewed, or exposed in a storyboard frame, the material, color, and finish of its neck, inner cavity, internal rim, and open surfaces MUST default to matching the primary visible exterior finish of the product.
   - **Open bottle necks**: The screw threading and inside rim of an open bottle neck must match the exact glass/plastic/ceramic material and color of the container body. Do not invent contrasting black plastic inserts, metallic rings, or amber liners.
   - **Internal sponge/cushion cavities**: The inner tray, cushion holder, and mirror frame of a compact or palette must match the outer shell material and color.
   - **Wand stem and tips**: The applicator stem and wand must match the cap color or default to a clear translucent plastic, rather than inventing chrome metal or black plastic stems unless visible.
3. **Strict Visual Alignment over Imagined Aesthetics**: In all descriptions, prioritize literal visual facts from the reference over general AI aesthetic tendencies. If the reference is simple and clean, keep it simple and clean. Do not add "modern styling accents" like golden trim, metallic base rims, or custom embossed logos unless they are explicitly shown.

## Exact Product Geometry And Scale Lock

Every generated prompt MUST include a strict product geometry lock derived from the product reference images. The geometry lock is more important than making the product look like a common cosmetic category archetype.

Preserve the product's:
- height-to-width ratio
- short, tall, squat, wide, slim, chunky, rounded, tapered, square, oval, cylindrical, or rectangular body character
- cross-section shape, such as circular, oval, square, rounded-square, rectangular, flat-sided, faceted, or fully cylindrical
- curvature continuity, including whether the body has smooth round sides, flat panels, sharp edges, chamfered corners, ribs, grooves, seams, or facets
- cap-to-body height ratio
- cap diameter relative to body diameter
- shoulder, neck, rim, thread, hinge, pump, wand, sponge-tip, doe-foot, applicator, compact, palette, or jar geometry
- base thickness, bottom profile, top profile, and visible opening size
- orientation and pose of the package relative to hands or props
- number of visible product units and their size relationship to one another

If the reference product is short and squat, keep it short and squat. Do not stretch it into a tall slim tube, lipstick, lip-gloss bottle, serum bottle, mascara tube, perfume bottle, or any other standard cosmetic silhouette. If the reference product is tall and slim, keep it tall and slim. Do not compress it into a jar or compact.

If the reference product is round, circular, oval, or cylindrical, the generated product MUST remain round/cylindrical with smooth continuous curved sides. Do not turn a round bottle, vial, jar, cap, or compact into a square, rectangular, boxy, flat-sided, faceted, prism-like, hexagonal, octagonal, or rounded-rectangle package unless those flat sides or corners are visibly present in the reference product.

If the reference product has a circular cap or cylindrical lid, preserve the cap as circular/cylindrical. Do not replace it with a flat rectangular cap, squared cap, angular cap, or boxy closure. Preserve circular rims, rings, openings, screw threads, and bottom profiles as circles/ellipses in perspective, not as rectangles.

For liquid blush / sponge-tip / cushion-tip products, preserve the exact package architecture shown in the reference:
- the body height, body width, and rounded cylinder proportions
- the metallic cap height and diameter
- the screw neck/rim/threading when opened
- the short inner applicator stem or sponge/cushion tip scale
- the relationship between the open cap and product body
- any box or secondary package proportions when visible

Do not reinterpret a short HERORANGE-style sponge-tip liquid blush as a tall soft-touch liquid blush tube. Do not replace a short cylindrical vial with a taller matte bottle just because it looks more premium. Do not lengthen the product to fit a fashion editorial layout.

## Exact Product Color And Label Lock

**Core principle — Zero Visual Drift + Category Override**: The reference product images are sent directly to the image generator. However, image generators have very strong category priors for cosmetic packaging — they apply a generic "luxury serum bottle", "premium skincare jar", or "modern compact" archetype even when a reference is provided. To override these priors, the prompt must both anchor to the reference AND explicitly state category-level overrides derived from inspecting the reference.

- The prompt must NOT re-describe specific visual details (exact color, exact texture) — those come from the reference image.
- The prompt MUST include category override statements that tell the image model which of its priors to reject.
- Category overrides are derived by the LLM from inspecting the reference image — they are not hardcoded.

When `reference_product_images` are supplied, every prompt and every frame description MUST start its product section with a `PRODUCT REFERENCE LOCK:` block using this structure:

```
PRODUCT REFERENCE LOCK: reproduce this product exactly as shown in the attached reference image with zero changes to any visible attribute. [Container override: "this is a [CONTAINER CATEGORY from reference], NOT a [common wrong substitution]"]. [Proportion override: "proportions are [PROPORTION CATEGORY from reference], NOT [common wrong archetype]"]. [Cap override: "cap/lid is [CAP CATEGORY from reference], NOT [common wrong substitution]"]. [Dispensing override: "dispensing is [DISPENSING TYPE from reference], NOT [common wrong substitution]"]. Do not apply any generic cosmetic archetype. Warm scene lighting may affect the room but must not alter the product's appearance.
```

How to derive each category override by inspecting the reference:
- **Container category**: Is it a short wide jar, tall slim bottle, tube, compact, palette, vial, pump bottle, spray bottle, cushion compact, or blush bottle? Name what you see and name the most likely wrong substitution (e.g. "short wide jar, NOT a tall serum bottle").
- **Proportion category**: Is the product wider than tall, taller than wide, roughly cubic, or flat? State the direction explicitly.
- **Cap/lid category**: Is the cap round, flat disc, flip-top, screw thread, snap-on, hinged compact lid, or no cap? Is it the same material as the body or different? State what you see.
- **Dispensing mechanism**: Does the product have no dispensing mechanism (just a cap), a pump, a dropper, a spray nozzle, a wand, a sponge tip, or a brush? Name only what is visible in the reference.

Example — short white plastic jar reference (category overrides derived from reference inspection):
`PRODUCT REFERENCE LOCK: reproduce this product exactly as shown in the attached reference image with zero changes to any visible attribute. This is a SHORT WIDE JAR, NOT a tall serum bottle or tube. Proportions are SQUAT AND WIDE as in the reference, NOT tall and slim. Cap is a FLAT DISC LID as in the reference, NOT a pump or flip-top. No pump or dropper — dispensing is by removing the lid. Warm bathroom lighting may affect the scene but must not recolor the product.`

Example — liquid blush sponge-tip reference:
`PRODUCT REFERENCE LOCK: reproduce this product exactly as shown in the attached reference image with zero changes to any visible attribute. This is a SHORT CYLINDRICAL SPONGE-TIP BLUSH BOTTLE, NOT a tall mascara tube or lipstick. Proportions are SHORT AND CYLINDRICAL as in the reference. Cap is a METALLIC SCREW CAP as in the reference, NOT a flat disc or pump. Dispensing is via sponge-tip applicator inside the cap. Warm scene lighting may affect the environment but must not recolor the product.`

If the reference images conflict, choose the clearest hero product reference as the canonical product and keep it consistent.

## Exact Product Label Transcription Lock

Product label fidelity is a fatal requirement for this skill. A generated storyboard is not acceptable if it preserves only the brand name but drops the visible formula name, secondary lines, non-English text, weight/volume, badges, stickers, or other readable package details from the product reference.

If `product_label_text` is supplied, treat it as the canonical label transcript. Copy those strings exactly into every `PRODUCT REFERENCE LOCK:` block and into every frame prompt where the product front label is visible. Keep capitalization, punctuation, symbols, line order, trademark marks, non-English scripts, and units exactly as supplied. Do not translate, paraphrase, shorten, romanize, or invent replacement label text.

If `product_label_text` is not supplied, inspect the product reference images and transcribe all clearly visible product/package text before writing the storyboard prompt. Include a compact `VISIBLE LABEL TEXT TO PRESERVE:` list in the output prompt package. For the provided YerPall jar example, the lock should preserve the visible hierarchy rather than only the brand:
- `YERPALL™`
- `INTENSIVE ACTIVE`
- `GINSENG HYA NIGHT CREAM`
- Korean line visible under the formula name
- `10 g`
- any retailer/authenticity badge text only if the final generated frame intentionally includes that retail frame, not as a product-label replacement

If `label_fidelity` is `full_label_lock`, every hero, macro, marketplace, hand-held product, product-on-vanity, and product-use frame must request the full visible label hierarchy. If `label_fidelity` is `brand_and_key_lines`, preserve the brand plus formula/product-name and weight/volume at minimum. If `label_fidelity` is `layout_only_when_tiny`, only relax text readability when the product is genuinely small in frame; do not relax hero or close-up frames. If `label_fidelity` is `auto`, choose `full_label_lock` whenever the user provides `product_label_text`, uploads a clear product reference with readable packaging text, or asks for ad/marketplace/product-detail output.

Every product frame must include a label instruction with this structure:
`LABEL TRANSCRIPTION LOCK: front label must remain readable with the same line hierarchy: [brand line] / [secondary line] / [formula or product-name line] / [non-English line if visible] / [weight-volume line if visible]; do not reduce the label to brand-only text; do not omit formula, Korean/Thai/Japanese/Chinese/English lines, 10 g/ml/oz, badges, seals, or small visible label blocks when the product is close enough to read.`

When the product is small, partially turned, motion-blurred, or background-only, it is acceptable for fine print to be less readable, but the prompt must still preserve the correct label layout and must not replace it with a simplified brand-only mockup. At least the hero product frame and one close-up/product-detail frame must show the full readable front label hierarchy.

Never ask the image model to create a clean blank jar and then add only the logo. Never simplify a detailed retail/product label into a minimalist luxury label unless the reference product is actually minimalist. Do not invent fake formula text, fake size text, fake certification marks, or fake retailer badges.

## Label Readability Composition Rule

When the user asks for a storyboard/contact sheet and product label fidelity matters, do not make every product appearance a tiny lifestyle prop. The prompt package must allocate enough visual area for label text:
- include at least one dedicated front-facing product label verification frame
- in that frame, the product front label must face camera nearly straight-on, with minimal perspective warp
- the jar/bottle/box must occupy at least 45% of the frame height or width, whichever makes the label larger
- use macro/product-detail framing, sharp focus, no motion blur, no frosted glare crossing the text, no fingers covering text, no props overlapping text
- keep the full label hierarchy readable on the package itself: brand, secondary lines, formula/product name, non-English line, and weight/volume
- if the storyboard has 6+ panels, do not expect all tiny lifestyle panels to show micro text; instead make at least two panels product-detail/hero panels where the label is large enough to render

Do not create separate ad headlines, claim typography, ingredient bullet lists, retail banners, or poster text around the product unless the user explicitly asks for a designed ad poster. External text such as `HYALURONIC ACID 4`, ingredient lists, badges, or corner logos must not replace or compete with the actual package label. The skill's default output is an image-only storyboard, not a new graphic-design ad layout.

For the YerPall reference, never change the formula into `VITAMIN NIGHT CREAM`, `HYALURONIC ACID`, or another invented product line. The canonical product label remains `YERPALL™ / INTENSIVE ACTIVE / GINSENG HYA NIGHT CREAM / Korean line / 10 g` unless the user supplies a different `product_label_text`.

Before finalizing the output, perform a Label Completeness QA check. Fail and rewrite if any frame that shows the product front label omits visible canonical label lines, changes line order, changes the formula name, loses the weight/volume text, removes non-English label text, changes `YERPALL™` into `YerPall`, or replaces the real label hierarchy with a generic premium logo-only design.

For mechanical or appliance products, preserve:
- visible product silhouette and proportions
- control/button layout, count, spacing, and shape
- grille, cage, base, pole, motor housing, handles, hinges, or other defining geometry
- logo/brand placement and material finish
- all key industrial-design details

The prompt MUST forbid redesigning the product, changing the container/product shape, changing cap/base/button layout, inventing new controls or packaging, changing label hierarchy, adding fake labels, changing brand markings, hiding the product behind props, or replacing the product with a different item.

Before finalizing the output, perform a Product Fidelity QA check. Product Color Fidelity is a fatal QA gate: if any frame description implies a different product silhouette, cross-section shape, curvature, roundness, height-to-width ratio, cap-to-body ratio, package architecture, package color, lid material, label color, brand typography, weight/volume, or formula text than the product references, do not output that prompt. Rewrite that frame until the product remains reference-accurate. For white/translucent product references, fail the QA if the prompt allows amber/brown/black glass, gold/bronze/rose-gold lids, beige/pink/champagne tint, or warm color cast on the product packaging.

## Character Identity And Face Lock

**Core architecture principle**: The character reference image is sent directly to the image generator as base64. The generator can see the exact face, hair, skin tone, proportions, and distinctive features from the image itself. Therefore:

- The prompt must NOT re-describe specific facial features in text (face shape, eye spacing, nose type, etc.) — those details are already in the reference image and text descriptions risk creating contradictions.
- The prompt MUST anchor to the reference image and prohibit only the known drift patterns that AI generators commonly apply to character images.

When `reference_character_images` are supplied, every prompt and every frame description that shows a face or recognizable person MUST include a `CHARACTER REFERENCE LOCK:` block. The block must follow this structure:

```
CHARACTER REFERENCE LOCK: keep the person exactly as shown in the character reference image — [list of anti-drift prohibitions].
```

**Known drift failure modes to prohibit for character references:**
- **Face substitution**: AI frequently replaces the referenced person with a generic beauty model. Prohibit: `do not replace with a generic model, do not use a stock beauty face`
- **Age drift**: AI frequently makes faces younger or older. Prohibit: `do not change the person's age or facial maturity`
- **Hair drift**: AI frequently changes hair length, style, or color. Prohibit: `do not change hair length, hairstyle, or hair color from the reference`
- **Ethnicity drift**: AI frequently shifts ethnic appearance. Prohibit: `do not change ethnicity cues or facial ancestry impression`
- **Beauty normalization**: AI frequently smooths features into a generic attractive face. Prohibit: `do not beautify into a generic influencer face, preserve distinctive features`
- **Wardrobe drift**: When wardrobe is a continuity anchor. Prohibit: `do not change wardrobe when it is used as a scene continuity anchor`

Example — character reference (using reference-deferred approach):
`CHARACTER REFERENCE LOCK: keep the person exactly as shown in the character reference image; do not replace with a different model or generic beauty face; do not change hair length, hairstyle, or hair color; do not change the person's age; do not alter ethnicity cues; preserve all distinctive features; scene lighting may change but must not alter the person's appearance.`

For skincare, cosmetic, beauty, and product-use storyboards, keep the same character identity across every frame where the person appears. The person can change pose, expression, camera angle, and lighting, but must remain recognizably the same person. If the model cannot preserve identity confidently in a frame, prefer a product-only shot, hands-only shot, or partial face crop that does not invent a new face.

When the product requires application on a face, the prompt must say: `"keep the person exactly as shown in the character reference — same face, same hair, no model substitution, no face swap."`

Before finalizing the output, perform a Character Fidelity QA check. Character Identity Fidelity is a fatal QA gate: if any frame description implies a different face, different age, different hair length/style, or a generic beauty model replacing the reference person, do not output that prompt. Rewrite that frame until the character remains reference-accurate. If the image model may not preserve identity confidently in a frame, change that frame to product-only, hands-only, over-shoulder, back-of-head, partial-face crop, or detail shot instead of inventing a new face.

### Zero Character & Wardrobe Drift (การล็อกความคงที่ของตัวละครและเครื่องแต่งกายแบบ 100%)
To ensure that a recurring person appears perfectly consistent across the storyboard panels, anchor to the character reference image and prohibit:
- **Zero Wardrobe Drift**: Do not change the character's clothing style, color, or fabric from what is visible in the character reference. If the reference shows a beige linen blazer and white inner top, that combination must appear across all panels where she appears.
- **Exceptions for Logical Skincare/Cosmetic Steps**: The only allowed styling change is adding a simple white or pastel cotton spa headband in frames where she washes her face or applies cream. This headband must also remain consistent once applied.
- **Zero Hair Style Drift**: Do not change hairstyle, hair color, hair part, hairline, length, or texture from the character reference. Do not let hair change between frames.

## Product Usage Intelligence Rule

The skill MUST infer how the referenced product is actually used and build storyboard beats around realistic usage.

For every multi-frame storyboard:
- identify product category from the references
- infer normal handling and application steps
- include at least two frames that show product interaction, not just product placement
- include a believable result/benefit frame
- avoid impossible or category-wrong use

Examples:
- Eyeliner / liquid liner: open cap, show applicator or pen tip, draw controlled line along upper lash line, close eye/eyelid detail, show defined eye result. Do not apply to lips or cheeks.
- Lipstick / lip tint / lip gloss: open cap or wand, apply to lips, show lip close-up and color payoff or moisturized result. Do not apply to eyes or face skin.
- Compact powder / cushion / pressed powder: open compact with mirror, use puff/sponge/brush, pat onto cheeks or T-zone, show soft matte/even complexion result. Do not pour or smear like liquid skincare.
- Eyebrow pencil / brow gel / brow mascara / brow pen: use spoolie, brush, or pencil tip, fill and shape brow hairs with short hair-like strokes, show brow close-up and natural defined-brow result.
- Eyeshadow palette / eye makeup palette: open palette, pick up a matte or shimmer shade with brush/applicator, apply gently to eyelid/crease/lower lash line or outer corner, blend softly, show polished finished eye makeup. Do not place powder inside the eye or use it as lipstick/skincare.
- Eyelash mascara: remove wand, brush lashes from root to tip, show eye/lash close-up and lifted separated lashes result. Do not confuse eyelash mascara with brow mascara.
- Face cream / moisturizer / sunscreen: open jar/tube/pump, take small amount with fingertip/spatula/back of hand, dot/spread on cheeks/forehead/neck, show hydrated/dewy/protected skin result.
- Serum / essence / ampoule: use dropper/pump, dispense a few drops onto palm/fingertips, press/pat into skin, show glow/hydration result.
- Toner / essence toner / glycolic acid toner / exfoliating acid toner: open cap/nozzle, dispense a small amount onto cotton pad or palm, gently sweep/pat across face while avoiding eye and lip areas, show smoother brighter skin texture result. Do not scrub harshly or pour directly over the face.
- Acid toner care: for glycolic acid, salicylic acid, AHA, BHA, PHA, or other exfoliating toners, show gentle thin-layer use, avoid eye area/lips/irritated skin, do not scrub harshly, and imply sensible routine care such as hydration and daytime sunscreen.
- Micellar cleansing water / makeup remover: open flip cap, pour onto cotton pad, gently wipe makeup or cleanse skin, place bottle beside cotton pad on vanity, show fresh clean-skin result. Do not treat it as perfume, lotion, drink, or hair product.
- Facial serum: open dropper/pump, dispense a small amount, apply to face, pat into skin, show hydrated glow.
- Food/drink: open/serve/eat/drink naturally, show texture and enjoyment.
- Cleaning product: apply to correct surface/tool, wipe/scrub, show clean result.

The storyboard should feel like a smart mini usage sequence: establish product, show hero detail, show real interaction, show application/use, show sensory/benefit moment, close with aspirational result.

## Hand Anatomy And Product Grip Rule

For any frame that shows hands, the prompt MUST protect hand anatomy and realistic grip.

Require:
- natural left/right hand orientation
- correct palm direction and plausible wrist rotation
- correct thumb placement
- exactly five fingers per visible hand
- no fused fingers
- no extra fingers
- no duplicated hands
- no reversed palms
- no broken or rubbery joints
- product grip that matches real use

Grip examples:
- eyeliner and eyebrow pencils are held like a pen
- mascara and lip wands are held by the handle
- compact powder is held from the edge while puff/sponge touches the face
- cotton pads are pinched naturally between fingers
- serum droppers are held vertically above palm/fingertips
- cream is applied with a simple fingertip gesture

Prefer simple readable hand poses. In close-up product-use frames, use one clearly visible active hand when possible. Avoid crossing two hands over the face, overlapping hands with bottles, or complex mirrored poses unless the anatomy remains simple and readable.
