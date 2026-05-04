import { useCallback, useEffect, useState } from "react";
import { getConfig, getSkills, getUsage } from "./api/client";
import type { Language, LlmConfig, PageId, SkillSummary, UsageRow } from "./api/types";
import { AppShell } from "./components/AppShell";
import { defaultConfig } from "./features/config/constants";
import { mergeConfig, migrateLegacyLocalConfigOnce } from "./features/config/legacyMigration";
import { t } from "./features/i18n/text";
import { ConfigPage } from "./pages/ConfigPage";
import { DashboardPage } from "./pages/DashboardPage";
import { RunSkillPage } from "./pages/RunSkillPage";

export function App() {
  const [activePage, setActivePage] = useState<PageId>("dashboard");
  const [language, setLanguage] = useState<Language>(() => (localStorage.getItem("uiLanguage") === "th" ? "th" : "en"));
  const [status, setStatusText] = useState(t(language, "loading"));
  const [statusTone, setStatusTone] = useState<"ok" | "warn" | "error">("warn");
  const [skills, setSkills] = useState<SkillSummary[]>([]);
  const [invalidSkills, setInvalidSkills] = useState<SkillSummary[]>([]);
  const [selectedSkillId, setSelectedSkillId] = useState(() => localStorage.getItem("selectedSkillId") || "");
  const [config, setConfig] = useState<LlmConfig>(() => mergeConfig(defaultConfig));
  const [usageRows, setUsageRows] = useState<UsageRow[]>([]);
  const [usageLoading, setUsageLoading] = useState(false);
  const [usageError, setUsageError] = useState("");
  const [usageDashboardStale, setUsageDashboardStale] = useState(false);

  const setStatus = useCallback((message: string, tone: "ok" | "warn" | "error" = "ok") => {
    setStatusText(message);
    setStatusTone(tone);
  }, []);

  const loadUsage = useCallback(() => {
    setUsageLoading(true);
    setUsageError("");
    getUsage()
      .then((response) => {
        setUsageRows(response.rows || []);
        setUsageDashboardStale(false);
      })
      .catch((error: Error) => setUsageError(error.message))
      .finally(() => setUsageLoading(false));
  }, []);

  useEffect(() => {
    setStatus(t(language, "loading"), "warn");
    getSkills()
      .then((response) => {
        setSkills(response.skills || []);
        setInvalidSkills(response.invalidSkills || []);
        const nextSkill = selectedSkillId || response.defaultSkillId || response.skills?.[0]?.id || "";
        setSelectedSkillId(nextSkill);
        if (nextSkill) localStorage.setItem("selectedSkillId", nextSkill);
        setStatus(t(language, "ready"), "ok");
      })
      .catch((error: Error) => {
        setStatus(error.message, "error");
      });
  }, [language, selectedSkillId, setStatus]);

  useEffect(() => {
    getConfig()
      .then(async (response) => {
        const serverConfig = mergeConfig(response.config);
        const nextConfig = await migrateLegacyLocalConfigOnce(serverConfig);
        setConfig(nextConfig);
      })
      .catch((error: Error) => {
        console.warn(`Unable to load config: ${error.message}`);
        setConfig(mergeConfig(defaultConfig));
      });
  }, []);

  useEffect(() => {
    loadUsage();
  }, [loadUsage]);

  function changeLanguage(next: Language) {
    setLanguage(next);
    localStorage.setItem("uiLanguage", next);
  }

  function changeSkill(skillId: string) {
    setSelectedSkillId(skillId);
    localStorage.setItem("selectedSkillId", skillId);
  }

  function renderPage() {
    if (activePage === "config") {
      return <ConfigPage language={language} config={config} onConfigChange={setConfig} setStatus={setStatus} />;
    }
    if (activePage === "run") {
      return (
        <RunSkillPage
          language={language}
          skills={skills}
          invalidSkills={invalidSkills}
          selectedSkillId={selectedSkillId}
          config={config}
          onSkillChange={changeSkill}
          onRunComplete={() => setUsageDashboardStale(true)}
          setStatus={setStatus}
        />
      );
    }
    return <DashboardPage language={language} rows={usageRows} loading={usageLoading} error={usageError} onRefresh={loadUsage} />;
  }

  useEffect(() => {
    if (activePage === "dashboard" && usageDashboardStale) loadUsage();
  }, [activePage, loadUsage, usageDashboardStale]);

  return (
    <AppShell
      activePage={activePage}
      language={language}
      status={status}
      statusTone={statusTone}
      onPageChange={setActivePage}
      onLanguageChange={changeLanguage}
    >
      {renderPage()}
    </AppShell>
  );
}
