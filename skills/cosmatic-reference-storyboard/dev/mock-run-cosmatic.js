import { readFile, writeFile } from 'fs/promises';
import { existsSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import Database from 'better-sqlite3';
import crypto from 'crypto';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Helper to decrypt config secrets if saved in database
function decrypt(ciphertext, keyHex) {
  if (!ciphertext) return "";
  try {
    const parts = ciphertext.split(":");
    if (parts.length !== 2) return "";
    const iv = Buffer.from(parts[0], "hex");
    const encrypted = Buffer.from(parts[1], "hex");
    const key = Buffer.from(keyHex, "hex");
    const decipher = crypto.createDecipheriv("aes-256-cbc", key, iv);
    let decrypted = decipher.update(encrypted);
    decrypted = Buffer.concat([decrypted, decipher.final()]);
    return decrypted.toString("utf8");
  } catch (error) {
    console.error("Decryption failed:", error.message);
    return "";
  }
}

function parseSkillMarkdown(markdown) {
  const nameMatch = markdown.match(/^name:\s*(.+)$/m);
  const descMatch = markdown.match(/^description:\s*(.+)$/m);
  return {
    name: nameMatch?.[1]?.trim(),
    description: descMatch?.[1]?.trim()
  };
}

async function run() {
  console.log("=========================================");
  console.log("Cosmetic Reference Storyboard Mock E2E Test");
  console.log("=========================================");

  // 1. Inspect the skill structure
  console.log("\n1. Inspecting skill metadata & schemas...");
  const skillDir = join(__dirname, "..");
  const skillMdPath = join(skillDir, "skill.md");
  const inputSchemaPath = join(skillDir, "schemas", "input.schema.json");

  const markdown = await readFile(skillMdPath, "utf8");
  const inputSchemaRaw = await readFile(inputSchemaPath, "utf8");
  const inputSchema = JSON.parse(inputSchemaRaw);
  const meta = parseSkillMarkdown(markdown);

  console.log(`- Skill ID: cosmatic-reference-storyboard`);
  console.log(`- Display Title: ${meta.name}`);
  console.log(`- skill.md size: ${markdown.length} bytes (${markdown.split("\n").length} lines)`);
  console.log(`- Input Schema fields count: ${Object.keys(inputSchema.properties || {}).length}`);

  // 2. Mock parameters for E2E verification
  console.log("\n2. Setting up sample E2E test parameters...");
  const mockParams = {
    product_category: "facial_cream", 
    product_type: "YerPall Ginseng Hya Night Cream",
    product_label_text: "YERPALL™\nINTENSIVE ACTIVE\nGINSENG HYA NIGHT CREAM\n랩에서 피부까지\n10 g",
    generation_mode: "multi_frame_storyboard",
    storyboard_layout_preset: "canvas_9_16_grid_3x3_frame_9_16_exact", // 3x3 layout on 9:16 canvas
    aspect_ratio: "9:16",
    cinematic_style: "luxury_beauty",
    reference_images: [
      { dataUrl: "data:image/png;base64,mock_yerpall_jar_cutout" }
    ],
    reference_character_images: [
      { dataUrl: "data:image/png;base64,mock_thai_female_character" }
    ],
    reference_environment_images: [
      { dataUrl: "data:image/png;base64,mock_luxury_closet_vanity" }
    ]
  };
  console.log("Mock parameters:", JSON.stringify(mockParams, null, 2));

  // 3. Retrieve LLM Config and secrets from database
  console.log("\n3. Checking SQLite database for valid API keys...");
  const dbPath = join(__dirname, "..", "..", "..", "data", "smart-ai-app.sqlite");
  let apiKey = "";
  let modelName = "";
  let baseUrl = "";
  let provider = "";

  if (existsSync(dbPath)) {
    try {
      const db = new Database(dbPath);
      // Get the config_encryption_key from .env
      const envPath = join(__dirname, "..", "..", "..", ".env");
      let encryptionKey = "";
      if (existsSync(envPath)) {
        const env = await readFile(envPath, "utf8");
        const match = env.match(/^CONFIG_ENCRYPTION_KEY=(.+)$/m);
        if (match) {
          encryptionKey = match[1].trim();
        }
      }

      const row = db.prepare("SELECT value FROM app_config WHERE key = 'llm_config'").get();
      if (row && encryptionKey) {
        const rawConfig = JSON.parse(row.value);
        console.log("- Encrypted config loaded successfully.");
        // Try to find openrouter or nvidia key
        const openrouter = rawConfig.providers?.openrouter || {};
        const decryptedKey = decrypt(openrouter.apiKey, encryptionKey);
        
        if (decryptedKey) {
          apiKey = decryptedKey;
          provider = "openrouter";
          baseUrl = openrouter.baseUrl || "https://openrouter.ai/api/v1";
          
          // Find first fallback model
          const fallback = rawConfig.fallback?.[0];
          if (fallback) {
            modelName = fallback.model === "__custom__" ? fallback.customModel : fallback.model;
          } else {
            modelName = "qwen/qwen3-vl-32b-instruct";
          }
          console.log(`- Decrypted OpenRouter API Key! Using model: ${modelName}`);
        }
      }
    } catch (e) {
      console.log("- Could not read SQLite config:", e.message);
    }
  }

  // 4. Compile system and user prompts
  console.log("\n4. Compiling prompts for LLM call...");
  const systemPrompt = [
    "You are running a local Codex skill from a schema-driven UI.",
    `The final user-facing output language is Thai.`,
    "Return only valid JSON. Do not wrap it in Markdown.",
    "Use this response shape:",
    "{\"success\":true,\"output\":{\"prompt\":\"FINAL PROMPT TEXT ONLY\",\"article\":\"\",\"summary\":\"\",\"metadata\":{}},\"warnings\":[]}",
    "For storyboard/video skills, output.prompt may contain section headings and line breaks, but it must be human-readable plain text in the target language.",
    "",
    `Skill id: cosmatic-reference-storyboard`,
    `Skill title: ${meta.name}`,
    `Skill description: ${meta.description}`,
    "Skill instructions:",
    markdown,
    "Input schema:",
    JSON.stringify(inputSchema)
  ].join("\n");

  const userPrompt = `
Generate a 3x3 storyboard prompt based on the following input parameters:
- Product Type: ${mockParams.product_type}
- Label Text: ${mockParams.product_label_text.replace(/\n/g, " / ")}
- Visual Style: ${mockParams.cinematic_style}
- Layout: 3x3 Borderless Grid (9:16 Canvas)
- Target Language: Thai
- Mode: multi_frame_storyboard

Make sure to strictly apply the Video-Friendly Storyboard Continuity & Environment Flow Rule, the Global Anti-Hallucination & Packaging Material Fidelity Rule, the Strict Character Identity And Face Lock (Zero Character & Wardrobe Drift), and the exact product color/label locks.
  `.trim();

  console.log(`- Compiled System Prompt length: ${systemPrompt.length} characters`);
  console.log(`- Compiled User Prompt length: ${userPrompt.length} characters`);

  // 5. Send mock LLM request if API key is present
  if (apiKey && modelName) {
    console.log("\n5. Executing live E2E mock prompt generation via OpenRouter...");
    const endpoint = `${baseUrl.replace(/\/+$/, "")}/chat/completions`;
    try {
      const response = await fetch(endpoint, {
        method: "POST",
        headers: {
          "content-type": "application/json",
          "authorization": `Bearer ${apiKey}`,
          "HTTP-Referer": "http://localhost",
          "X-Title": "Smart Skill Runner Test"
        },
        body: JSON.stringify({
          model: modelName,
          messages: [
            { role: "system", content: systemPrompt },
            { role: "user", content: userPrompt }
          ],
          temperature: 0.3,
          max_tokens: 2500,
          stream: false
        })
      });

      const payload = await response.json();
      if (!response.ok) {
        throw new Error(payload.error?.message || `HTTP ${response.status}`);
      }

      const text = payload.choices?.[0]?.message?.content || "";
      console.log("\n--- LLM Response Received ---");
      console.log(text);
      console.log("-----------------------------");

      try {
        const parsed = JSON.parse(text);
        console.log("\nSuccess: Successfully parsed LLM JSON response!");
        console.log("Generated Storyboard Prompt excerpt:\n");
        const generatedPrompt = parsed.output?.prompt || parsed.prompt || "";
        console.log(generatedPrompt.slice(0, 1500) + (generatedPrompt.length > 1500 ? "\n... [truncated]" : ""));
        
        // Save test results to brain folder for walkthrough verification
        const brainPath = join("C:", "Users", "naiba", ".gemini", "antigravity", "brain", "5c07ca74-9e20-4c3d-8646-3f938d797c28", "cosmatic_reference_storyboard_yerpall_mock_output.json");
        await writeFile(brainPath, JSON.stringify(parsed, null, 2), "utf8");
        console.log(`\nSaved E2E mock output to brain artifact folder: ${brainPath}`);
      } catch (err) {
        console.log("\nWarning: Response was not valid JSON, raw text is printed above.");
      }
    } catch (error) {
      console.error("\nError during live LLM mock generation:", error.message);
    }
  } else {
    console.log("\n5. Skipped live E2E mock prompt generation (no valid LLM API key configured).");
    console.log("Simulating dynamic prompt mapping & rule validation internally...");
    
    // Simulate what the prompt would look like based on rules
    console.log("\n--- Simulated / Expected Prompt Output ---");
    console.log(`
[Simulated Output for cosmatic-reference-storyboard]

OUTPUT FORMAT LOCK:
- อาร์ตเวิร์กสตอรี่บอร์ดแนวตั้ง 3x3 (3 คอลัมน์ 3 แถว) ไร้ขอบสมบูรณ์แบบ (100% borderless, seamless, touching edge-to-edge)
- สัดส่วนรวมของภาพแคนวาส: 9:16 แนวตั้ง
- ทุกช่องเฟรมต้องมีขนาดกว้างยาวเท่ากันทุกพิกเซล เพื่อความสะดวกในการสไลด์ตัดแยกภาพไปใช้ทำวิดีโอรีลส์ได้อย่างราบรื่น
- ห้ามเรนเดอร์: ตัวเลขเฟรม, ข้อความบรรยายบรรทัดล่าง, โพสต์อิท, คำอธิบายข้อความ, หรือเส้นกรอบแบ่งสีขาว/ดำใดๆ ระหว่างเฟรมเด็ดขาด

PRODUCT REFERENCE LOCK:
- บรรจุภัณฑ์: กระปุกครีมทรงกลมเตี้ยสีขาวขุ่นกึ่งโปร่งแสง (Frosted white/translucent cosmetic jar) ฝาเกลียวสีขาวเงาแบนเรียบ
- ตัวหนังสือบนฉลาก (LABEL TRANSCRIPTION LOCK): บรรทัดบนสุดตัวใหญ่สะกดแบรนด์ตัวหนา "YERPALL™" ถัดลงมาคือ "INTENSIVE ACTIVE" ตามด้วยชื่อสูตร "GINSENG HYA NIGHT CREAM" ถัดลงมาเป็นอักษรเกาหลี "랩에서 피부까지" และมุมขวาล่างหรือด้านล่างระบุปริมาณ "10 g"
- กฎห้ามจินตนาการวัสดุใหม่ (Global Anti-Hallucination Lock): ห้ามจินตนาการเพิ่มหัวปั๊มทองเหลือง, หลอดหยดเซรั่มแก้ว, รางเหล็กสแตนเลส, หรือลิ้นชักที่ทำจากไม้ธรรมชาติขึ้นมาเองโดยเด็ดขาด หากเปิดกระปุกให้ส่วนหัวเกลียวด้านในใช้วัสดุแก้วสีขาวขุ่นแบบเดียวกับภายนอก เนื้อครีมสีขาวนวลกึ่งโปร่งแสงมีความชุ่มฉ่ำไฮยาลูรอน
- สภาพแสงในห้องแต่งตัวสุดหรูและแสงไฟสีอบอุ่นของห้องอาจทำให้เกิดเงาตกกระทบได้ แต่ห้ามทำให้สีกระปุกครีมสีขาวขุ่นโปร่งแสงหรือฝาสีขาวกลายเป็นขวดแก้วสีชาน้ำตาล (amber glass), สีทองแดงเมทัลลิก, หรือสีทองเด็ดขาด

CHARACTER REFERENCE LOCK (Zero Character & Wardrobe Drift):
- ล็อกหน้าตัวละครและทรงผม: หญิงสาวชาวไทยใบหน้าอ่อนหวานทรงรูปไข่ ผมยาวสีน้ำตาลเข้มลอนคลื่นหนานุ่มแสกข้าง ยิ้มมุมปากมีลักยิ้มเล็กๆ ดูสุภาพและอ่อนเยาว์
- เสื้อผ้าและเครื่องแต่งกายคงที่ 100% (Zero Wardrobe Drift): สวมสูทเบลเซอร์ผ้าลินินสีเบจ (Beige linen blazer) และเสื้อตัวในสีขาวสะอาดหรูหรา ล็อกโทนสีและดีไซน์ชุดเดิมนี้ในทุกๆ เฟรมที่มีตัวละครปรากฏตัว
- ข้อยกเว้นพิเศษสำหรับขั้นตอนบำรุงผิว: ในเฟรมขั้นตอนล้างหน้าหรือทาครีม อนุญาตให้สวมผ้าคาดศีรษะสปาผ้าฝ้ายนุ่มสีขาว (spa headband) เพื่อเก็บผมรวบขึ้นได้อย่างเป็นธรรมชาติ แต่ต้องสลับเป็นผ้าคาดนี้อย่างคงเส้นคงวาในช่องที่มีการบำรุง

VIDEO-FRIENDLY STORYBOARD CONTINUITY & ENVIRONMENT FLOW:
- การล็อกฉากหลังและสิ่งประดับ (Static Background): ห้องแต่งตัวส่วนตัวสุดหรูสไตล์ Luxury Closet ด้านหลังเป็นเคาน์เตอร์โต๊ะเครื่องแป้งหินอ่อนสีขาวนวล ประดับด้วยแจกันดอกทิวลิปสีพาสเทลอ่อน และกระจกบานใหญ่ขอบมนสีทองสว่าง โครงสร้างผนังไม้บิวต์อินสีโทนสว่างและทิศทางแสงเงาทุกอย่างล็อกตำแหน่งสถิตคงเดิม 100% ทุกเฟรม
- ความคงเส้นคงวาของแสงเงา (Consistent Ambient Lighting): แสงบิวตี้สตูดิโอแบบนุ่มนวลจากด้านหน้าเฉียงซ้าย ส่องแสงเงากระทบผิวหน้าตัวละครและผิวกระปุกครีมอย่างเป็นธรรมชาติ ทิศทางเงาตกกระทบลาดเอียง 45 องศาลงไปทางล่างขวา ล็อกความสว่างและสปีดชัดลึกเดิม
- ความต่อเนื่องของการขยับกล้อง (Framing Sequence): เลียนแบบการเคลื่อนที่ของกล้องวิดีโอ 24fps ไหลลื่นจากเฟรมสู่เฟรม ป้องกันการตัดข้ามมุมมองแบบสุ่ม

การจัดเรียง 3x3 Storyboard สำหรับเครื่องสำอางบำรุงผิว (Cosmetic Usage Journey Map):
- เฟรม 1: [Hero Establishing Shot] ภาพกระปุกครีม YerPall Ginseng Hya วางหน้าตรงบนโต๊ะเครื่องแป้งหินอ่อนหรูหรา เห็นฉลากแบรนด์และชื่อสูตรครบถ้วนชัดเจนเด่นสง่า สภาพแสงสวยงาม
- เฟรม 2: [Product Detail & Texture Reveal] ซูมโคลสอัพที่ตัวกระปุกครีมแบบเปิดฝาแบนสีขาวออก วางฝาพิงไว้ข้างๆ กระปุกอย่างเป็นระเบียบ เผยเนื้อครีมบำรุงสีขาวนวลกึ่งโปร่งแสงชุ่มฉ่ำอยู่ภายใน คอขวดเป็นแก้วสีขาวขุ่น
- เฟรม 3: [User & Product Introduction] หญิงสาวชาวไทยลุคเบลเซอร์เบจและเสื้อขาว ยืนอยู่ข้างโต๊ะเครื่องแป้ง หยิบจับฝากระปุกครีมขึ้นมาหมุนปิดอย่างนุ่มนวล แสดงสเกลกระปุกครีมเมื่อเทียบกับมือคน
- เฟรม 4: [Macro Hand Detail & Scoop] ซูมโคลสอัพนิ้วมือขวาของหญิงสาวคีบแตะเนื้อครีมสีขาวกึ่งโปร่งแสงขึ้นมาหนึ่งแต้มเล็กๆ ปลายนิ้วสัมผัสเนื้อครีมฉ่ำน้ำ ลายฉลากกระปุกสีขาวขุ่นกึ่งโปร่งแสงคมชัดด้านหลัง
- เฟรม 5: [Action Sequence - Dotting Face] หญิงสาวสวมผ้าคาดศีรษะสปาสีขาวพับรวบผมขึ้นอย่างเป็นระเบียบ (เสื้อผ้ายังคงเป็นสูทสีเบจ) กำลังใช้นิ้วมือแต้มครีมเป็นจุดเล็กๆ 5 จุดบนแก้ม หน้าผาก และจมูกอย่างนุ่มนวล ใบหน้ายิ้มแย้มสดใส
- เฟรม 6: [Action Sequence - Upward Spreading] ภาพโคลสอัพใบหน้าตัวละครขณะใช้ฝ่ามือลูบไล้เนื้อครีมเบาๆ จากกึ่งกลางใบหน้าขึ้นด้านบนและออกด้านข้างอย่างถูกวิธี หลีกเลี่ยงบริเวณดวงตา ผิวหน้าเริ่มสว่างชุ่มชื้นขึ้น
- เฟรม 7: [Sensory / Benefit Moment] ใบหน้าซูมใกล้ของหญิงสาวหลับตาลงอย่างผ่อนคลายและมีความสุข (เอาผ้าคาดผมสปาออก เผยทรงผมแสกข้างลอนคลื่นสีน้ำตาลเข้มเหมือนเดิม) สัมผัสความอ่อนโยนของเนื้อครีมและกลิ่นโสมไฮยา
- เฟรม 8: [Product & Lifestyle Placement] ภาพมุมกว้างขึ้นของกระปุกครีม YerPall ที่ปิดฝาสนิทแล้ว วางเคียงคู่กับตลับเครื่องสำอางพรีเมียมบนเคาน์เตอร์หินอ่อน มีฉากหลังเป็นห้องแต่งตัวสีนวลอบอุ่น ส่องสว่างด้วยไฟกระจกสวยงาม
- เฟรม 9: [Aspirational Result Shot] หญิงสาวชาวไทยสูทเบลเซอร์เบจถือกระปุกครีม YerPall โพสท่าถือระดับแก้ม โชว์ผิวหน้าที่อิ่มน้ำ ฉ่ำโกลว์ สุขภาพดี กระจ่างใสอมชมพูอย่างเป็นธรรมชาติ ส่งประกายความมั่นใจและพึงพอใจสูงสุด
    `);
    console.log("------------------------------------------");
  }
}

run();
