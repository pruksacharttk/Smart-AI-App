import { createServer } from "node:http";
import { readdir, readFile } from "node:fs/promises";
import { existsSync } from "node:fs";
import { extname, join, normalize, relative } from "node:path";
import { spawn } from "node:child_process";
import { fileURLToPath } from "node:url";
import { createAppConfigStore, generateConfigEncryptionKey } from "./src/app-config-store.js";
import { encryptionKeyEnvName, ensureEnvEncryptionKey, setEnvValue } from "./src/env-config.js";
import { supportedProviderServiceIds, testProviderService } from "./src/provider-services.js";
import { createUsageStore } from "./src/usage-store.js";

ensureEnvEncryptionKey();

const __filename = fileURLToPath(import.meta.url);
const __dirname = fileURLToPath(new URL(".", import.meta.url));
const publicDir = join(__dirname, "public");
const frontendDistDir = join(__dirname, "frontend", "dist");
const skillsDir = join(__dirname, "skills");
const defaultSkillId = "gpt-image-prompt-engineer";
const preferredPort = Number(process.env.PORT || 4173);
const maxPortAttempts = Number(process.env.PORT ? 1 : 20);
const llmRequestTimeoutMs = Number(process.env.LLM_TIMEOUT_MS || 35000);
const rateBuckets = new Map();
const rateLimits = {
  "/api/run-skill": { limit: 12, windowMs: 60_000 },
  "/api/run-skill-stream": { limit: 12, windowMs: 60_000 },
  "/api/test-llm": { limit: 8, windowMs: 60_000 },
  "/api/config": { limit: 30, windowMs: 60_000 },
  "/api/config/reveal": { limit: 10, windowMs: 60_000 },
  "/api/config/rotate-key": { limit: 3, windowMs: 60_000 },
  "/api/providers": { limit: 12, windowMs: 60_000 }
};
let usageStore = null;
let usageStoreInitError = null;
let appConfigStore = null;
let appConfigStoreInitError = null;

const mimeTypes = {
  ".html": "text/html; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".svg": "image/svg+xml",
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".webp": "image/webp",
  ".ico": "image/x-icon",
  ".woff": "font/woff",
  ".woff2": "font/woff2"
};

function sendJson(res, status, body) {
  res.writeHead(status, {
    "content-type": "application/json; charset=utf-8",
    "cache-control": "no-store, max-age=0"
  });
  res.end(JSON.stringify(body));
}

function sendSse(res, event, data) {
  res.write(`event: ${event}\n`);
  res.write(`data: ${JSON.stringify(data)}\n\n`);
}

