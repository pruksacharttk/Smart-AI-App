import Database from "better-sqlite3";
import { createCipheriv, createDecipheriv, randomBytes } from "node:crypto";
import { mkdirSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { encryptionKeyBuffer } from "./env-config.js";

const moduleDir = dirname(fileURLToPath(import.meta.url));
const defaultDbPath = resolve(moduleDir, "..", "data", "smart-ai-app.sqlite");

const defaultConfig = {
  providers: {
    nvidia: { apiKey: "", baseUrl: "https://integrate.api.nvidia.com/v1" },
    openrouter: { apiKey: "", baseUrl: "https://openrouter.ai/api/v1" },
    fal: { apiKey: "", baseUrl: "https://fal.run" },
    kie: { apiKey: "", baseUrl: "https://api.kie.ai" },
    wavespeed: { apiKey: "", baseUrl: "https://api.wavespeed.ai" }
  },
  fallback: [
    { provider: "openrouter", model: "qwen/qwen3-vl-32b-instruct", customModel: "" },
    { provider: "openrouter", model: "qwen/qwen3-vl-8b-instruct", customModel: "" },
    { provider: "openrouter", model: "qwen/qwen3-vl-235b-a22b-instruct", customModel: "" },
    { provider: "openrouter", model: "qwen/qwen3.5-35b-a3b", customModel: "" }
  ]
};

function nowIso() {
  return new Date().toISOString();
}

function cloneDefaultConfig() {
  return JSON.parse(JSON.stringify(defaultConfig));
}

function encryptSecret(value, key) {
  const text = String(value || "");
  if (!text) return "";
  const iv = randomBytes(12);
  const cipher = createCipheriv("aes-256-gcm", key, iv);
  const ciphertext = Buffer.concat([cipher.update(text, "utf8"), cipher.final()]);
  const tag = cipher.getAuthTag();
  return `v1:${iv.toString("base64url")}:${tag.toString("base64url")}:${ciphertext.toString("base64url")}`;
}

export function generateConfigEncryptionKey() {
  return randomBytes(32).toString("base64url");
}

function decryptSecret(value, key) {
  const text = String(value || "");
  if (!text) return "";
  const [version, ivRaw, tagRaw, ciphertextRaw] = text.split(":");
  if (version !== "v1" || !ivRaw || !tagRaw || !ciphertextRaw) throw new Error("Unsupported encrypted secret format");
  const decipher = createDecipheriv("aes-256-gcm", key, Buffer.from(ivRaw, "base64url"));
  decipher.setAuthTag(Buffer.from(tagRaw, "base64url"));
  return Buffer.concat([
    decipher.update(Buffer.from(ciphertextRaw, "base64url")),
    decipher.final()
  ]).toString("utf8");
}

function providerNames(config) {
  return Object.keys(config.providers || {});
}

function normalizeConfig(input = {}, existing = cloneDefaultConfig(), { keepExistingSecrets = false } = {}) {
  const normalized = cloneDefaultConfig();
  for (const provider of providerNames(normalized)) {
    const incoming = input.providers?.[provider] || {};
    const prior = existing.providers?.[provider] || {};
    normalized.providers[provider] = {
      ...normalized.providers[provider],
      baseUrl: String(incoming.baseUrl || prior.baseUrl || normalized.providers[provider].baseUrl || "").trim(),
      apiKey: keepExistingSecrets && !String(incoming.apiKey || "").trim()
        ? String(prior.apiKey || "")
        : String(incoming.apiKey || "").trim()
    };
  }
  const fallback = Array.isArray(input.fallback) ? input.fallback : existing.fallback;
  normalized.fallback = Array.from({ length: 4 }, (_, index) => {
    const item = fallback?.[index] || defaultConfig.fallback[index];
    const provider = String(item?.provider || defaultConfig.fallback[index].provider || "").toLowerCase();
    return {
      provider,
      model: String(item?.model || defaultConfig.fallback[index].model || "").trim(),
      customModel: String(item?.customModel || "").trim()
    };
  });
  return normalized;
}

function publicConfig(config) {
  const safe = normalizeConfig(config);
  for (const provider of providerNames(safe)) {
    const apiKey = safe.providers[provider].apiKey;
    safe.providers[provider].hasApiKey = Boolean(apiKey);
    safe.providers[provider].apiKey = "";
  }
  return safe;
}

export function createAppConfigStore(options = {}) {
  const dbPath = resolve(options.dbPath || defaultDbPath);
  let key = options.encryptionKey ? encryptionKeyBuffer(options.encryptionKey) : encryptionKeyBuffer();
  let db = null;
  let statements = null;

  function init() {
    mkdirSync(dirname(dbPath), { recursive: true });
    db = new Database(dbPath);
    db.exec(`
      CREATE TABLE IF NOT EXISTS app_config (
        id INTEGER PRIMARY KEY CHECK (id = 1),
        config_json TEXT NOT NULL,
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL
      )
    `);
    statements = {
      get: db.prepare("SELECT config_json AS configJson FROM app_config WHERE id = 1"),
      upsert: db.prepare(`
        INSERT INTO app_config (id, config_json, created_at, updated_at)
        VALUES (1, ?, ?, ?)
        ON CONFLICT(id) DO UPDATE SET
          config_json = excluded.config_json,
          updated_at = excluded.updated_at
      `),
      clear: db.prepare("DELETE FROM app_config WHERE id = 1")
    };
    return api;
  }

  function ensureInitialized() {
    if (!db || !statements) throw new Error("Config store is not initialized");
  }

  function readEncrypted() {
    ensureInitialized();
    const row = statements.get.get();
    if (!row?.configJson) return null;
    return JSON.parse(row.configJson);
  }

  function decryptConfig(encrypted) {
    const config = cloneDefaultConfig();
    const merged = normalizeConfig(encrypted || {}, config);
    for (const provider of providerNames(merged)) {
      const value = encrypted?.providers?.[provider]?.apiKey;
      merged.providers[provider].apiKey = value ? decryptSecret(value, key) : "";
    }
    return merged;
  }

  function encryptConfig(config) {
    const normalized = normalizeConfig(config);
    for (const provider of providerNames(normalized)) {
      normalized.providers[provider].apiKey = encryptSecret(normalized.providers[provider].apiKey, key);
    }
    return normalized;
  }

  function encryptConfigWithKey(config, nextKey) {
    const normalized = normalizeConfig(config);
    for (const provider of providerNames(normalized)) {
      normalized.providers[provider].apiKey = encryptSecret(normalized.providers[provider].apiKey, nextKey);
    }
    return normalized;
  }

  function getConfig({ includeSecrets = false } = {}) {
    const encrypted = readEncrypted();
    const config = encrypted ? decryptConfig(encrypted) : cloneDefaultConfig();
    return includeSecrets ? config : publicConfig(config);
  }

  function saveConfig(input) {
    const existing = getConfig({ includeSecrets: true });
    const normalized = normalizeConfig(input, existing, { keepExistingSecrets: true });
    const encrypted = encryptConfig(normalized);
    const timestamp = nowIso();
    statements.upsert.run(JSON.stringify(encrypted), timestamp, timestamp);
    return publicConfig(normalized);
  }

  function clearConfig() {
    ensureInitialized();
    statements.clear.run();
    return publicConfig(cloneDefaultConfig());
  }

  function rotateEncryptionKey(nextEncryptionKey) {
    ensureInitialized();
    const nextKey = encryptionKeyBuffer(nextEncryptionKey);
    const config = getConfig({ includeSecrets: true });
    const encrypted = encryptConfigWithKey(config, nextKey);
    const timestamp = nowIso();
    const tx = db.transaction(() => {
      statements.upsert.run(JSON.stringify(encrypted), timestamp, timestamp);
    });
    tx();
    key = nextKey;
    return publicConfig(config);
  }

  function close() {
    if (db) db.close();
    db = null;
    statements = null;
  }

  const api = { init, getConfig, saveConfig, clearConfig, rotateEncryptionKey, close, dbPath };
  return api;
}
