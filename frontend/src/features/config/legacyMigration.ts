import { saveConfig } from "../../api/client";
import type { LlmConfig, ProviderId } from "../../api/types";
import { defaultConfig } from "./constants";

export const legacyConfigKey = "llmConfig";
export const legacyConfigMigrationKey = "llmConfigDbMigrationCompleted";
export const legacyConfigMigrationV2Key = "llmConfigDbMigrationV2Completed";
export const legacyConfigMigrationV3Key = "llmConfigDbMigrationV3Completed";

const providerIds = Object.keys(defaultConfig.providers) as ProviderId[];
const legacyConfigStorageKeys = ["llmConfig", "appConfig", "smartAiConfig", "smartAiAppConfig", "config", "settings"];
const providerAliases: Record<ProviderId, string[]> = {
  nvidia: ["nvidia", "nvidiaNim"],
  openrouter: ["openrouter", "openRouter"],
  fal: ["fal", "falAi"],
  kie: ["kie", "kieAi"],
  wavespeed: ["wavespeed", "waveSpeed", "wavespeedAi", "waveSpeedAi"]
};

const legacyProviderApiKeyStorageKeys: Record<ProviderId, string[]> = {
  nvidia: ["nvidiaApiKey", "nvidiaKey", "nvidiaNimApiKey", "nvidiaNimKey"],
  openrouter: ["openrouterApiKey", "openrouterKey", "openRouterApiKey", "openRouterKey"],
  fal: ["falApiKey", "falKey", "falAiApiKey", "falAiKey"],
  kie: ["kieApiKey", "kieKey", "kieAiApiKey", "kieAiKey"],
  wavespeed: ["wavespeedApiKey", "wavespeedKey", "waveSpeedApiKey", "waveSpeedKey", "wavespeedAiApiKey", "wavespeedAiKey", "waveSpeedAiApiKey", "waveSpeedAiKey"]
};

export function cloneConfig(config: LlmConfig): LlmConfig {
  return structuredClone(config);
}

export function mergeConfig(saved?: Partial<LlmConfig>): LlmConfig {
  const source = saved || {};
  return {
    providers: {
      nvidia: { ...defaultConfig.providers.nvidia, ...(source.providers?.nvidia || {}) },
      openrouter: { ...defaultConfig.providers.openrouter, ...(source.providers?.openrouter || {}) },
      fal: { ...defaultConfig.providers.fal, ...(source.providers?.fal || {}) },
      kie: { ...defaultConfig.providers.kie, ...(source.providers?.kie || {}) },
      wavespeed: { ...defaultConfig.providers.wavespeed, ...(source.providers?.wavespeed || {}) }
    },
    fallback: Array.from({ length: 4 }, (_, index) => ({
      ...defaultConfig.fallback[index],
      ...(source.fallback?.[index] || {})
    }))
  };
}

export function configHasApiKey(config: LlmConfig) {
  return Object.values(config.providers).some((provider) => Boolean(provider.apiKey?.trim()));
}

export function configHasSavedApiKey(config: LlmConfig) {
  return Object.values(config.providers).some((provider) => Boolean(provider.hasApiKey));
}

function providerHasSavedApiKey(config: LlmConfig, providerId: ProviderId) {
  return Boolean(config.providers[providerId]?.hasApiKey);
}

function readSecretLikeValue(value: unknown) {
  return typeof value === "string" ? value.trim() : "";
}

function readProviderApiKey(source: unknown, providerId: ProviderId) {
  if (!source || typeof source !== "object") return "";
  const record = source as Record<string, unknown>;
  for (const alias of providerAliases[providerId]) {
    const direct = record[`${alias}ApiKey`] ?? record[`${alias}Key`] ?? record[`${alias}Token`] ?? record[`${alias}Secret`];
    const directValue = readSecretLikeValue(direct);
    if (directValue) return directValue;

    const nested = record[alias];
    const aliasValue = readSecretLikeValue(nested);
    if (aliasValue) return aliasValue;
    if (nested && typeof nested === "object") {
      const nestedRecord = nested as Record<string, unknown>;
      const nestedValue = readSecretLikeValue(nestedRecord.apiKey ?? nestedRecord.key ?? nestedRecord.token ?? nestedRecord.secret);
      if (nestedValue) return nestedValue;
    }
  }
  return "";
}

function applyLegacyObject(config: LlmConfig, value: unknown) {
  if (!value || typeof value !== "object") return false;
  let found = false;
  const record = value as Record<string, unknown>;
  const candidates = [
    record,
    record.config,
    record.llmConfig,
    record.settings,
    record.apiKeys,
    record.providerKeys,
    record.providers
  ];

  for (const candidate of candidates) {
    if (!candidate || typeof candidate !== "object") continue;
    for (const providerId of providerIds) {
      const apiKey = readProviderApiKey(candidate, providerId);
      if (!apiKey) continue;
      config.providers[providerId].apiKey = apiKey;
      found = true;
    }
  }

  const parsed = mergeConfig(value as Partial<LlmConfig>);
  for (const providerId of providerIds) {
    const apiKey = parsed.providers[providerId]?.apiKey?.trim();
    if (!apiKey) continue;
    config.providers[providerId] = parsed.providers[providerId];
    found = true;
  }

  return found;
}

function isStandaloneProviderSecretKey(keyName: string, providerId: ProviderId) {
  const normalizedKey = keyName.toLowerCase().replace(/[^a-z0-9]/g, "");
  const looksSecret = ["apikey", "key", "token", "secret"].some((part) => normalizedKey.includes(part));
  if (!looksSecret) return false;
  return providerAliases[providerId].some((alias) => normalizedKey.includes(alias.toLowerCase().replace(/[^a-z0-9]/g, "")));
}

