# Smart AI App

Smart AI App คือระบบรัน Skill ผ่านเว็บเบราว์เซอร์ในเครื่อง สำหรับงานสร้างพรอมต์ AI, บทความ, storyboard, prompt วิดีโอ, รีวิวสินค้า, ออกแบบภูมิทัศน์ และ workflow อื่น ๆ ที่สามารถเพิ่มเป็น skill ได้ในภายหลัง

ระบบจะสแกนโฟลเดอร์ `skills/` อัตโนมัติ สร้างฟอร์มจาก schema ของแต่ละ skill และรันได้ทั้งแบบ local runtime หรือผ่าน LLM provider ที่ผู้ใช้ตั้งค่าในหน้าเว็บ

ระบบนี้ไม่จำเป็นต้องใช้ database และไม่ต้องให้ผู้ใช้แก้ไฟล์ config โดยตรง การตั้งค่า API key ทำผ่านหน้าต่าง `Config` ใน browser เท่านั้น โดย key จะถูกเก็บใน browser local storage ของเครื่องนั้น

## ฟีเจอร์หลัก

- สแกน skill จากโฟลเดอร์ `skills/` อัตโนมัติ
- สร้าง UI จาก `schemas/input.schema.json`
- รองรับ `schemas/ui.schema.json` สำหรับจัด section, label, คำอธิบาย และข้อความสองภาษา
- เติม field ที่มีใน `input.schema.json` แต่ยังไม่มีใน `ui.schema.json` ให้อัตโนมัติ
- เลือก skill ได้จาก dropdown
- รองรับ skill ที่มี local Python runtime ที่ `python/skill.py`
- รองรับ skill แบบ LLM-only ผ่าน OpenRouter หรือ NVIDIA NIM
- ตั้งค่า API key ผ่านหน้า Config ใน browser
- ช่อง API key ซ่อนด้วย password field และมีปุ่ม Show/Hide
- ตั้ง fallback model ได้ 4 ลำดับ
- ทดสอบ LLM ทุก fallback row ด้วยปุ่ม `Test LLM`
- แสดงผล test เป็น `OK`, `FAIL`, หรือ `SKIP`
- แสดงสถานะตอนรันว่าเรียก provider/model ไหนอยู่
- แสดง provider/model ล่าสุดที่รันสำเร็จ
- รองรับ drag & drop upload สำหรับ input ที่เป็นภาพอ้างอิง
- ส่งภาพให้ LLM เป็น base64 data URL แทน URL ภายนอก
- มี rate limit ป้องกันการเรียกถี่ผิดปกติ
- รองรับ UI ภาษาไทยและอังกฤษ
- ดาวน์โหลดผลลัพธ์เป็น JSON ได้
- มี tab `Prompt` สำหรับ copy ผลลัพธ์หลัก
- ไม่ใช้ database
- ไม่บันทึก API key ลงไฟล์ project

## โครงสร้างโปรเจกต์

```text
Smart AI App/
  public/
    index.html
  skills/
    gpt-image-prompt-engineer/
    image_prompt_engineer/
    marketing-article-writer/
    household-product-reviewer/
    smart-landscape-designer/
    video-storyboard-to-prompts/
  server.js
  package.json
  package-lock.json
  .npmrc
  .env.example
```

ไฟล์สำคัญ:

- `server.js`: server หลัก, skill scanner, LLM gateway, rate limiter, runtime dispatcher
- `public/index.html`: UI หน้าเว็บแบบ single file
- `skills/`: โฟลเดอร์รวม skill ทั้งหมด
- `schemas/input.schema.json`: schema หลักที่ทุก skill ต้องมี
- `schemas/ui.schema.json`: schema สำหรับจัดหน้าฟอร์ม แนะนำให้มี
- `schemas/output.schema.json`: schema สำหรับอธิบายรูปแบบ output
- `python/skill.py`: runtime เฉพาะ skill ถ้ามี

## สิ่งที่ต้องติดตั้ง

### จำเป็น

- Node.js 20 ขึ้นไป
- npm
- browser สมัยใหม่ เช่น Chrome, Edge, Firefox หรือ Safari

### จำเป็นสำหรับ skill ที่รัน Python

- Python 3.10 ขึ้นไป

ถ้าไม่ติดตั้ง Python ยังสามารถรัน skill แบบ LLM-only ได้ หากตั้งค่า OpenRouter หรือ NVIDIA แล้ว

### แนะนำ

