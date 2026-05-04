import { appendFileSync, existsSync, readFileSync, writeFileSync } from "node:fs";
import { randomBytes } from "node:crypto";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const moduleDir = dirname(fileURLToPath(import.meta.url));
export const defaultEnvPath = resolve(moduleDir, "..", ".env");
export const encryptionKeyEnvName = "CONFIG_ENCRYPTION_KEY";

function parseEnv(raw) {
  const values = {};
  for (const line of String(raw || "").split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const match = trimmed.match(/^([A-Za-z_][A-Za-z0-9_]*)=(.*)$/);
    if (!match) continue;
    const [, key, value] = match;
    values[key] = value.replace(/^"(.*)"$/, "$1").replace(/^'(.*)'$/, "$1");
  }
  return values;
}

function generateEncryptionKey() {
  return randomBytes(32).toString("base64url");
}

export function loadEnvFile(envPath = defaultEnvPath) {
  if (!existsSync(envPath)) return {};
  const values = parseEnv(readFileSync(envPath, "utf8"));
  for (const [key, value] of Object.entries(values)) {
    if (process.env[key] === undefined) process.env[key] = value;
  }
  return values;
}

export function ensureEnvEncryptionKey(envPath = defaultEnvPath) {
  const current = loadEnvFile(envPath);
  const fileValue = current[encryptionKeyEnvName];
  if (fileValue) {
    process.env[encryptionKeyEnvName] = fileValue;
    return fileValue;
  }
  const next = process.env[encryptionKeyEnvName] || generateEncryptionKey();
  if (existsSync(envPath)) {
    const raw = readFileSync(envPath, "utf8");
    const prefix = raw && !raw.endsWith("\n") ? "\n" : "";
    appendFileSync(envPath, `${prefix}${encryptionKeyEnvName}=${next}\n`, { encoding: "utf8" });
  } else {
    writeFileSync(envPath, `${encryptionKeyEnvName}=${next}\n`, { encoding: "utf8", flag: "w" });
  }
  process.env[encryptionKeyEnvName] = next;
  return next;
}

export function setEnvValue(name, value, envPath = defaultEnvPath) {
  const key = String(name || "").trim();
  if (!/^[A-Za-z_][A-Za-z0-9_]*$/.test(key)) throw new Error("Invalid env key name");
  const nextLine = `${key}=${value}`;
  if (!existsSync(envPath)) {
    writeFileSync(envPath, `${nextLine}\n`, { encoding: "utf8", flag: "w" });
    process.env[key] = value;
    return;
  }
  const raw = readFileSync(envPath, "utf8");
  const lines = raw.split(/\r?\n/);
  let replaced = false;
  const updated = lines.map((line) => {
    if (new RegExp(`^${key}=`).test(line)) {
      replaced = true;
      return nextLine;
    }
    return line;
  });
  if (!replaced) {
    if (updated.length && updated[updated.length - 1] !== "") updated.push(nextLine);
    else updated.splice(Math.max(updated.length - 1, 0), 0, nextLine);
  }
  writeFileSync(envPath, `${updated.join("\n").replace(/\n*$/, "")}\n`, { encoding: "utf8", flag: "w" });
  process.env[key] = value;
}

export function encryptionKeyBuffer(value = process.env[encryptionKeyEnvName]) {
  const raw = String(value || "").trim();
  if (!raw) throw new Error(`${encryptionKeyEnvName} is required`);
  const decoded = Buffer.from(raw, "base64url");
  if (decoded.length === 32) return decoded;
  const base64 = Buffer.from(raw, "base64");
  if (base64.length === 32) return base64;
  throw new Error(`${encryptionKeyEnvName} must decode to 32 bytes`);
}
