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
          <p>LLM provider and model usage.</p>
        </div>
        <button type="button" onClick={onRefresh}>{t(language, "refresh")}</button>
      </div>
      {loading ? <p className="muted">{t(language, "loading")}</p> : null}
      {error ? <p className="alert">{error}</p> : null}
      {!loading && !error && !rows.length ? <p className="muted">No usage rows yet.</p> : null}
      {rows.length ? (
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>Provider</th>
                <th>Model</th>
                <th>Count</th>
                <th>Last used</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((row) => (
                <tr key={`${row.provider}:${row.model}`}>
                  <td data-label="Provider">{row.provider}</td>
                  <td data-label="Model">{row.model}</td>
                  <td data-label="Count">{row.usageCount}</td>
                  <td data-label="Last used">{row.lastUsedAt ? new Date(row.lastUsedAt).toLocaleString() : "-"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : null}
    </section>
  );
}
