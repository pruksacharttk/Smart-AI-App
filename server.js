import { createServer } from "node:http";
import { readdir, readFile } from "node:fs/promises";
import { existsSync } from "node:fs";
import { extname, join, normalize } from "node:path";
import { spawn } from "node:child_process";
import { fileURLToPath } from "node:url";

const __dirname = fileURLToPath(new URL(".", import.meta.url));
const publicDir = join(__dirname, "public");
const skillsDir = join(__dirname, "skills");
const defaultSkillId = "gpt-image-prompt-engineer";
const port = Number(process.env.PORT || 4173);
const llmRequestTimeoutMs = Number(process.env.LLM_TIMEOUT_MS || 35000);
const rateBuckets = new Map();
const rateLimits = {
  "/api/run-skill": { limit: 12, windowMs: 60_000 },
  "/api/run-skill-stream": { limit: 12, windowMs: 60_000 },
  "/api/test-llm": { limit: 8, windowMs: 60_000 }
};

const mimeTypes = {
  ".html": "text/html; charset=utf-8",
  ".json": "application/json; charset=utf-8"
};

function sendJson(res, status, body) {
  res.writeHead(status, { "content-type": "application/json; charset=utf-8" });
  res.end(JSON.stringify(body));
}

function sendSse(res, event, data) {
  res.write(`event: ${event}\n`);
  res.write(`data: ${JSON.stringify(data)}\n\n`);
}

function clientIp(req) {
  return String(req.headers["x-forwarded-for"] || req.socket.remoteAddress || "local").split(",")[0].trim();
}

function checkRateLimit(req, res) {
  const rule = rateLimits[new URL(req.url, `http://${req.headers.host}`).pathname];
  if (!rule) return true;
  const now = Date.now();
  const key = `${clientIp(req)}:${req.url}`;
  const bucket = rateBuckets.get(key) || { count: 0, resetAt: now + rule.windowMs };
  if (now > bucket.resetAt) {
    bucket.count = 0;
    bucket.resetAt = now + rule.windowMs;
  }
  bucket.count += 1;
  rateBuckets.set(key, bucket);
  if (bucket.count > rule.limit) {
    const retryAfter = Math.ceil((bucket.resetAt - now) / 1000);
    res.writeHead(429, {
      "content-type": "application/json; charset=utf-8",
      "retry-after": String(retryAfter)
    });
    res.end(JSON.stringify({ error: `Rate limit exceeded. Try again in ${retryAfter}s.`, retryAfter }));
    return false;
  }
  return true;
}

async function readJson(req) {
  const chunks = [];
  for await (const chunk of req) chunks.push(chunk);
  const raw = Buffer.concat(chunks).toString("utf8");
  if (!raw) return {};
  return JSON.parse(raw);
}

function safeSkillId(skillId) {
  const id = String(skillId || defaultSkillId);
  if (!/^[a-zA-Z0-9_-]+$/.test(id)) return defaultSkillId;
  return id;
}

function skillPaths(skillId) {
  const id = safeSkillId(skillId);
  const root = join(skillsDir, id);
  return {
    id,
    root,
    entrypoint: join(root, "python", "skill.py"),
    inputSchema: join(root, "schemas", "input.schema.json"),
    uiSchema: join(root, "schemas", "ui.schema.json"),
    skillMdUpper: join(root, "SKILL.md"),
    skillMdLower: join(root, "skill.md")
  };
}

async function readJsonFile(path, fallback = null) {
  try {
    return JSON.parse(await readFile(path, "utf8"));
  } catch {
    return fallback;
  }
}

function cleanMarkdown(markdown) {
  return String(markdown || "")
    .replace(/```[\s\S]*?```/g, "[code block omitted]")
    .slice(0, 12000);
}

async function readSkillInfo(skillId) {
  const paths = skillPaths(skillId);
  const [inputSchema, uiSchema] = await Promise.all([
    readJsonFile(paths.inputSchema),
    readJsonFile(paths.uiSchema, {})
  ]);
  if (!inputSchema) return null;
  const skillMdPath = existsSync(paths.skillMdUpper) ? paths.skillMdUpper : paths.skillMdLower;
  let markdown = "";
  try {
    markdown = await readFile(skillMdPath, "utf8");
  } catch {}
  const nameMatch = markdown.match(/^name:\s*(.+)$/m);
  const descMatch = markdown.match(/^description:\s*(.+)$/m);
  return {
    id: paths.id,
    title: uiSchema.title || nameMatch?.[1] || paths.id,
    titleTh: uiSchema.titleTh || uiSchema.title || nameMatch?.[1] || paths.id,
    description: uiSchema.description || descMatch?.[1] || "",
    descriptionTh: uiSchema.descriptionTh || uiSchema.description || descMatch?.[1] || "",
    hasRuntime: existsSync(paths.entrypoint),
    markdown: cleanMarkdown(markdown),
    inputSchema,
    uiSchema
  };
}

