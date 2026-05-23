---
name: furniture-reference-storyboard
description: Furniture reference storyboard prompt skill adapted from the original reference storyboard bundle. Optimized for furniture product fidelity, exact scale/dimensions, compact and convertible furniture recognition, clean single-frame output control, default no-text rendering, strict storyboard-mode enforcement, strict equal-frame storyboard layout control, borderless storyboard presentation, strict per-panel uniqueness control, customer-journey storyboard planning, anti-redundancy frame design, broad furniture taxonomy coverage, product-source dominance, room-scale visualization, material preservation, construction details, realistic usage scenes, and reference-role disambiguation while keeping existing schemas compatible. Includes exhaustive visual inspection, furniture taxonomy coverage, variant handling, set handling, occlusion control, product-specific QA gates, current-reference contamination rejection, mandatory person-with-product interaction coverage, floor-textile/rug product support, physical-pattern text preservation, reference relevance ranking, dominant product category lock, product-family collection handling, environment compatibility control, cross-turn contamination fail-safes, and irrelevant-frame rejection.
category: image_prompt_generation
version: 1.4.8
icon: sofa
tags:
  - shared-skill
  - imported
  - furniture
  - interior
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
- Furniture product geometry lock
- Furniture material, color, finish, texture, and pattern lock
- Visible brand/marking/tag preservation lock when present
- Room, scale, and environment consistency lock
- Numeric dimension lock when user-supplied dimensions exist
- Compact/portable/convertible furniture scale guard when applicable
- Single-frame vs storyboard/collage output guard
- Default no-extra-text rendering guard
- Explicit storyboard-mode override guard
- Equal-frame storyboard grid guard
- Borderless storyboard presentation guard
- Strict per-panel uniqueness and duplicate-frame rejection guard
- Customer-journey and anti-redundancy storyboard guard
- Product-source dominance guard
- Watermark/marketplace-overlay exclusion guard
- Furniture taxonomy and subtype-specific fidelity rules
- Forensic vision inspection and micro-component preservation rules
- Variant, set, product-family, and multi-product handling rules
- Reference relevance ranking and irrelevant-reference rejection rules
- Dominant product category and current-product-majority lock
- Occlusion and product visibility rules
- Industrial design and joinery preservation rules
- Negative constraints

This prevents image drift across storyboard frames and prevents the referenced furniture from becoming a generic catalog item.

Recommended mode:
separate_prompt_per_frame

## Reference Role Disambiguation Rule

The skill MUST separate reference images into clear roles before writing any prompt:
- `reference_product_images` define the product only. Preserve the product category, geometry, dimensions, colorway, material, construction, markings, and scale from these images.
- `reference_character_images` define the recurring person only. Preserve identity only when a recognizable person appears.
- `reference_environment_images` define room mood, architecture, lighting, floor/wall material, and layout only. They MUST NOT override the product geometry, product color, product dimensions, product material, or character identity.
- Scene descriptions define action and composition, but they MUST NOT authorize redesigning the product unless the user explicitly requests a new product concept rather than reference fidelity.

When a reference set contains furniture-like objects in the environment image, treat those as background context unless they are also present in the product references. Do not accidentally replace the referenced product with an unrelated sofa, table, cabinet, bed, shelf, stool, cart, or decorative furniture from the room image.

When the supplied product references show multiple colorways or variants, choose the variant requested by the user. If the user does not specify, infer the dominant/clearest product variant from the product references and state it in `PRODUCT REFERENCE LOCK`. Do not blend variants into a new hybrid colorway or mixed construction.


## Current-Input-Only Reference Rule

Use only the reference images supplied in the current skill run. Do not borrow products, people, rooms, colors, layouts, or props from earlier uploads, previous test runs, generated outputs, or conversation history unless the user explicitly re-attaches or names them as valid references for the current run.

If the current run supplies exactly one product reference and one environment reference, the product reference defines the product and the environment reference defines only the room mood/architecture. Previous generated images are not product references and must not override the current product image.


## Reference Relevance Ranking And Rejection Rule

Before prompt writing, the skill MUST rank every current-run reference image into one of these roles:

1. `PRIMARY_PRODUCT_REFERENCE` — images that directly show the sellable product or product-family variants. These dominate all product facts.
2. `SECONDARY_CONTEXT_REFERENCE` — images that provide useful environment, scale, use-case, mood, or person-interaction context without defining the product.
3. `IRRELEVANT_OR_CONFLICTING_REFERENCE` — images that do not support the product story, conflict with the product category, or would cause unrelated fashion/travel/portrait/room frames. These must be ignored unless the user explicitly says to use them.

Ranking must be based on the current request only. If most product-like references show mats, rugs, cabinets, brackets, sofas, tables, or another clear product category, that product category becomes the storyboard subject. Any image that does not plausibly help sell or explain that product is demoted or rejected.

For example, if the current run contains multiple rug/mat product images plus an unrelated beach portrait, the rug/mat images are primary product references and the beach portrait is irrelevant. Do not create a beach/fashion panel. If the user also provides a room reference, use it only if it can plausibly contain the product and does not hide or replace the product.

A storyboard plan fails QA if any frame is primarily driven by an `IRRELEVANT_OR_CONFLICTING_REFERENCE`.

## Dominant Product Category Lock

After ranking references, the skill MUST declare one dominant product category or product-family category before writing any storyboard prompt. This category lock controls all panels.

Rules:
- If the references mostly show one product type from multiple angles, use `single_product_storyboard`.
- If the references show the same product category in multiple designs/colorways/patterns, use `product_family_or_collection_storyboard`.
- If one image is a person, room, or lifestyle scene but product images clearly indicate a different category, the product category wins.
- Do not let a visually attractive person/environment image override the product category.

For floor mat/rug collections, the dominant category should be something like `cute cartoon animal floor mat collection`, `bath mat collection`, `entry mat collection`, or `decorative floor textile collection`. Do not reinterpret it as fashion, travel, portrait, room design, blanket, towel, or generic carpet.

## Single Product Versus Product-Family Decision Rule

The skill must distinguish whether references describe one exact item or a family/collection of related items.

Use `single_product_storyboard` when:
- the same item appears repeatedly from different angles or usage states
- visible differences are caused by lighting, perspective, folding, opening, or installation state
- the user asks for one specific product

Use `product_family_or_collection_storyboard` when:
- references show several patterns, colors, or motifs of the same product category
- the items are clearly variants sold as a collection
- the common commercial subject is the category and design family rather than one exact SKU

For collection mode:
- do not blend variants into one impossible hybrid product
- show multiple variants deliberately as a collection when useful
- still preserve each variant's visible pattern/color when it appears
- make clear through composition that the collection belongs to one product family

For rug/mat collections, collection-mode frames may show one hero mat, a comparison of 2-3 variants, a bathroom/entryway placement, a user step-on frame, motif close-ups, and fiber/edge details.

## Current Product Majority Fail-Safe Rule

When the current input contains multiple references, the skill must infer the majority product signal. Product-like images in the current run outweigh unrelated character, travel, portrait, fashion, landscape, or empty-room images.

If current-run product majority conflicts with any prior context, discard the prior context. Prior products, prior rooms, and prior generated outputs are invalid unless re-attached in the current run.

A prompt fails QA if it uses old product memory or turns the current product majority into an earlier product category.

## Smart Human-With-Product Interaction Rule

The mandatory person-with-product requirement must be applied intelligently.

If a current character/person image is relevant and plausible for the product, use that person as the identity reference in at least one product-interaction frame.

If the current person image is irrelevant to the product category, environment, or use case, do NOT force that person or location into the storyboard. Instead, create a generic, non-identifiable user interaction that explains the product, such as:
- bare feet stepping on a mat
- a hand touching rug texture
- a person placing a mat at a bathroom or doorway
- a child/pet-adjacent use scene for child/pet-themed mats
- a hand opening a drawer, installing hardware, or using a furniture mechanism

Do not create a person-only frame. The human element is valid only when it demonstrates scale, contact, use, function, installation, or lifestyle benefit with the product clearly visible.

## Environment Compatibility Scoring Rule

Before using an environment reference, score whether it plausibly supports the product's actual use case.

Use an environment reference directly when it naturally matches the product category. Adapt it cautiously when it is partially compatible. Reject it when it would make the product look implausible, invisible, or unrelated.

Examples:
- bath mat -> bathroom entrance, shower area, sink area
- entry mat/doormat -> doorway, foyer, hallway
- cute animal mat/play mat -> nursery, kids room, pet corner, playroom
- dresser/cabinet -> bedroom, closet, dressing room, storage corner
- shelf bracket -> wall shelf installation, hardware close-up, workshop/installation context

An environment-only frame is invalid for product storyboards unless the user explicitly requested an establishing shot. Even then, the product should usually be present.

## Floor Textile Pattern Fidelity And Motif Lock

For rugs, mats, and soft floor coverings, the design pattern is a primary product feature. The skill must inspect and preserve motif identity, layout, color distribution, and scale.

Preserve when visible:
- animal faces, animal backs, paws, clouds, stars, flowers, letters, words, borders, geometric zones, cartoon characters, and object silhouettes
- exact relative motif placement such as large motif near a corner, central animal face, side border, top wordmark, or repeated paw shapes
- edge binding color, stitch/overlock color, rounded corners, scalloped/irregular top edge, and border thickness
- pile/fiber behavior that affects how motifs appear soft, raised, printed, tufted, fuzzy, looped, or plush

Do not replace a specific cute animal motif with a generic nursery illustration. Do not change a visible word such as WELCOME into unrelated text. Do not convert product text into overlay text. Do not erase product letters that are part of the mat design.

## Floor Textile Product Visibility Coverage Rule

Because mats and rugs are flat and can disappear into the floor, the storyboard must enforce visibility.

For a 3x3 mat/rug storyboard:
- at least 6 of 9 panels must show the mat clearly as the main subject
- at least 3 panels must show the full or nearly full mat shape
- at least 2 panels must show close-up texture, edge, pile, or motif detail
- at least 1 panel must show human or usage interaction with the mat
- no panel may rely on the mat as an indistinct background floor texture
- lifestyle wide shots must keep the mat readable, not tiny or hidden

If the mat's pattern is the main selling feature, the pattern must be readable in most product-visible panels.

## Floor Textile Collection 3x3 Role Map

When references show a collection of related mats/rugs rather than one exact SKU, use a collection-aware 3x3 storyboard. A strong default role map is:

1. hero of the clearest/dominant mat variant, full shape and pattern visible
2. top-down or three-quarter comparison of 2-3 collection variants
3. bathroom/entryway/playroom/pet-corner placement based on the best-fitting use case
4. close-up edge binding, rounded corner, stitch, overlock, or thickness
5. close-up pile/fiber texture and motif color separation
6. user interaction: feet stepping on the mat, hand touching texture, or placing the mat on floor
7. key motif detail such as animal face, paw print, cloud, flower, letters, or WELCOME word
8. scale/context frame showing the mat in a real room while still clearly visible
9. final styled lifestyle frame showing product-family identity without unrelated references

Do not allocate any panel to unrelated beach portraits, fashion frames, empty dressing rooms, or environment-only mood images.

## Strong Cross-Turn Contamination Fail-Safe

At the start of each skill run, discard all products, rooms, characters, colors, layouts, and generated images from previous turns unless the user explicitly includes them in the current input.

If the user says “use this set only”, “do not use previous images”, or equivalent, treat it as a hard constraint. Any prompt that references older images, older generated outputs, older product categories, or earlier test scenes fails QA and must be rewritten.

## Product-Source Dominance Rule

The product reference wins over every other source, even when it is a small ecommerce thumbnail, low-resolution image, marketplace image, or partially cropped product photo. The prompt must translate that product faithfully into the requested room and storyboard, not replace it with a more attractive generic furniture item.

When the product reference is a simple ecommerce cutout or small thumbnail, extract and preserve the observable product facts:
- product category and configuration
- silhouette and orientation
- fabric/material color
- cushion thickness and edge piping
- backrest height and angle
- pillow count and shape if included with the product
- leg count, leg color/material, and leg placement
- armrest absence/presence
- base height and floor clearance
- any visible brand overlay must be excluded unless physically attached to the product

For a gray daybed/floor sofa/chaise product with a single backrest, one long flat seat slab, one small rectangular pillow, four short tapered wooden legs, and no armrests, the generated product must remain exactly that: a low armless gray fabric daybed/chaise with short wooden legs. Do not transform it into a full living-room couch, sofa set, lounge chair, mattress on the floor, upholstered bed, thick platform bed, office chair, or larger sectional.

Every storyboard panel that shows the product must keep the same product identity. Different camera angles and usage scenes are allowed; redesigning the product is not.



## Current-Reference Completeness And Irrelevant-Frame Rejection Rule

Every generated frame must be justified by the current input references and the user request. A storyboard frame is invalid if it is merely an attractive lifestyle image but does not contain the referenced product, the referenced person when required, or the referenced environment role intended for that frame.

The skill must reject and rewrite any panel that:
- contains only the character without the product when the storyboard is a product storyboard, unless the user explicitly requested a character-only brand mood frame
- contains only the environment without the product when the storyboard is a product storyboard, unless the user explicitly requested an empty-room establishing shot
- uses an unrelated room, unrelated outdoor location, beach, garden, street, showroom, or prior test environment not supplied in the current run
- uses a different product category, different furniture silhouette, different drawer/door layout, or different hardware structure than the product reference
- turns the product into a more premium or larger generic item from the environment reference
- includes an unrelated beauty/fashion frame that does not help explain the product
- shows a person but no clear product interaction when a person-product frame is required
- for rug/mat products, shows a person, room, or lifestyle mood without the mat clearly present on the floor
- uses a character image or environment image that was ranked as irrelevant or conflicting
- shows a product category that is not the dominant product category inferred from the current product references
- treats a product-family collection as one blended hybrid SKU instead of deliberate variants

For ecommerce furniture storyboards, all frames should be product-relevant. A frame may be atmospheric only if it still includes the product clearly or supports a specific requested commercial objective.

## Mandatory Person-With-Product Interaction Rule

When the current input includes both `reference_character_images` and `reference_product_images`, a 3x3 storyboard should include at least one frame where a person and the referenced product are both clearly visible in the same panel, unless the user explicitly requests product-only output. Use the referenced person only when the person reference is relevant and plausible for the product; otherwise use a generic non-identifiable user interaction instead of forcing an unrelated person into the storyboard.

For 3x3 product storyboards with a character reference, the default minimum is:
- at least 1 frame: full or three-quarter view showing a relevant person/user beside or using the product, with the product clearly identifiable
- at least 1 frame: close interaction detail such as hand opening a drawer, hand touching a handle, person sitting, reaching, placing an item, or using the product function
- if the person's face is visible, preserve the character identity; if identity preservation is uncertain, use hands-only, partial-body, over-shoulder, or side-profile interaction while keeping the product clear

A person-only panel is not a valid substitute for a person-with-product panel. The person should demonstrate scale, use, ergonomics, storage access, installation, or lifestyle benefit of the product.

## Reference Role Coverage Quota For 3x3 Storyboards

For a standard 3x3 vertical product storyboard with product, environment, and character references, use this minimum coverage unless the user explicitly specifies otherwise:
- 9 of 9 frames must be relevant to the product story
- at least 7 of 9 frames must show the product clearly enough to identify the category and key silhouette
- at least 3 of 9 frames must show close product detail or functional evidence
- at least 1 of 9 frames must show a relevant user/person and product together clearly, or a generic interaction if the supplied character reference is irrelevant
- at least 1 of 9 frames must show the product in the supplied environment or a faithful adaptation of it
- 0 frames should be unrelated beauty, fashion, travel, empty-room, or generic mood imagery

If the reference environment already contains a similar furniture item, do not let that item replace the product reference. The current product reference remains the source of truth.

## Environment Compatibility And Reference-Role Conflict Rule

