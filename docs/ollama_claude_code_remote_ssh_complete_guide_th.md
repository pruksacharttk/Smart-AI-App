# คู่มือใช้งาน Ollama + Claude Code + Remote SSH แบบละเอียด

## Overview

คู่มือนี้อธิบายตั้งแต่:

- การติดตั้ง Ollama
- การรัน Local LLM
- การใช้งาน Ollama Cloud
- การใช้งานร่วมกับ Claude Code
- การใช้งานผ่าน Remote SSH
- การใช้งานร่วมกับ VS Code Remote SSH
- การตั้งค่า Environment Variables
- การจัดการ Models
- การเปิดใช้งาน GPU
- แนวทาง Security
- ตัวอย่าง Workflow จริง

เหมาะสำหรับ:

- AI Coding
- Agent Workflow
- Autonomous Coding
- Multi-Agent Systems
- Private/Offline Development
- Large Repository Development

---

# 1. Ollama คืออะไร

Ollama คือระบบสำหรับรัน Large Language Models (LLMs) ได้ทั้ง:

- Local Inference (รันบนเครื่องตัวเอง)
- Cloud Inference (รันผ่าน Ollama Cloud)

พร้อม API Layer ที่ compatible กับ:

- OpenAI style API
- Anthropic Messages API

จึงสามารถใช้งานร่วมกับ:

- Claude Code
- Claude Desktop
- Open WebUI
- Continue.dev
- VS Code AI extensions
- AI Agents
- MCP tools

ได้ทันที

---

# 2. สถาปัตยกรรมที่ควรเข้าใจก่อน

## Local Inference

```text
Laptop/PC
 ├─ Ollama
 ├─ Models
 └─ Claude Code
```

โมเดลรันบนเครื่องตัวเองทั้งหมด

ข้อดี:

- Privacy สูง
- Offline ได้
- ไม่มีค่า token
- latency ต่ำ

ข้อเสีย:

- ใช้ RAM/GPU เยอะ
- model ใหญ่ต้องใช้ VRAM สูง

---

## Cloud Inference

```text
Laptop/PC
 ├─ Claude Code
 └─ Ollama Cloud
```

Inference ทำบน cloud

ข้อดี:

- ไม่ต้องมี GPU
- ใช้ model ใหญ่ได้
- setup ง่าย

ข้อเสีย:

- มี usage limit
- ต้องใช้อินเทอร์เน็ต

---

## Remote SSH Architecture

```text
Local Notebook
    │
    │ SSH
    ▼
Remote GPU Server
 ├─ Ollama
 ├─ Models
 ├─ Claude Code
 └─ Project Repo
```

นิยมมากที่สุดสำหรับ AI coding workflow

---

# 3. ติดตั้ง Ollama

## Linux / Ubuntu

```bash
curl -fsSL https://ollama.com/install.sh | sh
```

ตรวจสอบ:

```bash
ollama --version
```

เริ่ม service:

```bash
ollama serve
```

---

## macOS

ดาวน์โหลดจาก:

https://ollama.com/download

ติดตั้งเหมือน app ปกติ

ตรวจสอบ:

```bash
ollama --version
```

---

## Windows

ดาวน์โหลด installer:

https://ollama.com/download/windows

ติดตั้งเสร็จแล้วเปิด PowerShell:

```powershell
ollama --version
```

---

# 4. การรัน Local Models

## Pull Model

ตัวอย่าง:

```bash
ollama pull gemma3
```

หรือ:

```bash
ollama pull qwen3-coder
```

---

## Run Model

```bash
ollama run gemma3
```

หรือ:

```bash
ollama run qwen3-coder
```

---

## ดู Models ที่ติดตั้ง

```bash
ollama list
```

---

## ลบ Model

```bash
ollama rm gemma3
```

---

# 5. การเลือก Model สำหรับ Coding

## Recommended Models

| Model | จุดเด่น |
|---|---|
| qwen3-coder | coding ดีมาก |
| deepseek-coder-v2 | agent workflow ดี |
| gemma3 | lightweight |
| llama3.3 | general purpose |
| glm-4.7 | reasoning ดี |

---

## ขนาด Hardware โดยประมาณ

| Model Size | RAM/VRAM |
|---|---|
| 4B | 8GB+ |
| 8B | 16GB+ |
| 14B | 24GB+ |
| 32B+ | GPU ใหญ่ |

---

# 6. ใช้งาน Claude Code ร่วมกับ Ollama

## ติดตั้ง Claude Code

ตัวอย่าง:

```bash
npm install -g @anthropic-ai/claude-code
```

---

## เชื่อม Claude Code กับ Ollama

ตั้งค่า:

```bash
export ANTHROPIC_AUTH_TOKEN=ollama
export ANTHROPIC_BASE_URL=http://localhost:11434
```

---

## Run Claude Code

```bash
claude
```

หรือระบุ model:

```bash
claude --model qwen3-coder
```

ตัวอย่าง:

```bash
claude --model gemma3
```

---

# 7. ใช้งาน Ollama Cloud

## Login

```bash
ollama signin
```

