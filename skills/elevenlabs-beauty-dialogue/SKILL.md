# ElevenLabs Beauty & Personal Care Dialogue Skill v16

Generate **plain-text** ElevenLabs-style dialogue for cosmetics, beauty, personal care, hygiene, oral care, feminine care, sunscreen, hair color, grooming tools, and adjacent household/personal-use products.

## Output Contract

Return **plain text only**, never JSON. Preferred structure:

```text
Speaker 1: [excited] ...
Speaker 2: [curious] ...
```

Use natural language in the selected `output_language`. Keep total spoken length under `target_duration_seconds`, default 55 seconds.

## No Meta-Compliance Dialogue Rule v12

The final script is **customer-facing ad dialogue**, not a moderation report. Speakers must never say internal compliance instructions such as:

- “ไม่ควรนำคำเคลม…” / “ห้ามใช้คำว่า…” / “ไม่ควรเคลมว่า…”
- “This claim is risky…” / “Do not mention…” / “Avoid claiming…”
- Lists of banned words, legal checks, rule names, policy explanations, or why a claim was removed.

Compliance must happen silently during drafting. If risky details are found, rewrite them into safe, natural benefits **without explaining the rewrite to the listener**.

Bad:
```text
Speaker 2: [calm] ไม่ควรใช้คำว่า anti-hairloss หรือกระตุ้นผมใหม่ในบทพูด
```

Good:
```text
Speaker 2: [calm] ใช้เป็นรูทีนสระผมที่ช่วยให้หนังศีรษะรู้สึกสะอาด และผมดูเบาสบายขึ้น
```


## Input Options

See `schemas/input.schema.json`.

Key options:
- `output_language`: default `English`; supports Thai and popular languages.
- `speech_style`: professional, friendly, friend-to-friend, humorous, sarcastic-light, complaining-but-helpful, roast-but-praise, luxury-polished, soft-caring, energetic-host.
- `persuasion_style`: benefit-led, problem-solution, storytelling, review-like, educational, soft sell, direct response, humor hook, premium trust, routine journey.
- `evergreen_mode`: ignore short-term promotions, discounts, giveaways, shipping policy, shop terms, review conditions, return rules, and marketplace noise unless the user explicitly asks for promo copy.
- `regulated_product_mode`: when the product is medical-adjacent, dental-adjacent, intimate-care-adjacent, or a non-cosmetic personal hygiene item, keep copy factual, cautious, and instruction-led.

## Core Dialogue Method

1. Extract product category and stable product facts from user details.
2. Remove marketplace noise: shipping, COD, vouchers, coupon, review policy, seller schedule, return policy, chat hours, packaging disputes, and platform-specific instructions.
3. Detect short-term promo info and omit it in evergreen scripts.
4. Build product journey:
   - 0-3s hook based on a real pain point or desired outcome.
   - Main usage moment.
   - Real feature/benefit from source details only.
   - Category-specific caution/disclaimer.
   - Soft call to action.
5. Insert emotions/audio tags naturally.
6. Apply bilingual claim guard silently before final output.
7. Remove all meta-compliance language from the spoken dialogue.
8. Repair until no banned claim, unsupported medical/brand/institutional endorsement, overclaim, unsafe instruction, or compliance explanation remains.

## Universal Safety Rules

Never overstate. Do not claim guaranteed results, permanent effects, medical treatment, disease prevention, clinical superiority, competitor superiority, or brand authorization unless legally permitted and explicitly evidenced in the user-provided details.

Do not use third-party brand names as endorsement or as an authorized partnership unless the user clearly provides permission/evidence. It is acceptable to describe category-level features without amplifying brand authority.

เลขจดแจ้ง / FDA / อย. may be kept only as neutral label information, not as proof of efficacy, endorsement, safety, or superiority.

## Bilingual Claim Guard

See `claim_guard/bilingual-risk-dictionary.md`. The skill must detect Thai, English, transliterations, mixed Thai-English, misspellings, and marketing phrases.

If a risky claim appears:
- Do not repeat it directly.
- Rewrite to a softer cosmetic/personal-care framing.
- Add a category-appropriate disclaimer when needed.
- If it is a treatment/disease claim, omit it.

## Category Guards v13