function fallbackTargets(llmConfig) {
  const providers = llmConfig?.providers && typeof llmConfig.providers === "object" ? llmConfig.providers : {};
  const fallback = Array.isArray(llmConfig?.fallback) ? llmConfig.fallback : [];
  return fallback
    .slice(0, 4)
    .map((item, index) => {
      const provider = String(item?.provider || "").toLowerCase();
      const providerConfig = providers[provider] || {};
      const model = item?.model === "__custom__" ? item?.customModel : item?.model;
      return {
        index: index + 1,
        provider,
        model: String(model || "").trim(),
        apiKey: String(providerConfig.apiKey || "").trim(),
        baseUrl: String(providerConfig.baseUrl || "").trim()
      };
    });
}

function configuredFallbacks(llmConfig) {
  return fallbackTargets(llmConfig).filter((item) => item.provider && item.model && item.apiKey && item.baseUrl);
}

function targetLanguageName(params) {
  const raw = String(params?.target_language || params?.language || params?.output_language || "").toLowerCase();
  if (["th", "thai", "ไทย"].includes(raw)) return "Thai";
  if (["en", "english", "อังกฤษ"].includes(raw)) return "English";
  return raw || "the language requested by the user";
}

function isImagePayload(value) {
  return value && typeof value === "object" && typeof value.dataUrl === "string" && value.dataUrl.startsWith("data:image/");
}

function collectImages(value, path = []) {
  const images = [];
  if (isImagePayload(value)) {
    images.push({ ...value, path:path.join(".") });
  } else if (Array.isArray(value)) {
    value.forEach((item, index) => images.push(...collectImages(item, [...path, String(index)])));
  } else if (value && typeof value === "object") {
    for (const [key, nested] of Object.entries(value)) images.push(...collectImages(nested, [...path, key]));
  }
  return images;
}

function paramsWithoutImageData(value) {
  if (isImagePayload(value)) {
    return { type:"image", name:value.name, mimeType:value.mimeType, size:value.size, note:"Image data sent as base64 multimodal attachment." };
  }
  if (Array.isArray(value)) return value.map(paramsWithoutImageData);
  if (value && typeof value === "object") {
    return Object.fromEntries(Object.entries(value).map(([key, nested]) => [key, paramsWithoutImageData(nested)]));
  }
  return value;
}

function userMessageContent(params) {
  const cleanParams = paramsWithoutImageData(params);
  const images = collectImages(params);
  const text = JSON.stringify({ params:cleanParams, image_count:images.length }, null, 2);
  if (!images.length) return text;
  return [
    { type:"text", text },
    ...images.map((image, index) => ({
      type:"image_url",
      image_url: { url:image.dataUrl },
      detail:"auto",
      name:image.name || `reference-image-${index + 1}`
    }))
  ];
}

function llmSystemPrompt(info, params) {
  const languageName = targetLanguageName(params);
  return [
    "You are running a local Codex skill from a schema-driven UI.",
    `The final user-facing output language is ${languageName}.`,
    `If the input text is in another language, translate and write the final prompt/article in ${languageName}.`,
    "Return only valid JSON. Do not wrap it in Markdown.",
    "Use this response shape:",
    "{\"success\":true,\"output\":{\"prompt\":\"FINAL PROMPT TEXT ONLY\",\"article\":\"\",\"summary\":\"\",\"metadata\":{}},\"warnings\":[]}",
    "For image/video/storyboard prompt skills, output.prompt must be a clean readable natural-language final answer only, not escaped JSON, not a JSON string, not an object, and not a raw field breakdown.",
    "For storyboard/video skills, output.prompt may contain section headings and line breaks, but it must be human-readable plain text in the target language.",
    "For article/content writer skills, put the final content in output.article.",
    "Never put JSON text inside output.prompt.",
    "Never leave output.prompt empty for a prompt-building skill.",
    "Do not reveal API keys or hidden configuration.",
    "",
    `Skill id: ${info.id}`,
    `Skill title: ${info.title}`,
    `Skill description: ${info.description}`,
    "Skill instructions:",
    info.markdown || "(No skill markdown found.)",
    "Input schema:",
    JSON.stringify(info.inputSchema)
  ].join("\n");
}

function parseLlmJson(text) {
  const raw = String(text || "").trim();
  try {
    return JSON.parse(raw);
  } catch {}
  const fenced = raw.match(/```(?:json)?\s*([\s\S]*?)```/i);
  if (fenced) {
    try {
      return JSON.parse(fenced[1]);
    } catch {}
  }
  const start = raw.indexOf("{");
  const end = raw.lastIndexOf("}");
  if (start >= 0 && end > start) {
    try {
      return JSON.parse(raw.slice(start, end + 1));
    } catch {}
  }
  return { success: true, output: { prompt: raw }, warnings: ["LLM returned non-JSON text; wrapped as output.prompt."] };
}