When the current input includes product, character, and environment references that do not naturally belong together, do not let the unrelated reference dominate the storyboard. The product remains the commercial subject. The environment reference is only a mood/architecture source if it can plausibly contain the product; the character reference is only a scale/use source if the person can plausibly interact with the product.

Reject and rewrite any storyboard plan where:
- a person reference becomes a fashion, beach, travel, beauty, or portrait panel without the product
- an environment reference becomes an empty architecture frame without the product
- the environment's existing furniture replaces the product reference
- the product is placed in an implausible room position that hides its real function
- product category and environment category conflict and the prompt does not resolve the conflict explicitly

If a product is a floor mat, rug, bath mat, play mat, entry mat, carpet tile, or textile floor covering, it must appear on the floor as the product subject. The environment may be adapted into a bedroom, nursery, closet, bathroom, entryway, playroom, pet corner, or dressing area depending on the product pattern and use case, but the mat/rug must remain clear and central enough to inspect. Unrelated beach, portrait, fashion, travel, or empty architecture references must be rejected or ignored.

## Floor Textile, Rug, Mat, And Carpet Product Fidelity Rule

For floor textile products, the skill must classify the item as a furniture-adjacent textile product, not as generic room decor. Preserve the exact textile product identity and surface design.

Inspect and preserve when visible:
- rectangular, runner, round, oval, irregular, or contour shape
- corner radius, rounded edges, stitched border, binding, overlock seam, piping, beveled edge, or hem
- pile height impression: low pile, medium pile, plush, shaggy, loop pile, chenille-like, microfiber, tufted, woven, felt-like, rubber-backed
- surface softness and fiber direction
- printed pattern, woven pattern, tufted color blocks, animal shapes, paw prints, cartoon motifs, clouds, letters, geometric motifs, stripes, and border lines
- exact color palette and pattern placement, including large motifs near corners or edges
- backing/anti-slip layer if visible
- thickness and how the mat lies on tile, wood, bathroom floor, playroom floor, or entry floor
- any physical text that is genuinely printed or woven into the product, such as “WELCOME” or decorative letters, while still excluding unrelated marketplace overlays and sale badges

Do not convert a floor mat into a blanket, wall tapestry, bedspread, sofa throw, generic carpet, plain rug, yoga mat, picnic blanket, or unrelated floor texture. Do not simplify a detailed printed mat into a plain solid rug.

For child/pet-themed mats with paw prints, animal faces, clouds, letters, or cute motifs, preserve the playful graphic style and placement. Do not replace the motif with generic floral patterns, luxury marble texture, plain beige carpet, or unrelated nursery illustrations. If multiple mat variants are present, preserve them as a product family or collection rather than merging their motifs into a single impossible hybrid design.

## Physical Text, Pattern Text, And Overlay Text Distinction Rule

The no-extra-text rule must not erase legitimate text or letterforms that are physically part of the product design. Distinguish three cases:

1. Physical product text/pattern text: letters, words, logos, or symbols printed, woven, embroidered, engraved, molded, or stitched onto the product itself. Preserve these when they are visible and commercially relevant.
2. Marketplace/editorial overlay: sale badges, price bubbles, measurement arrows, app UI, watermarks, product listing captions, “FREE” labels, Thai promotional copy, and graphic callout boxes. Exclude these unless the user explicitly asks for an ad mockup.
3. Background incidental text: tiny text on books, bottles, packages, or room props. Avoid emphasizing it and do not invent new text.

For floor mats and rugs, printed/woven letters such as decorative alphabet marks or words like “WELCOME” are part of the product pattern and should be preserved as best as possible. Do not add new words, but do not remove existing product text if it defines the product.

## Floor Textile 3x3 Customer-Journey Map

For a 3x3 vertical storyboard of a floor mat, rug, carpet, bath mat, play mat, kitchen mat, pet mat, or entry mat, use a floor-textile-specific journey rather than generic furniture shots:
1. full top-down or three-quarter view showing the complete mat shape and full pattern
2. room placement on floor with the mat clearly visible and correctly scaled
3. close-up of edge binding / stitched border / corner radius
4. close-up of pile, fiber texture, softness, and pattern color separation
5. person-with-product interaction such as bare feet standing on it, hand touching texture, or person placing it on the floor; product must be clear
6. functional placement frame: entryway, bedside, bathroom, nursery, playroom, pet area, or dressing area depending on product design
7. detail frame showing key motif placement, such as paw print, animal face, letters, clouds, or printed border
8. low-angle side view showing thickness and how the edge lies flat on the floor
9. final clean lifestyle frame with full product visible in the intended room context

For mat/rug products, at least 6 of 9 frames must show the mat large enough to inspect its shape, border, and main pattern. At least 3 of 9 frames must show the pattern or texture close enough to verify fidelity. Do not allocate frames to unrelated character portraits, beaches, luxury closet shots, or empty rooms without the mat.

## Rug / Mat Negative Constraints

For rug/mat/floor textile storyboards, reject and rewrite if any of these are likely:
- product appears only as a generic floor texture or indistinct carpet
- product pattern changes into a different motif family
- physical product letters or motifs disappear when they define the design
- marketplace overlay text is accidentally copied as product design
- the person appears alone without the mat
- the room appears without the mat
- the mat floats on a wall, bed, sofa, or table unless the user explicitly asks for a product display setup
- the mat becomes a blanket, towel, sheet, or fashion textile
- the environment reference contributes a room style that makes the product invisible or implausible
- an unrelated person/travel/fashion/beach image becomes a storyboard panel
- a product-family collection is incorrectly blended into one hybrid mat
- a compatible generic user interaction is omitted even though a person-only reference was irrelevant
- the dominant product category is ignored or replaced by an older product category from a previous run


## Storage Furniture And Drawer Fidelity Rule

**Core principle — Zero Visual Drift + Category Override**: The reference product image is sent to the image generator directly. However, image generators have very strong "category priors" from training data — they tend to apply a generic dresser, cabinet, or storage archetype even when a reference is provided. To override these priors, the prompt must do TWO things:

**Step 1 — Anchor to reference image:**
`"reproduce this product exactly as shown in the attached reference image with zero changes to any visible attribute"`

**Step 2 — Write Category Override Statements (read from reference, written explicitly):**
The LLM must inspect the reference image and identify the product's category attributes, then write them explicitly into the prompt. These are NOT hardcoded descriptions — they are category-level overrides derived from what the LLM actually sees in the reference. They override the image model's training-data priors.

For each reference product, inspect and write explicit category overrides for:
- **Material category**: Is it plastic, wood, metal, fabric, glass, or composite? State it: `"this is a [PLASTIC] storage unit, NOT a wooden dresser"` — if the reference shows plastic, say plastic; if wood, say wood.
- **Proportion category**: Is it wide-and-squat (wider than tall), tall-and-slim (taller than wide), or roughly cubic? State it: `"proportions are [WIDE AND SQUAT] as in the reference, NOT a tall narrow dresser"` — describe what you see, not what you assume.
- **Handle category**: Is it arch/scoop handles, round knobs, bar pulls, recessed slits, cutout slots, or no handles? State it: `"handles are [ARCH SCOOP TYPE] as visible in the reference, NOT round knobs or bar pulls"` — name the type you see and name the common wrong substitution to reject.
- **Base/leg category**: Does it have short plastic feet, tapered wooden legs, a plinth base, metal hairpin legs, or no visible base? State it: `"base has [SHORT PLASTIC FEET] as in the reference, NOT tapered wooden legs"` — describe what is actually visible.

These four category statements together override the image model's most powerful priors. Without them, even a clear reference image is insufficient because the model defaults to the most common archetype for that furniture word.

Common AI prior substitutions that category overrides must block (reminder, not exhaustive):
- Wide plastic storage chest → gets converted to tall Shaker-style wooden dresser with tapered legs and round knobs
- Low plinth base → gets converted to tapered wooden or metal legs
- Arch/scoop handles → get replaced with round knobs or thin horizontal bar pulls
- Smooth plastic surface → gets converted to painted wood grain or MDF texture
- Split top-row drawers → get merged into single wide drawers

### Anti-Hallucination Interior Finish Rule

When a drawer is shown open, its interior and sides must match the exterior finish of the reference product. Do NOT invent:
- raw wood box linings inside a plastic chest
- metal slide rails or stainless drawer runners unless visible in the reference
- contrasting materials inside a monochrome unit
- unpainted or unfinished back panels

## Dresser / Cabinet 3x3 Customer-Journey Map

For a 3x3 storyboard of a dresser, chest of drawers, cabinet, wardrobe, or storage unit, default panel roles should avoid unrelated scenes and cover the product journey:
1. full front hero view — the product silhouette, width-to-height ratio, and overall shape MUST match the reference exactly; if the reference is wider than tall, the generated product must also be wider than tall; do not apply a standard dresser archetype shape
2. three-quarter view showing depth and side profile — the product proportions must remain exactly as in the reference, no elongation or compression of the silhouette
3. open-drawer view proving drawer depth, with drawer interior matching the exterior finish of the reference product
4. close-up of the handle and drawer reveal exactly as visible in the reference image — do NOT change handle type, size, or position
5. close-up of lock/keyhole/hardware exactly as visible in the reference, or clean drawer seam if no hardware is visible
6. person-with-product frame opening or standing beside the unit for scale — product must match reference shape and proportions exactly
7. storage/lifestyle use frame with items being organized — product still matches reference, no drift allowed
8. side or base detail showing the base stance exactly as in the reference — no legs added if none are visible
9. final clean installed-room view with product fully visible and reference-accurate in every detail including proportions

Do not allocate any panel to a character-only fashion portrait, unrelated beach/outdoor shot, or generic environment shot without the product.

## Contamination And Prior-Output Rejection Rule

Generated outputs, earlier uploads, previous test products, and earlier character/environment images are never valid evidence for the current run unless the user explicitly reuses them in the current prompt. If a draft frame contains visual information from previous tests, unrelated furniture, unrelated rooms, or unrelated people, it fails QA and must be rewritten using only the current references.


## Reference Ranking QA Checklist

Before finalizing any storyboard prompt, answer these internally and rewrite if any answer fails:
- What is the dominant product category from the current references?
- Which images are primary product references, secondary context references, and irrelevant/conflicting references?
- Is this a single-product storyboard or product-family/collection storyboard?
- Does every panel serve the current product story?
- Are any panels driven by a rejected person, travel, fashion, portrait, beach, or empty-room reference?
- If a person appears, is the product also visible and is the interaction useful?
- If the product is a mat/rug, is the pattern readable and the mat clearly on the floor?
- Is any prior-turn product, generated image, or old room leaking into the prompt?

## Comprehensive Furniture Taxonomy Coverage Rule

The skill MUST support common furniture categories sold in ecommerce, retail, marketplace, showroom, and home-interior contexts. Before writing any prompt, classify the referenced product into one primary category and optional secondary category. Then apply the category-specific preservation rules below.

Core categories to recognize and preserve:

0. Floor textiles and soft floor coverings
- rug, carpet, area rug, runner, bath mat, kitchen mat, entry mat, doormat, play mat, baby mat, pet mat, bedside mat, anti-slip mat, floor cushion mat
- preserve shape, corner radius, border binding, pile height, fiber texture, backing, thickness, printed/woven pattern, motif placement, physical product text, and use-case placement on the floor
- never convert a mat/rug into a blanket, wall art, plain carpet, towel, bedspread, or generic floor texture

1. Seating furniture
- sofa, loveseat, sectional, modular sofa, chaise, recliner, armchair, lounge chair, accent chair, rocking chair, swivel chair, office chair, gaming chair, dining chair, bar stool, counter stool, bench, ottoman, pouf, floor chair, floor sofa, meditation chair, folding chair, outdoor chair
- preserve seat count, cushion count, armrest presence/absence, backrest height/angle, leg/base type, swivel/caster/rocker mechanism, recline geometry, upholstery texture, seams, tufting, piping, headrest, lumbar pillow, and any matching ottoman
- never convert one seating type into another: dining chair must not become office chair, floor chair must not become full sofa, sectional must not become loveseat, armless bench must not gain arms, recliner must not lose its reclining back/footrest cues

2. Sleeping and convertible furniture
- bed frame, platform bed, daybed, bunk bed, loft bed, sofa bed, futon, fold-out chair bed, trundle bed, headboard, mattress base, storage bed, crib, toddler bed
- preserve bed size impression, headboard/footboard presence, side rails, slats, storage drawers, leg height, pillow/mattress relationship, fold joints, hinge lines, support feet, and converted/unconverted configuration
- do not turn daybeds into full sofas, sofa beds into ordinary couches, bunk beds into storage shelves, or low platform beds into thick hotel beds unless reference supports it

3. Tables and surfaces
- coffee table, side table, end table, console table, dining table, desk, computer desk, vanity table, nesting table, folding table, extendable table, bar table, bedside table/nightstand, outdoor table, TV tray
- preserve tabletop shape, edge profile, thickness, overhang, apron, leg count, pedestal/trestle/sled/cantilever/base type, drawers, shelves, cable holes, casters, folding joints, extension leaves, glass/stone/wood/metal finish, and surface height relative to seating
- do not change a round table to rectangular, four legs to pedestal, glass top to marble, desk to dining table, or coffee table to bench

4. Storage and case goods
- wardrobe, closet, cabinet, cupboard, sideboard, buffet, credenza, dresser, chest of drawers, filing cabinet, TV stand, media console, shoe cabinet, bookcase, shelf unit, wall shelf, cube organizer, display cabinet, pantry cabinet, bathroom cabinet, laundry cabinet, storage cart, rolling rack
- preserve door/drawer count, open/closed compartment ratio, shelf count/spacing, handle count/location, hinge/sliding tracks, drawer reveals, panel gaps, glass/cane/mesh inserts, fluting, legs/plinth/base, caster count, rail positions, and wall/floor mounting
- do not add/remove drawers, change open shelves to closed cabinets, turn narrow racks into built-ins, replace caster carts with fixed shelves, or convert a TV stand into a dresser

5. Office and work furniture
- office chair, task chair, executive chair, gaming chair, standing desk, writing desk, computer desk, monitor riser, filing cabinet, workstation, meeting table, reception desk
- preserve ergonomic components, caster/base geometry, mesh vs upholstered back, armrests, headrest, lumbar support, lift cylinder, desk cable management, keyboard tray, drawers, modesty panels, and monitor shelf
- do not turn a task chair into a dining chair or a desk into a dining table unless specified

6. Dining and kitchen furniture
- dining table, dining chair, dining bench, bar stool, counter stool, kitchen island cart, pantry rack, sideboard, buffet, wine rack, baker's rack
- preserve seat/table height relationship, stool height, footrests, chair count in a set, table extension leaves, bench length, cart wheels, towel bars, shelf rails, and storage bins
- for sets, preserve whether the product is one item or a matching set; do not invent extra chairs or remove included pieces

7. Entryway, hallway, and utility furniture
- shoe rack, coat rack, hall tree, entry bench, umbrella stand, key cabinet, console, garment rack, laundry hamper rack, utility shelf, ironing board cabinet
- preserve hooks, rails, shelves, baskets, bench pad, shoe tiers, hanger rods, caster feet, height, width, and wall/floor contact

8. Bathroom and laundry furniture
- vanity cabinet, medicine cabinet, bathroom shelf, over-toilet rack, laundry shelf, laundry cart, hamper, towel rack, linen cabinet
- preserve moisture-resistant materials, open shelf layout, cabinet doors, mirror position, towel bars, baskets, casters, and scale relative to sink/toilet/washing machine

9. Outdoor, patio, and garden furniture
- patio chair, outdoor sofa, rattan set, garden bench, folding camping chair, sun lounger, patio table, umbrella table, outdoor storage box, deck chair
- preserve weatherproof material, woven rattan/cane/plastic weave, metal tube frames, fabric sling, cushions, recline positions, wheels, umbrella holes, fold joints, and outdoor scale
- do not convert outdoor furniture into indoor upholstered luxury furniture unless requested

