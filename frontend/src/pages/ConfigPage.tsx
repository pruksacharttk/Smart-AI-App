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

function resultLabel(language: Language, ok?: boolean, skipped?: boolean) {
  if (ok) return t(language, "ok");
  if (skipped) return t(language, "skip");
  return t(language, "actionNeeded");
}

function formatText(template: string, values: Record<string, string | number>) {
  return template.replace(/\{(\w+)\}/g, (_, key) => String(values[key] ?? ""));
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
      const ok = window.confirm(t(language, "revealSavedKeyConfirm"));
      if (!ok) return;
      setStatus(formatText(t(language, "revealKeyStatus"), { provider: providerLabels[id] }), "warn");
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
        setStatus(formatText(t(language, "revealKeyDone"), { provider: providerLabels[id] }), "ok");
      } catch (error) {
        setStatus(error instanceof Error ? error.message : t(language, "unableToRevealKey"), "error");
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
    setStatus(t(language, "savingConfig"), "warn");
    const response = await saveConfig(draft);
    const next = mergeConfig(response.config);
    setDraft(next);
    onConfigChange(next);
    setResults({
      kind: "message",
      tone: "ok",
      title: t(language, "configSavedTitle"),
      message: t(language, "configSavedMessage")
    });
    setStatus(t(language, "configSavedTitle"), "ok");
  }

  async function clearDraft() {
    const response = await clearConfig();
    const next = mergeConfig(response.config);
    setDraft(next);
    onConfigChange(next);
    setResults({ kind: "message", tone: "warn", title: t(language, "configClearedTitle"), message: t(language, "configClearedMessage") });
    setStatus(t(language, "configClearedTitle"), "ok");
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
      title: t(language, "encryptionKeyRotatedTitle"),
      message: t(language, "encryptionKeyRotatedMessage")
    });
    setStatus(t(language, "encryptionKeyRotatedTitle"), "ok");
  }

  async function runLlmTest() {
    try {
      await saveDraft();
      const response = await testLlm(draft);
      setResults({
        kind: "llm",
        title: t(language, "llmFallbackTestTitle"),
        description: t(language, "llmFallbackTestDesc"),
        rows: sanitizePayload(response.results)
      });
      setStatus(t(language, "llmTestCompleted"), response.results?.some((item) => item.ok) ? "ok" : "warn");
    } catch (error) {
      const message = error instanceof Error ? error.message : t(language, "llmTestFailed");
      setResults({ kind: "message", tone: "error", title: t(language, "llmTestFailed"), message });
      setStatus(t(language, "llmTestFailed"), "error");
    }
  }

  async function runProviderTests() {
    try {
      await saveDraft();
      const response = await Promise.all((["fal", "kie", "wavespeed"] as ProviderId[]).map((id) => testProvider(id)));
      setResults({
        kind: "media",
        title: t(language, "mediaProviderTestTitle"),
        description: t(language, "mediaProviderTestDesc"),
        rows: sanitizePayload(response)
      });
      setStatus(t(language, "providerTestsCompleted"), response.some((item) => item.ok) ? "ok" : "warn");
    } catch (error) {
      const message = error instanceof Error ? error.message : t(language, "providerTestFailed");
      setResults({ kind: "message", tone: "error", title: t(language, "providerTestFailed"), message });
      setStatus(t(language, "providerTestFailed"), "error");
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
                <strong>{resultLabel(language, item.ok, Boolean(item.skipped))}</strong>
                <span>{t(language, "fallbackPrefix")} #{String(item.rank ?? index + 1)}</span>
                <b>{item.provider || t(language, "unknownProvider")}</b>
                <code>{item.model || "-"}</code>
                <p>{String(item.preview || item.message || item.error || (item.ok ? t(language, "modelResponded") : t(language, "fallbackDidNotPass")))}</p>
              </article>
            ))
            : results.rows.map((item) => (
              <article className={`test-result-card ${resultTone(item.ok, false)}`} key={String(item.provider)}>
                <strong>{resultLabel(language, item.ok, false)}</strong>
                <span>{item.ok ? t(language, "connected") : item.status === 0 ? t(language, "missingKey") : formatText(t(language, "httpStatus"), { status: item.status ?? "-" })}</span>
                <b>{String(item.label || providerLabels[item.provider as ProviderId] || item.provider)}</b>
                <p>{String(item.message || item.error || (item.ok ? t(language, "providerKeyUsable") : t(language, "addKeyAbove")))}</p>
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
          <p>{t(language, "configDesc")}</p>
        </div>
      </div>

      <div className="warning">
        {t(language, "configWarning")}
      </div>

      <div className="provider-grid">
        {providerIds.map((id) => (
          <section className="provider-card" key={id}>
            <div className="card-head">
              <h3>{providerLabels[id]}</h3>
              <a href={providerKeyLinks[id]} target="_blank" rel="noreferrer">{t(language, "createKey")}</a>
            </div>
            <label>
              <span>{t(language, "apiKey")}</span>
              <input
                type={showKeys[id] ? "text" : "password"}
                value={draft.providers[id].apiKey}
                placeholder={draft.providers[id].hasApiKey ? t(language, "savedEncryptedKey") : t(language, "pasteApiKey")}
                onChange={(event) => updateProvider(id, { apiKey: event.target.value })}
                autoComplete="off"
              />
            </label>
            <button type="button" className="link-button" onClick={() => void toggleProviderKey(id)}>
              {showKeys[id] ? t(language, "hide") : t(language, "show")}
            </button>
            <label>
              <span>{t(language, "baseUrl")}</span>
              <input value={draft.providers[id].baseUrl} onChange={(event) => updateProvider(id, { baseUrl: event.target.value })} />
            </label>
          </section>
        ))}
      </div>

      <section className="panel">
        <h3>{t(language, "fallbackModels")}</h3>
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
              <input value={item.customModel || ""} placeholder={t(language, "customProviderModel")} onChange={(event) => updateFallback(index, { customModel: event.target.value })} />
            </div>
          ))}
        </div>
        <aside className="model-guidance">
          <strong>{t(language, "imageInputWarningTitle")}</strong>
          <p>{t(language, "imageInputWarningBody")}</p>
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
        {t(language, "configTestHelp")}
      </p>

      {renderResults()}
    </section>
  );
}
