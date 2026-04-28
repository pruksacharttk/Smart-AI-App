import test from "node:test";
import assert from "node:assert/strict";
import { mkdtempSync, rmSync } from "node:fs";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { createUsageStore } from "../src/usage-store.js";

function withStore(fn) {
  const dir = mkdtempSync(join(tmpdir(), "smart-ai-usage-"));
  const store = createUsageStore({ dbPath: join(dir, "nested", "usage.sqlite") });
  try {
    store.init();
    fn(store);
  } finally {
    store.close();
    rmSync(dir, { recursive: true, force: true });
  }
}

test("usage store initializes schema and returns empty rows", () => {
  withStore((store) => {
    assert.deepEqual(store.listUsage(), []);
  });
});

test("recordSuccess inserts and increments provider/model usage", () => {
  withStore((store) => {
    store.recordSuccess("openrouter", "qwen/qwen3-vl-32b-instruct", "2026-04-28T00:00:00.000Z");
    store.recordSuccess("openrouter", "qwen/qwen3-vl-32b-instruct", "2026-04-28T00:01:00.000Z");

    assert.deepEqual(store.listUsage(), [
      {
        provider: "openrouter",
        model: "qwen/qwen3-vl-32b-instruct",
        usageCount: 2,
        lastUsedAt: "2026-04-28T00:01:00.000Z"
      }
    ]);
  });
});

test("listUsage sorts by usage count then provider and model", () => {
  withStore((store) => {
    store.recordSuccess("b-provider", "z-model", "2026-04-28T00:00:00.000Z");
    store.recordSuccess("a-provider", "b-model", "2026-04-28T00:00:00.000Z");
    store.recordSuccess("a-provider", "a-model", "2026-04-28T00:00:00.000Z");
    store.recordSuccess("b-provider", "z-model", "2026-04-28T00:02:00.000Z");

    assert.deepEqual(store.listUsage().map((row) => `${row.provider}/${row.model}:${row.usageCount}`), [
      "b-provider/z-model:2",
      "a-provider/a-model:1",
      "a-provider/b-model:1"
    ]);
  });
});

test("recordSuccess rejects empty provider or model", () => {
  withStore((store) => {
    assert.throws(() => store.recordSuccess("", "model"), /provider is required/);
    assert.throws(() => store.recordSuccess("provider", ""), /model is required/);
  });
});
