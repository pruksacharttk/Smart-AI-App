import test from "node:test";
import assert from "node:assert/strict";
import { createServer } from "node:http";
import { request } from "node:http";
import { mkdtempSync, rmSync } from "node:fs";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { createUsageStore } from "../src/usage-store.js";
import { configureUsageStoreForTests, enrichKpopChoreographyParams, enrichReferenceLockedCharacterParams, recordSuccessfulLlmUsage, requestHandler } from "../server.js";

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

test("POST /api/run-skill records usage visible through dashboard API", async () => {
  const previousFetch = globalThis.fetch;
  const tempDir = mkdtempSync(join(tmpdir(), "smart-ai-run-usage-"));
  const store = createUsageStore({ dbPath: join(tempDir, "usage.sqlite") }).init();
  configureUsageStoreForTests(store);
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

test("POST /api/run-skill-stream records usage visible through dashboard API", async () => {
  const previousFetch = globalThis.fetch;
  const tempDir = mkdtempSync(join(tmpdir(), "smart-ai-stream-usage-"));
  const store = createUsageStore({ dbPath: join(tempDir, "usage.sqlite") }).init();
  configureUsageStoreForTests(store);
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
