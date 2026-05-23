import type { Language, UsageRow } from "../api/types";
import { t } from "../features/i18n/text";

interface DashboardPageProps {
  language: Language;
  rows: UsageRow[];
  loading: boolean;
  error: string;
  onRefresh: () => void;
}

export function DashboardPage({ language, rows, loading, error, onRefresh }: DashboardPageProps) {
  return (
    <section className="page">
      <div className="page-head">
        <div>
          <h2>{t(language, "dashboard")}</h2>
          <p>{t(language, "dashboardDesc")}</p>
        </div>
        <button type="button" onClick={onRefresh}>{t(language, "refresh")}</button>
      </div>
      {loading ? <p className="muted">{t(language, "loading")}</p> : null}
      {error ? <p className="alert">{error}</p> : null}
      {!loading && !error && !rows.length ? <p className="muted">{t(language, "noUsageRows")}</p> : null}
      {rows.length ? (
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>{t(language, "provider")}</th>
                <th>{t(language, "model")}</th>
                <th>{t(language, "count")}</th>
                <th>{t(language, "lastUsed")}</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((row) => (
                <tr key={`${row.provider}:${row.model}`}>
                  <td data-label={t(language, "provider")}>{row.provider}</td>
                  <td data-label={t(language, "model")}>{row.model}</td>
                  <td data-label={t(language, "count")}>{row.usageCount}</td>
                  <td data-label={t(language, "lastUsed")}>{row.lastUsedAt ? new Date(row.lastUsedAt).toLocaleString() : "-"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : null}
    </section>
  );
}
