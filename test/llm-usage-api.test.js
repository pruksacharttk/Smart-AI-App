import test from "node:test";
import assert from "node:assert/strict";
import { createServer } from "node:http";
import { request } from "node:http";
import { mkdtempSync, rmSync } from "node:fs";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { createAppConfigStore } from "../src/app-config-store.js";
import { createUsageStore } from "../src/usage-store.js";
import { checkAndRepairProductStoryboardPrompt, configureAppConfigStoreForTests, configureUsageStoreForTests, enrichKpopChoreographyParams, enrichReferenceLockedCharacterParams, hasConfigAccess, recordSuccessfulLlmUsage, requestHandler, resolveStaticRoot } from "../server.js";

function listenWithHandler() {
  const server = createServer(requestHandler);
  return new Promise((resolve, reject) => {
    server.once("error", reject);
    server.listen(0, "127.0.0.1", () => {
      const address = server.address();
      resolve({ server, url: `http://127.0.0.1:${address.port}` });
    });
  });
}

function requestJson(url, { method = "GET", body = null } = {}) {
  return new Promise((resolve, reject) => {
    const data = body ? JSON.stringify(body) : "";
    const req = request(url, {
      method,
      headers: data ? {
        "content-type": "application/json",
        "content-length": Buffer.byteLength(data)
      } : {}
    }, (res) => {
      const chunks = [];
      res.on("data", (chunk) => chunks.push(chunk));
      res.on("end", () => {
        const raw = Buffer.concat(chunks).toString("utf8");
        resolve({
          status: res.statusCode,
          body: raw ? JSON.parse(raw) : {}
        });
      });
    });
    req.on("error", reject);
    if (data) req.write(data);
    req.end();
  });
}

function requestText(url, { method = "GET", body = null } = {}) {
  return new Promise((resolve, reject) => {
    const data = body ? JSON.stringify(body) : "";
    const req = request(url, {
      method,
      headers: data ? {
        "content-type": "application/json",
        "content-length": Buffer.byteLength(data)
      } : {}
    }, (res) => {
      const chunks = [];
      res.on("data", (chunk) => chunks.push(chunk));
      res.on("end", () => {
        resolve({
          status: res.statusCode,
          headers: res.headers,
          body: Buffer.concat(chunks).toString("utf8")
        });
      });
    });
    req.on("error", reject);
    if (data) req.write(data);
    req.end();
  });
}

function parseSseEvents(body) {
  return body.trim().split(/\n\n+/).filter(Boolean).map((chunk) => {
    const event = chunk.match(/^event: (.+)$/m)?.[1];
    const rawData = chunk.match(/^data: (.+)$/m)?.[1] || "{}";
    return { event, data: JSON.parse(rawData) };
  });
}

function withConfigStore() {
  const dir = mkdtempSync(join(tmpdir(), "smart-ai-api-config-"));
  const store = createAppConfigStore({
    dbPath: join(dir, "config.sqlite"),
    encryptionKey: Buffer.alloc(32, 8).toString("base64url")
  }).init();
  return { dir, store };
}

test("GET /api/llm-usage returns usage rows without sensitive fields", async () => {
  configureUsageStoreForTests({
    listUsage() {
      return [
        {
          provider: "openrouter",
          model: "qwen/qwen3-vl-32b-instruct",
          usageCount: 3,
          lastUsedAt: "2026-04-28T00:00:00.000Z"
        }
      ];
    }
  });
  const { server, url } = await listenWithHandler();
  try {
    const response = await fetch(`${url}/api/llm-usage`);
    const body = await response.json();
    assert.equal(response.status, 200);
    assert.equal(response.headers.get("cache-control"), "no-store, max-age=0");
    assert.deepEqual(body, {
      rows: [
        {
          provider: "openrouter",
          model: "qwen/qwen3-vl-32b-instruct",
          usageCount: 3,
          lastUsedAt: "2026-04-28T00:00:00.000Z"
        }
      ]
    });
    assert.equal(JSON.stringify(body).includes("apiKey"), false);
    assert.equal(JSON.stringify(body).includes("prompt"), false);
    assert.equal(JSON.stringify(body).includes("data:image"), false);
  } finally {
    await new Promise((resolve) => server.close(resolve));
  }
});

test("config access allows localhost and requires token for remote clients", () => {
  assert.equal(hasConfigAccess({
    socket: { remoteAddress: "127.0.0.1" },
    headers: {}
  }), true);
  assert.equal(hasConfigAccess({
    socket: { remoteAddress: "203.0.113.10" },
    headers: {}
  }, "admin-token"), false);
  assert.equal(hasConfigAccess({
    socket: { remoteAddress: "203.0.113.10" },
    headers: { "x-config-admin-token": "admin-token" }
  }, "admin-token"), true);
});

