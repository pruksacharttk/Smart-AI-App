import type { LlmConfig, ProviderId } from "../../api/types";

export const providerIds: ProviderId[] = ["nvidia", "openrouter", "fal", "kie", "wavespeed"];

export const providerLabels: Record<ProviderId, string> = {
  nvidia: "NVIDIA NIM",
  openrouter: "OpenRouter",
  fal: "fal.ai",
  kie: "Kie.ai",
  wavespeed: "WaveSpeedAI"
};

export const providerKeyLinks: Record<ProviderId, string> = {
  nvidia: "https://build.nvidia.com/settings/api-keys",
  openrouter: "https://openrouter.ai/settings/keys",
  fal: "https://fal.ai/dashboard/keys",
  kie: "https://kie.ai/api-key",
  wavespeed: "https://www.wavespeed.ai/dashboard"
};

export const modelOptions = {
  openrouter: [
    "qwen/qwen3-vl-32b-instruct",
    "qwen/qwen3-vl-8b-instruct",
    "qwen/qwen3-vl-235b-a22b-instruct",
    "qwen/qwen3.5-35b-a3b",
    "qwen/qwen3.5-plus-02-15",
    "qwen/qwen3.5-397b-a17b",
    "google/gemini-2.5-flash",
    "anthropic/claude-sonnet-4.5",
    "__custom__"
  ],
  nvidia: ["openai/gpt-oss-120b", "deepseek-ai/deepseek-r1", "__custom__"]
};

export const imageModelRecommendations = [
  "qwen/qwen3-vl-32b-instruct",
  "qwen/qwen3-vl-8b-instruct",
  "qwen/qwen3-vl-235b-a22b-instruct",
  "qwen/qwen3.5-35b-a3b",
  "qwen/qwen3.5-plus-02-15",
  "qwen/qwen3.5-397b-a17b"
];

export const defaultConfig: LlmConfig = {
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
