import test from "node:test";
import assert from "node:assert/strict";
import { createServer } from "node:http";
import { configureUsageStoreForTests, recordSuccessfulLlmUsage, requestHandler } from "../server.js";

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