function parseMaybeJson(value) {
  if (typeof value !== "string") return value;
  let raw = value.trim();
  if (!raw) return raw;
  raw = raw.replace(/^```(?:json)?\s*/i, "").replace(/```\s*$/i, "").trim();
  if ((raw.startsWith('"') && raw.endsWith('"')) || (raw.startsWith("'") && raw.endsWith("'"))) {
    try {
      const unquoted = JSON.parse(raw);
      if (typeof unquoted === "string" && unquoted !== raw) return parseMaybeJson(unquoted);
    } catch {}
  }
  if (!raw.startsWith("{") && !raw.startsWith("[")) return raw;
  try {
    return JSON.parse(raw);
  } catch {
    return value;
  }
}

function decodeEscapedText(value) {
  let text = String(value ?? "");
  for (let i = 0; i < 2; i += 1) {
    const looksEscaped = /\\[nrt"]/.test(text);
    if (!looksEscaped) break;
    text = text
      .replace(/\\r\\n/g, "\n")
      .replace(/\\n/g, "\n")
      .replace(/\\r/g, "\n")
      .replace(/\\t/g, "\t")
      .replace(/\\"/g, '"')
      .replace(/\\\\/g, "\\");
  }
  return text.trim();
}

function cleanPromptText(value, info) {
  let text = decodeEscapedText(value);
  const nested = parseMaybeJson(text);
  if (nested && typeof nested === "object") {
    text = textFromNestedPayload(nested) || text;
  }
  text = decodeEscapedText(text);
  text = text
    .replace(/^\s*["']?-\s*Input Check:\s*/i, "")
    .replace(/^\s*Input Check:\s*/i, "")
    .replace(/^\s*userIdea:\s*/im, "แนวคิด: ")
    .replace(/^\s*dialogueLanguage:\s*.*$/gim, "")
    .replace(/^\s*style:\s*.*$/gim, "")
    .replace(/^\s*User Order:\s*/gim, "")
    .replace(/^\s*REFERENCE NOTES:\s*/gim, "ข้อมูลอ้างอิง:")
    .replace(/^\s*FULL STORYBOARD\s*\(.*?\):\s*/gim, "Storyboard:")
    .replace(/^\s*VIDEO PROMPTS:\s*/gim, "Video Prompts:")
    .replace(/\\+"/g, '"')
    .replace(/[ \t]+\n/g, "\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
  const isVideoSkill = /video|storyboard|seedance/i.test(`${info.id} ${info.title} ${info.description}`);
  if (isVideoSkill) {
    text = text
      .replace(/\bScene\s+(\d+)\s*:/gi, "\nฉากที่ $1:")
      .replace(/\bSpeaker:\s*/gi, "ผู้พูด: ")
      .replace(/\bDialogue:\s*/gi, "บทพูด: ")
      .replace(/\bAction:\s*/gi, "แอ็กชัน: ")
      .replace(/\bCamera:\s*/gi, "กล้อง: ")
      .replace(/\bLighting:\s*/gi, "แสง: ")
      .replace(/\bBackground:\s*/gi, "ฉากหลัง: ")
      .replace(/\n{3,}/g, "\n\n")
      .trim();
  }
  return text;
}

function isBadStoryboardPrompt(text, params) {
  const raw = String(text || "");
  const wantsThai = targetLanguageName(params) === "Thai";
  const englishMarkers = [
    "The character speaks the following English dialogue",
    "A high-quality Realistic clip",
    "Input Check:",
    "User Order:",
    "{\"success\""
  ];
  return englishMarkers.some((marker) => raw.includes(marker)) || (wantsThai && /\bSpeaker:|\bDialogue:|\bAction:|\bScene\s+\d+/.test(raw));
}

function renderStoryboardPrompt(params) {
  const idea = String(params.userIdea || params.topic || "คลิปสั้น").trim();
  const language = String(params.dialogueLanguage || params.target_language || params.language || "th").toLowerCase();
  const thai = language !== "en";
  const style = String(params.style || "Realistic").trim();
  const duration = Number(params.targetDurationSeconds || 64);
  const sceneCount = Math.max(3, Math.min(12, Number(params.sceneCount || 8)));
  const aspectRatio = String(params.aspectRatio || params.aspect_ratio || "9:16");
  const platform = String(params.platform || "TikTok");
  const tone = String(params.tone || "funny");
  const strategy = String(params.viralStrategy || "Pattern Interrupt");
  const background = String(params.backgroundMode || "normal") === "green_screen" ? "พื้นหลัง green screen แบบ chroma key" : "ฉากจริงที่สอดคล้องกับเรื่อง";
  const setting = String(params.setting || "ทางเดินในสวนหรือพื้นที่กลางแจ้งที่ดูเป็นธรรมชาติ").trim();
  const continuity = String(params.continuityNotes || "เด็กคนเดิมและหมาตัวเดิม เสื้อผ้า สีขน ท่าทาง และบรรยากาศต้องคงที่ทุกฉาก").trim();
  const reference = String(params.referenceNotes || continuity).trim();
  const perScene = Math.max(4, Math.round((duration / sceneCount) * 10) / 10);
  const speechBudget = Math.round(perScene * 0.65 * 10) / 10;
  const child = thai ? "เด็ก" : "Child";
  const dog = thai ? "หมา" : "Dog";
  const sceneIdeasTh = [
    ["Hook", `${child}หันมาเห็น${dog}เดินวนเหมือนกำลังมีความลับ`, `นี่แกซ้อมเดินแบบอยู่เหรอ?`, `${dog}หยุด หันมามอง แล้วกระดิกหางแรง ๆ`],
    ["Setup", `${child}เดินคุยกับ${dog}ระหว่างทาง บรรยากาศดูเล่น ๆ`, `วันนี้แกดูจริงจังผิดปกตินะ`, `${dog}เดินนำหน้าเหมือนเป็นไกด์ส่วนตัว`],
    ["Joke Intro", `${dog}หยุดดมพื้น แล้วทำท่าคิดหนัก`, `เจอหลักฐานอะไรอีกล่ะนักสืบ?`, `${child}ก้มดูด้วยสีหน้าสงสัย`],
    ["Punchline 1", `${dog}รีบเดินหนีทันทีเหมือนกลัวโดนจับได้`, `อ้าว หนีเฉย แปลว่ารู้เรื่องใช่ไหม`, `${child}หัวเราะแล้วเดินตาม`],
    ["Reaction", `${dog}หันกลับมาทำหน้าซื่อ`, `อย่ามาทำหน้าไม่รู้เรื่อง`, `${dog}เอียงคอแบบน่ารัก`],
    ["Twist", `${child}หยุดแล้วชี้ไปด้านหน้า`, `เดี๋ยวนะ หรือแกพาฉันมาเดินเล่น?`, `${dog}กระโดดดีใจเหมือนแผนสำเร็จ`],
    ["Payoff", `${child}ยอมเดินต่อแบบขำ ๆ`, `โอเค ชนะก็ได้ เดินต่ออีกนิด`, `${dog}เดินนำอย่างภูมิใจ`],
    ["Close", `${child}กับ${dog}เดินออกไปด้วยกัน`, `ใครมีหมาเจ้าแผนการแบบนี้บ้าง?`, `ทั้งคู่เดินห่างออกไปในแสงเย็น`]
  ];
  const sceneIdeasEn = [
    ["Hook", `${child} notices ${dog} walking in circles like it has a secret`, "Are you practicing a runway walk?", `${dog} stops, looks back, and wags its tail`],
    ["Setup", `${child} talks to ${dog} while walking`, "You look suspiciously serious today.", `${dog} leads the way like a tiny guide`],
    ["Joke Intro", `${dog} sniffs the ground and acts thoughtful`, "Found another clue, detective?", `${child} leans down curiously`],
    ["Punchline 1", `${dog} suddenly walks away like it got caught`, "You ran away. That means you know something.", `${child} laughs and follows`],
    ["Reaction", `${dog} turns back with an innocent face`, "Don't give me that innocent look.", `${dog} tilts its head sweetly`],
    ["Twist", `${child} points forward`, "Wait. Did you trick me into a walk?", `${dog} jumps happily`],
    ["Payoff", `${child} accepts the plan`, "Fine, you win. A little more walking.", `${dog} leads proudly`],
    ["Close", `${child} and ${dog} walk away together`, "Who else has a dog this clever?", "They exit together in warm light"]
  ];
  const scenes = (thai ? sceneIdeasTh : sceneIdeasEn).slice(0, sceneCount);
  const label = thai
    ? { storyboard:"STORYBOARD", prompts:"VIDEO PROMPTS", ref:"ข้อมูลต่อเนื่อง", scene:"ฉากที่", speaker:"ผู้พูด", dialogue:"บทพูด", action:"แอ็กชัน", prompt:"พรอมต์วิดีโอ", camera:"กล้อง", lighting:"แสง", bg:"ฉากหลัง", budget:"งบเวลาบทพูด" }
    : { storyboard:"STORYBOARD", prompts:"VIDEO PROMPTS", ref:"Continuity Notes", scene:"Scene", speaker:"Speaker", dialogue:"Dialogue", action:"Action", prompt:"Video Prompt", camera:"Camera", lighting:"Lighting", bg:"Background", budget:"Dialogue Budget" };
  const header = thai
    ? `แนวคิด: ${idea}\nรูปแบบ: ${style}, ${aspectRatio}, ${platform}, โทน ${tone}, กลยุทธ์ ${strategy}\n${label.ref}: ${reference}\nข้อกำหนดต่อเนื่อง: ${continuity}`
    : `Idea: ${idea}\nFormat: ${style}, ${aspectRatio}, ${platform}, ${tone} tone, ${strategy}\n${label.ref}: ${reference}\nContinuity: ${continuity}`;
  const storyboard = scenes.map(([beat, action, dialogue, reaction], index) => `${label.scene} ${index + 1} (${beat})\n- ${label.speaker}: ${index % 2 === 1 ? dog : child}\n- ${label.dialogue}: "${dialogue}"\n- ${label.action}: ${action}. ${reaction}\n- ${label.budget}: ~${speechBudget} ${thai ? "วินาที" : "seconds"} max`).join("\n\n");
  const prompts = scenes.map(([beat, action, dialogue, reaction], index) => `${label.scene} ${index + 1} ${label.prompt}\n${thai ? `คลิป ${style} คุณภาพสูง ความยาวประมาณ ${perScene} วินาที ในอัตราส่วน ${aspectRatio}. ${action}. ตัวละครพูดภาษาไทยอย่างเป็นธรรมชาติและลิปซิงก์ตรงว่า "${dialogue}". สีหน้าและอารมณ์สดใส ตลก เป็นธรรมชาติ. ${reaction}. ${label.camera}: มุมกล้องระดับสายตา เคลื่อนตามตัวละครอย่างนุ่มนวล. ${label.lighting}: แสงธรรมชาติ นุ่ม สบายตา. ${label.bg}: ${background}, ${setting}. ห้ามมีซับไตเติล ห้ามมีตัวหนังสือบนจอ ห้ามมีผู้บรรยาย ใช้เสียงตัวละครเท่านั้น.` : `High-quality ${style} clip, about ${perScene} seconds, ${aspectRatio}. ${action}. Natural lip-synced dialogue: "${dialogue}". Playful expression and clear character continuity. ${reaction}. Camera: eye-level soft tracking. Lighting: natural soft daylight. Background: ${background}, ${setting}. No subtitles, no on-screen text, no narrator, character voice only.`}`).join("\n\n");
  return `${header}\n\n${label.storyboard}\n${storyboard}\n\n${label.prompts}\n${prompts}`;
}

function textFromNestedPayload(value) {
  const parsed = parseMaybeJson(value);
  if (typeof parsed === "string") return decodeEscapedText(parsed);
  if (!parsed || typeof parsed !== "object") return "";
  const output = parsed.output && typeof parsed.output === "object" ? parsed.output : parsed;
  const direct = output.prompt || output.final_prompt || output.video_prompt || output.article || output.storyboard || output.script || output.summary;
  if (typeof direct === "string" && direct.trim()) return decodeEscapedText(direct);
  if (Array.isArray(output.scenes)) {
    return output.scenes.map((scene, index) => {
      if (typeof scene === "string") return `Scene ${index + 1}: ${scene}`;
      if (!scene || typeof scene !== "object") return "";
      const title = scene.title || scene.scene || scene.shot_id || `Scene ${index + 1}`;
      const body = [scene.prompt, scene.description, scene.action, scene.dialogue, scene.camera]
        .filter((item) => typeof item === "string" && item.trim())
        .join(" ");
      return `${title}: ${body}`.trim();
    }).filter(Boolean).join("\n");
  }
  if (Array.isArray(output.video_prompts)) return output.video_prompts.map(decodeEscapedText).join("\n\n");
  if (Array.isArray(output.prompts)) return output.prompts.map(decodeEscapedText).join("\n\n");
  return "";
}

function normalizeLlmResult(parsed, info) {
  const result = parsed && typeof parsed === "object" ? parsed : {};
  const output = result.output && typeof result.output === "object" ? result.output : {};
  let prompt = output.prompt ?? output.prompts?.detailed ?? output.prompts?.structured ?? output.prompts?.short ?? result.prompt;
  if (prompt && typeof prompt === "object") {
    prompt = textFromNestedPayload(prompt) || prompt.prompt || prompt.detailed || prompt.structured || prompt.short || JSON.stringify(prompt);
  }
  prompt = cleanPromptText(textFromNestedPayload(prompt) || prompt, info);
  const article = output.article ?? result.article ?? "";
  const isPromptSkill = /prompt|image|video|seedance/i.test(`${info.id} ${info.title} ${info.description}`);
  if (isPromptSkill && (!prompt || !String(prompt).trim()) && article) prompt = article;
  return {
    ...result,
    output: {
      ...output,
      prompt: prompt === undefined || prompt === null ? "" : String(prompt).trim(),
      article: article === undefined || article === null ? "" : String(article).trim()
    }
  };
}

async function postChatCompletion(target, info, params) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), llmRequestTimeoutMs);
  const endpoint = `${target.baseUrl.replace(/\/+$/, "")}/chat/completions`;
  try {
    const response = await fetch(endpoint, {
      method: "POST",
      signal: controller.signal,
      headers: {
        "content-type": "application/json",
        "authorization": `Bearer ${target.apiKey}`,
        ...(target.provider === "openrouter" ? {
          "HTTP-Referer": "http://localhost",
          "X-Title": "Smart Skill Runner"
        } : {})
      },
      body: JSON.stringify({
        model: target.model,
        messages: [
          { role: "system", content: llmSystemPrompt(info, params) },
          { role: "user", content: userMessageContent(params) }
        ],
        temperature: 0.4,
        max_tokens: 2500,
        stream: false
      })
    });
    const payload = await response.json().catch(() => ({}));
    if (!response.ok) {
      throw new Error(payload.error?.message || payload.message || `HTTP ${response.status}`);
    }
    const text = payload.choices?.[0]?.message?.content || "";
    if (!String(text).trim()) {
      const finishReason = payload.choices?.[0]?.finish_reason;
      throw new Error(`LLM returned empty content${finishReason ? ` (finish_reason: ${finishReason})` : ""}`);
    }
    const parsed = normalizeLlmResult(parseLlmJson(text), info);
    if (info.id === "video-storyboard-to-prompts" && isBadStoryboardPrompt(parsed.output?.prompt, params)) {
      parsed.output.prompt = renderStoryboardPrompt(params);
      parsed.warnings = [...(parsed.warnings || []), "LLM output was reformatted by the video storyboard adapter."];
    }
    const output = parsed.output && typeof parsed.output === "object" ? parsed.output : {};
    const hasUsefulOutput = [output.prompt, output.article, output.summary, output.text, output.prompts?.detailed, output.prompts?.structured, output.prompts?.short, parsed.prompt, parsed.article]
      .some((value) => typeof value === "string" && value.trim());
    if (!hasUsefulOutput) {
      throw new Error("LLM response did not contain usable prompt/article text");
    }
    return {
      ...parsed,
      success: parsed.success !== false,
      llm: {
        provider: target.provider,
        model: payload.model || target.model,
        fallbackRank: target.index
      }
    };
  } catch (error) {
    if (error.name === "AbortError") {
      throw new Error(`Timed out after ${Math.round(llmRequestTimeoutMs / 1000)}s`);
    }
    throw error;
  } finally {
    clearTimeout(timer);
  }
}

async function testChatCompletion(target) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), Math.min(llmRequestTimeoutMs, 15000));
  const endpoint = `${target.baseUrl.replace(/\/+$/, "")}/chat/completions`;
  try {
    const response = await fetch(endpoint, {
      method: "POST",
      signal: controller.signal,
      headers: {
        "content-type": "application/json",
        "authorization": `Bearer ${target.apiKey}`,
        ...(target.provider === "openrouter" ? {
          "HTTP-Referer": "http://localhost",
          "X-Title": "Smart Skill Runner"
        } : {})
      },
      body: JSON.stringify({
        model: target.model,
        messages: [
          { role: "system", content: "Reply with exactly this plain text if you are working: OK Smart Skill Runner" },
          { role: "user", content: "ping" }
        ],
        temperature: 0,
        max_tokens: 80,
        stream: false
      })
    });
    const payload = await response.json().catch(() => ({}));
    if (!response.ok) throw new Error(payload.error?.message || payload.message || `HTTP ${response.status}`);
    const text = payload.choices?.[0]?.message?.content || "";
    if (!String(text).trim()) throw new Error("LLM returned empty content");
    return {
      ok: true,
      rank: target.index,
      provider: target.provider,
      model: payload.model || target.model,
      preview: String(text).slice(0, 160)
    };
  } catch (error) {
    if (error.name === "AbortError") {
      throw new Error(`Timed out after ${Math.round(Math.min(llmRequestTimeoutMs, 15000) / 1000)}s`);
    }
    throw error;
  } finally {
    clearTimeout(timer);
  }
}

