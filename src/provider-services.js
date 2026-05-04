const providerDefinitions = {
  fal: {
    label: "fal.ai",
    authHeader(apiKey) {
      return { authorization: `Key ${apiKey}` };
    },
    testUrl(baseUrl) {
      const root = String(baseUrl || "https://api.fal.ai").replace(/\/+$/, "");
      if (root.includes("fal.run")) return "https://api.fal.ai/v1/models?limit=1";
      return `${root}/v1/models?limit=1`;
    }
  },
  kie: {
    label: "Kie.ai",
    authHeader(apiKey) {
      return { authorization: `Bearer ${apiKey}` };
    },
    testUrl(baseUrl) {
      return `${String(baseUrl || "https://api.kie.ai").replace(/\/+$/, "")}/api/v1/chat/credit`;
    }
  },
  wavespeed: {
    label: "WaveSpeedAI",
    authHeader(apiKey) {
      return { authorization: `Bearer ${apiKey}` };
    },
    testUrl(baseUrl) {
      return `${String(baseUrl || "https://api.wavespeed.ai").replace(/\/+$/, "")}/api/v3/balance`;
    }
  }
};

export function supportedProviderServiceIds() {
  return Object.keys(providerDefinitions);
}

export async function testProviderService(providerId, providerConfig, { fetchImpl = fetch, timeoutMs = 15000 } = {}) {
  const definition = providerDefinitions[providerId];
  if (!definition) throw new Error(`Unsupported provider service: ${providerId}`);
  const apiKey = String(providerConfig?.apiKey || "").trim();
  if (!apiKey) {
    return {
      ok: false,
      provider: providerId,
      label: definition.label,
      status: 0,
      message: `Missing API key for ${definition.label}`
    };
  }
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  const method = definition.method || "GET";
  try {
    const response = await fetchImpl(definition.testUrl(providerConfig?.baseUrl), {
      method,
      signal: controller.signal,
      headers: {
        ...definition.authHeader(apiKey),
        ...(method !== "GET" ? { "content-type": "application/json" } : {})
      },
      body: method === "GET" ? undefined : JSON.stringify(definition.body || {})
    });
    const payload = await response.json().catch(() => ({}));
    return {
      ok: response.ok,
      provider: providerId,
      label: definition.label,
      status: response.status,
      message: response.ok
        ? "Provider API key accepted."
        : payload.error?.message || payload.msg || payload.message || `HTTP ${response.status}`
    };
  } catch (error) {
    if (error.name === "AbortError") {
      return {
        ok: false,
        provider: providerId,
        label: definition.label,
        status: 0,
        message: `Timed out after ${Math.round(timeoutMs / 1000)}s`
      };
    }
    return {
      ok: false,
      provider: providerId,
      label: definition.label,
      status: 0,
      message: error.message || "Provider test failed"
    };
  } finally {
    clearTimeout(timer);
  }
}
