import test from "node:test";
import assert from "node:assert/strict";
import Database from "better-sqlite3";
import { mkdtempSync, rmSync } from "node:fs";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { createAppConfigStore } from "../src/app-config-store.js";

const testKey = Buffer.alloc(32, 7).toString("base64url");

function withStore(fn) {
  const dir = mkdtempSync(join(tmpdir(), "smart-ai-config-"));
  const dbPath = join(dir, "config.sqlite");
  const store = createAppConfigStore({ dbPath, encryptionKey: testKey });
  try {
    store.init();
    fn(store, dbPath);
  } finally {
    store.close();
    rmSync(dir, { recursive: true, force: true });
  }
}

test("config store returns public config without API key values", () => {
  withStore((store) => {
    const saved = store.saveConfig({
      providers: {
        openrouter: { apiKey: "sk-or-secret", baseUrl: "https://openrouter.ai/api/v1" },
        fal: { apiKey: "fal-secret", baseUrl: "https://fal.run" }
      },
      fallback: [
        { provider: "openrouter", model: "qwen/qwen3-vl-32b-instruct", customModel: "" }
      ]
    });

    assert.equal(saved.providers.openrouter.apiKey, "");
    assert.equal(saved.providers.openrouter.hasApiKey, true);
    assert.equal(saved.providers.fal.apiKey, "");
    assert.equal(saved.providers.fal.hasApiKey, true);

    const privateConfig = store.getConfig({ includeSecrets: true });
    assert.equal(privateConfig.providers.openrouter.apiKey, "sk-or-secret");
    assert.equal(privateConfig.providers.fal.apiKey, "fal-secret");
  });
});

test("config store encrypts secrets at rest", () => {
  withStore((store, dbPath) => {
    store.saveConfig({
      providers: {
        openrouter: { apiKey: "sk-or-secret", baseUrl: "https://openrouter.ai/api/v1" }
      }
    });
    const db = new Database(dbPath, { readonly: true });
    try {
      const row = db.prepare("SELECT config_json AS configJson FROM app_config WHERE id = 1").get();
      assert.equal(row.configJson.includes("sk-or-secret"), false);
      assert.match(JSON.parse(row.configJson).providers.openrouter.apiKey, /^v1:/);
    } finally {
      db.close();
    }
  });
});

test("blank API key update keeps existing encrypted secret", () => {
  withStore((store) => {
    store.saveConfig({
      providers: {
        openrouter: { apiKey: "sk-or-secret", baseUrl: "https://openrouter.ai/api/v1" }
      }
    });
    store.saveConfig({
      providers: {
        openrouter: { apiKey: "", baseUrl: "https://example.test/v1" }
      }
    });

    const privateConfig = store.getConfig({ includeSecrets: true });
    assert.equal(privateConfig.providers.openrouter.apiKey, "sk-or-secret");
    assert.equal(privateConfig.providers.openrouter.baseUrl, "https://example.test/v1");
  });
});

test("rotateEncryptionKey re-encrypts saved secrets with a new key", () => {
  withStore((store, dbPath) => {
    store.saveConfig({
      providers: {
        openrouter: { apiKey: "sk-or-secret", baseUrl: "https://openrouter.ai/api/v1" }
      }
    });
    const db = new Database(dbPath, { readonly: true });
    let before = "";
    try {
      before = JSON.parse(db.prepare("SELECT config_json AS configJson FROM app_config WHERE id = 1").get().configJson).providers.openrouter.apiKey;
    } finally {
      db.close();
    }

    const nextKey = Buffer.alloc(32, 9).toString("base64url");
    const publicConfig = store.rotateEncryptionKey(nextKey);
    assert.equal(publicConfig.providers.openrouter.hasApiKey, true);
    assert.equal(store.getConfig({ includeSecrets: true }).providers.openrouter.apiKey, "sk-or-secret");

    const verifyDb = new Database(dbPath, { readonly: true });
    try {
      const after = JSON.parse(verifyDb.prepare("SELECT config_json AS configJson FROM app_config WHERE id = 1").get().configJson).providers.openrouter.apiKey;
      assert.notEqual(after, before);
      assert.match(after, /^v1:/);
    } finally {
      verifyDb.close();
    }
  });
});