10. Children's, nursery, and pet furniture
- crib, toddler bed, changing table, kids chair, study desk, high chair, toy storage, play table, pet bed, cat tree, pet sofa
- preserve child/pet scale, safety rails, guard rails, rounded corners, ladder placement, storage bins, cushion thickness, scratching posts, platforms, and enclosure geometry

11. Commercial and hospitality furniture
- cafe chair/table, restaurant booth, hotel lounge chair, waiting bench, salon chair, massage table, retail display shelf, reception counter, classroom desk, dorm furniture
- preserve commercial scale, durability cues, stacking/folding behavior, metal frames, laminate surfaces, upholstery type, booth back height, and repeated units only when reference shows multiples

12. Modular, flat-pack, and transformable furniture
- modular shelving, modular sofa, stackable cubes, extendable table, folding stool, folding bed, wall bed, lift-top table, convertible sofa bed, adjustable recliner, collapsible rack
- preserve module count, connector positions, hinge lines, fold axes, expansion leaves, locking clips, caster/brake locations, and the exact state shown in each panel
- when showing alternate configurations, every configuration must be mechanically plausible from the same referenced product; do not invent modules, extra cushions, or alternate colorways

If the product does not fit any category exactly, classify it by physical construction first: seating surface, sleeping surface, storage volume, tabletop surface, rack/shelf structure, or hybrid/transformable structure. Preserve the physical construction over the marketing name.

## Canonical Product Attribute Extraction Rule

Before writing prompts, extract these attributes from the product reference and restate them in the `PRODUCT REFERENCE LOCK` when visible or supplied:
- category and subtype
- single item vs set; exact number of included units
- overall silhouette and footprint
- height/width/depth relationship and numeric dimensions when supplied
- primary visible orientation and allowed alternate orientations
- support system: legs, pedestal, plinth, casters, wall mount, floor pad, suspension, rails, glides
- countable structure: cushions, panels, drawers, doors, shelves, legs, wheels, arms, slats, modules, pillows, handles, hooks, rails, baskets
- material and finish for every visible major part
- seams, stitching, piping, tufting, fluting, grooves, weave, grain, bevels, edge profiles, joinery, fasteners, hardware
- functional features: reclining, folding, swiveling, rolling, extending, stacking, sliding, lifting, converting, storage access
- no-go substitutions: explicitly name common mistaken categories that must not be generated

The prompt should not rely on generic wording like “same furniture as reference.” It must name the concrete observable attributes.

## Storyboard Product Persistence Rule

In any storyboard requested to test or advertise furniture, the product must appear clearly and consistently across the storyboard.

For a 3x3 storyboard:
- at least 7 of 9 panels must show the same referenced product clearly
- the remaining panels may be macro/detail, material, mechanism, or room-context shots, but they must still show a recognizable part of the same product when possible
- no panel may replace the product with a different furniture category, different colorway, different material, or different scale
- product-only, detail, side, back, usage, and environment panels are all acceptable, but the product identity must persist

Recommended 3x3 furniture storyboard sequence when user does not provide panel beats:
1. hero front three-quarter view of the exact product
2. product-only clean view showing full silhouette
3. side/profile view showing depth, legs/base, and back/arm geometry
4. realistic use with person or room-scale cue
5. detail/macro of material, seams, joinery, weave, hardware, or mechanism
6. back/underside/alternate angle showing support structure
7. functional feature or configuration view if applicable; otherwise another practical usage view
8. room placement view showing scale and floor/wall contact
9. final lifestyle/context view preserving the exact same product

For 2x2, 2x3, 3x2, 4x3, or other grids, apply the same principle: most panels must show the same product, and all panels must preserve category, countable structures, materials, and scale.

## Product Fidelity Failure Modes And Corrections Rule

The prompt MUST detect and correct common furniture-generation failures before output:
- storyboard request collapses into a single hero photo -> force `STORYBOARD GRID LOCK` and exact panel count
- product thumbnail is ignored in favor of furniture from environment -> reinforce `Product-Source Dominance`
- product becomes more premium/generic showroom furniture -> restate exact low-level attributes and no-go substitutions
- cushion/drawer/leg/shelf counts drift -> restate countable structures as fatal locks
- product scale changes across panels -> restate numeric scale and human/room scale cues
- text/labels appear unintentionally -> enforce image-only no-extra-text rule
- watermarks or marketplace logos appear -> exclude non-product overlay text
- person hides the product -> require product visibility and no occlusion of defining structure
- alternate configuration invents impossible parts -> require mechanically plausible transform based on reference
- environment props become the product -> define environment images as background only

If any failure mode is likely, rewrite the prompt before output.

## Required Prompt Block Order

For each generated prompt, use this order so fidelity instructions are local and unambiguous:
1. `OUTPUT FORMAT LOCK` — aspect ratio, single image vs storyboard, exact grid when requested, no captions/labels unless explicitly requested.
2. `TEXT RENDERING POLICY` — render no extra visible text by default; text overlays only when the user explicitly asks for them.
3. `REFERENCE ROLE LOCK` — product images are product truth, character images are identity truth, environment images are scene truth only.
4. `CHARACTER REFERENCE LOCK` — only when a recognizable referenced person appears.
5. `PRODUCT REFERENCE LOCK` — exact category, silhouette, construction, color/material/finish, visible markings.
6. `PRODUCT SCALE LOCK` — numeric dimensions if supplied, compact/full-size classification, human/room scale cues.
7. `STORYBOARD GRID LOCK` — mandatory for storyboard requests; exact grid, equal panels, uniform gutters, no single-frame fallback.
8. `SCENE DESCRIPTION` — action, environment, camera, lighting, composition.
9. `NEGATIVE CONSTRAINTS` — no redesign, no recolor, no wrong scale, no invented text, no anatomy errors.
10. `QA BEFORE OUTPUT` — rewrite internally if the prompt violates product, scale, character, storyboard, or environment fidelity.

Do not output analysis or QA notes as visible text inside the generated image. Visible measurement annotations, arrows, UI callouts, labels, captions, Thai text, English text, or infographic overlays are forbidden unless the user explicitly asks for an annotated product diagram.


## Default No-Extra-Text Rendering Rule

By default, generated images must be image-only. If the user does not explicitly request text inside the image, do not render any extra visible text.

Forbidden by default unless explicitly requested:
- captions
- headlines
- subheads
- bullet points
- product feature callouts
- spec labels
- frame numbers
- Thai or English promotional text
- measurement numbers and arrows
- badges, banners, stickers, price bubbles, or sale marks
- infographic labels
- UI chrome, card labels, or mockup text

Allowed without special permission only when physically part of the real referenced product or environment:
- sewn brand tag physically attached to the product
- engraved logo, maker mark, or printed care label physically present on the product
- tiny unavoidable real-world text that belongs to background objects in the room and is not being showcased

If the user wants text, only render the specific text they asked for. Do not invent additional slogans, captions, or feature copy.

Before finalizing a prompt, perform a No-Extra-Text QA check: if the prompt would likely generate any added text overlay, title, annotation, frame label, caption band, measurement arrow, or promotional copy that was not explicitly requested, rewrite the prompt to remove it.


## Explicit Storyboard Mode Enforcement Rule

If the user selects or requests a storyboard, contact sheet, grid, frame sequence, 3x3, 2x3, 3x2, 2x2, or any `storyboard_layout_preset`, the output format MUST be multi-frame storyboard, even if `generation_mode` is ambiguous or left as `auto`.

Storyboard intent has priority over single-frame defaults. Do not collapse a requested storyboard into one hero photograph.

For a requested 3x3 storyboard:
- output one single final image containing a 3 columns x 3 rows grid
- include exactly nine separate panels
- every panel must be equal-sized
- each panel must show a distinct product-relevant scene, angle, detail, or usage moment
- every panel must preserve the same referenced product
- no captions, frame numbers, labels, arrows, or text overlays unless explicitly requested

If a prompt generated for a 3x3 storyboard describes only one scene, one camera view, one hero photograph, or one large composition without nine panels, it fails QA and must be rewritten as a 3x3 storyboard before output.

## Single-Frame Output And No-Collage Default Rule

Unless `generation_mode` is explicitly `multi_frame_storyboard`, the prompt MUST describe one coherent final photograph, not a product collage, not a contact sheet, not a catalog grid, and not a before/after comparison.

For `single_frame` and `separate_prompt_per_frame`, each prompt must produce exactly one scene with one camera view. Do not embed smaller reference images, inset panels, multi-angle thumbnails, dimension diagrams, montage strips, or showroom spec cards inside the rendered image unless the user explicitly requests a designed product infographic or storyboard sheet.

A prompt for a lifestyle hero image should focus on:
- one main product instance
- one believable room setting
- one camera angle
- one clear action or usage moment
- clean product visibility without internal subframes or reference-photo replication

If multiple product references show different configurations, use them to understand the same product's construction and convertibility, but do not reproduce them as miniature panels inside the final image. Choose the requested configuration for the hero frame, or state the chosen configuration in `PRODUCT REFERENCE LOCK`.

Visible dimension numbers, white measurement arrows, ruler lines, spec labels, Thai text, English labels, brand banners, or catalog UI graphics are forbidden by default. They are allowed only when the user explicitly asks for an annotated product diagram, sales infographic, marketplace image with text, or spec sheet.


## Borderless Storyboard Presentation Rule

Every storyboard prompt MUST contain **both**:
1. A positive borderless grid declaration (e.g. `seamless edge-to-edge grid`, `borderless contact sheet`, `contiguous 3×3 panels`)
2. Explicit negative prohibitions (e.g. `zero white divider lines`, `no black separator lines`, `no colored borders`, `no gutters`, `no margins`, `no frame outlines between panels`)

Neither one alone is sufficient. A prompt that only says "borderless grid" without explicit negative prohibitions FAILS this rule. A prompt that only lists "no white lines" without a positive grid description also FAILS.

Default requirements to include verbatim in every multi-panel prompt:
- `seamless borderless edge-to-edge grid, panels touch directly with zero white divider lines, zero black lines, zero gutters, zero margins, zero frame outlines, zero separator lines between panels`
- every panel must be mathematically identical in height and width forming a perfectly aligned grid to allow clean automatic cropping and frame slicing
- no overlay numbering, no editorial boxes, no graphic panel frames unless explicitly requested

If panel separation is needed for readability, prefer edge-to-edge hard cuts between panels. Do not draw white lines, white gutters, colored bars, or boxed outlines. If the image model cannot avoid a gap, the gap must be nearly invisible and must not read as a deliberate white border.


## Strict Per-Panel Uniqueness Rule

A storyboard must not contain multiple panels that are visually or semantically near-duplicates. Similar product visibility is allowed, but repeated camera distance, repeated camera angle, repeated product orientation, repeated prop setup, and repeated user action are not allowed unless the user explicitly asks for comparison variants.

For a 3x3 storyboard, enforce this uniqueness contract:
- no more than 2 panels may use the same broad camera angle category
- no more than 2 panels may use the same shot distance category
- no more than 2 panels may show the same product orientation
- no more than 1 panel may repeat the same user action
- at least 7 of 9 panels must have clearly different visual intent
- at least 6 of 9 panels must have a different camera distance, angle, or functional state from adjacent panels

Shot distance categories include:
- full-room context
- full-product hero
- side/profile view
- top-down or high-angle view
- underside/back view
- macro/detail close-up
- hands-only interaction
- full-body lifestyle interaction
- folded/stored/portable state

If any two panels could be described by essentially the same sentence, the prompt is too repetitive and must be rewritten.

## Required 3x3 Panel Role Map Rule

For a 3x3 furniture storyboard, the skill should create a deliberate nine-panel role map before writing the image prompt. The role map must assign a distinct, highly logical customer-journey job to every panel. The sequence must tell a continuous, benefit-driven story tailored to the exact category of the reference product.

Find the matching category in the taxonomy and enforce its specific 3x3 role map:

### 1. Seating Furniture Journey (โซฟา, เก้าอี้พักผ่อน, อาร์มแชร์)
1. **Hero Establishing**: Full view of the seating product placed in the center of a matching styled living room.
2. **Silhouette / Depth**: Three-quarter angle showing overall length, armrest style, and seat depth.
3. **Cushion & Seams Detail**: Close-up showing fabric weave/leather texture, piping, seams, and cushion plushness.
4. **Ergonomic Profile**: Direct side view proving backrest tilt, seating height, and leg clearance.
5. **Real-Use (Scale)**: Adult sitting down naturally, reading a book or relaxing, proving true scale.
6. **Support & Feet Detail**: Low-angle view focusing on leg materials, joints, glides, or base structure.
7. **Comfort Demonstration**: Close-up of hand pushing into a cushion, showing realistic foam compression.
8. **Lifestyle Benefit**: Alternate wider room angle showing the seating product as a cozy, welcoming centerpiece.
9. **Clean Product Confirmation**: Product-only view from a high-angle three-quarter perspective, solidifying form.

### 2. Sleeping & Convertible Furniture Journey (เตียง, โซฟาเบด, เดย์เบด, ฟูก)
1. **Hero Bedchamber**: Complete bed frame or daybed in a beautifully styled bedroom or studio setup.
2. **Headboard Detail**: Close-up of the headboard showing texture (wood grain, tufting, or rattan weave).
3. **Mechanism / Configuration A (Upright/Closed)**: Clear profile showing the product in its primary state.
4. **Transition / Action (Fold/Convert)**: Hand turning a latch, pulling a handle, or folding a hinge.
5. **Mechanism / Configuration B (Reclined/Open)**: Full view showing the product fully converted/extended.
6. **Frame & Slat Evidence**: Low-angle detail showing side rails, sturdy support legs, and wood slats/base.
7. **Upholstery / Sewing Detail**: Close-up of zipper lines, piping, folding joints, or seam stitch details.
8. **Rest / Usage (Scale)**: Person lying down or resting comfortably on the bed/mattress, showing full length.
9. **Final Styled Lifestyle**: Wide atmospheric shot showing the product in its best-fitting state in the room.

### 3. Tables & Surfaces Journey (โต๊ะกลาง, โต๊ะกินข้าว, โต๊ะข้าง)
1. **Hero Surface**: Full-view of the table styled in a dining or living room setting.
2. **Tabletop Geometry**: High three-quarter angle showcasing tabletop shape, grain flow, or marble veining.
3. **Edge & Profile Detail**: Close-up focusing on tabletop thickness, chamfer/bevel edge, or bullnose profile.
4. **Sturdy Leg Stance**: Low-angle shot showing leg/base connection, pedestals, or trestle brackets.
5. **Joinery & Hardware**: Macro shot of underside brackets, screw plates, tension cords, or slide mechanism.
6. **Utility / Prop Scale**: Close-up of hands placing a cup or laptop on the table, showing height and finish.
7. **Surface Texture / Material**: Macro close-up of marble chips, wood grain cathedral pattern, or brushed metal.
8. **Lifestyle / Multi-Seat**: Table styled with chairs or stools, showing the full spatial footprint in action.
9. **Clean Structural View**: High-angle product-only shot demonstrating perfect symmetry and leg stability.

### 4. Storage & Case Goods Journey (ตู้เสื้อผ้า, ตู้วางทีวี, ลิ้นชัก, ชั้นวาง)
1. **Hero Elevation**: Direct front view of the storage cabinet/unit standing against a room wall.
2. **Depth & Side Panel**: Three-quarter angle showing depth, side panels, and plinth/legs stability.
3. **Drawer / Door Fronts**: Close-up showing wood veneer matching, glossy finish, or panel gaps/reveal lines.
4. **Hardware Close-Up**: Macro shot of recessed scoop handles, bronze knobs, or keyholes/locks.
5. **Open State / Storage**: Front view with drawers pulled out or doors open, showing internal shelves and depth, matching the exterior finish perfectly (no raw wood or visible metal runners).
6. **Fidelity Joinery & Seamless Edge**: Close-up of clean drawer front joint, seamless outer edge, or matching interior color/finish without adding metal rails or contrasting wood unless visible.
7. **Human Interaction (Access)**: Hand grasping a handle and pulling a drawer open naturally, showcasing ease, with drawer side panels matching the exterior lacquer/paint finish seamlessly.
8. **Organized Utility**: Closer view of items (folded clothes, books) arranged neatly inside, showing capacity, with drawer interiors matching the exterior finish perfectly and no visible side runners.
9. **Styled Room Integration**: Wide lifestyle shot showing the storage unit perfectly matching the room decor.

