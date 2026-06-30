import { useState, useEffect } from "react";
import { getSessions } from "../api/client";
import type { SessionSummary } from "../api/types";

export default function SessionsPanel() {
  const [sessions, setSessions] = useState<SessionSummary[]>([]);
  const [error, setError] = useState("");

  useEffect(() => {
    getSessions().then((r) => setSessions(r.sessions)).catch((e) => setError(e.message));
  }, []);

  if (error) return <div className="error-box">{error}</div>;
  if (sessions.length === 0) return <div className="empty-state">No sessions yet.</div>;

  return (
    <div>
      <table className="data-table">
        <thead><tr><th>ID</th><th>Title</th><th>Provider</th><th>Model</th><th>Status</th><th>Updated</th></tr></thead>
        <tbody>
          {sessions.map((s) => (
            <tr key={s.id}>
              <td className="mono">{s.id.slice(0, 12)}…</td>
              <td>{s.title ?? <span style={{ color: "var(--text-dim)" }}>—</span>}</td>
              <td>{s.provider}</td>
              <td className="mono" style={{ fontSize: 12 }}>{s.model}</td>
              <td><span className={`badge ${s.status === "active" ? "badge-green" : "badge-dim"}`}>{s.status}</span></td>
              <td className="mono" style={{ fontSize: 11 }}>{new Date(s.updated_at).toLocaleString()}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
