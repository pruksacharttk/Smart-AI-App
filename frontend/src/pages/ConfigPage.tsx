import { useEffect, useState } from "react";
import { clearConfig, revealConfigKey, rotateConfigKey, sanitizePayload, saveConfig, testLlm, testProvider } from "../api/client";
import type { Language, LlmConfig, LlmTestResult, ProviderId, ProviderTestResult } from "../api/types";
import { imageModelRecommendations, modelOptions, providerIds, providerKeyLinks, providerLabels } from "../features/config/constants";
import { mergeConfig } from "../features/config/legacyMigration";
import { t } from "../features/i18n/text";

interface ConfigPageProps {
  language: Language;
  config: LlmConfig;
  onConfigChange: (config: LlmConfig) => void;
  setStatus: (message: string, tone?: "ok" | "warn" | "error") => void;
}

type ConfigTestResults =
  | { kind: "message"; title: string; message: string; tone: "ok" | "warn" | "error" }
  | { kind: "llm"; title: string; description: string; rows: LlmTestResult[] }
  | { kind: "media"; title: string; description: string; rows: ProviderTestResult[] };

function resultTone(ok?: boolean, skipped?: boolean) {
  if (ok) return "ok";
  if (skipped) return "skip";
  return "fail";
}

function resultLabel(ok?: boolean, skipped?: boolean) {
  if (ok) return "OK";
  if (skipped) return "SKIP";
  return "ACTION NEEDED";
}