### 5. Office & Ergonomic Work Furniture Journey (โต๊ะทำงานสรีรศาสตร์, เก้าอี้ทำงาน)
1. **Hero Workspace**: Ergonomic chair or standing desk setup in a modern clean home office.
2. **Ergonomic Backrest Profile**: Side view showing lumbo-sacral curve, mesh backing, or headrest height.
3. **Adjustment Mechanism**: Hands pressing a lever, adjusting tension knob, or raising the desk frame.
4. **Mesh & Frame Texture**: Close-up of breathable mesh fabric, armrest PU padding, or desk cable tray.
5. **Sturdy Caster Base**: Low-angle detail focusing on the 5-star base, rolling casters, or gas lift cylinder.
6. **Desk Surface Close-Up**: Close-up of desk tabletop material, rounded front edge, and grommet hole.
7. **Human-Product Interaction**: Person sitting upright with arms on armrests, typing at a laptop naturally.
8. **Alternate State (Standing/Reclined)**: Desk at standing height or chair fully reclined, showing range.
9. **Final Product Performance**: High-angle clean shot showing the entire workstation, conveying focus.

### 6. Dining & Kitchen Furniture Journey (ชุดโต๊ะอาหาร, เก้าอี้บาร์, รถเข็นครัว)
1. **Hero Dining Setup**: Table and matching chairs arranged together under a modern pendant light.
2. **Chair Silhouette & Height**: Profile of a dining chair or bar stool showing footrest and seat height.
3. **Tabletop & Seat Grain**: Close-up showcasing matching wood finishes or seat upholstery texture.
4. **Leg & Stance Detail**: Low-angle view of legs, floor protectors, or cart caster wheels with locks.
5. **Storage Bin / Rail Close-Up**: Detail of towel rails, spice racks, metal wire baskets, or glass door fronts.
6. **Dining Interaction (Scale)**: Hands laying down a plate or glass on the table surface naturally.
7. **Joinery & Tenon Joint**: Macro view of solid wood mortise-and-tenon joints, metal frame welds, or hinges.
8. **Lifestyle Gathering**: Wide shot of a meal setting, showcasing the dining group as a warm social hub.
9. **Clean Product Elevation**: Elevated view showing the table and chairs, highlighting alignment and symmetry.

### 7. Entryway, Hallway & Utility Journey (ชั้นวางรองเท้า, ที่แขวนสูท, ชั้นแขวน)
1. **Hero Entrance**: Utility rack/bench installed in a bright foyer or entryway.
2. **Hook & Tier Layout**: Direct front view showing double-row hooks, hanger rods, and mesh tiers.
3. **Weld & Screw Joint**: Close-up of metal corner joints, bracket welds, or wood panel joints.
4. **Base & Floor Glide**: Low-angle detail showing anti-scratch foot glides or solid bench base.
5. **Shoe Tier Detail**: Close-up of mesh grids or wood slats, showing how shoes fit neatly on the shelf.
6. **Bench Upholstery / Top**: Close-up of the bench cushion stitching or solid wood seat grain.
7. **Usage (Fidelity)**: Hand placing keys in a top tray, or hanging a coat on a hook, showing scale.
8. **Organized Entrance**: Medium shot showing bags, shoes, and coats organized beautifully, showing load capacity.
9. **Final Entrance View**: Wide entryway view with the product looking extremely clean and welcoming.

### 8. Bathroom & Laundry Journey (ตู้ซิงค์ห้องน้ำ, ชั้นวางผ้า, รถเข็นซักรีด)
1. **Hero Sanitary**: Waterproof cabinet or rack placed beside a shower or clean tiled sink area.
2. **Moisture-Resistant Finish**: Close-up of melamine, acrylic, or powder-coated surface beads under soft light.
3. **Compartment Separation**: Front view showing glass door inserts, wicker baskets, or shelf tiers.
4. **Handle & Joint Detail**: Macro view of matching hinges or recessed drawer pulls, keeping connections clean without adding steel hinges unless visible in reference.
5. **Plinth & Caster Wheels**: Low-angle detail showing wheels or moisture-proof raised cabinet feet.
6. **Open Vanity / Drawer**: Drawer open showing clean interior, vanity pipes, or laundry bags.
7. **Usage (Interaction)**: Hand retrieving a soft towel or toilet roll from the shelf, showing accessibility.
8. **Sanitary Lifestyle**: Close-up of laundry or cosmetics arranged beautifully on the waterproof top.
9. **Complete Sanitary Result**: Clean vertical view showing the unit standing proudly in a spotless bathroom.

### 9. Outdoor & Patio Journey (ชุดหวายเทียม, เก้าอี้สนามพับได้, เปลนอน)
1. **Hero Patio**: Rattan or metal outdoor lounge set placed on a wooden sun deck or green garden lawn.
2. **Woven Rattan Detail**: Close-up showing synthetic PE rattan weave pattern density, color gradient, and seams.
3. **Weatherproof Cushion**: Close-up of UV-resistant canvas fabric, water-repellent seam piping, and ties.
4. **Tube Frame & Joints**: Low-angle shot showing powder-coated aluminum tubes, weld lines, or plastic feet.
5. **Adjustable Hinge / Fold**: Detail of multi-position recline hinges or folding mechanisms.
6. **Sun & shadow Interaction**: Three-quarter shot under sunny daylight showing dramatic but clean shadows.
7. **Usage (Relaxation)**: Person sitting on the outdoor lounger, holding a cool drink, showing true patio scale.
8. **Folded / Compact State**: Folded chairs leaning neatly against a wall, proving portability and easy storage.
9. **Final Sunset Lifestyle**: Atmospheric twilight or warm sunset scene showing the outdoor set look premium.

### 10. Kids, Nursery & Pet Journey (ที่นอนแมว, คอนโดแมว, เปลเด็ก, โต๊ะเขียนหนังสือเด็ก)
1. **Hero Play Area**: Small-scale kids desk or cat tree placed in a bright, friendly nursery or play room.
2. **Rounded Corners Detail**: Close-up showing perfectly smooth, bullnose rounded corners and edges for safety.
3. **Safety Rail & Lattice**: Detail of vertical safety rails, climbing platforms, or enclosure mesh.
4. **Sisial Rope / Fabric Texture**: Macro close-up of natural sisal scratching rope, soft fleece, or cotton canvas.
5. **Stable Stance / Base**: Low-angle view of wide flat base plates, thick columns, or sturdy toddler legs.
6. **Toy Box / Drawer Slide**: Close-up of lightweight fabric storage baskets or wooden pull-out bins.
7. **Usage / Play Interaction**: A cute kitten climbing a platform, or a child drawing at the desk, showing scale.
8. **Detail Hinge / Latch**: Close-up of safety locks, rope wraps, or heavy-duty plastic connector brackets.
9. **Final Cozy Lifestyle**: Warm styled shot of the kids/pet zone, with the product looking cozy and safe.

### 11. Commercial & Hospitality Journey (เก้าอี้คาเฟ่, โต๊ะบาร์ร้านอาหาร, ชั้นโชว์สินค้า)
1. **Hero Commercial**: Cafe chair or retail shelf styled inside a modern, bustling cafe or showroom.
2. **Stackability / Stacking Profile**: Three-quarter angle showing two or three units stacked together neatly.
3. **Sturdy Steel Frame**: Close-up of thick powder-coated steel tubes, weld joins, and seat bolts.
4. **Hard-Wearing Tabletop**: Detail of scratch-resistant laminate, edge bands, or tempered glass tops.
5. **Nylon Glides & Stance**: Low-angle view of heavy-duty nylon glides, self-leveling feet, or pedestal base.
6. **Usage (Customers)**: Hand picking up a menu from the table, showing spatial relationship and height.
7. **Branding / Logo Stamp**: Close-up of maker stamp or engraved logo on the underside/backrest.
8. **Cafe Scene Lifestyle**: Row of matching cafe tables and chairs in the sun, showing clean repeated layout.
9. **Clean Product Stance**: Product-only hero view displaying commercial-grade stability and minimalist form.

### 12. Modular & Transformable Journey (ชั้นวางพับเก็บได้, โต๊ะปรับระดับแบบยกหน้า, โซฟาแยกชิ้น)
1. **Hero Configuration A**: Full view of the transformable unit in its primary state (e.g., closed/upright/modular).
2. **Hinge & Pivot Pivot Joint**: Macro close-up of metal gas springs, pivot rivets, locking pins, or gears.
3. **Conversion Step 1**: Hand releasing a safety catch or pulling a tab, demonstrating transition physics.
4. **Conversion Step 2**: Frame halfway open/folded, showing mechanical movement and structural alignment.
5. **Hero Configuration B**: Full view of the product transformed into its secondary state (e.g., open/raised/extended).
6. **Module Connectors Detail**: Close-up of locking clips, alignment pins, or heavy-duty velcro straps.
7. **Storage Footprint**: Close-up showing how modules stack or fold flat, proving small spatial requirement.
8. **Transition Usage (Scale)**: Adult using the raised tabletop or modular seat module, showing weight support.
9. **Final Transformable View**: Wide styled room shot showcasing the furniture's dual utility and engineering.

### 13. Default Seating/Storage/Surface Journey (สำหรับเฟอร์นิเจอร์ทั่วไป)
1. **Hero Establishing**: Full view of the product in a standard clean room context.
2. **Angle / Depth**: Three-quarter angle showcasing geometry, dimensions, and depth.
3. **Side / Support Profile**: Profile view showing legs, base, clearance, and vertical stance.
4. **Upholstery / Hard Finish**: Close-up of material texture, fabric weave, grain pattern, and seams.
5. **Detail Component**: Close-up of handles, knobs, zippers, stitch lines, or small fasteners.
6. **Usage / Scale**: Hand touching a handle, foot stepping near base, or person seated, proving scale.
7. **Underside / Hinge Mechanism**: Lower view of support brackets, hinge lines, or frame construction.
8. **Room Fit / Layout**: Alternate wider shot showing how the product sits within surrounding decor.
9. **Clean Confirmatory Hero**: High-angle three-quarter product-only view ensuring all details are captured.

This panel role map is mandatory unless the user supplies a different storyboard plan. Do not fill multiple panels with the same hero view.


## Duplicate-Frame Rejection QA

Before finalizing a storyboard prompt, compare all planned panels against each other. Rewrite the storyboard plan if any of these are true:
- three or more panels show almost the same product angle
- three or more panels show the same object scale and distance
- three or more panels use the same room composition with only tiny prop changes
- two adjacent panels are near-duplicates
- the storyboard lacks an underside/back/detail panel when the product references include those views
- the storyboard lacks a clear functional journey for a functional or transformable product

For foldable tray tables specifically, the 3x3 storyboard should not repeat tabletop hero shots more than twice. It must include clear separate panels for top surface, side leg stance, underside mechanism, leg bracket/rubber foot detail, cup holder/device slot detail, in-use with laptop or writing, and folded/stored/portable evidence.


## Furniture Hardware, Accessory, And Component-Only Product Rule

Some furniture-related products are not complete furniture items by themselves. They may be hardware, brackets, legs, casters, handles, shelf supports, wall mounts, hinge kits, connector plates, replacement feet, risers, rails, or modular parts. When the product reference shows only a component or hardware set, the component itself is the product. Do not accidentally convert it into a full furniture item.

Before writing a prompt, classify whether the reference product is:
- complete furniture
- furniture accessory
- furniture hardware
- replacement part
- installation kit
- furniture component shown in use with another furniture object

For hardware/component products, preserve:
- exact number of pieces in the set when visible
- colorway and finish, such as matte black powder-coated metal, glossy black, white coated metal, stainless steel, brass, plastic, rubber, wood, or mixed materials
- plate shape, arm length relationship, diagonal brace geometry, bend radius, thickness, screw-hole count, screw-hole placement, slot shape, rounded ends, sharp corners, caps, weld lines, and included screws/anchors when shown
- whether the product is a pair, single unit, left/right mirrored pair, or multi-pack

Do not let the shelf, cabinet, wall, props, or room styling become the main product. The installed shelf may appear as context only when needed, but the bracket/support/hardware must remain visibly dominant in enough storyboard frames to prove product identity.

For shelf brackets specifically, preserve whether the bracket is an L-shaped triangular metal support, floating shelf bracket, folding bracket, decorative bracket, concealed bracket, heavy-duty angle bracket, or rail-mounted support. Preserve diagonal brace location, vertical plate, horizontal plate, screw holes, rounded tips, and metal finish.

## Hardware Storyboard Role Map Rule

When a 3x3 storyboard is requested for furniture hardware or components, use a hardware-specific journey rather than a full-furniture lifestyle journey. A strong 3x3 hardware storyboard should include roles like:
1. product pair/set overview on clean surface
2. installed context showing what the hardware supports
3. close-up of screw holes / plate shape
4. close-up of diagonal brace / weld / bend / joint
5. hand-scale or size-context shot
6. installation alignment or mounting moment
7. side profile showing thickness and projection
8. loaded/use-case shot with shelf/object supported
9. final installed result with hardware clearly visible

For small hardware, at least 5 of 9 panels should show the hardware large enough to inspect its shape and details. Do not spend most frames on the room, shelf decor, or human model.

## Borderless Storyboard QA Gate (Fatal Gate)

Before finalizing a storyboard prompt, scan the complete prompt text for BOTH of the following:
1. At least one positive borderless keyword: `seamless`, `borderless`, `contiguous`, or `edge-to-edge` paired with `grid`, `panels`, `layout`, or `frames`.
2. At least one explicit negative prohibition: `no white divider`, `no divider line`, `no border`, `no gutter`, `no margin`, `no separator line`, `zero white lines`, or equivalent.

If EITHER check fails, the prompt MUST be rewritten before output. This is a **fatal QA gate** — do not output a storyboard prompt that cannot pass both checks. Append the following text if either is missing:
> `Seamless borderless edge-to-edge grid, panels touch directly with zero white divider lines, zero black lines, zero colored borders, zero gutters, zero margins, and zero frame separator lines between panels.`

## Small Product Dominance In Storyboard Rule

When the referenced product is small relative to the environment, the storyboard must not zoom out so far that the product becomes visually secondary. Small products require more macro/detail frames than large furniture.

For small furniture parts or accessories:
- at least 4 of 9 panels should be close-up or macro-detail frames
- at least 2 panels should show full product/set geometry clearly
- at least 1 panel should show scale in hand or next to a relevant object
- at least 1 panel should show installation or real-use context
- lifestyle/room-wide panels must not hide or minimize the product

## Borderless Storyboard QA Gate

Before finalizing a storyboard prompt, explicitly reject any wording that could cause visible white panel dividers, thick gutters, frame outlines, contact-sheet borders, numbered panels, or graphic separators. Rewrite using language such as: “edge-to-edge 3x3 storyboard panels with no visible divider lines, no gutters, no borders, no frame outlines.”

## Customer-Journey Storyboard Planning Rule

When the user requests a storyboard, the skill must not merely repeat similar product shots. It must first infer the most useful customer journey for understanding the furniture product, then distribute that journey across the requested frames.

The storyboard should communicate what a real customer needs to understand, such as:
- what the product is
- what it looks like from key angles
- how it functions
- what differentiates it
- how large it feels in context
- how it is used in real life
- what special mechanisms, details, or accessories it includes
- how it fits into the intended room or lifestyle

