import { useMemo, useState } from "react";
import type { Language, RunSkillResult } from "../api/types";
import { t } from "../features/i18n/text";

function extractPrompt(result: RunSkillResult | null) {
  const output = result?.output;
  if (!output) return "";
  if (typeof output === "string") return output;
  if (typeof output === "object") {
    const record = output as Record<string, unknown>;
    for (const key of ["prompt", "detailed", "short", "structured", "article", "summary"]) {
      if (typeof record[key] === "string" && record[key]) return String(record[key]);
    }
  }
  return JSON.stringify(output, null, 2);
}

interface OutputTabsProps {
  language: Language;
  result: RunSkillResult | null;
  placeholder: string;
}

export function OutputTabs({ language, result, placeholder }: OutputTabsProps) {
  const [tab, setTab] = useState<"prompt" | "json" | "review">("prompt");
  const prompt = useMemo(() => extractPrompt(result), [result]);
  const json = useMemo(() => JSON.stringify(result || {}, null, 2), [result]);
  const review = useMemo(() => JSON.stringify(result?.review || result?.warnings || {}, null, 2), [result]);
  const activeText = tab === "prompt" ? prompt || placeholder : tab === "json" ? json : review;

  function copyActive() {
    void navigator.clipboard?.writeText(activeText);
  }

  function downloadJson() {
    const blob = new Blob([json], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = "skill-output.json";
    link.click();
    URL.revokeObjectURL(url);
  }

  return (
    <section className="output-panel" aria-label="Output">
      <div className="panel-head">
        <div className="tabs">
          {(["prompt", "json", "review"] as const).map((item) => (
            <button key={item} className={tab === item ? "active" : ""} type="button" onClick={() => setTab(item)}>
              {t(language, item)}
            </button>
          ))}
        </div>
        <div className="actions">
          <button type="button" onClick={copyActive}>{t(language, "copy")}</button>
          <button type="button" onClick={downloadJson}>{t(language, "download")}</button>
        </div>
      </div>
      <pre className="output-text">{activeText}</pre>
    </section>
  );
}