export function ConfigPage({ language, config, onConfigChange, setStatus }: ConfigPageProps) {
  const [draft, setDraft] = useState<LlmConfig>(() => mergeConfig(config));
  const [showKeys, setShowKeys] = useState<Record<string, boolean>>({});
  const [revealedKeys, setRevealedKeys] = useState<Record<string, boolean>>({});
  const [results, setResults] = useState<ConfigTestResults | null>(null);

  useEffect(() => {
    setDraft(mergeConfig(config));
  }, [config]);

  function updateProvider(id: ProviderId, patch: Partial<LlmConfig["providers"][ProviderId]>) {
    if (Object.hasOwn(patch, "apiKey")) {
      setRevealedKeys((current) => ({ ...current, [id]: false }));
    }
    setDraft((current) => ({
      ...current,
      providers: {
        ...current.providers,
        [id]: { ...current.providers[id], ...patch }
      }
    }));
  }

  async function toggleProviderKey(id: ProviderId) {
    if (showKeys[id]) {
      setShowKeys((current) => ({ ...current, [id]: false }));
      if (revealedKeys[id]) {
        updateProvider(id, { apiKey: "" });
        setRevealedKeys((current) => ({ ...current, [id]: false }));
      }
      return;
    }

    const provider = draft.providers[id];
    if (!provider.apiKey && provider.hasApiKey) {
      const ok = window.confirm("Reveal this saved API key in the browser? Hide it again when finished.");
      if (!ok) return;
      setStatus(`Revealing ${providerLabels[id]} key`, "warn");
      try {
        const response = await revealConfigKey(id);
        setDraft((current) => ({
          ...current,
          providers: {
            ...current.providers,
            [id]: { ...current.providers[id], apiKey: response.apiKey }
          }
        }));
        setRevealedKeys((current) => ({ ...current, [id]: true }));
        setShowKeys((current) => ({ ...current, [id]: true }));
        setStatus(`${providerLabels[id]} key revealed`, "ok");
      } catch (error) {
        setStatus(error instanceof Error ? error.message : "Unable to reveal saved key", "error");
      }
      return;
    }

    setShowKeys((current) => ({ ...current, [id]: true }));
  }

  function updateFallback(index: number, patch: Partial<LlmConfig["fallback"][number]>) {
    setDraft((current) => ({
      ...current,
      fallback: current.fallback.map((item, itemIndex) => (itemIndex === index ? { ...item, ...patch } : item))
    }));
  }

  async function saveDraft() {
    setStatus("Saving config", "warn");
    const response = await saveConfig(draft);
    const next = mergeConfig(response.config);
    setDraft(next);
    onConfigChange(next);
    setResults({
      kind: "message",
      tone: "ok",
      title: "Config saved",
      message: "Secrets are stored encrypted. Normal config loading only returns saved/unsaved status, not API key values."
    });
    setStatus("Config saved", "ok");
  }

  async function clearDraft() {
    const response = await clearConfig();
    const next = mergeConfig(response.config);
    setDraft(next);
    onConfigChange(next);
    setResults({ kind: "message", tone: "warn", title: "Config cleared", message: "All saved provider keys and fallback settings were reset." });
    setStatus("Config cleared", "ok");
  }

  async function rotateKey() {
    const ok = window.confirm("Rotate the encryption key and re-encrypt saved API keys? Keep .env and the SQLite DB together. If .env is lost, saved keys cannot be decrypted.");
    if (!ok) return;
    const response = await rotateConfigKey();
    const next = mergeConfig(response.config);
    setDraft(next);
    onConfigChange(next);
    setResults({
      kind: "message",
      tone: "ok",
      title: "Encryption key rotated",
      message: "Saved API keys were re-encrypted. Keep the SQLite DB and .env together."
    });
    setStatus("Encryption key rotated", "ok");
  }

  async function runLlmTest() {
    try {
      await saveDraft();
      const response = await testLlm(draft);
      setResults({
        kind: "llm",
        title: "LLM fallback test",
        description: "Tests the configured fallback rows in order. This is where OpenRouter/NVIDIA chat-completions compatible models are checked.",
        rows: sanitizePayload(response.results)
      });
      setStatus("LLM test completed", response.results?.some((item) => item.ok) ? "ok" : "warn");
    } catch (error) {
      const message = error instanceof Error ? error.message : "LLM test failed.";
      setResults({ kind: "message", tone: "error", title: "LLM test failed", message });
      setStatus("LLM test failed", "error");
    }
  }

  async function runProviderTests() {
    try {
      await saveDraft();
      const response = await Promise.all((["fal", "kie", "wavespeed"] as ProviderId[]).map((id) => testProvider(id)));
      setResults({
        kind: "media",
        title: "Media provider API test",
        description: "Tests fal.ai, Kie.ai, and WaveSpeedAI service keys only. OpenRouter/NVIDIA are tested by Test LLM Fallbacks.",
        rows: sanitizePayload(response)
      });
      setStatus("Provider tests completed", response.some((item) => item.ok) ? "ok" : "warn");
    } catch (error) {
      const message = error instanceof Error ? error.message : "Provider API test failed.";
      setResults({ kind: "message", tone: "error", title: "Provider API test failed", message });
      setStatus("Provider test failed", "error");
    }
  }

  function renderResults() {
    if (!results) return null;
    if (results.kind === "message") {
      return (
        <section className={`test-results ${results.tone}`}>
          <h3>{results.title}</h3>
          <p>{results.message}</p>
        </section>
      );
    }
    return (
      <section className="test-results">
        <div className="test-results-head">
          <div>
            <h3>{results.title}</h3>
            <p>{results.description}</p>
          </div>
        </div>
        <div className="test-result-list">
          {results.kind === "llm"
            ? results.rows.map((item, index) => (
              <article className={`test-result-card ${resultTone(item.ok, Boolean(item.skipped))}`} key={`${item.provider}-${item.model}-${index}`}>
                <strong>{resultLabel(item.ok, Boolean(item.skipped))}</strong>
                <span>Fallback #{String(item.rank ?? index + 1)}</span>
                <b>{item.provider || "Unknown provider"}</b>
                <code>{item.model || "-"}</code>
                <p>{String(item.preview || item.message || item.error || (item.ok ? "Model responded successfully." : "This fallback did not pass."))}</p>
              </article>
            ))
            : results.rows.map((item) => (
              <article className={`test-result-card ${resultTone(item.ok, false)}`} key={String(item.provider)}>
                <strong>{resultLabel(item.ok, false)}</strong>
                <span>{item.ok ? "Connected" : item.status === 0 ? "Missing key" : `HTTP ${item.status ?? "-"}`}</span>
                <b>{String(item.label || providerLabels[item.provider as ProviderId] || item.provider)}</b>
                <p>{String(item.message || item.error || (item.ok ? "Provider API key is usable." : "Add a key above, save config, then test again."))}</p>
              </article>
            ))}
        </div>
      </section>
    );
  }

  return (
    <section className="page">
      <div className="page-head">
        <div>
          <h2>{t(language, "config")}</h2>
          <p>Encrypted LLM and provider configuration.</p>
        </div>
      </div>

      <div className="warning">
        DB กับ .env ต้องอยู่คู่กัน ถ้า .env หาย จะถอดรหัส API key เดิมไม่ได้
      </div>

      <div className="provider-grid">
        {providerIds.map((id) => (
          <section className="provider-card" key={id}>
            <div className="card-head">
              <h3>{providerLabels[id]}</h3>
              <a href={providerKeyLinks[id]} target="_blank" rel="noreferrer">Create key</a>
            </div>
            <label>
              <span>API key</span>
              <input
                type={showKeys[id] ? "text" : "password"}
                value={draft.providers[id].apiKey}
                placeholder={draft.providers[id].hasApiKey ? "Saved encrypted key - leave blank to keep" : "Paste API key"}
                onChange={(event) => updateProvider(id, { apiKey: event.target.value })}
                autoComplete="off"
              />
            </label>
            <button type="button" className="link-button" onClick={() => void toggleProviderKey(id)}>
              {showKeys[id] ? "Hide" : "Show"}
            </button>
            <label>
              <span>Base URL</span>
              <input value={draft.providers[id].baseUrl} onChange={(event) => updateProvider(id, { baseUrl: event.target.value })} />
            </label>
          </section>
        ))}
      </div>

      <section className="panel">
        <h3>Fallback models</h3>
        <div className="fallback-list">
          {draft.fallback.map((item, index) => (
            <div className="fallback-row" key={index}>
              <strong>{index + 1}</strong>
              <select value={item.provider} onChange={(event) => updateFallback(index, { provider: event.target.value as "nvidia" | "openrouter", model: modelOptions[event.target.value as "nvidia" | "openrouter"][0] })}>
                <option value="openrouter">OpenRouter</option>
                <option value="nvidia">NVIDIA</option>
              </select>
              <select value={item.model} onChange={(event) => updateFallback(index, { model: event.target.value })}>
                {modelOptions[item.provider].map((model) => (
                  <option key={model} value={model}>{model}</option>
                ))}
              </select>
              <input value={item.customModel || ""} placeholder="custom provider/model" onChange={(event) => updateFallback(index, { customModel: event.target.value })} />
            </div>
          ))}
        </div>
        <aside className="model-guidance">
          <strong>If you attach images, use a model that supports image input</strong>
          <p>Text-only models and some free OpenRouter routes may not read uploaded images. Recommended Qwen vision fallback models:</p>
          <ul>
            {imageModelRecommendations.map((model) => <li key={model}>{model}</li>)}
          </ul>
        </aside>
      </section>

      <div className="actions">
        <button type="button" onClick={() => void clearDraft()}>{t(language, "clear")}</button>
        <button type="button" onClick={() => void rotateKey()}>{t(language, "rotateKey")}</button>
        <button type="button" onClick={() => void runProviderTests()}>{t(language, "testProviders")}</button>
        <button type="button" onClick={() => void runLlmTest()}>{t(language, "testLlm")}</button>
        <button type="button" className="primary" onClick={() => void saveDraft()}>{t(language, "save")}</button>
      </div>
      <p className="test-help">
        Media provider test checks fal.ai, Kie.ai, and WaveSpeedAI keys. LLM fallback test checks OpenRouter/NVIDIA model rows above.
      </p>

      {renderResults()}
    </section>
  );
}
