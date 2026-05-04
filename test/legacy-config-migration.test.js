import test from "node:test";
import assert from "node:assert/strict";
import {
  configHasApiKey,
  configHasSavedApiKey,
  sanitizeLegacyConfigJson
} from "../src/legacy-config-migration.js";

test("legacy config helpers detect browser API keys and saved database keys", () => {
  assert.equal(configHasApiKey({
    providers: {
      openrouter: { apiKey: "sk-or-secret" },
      nvidia: { apiKey: "" }
    }
  }), true);
  assert.equal(configHasApiKey({
    providers: {
      openrouter: { apiKey: "" }
    }
  }), false);
  assert.equal(configHasSavedApiKey({
    providers: {
      openrouter: { hasApiKey: true, apiKey: "" }
    }
  }), true);
});

test("sanitizeLegacyConfigJson removes only provider API key values", () => {
  const sanitized = JSON.parse(sanitizeLegacyConfigJson(JSON.stringify({
    providers: {
      openrouter: { apiKey: "sk-or-secret", baseUrl: "https://openrouter.ai/api/v1" },
      fal: { apiKey: "fal-secret", baseUrl: "https://fal.run" }
    },
    fallback: [
      { provider: "openrouter", model: "model-a", customModel: "" }
    ]
  })));

  assert.equal(sanitized.providers.openrouter.apiKey, "");
  assert.equal(sanitized.providers.openrouter.baseUrl, "https://openrouter.ai/api/v1");
  assert.equal(sanitized.providers.fal.apiKey, "");
  assert.deepEqual(sanitized.fallback, [
    { provider: "openrouter", model: "model-a", customModel: "" }
  ]);
});