- Git สำหรับ clone/push project
- GitHub CLI ถ้าต้องการจัดการ GitHub ผ่าน terminal
- OpenRouter API key
- NVIDIA NIM API key

## วิธีติดตั้งบน Windows

### 1. ติดตั้ง Node.js

1. เปิด <https://nodejs.org/>
2. ดาวน์โหลดเวอร์ชัน LTS
3. ติดตั้งด้วยค่า default
4. เปิด PowerShell หรือ Command Prompt ใหม่
5. ตรวจสอบ:

```powershell
node --version
npm --version
```

ควรเป็น Node.js 20 หรือใหม่กว่า

### 2. ติดตั้ง Python

1. เปิด <https://www.python.org/downloads/windows/>
2. ดาวน์โหลด Python 3.10 หรือใหม่กว่า
3. ตอนติดตั้งให้เลือก `Add python.exe to PATH`
4. ตรวจสอบ:

```powershell
python --version
```

ถ้าไม่พบคำสั่ง `python` ให้ลอง:

```powershell
py --version
```

### 3. ติดตั้ง Git

1. เปิด <https://git-scm.com/download/win>
2. ดาวน์โหลดและติดตั้ง
3. ตรวจสอบ:

```powershell
git --version
```

### 4. Clone หรือเปิด project

ถ้า clone จาก GitHub:

```powershell
cd "C:\Projects"
git clone https://github.com/pruksacharttk/Smart-AI-App
cd "Smart-AI-App"
```

ถ้ามีโฟลเดอร์อยู่แล้ว:

```powershell
cd "C:\Projects\Smart AI App"
```

### 5. ติดตั้ง npm dependencies

```powershell
npm install
```

### 6. รันระบบ

```powershell
npm start
```

เปิด browser:

```text
http://localhost:4173
```

ถ้า port 4173 ถูกใช้แล้ว:

```powershell
$env:PORT=4174
npm start
```

แล้วเปิด:

```text
http://localhost:4174
```

## วิธีติดตั้งบน macOS

### 1. ติดตั้ง Homebrew

เปิด <https://brew.sh/> แล้วทำตามคำสั่งติดตั้ง

ตรวจสอบ:

```bash
brew --version
```

### 2. ติดตั้ง Node.js

```bash
brew install node
node --version
npm --version
```

ถ้า Node ต่ำกว่า 20 ให้ใช้ `nvm`:

```bash
brew install nvm
mkdir -p ~/.nvm
```

ทำตามคำแนะนำของ Homebrew เพื่อเพิ่ม nvm ใน shell profile แล้วติดตั้ง:

```bash
nvm install 20
nvm use 20
```

### 3. ติดตั้ง Python

```bash
brew install python
python3 --version
```

### 4. ติดตั้ง Git

ตรวจสอบ:

```bash
git --version
```

ถ้ายังไม่มี:

```bash
brew install git
```

### 5. Clone หรือเปิด project

```bash
cd ~/Projects
git clone https://github.com/pruksacharttk/Smart-AI-App
cd Smart-AI-App
```

หรือ:

```bash
cd "/path/to/Smart AI App"
```

### 6. ติดตั้ง dependencies

```bash
npm install
```

### 7. รันระบบ

```bash
npm start
```

เปิด:

```text
http://localhost:4173
```

ถ้าต้องเปลี่ยน port:

```bash
PORT=4174 npm start
```

## วิธีรันระบบ

รันแบบปกติ:

```bash
npm start
```

รันแบบ development:

```bash
npm run dev
```

ตัวแปร environment ที่รองรับ:

```text
PORT=4173
LLM_TIMEOUT_MS=35000
```

- `PORT`: port ของ server
- `LLM_TIMEOUT_MS`: timeout ต่อ model fallback หน่วย millisecond

## การตั้งค่า OpenRouter แบบละเอียด

OpenRouter ใช้สำหรับเรียก LLM หลายค่ายผ่าน API รูปแบบเดียวกัน เหมาะสำหรับ skill แบบ LLM-only หรือใช้เป็น fallback หลัก

### 1. สมัครหรือเข้าสู่ระบบ

1. เปิด <https://openrouter.ai/>
2. กด Sign In หรือ Sign Up
3. เข้าสู่ระบบด้วยบัญชีที่ต้องการ

### 2. สร้าง API key

1. เปิด <https://openrouter.ai/settings/keys>
2. กด `Create Key`
3. ตั้งชื่อ key เช่น `Smart AI App Local`
4. สร้าง key
5. copy key ทันที เพราะบางระบบอาจแสดง key เต็มเพียงครั้งเดียว