test("GET /api/llm-usage reports safe error when store is unavailable", async () => {
  configureUsageStoreForTests(null);
  const { server, url } = await listenWithHandler();
  try {
    const response = await fetch(`${url}/api/llm-usage`);
    const body = await response.json();
    assert.equal(response.status, 500);
    assert.match(body.error, /Usage database/);
  } finally {
    await new Promise((resolve) => server.close(resolve));
  }
});

test("static serving prefers Vite dist when built and rejects sensitive paths", async () => {
  const { server, url } = await listenWithHandler();
  try {
    assert.match(resolveStaticRoot(), /frontend[\\/]dist|public/);
    const home = await requestText(`${url}/`);
    assert.equal(home.status, 200);
    assert.match(home.headers["content-type"], /text\/html/);
    assert.match(home.body, /<div id="root"><\/div>|Smart AI App/);

    const api = await requestJson(`${url}/api/skills`);
    assert.equal(api.status, 200);
    assert.ok(Array.isArray(api.body.skills));

    const env = await requestText(`${url}/.env`);
    assert.equal(env.status, 403);

    const db = await requestText(`${url}/data/smart-ai-app.sqlite`);
    assert.equal(db.status, 403);
  } finally {
    await new Promise((resolve) => server.close(resolve));
  }
});

test("POST /api/config saves encrypted config and GET returns only key status", async () => {
  const { dir, store } = withConfigStore();
  configureAppConfigStoreForTests(store);
  const { server, url } = await listenWithHandler();
  try {
    const saved = await requestJson(`${url}/api/config`, {
      method: "POST",
      body: {
        config: {
          providers: {
            openrouter: { apiKey: "sk-or-secret", baseUrl: "https://openrouter.ai/api/v1" },
            fal: { apiKey: "fal-secret", baseUrl: "https://fal.run" },
            kie: { apiKey: "kie-secret", baseUrl: "https://api.kie.ai" },
            wavespeed: { apiKey: "wavespeed-secret", baseUrl: "https://api.wavespeed.ai" }
          },
          fallback: [
            { provider: "openrouter", model: "qwen/qwen3-vl-32b-instruct", customModel: "" }
          ]
        }
      }
    });
    assert.equal(saved.status, 200);
    assert.equal(saved.body.config.providers.openrouter.apiKey, "");
    assert.equal(saved.body.config.providers.openrouter.hasApiKey, true);
    assert.equal(saved.body.config.providers.fal.apiKey, "");
    assert.equal(saved.body.config.providers.fal.hasApiKey, true);
    assert.equal(JSON.stringify(saved.body).includes("secret"), false);

    const loaded = await requestJson(`${url}/api/config`);
    assert.equal(loaded.status, 200);
    assert.equal(loaded.body.config.providers.kie.apiKey, "");
    assert.equal(loaded.body.config.providers.kie.hasApiKey, true);
    assert.equal(loaded.body.config.providers.wavespeed.apiKey, "");
    assert.equal(loaded.body.config.providers.wavespeed.hasApiKey, true);
    assert.equal(JSON.stringify(loaded.body).includes("secret"), false);

    const privateConfig = store.getConfig({ includeSecrets: true });
    assert.equal(privateConfig.providers.openrouter.apiKey, "sk-or-secret");
    assert.equal(privateConfig.providers.fal.apiKey, "fal-secret");

    const revealed = await requestJson(`${url}/api/config/reveal`, {
      method: "POST",
      body: { provider: "fal" }
    });
    assert.equal(revealed.status, 200);
    assert.equal(revealed.body.provider, "fal");
    assert.equal(revealed.body.apiKey, "fal-secret");
  } finally {
    await new Promise((resolve) => server.close(resolve));
    configureAppConfigStoreForTests(null);
    store.close();
    rmSync(dir, { recursive: true, force: true });
  }
});