function escapeRegExp(value) {
  return String(value).replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function redactSecrets(value, secrets = []) {
  let text = String(value || "");
  for (const secret of secrets) {
    const trimmed = String(secret || "").trim();
    if (!trimmed) continue;
    text = text.replace(new RegExp(escapeRegExp(trimmed), "g"), "[redacted]");
  }
  return [
    /sk-[a-z0-9_-]+/gi,
    /sk-or-[a-z0-9_-]+/gi,
    /nvapi-[a-z0-9_-]+/gi,
    /(?:api[_-]?key|authorization|bearer|token)["':=\s]+[a-z0-9._-]{8,}/gi
  ].reduce((next, pattern) => next.replace(pattern, "[redacted]"), text);
}

export function resolveStaticRoot() {
  const configured = String(process.env.FRONTEND_DIST_DIR || "").trim();
  const candidate = configured ? join(__dirname, configured) : frontendDistDir;
  return existsSync(join(candidate, "index.html")) ? candidate : publicDir;
}

function isSafeStaticPath(staticRoot, filePath, requestedPath) {
  const relativePath = relative(staticRoot, filePath);
  if (relativePath.startsWith("..") || relativePath === "" || relativePath.includes("..\\")) return false;
  const normalizedRequest = requestedPath.toLowerCase().replace(/\\/g, "/");
  if (normalizedRequest.includes("/.env") || normalizedRequest.includes("/.git")) return false;
  if (normalizedRequest.startsWith("/data/") || normalizedRequest.includes(".sqlite")) return false;
  if (normalizedRequest.includes("/src/") || normalizedRequest.includes("/node_modules/")) return false;
  return true;
}

export function configureUsageStoreForTests(store) {
  usageStore = store;
  usageStoreInitError = null;
}

export function configureAppConfigStoreForTests(store) {
  appConfigStore = store;
  appConfigStoreInitError = null;
}

function initializeUsageStore() {
  try {
    usageStore = createUsageStore().init();
    usageStoreInitError = null;
  } catch (error) {
    usageStore = null;
    usageStoreInitError = error;
    console.error(`Unable to initialize usage store: ${error.message}`);
  }
}

function initializeAppConfigStore() {
  try {
    appConfigStore = createAppConfigStore().init();
    appConfigStoreInitError = null;
  } catch (error) {
    appConfigStore = null;
    appConfigStoreInitError = error;
    console.error(`Unable to initialize app config store: ${error.message}`);
  }
}

export function recordSuccessfulLlmUsage(result, target, store = usageStore) {
  if (!store) return false;
  const provider = result?.llm?.provider || target?.provider;
  const model = result?.llm?.model || target?.model;
  try {
    store.recordSuccess(provider, model, new Date());
    return true;
  } catch (error) {
    console.warn(`Unable to record LLM usage for ${provider || "(missing)"}/${model || "(missing)"}: ${error.message}`);
    return false;
  }
}

function clientIp(req) {
  return String(req.headers["x-forwarded-for"] || req.socket.remoteAddress || "local").split(",")[0].trim();
}

function checkRateLimit(req, res) {
  const pathname = new URL(req.url, `http://${req.headers.host}`).pathname;
  const rule = rateLimits[pathname] || (pathname.startsWith("/api/providers/") ? rateLimits["/api/providers"] : null);
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

export function isLocalRequest(req) {
  const address = String(req.socket.remoteAddress || "").toLowerCase();
  return ["127.0.0.1", "::1", "::ffff:127.0.0.1", "localhost"].includes(address);
}

function timingSafeTextEqual(left, right) {
  const leftText = String(left || "");
  const rightText = String(right || "");
  if (!leftText || !rightText || leftText.length !== rightText.length) return false;
  let diff = 0;
  for (let index = 0; index < leftText.length; index += 1) {
    diff |= leftText.charCodeAt(index) ^ rightText.charCodeAt(index);
  }
  return diff === 0;
}

export function hasConfigAccess(req, expectedToken = process.env.CONFIG_ADMIN_TOKEN) {
  if (isLocalRequest(req)) return true;
  const expected = String(expectedToken || "").trim();
  const provided = String(req.headers["x-config-admin-token"] || "").trim();
  return Boolean(expected && timingSafeTextEqual(provided, expected));
}

function checkConfigAccess(req, res) {
  if (hasConfigAccess(req)) return true;
  const expected = String(process.env.CONFIG_ADMIN_TOKEN || "").trim();
  sendJson(res, 403, {
    error: expected
      ? "Config API access denied. Use localhost or provide x-config-admin-token."
      : "Config API access denied for non-localhost requests. Set CONFIG_ADMIN_TOKEN to allow remote admin access."
  });
  return false;
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
    skillJson: join(root, "skill.json"),
    skillMdUpper: join(root, "SKILL.md"),
    skillMdLower: join(root, "skill.md")
  };
}

async function readJsonFileDetailed(path) {
  try {
    const raw = await readFile(path, "utf8");
    return { ok: true, value: JSON.parse(raw), error: null };
  } catch (error) {
    return { ok: false, value: null, error };
  }
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

function skillIssue(level, code, message, file = "") {
  return { level, code, message, file };
}

function parseSkillMarkdown(markdown) {
  const nameMatch = markdown.match(/^name:\s*(.+)$/m);
  const descMatch = markdown.match(/^description:\s*(.+)$/m);
  return {
    name: nameMatch?.[1],
    description: descMatch?.[1]
  };
}

function firstString(...values) {
  return values.find((value) => typeof value === "string" && value.trim()) || "";
}

function localizedString(value, language = "en") {
  if (typeof value === "string") return value;
  if (!value || typeof value !== "object" || Array.isArray(value)) return "";
  return firstString(value[language], value.en, value.th);
}

function humanizeFieldId(fieldId) {
  return String(fieldId || "")
    .replace(/[_-]+/g, " ")
    .replace(/\b\w/g, (char) => char.toUpperCase());
}

function rjsfUiForField(uiSchema, fieldId) {
  const direct = uiSchema?.[fieldId];
  const wrapped = uiSchema?.properties?.[fieldId];
  return direct && typeof direct === "object"
    ? direct
    : wrapped && typeof wrapped === "object"
      ? wrapped
      : {};
}

function nestedUiForField(uiMeta, fieldId) {
  if (!uiMeta || typeof uiMeta !== "object") return {};
  const direct = uiMeta[fieldId];
  const wrapped = uiMeta.properties?.[fieldId];
  return direct && typeof direct === "object" && !Array.isArray(direct)
    ? direct
    : wrapped && typeof wrapped === "object" && !Array.isArray(wrapped)
      ? wrapped
      : {};
}

function schemaTypeForField(fieldId, prop, uiMeta) {
  const widget = firstString(uiMeta["ui:widget"], uiMeta.widget, uiMeta["ui:field"]);
  const itemSchema = prop?.type === "array" ? prop.items || {} : {};
  const mediaType = firstString(prop?.contentMediaType, itemSchema?.contentMediaType, prop?.["x-ui-accept"], prop?.accept);
  const fileMode = firstString(prop?.["x-ui-file-mode"], itemSchema?.["x-ui-file-mode"]);
  if (/referenceImageArray|imageUpload|fileOrText/i.test(widget)) return "images";
  if (/drag-and-drop|image/i.test(fileMode) || /^image\//i.test(mediaType) || mediaType === "image/*") return "images";
  if (/^(reference_images?|start_?frame_?image|stop_?frame_?image)$/i.test(fieldId)) return "images";
  if (/reference.*images?/i.test(String(prop?.title || "")) || /reference.*images?/i.test(String(prop?.description || ""))) return "images";
  if (/checkboxes/i.test(widget)) return "multiselect";
  if (/radio|select/i.test(widget) || Array.isArray(prop?.enum)) return "select";
  if (prop?.type === "integer" || prop?.type === "number") return "number";
  if (prop?.type === "boolean") return "checkbox";
  if (prop?.type === "array") return "array";
  if (prop?.type === "object" || prop?.$ref) return "object";
  if (/storyboardShotArray|textarea/i.test(widget)) return "textarea";
  return "text";
}

function resolveLocalSchema(inputSchema, prop = {}) {
  if (!prop?.$ref || typeof prop.$ref !== "string" || !prop.$ref.startsWith("#/$defs/")) return prop || {};
  const key = prop.$ref.slice("#/$defs/".length);
  return inputSchema?.$defs?.[key] || prop;
}

function withAutoOption(fieldId, options, prop = {}) {
  if (!Array.isArray(options)) return undefined;
  if (prop.type !== "string") return options;
  if (options.includes("auto")) return options;
  if (/project_name|reference|negative|language/i.test(fieldId)) return options;
  return ["auto", ...options];
}

function humanizeOptionValue(value) {
  const text = String(value || "");
  if (!text) return "";
  if (/^\d+:\d+$/.test(text)) return text;
  return text
    .replace(/[_-]+/g, " ")
    .replace(/\b\w/g, (char) => char.toUpperCase());
}

function optionLabelMap(value) {
  if (!value || typeof value !== "object" || Array.isArray(value)) return {};
  return value;
}

function localizedOptionLabel(value, language = "en") {
  if (typeof value === "string") return value;
  if (!value || typeof value !== "object" || Array.isArray(value)) return "";
  return localizedString(value, language);
}

function thaiOptionLabel(value) {
  const labels = {
    auto: "อัตโนมัติ",
    custom: "กำหนดเอง",
    none: "ไม่มี",
    female: "หญิง",
    male: "ชาย",
    non_binary: "นอนไบนารี",
    genderfluid: "เพศลื่นไหล",
    agender: "ไม่มีเพศสภาวะ",
    transgender_female: "หญิงข้ามเพศ",
    transgender_male: "ชายข้ามเพศ",
    feminine: "แสดงออกแบบผู้หญิง",
    masculine: "แสดงออกแบบผู้ชาย",
    androgynous: "กึ่งหญิงกึ่งชาย",
    gender_neutral: "ไม่เน้นเพศ",
    fresh_youthful: "สดใสอ่อนเยาว์",
    wise_mature: "สุขุมดูมีวุฒิภาวะ",
    freckles: "กระ",
    beauty_marks: "ไฝเสน่ห์",
    vitiligo: "ด่างขาว",
    birthmarks: "ปาน",
    tanning_lines: "รอยผิวจากแดด",
    sun_spots: "จุดด่างแดด",
    moles: "ไฝ",
    clear_skin: "ผิวใส",
    cool: "โทนเย็น",
    warm: "โทนอุ่น",
    neutral: "โทนกลาง",
    golden: "โทนทอง",
    peachy: "โทนพีช",
    pink: "โทนชมพู",
    red: "โทนแดง",
    yellow: "โทนเหลือง",
    olive: "โทนโอลีฟ",
    light: "ผิวสว่าง",
    medium: "ผิวปานกลาง",
    tan: "ผิวแทน",
    brown: "ผิวน้ำตาล",
    deep: "ผิวเข้ม",
    ebony: "ผิวเข้มมาก",
    file_picker_only: "กดเลือกไฟล์เท่านั้น",
    drag_and_drop_only: "ลากวางเท่านั้น",
    preserve_face_identity: "รักษาเอกลักษณ์ใบหน้า",
    auto_merge_with_selected_traits: "ผสานภาพอ้างอิงกับตัวเลือกอัตโนมัติ",
    use_as_loose_inspiration: "ใช้เป็นแรงบันดาลใจหลวม ๆ",
    override_only_unspecified_traits: "ใช้ภาพเฉพาะส่วนที่ยังไม่ระบุ",
    ignore_person_reference: "ไม่ใช้ภาพบุคคลอ้างอิง",
    preserve_environment: "รักษาฉากตามภาพอ้างอิง",
    auto_use_as_environment: "ใช้ภาพเป็นฉากอัตโนมัติ",
    override_environment_only: "ใช้ภาพเฉพาะส่วนฉาก",
    ignore_background_reference: "ไม่ใช้ภาพฉากอ้างอิง",
    user_choices_override_reference: "ตัวเลือกผู้ใช้สำคัญกว่าภาพอ้างอิง",
    reference_overrides_unspecified_only: "ภาพอ้างอิงเติมเฉพาะส่วนที่ยังไม่ระบุ",
    ask_when_conflict: "ถามเมื่อข้อมูลขัดแย้ง",
    auto_best_consistency: "เลือกทางที่คงความต่อเนื่องดีที่สุด"
  };
  return labels[value] || "";
}

function optionsForField(fieldId, options, prop = {}, uiMeta = {}) {
  if (!Array.isArray(options)) return undefined;
  const labels = Array.isArray(prop.enumNames) ? prop.enumNames : [];
  const labelsTh = Array.isArray(prop["x-ui-enumNamesTh"]) ? prop["x-ui-enumNamesTh"] : [];
  const labelMap = optionLabelMap(prop["x-ui-enum-labels"] || uiMeta["ui:enum-labels"] || uiMeta["ui:enumNames"]);
  const labelMapTh = optionLabelMap(prop["x-ui-enum-labels-th"] || uiMeta["ui:enum-labels-th"]);
  return options.map((value, index) => ({
    value,
    label: localizedOptionLabel(labelMap[value], "en") || labels[index] || humanizeOptionValue(value),
    labelTh: fieldId === "session_commands"
      ? localizedOptionLabel(labelMapTh[value], "th") || localizedOptionLabel(labelMap[value], "th") || thaiOptionLabel(value) || labelsTh[index] || labels[index] || humanizeOptionValue(value)
      : thaiOptionLabel(value) || localizedOptionLabel(labelMapTh[value], "th") || localizedOptionLabel(labelMap[value], "th") || labelsTh[index] || labels[index] || humanizeOptionValue(value)
  }));
}

function sampleForField(fieldId, prop = {}) {
  if (prop.default !== undefined && prop.default !== "" && !Array.isArray(prop.default) && typeof prop.default !== "object") {
    return String(prop.default);
  }
  const samples = {
    project_name: "เช่น bridal_window_portrait_01",
    mode: "เช่น auto ให้ระบบเลือกโหมดที่เหมาะสมจากข้อมูลที่กรอก",
    genre: "เช่น comedy, drama, fashion_film หรือ auto",
    aspect_ratio: "เช่น 9:16 สำหรับวิดีโอแนวตั้ง, 16:9 สำหรับภาพยนตร์",
    video_aspect_ratio: "เช่น auto หรือ 16:9",
    output_type: "เช่น auto หรือ single_video_prompt",
    preset: "เช่น auto หรือ soft_korean_beauty_drama",
    story_seed: "เช่น เจ้าสาวเจอจดหมายลับก่อนเข้าพิธี แล้วต้องตัดสินใจว่าจะเปิดอ่านหรือไม่",
    cinematic_intent: "เช่น slow push-in จาก medium shot ไป close-up ใกล้หน้าต่าง แสงนุ่ม โทนโรแมนติก",
    custom_style_notes: "เช่น soft window light, warm skin tone, shallow depth of field",
    reference_images: "แนบภาพตัวละคร/สินค้า/ฉากที่ต้องการล็อกความต่อเนื่อง",
    shot_list: "กด Add item เพื่อเพิ่มช็อต แล้วกรอกมุมกล้อง แอ็กชัน และรายละเอียดของช็อตนั้น",
    storyboard: "กด Add item เพื่อเพิ่มช็อตวิดีโอทีละช็อต",
    character_bible: "กด Add item เพื่อเพิ่มตัวละครหลักและรายละเอียดคงที่",
    location_bible: "กด Add item เพื่อเพิ่มสถานที่และรายละเอียดฉาก",
    negative_prompt: "เช่น no flicker, no warped hands, no identity drift, no watermark",
    negative_prompt_global: "เช่น no continuity drift, no flat lighting, no duplicated faces",
    negative_constraints: "เช่น no new accessories, no background change, no extra people"
  };
  return samples[fieldId] || "";
}

function thaiHelpForField(fieldId, prop = {}, type = "text") {
  const help = {
    project_name: "ตั้งชื่อโปรเจกต์เพื่อแยกงานและอ้างอิงผลลัพธ์ภายหลัง",
    mode: "เลือก workflow หลักของ skill ถ้าไม่แน่ใจให้เลือก auto แล้วระบบจะเลือกโหมดที่เหมาะสม",
    output_type: "เลือกรูปแบบผลลัพธ์ที่ต้องการ ถ้าไม่แน่ใจให้เลือก auto",
    generator_target: "ระบุโมเดลหรือระบบปลายทางที่ต้องการนำ prompt ไปใช้",
    reference_images: "แนบภาพอ้างอิง 1-5 ภาพเพื่อคงตัวตน เสื้อผ้า วัสดุ แสง สี และฉาก",
    story_seed: "เขียนไอเดียเรื่องแบบสั้น ๆ ระบบจะขยายเป็น beat sheet และ storyboard",
    cinematic_intent: "อธิบายฉาก วัตถุประสงค์ของวิดีโอ อารมณ์ มุมกล้อง หรือ movement ที่ต้องการ",
    aspect_ratio: "เลือกสัดส่วนภาพหรือวิดีโอปลายทาง",
    video_aspect_ratio: "เลือกสัดส่วนวิดีโอ ถ้าไม่แน่ใจให้เลือก auto",
    shot_list: "เพิ่มรายการช็อตเมื่อต้องการควบคุมมุมกล้องและ action แบบละเอียด",
    storyboard: "เพิ่มช็อตสำหรับวิดีโอหลายช็อต โดยแต่ละช็อตมีเวลา กล้อง action และ continuity",
    tone: "เลือกอารมณ์ของงานได้มากกว่าหนึ่งข้อ",
    output_scope: "เลือกส่วนของแพ็กเกจที่ต้องการให้สร้าง",
    character_bible: "เพิ่มข้อมูลตัวละครที่ต้องคงที่ เช่น ชื่อ บทบาท หน้าตา เสื้อผ้า และบุคลิก",
    location_bible: "เพิ่มข้อมูลสถานที่ ฉาก แสง และพร็อพที่ต้องคงต่อเนื่อง",
    negative_prompt: "ระบุสิ่งที่ไม่ต้องการให้เกิดในวิดีโอหรือภาพ",
    negative_prompt_global: "ระบุข้อห้ามรวมทั้งเรื่อง เช่น ห้ามตัวละครเปลี่ยน ห้ามแสงเพี้ยน",
    negative_constraints: "เพิ่มข้อห้ามเป็นรายการ เช่น ห้ามเพิ่มคน ห้ามเปลี่ยนฉาก",
    workflow_mode: "เลือกวิธีทำงานของสกิล ถ้าไม่แน่ใจให้เลือก Auto หรือเลือก Interactive เพื่อให้ระบบถามทีละขั้น",
    ui_language: "เลือกภาษาที่ใช้แสดงชื่อช่อง ตัวเลือก และคำอธิบายในฟอร์มนี้",
    output_language: "เลือกภาษาที่ต้องการให้พรอมต์สุดท้ายเขียนออกมา แยกจากภาษาหน้า UI",
    prompt_count: "จำนวนพรอมต์แยกที่ต้องการสร้าง แต่ละพรอมต์จะใช้ประเภทภาพที่เลือกไว้เพียงแบบเดียว",
    shot_types: "เลือกมุมภาพเพียงข้อเดียวต่อพรอมต์ เพื่อไม่ให้ภาพเดียวมีทั้งระยะใกล้ พอร์ตเทรต ครึ่งตัว และเต็มตัวปนกัน",
    include_translation: "เปิดเฉพาะเมื่อต้องการให้ผลลัพธ์มีคำแปลอีกชุดเพิ่มจากพรอมต์หลัก ไม่ใช่ภาษาหลักของพรอมต์",
    translation_language: "ใช้เฉพาะเมื่อเปิด ใส่คำแปลเพิ่มเติม เท่านั้น ส่วนภาษาหลักของพรอมต์ให้ตั้งที่ช่อง ภาษาพรอมต์ ด้านบน",
    reference_image_behavior: "กำหนดว่าระบบควรใช้ภาพอ้างอิงอย่างไร และเมื่อข้อมูลในภาพขัดกับตัวเลือกผู้ใช้ให้ตัดสินใจแบบไหน",
    allow_reference_images: "เปิดหรือปิดการใช้ภาพอ้างอิงในการสร้างตัวละคร",
    person_reference_policy: "กำหนดระดับการยึดใบหน้า รูปร่าง เสื้อผ้า หรือท่าทางจากภาพบุคคลอ้างอิง",
    background_reference_policy: "กำหนดระดับการยึดฉาก แสง มู้ด หรือองค์ประกอบจากภาพฉากอ้างอิง",
    conflict_resolution: "เลือกว่าถ้าภาพอ้างอิงขัดกับตัวเลือกที่กรอก ระบบควรให้ข้อมูลใดสำคัญกว่า",
    privacy_note_acknowledged: "ยืนยันว่าเข้าใจการใช้ภาพอ้างอิงและความเป็นส่วนตัวของข้อมูลภาพ",
    character_profile: "กรอกรายละเอียดตัวละครที่ต้องการล็อกให้คงที่ในทุกพรอมต์ ยิ่งระบุชัด ผลลัพธ์ยิ่งสม่ำเสมอ",
    name: "ชื่อตัวละครหรือชื่อเล่น ใช้เป็น anchor สำหรับคงตัวตนในพรอมต์",
    gender_identity: "ระบุเพศสภาวะและภาพรวมการแสดงออกทางเพศของตัวละคร",
    identity: "เลือกเพศสภาวะหลักของตัวละคร หรือเลือก Auto ให้ระบบตีความจากบริบท",
    expression: "เลือกบุคลิกการแสดงออกทางเพศ เช่น feminine, masculine, androgynous หรือ custom",
    custom_identity: "กรอกเพศสภาวะเฉพาะเมื่อไม่มีตัวเลือกที่ตรงพอ",
    custom_expression: "กรอกคำอธิบายการแสดงออกเพิ่มเติม เช่น ลุคนุ่มนวล สุขุม หรือแฟชั่นจัด",
    age: "กำหนดช่วงอายุและภาพลักษณ์ตามวัย เพื่อให้ใบหน้า ร่างกาย และสไตล์สมจริง",
    range: "เลือกช่วงอายุโดยรวม ถ้าเลือก Auto ระบบจะเลือกให้สัมพันธ์กับข้อมูลอื่น",
    specific_age: "ระบุอายุเป็นตัวเลขเมื่ออยากควบคุมอายุชัดเจน เช่น 24 หรือ 35",
    appearance: "เลือกว่าตัวละครควรดูเด็กกว่า เหมาะสมตามวัย หรือดูเป็นผู้ใหญ่กว่าวัย",
    ethnicity_skin: "กำหนดเชื้อชาติ ภูมิภาค โทนผิว และรายละเอียดผิว เพื่อให้ตัวละครมีลักษณะชัดเจนและสอดคล้อง",
    ethnicity: "เลือกเชื้อชาติหรือภูมิภาคของตัวละคร ใช้เพื่อกำหนดลักษณะใบหน้าและบริบทวัฒนธรรมอย่างเหมาะสม",
    skin_tone: "เลือกความสว่างหรือความเข้มของสีผิวหลัก",
    undertone: "เลือกอันเดอร์โทนผิว เช่น เย็น อุ่น กลาง พีช หรือโอลีฟ เพื่อช่วยกำหนดสีผิวและเมคอัพ",
    special_features: "เลือกจุดเด่นบนผิวที่ต้องการให้ปรากฏ เช่น กระ ไฝ ปาน หรือผิวใส เลือกได้หลายข้อ",
    custom_description: "กรอกรายละเอียดเพิ่มเติมที่ตัวเลือกไม่มี เช่น ลักษณะเฉพาะของใบหน้า ผิว หรือสไตล์",
    face_structure: "กำหนดโครงหน้า เช่น รูปหน้า หน้าผาก โหนกแก้ม กราม และคาง",
    eyes: "กำหนดรายละเอียดดวงตา เช่น รูปตา ขนาด สี ขนตา และระยะห่าง",
    body_proportions: "กำหนดสัดส่วนร่างกาย ส่วนสูง รูปร่าง โครงสร้าง และท่าทาง",
    bust_chest: "ใช้คำอธิบายทรงเสื้อ การเข้ารูป การทิ้งตัวของผ้า หรือซิลูเอตช่วงลำตัวบนแทนการระบุขนาดหน้าอกโดยตรง เพื่อให้พรอมต์ปลอดภัยและผ่านระบบสร้างภาพง่ายขึ้น",
    hair: "กำหนดความยาว ทรง สี พื้นผิว และการจัดแต่งผม",
    nose: "กำหนดรูปทรงจมูก สันจมูก ปลายจมูก และขนาดโดยรวม",
    mouth: "กำหนดรูปปาก สีริมฝีปาก ความหนา และลักษณะรอยยิ้ม",
    personality_posture: "กำหนดบุคลิก สีหน้า พลังงาน ท่าทางมือ และความมั่นใจของตัวละคร",
    generation_preferences: "กำหนดสไตล์ภาพ ฉาก แสง กล้อง ฟิล์ม และข้อห้ามเพื่อให้พรอมต์พร้อมใช้งาน",
    style_direction: "เลือกแนวภาพหลัก เช่น studio, cinematic, beauty, lifestyle หรือ fantasy realism",
    camera_quality: "เลือกระดับคุณภาพภาพและลักษณะงานถ่าย เช่น commercial, studio, cinematic หรือ ultra high resolution",
    environment_style: "เลือกฉากหรือสภาพแวดล้อมหลักของภาพ",
    lighting_setup: "เลือกแนวแสง เช่น studio, natural window light, ring light หรือ cinematic soft light",
    camera_system: "เลือกกล้องหรือเลนส์อ้างอิงสำหรับ mood ของภาพ",
    film_processing: "เลือกโทนฟิล์ม สี และการประมวลผลภาพ",
    negative_rules: "เลือกข้อห้ามที่ต้องล็อกไว้ เช่น ห้ามตัวละครเพี้ยน ห้าม JSON หรือห้าม markdown ในพรอมต์สุดท้าย",
    custom_requirements: "กรอกข้อกำหนดเพิ่มเติมที่ต้องการให้พรอมต์ยึดตาม"
  };
  if (help[fieldId]) return help[fieldId];
  if (type === "select") return "เลือกค่าที่ตรงกับงาน ถ้าเห็นตัวเลือก auto สามารถให้ระบบเลือกให้ได้";
  if (type === "multiselect") return "เลือกได้หลายข้อ ใช้เพื่อกำหนดคุณสมบัติหรือขอบเขตงาน";
  if (type === "object") return "กรอกช่องย่อยตามรายละเอียดที่ต้องการควบคุม";
  if (type === "array") return "กด Add item เพื่อเพิ่มรายการ แล้วกรอกข้อมูลย่อยของแต่ละรายการ";
  if (type === "images") return "อัปโหลดภาพอ้างอิงหรือภาพเริ่มต้นที่ต้องการให้ระบบยึดเป็นหลัก";
  if (prop.description) return prop.description;
  return "กรอกข้อมูลสำหรับใช้สร้าง prompt ให้ละเอียดพอที่ระบบจะนำไปใช้งานได้";
}

function thaiLabelForField(fieldId) {
  const labels = {
    reference_images: "ภาพอ้างอิง",
    reference_image_behavior: "การใช้งานภาพอ้างอิง",
    character_profile: "โปรไฟล์ตัวละคร",
    generation_preferences: "การตั้งค่าการสร้างภาพ",
    workflow_mode: "โหมดการทำงาน",
    ui_language: "ภาษา UI",
    output_language: "ภาษาพรอมต์",
    prompt_count: "จำนวนพรอมต์",
    shot_types: "ประเภทภาพต่อพรอมต์",
    aspect_ratio: "อัตราส่วนภาพ",
    include_translation: "ใส่คำแปลเพิ่มเติม",
    translation_language: "ภาษาคำแปลเพิ่มเติม",
    session_commands: "คำสั่งพิเศษ",
    gender_identity: "เพศสภาวะและการแสดงออก",
    age: "อายุ",
    ethnicity_skin: "เชื้อชาติและโทนผิว",
    face_structure: "โครงหน้า",
    eyes: "ดวงตา",
    body_proportions: "สัดส่วนร่างกาย",
    bust_chest: "ทรงเสื้อช่วงลำตัวบน",
    hair: "ทรงผมและสีผม",
    nose: "จมูก",
    mouth: "ปากและริมฝีปาก",
    personality_posture: "บุคลิกและท่าทาง",
    skin_details: "รายละเอียดผิว",
    eyebrows: "คิ้ว",
    smile_teeth: "รอยยิ้มและฟัน",
    ears: "หู",
    facial_hair: "หนวดและเครา",
    eyewear: "แว่นตา",
    makeup: "เมคอัพ",
    additional_features: "ลักษณะเพิ่มเติม",
    custom_notes: "หมายเหตุเพิ่มเติม",
    custom_style_notes: "รายละเอียดสไตล์เพิ่มเติม",
    story_seed: "ไอเดียเรื่องเพิ่มเติม",
    cinematic_intent: "รายละเอียดวิดีโอเพิ่มเติม"
  };
  return labels[fieldId] || "";
}

function fieldFromInputSchema(fieldId, prop = {}, uiMeta = {}, required = [], inputSchema = null, depth = 0) {
  prop = resolveLocalSchema(inputSchema, prop);
  const type = schemaTypeForField(fieldId, prop, uiMeta);
  const itemSchemaForOptions = prop.type === "array" ? resolveLocalSchema(inputSchema, prop.items || {}) : {};
  const rawOptions = Array.isArray(prop.enum)
    ? prop.enum
    : Array.isArray(itemSchemaForOptions.enum)
      ? itemSchemaForOptions.enum
      : undefined;
  const options = withAutoOption(fieldId, rawOptions, prop);
  const rows = uiMeta?.["ui:options"]?.rows || uiMeta.rows || (type === "textarea" ? 3 : undefined);
  const defaultValue = (fieldId === "mode" || fieldId === "output_type") && options?.includes("auto")
    ? "auto"
    : prop.default !== undefined
      ? prop.default
      : quickStartSkillSections ? schemaDefaultForField(fieldId, prop, inputSchema) : undefined;
  const field = {
    id: fieldId,
    label: firstString(localizedString(uiMeta["ui:title"], "en"), localizedString(uiMeta.title, "en"), localizedString(prop.title, "en"), humanizeFieldId(fieldId)),
    labelTh: firstString(localizedString(uiMeta["ui:title"], "th"), localizedString(uiMeta.title, "th"), thaiLabelForField(fieldId)),
    description: firstString(localizedString(uiMeta["ui:help"], "en"), localizedString(uiMeta.helpText, "en"), localizedString(prop.description, "en")),
    helpTextTh: firstString(localizedString(uiMeta["ui:help"], "th"), localizedString(uiMeta.helpText, "th"), thaiHelpForField(fieldId, prop, type)),
    type,
    options: optionsForField(fieldId, options, prop, uiMeta),
    default: defaultValue,
    placeholder: firstString(localizedString(uiMeta["ui:placeholder"], "en"), localizedString(uiMeta.placeholder, "en")),
    placeholderTh: firstString(localizedString(uiMeta["ui:placeholder"], "th"), localizedString(uiMeta.placeholder, "th")),
    accept: firstString(prop["x-ui-accept"], prop.accept, prop.items?.contentMediaType),
    required: required.includes(fieldId),
    example: firstString(uiMeta.example, uiMeta["ui:example"], prop.examples?.[0], sampleForField(fieldId, prop)),
    min: prop.minimum,
    max: prop.maximum,
    minItems: prop.minItems,
    maxItems: prop.maxItems,
    rows,
    maxImages: prop.maxItems
  };
  if (type === "object" && prop.properties && depth < 3) {
    const childRequired = Array.isArray(prop.required) ? prop.required : [];
    field.fields = Object.keys(prop.properties).map((childId) =>
      fieldFromInputSchema(childId, prop.properties[childId], nestedUiForField(uiMeta, childId), childRequired, inputSchema, depth + 1)
    );
  }
  if (type === "array") {
    const itemSchema = resolveLocalSchema(inputSchema, prop.items || {});
    if (itemSchema.enum) {
      field.type = "multiselect";
      const itemOptions = withAutoOption(fieldId, itemSchema.enum, itemSchema);
      field.options = optionsForField(fieldId, itemOptions, itemSchema, uiMeta);
    } else if ((itemSchema.type === "object" || itemSchema.properties) && depth < 3) {
      const childRequired = Array.isArray(itemSchema.required) ? itemSchema.required : [];
      field.itemFields = Object.keys(itemSchema.properties || {}).map((childId) =>
        fieldFromInputSchema(childId, itemSchema.properties[childId], nestedUiForField(uiMeta, childId), childRequired, inputSchema, depth + 1)
      );
      field.itemLabel = humanizeFieldId(fieldId).replace(/s$/, "");
    } else {
      field.type = "list";
      field.itemType = itemSchema.type || "string";
    }
  }
  return field;
}

const quickStartSkillSections = {
  auto_cinematic_image: [
    { id: "basic", title: "Basic Settings", titleTh: "ตั้งค่าพื้นฐาน", fields: ["reference_images", "mode", "aspect_ratio", "style_preset", "custom_style_notes"] },
    { id: "output", title: "Output Tuning", titleTh: "ปรับแต่งผลลัพธ์", fields: ["output_count", "language", "negative_constraints"] },
    { id: "advanced", title: "Advanced Options", titleTh: "ตัวเลือกขั้นสูง", collapsed: true, fields: ["prompt_detail_level", "subject_preservation", "continuity_locks"] }
  ],
  auto_cinematic_storyboard_master: [
    { id: "basic", title: "Basic Settings", titleTh: "ตั้งค่าพื้นฐาน", fields: ["reference_images", "story_seed", "mode", "genre", "tone"] },
    { id: "storyboard", title: "Storyboard Tuning", titleTh: "ปรับแต่งสตอรี่บอร์ด", fields: ["target_duration_minutes", "average_shot_seconds", "use_auto_shot_count", "aspect_ratio", "video_aspect_ratio", "visual_style_preset", "camera_style"] },
    { id: "output", title: "Output Package", titleTh: "แพ็กเกจผลลัพธ์", fields: ["output_scope", "language", "negative_prompt_global"] },
    { id: "advanced", title: "Advanced Options", titleTh: "ตัวเลือกขั้นสูง", collapsed: true, fields: ["target_duration_total_seconds", "shot_count_target", "shot_duration_policy", "character_bible", "location_bible", "cinematic_rules", "continuity_locks"] }
  ],
  auto_cinematic_video_promptll: [
    { id: "basic", title: "Basic Settings", titleTh: "ตั้งค่าพื้นฐาน", fields: ["reference_images", "cinematic_intent", "mode", "output_type", "aspect_ratio", "preset"] },
    { id: "motion", title: "Motion And Camera", titleTh: "กล้องและการเคลื่อนไหว", fields: ["duration", "camera_plan", "subject_action", "lighting_and_grade"] },
    { id: "output", title: "Output Tuning", titleTh: "ปรับแต่งผลลัพธ์", fields: ["negative_prompt", "language", "prompt_style"] },
    { id: "advanced", title: "Advanced Options", titleTh: "ตัวเลือกขั้นสูง", collapsed: true, fields: ["start_frame", "stop_frame", "storyboard", "storyboard_preset", "motion_quality", "continuity_locks", "start_stop_difference_policy"] }
  ]
};

function visibleFieldIdsForSkill(skillId, inputFieldIds) {
  const sections = quickStartSkillSections[skillId];
  if (!sections) return inputFieldIds;
  return sections.flatMap((section) => section.fields).filter((id) => inputFieldIds.includes(id));
}

function normalizeUiSchemaForApp(inputSchema, uiSchema = {}, skillId = "") {
  if (Array.isArray(uiSchema.sections) && uiSchema.sections.length) return uiSchema;

  const properties = inputSchema?.properties || {};
  const required = Array.isArray(inputSchema?.required) ? inputSchema.required : [];
  const effectiveRequired = quickStartSkillSections[skillId] ? ["reference_images"] : required;
  const inputFieldIds = Object.keys(properties);
  const visibleFieldIds = visibleFieldIdsForSkill(skillId, inputFieldIds);
  const order = Array.isArray(uiSchema["ui:order"])
    ? uiSchema["ui:order"]
    : Array.isArray(uiSchema?.properties?.["ui:order"]?.default)
      ? uiSchema.properties["ui:order"].default
      : visibleFieldIds;
  const orderedIds = [
    ...order.filter((id) => visibleFieldIds.includes(id)),
    ...visibleFieldIds.filter((id) => !order.includes(id))
  ];
  const makeField = (id) => fieldFromInputSchema(id, properties[id], rjsfUiForField(uiSchema, id), effectiveRequired, inputSchema);
  const groups = uiSchema["ui:groups"] || uiSchema?.properties?.["ui:groups"] || {};
  const quickSections = quickStartSkillSections[skillId];
  if (quickSections) {
    return {
      ...uiSchema,
      title: firstString(uiSchema.title, uiSchema["ui:title"], inputSchema?.title),
      description: firstString(uiSchema.description, uiSchema["ui:description"], inputSchema?.description),
      sections: quickSections.map((section) => ({
        ...section,
        fields: section.fields.filter((id) => inputFieldIds.includes(id)).map(makeField)
      })).filter((section) => section.fields.length)
    };
  }

  const groupEntries = quickStartSkillSections[skillId]
    ? []
    : Object.entries(groups).filter(([, ids]) => Array.isArray(ids));

  const sections = [];
  const groupedIds = new Set();
  for (const [title, ids] of groupEntries) {
    const fields = ids.filter((id) => inputFieldIds.includes(id)).map((id) => {
      groupedIds.add(id);
      return makeField(id);
    });
    if (fields.length) {
      sections.push({
        id: title.toLowerCase().replace(/[^a-z0-9]+/gi, "_").replace(/^_+|_+$/g, "") || "group",
        title,
        fields
      });
    }
  }

  const remaining = orderedIds.filter((id) => !groupedIds.has(id)).map(makeField);
  if (remaining.length || !sections.length) {
    sections.unshift({
      id: "inputs",
      title: "Inputs",
      titleTh: "ข้อมูลนำเข้า",
      fields: remaining.length ? remaining : orderedIds.map(makeField)
    });
  }

  return {
    ...uiSchema,
    title: firstString(uiSchema.title, uiSchema["ui:title"], inputSchema?.title),
    description: firstString(uiSchema.description, uiSchema["ui:description"], inputSchema?.description),
    sections
  };
}

function cloneDefault(value) {
  if (value === undefined) return undefined;
  return value && typeof value === "object" ? JSON.parse(JSON.stringify(value)) : value;
}

function schemaDefaultForField(fieldId, prop = {}, inputSchema = null, skillId = "") {
  prop = resolveLocalSchema(inputSchema, prop);
  const fallback = {
    project_name: "Auto_Cinematic_Project",
    mode: "auto",
    aspect_ratio: "9:16",
    video_aspect_ratio: "auto",
    output_type: "auto",
    story_seed: "Create a cinematic storyboard from the uploaded reference image. Preserve identity, wardrobe, mood, lighting, and environment.",
    cinematic_intent: "Create a cinematic reference-locked video prompt from the uploaded image with natural motion, camera movement, and strict continuity.",
    genre: "auto",
    target_duration_total_seconds: 60,
    target_duration_minutes: 1,
    average_shot_seconds: 8,
    use_auto_shot_count: true
  };
  if (fallback[fieldId] !== undefined) return cloneDefault(fallback[fieldId]);
  if (prop.default !== undefined) return cloneDefault(prop.default);
  if (prop.type === "boolean") return false;
  if (prop.type === "array") return [];
  if (prop.type === "object" || prop.properties) {
    return Object.fromEntries(Object.entries(prop.properties || {}).map(([childId, child]) => [
      childId,
      schemaDefaultForField(childId, child, inputSchema, skillId)
    ]));
  }
  if (Array.isArray(prop.enum)) return prop.enum[0] || "";
  if (prop.type === "integer" || prop.type === "number") return prop.minimum ?? 0;
  return "";
}

function applyInputDefaults(params, inputSchema, skillId = "") {
  if (!quickStartSkillSections[skillId]) return params;
  const next = { ...(params || {}) };
  for (const [fieldId, prop] of Object.entries(inputSchema?.properties || {})) {
    if (next[fieldId] === undefined || next[fieldId] === null || next[fieldId] === "") {
      next[fieldId] = schemaDefaultForField(fieldId, prop, inputSchema, skillId);
    }
  }
  return next;
}

async function inspectSkill(skillId) {
  const paths = skillPaths(skillId);
  const issues = [];
  const [inputResult, uiResult, skillJsonResult] = await Promise.all([
    readJsonFileDetailed(paths.inputSchema),
    readJsonFileDetailed(paths.uiSchema),
    readJsonFileDetailed(paths.skillJson)
  ]);
  let inputSchema = inputResult.value;
  let uiSchema = uiResult.value || {};
  let markdown = "";
  const skillMdPath = existsSync(paths.skillMdUpper) ? paths.skillMdUpper : paths.skillMdLower;
  const hasSkillMd = existsSync(skillMdPath);

  if (!inputResult.ok) {
    const reason = inputResult.error?.code === "ENOENT" ? "missing" : inputResult.error?.message || "invalid JSON";
    issues.push(skillIssue("error", "input_schema_unreadable", `Missing or invalid schemas/input.schema.json (${reason}).`, paths.inputSchema));
  } else if (!inputSchema || inputSchema.type !== "object" || !inputSchema.properties || typeof inputSchema.properties !== "object") {
    issues.push(skillIssue("error", "input_schema_shape", "schemas/input.schema.json must be a JSON object schema with a properties object.", paths.inputSchema));
  }

  if (!uiResult.ok) {
    if (uiResult.error?.code === "ENOENT") {
      issues.push(skillIssue("warning", "ui_schema_missing", "Missing schemas/ui.schema.json. The app can still build a fallback form from input.schema.json.", paths.uiSchema));
    } else {
      issues.push(skillIssue("warning", "ui_schema_invalid", `Invalid schemas/ui.schema.json (${uiResult.error?.message || "invalid JSON"}). The app will use a fallback form.`, paths.uiSchema));
    }
    uiSchema = {};
  }

  if (inputSchema?.properties && Array.isArray(inputSchema.required)) {
    const missingRequired = inputSchema.required.filter((field) => !Object.hasOwn(inputSchema.properties, field));
    if (missingRequired.length) {
      issues.push(skillIssue("error", "required_field_missing", `input.schema required field(s) are not defined in properties: ${missingRequired.join(", ")}.`, paths.inputSchema));
    }
  }

  if (!hasSkillMd) {
    issues.push(skillIssue("warning", "skill_markdown_missing", "Missing SKILL.md or skill.md. The skill can load, but its name/description and LLM instructions may be poor.", paths.root));
  } else {
    try {
      markdown = await readFile(skillMdPath, "utf8");
      const meta = parseSkillMarkdown(markdown);
      if (!meta.name || !meta.description) {
        issues.push(skillIssue("warning", "skill_markdown_metadata", "SKILL.md should include YAML frontmatter name and description.", skillMdPath));
      }
    } catch (error) {
      issues.push(skillIssue("warning", "skill_markdown_unreadable", `Unable to read skill markdown (${error.message}).`, skillMdPath));
    }
  }

  const hasRuntime = existsSync(paths.entrypoint);
  if (!hasRuntime) {
    const configuredEntrypoint = skillJsonResult.value?.entrypoint;
    const entrypointHint = configuredEntrypoint && configuredEntrypoint !== "python/skill.py"
      ? ` skill.json points to "${configuredEntrypoint}", but this web app runs local skills through python/skill.py. Add a python/skill.py adapter or configure an LLM.`
      : " Add python/skill.py for local execution or configure an LLM.";
    issues.push(skillIssue("warning", "runtime_missing", `Missing local runtime python/skill.py.${entrypointHint}`, paths.entrypoint));
  }

  const meta = parseSkillMarkdown(markdown);
  const skillJson = skillJsonResult.value || {};
  const title = firstString(skillJson.display_name, uiSchema.title, uiSchema["ui:title"], meta.name, paths.id);
  const description = firstString(skillJson.description, uiSchema.description, uiSchema["ui:description"], meta.description);
  const errorCount = issues.filter((issue) => issue.level === "error").length;
  return {
    id: paths.id,
    title,
    titleTh: firstString(uiSchema.titleTh, skillJson.display_name, uiSchema.title, uiSchema["ui:title"], meta.name, paths.id),
    description,
    descriptionTh: firstString(uiSchema.descriptionTh, skillJson.description, uiSchema.description, uiSchema["ui:description"], meta.description),
    hasRuntime,
    markdown: cleanMarkdown(markdown),
    inputSchema,
    uiSchema,
    issues,
    isValid: errorCount === 0
  };
}

async function readSkillInfo(skillId) {
  const info = await inspectSkill(skillId);
  return info.isValid ? info : null;
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

function resolveStoredLlmConfig(incomingConfig = null) {
  const stored = appConfigStore?.getConfig?.({ includeSecrets: true }) || null;
  if (!incomingConfig || typeof incomingConfig !== "object") return stored;
  if (!stored) return incomingConfig;
  const providers = {};
  const providerNames = new Set([
    ...Object.keys(stored.providers || {}),
    ...Object.keys(incomingConfig.providers || {})
  ]);
  for (const provider of providerNames) {
    providers[provider] = {
      ...(stored.providers?.[provider] || {}),
      ...(incomingConfig.providers?.[provider] || {})
    };
    if (!String(providers[provider].apiKey || "").trim()) {
      providers[provider].apiKey = stored.providers?.[provider]?.apiKey || "";
    }
  }
  return {
    ...stored,
    ...incomingConfig,
    providers,
    fallback: Array.isArray(incomingConfig.fallback) ? incomingConfig.fallback : stored.fallback
  };
}

function targetLanguageName(params) {
  const raw = String(params?.target_language || params?.language || params?.output_language || "").toLowerCase();
  if (["th", "thai", "ไทย"].includes(raw)) return "Thai";
  if (["en", "english", "อังกฤษ"].includes(raw)) return "English";
  return raw || "the language requested by the user";
}

function isImageDataUrl(value) {
  return typeof value === "string" && value.startsWith("data:image/");
}

function isImagePayload(value) {
  return value && typeof value === "object" && isImageDataUrl(value.dataUrl);
}

function collectImages(value, path = []) {
  const images = [];
  if (isImageDataUrl(value)) {
    images.push({ dataUrl:value, path:path.join(".") });
  } else if (isImagePayload(value)) {
    images.push({ ...value, path:path.join(".") });
  } else if (Array.isArray(value)) {
    value.forEach((item, index) => images.push(...collectImages(item, [...path, String(index)])));
  } else if (value && typeof value === "object") {
    for (const [key, nested] of Object.entries(value)) images.push(...collectImages(nested, [...path, key]));
  }
  return images;
}

function modelSupportsImageInput(target) {
  const provider = String(target?.provider || "").toLowerCase();
  const model = String(target?.model || "").toLowerCase();
  if (!model) return false;
  return /(?:^|\/)(?:gpt-4o|gpt-4\.1|gpt-5|gemini|claude|pixtral|llava|qwen[\w.-]*vl|qwen3\.5|molmo|mistral-small-3\.2|llama-3\.2.*vision)/i.test(model);
}

const recommendedImageInputModels = [
  "qwen/qwen3-vl-32b-instruct",
  "qwen/qwen3-vl-8b-instruct",
  "qwen/qwen3-vl-235b-a22b-instruct",
  "qwen/qwen3.5-35b-a3b",
  "qwen/qwen3.5-plus-02-15",
  "qwen/qwen3.5-397b-a17b"
];

const referenceActionPools = {
  posing_eye_contact: [
    "looking directly at the camera while walking forward",
    "three-quarter stance with confident eye contact",
    "over-the-shoulder glance while turning back",
    "standing in a relaxed pose with soft eye contact",
    "chin slightly raised with a calm focused gaze",
    "side profile pose with eyes looking toward the viewer"
  ],
  movement_dynamics: [
    "running toward the camera with natural motion",
    "jumping mid-air with hair and clothing moving naturally",
    "spinning gracefully with dynamic body flow",
    "stepping forward with wind-swept motion",
    "kicking or lunging in a controlled action pose",
    "dancing with elegant full-body movement"
  ],
  emotional_actions: [
    "smiling brightly with an open welcoming gesture",
    "serious determined stance with clenched focus",
    "surprised reaction pose with expressive hands",
    "shy gentle pose with softened shoulders",
    "confident heroic stance with strong posture",
    "playful laughing pose with relaxed body language"
  ],
  interactions: [
    "leaning against a nearby wall or railing",
    "holding a relevant prop without changing the outfit identity",
    "reaching toward an object in the environment",
    "walking through the environment while interacting with light and wind",
    "resting one hand on a surface while keeping full body visible",
    "using the environment as framing while preserving the character identity"
  ]
};

function textArray(value, fallback = []) {
  const source = Array.isArray(value) ? value : fallback;
  return source.map((item) => String(item || "").trim()).filter(Boolean);
}

function shuffled(values) {
  const copy = [...values];
  for (let index = copy.length - 1; index > 0; index -= 1) {
    const swap = Math.floor(Math.random() * (index + 1));
    [copy[index], copy[swap]] = [copy[swap], copy[index]];
  }
  return copy;
}

export function enrichReferenceLockedCharacterParams(info, params) {
  if (info.id !== "reference-locked-character-prompt") return params;
  const pools = {
    posing_eye_contact: textArray(params.posing_eye_contact_actions, referenceActionPools.posing_eye_contact),
    movement_dynamics: textArray(params.movement_dynamics_actions, referenceActionPools.movement_dynamics),
    emotional_actions: textArray(params.emotional_actions, referenceActionPools.emotional_actions),
    interactions: textArray(params.interaction_actions, referenceActionPools.interactions)
  };
  const custom = textArray(params.custom_action_prompts);
  const category = String(params.action_category || "mixed");
  const mode = String(params.action_selection_mode || "random");
  const count = Math.max(1, Math.min(8, Number(params.action_count || 4)));
  const categoryKeys = category === "mixed" || category === "auto" ? Object.keys(pools) : [category].filter((key) => pools[key]);
  const pool = mode === "custom_only" ? custom : [...categoryKeys.flatMap((key) => pools[key]), ...custom];
  const selected = (mode === "balanced")
    ? categoryKeys.flatMap((key) => shuffled(pools[key]).slice(0, Math.max(1, Math.floor(count / Math.max(1, categoryKeys.length))))).slice(0, count)
    : shuffled(pool).slice(0, count);
  return {
    ...params,
    selected_action_prompts: selected.length ? selected : shuffled(Object.values(referenceActionPools).flat()).slice(0, count),
    selected_action_category: category,
    action_randomization_note: "Use selected_action_prompts as the actual pose/action variations for this run. Preserve character identity, outfit, face, hairstyle, accessories, and proportions in every action."
  };
}

export function enrichKpopChoreographyParams(info, params) {
  if (info.id !== "reference-locked-character-prompt") return params;
  const preset = String(params.choreography_preset || "auto");
  const taskType = String(params.task_type || "");
  if (preset !== "kpop_4x4_instruction_sheet" && taskType !== "kpop_dance_sequence_sheet") return params;
  const frameCount = Math.max(1, Math.min(16, Number(params.choreography_frame_count || 16)));
  const referenceImages = Array.isArray(params.reference_images) ? params.reference_images : [];
  const primary = referenceImages.find((image) => image?.role === "primary_identity") || referenceImages[0] || {};
  const primaryRef = primary.image_ref || "@img1";
  const selected = Array.isArray(params.selected_action_prompts) && params.selected_action_prompts.length
    ? params.selected_action_prompts
    : shuffled([
        ...referenceActionPools.movement_dynamics,
        ...referenceActionPools.posing_eye_contact,
        ...referenceActionPools.emotional_actions
      ]).slice(0, Math.min(8, frameCount));
  return {
    ...params,
    task_type: "kpop_dance_sequence_sheet",
    choreography_preset: "kpop_4x4_instruction_sheet",
    choreography_grid_layout: params.choreography_grid_layout || "4x4_16_frames",
    choreography_frame_count: frameCount,
    selected_action_prompts: selected,
    reference_identity_anchor: primaryRef,
    choreography_sequence_brief: [
      `Create a professional K-pop dance-sequence instruction sheet using ${primaryRef} as the base dancer identity.`,
      `Use a 4x4 grid when frame_count is 16, with evenly sized panels and clear numbering from 1 to ${frameCount}.`,
      "Each panel must show the same single female dancer with consistent face likeness, body proportions, hairstyle, outfit identity, accessories, and silhouette from the attached reference.",
      "Each frame must include a short move name, a precise full-body choreography pose, 3-4 concise instruction lines, and motion overlays.",
      "Use curved arrows for fluid movement, straight arrows for directional steps, circular indicators for turns/spins, weight-transfer markers, and body-isolation guide lines.",
      "Use a clean white background, thin black panel dividers, soft studio lighting, strong grayscale contrast, high-detail 3D concept-art rendering, and no background scene.",
      "Do not add color, extra characters, clutter, unrelated props, identity drift, face redesign, or body-proportion changes."
    ].join(" ")
  };
}

function imageInputGuidance(targets = []) {
  const configured = targets.length
    ? ` Current configured fallbacks: ${targets.map((target) => `${target.index}. ${target.provider}/${target.model}`).join("; ")}.`
    : "";
  return [
    "Image input is enabled for this run because one or more uploaded images were included.",
    "The selected fallback model is text-only and cannot read image_url/base64 image attachments.",
    `Choose a vision-capable model instead, for example: ${recommendedImageInputModels.join(", ")}.`,
    "Alternatively, remove the uploaded image(s) before running a text-only model.",
    configured
  ].join(" ");
}

function paramsWithoutImageData(value) {
  if (isImageDataUrl(value)) {
    return { type:"image", note:"Image data sent as compressed multimodal attachment." };
  }
  if (isImagePayload(value)) {
    return {
      type:"image",
      name:value.name,
      mimeType:value.mimeType,
      size:value.size,
      originalSize:value.originalSize,
      width:value.width,
      height:value.height,
      originalWidth:value.originalWidth,
      originalHeight:value.originalHeight,
      note:"Image data sent as compressed multimodal attachment."
    };
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
      image_url: { url:image.dataUrl, detail:"low" },
      name:image.name || `reference-image-${index + 1}`
    }))
  ];
}

function llmSystemPrompt(info, params) {
  const languageName = targetLanguageName(params);
  const cosmeticStoryboardVisualRules = info.id === "cosmatic_reference_storyboard"
    ? [
        "",
        "Product reference storyboard rules:",
        "- Preserve the referenced product shape, brand markings, material, proportions, and key design details.",
        "- Infer the product category and real-world usage method from the reference images, then design storyboard beats that show believable product interaction and application.",
        "- Product usage beats should include handling/opening/dispensing/applying/using/result moments when appropriate for the product type.",
        cosmeticUsageGuidance,
        handAnatomyGuidance,
        "- Do not show unrealistic use: never treat cosmetics as food/drink; do not apply products to the wrong facial area; do not use skincare like color makeup; do not use eye products on lips/cheeks unless the product is explicitly multi-use.",
        "- If generation_mode is multi_frame_storyboard, write the final prompt for a clean visual storyboard/contact sheet only.",
        "- For multi_frame_storyboard, the generated image itself must contain NO visible captions, NO frame descriptions, NO frame numbers, NO text boxes, NO lower-third bars, NO subtitles, and NO overlay labels. Preserve product packaging text, logos, and brand markings when they are part of the referenced product.",
        "- Describe the visual action/composition for each frame in the prompt text if useful, but explicitly instruct the image model to render image panels only without printed descriptions inside the panels.",
        "- If storyboard captions, layout labels, or descriptions would normally appear in a storyboard layout, replace them with clean image-only panels."
      ].join("\n")
    : "";
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
    cosmeticStoryboardVisualRules,
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

function hasItems(value) {
  return Array.isArray(value) && value.length > 0;
}

function promptHas(text, patterns) {
  return patterns.some((pattern) => pattern.test(text));
}

const cosmeticUsageGuidance = [
  "Cosmetic usage taxonomy:",
  "- Eyeliner or liquid liner: show cap/applicator opened, controlled line drawn along upper lash line, close eye/eyelid detail, wing or definition result; do not apply to lips or cheeks.",
  "- Lipstick, lip tint, or lip gloss: show cap removed or applicator wand, product applied directly to lips or with wand, lip close-up, color payoff/result; do not apply to eyes or face skin.",
  "- Compact powder, cushion, pressed powder, or foundation compact: show compact opened with mirror/puff/sponge, product picked up with puff/brush, patting onto cheeks/T-zone, soft matte/even complexion result.",
  "- Eyebrow pencil, brow gel, brow mascara, or brow pen: show spoolie/brush or pencil tip, shaping/filling brow hairs with short strokes, brow close-up, natural defined brow result; do not use as eyeliner unless explicitly labeled dual-use.",
  "- Eyeshadow palette or eye makeup palette: show palette opened, brush/applicator picking up a specific matte or shimmer shade, gentle application to eyelid/crease/lower lash line, blending/detail close-up, and finished polished eye makeup result; do not apply powder inside the eye or to lips.",
  "- Eyelash mascara: show wand removed from tube, brushing lashes from root to tip, eye/lash close-up, lifted separated lashes result; do not apply eyelash mascara to brows/lips.",
  "- Face cream, moisturizer, sunscreen, or night cream: show jar/tube/pump opened, small amount on fingertip/spatula/back of hand, dotting/spreading on cheeks/forehead/neck, hydrated/dewy/protected skin result.",
  "- Serum, essence, ampoule, or facial oil: show dropper/pump, few drops onto palm or fingertips, pressing/patting into face, glow/hydration result; avoid pouring large amounts.",
  "- Toner, essence toner, glycolic acid toner, or exfoliating acid toner: show cap/nozzle opened, small amount dispensed onto a cotton pad or palm, gentle sweeping/patting over face while avoiding eye and lip areas, then smoother brighter skin texture result; do not scrub harshly or pour directly over the face.",
  "- Micellar cleansing water or makeup remover: show flip cap opened, liquid poured onto cotton pad, gently wiping makeup or cleansing face/neck, bottle beside cotton pad, fresh clean-skin result; do not pour directly into hands as primary use.",
  "- Cleanser or face wash: show tube/pump opened, small amount in wet hands, gentle lather/massage on face, rinsed fresh result.",
  "- Perfume/fragrance: show bottle held upright, spray mist near pulse points/wrist/neck, elegant scent mood; do not apply like skincare cream."
].join("\n");

const handAnatomyGuidance = [
  "Hand anatomy and product-grip guard:",
  "- Hands must be anatomically plausible: natural left/right orientation, correct palm direction, realistic wrist rotation, correct thumb placement, five fingers only, no fused fingers, no extra fingers, no duplicated hands, no reversed palms, and no broken or rubbery joints.",
  "- Product grip must match real use: liner and brow pencils held like a pen, mascara/lip wand held by the handle, compact held from the edge, puff/cotton pad pinched naturally, serum dropper held vertically, cream applied with a simple fingertip gesture.",
  "- Prefer one clearly visible active hand per close-up when possible; avoid crossing two hands over the face, overlapping hands with bottles, or complex mirrored poses unless the anatomy is simple and readable.",
  "- If a product-use action is difficult, simplify the pose: show the product in one hand and the application surface clearly, with the other hand out of frame or softly cropped."
].join("\n");

function usageContextText(params = {}, prompt = "") {
  const textParts = [prompt];
  for (const key of ["product_type", "productType", "scene_descriptions", "topic", "description"]) {
    const value = params[key];
    if (Array.isArray(value)) textParts.push(value.join(" "));
    else if (value) textParts.push(String(value));
  }
  for (const image of collectImages(params)) textParts.push(String(image.name || ""));
  return textParts.join(" ").toLowerCase();
}

function cosmeticCategoryUsageRules(context) {
  const rules = [
    {
      id: "eyeliner_usage",
      label: "Eyeliner usage is realistic",
      match: /\b(eyeliner|eye liner|liquid liner|gel liner)\b|อายไลเนอร์/i,
      patterns: [/(lash line|eyelid|wing|draw.*line|applicator|liner tip)/i, /(เปลือกตา|ขอบตา|หางตา|เส้นไลเนอร์)/i],
      repair: "Eyeliner usage: show opening the liner, controlled applicator/pen tip near the eyelid, drawing along the upper lash line, optional wing detail, and a clean defined-eye result. Do not apply eyeliner to lips, cheeks, or unrelated surfaces."
    },
    {
      id: "lip_usage",
      label: "Lip product usage is realistic",
      match: /\b(lip\s?stick|lip\s?tint|lip\s?gloss|lip\s?balm|ลิปสติก|ลิปทินท์|ลิปกลอส)\b/i,
      patterns: [
        /((cap|applicator|wand|bullet|swipe|glide|apply|applying)[^.]{0,100}(lip|lips|mouth))|((lip|lips|mouth)[^.]{0,100}(close-up|color payoff|finish|moisturized|glossy))/i,
        /(เปิดฝา|หัวแปรง|แท่งลิป|ทา|ปาด)[^.]{0,80}(ริมฝีปาก|ปาก|สีปาก)/i
      ],
      repair: "Lip product usage: show cap/applicator opened, product applied to the lips with the bullet or wand, close-up lip detail, and a color payoff or moisturized-lip result. Do not apply lip product to eyes or cheeks."
    },
    {
      id: "compact_powder_usage",
      label: "Compact powder usage is realistic",
      match: /\b(compact powder|pressed powder|cushion|powder foundation|foundation compact|แป้งพับ|คุชชั่น)\b/i,
      patterns: [/(compact opened|mirror|puff|sponge|brush|patting|t-zone|complexion|matte)/i, /(เปิดตลับ|พัฟ|ฟองน้ำ|แปรง|ตบเบา|ผิวเนียน)/i],
      repair: "Compact powder usage: show compact opened with mirror and puff/sponge, product picked up from the pan, patting onto cheeks or T-zone, and a soft matte even-complexion result. Do not pour or smear it like liquid skincare."
    },
    {
      id: "eyebrow_usage",
      label: "Eyebrow product usage is realistic",
      match: /\b(eyebrow pencil|brow pencil|brow gel|brow mascara|eyebrow mascara|brow pen|ดินสอเขียนคิ้ว|มาสคาร่าคิ้ว|มาสคาร่าปัดคิ้ว|เจลคิ้ว|เขียนคิ้ว)\b/i,
      patterns: [
        /((spoolie|brush|pencil tip|short strokes|hair-like strokes|fill|shape|define)[^.]{0,100}(brow|eyebrow))|((brow|eyebrow)[^.]{0,100}(filled|shaped|defined|natural result|close-up))/i,
        /(แปรงคิ้ว|หัวดินสอ|เส้นสั้น|วาด|เติม|จัดทรง)[^.]{0,80}(คิ้ว|ทรงคิ้ว)/i
      ],
      repair: "Eyebrow product usage: show spoolie brushing or pencil tip, short hair-like strokes filling and shaping the brows, brow close-up, and natural defined-brow result. Do not use it as lipstick or skincare."
    },
    {
      id: "eyeshadow_palette_usage",
      label: "Eyeshadow palette usage is realistic",
      match: /\b(eyeshadow|eye shadow|eye palette|eyeshadow palette|makeup palette|eye makeup palette|อายแชโดว์|พาเลตต์ตา|พาเลทตา)\b/i,
      patterns: [
        /((palette|pan|shade|matte|shimmer|glitter)[^.]{0,140}(brush|applicator|pick|select|tap))|((brush|applicator)[^.]{0,140}(palette|pan|shade|matte|shimmer|glitter))/i,
        /(eyelid|crease|outer corner|lower lash line|inner corner|blend|blending|eye makeup|finished eye look)/i,
        /(เปลือกตา|เบ้าตา|หางตา|ขอบตาล่าง|แปรง|พาเลตต์|อายแชโดว์|เกลี่ย|สีชิมเมอร์|สีแมตต์)/i
      ],
      repair: "Eyeshadow palette usage: show the palette opened, brush/applicator picking up a specific matte or shimmer shade from the pan, gentle application to eyelid/crease/lower lash line or outer corner, soft blending detail, and a finished polished eye makeup result. Keep powder on eyelid/skin around the eye only; do not place powder inside the eye, on lips, or on unrelated face areas."
    },
    {
      id: "mascara_usage",
      label: "Eyelash mascara usage is realistic",
      match: /\b(eyelash mascara|lash mascara|mascara|มาสคาร่าขนตา|มาสคาร่า)\b/i,
      exclude: /\b(eyebrow mascara|brow mascara)\b|มาสคาร่าคิ้ว|มาสคาร่าปัดคิ้ว/i,
      patterns: [/(wand|lashes|root to tip|brushing lashes|lifted lashes)/i, /(ขนตา|ปัดขนตา|แปรงมาสคาร่า)/i],
      repair: "Eyelash mascara usage: show wand removed from tube, brushing lashes from root to tip, eye/lash close-up, and lifted separated lashes result. Do not apply eyelash mascara to brows, lips, cheeks, or skin."
    },
    {
      id: "cream_usage",
      label: "Cream or moisturizer usage is realistic",
      match: /\b(cream|moisturizer|sunscreen|night cream|ครีม|มอยส์เจอไรเซอร์|กันแดด)\b/i,
      patterns: [/(jar|tube|pump|fingertip|spatula|dotting|spread.*face|neck|hydrated|dewy)/i, /(กระปุก|หลอด|ปั๊ม|ปลายนิ้ว|ทา|เกลี่ย|ชุ่มชื้น)/i],
      repair: "Cream/moisturizer usage: show opening jar/tube/pump, small amount on fingertip/spatula/back of hand, dotting and spreading on cheeks/forehead/neck, and hydrated/dewy/protected skin result. Do not use it like makeup color product."
    },
    {
      id: "serum_usage",
      label: "Serum usage is realistic",
      match: /\b(serum|essence|ampoule|facial oil|เซรั่ม|เอสเซนส์)\b/i,
      exclude: /\b(toner|essence toner|acid toner|exfoliating toner)\b|โทนเนอร์/i,
      patterns: [/(dropper|pump|drops|palm|fingertips|patting|press.*skin|glow|hydration)/i, /(ดรอปเปอร์|หยด|ฝ่ามือ|ปลายนิ้ว|ตบเบา|ผิวโกลว์)/i],
      repair: "Serum usage: show dropper/pump, a few drops onto palm or fingertips, pressing/patting into the face, and a glow/hydration result. Avoid pouring excessive product."
    },
    {
      id: "toner_usage",
      label: "Toner or exfoliating acid toner usage is realistic",
      match: /\b(toner|essence toner|glycolic acid|salicylic acid toner|exfoliating toner|aha|bha|pha|โทนเนอร์|กรดไกลโคลิก)\b/i,
      patterns: [
        /((cap|nozzle|flip top|open|dispense|pour|drops?)[^.]{0,140}(cotton pad|palm|hand|fingertips|toner))|((cotton pad|palm|fingertips)[^.]{0,140}(sweep|swipe|pat|apply|toner))/i,
        /(avoid|avoiding|do not apply)[^.]{0,100}(eye area|eyes|lips|broken skin)|((smooth|brighter|glow|radiance|texture)[^.]{0,100}(skin|result))/i,
        /(โทนเนอร์|สำลี|หยด|เท|เช็ด|ตบเบา|หลีกเลี่ยง)[^.]{0,100}(รอบดวงตา|ริมฝีปาก|ผิว|หน้า)/i
      ],
      repair: "Toner/exfoliating acid toner usage: show cap or nozzle opened, a small amount dispensed onto a cotton pad or palm, gentle sweeping/patting across face or target skin while avoiding eye and lip areas, and a smoother brighter skin-texture result. For glycolic/salicylic/AHA/BHA toners, use a gentle thin layer, do not scrub harshly, do not pour directly over the face, and imply sensible skincare routine care."
    },
    {
      id: "acid_toner_care",
      label: "Acid toner care constraints are realistic",
      match: /\b(glycolic acid|salicylic acid|lactic acid|mandelic acid|aha|bha|pha|acid toner|exfoliating toner|กรดไกลโคลิก)\b/i,
      patterns: [
        /(avoid|avoiding|do not apply|keep away)[^.]{0,120}(eye area|eyes|lips|mouth|broken skin)/i,
        /(gentle|thin layer|do not scrub|no harsh rubbing|sunscreen|daytime sunscreen|patch test|sensitive skin)/i,
        /(หลีกเลี่ยง|ห้ามใช้)[^.]{0,120}(รอบดวงตา|ดวงตา|ริมฝีปาก|ผิวถลอก)|((บาง ๆ|อ่อนโยน|กันแดด|ไม่ถูแรง)[^.]{0,120}(ผิว|หน้า))/i
      ],
      repair: "Acid toner care: because this is a glycolic/salicylic/AHA/BHA-style toner, show a gentle thin-layer application and explicitly avoid the eye area, lips, and irritated or broken skin. Do not scrub harshly, do not pour directly over the face, and imply sensible skincare care such as hydration and daytime sunscreen after exfoliating acids."
    },
    {
      id: "micellar_usage",
      label: "Micellar or makeup remover usage is realistic",
      match: /\b(micellar|cleansing water|makeup remover|เมคอัพรีมูฟเวอร์|คลีนซิ่งวอเตอร์)\b/i,
      patterns: [/(flip cap|cotton pad|pour.*cotton|wipe|cleanse|remove makeup|fresh clean)/i, /(เปิดฝา|สำลี|เท.*สำลี|เช็ด|ล้างเครื่องสำอาง|ผิวสะอาด)/i],
      repair: "Micellar cleansing water usage: show flip cap opened, liquid poured onto a cotton pad, gently wiping makeup or cleansing face/neck, bottle beside cotton pad, and a fresh clean-skin result. Do not pour directly into hands as the primary use or treat it as perfume/lotion."
    }
  ];
  return rules.filter((rule) => rule.match.test(context) && !(rule.exclude && rule.exclude.test(context)));
}

function productStoryboardCompletenessRules(params = {}, prompt = "", infoId = "") {
  const effectiveInfoId = infoId || "cosmatic_reference_storyboard";
  const mode = String(params.generation_mode || params.generationMode || "").toLowerCase();
  const isMultiFrame = mode === "multi_frame_storyboard" ||
    ((mode === "auto" || !mode) && (
      effectiveInfoId === "cosmatic_reference_storyboard" ||
      effectiveInfoId === "furniture-reference-storyboard" ||
      /(3x3|grid|panels|contact sheet|storyboard|frame \d)/i.test(prompt)
    ));
  return [
    {
      id: "usable_prompt",
      label: "Prompt is non-empty and generation-ready",
      required: true,
      test: (text) => text.trim().length >= 80,
      repair: "Write this as a complete, directly usable image-generation prompt with clear subject, scene, composition, lighting, and output constraints."
    },
    {
      id: "product_lock",
      label: "Product identity and geometry are protected",
      required: true,
      test: (text) => promptHas(text, [
        /preserve[^.]{0,120}(product|shape|geometry|logo|brand|material|proportion|design)/i,
        /(bottle|cap|label|logo|packaging|base|button|control panel|grille|cage|motor housing|standing column|pedestal|Hatari|Garnier)[^.]{0,180}(preserve|exact|same|match|lock)/i,
        /(product|สินค้า)[^.]{0,120}(lock|identity|geometry|shape|material|logo|brand|preservation|คง|รักษา)/i,
        /(do not|must not|no)[^.]{0,120}(redesign|alter|change)[^.]{0,80}(product|logo|brand|shape|geometry)/i
      ]),
      repair: "Product lock: preserve the exact product from the reference images, including silhouette, proportions, geometry, material/transparency, color palette, cap/top shape, label layout, logo/brand placement, barcode or fine label areas when present, control/button layout when present, surface finish, and all key packaging or industrial-design details; do not redesign, simplify, distort, relabel, recolor, replace, invent a different product, change the container shape, change the cap color/shape, change label hierarchy, or hide the product."
    },
    {
      id: "negative_constraints",
      label: "Negative constraints are present",
      required: true,
      test: (text) => promptHas(text, [
        /negative constraints?/i,
        /\b(no|avoid|must not|do not)\b[^.]{0,160}(text|watermark|distort|deform|redesign|extra logo|caption|subtitle|label)/i,
        /ห้าม[^.]{0,160}(ตัวหนังสือ|ลายน้ำ|บิดเบี้ยว|เปลี่ยน|ฉลาก|คำบรรยาย)/i
      ]),
      repair: "Negative constraints: no watermark, no extra logos, no wrong brand text, no fake labels, no product redesign, no altered packaging silhouette, no wrong bottle/cap shape, no wrong label layout, no altered grille/base/button pattern when the product is mechanical, no distorted geometry, no warped controls, no duplicated product, no missing key product parts, no unrelated props blocking the product, no low-resolution blur, and no visible text overlays unless explicitly requested."
    },
    {
      id: "product_variant_consistency",
      label: "Multiple product references keep variant logic consistent",
      required: Array.isArray(params.reference_product_images) && params.reference_product_images.length > 1,
      test: (text) => promptHas(text, [
        /(choose|select|hero|primary)[^.]{0,120}(variant|formula|shade|color|bottle|palette|compact|case|product)/i,
        /(variant|formula|shade|color|bottle|palette|compact|case|pan layout|packaging)[^.]{0,180}(consistent|same|do not blend|do not mix|lineup|all variants|three variants|multiple variants)/i,
        /(สูตร|สี|รุ่น|ขวด|พาเลตต์|ตลับ)[^.]{0,120}(เดียวกัน|เลือก|หลัก|ห้ามผสม|หลายสูตร|ทุกสูตร)/i
      ]),
      repair: "Product variant consistency: when multiple product reference images show different variants, formulas, colors, scents, shades, palette layouts, or packaging colors, do not blend them into one mixed product. Choose one clear hero variant for the storyboard and preserve that variant's exact packaging color, container/case shape, cap/lid/closure when present, palette pan layout when present, logo placement, formula or shade text, and packaging details across every frame; alternatively, if showing multiple variants, present them intentionally as a neat lineup while keeping each variant visually distinct."
    },
    {
      id: "usage_intelligence",
      label: "Storyboard includes realistic product usage beats",
      required: effectiveInfoId === "cosmatic_reference_storyboard" && isMultiFrame,
      test: (text) => promptHas(text, [
        /(use|usage|routine|application|apply|open|pour|dispense|wipe|cleanse|remove makeup|cotton pad|hands|skin|before\/after|result)/i,
        /(วิธีใช้|ใช้งาน|เปิด|เท|หยด|ปั๊ม|บีบ|ทา|เช็ด|สำลี|ผิว|ผลลัพธ์)/i
      ]),
      repair: `Product usage intelligence: infer the real-world use method from the cosmetic product category and include believable usage beats in the storyboard. Include handling/opening, dispensing or product pickup, correct application/use, and a result/benefit moment. Do not invent impossible usage or use the product in an unrelated way.\n${cosmeticUsageGuidance}`
    },
    {
      id: "hand_anatomy_guard",
      label: "Hands and product grips are anatomically plausible",
      required: isMultiFrame,
      test: (text) => promptHas(text, [
        /(hand anatomy|anatomically plausible|natural left\/right|correct thumb|five fingers|no fused fingers|no extra fingers|no reversed palms|realistic wrist)/i,
        /(product grip|held like a pen|held by the handle|pinched naturally|simple fingertip gesture|one clearly visible active hand)/i,
        /(มือ|นิ้ว|ข้อมือ|นิ้วโป้ง|ฝ่ามือ)[^.]{0,140}(สมจริง|ถูกธรรมชาติ|ไม่สลับ|ไม่ผิดด้าน|ไม่เกิน|ไม่ติดกัน)/i
      ]),
      repair: handAnatomyGuidance
    },
    ...(effectiveInfoId === "cosmatic_reference_storyboard" ? cosmeticCategoryUsageRules(usageContextText(params, prompt)) : []).map((rule) => ({
      id: rule.id,
      label: rule.label,
      required: isMultiFrame,
      test: (text) => promptHas(text, rule.patterns),
      repair: rule.repair
    })),
    {
      id: "character_lock",
      label: "Character continuity is protected when character references exist",
      required: hasItems(params.reference_character_images),
      test: (text) => promptHas(text, [
        /(character|person|model|woman|man|face|identity|wardrobe|hair|skin)[^.]{0,120}(preserve|consistent|lock|same|continuity)/i,
        /(preserve|consistent|lock|same)[^.]{0,120}(character|person|model|face|identity|wardrobe|hair)/i,
        /(ตัวละคร|คน|ใบหน้า|เสื้อผ้า|ทรงผม)[^.]{0,120}(คง|เหมือนเดิม|ต่อเนื่อง)/i
      ]),
      repair: "Character lock: if a person appears, preserve the same identity, face structure, hairstyle, wardrobe, body proportions, expression style, and styling continuity across every frame."
    },
    {
      id: "environment_lock",
      label: "Environment continuity is protected when environment references exist",
      required: hasItems(params.reference_environment_images),
      test: (text) => promptHas(text, [
        /(environment|room|location|setting|background|lighting|color palette|mood)[^.]{0,120}(preserve|consistent|same|continuity|lock)/i,
        /(preserve|consistent|same|continuity|lock)[^.]{0,120}(environment|room|location|setting|background|lighting|color palette|mood)/i,
        /(ฉาก|สถานที่|พื้นหลัง|แสง|โทนสี)[^.]{0,120}(คง|เหมือนเดิม|ต่อเนื่อง)/i
      ]),
      repair: "Environment lock: preserve the referenced location, background layout, lighting direction, color palette, mood, furniture/props relationship, and spatial continuity across the storyboard."
    },
    {
      id: "multi_frame_image_only",
      label: "Multi-frame storyboard forbids visible frame text",
      required: isMultiFrame,
      test: (text) => promptHas(text, [
        /image-only[^.]{0,120}(panels|storyboard|contact sheet)/i,
        /\b(no|without|must not contain)[^.]{0,180}(captions|frame numbers|text boxes|lower-third|subtitles|overlay labels|visible frame descriptions|storyboard labels)/i,
        /ห้าม[^.]{0,180}(เลขเฟรม|คำบรรยาย|กล่องข้อความ|ซับไตเติล|ตัวหนังสือ|ข้อความ)/i
      ]),
      repair: "Multi-frame storyboard visual rule: render a clean image-only storyboard/contact sheet with visual panels only; the image must contain no frame numbers, no captions, no text boxes, no lower-third description bars, no subtitles, no overlay labels, no storyboard layout typography, and no visible frame descriptions. Preserve real product packaging text, logos, and brand markings when they are part of the referenced product."
    },
    {
      id: "cabinet_drawer_fidelity",
      label: "Cabinet and drawer fidelity, materials, handle styling, and legless/leg locks",
      required: effectiveInfoId === "furniture-reference-storyboard" && (
        /(drawer|cabinet|dresser|chest of drawers|wardrobe|storage|sideboard|buffet|credenza)/i.test(prompt) ||
        /(drawer|cabinet|dresser|chest of drawers|wardrobe|storage|sideboard|buffet|credenza)/i.test(String(params.product_type || params.productType || ""))
      ),
      test: (text) => {
        const hasLock = promptHas(text, [
          /(preserve|lock|exact)[^.]{0,120}(drawer count|drawer layout|drawer fronts|recessed scoop|handleless|keyholes|lock holes|no legs|legless|flat base|plinth)/i,
          /(do not|must not|no)[^.]{0,120}(add legs|invent legs|change material)/i
        ]);
        const hasBaseStance = promptHas(text, [
          /(no legs|legless|flat base|flat-bottom|sits flatly on the floor|no feet|plinth base|tapered legs|wooden legs|metal legs|exposed feet)/i,
          /ไม่มีขา|ติดพื้น|ฐานแบน|ไม่มีขาตั้ง/i
        ]);
        return hasLock && hasBaseStance;
      },
      repair: "Cabinet & drawer fidelity rule: preserve the exact drawer/cabinet configuration, drawer count, panel lines, handle type (e.g. recessed scoop handles, groove handles, knobs, or handleless flat fronts), presence of keyholes or lock holes, and the base structure from the reference images. If the product is legless or sits flat on a low base or plinth with no legs, strictly enforce \"no legs, legless, no tapered legs, no wooden feet, sits flat on the floor base\" in every panel. Do not invent legs, do not change material (e.g., do not turn plastic drawers into wood or vice-versa), do not invent metal slide rails or wooden drawer interiors unless clearly visible in the reference, and do not add generic handles or slit cuts that differ from the reference."
    },
    {
      id: "borderless_layout",
      label: "Borderless contiguous grid with zero divider lines, gutters, or borders",
      required: isMultiFrame,
      test: (text) => {
        const hasPositive = promptHas(text, [
          /(borderless|seamless|contiguous|edge-to-edge)[^.]{0,120}(grid|panels|layout|frames)/i
        ]);
        const hasNegative = promptHas(text, [
          /(no|without|zero|must not contain|ban|exclude|remove)[^.]{0,180}(white divider|divider line|panel divider|border|gutter|margin|separator line|graphic divider|frame outline|grid separator|white line)/i,
          /ไม่มี[^.]{0,180}(เส้นคั่น|เส้นสีขาว|ช่องว่างระหว่าง|รอยต่อ|ขอบเฟรม|เส้นสีขาวคั่น)/i
        ]);
        return hasPositive && hasNegative;
      },
      repair: "Borderless contiguous layout rule: the storyboard must be a clean 100% borderless, seamless, contiguous grid where all panels touch perfectly edge-to-edge. There must be zero white divider lines, zero black lines, zero colored borders, zero gutters, zero margins, and zero frame separator lines between the panels. Every panel must have mathematically identical height and width, forming a perfectly aligned grid with no gaps or margins to allow clean automatic cropping and frame slicing."
    }
  ];
}

export function checkAndRepairProductStoryboardPrompt(prompt, params = {}, infoId = "") {
  const originalPrompt = String(prompt || "").trim();
  const rules = productStoryboardCompletenessRules(params, originalPrompt, infoId);
  const checks = rules.map((rule) => ({
    id: rule.id,
    label: rule.label,
    required: Boolean(rule.required),
    passed: !rule.required || rule.test(originalPrompt)
  }));
  const missing = checks.filter((check) => check.required && !check.passed).map((check) => check.id);
  const repairs = rules.filter((rule) => missing.includes(rule.id)).map((rule) => rule.repair);
  const repairedPrompt = repairs.length
    ? [originalPrompt, "Prompt completeness guard:", ...repairs.map((repair) => `- ${repair}`)].filter(Boolean).join("\n\n")
    : originalPrompt;
  return {
    prompt: repairedPrompt,
    qualityCheck: {
      passed: missing.length === 0,
      fixed: repairs.length ? missing : [],
      missing,
      checks
    }
  };
}

function applyPromptCompletenessCheck(result, info, params = {}) {
  if (info.id !== "cosmatic_reference_storyboard" && info.id !== "furniture-reference-storyboard") return result;
  const output = result.output && typeof result.output === "object" ? result.output : {};
  const checked = checkAndRepairProductStoryboardPrompt(output.prompt, params, info.id);
  const qualityCheck = {
    skill_id: info.id,
    checked_at: new Date().toISOString(),
    ...checked.qualityCheck
  };
  return {
    ...result,
    output: {
      ...output,
      prompt: checked.prompt,
      metadata: {
        ...(output.metadata && typeof output.metadata === "object" ? output.metadata : {}),
        prompt_quality_check: qualityCheck
      },
      quality_check: qualityCheck
    },
    review: {
      ...(result.review && typeof result.review === "object" ? result.review : {}),
      prompt_quality_check: qualityCheck
    },
    warnings: qualityCheck.fixed.length
      ? [...(Array.isArray(result.warnings) ? result.warnings : []), `Prompt completeness check auto-fixed: ${qualityCheck.fixed.join(", ")}`]
      : result.warnings
  };
}

function normalizeLlmResult(parsed, info, params = {}) {
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
  return applyPromptCompletenessCheck({
    ...result,
    output: {
      ...output,
      prompt: prompt === undefined || prompt === null ? "" : String(prompt).trim(),
      article: article === undefined || article === null ? "" : String(article).trim()
    }
  }, info, params);
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
    const parsed = normalizeLlmResult(parseLlmJson(text), info, params);
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
  const rows = fallbackTargets(resolveStoredLlmConfig(body.llmConfig));
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
      const result = await testChatCompletion(target);
      recordSuccessfulLlmUsage({ llm: { provider: result.provider, model: result.model } }, target);
      results.push(result);
    } catch (error) {
      results.push({
        ok: false,
        rank: target.index,
        provider: target.provider,
        model: target.model,
        error: redactSecrets(error.message || "LLM test failed", [target.apiKey])
      });
    }
  }
  sendJson(res, results.some((item) => item.ok) ? 200 : 400, { results });
}

async function handleGetConfig(_req, res) {
  if (!appConfigStore) {
    sendJson(res, 500, {
      error: appConfigStoreInitError ? "Config database is unavailable." : "Config database is not initialized."
    });
    return;
  }
  try {
    sendJson(res, 200, { config: appConfigStore.getConfig() });
  } catch (error) {
    console.error(`Unable to read app config: ${error.message}`);
    sendJson(res, 500, { error: "Unable to read app config." });
  }
}

async function handleSaveConfig(req, res) {
  if (!appConfigStore) {
    sendJson(res, 500, {
      error: appConfigStoreInitError ? "Config database is unavailable." : "Config database is not initialized."
    });
    return;
  }
  const body = await readJson(req);
  try {
    sendJson(res, 200, { config: appConfigStore.saveConfig(body.config || body) });
  } catch (error) {
    console.error(`Unable to save app config: ${error.message}`);
    sendJson(res, 500, { error: "Unable to save app config." });
  }
}

async function handleRevealConfigSecret(req, res) {
  if (!appConfigStore) {
    sendJson(res, 500, {
      error: appConfigStoreInitError ? "Config database is unavailable." : "Config database is not initialized."
    });
    return;
  }
  const body = await readJson(req);
  const providerId = String(body.provider || "").toLowerCase();
  try {
    const privateConfig = appConfigStore.getConfig({ includeSecrets: true });
    if (!Object.hasOwn(privateConfig.providers || {}, providerId)) {
      sendJson(res, 404, { error: "Unsupported provider." });
      return;
    }
    const apiKey = String(privateConfig.providers[providerId]?.apiKey || "");
    if (!apiKey) {
      sendJson(res, 404, { error: "No saved API key for this provider." });
      return;
    }
    sendJson(res, 200, { provider: providerId, apiKey });
  } catch (error) {
    console.error(`Unable to reveal app config secret: ${error.message}`);
    sendJson(res, 500, { error: "Unable to reveal saved API key." });
  }
}

async function handleClearConfig(_req, res) {
  if (!appConfigStore) {
    sendJson(res, 500, {
      error: appConfigStoreInitError ? "Config database is unavailable." : "Config database is not initialized."
    });
    return;
  }
  try {
    sendJson(res, 200, { config: appConfigStore.clearConfig() });
  } catch (error) {
    console.error(`Unable to clear app config: ${error.message}`);
    sendJson(res, 500, { error: "Unable to clear app config." });
  }
}

async function handleRotateConfigKey(_req, res) {
  if (!appConfigStore) {
    sendJson(res, 500, {
      error: appConfigStoreInitError ? "Config database is unavailable." : "Config database is not initialized."
    });
    return;
  }
  const previousKey = process.env[encryptionKeyEnvName];
  const nextKey = generateConfigEncryptionKey();
  try {
    setEnvValue(encryptionKeyEnvName, nextKey);
    const config = appConfigStore.rotateEncryptionKey(nextKey);
    sendJson(res, 200, { config, rotated: true });
  } catch (error) {
    if (previousKey) {
      try {
        setEnvValue(encryptionKeyEnvName, previousKey);
      } catch (restoreError) {
        console.error(`Unable to restore encryption key after rotate failure: ${restoreError.message}`);
      }
    }
    console.error(`Unable to rotate config encryption key: ${error.message}`);
    sendJson(res, 500, { error: "Unable to rotate config encryption key." });
  }
}

async function handleProviderTest(req, res, providerId) {
  if (!appConfigStore) {
    sendJson(res, 500, {
      error: appConfigStoreInitError ? "Config database is unavailable." : "Config database is not initialized."
    });
    return;
  }
  const id = String(providerId || "").toLowerCase();
  if (!supportedProviderServiceIds().includes(id)) {
    sendJson(res, 404, { error: "Unsupported provider service." });
    return;
  }
  try {
    const config = appConfigStore.getConfig({ includeSecrets: true });
    const result = await testProviderService(id, config.providers?.[id], {
      timeoutMs: Math.min(llmRequestTimeoutMs, 15000)
    });
    sendJson(res, result.ok ? 200 : 400, { result });
  } catch (error) {
    sendJson(res, 500, { error: error.message || "Provider service test failed." });
  }
}

async function handleLlmUsage(_req, res) {
  if (!usageStore) {
    sendJson(res, 500, {
      error: usageStoreInitError ? "Usage database is unavailable." : "Usage database is not initialized."
    });
    return;
  }
  try {
    sendJson(res, 200, { rows: usageStore.listUsage() });
  } catch (error) {
    console.error(`Unable to read LLM usage: ${error.message}`);
    sendJson(res, 500, { error: "Unable to read LLM usage." });
  }
}

async function runLlmSkill(info, params, llmConfig, onStatus = null) {
  const targets = configuredFallbacks(llmConfig);
  if (!targets.length) {
    throw new Error("No usable LLM config found. Open Config, add an API key, and choose at least one fallback model.");
  }
  const imageCount = collectImages(params).length;
  if (imageCount && !targets.some(modelSupportsImageInput)) {
    throw new Error(imageInputGuidance(targets));
  }
  const errors = [];
  for (const target of targets) {
    if (imageCount && !modelSupportsImageInput(target)) {
      const error = imageInputGuidance([target]);
      onStatus?.({ phase:"failed", rank:target.index, provider:target.provider, model:target.model, error });
      errors.push({
        rank: target.index,
        provider: target.provider,
        model: target.model,
        error
      });
      continue;
    }
    try {
      onStatus?.({ phase:"calling", rank:target.index, provider:target.provider, model:target.model });
      const result = await postChatCompletion(target, info, params);
      const usageRecorded = recordSuccessfulLlmUsage(result, target);
      const model = result.llm?.model || target.model;
      const execution = { type:"llm", provider:target.provider, model, fallbackRank:target.index };
      onStatus?.({ phase:"success", rank:target.index, provider:target.provider, model });
      return { ...result, execution, usageRecorded, fallbackErrors: errors, lastSuccessfulLlm:{ provider:target.provider, model, fallbackRank:target.index } };
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
  const requestedLlm = body.useLlm === true;
  let params = body.params && typeof body.params === "object" ? body.params : body;
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
  params = applyInputDefaults(params, info.inputSchema, skillId);
  const required = info.inputSchema.required || [];
  const missing = required.filter((field) => params[field] === undefined || params[field] === null || params[field] === "");
  if (missing.length) {
    const error = new Error(`Missing required field(s): ${missing.join(", ")}`);
    error.status = 400;
    throw error;
  }
  const llmConfig = resolveStoredLlmConfig(body.llmConfig && typeof body.llmConfig === "object" ? body.llmConfig : null);
  const hasConfiguredLlm = configuredFallbacks(llmConfig).length > 0;
  if (!hasConfiguredLlm && !info.hasRuntime) {
    const error = new Error(`Skill "${skillId}" has no local runtime. Open Config, add an OpenRouter or NVIDIA API key, and choose at least one fallback model.`);
    error.status = 400;
    throw error;
  }
  const enrichedParams = enrichKpopChoreographyParams(info, enrichReferenceLockedCharacterParams(info, params));
  const preferLocalRuntime = info.hasRuntime && quickStartSkillSections[skillId] && !requestedLlm;
  if (hasConfiguredLlm && !preferLocalRuntime) {
    return await runLlmSkill(info, enrichedParams, llmConfig, onStatus);
  }
  const execution = { type:"local_runtime", provider:"local-python", model:"python/skill.py" };
  onStatus?.({ phase:"local_runtime", provider:execution.provider, model:execution.model });
  const result = await runPythonSkill(skillId, { params: enrichedParams });
  if (result && typeof result === "object" && !Array.isArray(result)) {
    return { ...result, execution };
  }
  return { success:true, output:result, execution };
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
  const invalidSkills = [];
  for (const entry of entries) {
    if (!entry.isDirectory()) continue;
    const info = await inspectSkill(entry.name);
    const summary = {
      id: info.id,
      title: info.title,
      titleTh: info.titleTh,
      description: info.description,
      descriptionTh: info.descriptionTh,
      hasRuntime: info.hasRuntime,
      issues: info.issues
    };
    if (info.isValid) {
      skills.push({
        ...summary,
        issueCount: info.issues.length
      });
    } else {
      invalidSkills.push(summary);
    }
  }
  skills.sort((a, b) => a.title.localeCompare(b.title));
  invalidSkills.sort((a, b) => a.title.localeCompare(b.title));
  sendJson(res, 200, { defaultSkillId, skills, invalidSkills });
}

async function handleUiSchema(req, res) {
  const url = new URL(req.url, `http://${req.headers.host}`);
  const skillId = safeSkillId(url.searchParams.get("skill") || defaultSkillId);
  const info = await inspectSkill(skillId);
  if (!info.isValid) {
    sendJson(res, 422, {
      error: `Skill "${skillId}" is invalid and cannot be loaded.`,
      skill: {
        id: info.id,
        title: info.title,
        titleTh: info.titleTh,
        description: info.description,
        descriptionTh: info.descriptionTh,
        hasRuntime: info.hasRuntime,
        issues: info.issues
      }
    });
    return;
  }
  const { inputSchema } = info;
  const uiSchema = normalizeUiSchemaForApp(inputSchema, info.uiSchema, info.id);
  const displayInputSchema = quickStartSkillSections[info.id]
    ? { ...inputSchema, required: ["reference_images"] }
    : inputSchema;
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
      hasRuntime: info.hasRuntime,
      issues: info.issues
    },
    inputSchema: displayInputSchema,
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
  const staticRoot = resolveStaticRoot();
  const filePath = join(staticRoot, safePath);

  if (!isSafeStaticPath(staticRoot, filePath, requested)) {
    res.writeHead(403, { "content-type": "text/plain; charset=utf-8" });
    res.end("Forbidden");
    return;
  }

  try {
    const file = await readFile(filePath);
    res.writeHead(200, { "content-type": mimeTypes[extname(filePath)] || "application/octet-stream" });
    res.end(file);
  } catch {
    const fallback = await readFile(join(staticRoot, "index.html"));
    res.writeHead(200, { "content-type": mimeTypes[".html"] });
    res.end(fallback);
  }
}

export const requestHandler = async (req, res) => {
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
    if (req.method === "GET" && req.url === "/api/llm-usage") {
      await handleLlmUsage(req, res);
      return;
    }
    if (req.method === "GET" && req.url === "/api/config") {
      if (!checkConfigAccess(req, res)) return;
      await handleGetConfig(req, res);
      return;
    }
    if (req.method === "POST" && req.url === "/api/config") {
      if (!checkConfigAccess(req, res)) return;
      await handleSaveConfig(req, res);
      return;
    }
    if (req.method === "POST" && req.url === "/api/config/reveal") {
      if (!checkConfigAccess(req, res)) return;
      await handleRevealConfigSecret(req, res);
      return;
    }
    if (req.method === "DELETE" && req.url === "/api/config") {
      if (!checkConfigAccess(req, res)) return;
      await handleClearConfig(req, res);
      return;
    }
    if (req.method === "POST" && req.url === "/api/config/rotate-key") {
      if (!checkConfigAccess(req, res)) return;
      await handleRotateConfigKey(req, res);
      return;
    }
    const providerTest = req.url.match(/^\/api\/providers\/([a-z0-9_-]+)\/test$/i);
    if (req.method === "POST" && providerTest) {
      if (!checkConfigAccess(req, res)) return;
      await handleProviderTest(req, res, providerTest[1]);
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
};

function listen(port, attemptsLeft = maxPortAttempts) {
  const server = createServer(requestHandler);

  server.once("error", (error) => {
    if (error.code === "EADDRINUSE" && attemptsLeft > 1) {
      const nextPort = port + 1;
      console.warn(`Port ${port} is already in use. Trying ${nextPort}...`);
      server.close();
      listen(nextPort, attemptsLeft - 1);
      return;
    }

    if (error.code === "EADDRINUSE") {
      console.error(`Port ${port} is already in use. Stop the existing server or set PORT to another value.`);
      process.exitCode = 1;
      return;
    }

    console.error(error);
    process.exitCode = 1;
  });

  server.listen(port, () => {
    console.log(`Single-file skill runner available at http://localhost:${port}`);
  });
}

if (process.argv[1] && normalize(process.argv[1]) === normalize(__filename)) {
  initializeUsageStore();
  initializeAppConfigStore();
  listen(preferredPort);
}
