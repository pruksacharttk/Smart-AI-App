export const legacyConfigKey = "llmConfig";
export const legacyConfigMigrationKey = "llmConfigDbMigrationCompleted";

export function configHasApiKey(config) {
  return Object.values(config?.providers || {}).some((provider) => String(provider?.apiKey || "").trim());
}

export function configHasSavedApiKey(config) {
  return Object.values(config?.providers || {}).some((provider) => Boolean(provider?.hasApiKey));
}

export function sanitizeLegacyConfigJson(raw) {
  if (!raw) return null;
  const parsed = JSON.parse(raw);
  for (const provider of Object.values(parsed.providers || {})) {
    if (provider && typeof provider === "object") provider.apiKey = "";
  }
  return JSON.stringify(parsed);
}