### Hair color / color cream / color shampoo
Allowed: shade range, helps cover grey/white hair, easier home use, developer or mixing steps if stated, ammonia-free if stated.
Avoid: prevents grey hair, prevents hair loss, regrows hair, cures dandruff/itch, safe for everyone, no stain guarantee, no scalp irritation, no hair damage, exact-color guarantee.
Caution: patch test before use; wear gloves; follow timing; avoid eyes; color varies by base hair and hair condition.

### Bath bomb / bubble bath
Allowed: foam experience, aroma, relaxation routine, use under running water, works better with strong water flow if stated.
Avoid: no tears, safe for all kids, toxic-free as absolute safety, no irritation, guaranteed foam/refund claim, hotel majority selection as proof.
Caution: avoid eyes; do not ingest; supervise children; stop if irritated; bathtub/surface staining may vary by use and surface condition.

### Face/body serum, lotion, oil, hand cream
Allowed: moisturizes, softens, reduces dry-feel, makes skin look smoother or more radiant.
Avoid: whitening, brightening as skin color change, melasma/freckle/dark-spot removal, repairs skin, anti-aging cure, anti-inflammatory, hair-loss improvement, root strengthening unless it is a permitted hair product and phrased safely.
Caution: results vary; patch test; stop if irritation; avoid broken skin.

### Glutathione / AHA / exfoliating soap
Allowed: cleansing, fresh feel, smoother-looking skin, gentle exfoliating feel if stated.
Avoid: accelerated whitening, sunburn repair, severe brightening, skin peeling guarantee, face-safe for everyone, allergy-free.
Caution: patch test; avoid eyes; use sunscreen in daytime when exfoliating ingredients are mentioned; stop if irritated.

### Sunscreen face/body
Allowed: SPF/PA stated on label, lightweight texture, daily sun-protection routine, water/sweat activity if stated but not guaranteed.
Avoid: blocks all UV, acne treatment, prevents spots/wrinkles, repairs skin, pore tightening, safe for all sensitive/acne-prone skin, no clogging guarantee, strongest/best protection.
Caution: apply generously and reapply as directed; results depend on amount used, activity, sweat, and water exposure; patch test for sensitive skin.

### Facial cleanser / mask / acne-prone or sensitive skin wording
Allowed: cleanses, hydrates, softens, skin looks fresh/smoother, free-from ingredient list if stated.
Avoid: acne cure/prevention, inflammation reduction, scar healing, collagen stimulation, anti-aging reversal, UV damage repair, hypoallergenic guarantee, allergen-free guarantee, safe for all sensitive skin.
Caution: patch test; avoid eyes; stop if irritation; consult professional for persistent skin issues.

### Shampoo / anti-hairloss / scalp care / scalp brush
Allowed: cleanses hair/scalp, hair looks fuller/has more volume, helps massage scalp, helps distribute shampoo.
Avoid: reduces hair loss as treatment, stimulates new hair growth, better than Minoxidil, treats scalp disease, cures itch, heals wounds, boosts blood circulation as medical effect.
Caution: do not use on broken/irritated scalp; stop if discomfort; consult a professional for unusual hair loss or scalp symptoms.

### Deodorant / antiperspirant / underarm cream/spray
Allowed: helps reduce odor, helps manage sweat, fresh scent, lightweight or dry feel, 24/48h as label context only if not overstated.
Avoid: sweat-free guarantee, no dark underarms, whitening, pore tightening, treats chicken skin/inflammation, no irritation, safe for everyone, organic 100% unless verified.
Caution: underarms are sensitive; stop if irritated; avoid broken/just-shaved skin; for aerosol sprays, use in well-ventilated area and keep away from flame.

### Toothpaste / whitening dental products
Allowed: helps remove surface stains, teeth look cleaner/brighter, fluoride information if provided, fresh breath.
Avoid: instant/permanent whitening, whitening from inside, repairs enamel, no sensitivity/no damage guarantee, cures gum disease, guaranteed clinical result.
Caution: use as directed; results vary; consult dentist for sensitivity, gum disease, braces, dental work, children.

### Orthodontic wax / dental appliance comfort aids
Allowed: helps cushion brackets or appliance edges, portable, easy to apply.
Avoid: prevents wounds, treats oral ulcers, medical cure, suitable for everyone, food-grade as safety proof beyond label.
Caution: temporary comfort aid; keep clean; consult orthodontist/dentist if pain, bleeding, or sores persist.