test("POST /api/run-skill records usage visible through dashboard API", async () => {
  const previousFetch = globalThis.fetch;
  const tempDir = mkdtempSync(join(tmpdir(), "smart-ai-run-usage-"));
  const store = createUsageStore({ dbPath: join(tempDir, "usage.sqlite") }).init();
  configureUsageStoreForTests(store);
  configureAppConfigStoreForTests(null);
  globalThis.fetch = async (url) => {
    assert.match(String(url), /\/chat\/completions$/);
    return new Response(JSON.stringify({
      model: "provider/final-model",
      choices: [
        {
          message: {
            content: JSON.stringify({
              success: true,
              output: {
                prompt: "A clean test prompt from the stubbed LLM.",
                article: "",
                summary: "",
                metadata: {}
              },
              warnings: []
            })
          }
        }
      ]
    }), {
      status: 200,
      headers: { "content-type": "application/json" }
    });
  };

  const { server, url } = await listenWithHandler();
  try {
    const run = await requestJson(`${url}/api/run-skill`, {
      method: "POST",
      body: {
        skillId: "gpt-image-prompt-engineer",
        params: { topic: "dashboard usage integration test" },
        llmConfig: {
          providers: {
            openrouter: {
              apiKey: "test-key",
              baseUrl: "https://llm.test/v1"
            }
          },
          fallback: [
            {
              provider: "openrouter",
              model: "provider/requested-model",
              customModel: ""
            }
          ]
        }
      }
    });
    assert.equal(run.status, 200);
    assert.equal(run.body.usageRecorded, true);
    assert.deepEqual(run.body.lastSuccessfulLlm, {
      provider: "openrouter",
      model: "provider/final-model",
      fallbackRank: 1
    });

    const usage = await requestJson(`${url}/api/llm-usage`);
    assert.equal(usage.status, 200);
    assert.deepEqual(usage.body.rows, [
      {
        provider: "openrouter",
        model: "provider/final-model",
        usageCount: 1,
        lastUsedAt: usage.body.rows[0].lastUsedAt
      }
    ]);
    assert.match(usage.body.rows[0].lastUsedAt, /^\d{4}-\d{2}-\d{2}T/);
  } finally {
    await new Promise((resolve) => server.close(resolve));
    globalThis.fetch = previousFetch;
    store.close();
    rmSync(tempDir, { recursive: true, force: true });
  }
});

test("POST /api/test-llm redacts echoed API keys from upstream errors", async () => {
  const previousFetch = globalThis.fetch;
  const apiKey = "unusual-secret-value-12345";
  configureUsageStoreForTests({
    recordSuccess() {
      throw new Error("should not record failed LLM test");
    }
  });
  configureAppConfigStoreForTests(null);
  globalThis.fetch = async () => new Response(JSON.stringify({
    error: {
      message: `Rejected Authorization Bearer ${apiKey} for account`
    }
  }), {
    status: 401,
    headers: { "content-type": "application/json" }
  });

  const { server, url } = await listenWithHandler();
  try {
    const response = await requestJson(`${url}/api/test-llm`, {
      method: "POST",
      body: {
        llmConfig: {
          providers: {
            openrouter: {
              apiKey,
              baseUrl: "https://llm.test/v1"
            }
          },
          fallback: [
            {
              provider: "openrouter",
              model: "provider/requested-model",
              customModel: ""
            }
          ]
        }
      }
    });
    assert.equal(response.status, 400);
    assert.equal(JSON.stringify(response.body).includes(apiKey), false);
    assert.match(response.body.results[0].error, /\[redacted\]/);
  } finally {
    await new Promise((resolve) => server.close(resolve));
    globalThis.fetch = previousFetch;
    configureUsageStoreForTests(null);
  }
});

