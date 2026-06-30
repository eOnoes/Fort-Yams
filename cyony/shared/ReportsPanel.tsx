import { useState, useEffect } from "react";
import { getReports } from "../api/client";
import type { ReportEntry } from "../api/types";

export default function ReportsPanel() {
  const [reports, setReports] = useState<ReportEntry[]>([]);
  const [error, setError] = useState("");

  useEffect(() => {
    getReports().then((r) => setReports(r.reports)).catch((e) => setError(e.message));
  }, []);

  if (error) return <div className="error-box">{error}</div>;
  if (reports.length === 0) return <div className="empty-state">No reports found.</div>;

  const typeBadge = (t: string) => {
    if (t === "phase") return <span className="badge badge-yellow mr-4">phase</span>;
    if (t === "swarm") return <span className="badge badge-green mr-4">swarm</span>;
    if (t === "run") return <span className="badge badge-dim mr-4">run</span>;
    return <span className="badge badge-dim mr-4">{t}</span>;
  };

  const sorted = [...reports].sort((a, b) => (b.createdAt ?? "").localeCompare(a.createdAt ?? ""));

  return (
    <div>
      <table className="data-table">
        <thead><tr><th>Name</th><th>Type</th><th>Path</th><th>Size</th><th>Created</th></tr></thead>
        <tbody>
          {sorted.map((r, i) => (
            <tr key={i}>
              <td>{r.name.replace(".md", "")}</td>
              <td>{typeBadge(r.type)}</td>
              <td className="mono" style={{ fontSize: 11 }}>{r.path}</td>
              <td className="mono" style={{ fontSize: 11 }}>{r.sizeBytes ? `${(r.sizeBytes / 1024).toFixed(1)} KB` : "—"}</td>
              <td className="mono" style={{ fontSize: 11 }}>{r.createdAt ? new Date(r.createdAt).toLocaleString() : "—"}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