### Makeup sponge / puff / applicator
Allowed: soft touch, helps blend powder/foundation/cushion, size/shape, easy grip, cleanable if stated.
Avoid: non-irritating guarantee, suitable for all sensitive skin, antibacterial unless supported, professional flawless guarantee.
Caution: wash and dry regularly; replace when worn; stop use if skin reacts.

### Portable urine bag / travel urinal bag
Allowed: portable urine collection aid, zip-lock design, absorbent gel if stated, travel/camping/emergency use.
Avoid: medical suitability for all people, leak-proof guarantee, odor-proof guarantee, reuse encouragement without hygiene caveat, child/elderly/pregnancy medical endorsement.
Caution: single-use or follow label; seal and dispose hygienically; wash hands; caregiver/medical use should follow professional advice.

### Feminine care / sanitary pad / pantiliner / sanitary pants
Allowed: soft touch, breathable feel, helps absorb, helps reduce leakage concerns, size info.
Avoid: no leak guarantee, 100% dry, no irritation, medical postpartum safety, antibacterial claims unless verified, extreme absorbency as proof.
Caution: change regularly; choose size/flow; stop if irritation; consult professional postpartum or if symptoms occur.

### Alcohol hand sanitizer / alcohol solution
Allowed: hand-cleaning, quick-dry feel, no added fragrance/color if stated, volume, use with dispenser if stated.
Avoid: kills all germs, sterilizes, medical-grade protection, prevents disease, 100% safe.
Caution: external use only, keep away from flame/heat, avoid eyes/wounds, keep out of reach of children.

### Retainer / aligner cleansing tablets
Allowed: helps clean retainers/aligners, helps reduce odor, reaches areas brushing may miss.
Avoid: kills 99.99%, disinfects/sterilizes, prevents disease, removes all tartar.
Caution: not for oral consumption; rinse appliance thoroughly before putting back in mouth; follow dental appliance instructions.

### Ear picks / ear cleaning tools
Allowed: portable tool, stainless-steel material, storage case.
Avoid: deep-clean ear canal, removes all wax safely, medical ear hygiene guarantee.
Caution: use only around outer ear, do not insert deeply, keep away from children, consult medical professional for pain/blocked ear.

### Generic beauty accessories
Allowed: material, dimensions, convenience, storage, use cases.
Avoid: 100% satisfaction, best/cheapest, competitor comparison, guaranteed professional result.
Caution: use as intended.


## v13 Expanded Category & Risk Guards

### Acne / BHA / sulfur cleansing bars and acne-prone wording
Allowed: cleansing, fresh-feel, oil/sweat removal, ingredient presence from the label such as sulfur/BHA, gentle-use routine, rinse-off use.
Avoid: acne treatment/cure/prevention, killing C.acnes, anti-inflammatory, dermatitis relief, repairing skin barrier, enzyme inhibition, sphingolipid stimulation, “for sensitive skin safely for everyone”, guaranteed one-month result.
Caution: patch test, avoid eyes and broken/irritated skin, rinse well, reduce frequency if dry/tight, consult a professional for persistent or severe skin concerns.

### Foot scrub / callus file / body exfoliating tool
Allowed: removes dead-skin feel, helps smooth rough-looking areas, use on wet skin if stated, follow with moisturizer.
Avoid: treating cracked heels, removing corns/calluses medically, no irritation, guaranteed smoothness, safe for diabetic/poor-circulation feet.
Caution: use gently, avoid wounds/bleeding/cracked-open skin, do not over-scrub; people with diabetes, poor circulation, or foot wounds should seek professional advice.

### Perfume / fragrance / inspired scent listings
Allowed: size, scent families such as floral/fruity/powdery/fresh/warm, portable use, choose by mood.
Avoid: using famous brand names, implying authorized dupe/copy, “pheromone attraction” claims, guaranteed long-lasting, cheapest/best, counterfeit warnings as a selling hook.
Caution: patch test on fabric/skin as appropriate, avoid eyes, stop if irritated, scent performance varies by skin and environment.

### Eye mask / lip mask / under-eye patch
Allowed: cooling routine, moisturizing feel, under-eye area looks fresher/rested, lip feels softer, chill-before-use if stated.
Avoid: dark-circle removal, puffiness treatment, wrinkle reduction, collagen rebuilding, eye-fatigue medical relief, instant result.
Caution: avoid direct contact with eyes, do not use on broken/irritated skin, patch test, stop if stinging or redness.

