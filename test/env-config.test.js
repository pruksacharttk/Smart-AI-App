import test from "node:test";
import assert from "node:assert/strict";
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { ensureEnvEncryptionKey, encryptionKeyEnvName, setEnvValue } from "../src/env-config.js";

test("ensureEnvEncryptionKey appends generated key without rewriting existing env content", () => {
  const dir = mkdtempSync(join(tmpdir(), "smart-ai-env-"));
  const envPath = join(dir, ".env");
  const previous = process.env[encryptionKeyEnvName];
  delete process.env[encryptionKeyEnvName];
  try {
    writeFileSync(envPath, "# keep this comment\nPORT=4173\n", "utf8");
    const key = ensureEnvEncryptionKey(envPath);
    const raw = readFileSync(envPath, "utf8");

    assert.equal(raw.startsWith("# keep this comment\nPORT=4173\n"), true);
    assert.match(raw, new RegExp(`\\n${encryptionKeyEnvName}=${key}\\n$`));
  } finally {
    if (previous === undefined) delete process.env[encryptionKeyEnvName];
    else process.env[encryptionKeyEnvName] = previous;
    rmSync(dir, { recursive: true, force: true });
  }
});

test("ensureEnvEncryptionKey creates env file when missing", () => {
  const dir = mkdtempSync(join(tmpdir(), "smart-ai-env-"));
  const envPath = join(dir, ".env");
  const previous = process.env[encryptionKeyEnvName];
  delete process.env[encryptionKeyEnvName];
  try {
    const key = ensureEnvEncryptionKey(envPath);
    const raw = readFileSync(envPath, "utf8");

    assert.match(raw, new RegExp(`^${encryptionKeyEnvName}=${key}\\n$`));
  } finally {
    if (previous === undefined) delete process.env[encryptionKeyEnvName];
    else process.env[encryptionKeyEnvName] = previous;
    rmSync(dir, { recursive: true, force: true });
  }
});

test("setEnvValue replaces existing value while preserving other env lines", () => {
  const dir = mkdtempSync(join(tmpdir(), "smart-ai-env-"));
  const envPath = join(dir, ".env");
  try {
    writeFileSync(envPath, "# comment\nPORT=4173\nCONFIG_ENCRYPTION_KEY=old\n", "utf8");
    setEnvValue("CONFIG_ENCRYPTION_KEY", "new", envPath);
    assert.equal(readFileSync(envPath, "utf8"), "# comment\nPORT=4173\nCONFIG_ENCRYPTION_KEY=new\n");
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});
