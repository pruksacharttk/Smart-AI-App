# Thai Video Storyboard Prompt Skill

Skill นี้ใช้สร้าง prompt สำหรับวิดีโอแบบ storyboard ยาว โดยแบ่งเป็นจำนวน shot ตาม input และล็อกให้ทุก shot ยาว 10 วินาที พร้อมใส่ Story Bible เดียวกันแบบเหมือนกันทุก prompt เพื่อรักษาความต่อเนื่องของตัวละคร ฉาก เสียง และโทนเรื่อง

## สิ่งที่มีครบตาม requirement

- Phase 1: Header, WORKFLOW block, CHARACTER LOCK, AUDIO RULE, PRODUCTION SPECS, THE N SCENES, AUDIO global
- Phase 2: LANGUAGE LOCK, AUDIO RULE, GENERATE N CLIPS instruction, THAI DIALOGUE PER CLIP, GLOBAL AUDIO MIX, CHARACTER LOCK reminder
- ทุก shot มี duration 10 seconds
- ทุก shot มี Story Bible เดียวกันใน marker `<<<STORY_BIBLE_START>>>` / `<<<STORY_BIBLE_END>>>`
- มี schemas ครบใน folder `schemas/`
  - `input.schema.json`
  - `ui.schema.json`
  - `output.schema.json`
- มี Python validator ตรวจว่า Story Bible เหมือนกันครบทุก prompt ในทุก shot

## ใช้งาน

```bash
python src/generate_storyboard_prompts.py examples/input.example.json > output.json
python src/validate_story_bible.py output.json
```

## Output

ผลลัพธ์จะมีทั้ง master prompt ของ Phase 1/Phase 2 และ prompt แยกต่อ shot โดยทุก prompt มี Story Bible เดียวกันและมี audio/language/character lock ครบถ้วน
