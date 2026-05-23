# ElevenLabs Beauty & Personal Care Dialogue Skill v17

Plain-text ElevenLabs-style dialogue generator for beauty, cosmetic, personal care, hygiene, oral-care, feminine-care, hair-care, sunscreen, grooming tools, adjacent wellness accessories, and selected medical-adjacent personal-use products.

## Output

Final output is a customer-facing dialogue string, not JSON.

```text
Speaker 1: [curious] ...
Speaker 2: [laughing] ...
```

## v17 focus

- Medical-device scar gel and self-sampling diagnostic kit guard
- Hair-loss set guard, including supplement warning and promo removal
- Scalp acne/dandruff/seborrheic-style claim softening
- Intimate cleanser claim softening
- Whitening body lotion and brightening mist softening
- UV apparel/textile and sunscreen-adjacent wording
- Strict no-meta-compliance dialogue in final output

See `rules/category-guard-matrix-v17.md` and `tests/batch-v17-automated-test-report.md`.


## v17 update

Adds stronger SET/bundle orchestration, effervescent dietary supplement handling, underarm brightening set guard, HPV/STI self-sampling safe narration, UV apparel guard, and medical-adjacent support product guard.


## v18 Image Upload Option

This version adds optional image upload support. `product_images` accepts up to 5 uploaded image files through a drag-and-drop/file-upload UI. The field is optional and does not replace `product_details`. Uploaded images are used to confirm visible product details, detect mismatched listings, and improve script accuracy while avoiding invented or exaggerated claims.
