import Database from "better-sqlite3";
import { mkdirSync } from "node:fs";
import { dirname, join, resolve } from "node:path";

const defaultDbPath = join(process.cwd(), "data", "smart-ai-app.sqlite");

function normalizeTimestamp(value = new Date()) {
  if (value instanceof Date) return value.toISOString();
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return new Date().toISOString();
  return parsed.toISOString();
}

function requiredText(value, name) {
  const text = String(value || "").trim();
  if (!text) throw new Error(`${name} is required`);
  return text;
}

export function createUsageStore(options = {}) {
  const dbPath = resolve(options.dbPath || defaultDbPath);
  let db = null;
  let statements = null;

  function init() {
    mkdirSync(dirname(dbPath), { recursive: true });
    db = new Database(dbPath);
    try {
      db.pragma("journal_mode = WAL");
    } catch (error) {
      console.warn(`SQLite WAL mode unavailable: ${error.message}`);
    }
    db.exec(`
      CREATE TABLE IF NOT EXISTS llm_usage (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        provider TEXT NOT NULL,
        model TEXT NOT NULL,
        usage_count INTEGER NOT NULL DEFAULT 0,
        last_used_at TEXT,
        created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
        updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
        UNIQUE(provider, model)
      )
    `);
    statements = {
      recordSuccess: db.prepare(`
        INSERT INTO llm_usage (provider, model, usage_count, last_used_at, updated_at)
        VALUES (?, ?, 1, ?, ?)
        ON CONFLICT(provider, model) DO UPDATE SET
          usage_count = usage_count + 1,
          last_used_at = excluded.last_used_at,
          updated_at = excluded.updated_at
      `),
      listUsage: db.prepare(`
        SELECT provider, model, usage_count AS usageCount, last_used_at AS lastUsedAt
        FROM llm_usage
        ORDER BY usage_count DESC, provider ASC, model ASC
      `)
    };
    return api;
  }

  function ensureInitialized() {
    if (!db || !statements) throw new Error("Usage store is not initialized");
  }

  function recordSuccess(provider, model, usedAt = new Date()) {
    ensureInitialized();
    const safeProvider = requiredText(provider, "provider");
    const safeModel = requiredText(model, "model");
    const timestamp = normalizeTimestamp(usedAt);
    statements.recordSuccess.run(safeProvider, safeModel, timestamp, timestamp);
  }

  function listUsage() {
    ensureInitialized();
    return statements.listUsage.all();
  }

  function close() {
    if (db) db.close();
    db = null;
    statements = null;
  }

  const api = { init, recordSuccess, listUsage, close, dbPath };
  return api;
}