async function handleTestLlm(req, res) {
  const body = await readJson(req);
  const rows = fallbackTargets(body.llmConfig);
  const usableRows = rows.filter((target) => target.provider && target.model && target.apiKey && target.baseUrl);
  if (!usableRows.length) {
    sendJson(res, 400, {
      error: "No usable LLM config found. Add an API key and at least one fallback model.",
      results: rows.map((target) => ({
        ok: false,
        skipped: true,
        rank: target.index,
        provider: target.provider || "(missing)",
        model: target.model || "(missing)",
        error: !target.apiKey ? "Missing API key for this provider" : "Missing provider, model, or base URL"
      }))
    });
    return;
  }
  const results = [];
  for (const target of rows) {
    if (!target.provider || !target.model || !target.baseUrl || !target.apiKey) {
      results.push({
        ok: false,
        skipped: true,
        rank: target.index,
        provider: target.provider || "(missing)",
        model: target.model || "(missing)",
        error: !target.apiKey ? "Missing API key for this provider" : "Missing provider, model, or base URL"
      });
      continue;
    }
    try {
      results.push(await testChatCompletion(target));
    } catch (error) {
      results.push({
        ok: false,
        rank: target.index,
        provider: target.provider,
        model: target.model,
        error: error.message || "LLM test failed"
      });
    }
  }
  sendJson(res, results.some((item) => item.ok) ? 200 : 400, { results });
}

