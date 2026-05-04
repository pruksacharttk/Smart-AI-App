import test from "node:test";
import assert from "node:assert/strict";
import { supportedProviderServiceIds, testProviderService } from "../src/provider-services.js";

test("provider service list includes media API providers", () => {
  assert.deepEqual(supportedProviderServiceIds(), ["fal", "kie", "wavespeed"]);
});

test("fal provider test uses Key authorization and model listing endpoint", async () => {
  const result = await testProviderService("fal", {
    apiKey: "fal-secret",
    baseUrl: "https://fal.run"
  }, {
    fetchImpl: async (url, options) => {
      assert.equal(url, "https://api.fal.ai/v1/models?limit=1");
      assert.equal(options.headers.authorization, "Key fal-secret");
      return new Response(JSON.stringify({ models: [] }), { status: 200 });
    }
  });

  assert.equal(result.ok, true);
});

test("kie provider test uses Bearer authorization and credit endpoint", async () => {
  const result = await testProviderService("kie", {
    apiKey: "kie-secret",
    baseUrl: "https://api.kie.ai"
  }, {
    fetchImpl: async (url, options) => {
      assert.equal(url, "https://api.kie.ai/api/v1/chat/credit");
      assert.equal(options.headers.authorization, "Bearer kie-secret");
      return new Response(JSON.stringify({ code: 200, data: 100 }), { status: 200 });
    }
  });

  assert.equal(result.ok, true);
});

test("wavespeed provider test uses Bearer authorization and balance endpoint", async () => {
  const result = await testProviderService("wavespeed", {
    apiKey: "wavespeed-secret",
    baseUrl: "https://api.wavespeed.ai"
  }, {
    fetchImpl: async (url, options) => {
      assert.equal(url, "https://api.wavespeed.ai/api/v3/balance");
      assert.equal(options.headers.authorization, "Bearer wavespeed-secret");
      return new Response(JSON.stringify({ balance: 10 }), { status: 200 });
    }
  });

  assert.equal(result.ok, true);
});

test("provider test reports missing API key without throwing", async () => {
  const result = await testProviderService("fal", { apiKey: "" });
  assert.equal(result.ok, false);
  assert.equal(result.status, 0);
  assert.match(result.message, /Missing API key/);
});