test("POST /api/run-skill-stream records usage visible through dashboard API", async () => {
  const previousFetch = globalThis.fetch;
  const tempDir = mkdtempSync(join(tmpdir(), "smart-ai-stream-usage-"));
  const store = createUsageStore({ dbPath: join(tempDir, "usage.sqlite") }).init();
  configureUsageStoreForTests(store);
  configureAppConfigStoreForTests(null);
  globalThis.fetch = async (url) => {
    assert.match(String(url), /\/chat\/completions$/);
    return new Response(JSON.stringify({
      model: "provider/stream-final-model",
      choices: [
        {
          message: {
            content: JSON.stringify({
              success: true,
              output: {
                prompt: "A clean streaming test prompt from the stubbed LLM.",
                article: "",
                summary: "",
                metadata: {}
              },
              warnings: []
            })
          }
        }
      ]
    }), {
      status: 200,
      headers: { "content-type": "application/json" }
    });
  };

  const { server, url } = await listenWithHandler();
  try {
    const stream = await requestText(`${url}/api/run-skill-stream`, {
      method: "POST",
      body: {
        skillId: "gpt-image-prompt-engineer",
        params: { topic: "dashboard streaming usage integration test" },
        llmConfig: {
          providers: {
            openrouter: {
              apiKey: "test-key",
              baseUrl: "https://llm.test/v1"
            }
          },
          fallback: [
            {
              provider: "openrouter",
              model: "provider/requested-model",
              customModel: ""
            }
          ]
        }
      }
    });
    assert.equal(stream.status, 200);
    assert.equal(stream.headers["content-type"], "text/event-stream; charset=utf-8");
    const result = parseSseEvents(stream.body).find((item) => item.event === "result")?.data;
    assert.equal(result.usageRecorded, true);
    assert.deepEqual(result.lastSuccessfulLlm, {
      provider: "openrouter",
      model: "provider/stream-final-model",
      fallbackRank: 1
    });

    const usage = await requestJson(`${url}/api/llm-usage`);
    assert.equal(usage.status, 200);
    assert.deepEqual(usage.body.rows, [
      {
        provider: "openrouter",
        model: "provider/stream-final-model",
        usageCount: 1,
        lastUsedAt: usage.body.rows[0].lastUsedAt
      }
    ]);
    assert.match(usage.body.rows[0].lastUsedAt, /^\d{4}-\d{2}-\d{2}T/);
  } finally {
    await new Promise((resolve) => server.close(resolve));
    globalThis.fetch = previousFetch;
    store.close();
    rmSync(tempDir, { recursive: true, force: true });
  }
});

test("POST /api/run-skill-stream returns local runtime execution metadata without LLM config", async () => {
  configureUsageStoreForTests({
    listUsage() {
      return [];
    },
    recordSuccess() {
      throw new Error("local runtime should not record LLM usage");
    }
  });
  configureAppConfigStoreForTests(null);
  const { server, url } = await listenWithHandler();
  try {
    const stream = await requestText(`${url}/api/run-skill-stream`, {
      method: "POST",
      body: {
        skillId: "gpt-image-prompt-engineer",
        params: {
          topic: "minimal local runtime status test",
          target_language: "en",
          response_mode: "text_prompt",
          text_prompt_field: "detailed"
        }
      }
    });
    assert.equal(stream.status, 200);
    const events = parseSseEvents(stream.body);
    assert.deepEqual(events.find((item) => item.event === "status" && item.data.phase === "local_runtime")?.data, {
      phase: "local_runtime",
      provider: "local-python",
      model: "python/skill.py"
    });
    const result = events.find((item) => item.event === "result")?.data;
    assert.equal(result.success, true);
    assert.deepEqual(result.execution, {
      type: "local_runtime",
      provider: "local-python",
      model: "python/skill.py"
    });
    assert.equal("lastSuccessfulLlm" in result, false);
    assert.equal("usageRecorded" in result, false);
  } finally {
    await new Promise((resolve) => server.close(resolve));
  }
});

test("recordSuccessfulLlmUsage records final provider and model", () => {
  const calls = [];
  const ok = recordSuccessfulLlmUsage(
    { llm: { provider: "openrouter", model: "canonical/model" } },
    { provider: "fallback", model: "configured/model" },
    {
      recordSuccess(provider, model) {
        calls.push({ provider, model });
      }
    }
  );

  assert.equal(ok, true);
  assert.deepEqual(calls, [{ provider: "openrouter", model: "canonical/model" }]);
});

test("recordSuccessfulLlmUsage swallows store failures", () => {
  const ok = recordSuccessfulLlmUsage(
    { llm: { provider: "openrouter", model: "canonical/model" } },
    {},
    {
      recordSuccess() {
        throw new Error("disk unavailable");
      }
    }
  );

  assert.equal(ok, false);
});

test("recordSuccessfulLlmUsage can record fallback target when result omits llm", () => {
  const calls = [];
  const ok = recordSuccessfulLlmUsage(
    { success: true },
    { provider: "openrouter", model: "qwen/qwen3-vl-32b-instruct" },
    {
      recordSuccess(provider, model) {
        calls.push({ provider, model });
      }
    }
  );

  assert.equal(ok, true);
  assert.deepEqual(calls, [{ provider: "openrouter", model: "qwen/qwen3-vl-32b-instruct" }]);
});