### Multi-SKU or mixed product listings
When one listing contains many unrelated products or formulas, do not combine their claims into one “super product.” Create a neutral script about choosing the right formula and following the label, or focus only on the single selected item if the user specifies one.
Avoid: merging acne gel, melasma serum, DD cream, sunscreen, and facial serum claims into one dialogue.

### Hair tonic / hair growth serum / lash-brow serum
Allowed: scalp/hair care routine, lightweight texture, hair feels conditioned, helps hair look smoother/fuller by appearance when safely phrased.
Avoid: accelerates hair growth, regrows hair, reduces hair loss, follicle stimulation, 9x/one-week result, rebuilding cells, lash/brow growth, medical comparisons.
Caution: avoid eyes, do not use on irritated scalp/skin, stop if discomfort, seek professional advice for unusual hair loss.

### Waxing / hair-removal wax
Allowed: kit components, at-home hair-removal routine, aloe gel included if stated.
Avoid: painless, irritation-free, safe for all areas/skin, permanent hair removal.
Caution: patch test, follow temperature/use instructions, avoid wounds/sunburn/irritated skin, do not use immediately after harsh exfoliation, stop if severe irritation.

### Makeup brushes / beauty tools near eyes
Allowed: brush count, use cases, soft feel, storage/cleaning steps.
Avoid: non-irritating guarantee, safe for sensitive skin, professional result guarantee, never sheds.
Caution: clean and dry regularly; use gently near eyes; replace damaged tools.

### Brow pencil / eye makeup pencil
Allowed: shade options, creamy texture, easy draw, natural-looking brow finish, water-resistant/long-wear as label context.
Avoid: no-smudge/no-fade guarantee, sweat-proof all day, safe for everyone.
Caution: avoid direct eye contact; remove gently; performance varies with skin oil, sweat, and activity.

### Hair treatment / conditioner / treatment sachet
Allowed: helps hair feel soft, smooth, easier to comb, less frizzy-looking, conditioning ingredients.
Avoid: repairs damaged hair, UV protection as health claim, restores hair, fixes chemical damage, instant result from first use.
Caution: rinse as directed; avoid eyes/scalp irritation; results vary by hair condition.

## Repair Loop

Before final answer, check:
- plain text only
- selected output language
- no JSON braces as output wrapper
- first line hook under roughly 3 seconds
- no unsupported risky claims
- no meta-compliance phrases such as “ไม่ควรเคลม”, “ห้ามใช้คำ”, “do not mention”, “risky claim”, or banned-word lists inside the spoken dialogue
- no temporary promo details in evergreen mode
- no unsafe medical, dental, institutional, or professional endorsement
- relevant category-specific caution included
- no direct famous-brand perfume dupes or unauthorized brand comparisons
- no multi-SKU claim merging
- under duration limit


## v14 Expanded Category & Risk Guards

### Steam eye mask / self-heating eye patch
Allowed: warm eye-area rest routine, aroma options, portable single-use format, approximate use time from label.
Avoid: treating headache, eye pain, dark circles, insomnia, stress, medical eye fatigue relief, safe while sleeping, safe for all users.
Caution: use only as directed; stop if too hot, stinging, or uncomfortable; avoid use over eye disease, eye injury, inflamed skin, or immediately after eye procedures unless advised by a professional.

### Intimate feminine cleanser
Allowed: external cleansing, pH value if stated, soap-free/free-from list as label information, fresh clean feel.
Avoid: treating odor/infection, balancing vaginal flora as a medical claim, safe for all sensitive skin, prevents discharge/itch, internal use.
Caution: external use only; do not use internally; stop if burning/itching/irritation occurs; consult a healthcare professional for abnormal odor, discharge, pain, pregnancy/postpartum concerns, or persistent symptoms.

### Dermocosmetic balm / sensitive-skin balm / family-use balm
Allowed: moisturizes dry-feeling skin, helps skin feel comfortable, ingredient facts such as Vitamin B5/prebiotic/madecassoside if provided, texture.
Avoid: dermatologist/doctor endorsement as sales proof, healing wounds, repairing skin barrier as medical fact, safe for babies/everyone, clinically safe for all sensitive skin.
Caution: avoid eyes and open wounds; patch test if sensitive; children/infants and intimate-area use should follow the product label or professional advice.