async function runLlmSkill(info, params, llmConfig, onStatus = null) {
  const targets = configuredFallbacks(llmConfig);
  if (!targets.length) {
    throw new Error("No usable LLM config found. Open Config, add an API key, and choose at least one fallback model.");
  }
  const errors = [];
  for (const target of targets) {
    try {
      onStatus?.({ phase:"calling", rank:target.index, provider:target.provider, model:target.model });
      const result = await postChatCompletion(target, info, params);
      onStatus?.({ phase:"success", rank:target.index, provider:target.provider, model:result.llm?.model || target.model });
      return { ...result, fallbackErrors: errors, lastSuccessfulLlm:{ provider:target.provider, model:result.llm?.model || target.model, fallbackRank:target.index } };
    } catch (error) {
      onStatus?.({ phase:"failed", rank:target.index, provider:target.provider, model:target.model, error:error.message || "LLM request failed" });
      errors.push({
        rank: target.index,
        provider: target.provider,
        model: target.model,
        error: error.message || "LLM request failed"
      });
    }
  }
  const details = errors.map((item) => `${item.rank}. ${item.provider}/${item.model}: ${item.error}`).join("; ");
  throw new Error(`All configured LLM fallbacks failed. ${details}`);
}

function runPythonSkill(skillId, envelope) {
  const paths = skillPaths(skillId);
  return new Promise((resolve, reject) => {
    if (!existsSync(paths.entrypoint)) {
      reject(new Error(`Skill "${paths.id}" does not include python/skill.py runtime.`));
      return;
    }
    const child = spawn("python", [paths.entrypoint], {
      cwd: __dirname,
      env: {
        ...process.env,
        PYTHONIOENCODING: "utf-8",
        PYTHONUTF8: "1"
      },
      stdio: ["pipe", "pipe", "pipe"]
    });
    const stdout = [];
    const stderr = [];

    child.stdout.on("data", (chunk) => stdout.push(chunk));
    child.stderr.on("data", (chunk) => stderr.push(chunk));
    child.on("error", reject);
    child.on("close", (code) => {
      const out = Buffer.concat(stdout).toString("utf8").trim();
      const err = Buffer.concat(stderr).toString("utf8").trim();
      if (code !== 0) {
        reject(new Error(err || `Skill process exited with code ${code}`));
        return;
      }
      try {
        resolve(JSON.parse(out));
      } catch {
        resolve({ success: true, output: out });
      }
    });

    child.stdin.end(JSON.stringify(envelope));
  });
}