function isProviderAliasKey(keyName: string, providerId: ProviderId) {
  const normalizedKey = keyName.toLowerCase().replace(/[^a-z0-9]/g, "");
  return providerAliases[providerId].some((alias) => normalizedKey === alias.toLowerCase().replace(/[^a-z0-9]/g, ""));
}

function extractLegacyLocalConfig(storage: Storage): LlmConfig | null {
  let foundLegacyValue = false;
  let legacyConfig = mergeConfig(defaultConfig);

  for (const storageKey of legacyConfigStorageKeys) {
    const raw = storage.getItem(storageKey);
    if (!raw) continue;
    try {
      foundLegacyValue = applyLegacyObject(legacyConfig, JSON.parse(raw)) || foundLegacyValue;
    } catch {
      if (storageKey === legacyConfigKey) storage.removeItem(storageKey);
    }
  }

  for (const providerId of providerIds) {
    for (const keyName of legacyProviderApiKeyStorageKeys[providerId]) {
      const apiKey = storage.getItem(keyName)?.trim();
      if (!apiKey) continue;
      legacyConfig.providers[providerId].apiKey = apiKey;
      foundLegacyValue = true;
      break;
    }
  }

  for (let index = 0; index < storage.length; index += 1) {
    const keyName = storage.key(index);
    if (!keyName) continue;
    for (const providerId of providerIds) {
      if (!isStandaloneProviderSecretKey(keyName, providerId)) continue;
      const apiKey = storage.getItem(keyName)?.trim();
      if (!apiKey || apiKey.startsWith("{") || apiKey.startsWith("[")) continue;
      legacyConfig.providers[providerId].apiKey = apiKey;
      foundLegacyValue = true;
    }
  }

  return foundLegacyValue ? legacyConfig : null;
}

function hasMigratableApiKey(legacyConfig: LlmConfig, serverConfig: LlmConfig) {
  return providerIds.some((providerId) => {
    const apiKey = legacyConfig.providers[providerId]?.apiKey?.trim();
    return Boolean(apiKey && !providerHasSavedApiKey(serverConfig, providerId));
  });
}

export function sanitizeLegacyLocalConfig(storage: Storage = localStorage) {
  for (const storageKey of legacyConfigStorageKeys) {
    const raw = storage.getItem(storageKey);
    if (!raw) continue;
    try {
      const parsed = JSON.parse(raw) as Record<string, unknown>;
      sanitizeLegacyObject(parsed);
      storage.setItem(storageKey, JSON.stringify(parsed));
    } catch {
      if (storageKey === legacyConfigKey) storage.removeItem(storageKey);
    }
  }

  for (let index = storage.length - 1; index >= 0; index -= 1) {
    const keyName = storage.key(index);
    if (!keyName) continue;
    for (const providerId of providerIds) {
      if (isStandaloneProviderSecretKey(keyName, providerId)) {
        storage.removeItem(keyName);
        break;
      }
    }
  }

  for (const providerId of providerIds) {
    for (const keyName of legacyProviderApiKeyStorageKeys[providerId]) {
      storage.removeItem(keyName);
    }
  }
}

function sanitizeLegacyObject(value: unknown) {
  if (!value || typeof value !== "object") return;
  const record = value as Record<string, unknown>;
  for (const key of Object.keys(record)) {
    const normalizedKey = key.toLowerCase().replace(/[^a-z0-9]/g, "");
    const isProviderSecret = providerIds.some((providerId) => isStandaloneProviderSecretKey(key, providerId));
    const isProviderAlias = providerIds.some((providerId) => isProviderAliasKey(key, providerId));
    if (isProviderAlias && typeof record[key] === "string") {
      record[key] = "";
      continue;
    }
    if (isProviderSecret || ["apikey", "key", "token", "secret"].includes(normalizedKey)) {
      if (typeof record[key] === "string") record[key] = "";
      continue;
    }
    sanitizeLegacyObject(record[key]);
  }
}

export async function migrateLegacyLocalConfigOnce(serverConfig: LlmConfig, storage: Storage = localStorage) {
  const legacyConfig = extractLegacyLocalConfig(storage);
  if (!legacyConfig) return serverConfig;

  if (storage.getItem(legacyConfigMigrationV3Key) === "true") {
    sanitizeLegacyLocalConfig(storage);
    return serverConfig;
  }

  if (!configHasApiKey(legacyConfig) || !hasMigratableApiKey(legacyConfig, serverConfig)) {
    sanitizeLegacyLocalConfig(storage);
    storage.setItem(legacyConfigMigrationKey, "true");
    storage.setItem(legacyConfigMigrationV2Key, "true");
    storage.setItem(legacyConfigMigrationV3Key, "true");
    return serverConfig;
  }

  const nextConfig = mergeConfig(serverConfig);
  for (const providerId of providerIds) {
    const apiKey = legacyConfig.providers[providerId]?.apiKey?.trim();
    if (!apiKey || providerHasSavedApiKey(serverConfig, providerId)) continue;
    nextConfig.providers[providerId] = {
      ...nextConfig.providers[providerId],
      apiKey,
      baseUrl: legacyConfig.providers[providerId]?.baseUrl || nextConfig.providers[providerId].baseUrl
    };
  }

  if (!configHasSavedApiKey(serverConfig)) {
    nextConfig.fallback = legacyConfig.fallback;
  }

  const migrated = mergeConfig((await saveConfig(nextConfig)).config);
  sanitizeLegacyLocalConfig(storage);
  storage.setItem(legacyConfigMigrationKey, "true");
  storage.setItem(legacyConfigMigrationV2Key, "true");
  storage.setItem(legacyConfigMigrationV3Key, "true");
  return migrated;
}