### 3. ใส่ key ในระบบ

1. เปิด Smart AI App ที่ `http://localhost:4173`
2. กดปุ่ม `ตั้งค่า`
3. ไปที่กล่อง `OpenRouter`
4. วาง API key ในช่อง `API Key`
5. ตรวจสอบ `Base URL`

```text
https://openrouter.ai/api/v1
```

### 4. เลือก model

ในส่วน `Fallback order`:

1. เลือก Provider เป็น `OpenRouter`
2. เลือก Model จาก dropdown
3. ถ้าต้องการใช้ model ที่ไม่มีใน dropdown ให้เลือก `Custom model`
4. ใส่ model id ในช่อง `Custom model`

ตัวอย่าง OpenRouter model id:

```text
openrouter/free
nvidia/nemotron-3-super-120b-a12b:free
openai/gpt-oss-120b:free
deepseek/deepseek-v4-flash
```

หมายเหตุ:

- model ที่ลงท้าย `:free` มักเป็น free model
- model แบบ paid ต้องมี credit หรือ billing ในบัญชี OpenRouter
- รายชื่อ model เปลี่ยนได้ ควรใช้ `Test LLM` ตรวจสอบเสมอ

### 5. Test LLM

1. กด `Test LLM`
2. ดูผลแต่ละ row:
   - `OK`: ใช้ได้
   - `FAIL`: ใช้ไม่ได้
   - `SKIP`: ข้อมูลไม่ครบ
3. ถ้า row ไหน OK ให้ย้ายขึ้นลำดับ 1
4. กด `Save Config`

### 6. Error ที่พบบ่อย

- `HTTP 401`: key ผิดหรือหมดอายุ
- `HTTP 403`: บัญชีไม่มีสิทธิ์ใช้ model
- `HTTP 404`: model id ไม่ถูกต้อง
- `Timed out`: model ช้าหรือ provider ไม่ตอบ
- `LLM returned empty content`: model ตอบกลับว่าง

## การตั้งค่า NVIDIA NIM แบบละเอียด

NVIDIA NIM ให้บริการ model ผ่าน OpenAI-compatible API endpoint เหมาะสำหรับใช้เป็น provider หรือ fallback

### 1. สมัครหรือเข้าสู่ระบบ NVIDIA

1. เปิด <https://build.nvidia.com/>
2. Sign in ด้วยบัญชี NVIDIA
3. ถ้ายังไม่มีบัญชี ให้สมัครก่อน

### 2. สร้าง API key

1. เปิด <https://build.nvidia.com/settings/api-keys>
2. กดสร้าง API key
3. copy key เก็บไว้ทันที

### 3. ใส่ key ในระบบ

1. เปิด Smart AI App
2. กด `ตั้งค่า`
3. ไปที่กล่อง `NVIDIA NIM`
4. วาง key ในช่อง `API Key`
5. ตรวจสอบ `Base URL`

```text
https://integrate.api.nvidia.com/v1
```

### 4. เลือก model

ใน fallback row:

1. เลือก Provider เป็น `NVIDIA`
2. เลือก model จาก dropdown
3. หรือเลือก `Custom model` แล้วใส่ model id เอง

ตัวอย่าง NVIDIA model id:

```text
deepseek-ai/deepseek-v4-flash
openai/gpt-oss-120b
openai/gpt-oss-20b
deepseek-ai/deepseek-r1
```

ข้อควรระวัง:

- model id ของ NVIDIA และ OpenRouter อาจไม่เหมือนกัน
- เช่น NVIDIA ใช้ `deepseek-ai/deepseek-v4-flash`
- แต่ OpenRouter ใช้ `deepseek/deepseek-v4-flash`
- ถ้า model id ผิดจะเจอ `HTTP 404`

### 5. Test NVIDIA

1. กด `Test LLM`
2. ตรวจ row ของ NVIDIA
3. ถ้า OK สามารถใช้เป็น fallback ลำดับ 1 ได้
4. ถ้า FAIL ให้ลอง model อื่น หรือใช้ OpenRouter เป็น fallback แรก

## วิธีใช้งานผ่าน Browser