async function handleRunSkill(req, res) {
  const body = await readJson(req);
  const result = await executeRunSkill(body);
  sendJson(res, 200, result);
}

async function executeRunSkill(body, onStatus = null) {
  const skillId = safeSkillId(body.skillId || body.skill_id);
  const params = body.params && typeof body.params === "object" ? body.params : body;
  delete params.skillId;
  delete params.skill_id;
  delete params.llmConfig;
  delete params.useLlm;
  const info = await readSkillInfo(skillId);
  if (!info) {
    const error = new Error(`Skill not found or missing input schema: ${skillId}`);
    error.status = 404;
    throw error;
  }
  const required = info.inputSchema.required || [];
  const missing = required.filter((field) => params[field] === undefined || params[field] === null || params[field] === "");
  if (missing.length) {
    const error = new Error(`Missing required field(s): ${missing.join(", ")}`);
    error.status = 400;
    throw error;
  }
  const llmConfig = body.llmConfig && typeof body.llmConfig === "object" ? body.llmConfig : null;
  const hasConfiguredLlm = configuredFallbacks(llmConfig).length > 0;
  if (!hasConfiguredLlm && !info.hasRuntime) {
    const error = new Error(`Skill "${skillId}" has no local runtime. Open Config, add an OpenRouter or NVIDIA API key, and choose at least one fallback model.`);
    error.status = 400;
    throw error;
  }
  return hasConfiguredLlm
    ? await runLlmSkill(info, params, llmConfig, onStatus)
    : await runPythonSkill(skillId, { params });
}