For furniture, the default storyboard should cover a journey like this whenever relevant:
1. hero product overview
2. alternate angle that proves silhouette/configuration
3. side/rear/underside/mechanism evidence
4. close-up of key surface/material detail
5. close-up of key functional detail or hardware
6. in-use interaction frame
7. room-scale/context frame
8. second lifestyle/benefit frame or another functional state
9. final confirmatory frame showing the complete product clearly again or showing folded/opened/converted/storage state

The exact journey should adapt to the product type. Example: a foldable tray table should emphasize top surface, underside mechanism, leg geometry, cup holder/slot detail, in-use posture, and portability. A sofa should emphasize silhouette, seat depth, cushion architecture, fabric detail, room scale, and sitting posture. A cabinet should emphasize front elevation, side view, open storage, handles/hinges, and shelving layout.

## Anti-Redundancy Frame Diversity Rule

Storyboard frames must be meaningfully differentiated. The skill must actively avoid generating nine frames that are near-duplicates with only tiny changes in crop or pose.

Before finalizing the prompt, check for redundancy risk and rewrite if necessary. Avoid:
- repeated hero shots with only slight camera movement
- repeated seated poses that communicate the same idea
- repeated product-only frames from nearly identical angles
- repeated close-ups of similar areas that fail to add new information
- repeated room-context frames that do not advance the product story

Each frame should have a distinct communicative purpose.

At least 6 of 9 storyboard frames should each contribute a clearly different information role when using a 3x3 layout. The remaining frames may reinforce the story, but should still vary in angle, distance, configuration, or interaction enough to feel intentional rather than duplicated.

## Multi-View Evidence Coverage Rule

When multiple reference images of the product are provided from different angles or states, the skill must fuse evidence across them and ensure the storyboard covers those views deliberately. Do not over-rely on the clearest top/front image while ignoring underside, back, side, folded-state, or hardware evidence shown elsewhere.

If the references include underside or construction views, at least one storyboard frame should explicitly surface that information unless the user requests a purely lifestyle-only storyboard.

## Product-Mechanism And Function Priority Rule

For transformable, foldable, stackable, extendable, adjustable, mobile, or multi-use furniture, the storyboard must show the actual functional journey, not just aesthetic presence.

Examples:
- folding tray table: top view, underside fold mechanism, side leg stance, cup holder/slot detail, usage with device/cup, folded or portable impression
- folding stool: open state, folded state, hinge detail, carry handle, sitting use, storage footprint
- rolling cart: front view, side view, tray/bin detail, caster detail, loaded use, room context
- recliner/floor chair: upright state, reclined state, hinge/ratchet detail, side profile, seated use
- sofa bed/daybed: sofa state, extended state, leg/support detail, mattress/cushion detail, room scale, lounging/sleeping use

## Storyboard QA Expansion

Before finalizing a storyboard prompt, the skill must rewrite if any of these failures are likely:
- the storyboard behaves like a single hero image split into repeated panels rather than a real multi-frame narrative
- the panels are too similar to each other
- the product journey does not explain the furniture's real value, mechanism, or user experience
- important reference views, such as underside or side/mechanism images, are ignored
- the storyboard uses visible white or colored divider lines, gutters, or borders without an explicit request
- the product is a hardware/component item but the storyboard focuses on the shelf/room instead of the component itself
- a small product is too tiny in most panels to inspect
- the storyboard feels like a collage instead of a deliberate visual sequence

## Equal-Frame Storyboard Grid Rule

When the output is a storyboard, contact sheet, or image grid, all frames must be divided into mathematically equal-sized cells.

Strict requirements for storyboard/frame division (เพื่อความสะดวกในการสไลด์ตัดแยกภาพ):
- **No Divider Lines or Gutters**: The generated storyboard image MUST NOT contain any white, black, or colored frame-divider lines, gutters, borders, or margins between the panels. Every frame must touch the adjacent frames perfectly and seamlessly with zero gap, allowing clean slide/crop operations (สำหรับสไลด์ตัดภาพได้สะดวกแบบไม่มีรอยต่อ).
- **Exact Identical Frame Dimensions**: Every single panel/cell must have the exact same width and height dimensions down to the pixel level. The grid must align perfectly horizontally and vertically with zero stretching, unequal cropping, or offset margins.
- row heights must match each other exactly
- column widths must match each other exactly
- panel content may differ, but the frame geometry must remain identical across all cells
- no hidden overlap, no collage-style stacking, no irregular mosaic layout, and no floating inset frames


## Video-Friendly Storyboard Continuity & Framerate Flow Rule

When `generation_mode` is `multi_frame_storyboard` or any grid layout is requested, the generated prompt MUST enforce absolute visual continuity across all panels. The storyboard must feel like a sequence of consecutive frames extracted from a single premium cinematic video reel. Standard image model background drift, camera jumping, or environment morphing is strictly forbidden.

Every generated storyboard prompt must explicitly detail and lock down these continuity anchors across all cells:

### 1. Static Background Anchor (การล็อกฉากหลังและองค์ประกอบคงที่)
- **Environment Rigidity**: The room architecture (such as wall color, wall molding, floor material like white marble tiles or oak wood planks, ceiling height, and window placement) must be 100% identical in every panel.
- **Background Prop Locking**: Permanent background items (such as indoor plants, floor lamps, picture frames on walls, wall outlets, curtain styles, and secondary background furniture) must stay in the exact same positions and maintain the same scale. They must not shift, morph, or disappear between frames.
- **Background Contrast**: If the product is close up, the background may blur due to camera depth-of-field (bokeh), but the blur color, texture, and shapes must remain logically continuous with the wider panels.

### 2. Consistent Ambient Lighting (ความคงที่ของทิศทางและโทนแสง)
- **Fixed Light Source**: Specify a single, unchanging primary light source. (e.g., "Warm golden afternoon sunlight streaming from a large window on the left, casting consistent, soft 45-degree angled shadows to the right of every object").
- **No Shadow / Highlight Shifts**: The direction, length, softness, and color temperature of shadows and specular highlights on both the product and background objects must remain perfectly aligned across all panels.
- **Consistent Exposure**: All panels must have the same exposure, white balance, and contrast settings. Do not shift from high-contrast midday sunlight in one panel to a low-light moody evening grade in another, unless the user explicitly requested a time-lapse effect.