1. เปิด `http://localhost:4173`
2. เลือก skill จาก dropdown
3. เลือกภาษา UI ด้วย `EN` หรือ `TH`
4. กรอก field ที่มีเครื่องหมาย `*`
5. ถ้ามี field ภาพอ้างอิง ให้ลากภาพมาวางหรือกด upload ภาพ ระบบจะส่งเป็น base64 ไม่ใช้ URL ภายนอก
6. ตั้งค่า API key ใน `Config`
7. กด `Test LLM`
8. จัด fallback model ให้ row ที่ OK อยู่ด้านบน
9. กด `Save Config`
10. กด `Run Skill`
11. ดูสถานะ LLM ว่ากำลังเรียก provider/model ไหน และตัวไหนสำเร็จล่าสุด
12. ดูผลที่ tab:
    - `Prompt`: ผลลัพธ์หลัก
    - `JSON`: ข้อมูลเต็ม
    - `Review`: รายงานและคำเตือน
13. กด `Copy` หรือ `Download JSON`

## การเพิ่ม Skill ใหม่

เพิ่มโฟลเดอร์ใหม่ใน:

```text
skills/
```

ตัวอย่าง:

```text
skills/my-new-skill/
```

โครงสร้างขั้นต่ำ:

```text
skills/my-new-skill/
  skill.md
  schemas/
    input.schema.json
```

โครงสร้างที่แนะนำ:

```text
skills/my-new-skill/
  skill.md
  schemas/
    input.schema.json
    ui.schema.json
    output.schema.json
  python/
    skill.py
  prompts/
    system.prompt.md
  knowledge/
    notes.md
```

### input.schema.json

จำเป็นต้องมีทุก skill ระบบจะ scan เฉพาะ skill ที่มีไฟล์นี้

ควรมี:

- `type: "object"`
- `properties`
- `required` ถ้ามี field บังคับ
- `default`
- `enum` สำหรับตัวเลือก

### ui.schema.json

ใช้จัดหน้าฟอร์ม เช่น section, label, description, ภาษาไทย/อังกฤษ

ถ้าไม่มีหรือไม่ครบ ระบบจะเติม field จาก `input.schema.json` ให้ใน section เพิ่มเติม

### output.schema.json

ใช้บอกว่า output ควรมีโครงสร้างแบบใด

### python/skill.py

ถ้ามีไฟล์นี้ ระบบจะรัน skill แบบ local Python ได้

รูปแบบที่ควรทำ:

1. อ่าน JSON จาก stdin
2. รับข้อมูลในรูป:

```json
{
  "params": {
    "topic": "example"
  }
}
```

3. print JSON ออก stdout

ตัวอย่าง:

```json
{
  "success": true,
  "output": {
    "prompt": "Final prompt text"
  },
  "warnings": []
}
```

## การแก้ไข Skill

1. เปิดโฟลเดอร์ skill ใน `skills/<skill-id>/`
2. แก้ `skill.md` เพื่อเปลี่ยน behavior
3. แก้ `schemas/input.schema.json` เมื่อเพิ่มหรือลด input
4. แก้ `schemas/ui.schema.json` เพื่อเปลี่ยนหน้าฟอร์ม
5. แก้ `schemas/output.schema.json` เพื่อเปลี่ยนรูปแบบผลลัพธ์
6. ถ้ามี local runtime ให้แก้ `python/skill.py`
7. refresh browser
8. ทดลอง Run และดู tab JSON/Review

## Rate Limit

ระบบมี rate limit แบบ in-memory:

```text
/api/run-skill = 12 ครั้งต่อนาที
/api/run-skill-stream = 12 ครั้งต่อนาที
/api/test-llm = 8 ครั้งต่อนาที
```

ถ้าเกินจะขึ้น:

```text
Rate limit exceeded. Try again in ...s.
```

## Troubleshooting

### npm error: No workspaces found

โปรเจกต์มี `.npmrc`:

```text
workspaces=false
```

ให้รันจากโฟลเดอร์ project:

```powershell
cd "C:\Projects\Smart AI App"
npm install
npm start
```

### เปิด localhost ไม่ได้

ตรวจว่า server รันอยู่:

```bash
npm start
```

เปิด:

```text
http://localhost:4173
```

### Skill ไม่ขึ้นใน dropdown

ตรวจว่า skill มีไฟล์:

```text
skills/<skill-id>/schemas/input.schema.json
```

และ JSON ต้องถูกต้อง

### ภาษาไทยเพี้ยน

ตรวจว่าไฟล์ถูก save เป็น UTF-8

### LLM ใช้ไม่ได้

ใช้ `Config > Test LLM` แล้วดูผล:

- `401`: key ผิด
- `403`: ไม่มีสิทธิ์ใช้ model
- `404`: model id/base URL ผิด
- timeout: provider หรือ model ช้า
- empty content: model ตอบกลับว่าง