async function handleRunSkillStream(req, res) {
  const body = await readJson(req);
  res.writeHead(200, {
    "content-type": "text/event-stream; charset=utf-8",
    "cache-control": "no-cache, no-transform",
    "connection": "keep-alive"
  });
  try {
    sendSse(res, "status", { phase:"started" });
    const result = await executeRunSkill(body, (status) => sendSse(res, "status", status));
    sendSse(res, "result", result);
  } catch (error) {
    sendSse(res, "error", { error:error.message || "Unexpected server error" });
  } finally {
    res.end();
  }
}

async function handleSkills(_req, res) {
  const entries = await readdir(skillsDir, { withFileTypes: true });
  const skills = [];
  for (const entry of entries) {
    if (!entry.isDirectory()) continue;
    const info = await readSkillInfo(entry.name);
    if (info) {
      skills.push({
        id: info.id,
        title: info.title,
        titleTh: info.titleTh,
        description: info.description,
        descriptionTh: info.descriptionTh,
        hasRuntime: info.hasRuntime
      });
    }
  }
  skills.sort((a, b) => a.title.localeCompare(b.title));
  sendJson(res, 200, { defaultSkillId, skills });
}

async function handleUiSchema(req, res) {
  const url = new URL(req.url, `http://${req.headers.host}`);
  const skillId = safeSkillId(url.searchParams.get("skill") || defaultSkillId);
  const info = await readSkillInfo(skillId);
  if (!info) {
    sendJson(res, 404, { error: `Skill not found or missing input schema: ${skillId}` });
    return;
  }
  const { inputSchema, uiSchema } = info;
  const inputFields = Object.keys(inputSchema.properties || {});
  const uiFields = new Set((uiSchema.sections || []).flatMap((section) => (section.fields || []).map((field) => field.id)));
  const mappedFields = new Set(Object.keys(uiSchema.outputMapping || {}));
  const missingUi = inputFields.filter((field) => !uiFields.has(field));
  const missingMapping = inputFields.filter((field) => !mappedFields.has(field));

  sendJson(res, 200, {
    skill: {
      id: info.id,
      title: info.title,
      titleTh: info.titleTh,
      description: info.description,
      descriptionTh: info.descriptionTh,
      hasRuntime: info.hasRuntime
    },
    inputSchema,
    uiSchema,
    coverage: {
      inputFieldCount: inputFields.length,
      uiFieldCount: uiFields.size,
      outputMappingCount: mappedFields.size,
      missingUi,
      missingMapping,
      effectiveFieldCount: new Set([...uiFields, ...missingUi]).size
    }
  });
}