### Heat styling appliance / hair straightener / curler
Allowed: temperature levels, plate size, fast heating as stated, styling use cases such as straight/curve/volume.
Avoid: damage-free, hair-shine guarantee, safe for all hair types, salon result guarantee, heat protection guarantee.
Caution: use on dry hair unless label says otherwise; keep away from water; unplug after use; keep from children; use appropriate temperature and heat protection when needed.

### Earplugs / noise-reduction plugs
Allowed: sponge/PVC material, storage case, helps reduce surrounding noise, portable use.
Avoid: anti-snoring cure, sleep-disorder treatment, total noise cancellation, medical hearing protection guarantee, underwater/diving use.
Caution: insert gently and not too deep; keep clean/dry; do not use for diving unless specified; consult a professional for ear pain, infection, or blocked-ear symptoms.

### Mirrors / hair patches / simple styling accessories
Allowed: size, portability, random color/design, keeps hair away from face during makeup, lightweight convenience.
Avoid: cheapest/best, no-break guarantee, professional result guarantee, medical/skin claims.
Caution: use as intended; keep small items away from children; mirror surface can break if dropped.

### Nail adhesive tabs / peel-off nail polish / press-on accessories
Allowed: quantity, easy application, press time, peel-off/removal steps, no-lamp formula if stated.
Avoid: no nail damage, no irritation, guaranteed wear time, waterproof guarantee, salon result guarantee.
Caution: apply on clean dry nails; avoid skin and wounds; remove gently with warm water or label method; stop if irritation occurs.

### Eye makeup / mascara / brow pencil / eyelash curler
Allowed: shade options, brush/pencil design, curl/volume/look effects, water-resistant or long-wear as label context.
Avoid: exact 24h guarantee, no smudge/no clump absolute, eye-safe for everyone, celebrity/global ranking as trust point.
Caution: avoid direct eye contact; stop if eye irritation; remove gently; do not share eye products.

### Serum technology / multi-SKU active skincare listings
When a listing contains many actives and formulas, do not merge acne, melasma, pore, whitening, wrinkle, and barrier claims into one product promise. Create a neutral script about selecting the right formula and using it consistently.
Allowed: hydration, smoother-looking skin, routine fit, formula-selection guidance, label facts.
Avoid: seeing results faster/better, 11.5x absorption as efficacy proof, acne clearing, melasma reduction, whitening, pore tightening, anti-aging reversal, skin-barrier rebuilding.
Caution: patch test; introduce one formula at a time; results vary; consult a professional for persistent skin concerns.

## v15 Expanded Category & Risk Guards

### Acne cushion / longwear cushion / makeup for acne-prone skin
Allowed: shade range, coverage, oil-control look, smoother-looking makeup finish, water/sweat-resistant or longwear as label context.
Avoid: acne reduction, clinical percentage as ad promise, dermatologist research as sales proof, non-comedogenic guarantee, no-clog guarantee, safe for all acne-prone/sensitive skin, flawless skin guarantee.
Caution: remove makeup thoroughly; patch test; if acne or irritation persists, consult a qualified professional.

### Concealer / color corrector / under-eye corrector
Allowed: peach/blue/corrector color logic, medium-full coverage as makeup finish, bright-looking under-eye area, semi-matte texture, shade selection.
Avoid: erasing dark circles, treating pigmentation, all-day no-crease guarantee, covers every flaw, exact sweat/waterproof guarantee.
Caution: shade and coverage depend on skin tone, lighting, texture, and application; avoid direct eye contact.

### Urea body cream / rough dry skin cream
Allowed: urea percentage from label, moisturizes dry-feeling rough areas, elbows/knees/heels, smoother skin feel.
Avoid: fixing keratosis pilaris/chicken skin as treatment, healing cracked skin, TEWL numbers as guaranteed efficacy, pregnancy-safe claim unless handled by label/professional guidance.
Caution: avoid open wounds; patch test; stop if stinging or irritation; pregnancy/medical skin conditions should follow professional advice.