### 3. Camera Motion & Progression Smoothing (การเลียนแบบการขยับมุมกล้องวิดีโอ)
- **Cinematic Framing Sequence**: The panel-to-panel camera positioning must simulate a continuous, smooth movie-camera flight path (e.g., Pan, Tilt, Dolly Push-in, Tracking, or Slow Zoom) rather than chaotic random cuts.
- **Transition Continuity**: The transition between adjacent panels must feel smooth. For example:
  - Panel A (Medium Establishing Shot of a dresser against a wall) -> Panel B (Slow Dolly Push-in, closer view of the dresser's top drawers) -> Panel C (Macro detail shot of the drawer handles from the exact same camera angle).
  - This prevents "visual jump cuts" and allows the storyboard panels to be seamlessly compiled or animated into a fluid short video (simulating a 24fps or 30fps video timeline).

### 4. Zero Character & Prop Drift (การล็อกความต่อเนื่องของบุคคลและพร็อพ)
- **Identical Clothing & Hair**: If a recurring person appears in multiple panels, their clothing type, fabric material, fabric color (e.g., "beige linen blazer and white inner t-shirt"), hairstyle, hair part, nail color, and accessories (e.g., glasses, watches, rings) must remain identical.
- **Anatomical & Motion Continuity**: Any human action must follow a logical chronological progression. A movement cannot be broken:
  - Panel 5 (Hand reaching towards the cabinet handle, 5cm away) -> Panel 6 (Hand holding the handle, fingers wrapped naturally) -> Panel 7 (Hand pulling the drawer open, exposing the inner storage).
  - Do not have the hand jump from reaching a drawer in one frame to holding a book in the next without logical transition.
- **Props Consistency**: Small items used for styling or scale (like a white ceramic mug, a specific laptop model, a green apple, or books) must maintain their exact shape, color, and placement when visible across panels.

### 5. Continuity QA Verification
Before outputting, the prompt must pass a Continuity QA check. If any panel description would lead to a shifted background, mismatched wall colors, changing lighting angles, or disjointed character clothing, the prompt fails and must be rewritten to lock down these details.

## Multi-Frame Storyboard Visual Rule


When `generation_mode` is `multi_frame_storyboard` OR when the user requests/selects any storyboard/grid layout, create a prompt for a clean image-only storyboard/contact sheet. This rule overrides the single-frame default.

Whenever a vertical storyboard (ภาพสตอรี่บอร์ดแนวตั้ง) or a vertical aspect ratio (ภาพแนวตั้ง) is requested or implied, the generated prompt MUST explicitly lock and enforce the `9:16` aspect ratio (9:16 size) as the absolute canvas ratio.

Use `storyboard_layout_preset` together with `aspect_ratio` as the canvas contract:
- `canvas_1_1_*` presets require the final full storyboard image to be 1:1.
- `canvas_16_9_*` presets require the final full storyboard image to be 16:9.
- `canvas_9_16_*` presets require the final full storyboard image to be 9:16.
- `canvas_4_3_*` presets require the final full storyboard image to be 4:3.
- `canvas_3_4_*` presets require the final full storyboard image to be 3:4.
- `*_exact` presets require every frame to match the stated per-frame ratio exactly.
- `*_crop_safe` presets may have non-exact internal frame ratios, but every frame must include generous safe margins so each frame can be cropped after generation into 1:1, 16:9, or 9:16 without cutting off the furniture, person, hands, legs, arms, backrest, tabletop, drawer front, hardware, logo, brand tag, or key action.
- If `storyboard_layout_preset` conflicts with `aspect_ratio`, prioritize the canvas ratio encoded in `storyboard_layout_preset` and explicitly mention that canvas ratio in the generated prompt.
- If `storyboard_layout_preset` is `auto`, choose the layout from the selected `aspect_ratio`: 1:1 uses 2x2 or 3x3 square frames, 16:9 uses 2x2 or 3x3 exact wide frames when exact per-frame ratio matters and 3x2 crop-safe frames for six-frame storyboards, 9:16 uses 2x2 or 3x3 exact vertical frames when exact per-frame ratio matters and 2x3 crop-safe frames for six-frame storyboards, 4:3 uses 4x3 square frames, and 3:4 uses 3x4 square frames.

When describing a multi-frame storyboard, state the exact grid, total frame count, final canvas aspect ratio (using exactly 9:16 size for all vertical storyboards), whether the frames are exact-ratio or crop-safe, and explicitly specify that the panels MUST be seamlessly joined with zero divider lines, gutters, borders, or margins between them. Every panel must touch perfectly and be of mathematically identical height and width down to the pixel level to facilitate easy sliding and cropping. The storyboard must be one single generated image containing the requested grid.


The rendered image MUST NOT contain:
- frame numbers
- captions
- text boxes
- lower-third description bars
- subtitles
- overlay labels
- storyboard layout typography or visible frame descriptions
- visible white, black, or colored frame-divider lines, gutters, or margins between panels (must be seamless for clean crop/slide)


Visible furniture brand tags, maker marks, warning labels, care labels, SKU stickers, engraved logos, and hardware markings are not storyboard labels. Preserve them only when they are physically present on the referenced furniture.

## Furniture Product Fidelity Rule

Every generated prompt MUST explicitly preserve the exact furniture type shown in the reference images.

Reference product images are the highest-priority source of truth. Interior styling, lifestyle mood, architecture, lighting, props, and aspirational art direction may change the scene around the furniture, but they MUST NOT redesign, recolor, rebrand, resize, upscale/downscale unrealistically, or materially reinterpret the furniture itself.

For furniture products, preserve:
- exact furniture category and configuration, such as sofa, sectional, armchair, dining chair, stool, bench, bed frame, wardrobe, sideboard, cabinet, shelving unit, desk, table, console, nightstand, recliner, outdoor furniture, or modular set
- overall silhouette, proportions, stance, footprint, and height-to-width-to-depth relationship
- seat, backrest, armrest, tabletop, drawer, door, shelf, headboard, base, pedestal, frame, leg, caster, and support geometry
- cushion count, cushion thickness, seam placement, tufting, piping, quilting, panels, slats, rails, lattice, woven surfaces, and upholstery construction
- leg count, leg position, leg angle, foot shape, glides, wheels, braces, stretchers, and visible underside details
- hardware count, placement, shape, finish, and spacing, including handles, pulls, knobs, hinges, sliders, locks, brackets, screws, rivets, bolts, caps, and connector plates
- material palette and finish, including wood species impression, veneer direction, metal finish, plastic finish, rattan/cane weave, leather grain, fabric weave, stone texture, glass tint, laminate, lacquer, matte, satin, glossy, brushed, polished, or powder-coated surfaces
- visible brand marks, tags, care labels, stamps, engraved logos, printed logos, or SKU stickers when physically present
- full product visibility in required hero/detail frames, without hiding defining structure behind props

## Strict Product Detail Visual Persistence & Component Lock-In Rule

To satisfy the highest-priority requirement—that the product in the generated storyboard MUST look like the EXACT SAME physical object across all frames—the prompt MUST enforce strict component-level persistence. There must be zero visual drift or simplifications in the product's design details, hardware, textures, or materials.

### Global Anti-Hallucination & Material/Structural Fidelity Rule (กฎความแม่นยำและการป้องกันการจินตนาการวัสดุ/โครงสร้างขึ้นมาเอง ครอบคลุมทุกสินค้า ทุกประเภท)
To prevent the AI image generator from hallucinating or fabricating unseen materials, structural details, or hardware that diverge from the actual product, you MUST enforce the following global rules across ALL product categories (sofas, tables, chairs, beds, utility racks, cabinets, floor mats, etc.):
1. **No Invention of Unseen Materials or Parts (ห้ามจินตนาการวัสดุหรือชิ้นส่วนที่มองไม่เห็นขึ้นมาเอง)**: Do NOT assume, add, or describe any materials, hardware accessories, support structures, or functional parts that are not explicitly visible in the provided reference images.
   - **No imaginary support structures**: Do not add metal plates, mounting brackets, black steel bars, tension ropes, reinforcement frames, or exposed assembly bolts under tables, chairs, shelving units, or sofas unless they are visible in the reference image.
   - **No imaginary hardware/mechanisms**: Do not invent slide rails, runners, metal guide tracks, chrome gas lifts, side hinges, or handles if they are not in the references.
   - **No imaginary internal materials**: Do not add internal linings, dust covers, backing fabrics, plywood panels, or secondary wood species (like raw pine, MDF, or plywood laminate) inside storage units, under couch seats, or behind headboards.
2. **Default to Primary Exterior Finish (กำหนดให้ส่วนประกอบที่มองไม่เห็น/ชิ้นส่วนภายในใช้สีและวัสดุเดียวกับภายนอก)**: If a component, underside, interior, or hidden side of a product is opened, rotated, or exposed in a storyboard frame, its material, color, texture, and finish MUST default to matching the primary visible exterior finish of the product.
   - **Tables & Desks**: The underside of a tabletop and its support legs must match the exact wood veneer/matte color/stone grain of the top surface. Do not invent raw wood, secondary laminates, or metallic frames.
   - **Sofas & Chairs**: The undersides, cushion bases, interior frames, or backside linings of seating units must match the primary upholstery fabric/leather. Do not invent cheap black lining fabric, exposed metal springs, or raw pine wood frames.
   - **Cabinets & Storage**: The interior shelves, divider boards, back panels, and drawer boxes must perfectly match the primary exterior finish (e.g., if the cabinet is high-gloss white, the interior shelves and drawer boxes must also be described as high-gloss white, with no exposed wood or raw board).
   - **Utility Racks & Metal Shelves**: The inner channels, joints, undersides, and connection points must be described in the same metal/matte powder-coated finish as the exterior frame, without inventing chrome, steel, or brass accents.
3. **Strict Visual Alignment over Imagined Aesthetics**: In all descriptions, prioritize literal visual facts from the reference over general AI aesthetic tendencies. If the reference is simple and clean, keep it simple and clean. Do not add "modern styling accents" like golden trim, metallic feet, faux leather inserts, or decorative knobs unless they are explicitly shown.

Every generated prompt and frame description MUST lock down the following micro-architectural details of the reference product:

### 1. Component-Level Visual Persistence (การล็อกรายละเอียดชิ้นส่วนระดับย่อยในทุกแผง)
- **Zero Detail Drift**: Small components (such as metal corner brackets, seams, zipper tracks, piping borders, assembly screw holes, or rubber leg feet) must not morph or disappear between frames. They must maintain their exact shape, count, and placement.
- **Joinery & Edge Precision**: The structural joints of the product (such as finger-joints, tenon and mortise gaps, welded seams on iron frames, or beveled tabletop edges) must be described identically. If a dresser has a 2mm reveal gap between drawers, that gap must remain consistent.
- **Accurate Material Finish**: If the product features a specific surface finish (e.g., "matte powder-coated black carbon steel" or "brushed gold-finished brass"), that finish must be specified on every component description, preventing the model from substituting a generic glossy black or shiny silver finish.

### 2. Upholstery & Surface Texture Integrity (ความสม่ำเสมอของลักษณะและผิวสัมผัสวัสดุ)
- **Wood Grain Flow & Type**: For wooden surfaces, specify the exact grain behavior (e.g., "horizontal walnut wood grain veneer with natural dark cathedral knots running continuously across the drawer fronts"). The pattern direction must not rotate or change from oak to pine.
- **Textile & Upholstery Texture Density**: Upholstery materials must maintain their exact texture scale and reflective sheen (e.g., "coarse loops of cream bouclé fabric with a soft matte surface texture," or "pebbled grain brown saddle leather with a subtle satin sheen"). The texture must not change to smooth cotton, velvet, or glossy vinyl.
- **Motif & Pattern Consistency**: For floor textiles, play mats, or print motifs, the graphic design must be locked in position, scale, and color layout. The motif (e.g., "a cute cartoon panda face with black eye patches and pink ears positioned exactly in the center of the mat") must remain visually identical in all panels.

### 3. Hardware & Accessory Alignment (การล็อกมือจับ อุปกรณ์ยึด และตำแหน่งส่วนประกอบ)
- **Knob & Handle Spacing**: The count, shape, alignment, and physical position of handles, pulls, keyhole plates, or locks must be mathematically stable across frames. For example, if a chest has "two round brass keyhole plates centered on the top drawers, and long dark bronze bar pulls aligned horizontally on the lower drawers," do not allow the pulls to merge, drift to corners, or turn into recessed grips.
- **Base / Wheel / Caster Locking**: If the product has casters, wheels, or specific legs (e.g., "four tapered natural birch wood legs with tiny black rubber caps at the feet"), the exact leg angle, leg material, and leg caps must be repeated in every frame where the base is visible.

### 4. Fidelity Over Styling Props (ความสำคัญของรายละเอียดสินค้าเหนือสิ่งของประดับ)
- **No Occlusion of Details**: While lifestyle styling props (like a knitted blanket draped over the sofa arm, scatter pillows, or cups on a table) add realism, they MUST NOT hide the product's defining joints, seams, cushion boundaries, leg attachments, or hardware in more than one lifestyle frame.
- **Product Visibility Priority**: At least three storyboard panels (such as front hero, side elevation, and close-up detail panels) must keep the product completely free of any styling props or model hand occlusions, ensuring the furniture's physical geometry is fully inspectable and persistent.

### 5. Rejection of Generic Archetypes (การปฏิเสธรูปทรงสำเร็จทั่วไป)
- **Custom Over Catalog**: The prompt must actively reject generic catalog shapes. If the reference is a low-profile floor daybed with a long rectangular mattress slab, short stubby legs, and no armrests, the prompt must explicitly specify: "armless design, very low floor clearance, short tapered legs, long solid slab mattress, no standard high sofa backrest, no thick couch armrests." This stops the image generator from falling back to a generic living room couch.

## Exact Furniture Geometry And Scale Lock


Every generated prompt MUST include a strict furniture geometry lock derived from the product reference images. The geometry lock is more important than making the furniture look like a common showroom archetype.

Preserve the furniture's:
- height-to-width-to-depth ratio and visual mass
- short, tall, low-profile, high-back, deep-seat, shallow-seat, slim, bulky, rounded, boxy, tapered, arched, flared, cantilevered, modular, or pedestal body character
- front, side, and back silhouettes, including whether edges are straight, curved, chamfered, beveled, bullnose, scalloped, waterfall, rounded, square, cylindrical, or faceted
- frame thickness, rail thickness, tabletop thickness, panel thickness, cushion thickness, mattress/headboard thickness, and visible overhangs
- seat height, seat depth, backrest angle, armrest height, armrest width, and cushion compression where relevant
- exact number and arrangement of cushions, pillows included with the product, drawers, doors, shelves, slats, panels, modules, leaves, extensions, and visible compartments
- support architecture: legs, pedestal, plinth, sled base, trestle, cross-brace, cantilever, casters, glides, feet, wall mount, suspension, or floor contact points
- orientation and pose of the furniture relative to people, room architecture, rugs, windows, walls, and props
- number of visible furniture units and their size relationship to one another

If the reference product is low and wide, keep it low and wide. Do not stretch it into a tall cabinet, high-back sofa, or oversized designer object. If the reference product is tall and narrow, keep it tall and narrow. Do not compress it into a low console or bench.

If the reference product is rounded, curved, cylindrical, arched, or soft-edged, the generated product MUST preserve those curves. Do not turn a rounded chair, circular table, arched headboard, curved sofa, or cylindrical leg into a square, flat-sided, angular, prism-like, or rectangular object unless those flat sides or corners are visibly present in the reference product.

If the reference product is boxy, rectilinear, slab-sided, or panel-based, the generated product MUST preserve those straight planes and hard edges. Do not soften it into an organic sofa, rounded pouf, curved lounge chair, or sculptural table unless the reference shows those forms.

For upholstered seating, preserve the exact upholstery architecture shown in the reference:
- cushion count and cushion separation lines
- back cushion shape, seat cushion shape, armrest shape, skirt/plinth/base style, and leg exposure
- seam, welt, piping, quilting, button tufting, channel tufting, stitching, and fabric direction
- cushion thickness and compression; do not make firm square cushions into overstuffed pillows or make plush cushions into thin flat pads
- included pillows only when they are part of the reference product, not as invented styling props that hide the furniture

For case goods and storage furniture, preserve the exact cabinet architecture shown in the reference:
- door and drawer count, proportions, reveal gaps, shadow lines, panel layout, shelf spacing, open/closed compartment ratio
- handle/pull/knob count, shape, position, finish, and alignment
- hinge visibility, sliding track cues, legs/plinth/base, top overhang, side panel thickness, and back panel visibility when shown
- wood grain direction, bookmatching, veneer seams, cane/rattan inserts, glass panels, metal mesh, fluting, grooves, and decorative trim

For tables and desks, preserve the exact tabletop and support architecture shown in the reference:
- tabletop shape, edge profile, thickness, bevel/chamfer/bullnose, apron, overhang, extension leaves, and visible seams
- leg count, leg cross-section, leg angle, trestle/pedestal/sled/cantilever form, crossbars, stretchers, and foot details
- drawers, cable ports, modesty panels, shelves, monitor risers, and hardware when present

For beds and bedroom furniture, preserve the exact structure shown in the reference:
- headboard height, headboard thickness, paneling, upholstery, tufting, cane/rattan, wood/metal frame style, side rails, footboard, legs, slat visibility, and storage drawers when present
- do not alter bed size impression, headboard silhouette, or frame proportions to fit a generic luxury bedroom template

For convertible furniture, floor sofa beds, daybeds, futons, recliner mats, and foldable lounge chairs, preserve the exact active configuration selected for the frame:
- whether the product is flat as a daybed, angled as a chaise/floor lounge, upright as a floor chair, or folded for storage
- hinge/fold line locations, backrest angle, headrest pillow position, cushion slab thickness, seam/piping around the perimeter, and any visible side tabs or fabric labels
- short cylindrical wooden legs, low support feet, underside rails, or floor-contact structure when they are part of the reference
- the distinction between a low floor product and a raised sofa: do not add armrests, high sofa legs, thick sectional modules, or extra back cushions
- if the reference shows a single long rectangular chaise/daybed with a small loose pillow and raised head/back section, do not convert it into a tufted lounge chair, modular sofa, or generic couch

When a person appears with a convertible low sofa bed, show physically plausible interaction: sitting near the backrest, reclining along the length, leaning against the raised section, or sitting cross-legged. Do not pose the person in a way that hides all defining features such as the short legs, thin slab profile, long narrow footprint, pillow, backrest hinge, and low floor clearance.


## Forensic Vision Inspection Rule

Before writing the final prompt, the LLM vision system MUST inspect the reference product images as if performing a forensic visual audit. It must not stop at coarse furniture classification. It must inspect both macro structure and micro details, and carry those findings into the prompt.

The inspection must explicitly attempt to identify and preserve:
- primary furniture category and subtype
- configuration/state, including folded, extended, opened, reclined, stacked, nested, modular, or converted states
- countable components and small parts
- material identity, finish, and texture
- wear patterns, wrinkles, seam behavior, and surface tension when visible
- hardware, trim, connectors, feet, caps, rails, hinges, screws, pulls, brackets, and other small construction details
- pattern direction, weave direction, grain direction, veining, chip distribution, perforation pattern, and stitch path when visible
- asymmetries, left/right-specific details, and minor distinguishing features

If the reference image is small or imperfect, the model must still inspect it carefully and preserve what is observable. It may describe uncertain details as “appears to be” or “likely” when genuinely ambiguous, but it must not replace missing certainty with generic furniture archetypes.

The product reference must be treated as a high-detail evidence source, not as a loose inspiration image.

## Micro-Component And Small-Part Preservation Rule

The skill MUST preserve even small visible parts if they contribute to product identity. Small parts are not optional.

Inspect and preserve whenever visible:
- zipper lines, zipper pulls, Velcro flaps, ties, straps, snaps, piping, welting, button tufting, channel tufting, quilting lines, stitch spacing, top-stitch lines, seam breaks, pleats, gathers, and edge binding
- caster shape, wheel housing, wheel count, axle spacing, leg caps, glides, foot pads, plastic end caps, anti-slip pads, adjustable feet, and floor-clearance details
- drawer pulls, handle profile, knob shape, hinge type, rail placement, sliding track, lock cylinder, magnet latch, cable hole, shelf pin, hook, peg, rail, towel bar, basket edge, mesh insert, and support bracket
- connector plates, screws, bolts, rivets, nail heads, exposed joinery, dowel covers, corner protectors, stitch tabs, reinforcement patches, and trim strips
- label placement, brand tag location, care tag location, hang tag attachment point, SKU sticker placement, engraved plate, stamped logo, or maker mark when physically present

Do not simplify away these details when they are visible in the reference. If a small part helps distinguish the product from a generic version, it must remain in the generated result.

## Material Fidelity And Surface Truth Rule

The skill MUST preserve the exact material identity as closely as the reference allows. Material fidelity is mandatory, not optional. The product must not keep the correct shape while drifting into the wrong material system.

Inspect and preserve, when visible:
- upholstery type: fabric, linen, cotton blend, polyester weave, velvet, bouclé, chenille, mesh, genuine leather, faux leather, PU leather, suede-like microfiber
- hard materials: solid wood, veneer, engineered wood, laminate, MDF with finish, plastic, acrylic, resin, glass, tempered glass, mirror, metal, stainless steel, powder-coated steel, aluminum, brass, cane, rattan, wicker
- mineral surfaces: marble, granite, terrazzo, sintered stone, ceramic, tile, concrete, stone composite
- finish state: matte, semi-matte, satin, eggshell, glossy, polished, brushed, honed, distressed, weathered, textured, embossed, smooth
- texture language: leather grain, pebbled grain, smooth grain, boucle loop, coarse weave, fine weave, velvet nap direction, visible knit, slub texture, wood grain direction, open grain, straight grain, cathedral grain, marble veining, granite speckling, terrazzo chip size/distribution, brushed metal grain

Never substitute one material class for another unless the user explicitly requests a redesign. Fabric must not become leather. Leather must not become woven fabric. Matte plastic must not become glossy lacquer. Marble must not become granite. Terrazzo must not become plain concrete. Wood grain must not be replaced by a flat painted slab unless the reference actually shows that painted slab.

## Pattern, Texture Scale, And Orientation Lock

When the reference shows texture or pattern, preserve not only the type of pattern but also its apparent scale and direction.

Preserve when visible:
- fine vs coarse weave scale
- small vs bold leather grain
- narrow vs wide channel tufting
- seam spacing and stitch rhythm
- wood grain direction and panel matching
- cane/rattan weave pattern orientation
- marble vein thickness, branching style, and flow direction
- granite particle density
- terrazzo chip size and distribution
- perforation hole size and spacing

Do not enlarge, shrink, rotate, mirror, regularize, or randomize these surface patterns unrealistically if the reference indicates a specific look.

## Material Ambiguity Handling Rule

If a material or tiny construction detail is not fully certain because of low resolution, glare, cropping, or motion blur, the skill must preserve only what is genuinely supported by the reference. It may use cautious language such as “appears to be”, “likely”, or “visibly resembles”, but it must not hallucinate luxury materials, extra embellishments, or substitute a more generic surface.

When uncertainty exists, prefer faithful ambiguity over false certainty.

## Forensic QA Gates

Before finalizing the prompt, perform a forensic QA check. Rewrite the prompt if any of the following failures are likely:
- the prompt preserves the general furniture type but ignores a visible small part or countable detail
- the prompt simplifies a distinctive product into a generic category archetype
- the material is underspecified enough that the image model may drift into the wrong material class
- the texture, pattern scale, grain, weave, or veining is omitted despite being visible in the reference
- hardware, caster, leg-cap, handle, hinge, or connector details are lost
- the prompt would allow left/right-specific details or asymmetrical parts to swap sides
- the prompt does not explicitly protect visible labels, tags, maker marks, or trim when those are part of the actual product
- the prompt would likely invent extra decorative seams, buttons, quilting, fluting, carvings, or trim not present in the reference

## Numeric Dimension And Compact Furniture Scale Lock

When the user supplies exact dimensions, the prompt MUST include a dedicated `PRODUCT SCALE LOCK` block. Numeric dimensions are mandatory scale truth and override generic category assumptions. The block must restate the dimensions in centimeters or the provided unit and translate them into visual scale relative to an adult, floor tiles, door height, bed height, tabletop height, washing machine height, or other stable environmental cues.

Use this structure:
`PRODUCT SCALE LOCK: real product dimensions are approximately [length] x [width] x [height/thickness/depth] [unit]; preserve this [compact/full-size/portable/low-profile/tall-narrow] scale; show it as [one-person/two-person/storage-height/table-height/etc.] furniture; do not enlarge, shrink, or reinterpret it as a different furniture class.`

Dimension vocabulary must follow the actual product:
- for floor chairs, floor sofas, cushions, loungers, mats, and foldable pads: use length x width x thickness, plus backrest height/angle if visible
- for cabinets, shelves, carts, racks, wardrobes, and storage: use height x width x depth, plus tier count and caster/leg height if visible
- for tables, desks, benches, and stools: use length/diameter x width/depth x height, plus tabletop/seat thickness and support structure
- for sofas, sectionals, beds, and large lounge furniture: use overall length x depth x seat/back height, plus cushion count and module count

Compact furniture guardrails:
- If the product is under about 150 cm long or under about 70 cm wide, treat it as compact, portable, one-person, small-room, or utility-scale unless the references clearly prove otherwise.
- If the product sits directly on the floor and the thickness is under about 20 cm, do not turn it into a full-height sofa, sectional, chaise longue, mattress, bed, bench, or raised recliner.
- If the product has casters and narrow tiers, do not scale it like a pantry cabinet, wardrobe, or full-height shelving system unless dimensions support that.
- If the product is a folding stool or portable step stool, keep it hand-carry scale and do not enlarge it into a bench, side table, or ladder.
- If the product is a small bedside/desk organizer or narrow rolling cart, keep it below or around human waist/chest scale according to references; do not convert it into a built-in cabinet.

For the tested compact floor sofa / floor chair case, a correct scale block would be:
`PRODUCT SCALE LOCK: real product dimensions are approximately 110 cm long x 50 cm wide x 12 cm thick for the padded body; preserve compact one-person floor-chair scale, low to the floor, narrow enough for one adult, portable and foldable-looking; do not enlarge it into a full-size living-room couch, two-person loveseat, thick mattress, chaise longue, luxury sectional, raised armchair, or bulky recliner.`

Prompts for compact furniture MUST include human-scale behaviors that match the size: one adult sitting/reclining on a low floor chair, one person carrying or moving a light stool, one person using a narrow rolling cart, or a hand placing items on a small shelf. Avoid poses that imply the object is much larger than its true dimensions.

Scale QA is fatal. If a draft prompt would make a compact product look like a large permanent living-room centerpiece, rewrite the prompt before output.

## Exact Furniture Color, Material, Finish, And Marking Lock

**Core principle — Zero Visual Drift + Category Override**: The reference product images are encoded and sent directly to the image generator. However, image generators have strong category priors that override even clear reference images. The prompt must both anchor to the reference AND explicitly state category-level overrides derived from inspecting the reference.

- The prompt must NOT re-describe specific visual details (color, exact shape, exact texture) — those come from the reference image.
- The prompt MUST include category override statements that tell the image model which of its priors to reject.
- Category overrides are derived by the LLM from inspecting the reference image — they are not hardcoded.

When `reference_product_images` are supplied, every prompt and every frame description MUST start its product section with a `PRODUCT REFERENCE LOCK:` block using this structure:

```
PRODUCT REFERENCE LOCK: reproduce this product exactly as shown in the attached reference image with zero changes to any visible attribute. [Material override: "this is a [MATERIAL CATEGORY from reference] product, NOT a [common wrong substitution]"]. [Proportion override: "proportions are [PROPORTION CATEGORY from reference], NOT [common wrong archetype]"]. [Handle override: "handles are [HANDLE CATEGORY from reference], NOT [common wrong substitution]"]. [Base override: "base has [BASE CATEGORY from reference], NOT [common wrong substitution]"]. Do not apply any generic [furniture category] archetype.
```

How to derive each category override by inspecting the reference:
- **Material**: Look at the surface. Does it look like injection-molded plastic, painted wood, solid wood with grain, metal, glass, rattan? Name what you see and name the most likely wrong substitution.
- **Proportions**: Is the product wider than tall, taller than wide, or roughly cubic? State this direction explicitly.
- **Handle type**: Are handles arch-shaped scoops, round knobs, horizontal bar pulls, recessed slits, cutout slots, or absent? Name the type and name the most common wrong replacement.
- **Base/legs**: Does the product have short plastic feet, tapered wooden legs, a flat plinth, metal hairpin legs, or no visible base? State what is actually present.

Example — white plastic drawer chest (category overrides derived from reference inspection):
`PRODUCT REFERENCE LOCK: reproduce this product exactly as shown in the attached reference image with zero changes to any visible attribute. This is a PLASTIC storage unit, NOT a wooden dresser. Proportions are WIDE AND SQUAT as in the reference, NOT a tall narrow dresser. Handles are ARCH SCOOP TYPE as visible in the reference, NOT round knobs or horizontal bar pulls. Base has SHORT PLASTIC FEET as in the reference, NOT tapered wooden or metal legs. Do not apply a generic modern dresser archetype.`

Example — walnut sideboard:
`PRODUCT REFERENCE LOCK: reproduce this product exactly as shown in the attached reference image with zero changes to any visible attribute. This is a WOOD sideboard with horizontal grain, NOT a lacquered cabinet. Proportions are WIDE AND LOW as in the reference, NOT a tall wardrobe. Hardware is SLIM BAR PULLS as visible in the reference, NOT round knobs or decorative pulls. Base is a LOW PLINTH as in the reference, NOT tapered legs. Do not apply a generic buffet or entertainment unit archetype.`

Example — beige fabric sofa:
`PRODUCT REFERENCE LOCK: reproduce this product exactly as shown in the attached reference image with zero changes to any visible attribute. This is a FABRIC upholstered sofa, NOT leather or bouclé. Cushion count and arm style are as in the reference, NOT a different sofa silhouette. Leg finish is as in the reference, NOT gold or chrome. Do not apply a generic modern sectional archetype.`

Do not use generic phrases like "same furniture" or "match reference" alone. The PRODUCT REFERENCE LOCK block must always include: (1) zero-drift declaration, (2) material category override, (3) proportion category override, (4) handle/hardware category override, (5) base category override.

For each referenced furniture product, preserve:
- exact primary and secondary color palette as perceived in the reference
- exact upholstery material impression, including woven fabric, linen, boucle, velvet, leather, faux leather, microfiber, canvas, outdoor textile, or mesh
- exact wood tone and grain direction, including light oak, ash, beech, walnut, teak, acacia, dark espresso, black stained wood, painted wood, or visible veneer when identifiable
- exact metal finish, including chrome, brushed stainless steel, matte black, powder-coated white, bronze, brass, copper, aluminum, or painted steel when visible
- exact glass, stone, rattan, cane, wicker, laminate, lacquer, ceramic, plastic, concrete, or composite finish when visible
- exact hardware, logo, brand tag, care label, printed/engraved mark, and sticker placement when visible
- overall product white balance as perceived in the reference, without applying scene color grading to the furniture surface

If the reference furniture is white, cream, beige, light oak, natural rattan, clear glass, chrome, black metal, walnut, dark fabric, or any other specific finish, the generated furniture MUST remain that finish. Shadows and reflections may respond to the scene, but the material must not become a different product colorway. Do not turn a light oak table into walnut, a beige sofa into white bouclé, a black metal chair into brass, a walnut cabinet into black lacquer, a leather chair into fabric, a cane panel into solid wood, or a glass top into marble unless that is visibly present in the exact reference.

Lighting can be warm, cool, daylight, studio, or moody, but it must not recolor the furniture into a new SKU/colorway. Room color grading may affect walls and ambience; it must not overwrite the reference furniture color, material, hardware finish, or visible markings.

## Watermark, Marketplace Overlay, And Reference-Image Text Exclusion Rule

Many ecommerce furniture references contain non-product graphics such as corner logos, marketplace watermarks, brand banners, Thai promotional text, dimension arrows, SKU callouts, sale badges, and image-layout labels. These are not physical product markings unless they are printed, sewn, engraved, stickered, or attached directly to the furniture or its packaging.

Before writing a `VISIBLE MARKING LOCK`, classify visible text into one of two groups:
- physical product marking: sewn tag, fabric label, engraved logo, metal badge, underside sticker, care label, packaging text physically present in the scene
- non-product overlay: watermark, corner logo, brand banner, website graphic, marketplace label, dimension arrow, Thai/English promotional copy, collage caption, UI text, or reference-image annotation

Only preserve physical product markings. Exclude non-product overlays from the generated image by default. Do not reproduce a corner DUDEE-style logo, Thai title text, marketplace banner, spec arrow, or other reference-photo overlay as if it were printed on the furniture.

## Visible Marking And Tag Preservation Rule

Existing schema fields such as `product_label_text`, `label_fidelity`, and `label_readability_mode` remain compatible. For furniture, interpret them as visible product markings rather than package-label fields for small consumer goods.

Visible product markings may include:
- brand tags sewn onto upholstery
- maker stamps, engraved logos, or metal badges
- care labels, safety labels, fire-retardant tags, underside stickers, warranty stickers, SKU stickers, and assembly labels
- showroom hang tags or retail tags only when physically attached in the reference or explicitly requested
- printed text on packaging boxes only when the furniture packaging itself is part of the requested scene

When visible markings matter, every relevant furniture frame must include a marking instruction with this structure:
`VISIBLE MARKING LOCK: preserve the physically visible brand/tag/marking exactly where it appears: [brand tag or logo position] / [care label or sticker position if visible] / [SKU or text lines if supplied]; do not invent new brand names, warning labels, price tags, showroom signs, badges, or promotional claims; do not replace the furniture with a logo-only mockup.`

For furniture, visible markings are usually secondary to form/material fidelity. Do not force large readable text onto furniture surfaces unless the reference actually contains visible text or the user explicitly supplies text. When markings are tiny, partially hidden, underside-only, or not intended for hero visibility, preserve their placement and approximate layout without making them unnaturally oversized.

At least one hero/detail frame should show the construction details that matter most for product recognition, such as cushion seams, wood grain, hardware layout, rattan/cane weave, tabletop edge profile, drawer reveals, leg joints, or upholstery texture. Use marking-focused close-ups only when the furniture reference clearly includes visible brand or tag details.

Never create separate ad headlines, claim typography, retail banners, price badges, discount stickers, room-label callouts, or poster text around the furniture unless the user explicitly asks for a designed ad poster. External text must not replace or compete with the actual furniture details.

Before finalizing the output, perform a Visible Marking QA check when `product_label_text` or readable markings are supplied. Fail and rewrite if any frame that should show the marking changes brand spelling, invents new tag text, moves the tag to an impossible location, turns an underside care label into a front-facing logo, or replaces the real furniture structure with generic promotional graphics.


## Variant, Set, And Multi-Product Handling Rule

Furniture ecommerce references often show multiple variants, sets, bundles, or configuration examples. The skill MUST separate these cases before prompt writing.

Rules:
- If the reference shows one product in one colorway, preserve exactly that one product and colorway.
- If the reference shows multiple colorways of the same product, choose only the user-requested colorway. If none is requested, choose the clearest/dominant product and state the chosen variant in `PRODUCT REFERENCE LOCK`.
- If the reference shows a set or bundle, preserve the exact included units when observable: table + chairs, sofa + ottoman, bed + nightstands, vanity + mirror, storage bins + rack, patio set pieces, dining set counts.
- If the user asks for a single item from a set, isolate that item and do not generate the full bundle.
- If the user asks for the whole set, preserve the number, relative scale, matching material/colorway, and arrangement logic of the set.
- Do not merge two different variants into a hybrid product.
- Do not invent extra chairs, pillows, modules, shelves, drawers, cabinet doors, accessories, or matching pieces unless the reference or user explicitly includes them.

For storyboard output, all panels must keep the same selected variant or same selected set. Different panels may show different angles/functions, but not different SKUs.

## Product Visibility, Occlusion, And Cropping Rule

Product fidelity is only useful if the product is visible. Every storyboard prompt MUST manage occlusion and cropping deliberately.

For hero/product panels:
- show the full product silhouette with all defining structure visible
- keep key edges, supports, legs/casters/base, arms/backrests, doors/drawers/shelves, tabletop, seat surface, and distinctive hardware unobscured
- use props sparingly and never let pillows, blankets, plants, people, pets, decor, or foreground blur hide the product identity
- preserve floor/wall contact and scale cues

For detail panels:
- crop intentionally to the relevant feature: material, seam, weave, hardware, caster, handle, hinge, joinery, fold mechanism, drawer reveal, support bracket, or label
- make the detail belong to the same product and same material/colorway
- do not crop so tightly that the feature becomes visually ambiguous or looks like a different product

For people-interaction panels:
- hands/body must interact naturally without covering the detail being demonstrated
- do not sit, lean, or drape fabric in a way that hides cushion count, armrest absence/presence, leg/base style, drawer/door layout, or mechanism cues

If a generated panel would likely hide the product-defining structure, rewrite that panel.

## Viewpoint Coverage And Angle Consistency Rule

For multi-frame storyboards, use complementary views to prove that the same product is being preserved rather than reimagined.

Recommended coverage when the product category supports it:
- front three-quarter hero view
- straight-on or product-only silhouette view
- side/profile view showing depth and support structure
- back or underside/leg/base view when relevant
- macro/detail view of material and small construction features
- function/interaction view showing correct use
- room-scale view showing placement and proportion

Do not let alternate viewpoints change the product. The side view must match the front view. The back view must be plausible for the same product. Detail views must match the same color, material, seam/hardware layout, and construction.

## Category-Specific Red-Flag Corrections Rule

Before finalizing, check for common category-specific failures and correct them:

- Sofa/sectional/loveseat: wrong cushion count, missing chaise, invented arms, added ottoman, changed leg style, fabric/leather swap, sectional direction reversed.
- Floor chair/floor sofa/futon/daybed: inflated into large sofa/bed, missing low scale, wrong backrest angle, invented arms, hidden fold seams, wrong pillow count.
- Dining chair/stool/bench: converted into office chair or lounge chair, wrong height, missing footrest on stool, wrong leg count, added casters.
- Office/gaming chair: missing caster base, wrong wheel count, missing armrests/headrest/lumbar support, mesh back converted to solid upholstery.
- Table/desk: tabletop shape changes, wrong leg/base count, pedestal replaced by four legs, drawers invented or removed, wrong edge thickness, wrong material top.
- Cabinet/wardrobe/dresser/TV stand: drawer/door/shelf count drift, handles moved, sliding doors become hinged doors, open shelves become closed cabinets, wrong plinth/leg base.
- Shelving/rack/cart: tier count changes, caster count wrong, basket lips disappear, poles thicken/thin unrealistically, narrow rack becomes wide built-in shelving.
- Bed/headboard/bunk/loft: headboard shape changes, side rails/ladder/guard rails missing, storage drawers invented or removed, scale becomes hotel bed instead of referenced frame.
- Outdoor/rattan/cane: weave becomes generic fabric, weatherproof frame disappears, cushions recolor, metal tube frame becomes wood, fold/recline cues lost.
- Kids/nursery/pet: safety rails/platforms/scratch posts/rounded edges missing, scale becomes adult furniture, pet furniture becomes human furniture.
- Stone/glass/acrylic/metal furniture: material becomes generic wood/plastic, transparency/reflection wrong, marble/granite/terrazzo patterns confused, metal finish changes.

Any red-flag failure is a fatal QA issue and requires prompt rewrite.

## Completeness Boundary Rule

The skill should aim to support all common retail furniture, but it must not pretend impossible certainty. If a product is highly unusual, partially occluded, or ambiguous, classify by visible physical construction first and preserve all observable facts. Use cautious material language when needed. The prompt must still protect geometry, scale, material clues, countable components, and visible small parts rather than falling back to a generic furniture archetype.

## Room Scale, Placement, And Environment Consistency Rule

Furniture must occupy a believable physical scale in the environment. The prompt MUST preserve plausible room-scale relationships.

Every generated prompt MUST specify:
- intended room type or setting, such as living room, bedroom, dining room, office, entryway, patio, hotel suite, showroom, studio, cafe, retail display, or outdoor terrace
- floor contact and shadow logic: all legs, plinths, bases, casters, or supports must meet the floor/wall naturally
- human scale cues when people appear, including plausible seat height, table height, cabinet height, bed height, or reach distance
- surrounding props that support the furniture without hiding defining details
- camera angle that communicates the product form, not only lifestyle mood

Do not make furniture float, sink into the floor, intersect walls, change size between frames, or become too large/small relative to people, doors, windows, rugs, lamps, and adjacent furniture. Maintain consistent product scale across the storyboard unless a frame is explicitly a macro detail shot.

For multi-frame storyboards, use a coherent environment palette and room architecture unless the user asks for multiple settings. If multiple settings are requested, keep the furniture identical and restate the `PRODUCT REFERENCE LOCK` in every frame.

## Industrial Design, Joinery, And Construction Preservation Rule

The prompt MUST forbid redesigning the furniture, changing structural layout, inventing extra modules, changing hardware arrangement, changing cushion count, changing leg/base type, changing material/colorway, hiding the product behind props, or replacing the product with a different item.

Preserve construction cues:
- joinery, seams, welds, fasteners, brackets, rails, hinges, drawer gaps, door reveals, panel joints, stitching, piping, tufting, and weave patterns
- load-bearing structure and plausible support; heavy tabletops need plausible legs/pedestals, shelves need supports, wall units need believable mounting, and chairs/sofas need stable contact points
- functional clearances for drawers, doors, reclining mechanisms, folding parts, extension leaves, and sliding components when shown

Do not create impossible furniture anatomy: missing legs when legs are visible in the reference, duplicated legs, warped tabletops, uneven shelves, nonparallel drawers, fused handles, melted cushion seams, physically impossible cantilevers, misaligned cabinet doors, broken chair backs, or unsupported heavy surfaces.

Before finalizing the output, perform a Product Fidelity QA check. Furniture Color/Material/Geometry Fidelity is a fatal QA gate: if any frame description implies a different furniture silhouette, category, module count, cushion count, drawer/door layout, leg/base structure, material, finish, upholstery color, wood tone, hardware finish, brand marking, or physical scale than the product references, do not output that prompt. Rewrite that frame until the furniture remains reference-accurate.

## Character Identity And Face Lock

**Core architecture principle**: The character reference image is sent directly to the image generator as base64. The generator can see the exact face, hair, skin tone, proportions, and distinctive features from the image itself. Therefore:

- The prompt must NOT re-describe specific facial features in text (face shape, eye spacing, nose type, etc.) — those details are already in the reference image and text descriptions risk creating contradictions.
- The prompt MUST anchor to the reference image and prohibit only the known drift patterns that AI generators commonly apply to character images.
- This approach works for any referenced person regardless of their specific appearance.

When `reference_character_images` are supplied, every prompt and every frame description that shows a face or recognizable person MUST include a `CHARACTER REFERENCE LOCK:` block. The block must follow this structure:

```
CHARACTER REFERENCE LOCK: keep the person exactly as shown in the character reference image — [list of anti-drift prohibitions].
```

**Known drift failure modes to prohibit for character references:**
- **Face substitution**: AI frequently replaces the referenced person with a generic lifestyle model. Prohibit: `do not replace with a generic model, do not use a stock photo face`
- **Age drift**: AI frequently makes faces younger or older. Prohibit: `do not change the person's age or facial maturity`
- **Hair drift**: AI frequently changes hair length, style, or color. Prohibit: `do not change hair length, hairstyle, or hair color from the reference`
- **Ethnicity drift**: AI frequently shifts ethnic appearance. Prohibit: `do not change ethnicity cues or facial ancestry impression`
- **Beauty normalization**: AI frequently smooths features into a generic attractive face. Prohibit: `do not beautify into a generic influencer face, preserve distinctive features`
- **Wardrobe drift**: When wardrobe is a continuity anchor, AI may change it. Prohibit: `do not change wardrobe when it is used as a scene continuity anchor`

Example — character reference (using reference-deferred approach):
`CHARACTER REFERENCE LOCK: keep the person exactly as shown in the character reference image; do not replace with a different model or generic lifestyle face; do not change hair length, hairstyle, or hair color; do not change the person's age; do not alter ethnicity cues; preserve all distinctive features; room lighting may change but must not alter the person's appearance.`

For furniture, interior, home, showroom, and product-use storyboards, keep the same character identity across every frame where the person appears. The person can change pose, expression, camera angle, and lighting, but must remain recognizably the same person. If the model cannot preserve identity confidently in a frame, prefer a product-only shot, hands-only shot, over-shoulder shot, back-of-head shot, partial-face crop, or detail shot that does not invent a new face.

When the product requires sitting, leaning, opening drawers, reaching shelves, dining, working, reclining, or interacting with furniture, the prompt must say: `"keep the person exactly as shown in the character reference — same face, same hair, no model substitution, no face swap."`

Before finalizing the output, perform a Character Fidelity QA check. Character Identity Fidelity is a fatal QA gate: if any frame description implies a different face, different age, different hair length/style, or a generic model replacing the reference person, do not output that prompt. Rewrite that frame until the character remains reference-accurate. If the image model may not preserve identity confidently in a frame, change that frame to product-only, hands-only, over-shoulder, back-of-head, partial-face crop, or detail shot instead of inventing a new face.

## Prompt Quality Loop And Fatal QA Gates

Before returning prompts, silently run a quality loop. Draft the prompt, compare it against all references and user-supplied dimensions, then rewrite any weak frame. Repeat until no fatal issue remains. Do not expose the loop unless the user asks for audit notes.

Fatal QA gates:
- Output format: if a single-frame prompt describes a collage, contact sheet, inset thumbnails, measurement arrows, visible labels, captions, spec diagrams, or embedded reference images without an explicit user request, rewrite it as one clean photographic scene.
- Storyboard enforcement: if the user requested or selected 3x3, 2x3, 3x2, 2x2, storyboard, contact sheet, or grid, and the prompt describes a single hero image rather than the requested number of panels, rewrite it as the requested storyboard grid.
- Frame geometry: if a storyboard prompt does not clearly enforce equal-sized frames, uniform gutters, and a mathematically regular grid when a regular storyboard is requested, rewrite it.
- Borderless constraint completeness (fatal): if a multi-panel storyboard prompt lacks BOTH a positive borderless grid declaration (e.g. `seamless edge-to-edge`, `borderless contiguous panels`) AND explicit negative prohibitions (e.g. `zero white divider lines`, `no borders`, `no gutters`), it FAILS this gate. Append the standard borderless block before output.
- Cabinet/dresser legless stance (fatal): if the product reference is a drawer unit, cabinet, or dresser that sits flat on the floor or on short feet with no tall legs, and the generated prompt does not explicitly prohibit tall tapered legs (e.g. `no tapered legs`, `no wooden legs`, `short plastic feet`, `sits on low plinth base`), the prompt FAILS this gate. Append the legless stance lock before output.
- Cabinet/dresser handle position (fatal): if the product reference shows handles at a specific position on the drawer face (e.g. bottom-center), and the generated prompt does not explicitly state that position AND explicitly prohibit the opposite position (e.g. `handle at bottom-center of each drawer, NOT at the top`), the prompt FAILS this gate. A handle described only as "raised arch pull" without specifying its vertical position on the drawer face is insufficient.
- Product-source dominance: if the generated product description follows the environment furniture or a generic showroom archetype instead of the current product reference, rewrite the product lock from the product image facts.
- Current-reference contamination: if any frame uses an unrelated person, room, product, beach/outdoor/fashion scene, or previous generated output not supplied in the current run, rewrite the frame using only current references.
- Irrelevant frame rejection: if any storyboard panel does not contribute to the product story, product detail, product function, room placement, scale, or customer journey, rewrite it.
- Person-with-product coverage: if both character and product references are supplied for a 3x3 storyboard and no panel clearly shows the referenced person with the referenced product, rewrite the storyboard to include at least one clear person-product interaction panel.
- Storage furniture fidelity: if a dresser/cabinet changes drawer count, top-row split, lock/keyhole placement, recessed handle geometry, side-panel detail, or open/closed drawer relationship from the product reference, rewrite the product lock and affected panels.
- Watermark exclusion: if reference-photo overlays, marketplace logos, Thai promotional text, dimension arrows, or non-product graphics are treated as physical product labels, remove them and rewrite the prompt.
- Convertible furniture configuration: if a foldable floor sofa/daybed/futon changes active configuration, loses its short legs or low floor clearance, gains armrests, becomes a sectional/couch, or hides the defining hinge/backrest/long slab structure, rewrite it.
- wrong product category, such as compact floor chair becoming a full sofa, rolling cart becoming a cabinet, folding stool becoming a bench, or cabinet becoming a generic shelf
- wrong product scale or ignored numeric dimensions
- wrong colorway, material, finish, upholstery, wood tone, plastic color, metal finish, or hardware
- wrong geometry, cushion grid, tier count, shelf count, drawer/door layout, caster/leg count, armrest/backrest structure, or fold/hinge design
- environment reference overpowering the actual product reference
- character reference replaced by a generic lifestyle model when the face is visible
- props, hands, books, blankets, pillows, plants, or camera crop hiding the defining product details
- unwanted visible text, captions, measurement labels, arrows, watermarks, UI boxes, or ad typography when not requested

A final prompt should be specific enough that another model can generate the scene without needing to guess the product. Prefer concrete nouns, counts, dimensions, material names, and exact negative constraints over broad terms such as “nice furniture,” “modern sofa,” “beautiful room,” or “same as reference.”


## Universal Furniture Coverage QA

Before finalizing any prompt package, apply this universal checklist:
- Correct category: the product category/subtype matches the product reference, not the room background or a prettier archetype.
- Correct count: cushions, drawers, doors, shelves, legs, wheels, arms, panels, pillows, hooks, rails, handles, hinges, brackets, and modules match the reference.
- Correct small parts: visible tags, zippers, seams, piping, casters, caps, glides, screws, connector plates, pulls, knobs, shelf pins, rails, brackets, and trim are not lost or invented.
- Correct material/color: every major and secondary visible part preserves the referenced material, finish, texture scale, pattern direction, and colorway.
- Correct scale: numeric dimensions and human/room scale are plausible and consistent.
- Correct support/contact: legs, casters, plinths, floor pads, wall mounts, and feet contact surfaces naturally.
- Correct storyboard format: requested storyboard/grid produces the requested number of equal-sized panels.
- Correct product persistence: the same product appears in most storyboard panels and never changes category.
- Correct environment role: room images supply only lighting/architecture/mood, not product substitution.
- Correct text policy: no captions, numbers, labels, watermarks, or promotional copy unless explicitly requested.
- Correct occlusion: people, props, plants, pillows, blankets, or decor do not hide defining product structure in hero/detail panels.

If any item fails, the prompt must be rewritten before output.

## Furniture Usage Intelligence Rule

The skill MUST infer how the referenced furniture is actually used and build storyboard beats around realistic room-scale usage.

For every multi-frame storyboard:
- identify furniture category from the references
- infer normal placement, human interaction, function, and room context
- include at least two frames that show meaningful furniture interaction or functional detail, not just passive product placement
- include a believable comfort, storage, organization, workspace, hospitality, dining, sleeping, display, or lifestyle result frame
- avoid impossible or category-wrong use

Examples:
- Sofa / sectional / loveseat: show hero room placement, cushion/armrest detail, person sitting naturally with correct seat height, lounge/conversation use, and comfort result. Do not make it into a bed, chaise, or sectional unless the reference has that configuration.
- Floor chair / floor sofa / foldable floor lounger / cushion seat: show direct floor contact, low seat height, compact one-person width, backrest angle, cushion grid, seams, bolster/pillow only if present, and natural low-floor sitting/reclining. Do not enlarge it into a full-size sofa, two-person couch, chaise longue, bed, raised armchair, or thick mattress.
- Armchair / lounge chair / recliner: show front three-quarter hero, side profile/back angle, person seated with plausible posture, reclining/rocking/swivel mechanism only if present, and material close-up. Do not invent a swivel base or recliner footrest.
- Dining chair / stool / bench: show table-height relationship, stable leg contact, person sitting or pulling the chair naturally, seat/back detail, and dining/cafe context. Do not make a dining chair into an office chair or bar stool unless reference supports it.
- Dining table / coffee table / side table / console: show tabletop edge and support structure, room placement, scale with chairs/sofa, functional styling with light props, and detail of legs/joinery. Do not change tabletop shape, thickness, leg count, or support type.
- Desk / office furniture: show work setup, cable/monitor/laptop scale where appropriate, drawer or shelf function if present, seated ergonomic use, and finish/hardware detail. Do not invent drawers, keyboard trays, cable ports, or monitor risers.
- Cabinet / wardrobe / sideboard / shelving: show front elevation, door/drawer/shelf layout, hardware detail, opening/closing interaction only if the reference supports it, and organized storage result. Do not change compartment count or handle layout.
- Rolling cart / utility trolley / narrow storage rack: show exact tier count, basket/bin lip shape, vertical post thickness, caster count, narrow footprint, and plausible stored items. Do not turn it into a built-in cabinet, wide bookcase, pantry shelf, or full-height wardrobe.
- Folding stool / portable step stool: show hinge pattern, folded/expanded geometry, handle cutout, plastic panels, foot contact, and hand-carry scale. Do not turn it into a bench, ladder, table, or full-size chair.
- Bed frame / headboard / nightstand: show bedroom placement, headboard/frame detail, mattress/bedding scale, sitting or resting use, and nightstand/storage detail if present. Do not change headboard shape, rail thickness, or storage design.
- Outdoor furniture: show patio/terrace setting, weather-appropriate materials, seating/table use, cushion fastening if visible, and material durability cues. Do not recolor or convert indoor upholstery into outdoor mesh unless visible in the reference.
- Modular furniture: show the exact referenced modules and connectors, alternate arrangement only if the user requests it and the product is visibly modular, and preserve module count, seam lines, and proportions. Do not invent extra modules.
- Flat-pack or assembly scenes: show only plausible steps using visible components, hardware, and tools; preserve part count and geometry; do not invent missing panels, screws, or instructions unless supplied.

The storyboard should feel like a smart mini product sequence: establish the furniture in a believable room, show hero form, show material/construction detail, show real interaction or function, show scale/comfort/utility, close with an aspirational but reference-accurate interior result.

## Hand, Body, And Furniture Interaction Rule

For any frame that shows hands, people, or body contact with furniture, the prompt MUST protect anatomy and realistic interaction.

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
- body posture that matches real furniture use
- product contact that matches real weight, scale, and function

Interaction examples:
- sitting on chairs/sofas/benches: hips aligned to seat, feet naturally on floor or footrest, cushion compression subtle and believable, no floating body
- leaning on armrests or tabletops: believable weight distribution, no bending or melting of furniture surfaces
- opening drawers/doors: hand grips the actual handle/pull/edge, motion follows the correct hinge/slide direction, no invented handles
- pulling a chair/stool: hand contacts the backrest or seat edge naturally, legs remain stable on the floor
- working at a desk/table: arms rest at plausible height, laptop/paper/props do not hide product-defining edges and support structure
- reclining or lounging: only show recline, footrest, swivel, rocking, or convertible functions when the reference product has those mechanisms
- carrying or assembling: use plausible scale and weight; large furniture is not casually held like a small prop

Prefer simple readable poses. In close-up product-use frames, use one clearly visible active hand when possible. Avoid crossing two hands over important furniture details, hiding handles with fingers, blocking seams/hardware, or creating complex mirrored poses unless the anatomy remains simple and readable.


## Armless Daybed / Low Chaise Product-Specific Guard

For armless daybeds, low chaise seats, compact sofa beds, and floor-sofa products, preserve the exact product class and avoid generic sofa substitution.

Mandatory preservation points:
- one long rectangular seat slab unless the reference shows separate cushions
- a single backrest panel at one short end or along one side as shown in the reference
- included pillow count/shape only if visible in the product reference
- no armrests unless visible in the product reference
- short exposed legs or low base exactly as shown
- fabric weave/color and edge piping visible in the product reference
- low lounge/daybed scale, not a tall couch or luxury sectional

In lifestyle or storyboard scenes, a person may sit, recline, place a hand on the backrest, read, drink coffee, or demonstrate scale, but the person must not hide the product's defining silhouette in all panels. At least three storyboard panels must show the full product form clearly: front three-quarter, side profile, and product-only hero/detail.


## Additional Negative Constraints For Small Furniture Components

Use these negatives when the product is hardware, a part, or an accessory:
no hardware-to-full-furniture substitution, no shelf replacing bracket as product, no room decor replacing product, no hidden bracket, no tiny uninspectable product, no missing screw holes, no missing diagonal brace, no changed hole count, no changed left/right pair relationship, no invented ornate bracket design, no wrong metal finish, no visible storyboard dividers, no white panel borders.