async function serveStatic(req, res) {
  const url = new URL(req.url, `http://${req.headers.host}`);
  const requested = url.pathname === "/" ? "/index.html" : decodeURIComponent(url.pathname);
  const safePath = normalize(requested).replace(/^(\.\.[/\\])+/, "");
  const filePath = join(publicDir, safePath);

  if (!filePath.startsWith(publicDir)) {
    res.writeHead(403, { "content-type": "text/plain; charset=utf-8" });
    res.end("Forbidden");
    return;
  }

  try {
    const file = await readFile(filePath);
    res.writeHead(200, { "content-type": mimeTypes[extname(filePath)] || "application/octet-stream" });
    res.end(file);
  } catch {
    const fallback = await readFile(join(publicDir, "index.html"));
    res.writeHead(200, { "content-type": mimeTypes[".html"] });
    res.end(fallback);
  }
}

createServer(async (req, res) => {
  try {
    if (!checkRateLimit(req, res)) return;
    if (req.method === "POST" && req.url === "/api/run-skill") {
      await handleRunSkill(req, res);
      return;
    }
    if (req.method === "POST" && req.url === "/api/run-skill-stream") {
      await handleRunSkillStream(req, res);
      return;
    }
    if (req.method === "POST" && req.url === "/api/test-llm") {
      await handleTestLlm(req, res);
      return;
    }
    if (req.method === "GET" && req.url === "/api/skills") {
      await handleSkills(req, res);
      return;
    }
    if (req.method === "GET" && req.url.startsWith("/api/ui-schema")) {
      await handleUiSchema(req, res);
      return;
    }
    if (req.method === "GET") {
      await serveStatic(req, res);
      return;
    }
    sendJson(res, 405, { error: "Method not allowed" });
  } catch (error) {
    sendJson(res, 500, { error: error.message || "Unexpected server error" });
  }
}).listen(port, () => {
  console.log(`Single-file skill runner available at http://localhost:${port}`);
});
