export type PageId = "dashboard" | "run" | "config";
export type Language = "en" | "th";
export type ProviderId = "nvidia" | "openrouter" | "fal" | "kie" | "wavespeed";

export interface SkillIssue {
  severity?: string;
  code?: string;
  message?: string;
  path?: string;
}

export interface SkillSummary {
  id: string;
  title: string;
  description?: string;
  hasRuntime?: boolean;
  issues?: SkillIssue[];
}

export interface SkillsResponse {
  defaultSkillId: string;
  skills: SkillSummary[];
  invalidSkills: SkillSummary[];
}

export interface UiField {
  name?: string;
  key?: string;
  id?: string;
  label?: string;
  description?: string;
  type?: string;
  input?: string;
  widget?: string;
  required?: boolean;
  options?: Array<string | { value?: string; label?: string; id?: string; name?: string }>;
  choices?: Array<string | { value?: string; label?: string; id?: string; name?: string }>;
  enum?: string[];
  default?: unknown;
  placeholder?: string;
  multiple?: boolean;
  accept?: string;
  maxImages?: number;
  rows?: number;
  labelTh?: string;
  placeholderTh?: string;
  helpText?: string;
  helpTextTh?: string;
  min?: number;
  max?: number;
  step?: number;
}

export interface UiSection {
  id?: string;
  title?: string;
  titleTh?: string;
  description?: string;
  descriptionTh?: string;
  fields?: UiField[];
}

export interface UiSchemaResponse {
  skill: SkillSummary;
  fields?: UiField[];
  uiSchema?: { fields?: UiField[]; sections?: UiSection[] };
  schema?: {
    properties?: Record<string, unknown>;
    required?: string[];
  };
  inputSchema?: {
    properties?: Record<string, unknown>;
    required?: string[];
  };
  missingMapping?: string[];
  coverage?: {
    missingUi?: string[];
    missingMapping?: string[];
    [key: string]: unknown;
  };
  [key: string]: unknown;
}

export interface ProviderConfig {
  apiKey: string;
  baseUrl: string;
  hasApiKey?: boolean;
}

export interface FallbackModel {
  provider: "nvidia" | "openrouter";
  model: string;
  customModel?: string;
}

export interface LlmConfig {
  providers: Record<ProviderId, ProviderConfig>;
  fallback: FallbackModel[];
}

export interface UsageRow {
  provider: string;
  model: string;
  usageCount: number;
  lastUsedAt: string;
}

export interface UsageResponse {
  rows: UsageRow[];
}

export interface ConfigResponse {
  config: LlmConfig;
  rotated?: boolean;
}

export interface ConfigSecretResponse {
  provider: ProviderId | string;
  apiKey: string;
}

export interface LlmTestResult {
  ok: boolean;
  provider?: string;
  model?: string;
  status?: number;
  message?: string;
  error?: string;
  [key: string]: unknown;
}

export interface LlmTestResponse {
  results: LlmTestResult[];
}

export interface ProviderTestResult {
  ok: boolean;
  provider: ProviderId | string;
  status?: number;
  message?: string;
  error?: string;
  [key: string]: unknown;
}

export interface ProviderTestResponse {
  result: ProviderTestResult;
}

export interface RunSkillPayload {
  skillId: string;
  params: Record<string, unknown>;
  llmConfig?: LlmConfig;
}

export interface RunStatusEvent {
  phase?: string;
  provider?: string;
  model?: string;
  rank?: number;
  message?: string;
  [key: string]: unknown;
}

export interface RunSkillResult {
  success?: boolean;
  output?: unknown;
  review?: unknown;
  warnings?: unknown[];
  llm?: unknown;
  lastSuccessfulLlm?: unknown;
  usageRecorded?: boolean;
  [key: string]: unknown;
}

export interface ApiError extends Error {
  status?: number;
  payload?: unknown;
}
