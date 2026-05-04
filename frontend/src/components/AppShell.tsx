import type { Language, PageId } from "../api/types";
import { StatusBadge } from "./StatusBadge";
import { t } from "../features/i18n/text";

interface AppShellProps {
  activePage: PageId;
  language: Language;
  status: string;
  statusTone: "ok" | "warn" | "error";
  onPageChange: (page: PageId) => void;
  onLanguageChange: (language: Language) => void;
  children: React.ReactNode;
}

export function AppShell({
  activePage,
  language,
  status,
  statusTone,
  onPageChange,
  onLanguageChange,
  children
}: AppShellProps) {
  const pages: PageId[] = ["dashboard", "run", "config"];
  return (
    <div className="app-shell">
      <header className="topbar">
        <div>
          <h1>Smart AI App</h1>
          <p>{t(language, "appDesc")}</p>
        </div>
        <div className="top-actions">
          <div className="segmented" aria-label="Language">
            <button className={language === "en" ? "active" : ""} type="button" onClick={() => onLanguageChange("en")}>
              EN
            </button>
            <button className={language === "th" ? "active" : ""} type="button" onClick={() => onLanguageChange("th")}>
              TH
            </button>
          </div>
          <StatusBadge text={status} tone={statusTone} />
        </div>
      </header>
      <div className="layout">
        <nav className="side-nav" aria-label="Main">
          {pages.map((page) => (
            <button key={page} className={activePage === page ? "active" : ""} type="button" onClick={() => onPageChange(page)}>
              {page === "dashboard" ? t(language, "dashboard") : page === "run" ? t(language, "runSkill") : t(language, "config")}
            </button>
          ))}
        </nav>
        <main className="content">{children}</main>
      </div>
    </div>
  );
}