test("enrichReferenceLockedCharacterParams selects randomized action prompts", () => {
  const params = enrichReferenceLockedCharacterParams(
    { id: "reference-locked-character-prompt" },
    {
      action_category: "movement_dynamics",
      action_selection_mode: "random",
      action_count: 3,
      movement_dynamics_actions: ["run forward", "jump mid-air", "spin gracefully", "dance"],
      posing_eye_contact_actions: ["look at camera"],
      emotional_actions: ["smile"],
      interaction_actions: ["lean on rail"],
      custom_action_prompts: []
    }
  );

  assert.equal(params.selected_action_category, "movement_dynamics");
  assert.equal(params.selected_action_prompts.length, 3);
  assert.ok(params.selected_action_prompts.every((item) => ["run forward", "jump mid-air", "spin gracefully", "dance"].includes(item)));
  assert.match(params.action_randomization_note, /selected_action_prompts/);
});

test("enrichReferenceLockedCharacterParams supports custom-only actions", () => {
  const params = enrichReferenceLockedCharacterParams(
    { id: "reference-locked-character-prompt" },
    {
      action_selection_mode: "custom_only",
      action_count: 2,
      custom_action_prompts: ["custom pose one", "custom pose two", "custom pose three"]
    }
  );

  assert.equal(params.selected_action_prompts.length, 2);
  assert.ok(params.selected_action_prompts.every((item) => item.startsWith("custom pose")));
});

test("enrichKpopChoreographyParams builds a reference-anchored choreography brief", () => {
  const params = enrichKpopChoreographyParams(
    { id: "reference-locked-character-prompt" },
    {
      task_type: "kpop_dance_sequence_sheet",
      choreography_preset: "kpop_4x4_instruction_sheet",
      choreography_frame_count: 16,
      reference_images: [{ image_ref: "@img1", role: "primary_identity" }],
      selected_action_prompts: ["step one", "step two"]
    }
  );

  assert.equal(params.reference_identity_anchor, "@img1");
  assert.equal(params.choreography_frame_count, 16);
  assert.equal(params.choreography_grid_layout, "4x4_16_frames");
  assert.deepEqual(params.selected_action_prompts, ["step one", "step two"]);
  assert.match(params.choreography_sequence_brief, /K-pop dance-sequence instruction sheet/);
  assert.match(params.choreography_sequence_brief, /@img1/);
});

test("product storyboard prompt check repairs missing multi-frame safeguards", () => {
  const result = checkAndRepairProductStoryboardPrompt("Create a six panel storyboard for this fan in a warm living room.", {
    generation_mode: "multi_frame_storyboard",
    reference_character_images: [{ type: "image" }],
    reference_environment_images: [{ type: "image" }]
  });

  assert.equal(result.qualityCheck.passed, false);
  assert.ok(result.qualityCheck.fixed.includes("product_lock"));
  assert.ok(result.qualityCheck.fixed.includes("multi_frame_image_only"));
  assert.ok(result.qualityCheck.fixed.includes("hand_anatomy_guard"));
  assert.match(result.prompt, /Product lock:/);
  assert.match(result.prompt, /no frame numbers, no captions, no text boxes/i);
  assert.match(result.prompt, /Preserve real product packaging text, logos, and brand markings/i);
  assert.match(result.prompt, /Hand anatomy and product-grip guard:/);
  assert.match(result.prompt, /no fused fingers, no extra fingers, no duplicated hands, no reversed palms/i);
  assert.match(result.prompt, /Character lock:/);
  assert.match(result.prompt, /Environment lock:/);
});

test("product storyboard prompt check passes complete multi-frame prompt", () => {
  const prompt = [
    "Create a complete image-generation prompt for a clean image-only storyboard/contact sheet.",
    "Product lock: preserve the exact product silhouette, proportions, geometry, material finish, color, logo/brand markings, button/control layout, and all key industrial-design details.",
    "Product variant consistency: choose one clear hero variant and keep the same formula, shade, packaging color, container or case shape, cap or lid, palette pan layout when present, label layout, logo placement, and packaging details consistent across every frame.",
    "Character lock: preserve the same identity, face structure, hairstyle, wardrobe, body proportions, expression style, and styling continuity across every frame.",
    "Environment lock: preserve the referenced location, background layout, lighting direction, color palette, mood, furniture/props relationship, and spatial continuity across the storyboard.",
    "Product usage intelligence: infer the real-world use method from the product category, include opening or handling the product, applying or using it correctly, and showing a believable result moment.",
    "Hand anatomy guard: hands must be anatomically plausible with natural left/right orientation, correct thumb placement, five fingers only, no fused fingers, no extra fingers, no reversed palms, realistic wrist rotation, and product grip held like a pen or handle when appropriate.",
    "Negative constraints: no watermark, no extra logos, no wrong brand text, no product redesign, no distorted geometry, no warped buttons, no duplicated product.",
    "Multi-frame storyboard visual rule: render visual panels only; no frame numbers, no captions, no text boxes, no lower-third description bars, no subtitles, no overlay labels, no storyboard layout typography, no visible frame descriptions, and preserve product packaging text, logos, and brand markings.",
    "borderless contiguous panels grid with no white divider lines."
  ].join(" ");
  const result = checkAndRepairProductStoryboardPrompt(prompt, {
    generation_mode: "multi_frame_storyboard",
    reference_character_images: [{ type: "image" }],
    reference_environment_images: [{ type: "image" }]
  });

  assert.equal(result.qualityCheck.passed, true);
  assert.deepEqual(result.qualityCheck.fixed, []);
  assert.equal(result.prompt, prompt);
});