### Mouth spray / propolis oral spray
Allowed: fresh breath, mouth-feel freshness, portable use, sugar/alcohol/paraben free if stated, oral-care routine.
Avoid: treating sore throat, oral ulcers, infection, inflammation, killing bacteria as medical effect, pharynx targeting, disease prevention, safe frequent use for everyone.
Caution: use as directed; do not swallow excessively; consult a dentist/doctor if sore throat, mouth sores, pain, or odor persists.

### Retinal / retinoid / anti-aging body oil or cream
Allowed: moisturizing oil feel, smoother-looking skin, night body-care routine, ingredient presence.
Avoid: anti-aging reversal, wrinkle reduction guarantee, tightening/young skin promise, prevention of wrinkles.
Caution: follow label; avoid pregnancy/breastfeeding when the label warns; use sunscreen in daytime for retinoid/exfoliating routines; stop if irritation.

### AHA/BHA body cleanser, face wash, body solution
Allowed: cleansing, exfoliating routine, smoother-feeling skin, BHA/AHA percentage if stated, rinse-off or leave-on use instructions.
Avoid: acne treatment/cure, statistically significant acne reduction as ad promise, pore unclogging as medical effect, guaranteed brightening/whitening.
Caution: start slowly for leave-on acids; avoid face if label says body only; avoid eyes/broken skin; use sunscreen in daytime; stop if irritated.

### Hand cream with UV filters / sunscreen hand cream
Allowed: SPF/PA label facts, moisturizes hands, soft feel, daily hand-care routine, reapply after washing.
Avoid: anti-aging/rejuvenation claims, spot/freckle removal, retinol-comparison superiority, hypoallergenic guarantee.
Caution: reapply especially after washing; results vary; patch test.

### Anti-dust mite pillowcase / bedding adjacent hygiene product
Allowed: microfiber material, zip design, thread density if stated, helps reduce direct contact with dust and allergens when phrased cautiously.
Avoid: allergy reduction/treatment, 99.99% protection as guarantee, anti-bacterial/anti-fungal as medical proof, kid-safe/hypoallergenic guarantee, institutional endorsement as sales proof.
Caution: wash and care as directed; not a medical treatment; consult a healthcare professional for allergy/asthma symptoms.

### Medical/institutional/clinical/statistical proof claims
When clinical trials, dermatologist references, hospital labs, numbers such as 50%, 70.9%, 11.5x, 99.99%, or “clinically proven” appear, keep them out of spoken dialogue unless the user explicitly asks for a factual evidence script and the claim is permitted. Prefer customer-facing, product-use benefits and general variability disclaimers.

### Brand-heavy official listings
Do not amplify brand authority, global rankings, doctor/dermatologist recommendations, or “official store” as trust proof. If the brand name is necessary for product identification, keep it neutral and brief, but do not turn it into endorsement.


---

## v16 Additional Category Rules

### Medical-device scar gel / wound-adjacent products
- Use neutral language such as film-forming gel, silicone gel, clean closed/minor wound care, and label-based usage.
- Do not promise scar prevention, scar removal, infection prevention, bacterial protection, or wound healing.
- Include: use only as directed, on cleaned/appropriate skin, avoid open/unclean wounds, consult a medical professional for deep, infected, painful, or abnormal wounds.

### HPV self-sampling / diagnostic test kits
- Keep dialogue factual and service/instruction-led.
- Do not imply diagnosis, treatment, guaranteed accuracy, or replace clinician screening.
- Include: read device instructions, follow collection/shipping timing, consult healthcare professional for results or symptoms.
- Default evergreen scripts must remove clearance, price, and no-return terms.

### Hair-loss set with supplement
- Do not use hair regrowth, anti-hairloss, follicle stimulation, better-than-Minoxidil, anagen extension, or quantified hair-growth claims as sales hooks.
- If supplement is present, add food supplement warning: eat a balanced diet from all five food groups, read label, not for disease treatment/prevention, consult a professional for pregnancy, illness, or medication use.

### Scalp acne/dandruff/seborrheic-style products
- Say scalp-cleansing routine, refreshing feel, oil-control feel, flake-prone scalp care.
- Do not claim treating acne, dandruff, fungal infection, seborrheic dermatitis, inflammation, itch cure, or bacterial/fungal inhibition.
- Include professional advice for persistent redness, flakes, itch, wounds, or hair-loss symptoms.

