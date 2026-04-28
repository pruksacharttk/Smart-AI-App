import test from "node:test";
import assert from "node:assert/strict";
import { mkdtempSync, rmSync } from "node:fs";
import { join, resolve } from "node:path";
import { tmpdir } from "node:os";
import { execFileSync } from "node:child_process";
import { pathToFileURL } from "node:url";
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

test("default database path is stable when imported from another cwd", () => {
  const tempDir = mkdtempSync(join(tmpdir(), "smart-ai-cwd-"));
  try {
    const script = `
      import { createUsageStore } from ${JSON.stringify(pathToFileURL(resolve("src/usage-store.js")).href)};
      console.log(createUsageStore().dbPath);
    `;
    const output = execFileSync(process.execPath, ["--input-type=module", "-e", script], {
      cwd: tempDir,
      encoding: "utf8"
    }).trim();

    assert.equal(output, resolve("data/smart-ai-app.sqlite"));
  } finally {
    rmSync(tempDir, { recursive: true, force: true });
  }
});