test("product storyboard prompt check repairs missing hand anatomy safeguards", () => {
  const result = checkAndRepairProductStoryboardPrompt(
    [
      "Create a complete image-only multi-panel cosmetic storyboard for lipstick and micellar cleansing water.",
      "Product lock: preserve the exact product shape, logo, packaging, material, proportions, and design.",
      "Product usage intelligence: infer real-world usage with opening, dispensing, applying, cotton pad wiping, and result frames.",
      "Lip product usage: show cap/applicator opened, product applied to the lips with the bullet or wand, close-up lip detail, and color payoff.",
      "Micellar cleansing water usage: show flip cap opened, liquid poured onto a cotton pad, gently wiping makeup from the face, and fresh clean-skin result.",
      "Negative constraints: no watermark, no extra logos, no product redesign, no captions, no subtitles, no overlay labels, no visible text overlays.",
      "Multi-frame storyboard visual rule: image-only panels with no frame numbers, no captions, no text boxes, no overlay labels, no visible frame descriptions, and preserve product packaging text.",
      "borderless contiguous panels grid with no white divider lines."
    ].join(" "),
    {
      generation_mode: "multi_frame_storyboard",
      product_type: "lipstick and micellar cleansing water"
    }
  );

  assert.equal(result.qualityCheck.passed, false);
  assert.deepEqual(result.qualityCheck.fixed, ["hand_anatomy_guard"]);
  assert.match(result.prompt, /Hand anatomy and product-grip guard:/);
  assert.match(result.prompt, /Prefer one clearly visible active hand per close-up/i);
});

test("product storyboard prompt check repairs missing multi-variant product consistency", () => {
  const result = checkAndRepairProductStoryboardPrompt(
    [
      "Create a complete image-only multi-panel cosmetic storyboard for Glad2Glow micellar water.",
      "Product lock: preserve the exact product shape, logo, packaging, material, proportions, and design.",
      "Product usage intelligence: infer real-world usage with opening, pouring onto cotton pad, wiping makeup, and clean-skin result frames.",
      "Micellar cleansing water usage: show flip cap opened, liquid poured onto a cotton pad, gently wiping makeup from the face, and fresh clean-skin result.",
      "Hand anatomy guard: hands must be anatomically plausible with natural left/right orientation, correct thumb placement, five fingers only, no fused fingers, no extra fingers, no reversed palms, realistic wrist rotation, and product grip held naturally.",
      "Negative constraints: no watermark, no extra logos, no product redesign, no captions, no subtitles, no overlay labels, no visible text overlays.",
      "Multi-frame storyboard visual rule: image-only panels with no frame numbers, no captions, no text boxes, no overlay labels, no visible frame descriptions, and preserve product packaging text.",
      "borderless contiguous panels grid with no white divider lines."
    ].join(" "),
    {
      generation_mode: "multi_frame_storyboard",
      reference_product_images: [{ type: "image" }, { type: "image" }, { type: "image" }]
    }
  );

  assert.equal(result.qualityCheck.passed, false);
  assert.deepEqual(result.qualityCheck.fixed, ["product_variant_consistency"]);
  assert.match(result.prompt, /Product variant consistency:/);
  assert.match(result.prompt, /palette pan layout/i);
});