### Intimate cleanser
- Keep to external-use cleansing, pH/free-from facts, freshness, and gentle routine.
- Do not claim treating discharge, infection, odor causes, itching, irritation, flora imbalance, bacterial overgrowth, or gynecological symptoms.

### Textile UV apparel
- Say UPF/UV label fact, coverage, lightweight comfort, outdoor layering.
- Do not promise medical sun protection, skin-damage prevention, or 99.9% absolute protection in spoken hook.
- Include: still use sunscreen and sun-safe habits for exposed skin.

### Evidence and clinical-number simplifier
- Do not turn percentages, x-times, trial counts, “doctor/dermatologist confirmed”, or “research-proven” into the spoken hook.
- Convert to practical, non-guaranteed benefits and add “ผลลัพธ์ขึ้นกับแต่ละบุคคล” where relevant.


# v17 Additional Guard Rules

## SET / Bundle Orchestration Guard
When a listing is a set or cart bundle, identify each product role before writing the dialogue. Do not merge functions into one impossible claim. Describe the set as a routine only when the steps are compatible. If the set contains a dietary supplement, include a natural consumer-facing reminder to eat a varied diet from all 5 food groups, read the label, and avoid treating the supplement as disease prevention or treatment.

## Whitening / Brightening Sets
For underarm, body, face, lip, or dental whitening language, convert to safer appearance-language such as “ผิวดูสดใสขึ้น”, “สีผิวดูสม่ำเสมอในลุคการดูแล”, “ฟันดูสะอาดขึ้นจากการดูแลคราบบนผิวฟัน”. Never promise permanent color change, instant results, or medical pigment outcomes.

## Medical-Adjacent Self-Sampling and Scar Gel
For diagnostic kits, self-sampling kits, medical-device scar gel, or regulated health products, keep the dialogue factual and process-focused. Include reading instructions, correct sample handling, and professional follow-up for results or abnormal symptoms. Do not diagnose, promise accuracy, or replace medical advice.

## Apparel / Textile UV and Support Products
For UV jackets, pillowcases, wraps, support belts, knee supports, and related textile products, describe physical features and usage conditions. Do not promise disease prevention, cure, permanent pain relief, or guaranteed UV/allergen/bacterial protection. Mention fit, correct use, washing, and professional consultation for persistent symptoms when relevant.

## No Meta-Compliance Reinforcement
Final output must never say “ไม่ควรเคลม”, “ห้ามใช้คำ”, “คำเคลมเสี่ยง”, “banned claim”, “avoid claiming”, or similar internal review language. Rewrite silently into natural ad dialogue only.


## v18: Optional Product Image Uploads

The skill now accepts optional product images through direct upload/drag-and-drop via `product_images` in `schemas/input.schema.json`.

- Images are optional; the only required field remains `product_details`.
- Users may upload up to 5 images.
- Upload must be via file picker or drag-and-drop, not URL entry.
- Use images to improve product understanding, confirm visible package/label details, and detect conflicts or risk signals.
- Product text remains the primary source. Images support the text but must not create new claims.

When images are included:

1. Analyze the product text first.
2. Inspect images for clearly visible/readable details only: product type, package size, variant, visible warnings, ingredients, usage instructions, label terms, texture, shade, scent, and expiration if readable.
3. Compare text and images. If they conflict, use conservative overlapping facts and avoid turning conflicting details into a stronger claim.
4. Treat before/after images, doctor/pharmacist imagery, certificates, awards, clinical-looking graphics, and extreme result visuals as risk signals, not proof.
5. Keep the final output as natural customer-facing plain-text dialogue. Do not mention “image analysis,” “risk check,” “ไม่ควรเคลม,” or compliance notes in the spoken dialogue.

Safe image-assisted phrasing examples:

```text
Speaker 1: [confident] จากแพ็กเกจเป็นเจลล้างหน้าขนาด 100 มล. จุดเด่นคือสูตรอ่อนโยนและ free-from list ตามฉลาก
Speaker 2: [warmly] ล้างให้สะอาดแบบไม่เล่นใหญ่ แล้วให้ผิวได้เริ่มรูทีนแบบสบาย ๆ
```

Avoid using images to say:

```text
แพทย์รับรอง, เห็นผลทันที, ขาวขึ้นจริง, รักษาสิว, ลดฝ้าถาวร, ปลอดภัยทุกคน, การันตีผล
```
