import { readSseStream } from "./sse";
import type {
  ApiError,
  ConfigResponse,
  ConfigSecretResponse,
  LlmConfig,
  LlmTestResponse,
  ProviderId,
  ProviderTestResponse,
  RunSkillPayload,
  RunSkillResult,
  RunStatusEvent,
  SkillsResponse,
  UiSchemaResponse,
  UsageResponse
} from "./types";

const secretPatterns = [
  /sk-[a-z0-9_-]+/gi,
  /sk-or-[a-z0-9_-]+/gi,
  /nvapi-[a-z0-9_-]+/gi,
  /fal-[a-z0-9_-]+/gi,
  /kie[_-]?[a-z0-9_-]{8,}/gi,
  /wavespeed[_-]?[a-z0-9_-]{8,}/gi,
  /(?:api[_-]?key|authorization|bearer|token)["':=\s]+[a-z0-9._-]{8,}/gi
];

function collectConfigSecrets(config?: LlmConfig) {
  return Object.values(config?.providers || {})
    .map((provider) => provider.apiKey?.trim())
    .filter((value): value is string => Boolean(value));
}

function escapeRegExp(value: string) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

export function sanitizeMessage(message: string, exactSecrets: string[] = []): string {
  const withoutKnownSecrets = exactSecrets.reduce((next, secret) => {
    if (!secret) return next;
    return next.replace(new RegExp(escapeRegExp(secret), "g"), "[redacted]");
  }, message);
  return secretPatterns.reduce((next, pattern) => next.replace(pattern, "[redacted]"), withoutKnownSecrets);
}

export function sanitizePayload<T>(payload: T, exactSecrets: string[] = []): T {
  if (typeof payload === "string") return sanitizeMessage(payload, exactSecrets) as T;
  if (Array.isArray(payload)) return payload.map((item) => sanitizePayload(item, exactSecrets)) as T;
  if (payload && typeof payload === "object") {
    return Object.fromEntries(
      Object.entries(payload).map(([key, value]) => [key, sanitizePayload(value, exactSecrets)])
    ) as T;
  }
  return payload;
}

async function parseJson(response: Response): Promise<unknown> {
  const text = await response.text();
  if (!text) return {};
  try {
    return JSON.parse(text);
  } catch {
    return { error: "Unexpected non-JSON response." };
  }
}

async function requestJson<T>(
  url: string,
  init: RequestInit = {},
  options: { allowErrorPayload?: boolean; exactSecrets?: string[]; sanitize?: boolean } = {}
): Promise<T> {
  const response = await fetch(url, {
    ...init,
    headers: {
      accept: "application/json",
      ...(init.body ? { "content-type": "application/json" } : {}),
      ...(init.headers || {})
    }
  });
  const rawPayload = await parseJson(response);
  const payload = options.sanitize === false ? rawPayload : sanitizePayload(rawPayload, options.exactSecrets);
  if (!response.ok) {
    if (options.allowErrorPayload) return payload as T;
    const error = new Error(
      sanitizeMessage(String((payload as { error?: string })?.error || `Request failed with ${response.status}`), options.exactSecrets)
    ) as ApiError;
    error.status = response.status;
    error.payload = payload;
    throw error;
  }
  return payload as T;
}

export function getSkills() {
  return requestJson<SkillsResponse>("/api/skills");
}

export function getUiSchema(skillId: string) {
  return requestJson<UiSchemaResponse>(`/api/ui-schema?skill=${encodeURIComponent(skillId)}`);
}

export function getUsage() {
  return requestJson<UsageResponse>("/api/llm-usage");
}

export function getConfig() {
  return requestJson<ConfigResponse>("/api/config");
}

export function saveConfig(config: LlmConfig) {
  return requestJson<ConfigResponse>("/api/config", {
    method: "POST",
    body: JSON.stringify({ config })
  });
}

export function clearConfig() {
  return requestJson<ConfigResponse>("/api/config", { method: "DELETE" });
}

export function rotateConfigKey() {
  return requestJson<ConfigResponse>("/api/config/rotate-key", { method: "POST" });
}

export function revealConfigKey(provider: ProviderId) {
  return requestJson<ConfigSecretResponse>("/api/config/reveal", {
    method: "POST",
    body: JSON.stringify({ provider })
  }, { sanitize: false });
}

export function testLlm(config: LlmConfig) {
  return requestJson<LlmTestResponse>("/api/test-llm", {
    method: "POST",
    body: JSON.stringify({ llmConfig: config })
  }, { allowErrorPayload: true, exactSecrets: collectConfigSecrets(config) });
}

export async function testProvider(providerId: ProviderId) {
  const response = await requestJson<ProviderTestResponse>(`/api/providers/${encodeURIComponent(providerId)}/test`, {
    method: "POST"
  }, { allowErrorPayload: true });
  return response.result;
}

export async function runSkillStream(payload: RunSkillPayload, onStatus: (status: RunStatusEvent) => void) {
  const response = await fetch("/api/run-skill-stream", {
    method: "POST",
    headers: { "content-type": "application/json", accept: "text/event-stream" },
    body: JSON.stringify(payload)
  });

  if (!response.ok) {
    const error = sanitizePayload(await parseJson(response));
    throw new Error(sanitizeMessage(String((error as { error?: string })?.error || "Unable to start skill run.")));
  }

  return readSseStream<RunStatusEvent, RunSkillResult>(response, onStatus);
}