test("product storyboard prompt check detects cosmetic category inferred in prompt text", () => {
  const result = checkAndRepairProductStoryboardPrompt(
    [
      "Create a 6-frame image-only storyboard for an eyebrow mascara product in a luxury vanity room.",
      "Product lock: preserve the exact product shape, logo, packaging, material, proportions, and design.",
      "Product usage intelligence: infer real-world usage with opening, handling, application, and result frames.",
      "Hand anatomy guard: hands must be anatomically plausible with natural left/right orientation, correct thumb placement, five fingers only, no fused fingers, no extra fingers, no reversed palms, realistic wrist rotation, and product grip held by the handle.",
      "Negative constraints: no watermark, no extra logos, no product redesign, no captions, no subtitles, no overlay labels, no visible text overlays.",
      "Multi-frame storyboard visual rule: image-only panels with no frame numbers, no captions, no text boxes, no overlay labels, no visible frame descriptions, and preserve product packaging text."
    ].join(" "),
    {
      generation_mode: "multi_frame_storyboard"
    }
  );

  assert.equal(result.qualityCheck.passed, false);
  assert.ok(result.qualityCheck.fixed.includes("eyebrow_usage"));
  assert.ok(!result.qualityCheck.checks.some((check) => check.id === "mascara_usage"));
  assert.match(result.prompt, /Eyebrow product usage:/);
});

test("product storyboard prompt check separates toner from serum usage", () => {
  const result = checkAndRepairProductStoryboardPrompt(
    [
      "Create a 6-frame image-only storyboard for Glad2Glow 7% glycolic acid essence toner in a luxury bathroom.",
      "Product lock: preserve the exact product shape, logo, packaging, material, proportions, and design.",
      "Product variant consistency: choose one hero variant and keep the same formula, packaging color, container or case shape, cap or lid, palette pan layout when present, and label layout consistent across every frame.",
      "Product usage intelligence: infer real-world usage with opening, small amount, face application, and skin result frames.",
      "Hand anatomy guard: hands must be anatomically plausible with natural left/right orientation, correct thumb placement, five fingers only, no fused fingers, no extra fingers, no reversed palms, realistic wrist rotation, and product grip held naturally.",
      "Negative constraints: no watermark, no extra logos, no product redesign, no captions, no subtitles, no overlay labels, no visible text overlays.",
      "Multi-frame storyboard visual rule: image-only panels with no frame numbers, no captions, no text boxes, no overlay labels, no visible frame descriptions, and preserve product packaging text."
    ].join(" "),
    {
      generation_mode: "multi_frame_storyboard",
      reference_product_images: [{ type: "image" }, { type: "image" }]
    }
  );

  assert.equal(result.qualityCheck.passed, false);
  assert.ok(result.qualityCheck.fixed.includes("toner_usage"));
  assert.ok(result.qualityCheck.fixed.includes("acid_toner_care"));
  assert.ok(!result.qualityCheck.checks.some((check) => check.id === "serum_usage"));
  assert.match(result.prompt, /Toner\/exfoliating acid toner usage:/);
  assert.match(result.prompt, /Acid toner care:/);
});

test("product storyboard prompt check repairs missing eyeshadow palette usage", () => {
  const result = checkAndRepairProductStoryboardPrompt(
    [
      "Create a 6-frame image-only storyboard for a pink eyeshadow palette in a luxury bathroom.",
      "Product lock: preserve the exact palette shape, translucent pink packaging, pan layout, heart-shaped pan, logo markings, powder colors, material, proportions, and design.",
      "Product variant consistency: choose one hero palette and keep the same color story, pan layout, packaging color, and label layout consistent across every frame.",
      "Product usage intelligence: infer real-world usage with opening, handling, application, and result frames.",
      "Hand anatomy guard: hands must be anatomically plausible with natural left/right orientation, correct thumb placement, five fingers only, no fused fingers, no extra fingers, no reversed palms, realistic wrist rotation, and product grip held naturally.",
      "Negative constraints: no watermark, no extra logos, no product redesign, no captions, no subtitles, no overlay labels, no visible text overlays.",
      "Multi-frame storyboard visual rule: image-only panels with no frame numbers, no captions, no text boxes, no overlay labels, no visible frame descriptions, and preserve product packaging text."
    ].join(" "),
    {
      generation_mode: "multi_frame_storyboard",
      reference_product_images: [{ type: "image" }, { type: "image" }]
    }
  );

  assert.equal(result.qualityCheck.passed, false);
  assert.ok(result.qualityCheck.fixed.includes("eyeshadow_palette_usage"));
  assert.match(result.prompt, /Eyeshadow palette usage:/);
});