---

## ตั้งค่า API Key

```bash
export OLLAMA_API_KEY=your_api_key
```

---

## ใช้ Cloud Model

```bash
claude --model glm-4.7:cloud
```

หรือ:

```bash
claude --model qwen3-coder:cloud
```

---

# 8. ใช้งาน Claude Desktop Integration

รองรับตั้งแต่ Ollama v0.23+

## Launch Claude Desktop

```bash
ollama launch claude-desktop
```

จะเชื่อม:

- Claude Desktop
- Claude Cowork
- Claude Code
- Ollama Cloud

เข้าด้วยกัน

---

## Restore กลับค่าเดิม

```bash
ollama launch claude-desktop --restore
```

---

# 9. ใช้งานผ่าน Remote SSH

## แนวคิด

ให้:

- inference
- models
- coding agent

อยู่บน remote GPU server

ส่วน local machine ใช้แค่:

- terminal
- VS Code
- browser

---

## SSH เข้า Server

```bash
ssh user@server-ip
```

---

## ติดตั้ง Ollama บน Remote

```bash
curl -fsSL https://ollama.com/install.sh | sh
```

---

## เปิด Ollama Service

```bash
ollama serve
```

---

## Pull Models

```bash
ollama pull qwen3-coder
```

---

## Run Claude Code บน Remote

```bash
export ANTHROPIC_AUTH_TOKEN=ollama
export ANTHROPIC_BASE_URL=http://localhost:11434
```

จากนั้น:

```bash
claude --model qwen3-coder
```

---

# 10. VS Code Remote SSH Workflow

## Architecture

```text
VS Code
 └─ Remote SSH
      └─ GPU Server
           ├─ Ollama
           ├─ Claude Code
           └─ Repo
```

---

## ติดตั้ง VS Code Extension

ติดตั้ง:

- Remote - SSH

---

## Connect Server

กด:

```text
F1
Remote-SSH: Connect to Host
```

---

## เปิด Project

เมื่อเชื่อม server แล้ว:

```text
File → Open Folder
```

---

## ใช้งาน Claude Code

เปิด terminal ใน VS Code:

```bash
claude --model qwen3-coder
```

---

# 11. ใช้ Local UI แต่ Remote Ollama

## Remote Server

```bash
ollama serve
```

---

## SSH Tunnel

บน local machine:

```bash
ssh -L 11434:localhost:11434 user@server
```

---

## Local Machine

```bash
export OLLAMA_HOST=http://localhost:11434
```

จากนั้น local app จะใช้งาน remote model ได้

---

# 12. Security Best Practices

## ห้ามเปิด public ตรง ๆ

ไม่ควร:

```text
0.0.0.0:11434
```

ออก internet ตรง ๆ

---

## ควรใช้

- SSH Tunnel
- Tailscale
- VPN
- Cloudflare Tunnel

---

## Firewall

เปิดเฉพาะ internal network

ตัวอย่าง:

```bash
ufw allow from 10.0.0.0/8 to any port 11434
```

---

# 13. ตัวอย่าง Workflow จริง

## AI Coding Server

```text
GPU Server
 ├─ Ubuntu
 ├─ Ollama
 ├─ Qwen3-Coder
 ├─ Claude Code
 └─ 100GB Repo
```

Local Machine:

```text
MacBook
 └─ VS Code Remote SSH
```

---

## Agent Workflow

```text
Claude Code
 ├─ Analyze repo
 ├─ Generate code
 ├─ Run tests
 ├─ Fix bugs
 └─ Commit changes
```

---

# 14. Recommended Setup

## Beginner

```text
Laptop
 ├─ Ollama
 └─ Gemma3
```

---

## Intermediate

```text
Laptop
 ├─ Ollama
 ├─ Qwen3-Coder
 └─ Claude Code
```

---

## Advanced

```text
VS Code Remote SSH
        +
Remote GPU Server
        +
Ollama
        +
Claude Code
        +
Qwen3-Coder
```

---

# 15. Troubleshooting

## Claude connect ไม่ได้

ตรวจ:

```bash
curl http://localhost:11434/api/tags
```

---

## Port ถูกใช้แล้ว

ตรวจ:

```bash
lsof -i :11434
```

---

## GPU ไม่ทำงาน

ตรวจ:

```bash
nvidia-smi
```

---

## Model ช้ามาก

สาเหตุ:

- RAM ไม่พอ
- ไม่มี GPU
- model ใหญ่เกิน

---

# 16. สรุป

ถ้าต้องการ workflow ที่ดีที่สุดสำหรับ AI coding ปัจจุบัน:

```text
VS Code Remote SSH
        +
Remote GPU Server
        +
Ollama
        +
Claude Code
```

จะได้:

- privacy
- flexibility
- รองรับ local/cloud
- ใช้ model อะไรก็ได้
- รองรับ repo ใหญ่
- agent workflow เต็มรูปแบบ

และนี่คือเหตุผลที่หลายคนเริ่มมองว่า Ollama กำลังกลายเป็น runtime layer สำคัญของ AI development workflow ยุคใหม่