test("product storyboard prompt check repairs cosmetic category usage gaps", () => {
  const cases = [
    {
      product_type: "eyeliner",
      expected: "eyeliner_usage",
      repair: /Eyeliner usage:/
    },
    {
      product_type: "lipstick",
      expected: "lip_usage",
      repair: /Lip product usage:/
    },
    {
      product_type: "compact powder",
      expected: "compact_powder_usage",
      repair: /Compact powder usage:/
    },
    {
      product_type: "eyebrow pencil",
      expected: "eyebrow_usage",
      repair: /Eyebrow product usage:/
    },
    {
      product_type: "eyebrow mascara",
      expected: "eyebrow_usage",
      repair: /Eyebrow product usage:/
    },
    {
      product_type: "eyeshadow palette",
      expected: "eyeshadow_palette_usage",
      repair: /Eyeshadow palette usage:/
    },
    {
      product_type: "mascara",
      expected: "mascara_usage",
      repair: /Eyelash mascara usage:/
    },
    {
      product_type: "moisturizer cream",
      expected: "cream_usage",
      repair: /Cream\/moisturizer usage:/
    },
    {
      product_type: "serum",
      expected: "serum_usage",
      repair: /Serum usage:/
    },
    {
      product_type: "glycolic acid essence toner",
      expected: "acid_toner_care",
      repair: /Acid toner care:/
    },
    {
      product_type: "micellar cleansing water",
      expected: "micellar_usage",
      repair: /Micellar cleansing water usage:/
    }
  ];

  for (const item of cases) {
    const result = checkAndRepairProductStoryboardPrompt(
      [
        `Create a 6-frame image-only storyboard for ${item.product_type}.`,
        "Product lock: preserve the exact product shape, logo, packaging, material, proportions, and design.",
        "Product variant consistency: choose one hero variant and keep the same formula, packaging color, container or case shape, cap or lid, palette pan layout when present, and label layout consistent across every frame.",
        "Negative constraints: no watermark, no extra logos, no product redesign, no captions, no subtitles, no overlay labels, no visible text overlays.",
        "Multi-frame storyboard visual rule: image-only panels with no frame numbers, no captions, no text boxes, no overlay labels, no visible frame descriptions, and preserve product packaging text."
      ].join(" "),
      {
        generation_mode: "multi_frame_storyboard",
        product_type: item.product_type
      }
    );

    assert.ok(result.qualityCheck.fixed.includes(item.expected), item.product_type);
    assert.match(result.prompt, item.repair, item.product_type);
  }
});

test("product storyboard prompt check enforces multi-frame checks when mode is auto", () => {
  const result = checkAndRepairProductStoryboardPrompt(
    "Create a 3x3 storyboard for a white dresser.",
    {
      generation_mode: "auto"
    },
    "furniture-reference-storyboard"
  );

  assert.equal(result.qualityCheck.passed, false);
  assert.ok(result.qualityCheck.fixed.includes("borderless_layout"));
  assert.match(result.prompt, /Borderless contiguous layout rule:/);
});

test("product storyboard prompt check strict borderless layout requires both positive and negative constraints", () => {
  // Only positive borderless term - should fail because it lacks negative constraints!
  const resultPositiveOnly = checkAndRepairProductStoryboardPrompt(
    "Create a borderless grid storyboard for cosmetic cream.",
    {
      generation_mode: "multi_frame_storyboard"
    }
  );
  assert.equal(resultPositiveOnly.qualityCheck.passed, false);
  assert.ok(resultPositiveOnly.qualityCheck.fixed.includes("borderless_layout"));

  // Both positive and negative constraints - should pass borderless check!
  const resultBoth = checkAndRepairProductStoryboardPrompt(
    "Create a borderless grid storyboard for cosmetic cream with zero white divider lines.",
    {
      generation_mode: "multi_frame_storyboard"
    }
  );
  assert.ok(!resultBoth.qualityCheck.fixed.includes("borderless_layout"));
});

test("product storyboard prompt check cabinet and drawer fidelity rule and repair", () => {
  // Missing locks and drawer stance - should fail cabinet_drawer_fidelity
  const resultMissing = checkAndRepairProductStoryboardPrompt(
    "Create a 3x3 storyboard for a white drawer cabinet unit.",
    {
      generation_mode: "auto"
    },
    "furniture-reference-storyboard"
  );
  assert.equal(resultMissing.qualityCheck.passed, false);
  assert.ok(resultMissing.qualityCheck.fixed.includes("cabinet_drawer_fidelity"));
  assert.match(resultMissing.prompt, /Cabinet & drawer fidelity rule:/);

  // Having both locks and stance - should pass cabinet_drawer_fidelity
  const resultComplete = checkAndRepairProductStoryboardPrompt(
    "Create a 3x3 storyboard for a white drawer cabinet unit. product lock: exact drawer count, no legs, legless flat base.",
    {
      generation_mode: "auto"
    },
    "furniture-reference-storyboard"
  );
  assert.ok(!resultComplete.qualityCheck.fixed.includes("cabinet_drawer_fidelity"));
});


