// Swarms Panel — list, detail, fake swarm run form

import { useState, useEffect } from "react";
import { getSwarms, getSwarm, runFakeSwarm } from "../api/client";
import type { SwarmSummary, SwarmDetail as SwarmDetailType } from "../api/types";
import SwarmRunForm from "../components/SwarmRunForm";
import SwarmDetail from "../components/SwarmDetail";

export default function SwarmsPanel() {
  const [swarms, setSwarms] = useState<SwarmSummary[]>([]);
  const [selected, setSelected] = useState<SwarmDetailType | null>(null);
  const [error, setError] = useState("");
  const [running, setRunning] = useState(false);
  const [formError, setFormError] = useState("");

  const load = () => {
    getSwarms()
      .then((r) => setSwarms(r.swarms))
      .catch((e) => setError(e.message));
  };

  useEffect(() => { load(); }, []);

  const viewDetail = async (id: string) => {
    setError("");
    try {
      const d = await getSwarm(id);
      setSelected(d);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Failed to load swarm detail");
    }
  };

  const handleRun = async (prompt: string, mode: string, workers?: number) => {
    setRunning(true);
    setFormError("");
    setError("");
    try {
      const result = await runFakeSwarm({ prompt, mode, workers });
      await load();
      // Auto-select the new swarm
      if (result.id) {
        await viewDetail(result.id);
      }
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : "Swarm run failed";
      setFormError(msg);
    }
    setRunning(false);
  };

  if (error && swarms.length === 0) return <div className="error-box">{error}</div>;

  return (
    <div>
      <SwarmRunForm onRun={handleRun} running={running} error={formError} />

      {/* Swarm list */}
      {swarms.length === 0 && !error && (
        <div className="empty-state">No swarm runs yet. Use the form above to run a fake swarm.</div>
      )}

      {swarms.length > 0 && (
        <div className="swarm-table-scroll mb-8">
          <table className="data-table">
            <thead>
              <tr>
                <th>ID</th>
                <th>Prompt</th>
                <th>Mode</th>
                <th>Wrk</th>
                <th>Status</th>
                <th>Warden</th>
                <th>Report</th>
                <th>Time</th>
              </tr>
            </thead>
            <tbody>
              {[...swarms].reverse().map((s) => (
                <tr
                  key={s.id}
                  onClick={() => viewDetail(s.id)}
                  style={{ cursor: "pointer" }}
                  className={selected?.id === s.id ? "swarm-row-selected" : ""}
                >
                  <td className="mono">{s.id.slice(0, 16)}…</td>
                  <td style={{ maxWidth: 200, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                    {s.promptSummary}
                  </td>
                  <td><span className="badge badge-dim">{s.mode}</span></td>
                  <td>{s.workerCount}</td>
                  <td>
                    <span className={`badge ${statusClass(s.status)}`}>{s.status}</span>
                  </td>
                  <td>
                    {s.wardenStatus ? (
                      <span className={`badge ${s.wardenStatus === "PASS" ? "badge-green" : s.wardenStatus === "PARTIAL" ? "badge-yellow" : "badge-red"}`}>
                        {s.wardenStatus}
                      </span>
                    ) : "—"}
                  </td>
                  <td>
                    {s.reportPath ? (
                      <span className="mono" style={{ fontSize: 11 }}>{s.reportPath.slice(0, 30)}…</span>
                    ) : "—"}
                  </td>
                  <td style={{ fontSize: 11, color: "var(--text-dim)" }}>{formatShort(s.completedAt ?? s.startedAt)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Detail */}
      {selected && (
        <SwarmDetail detail={selected} onClose={() => setSelected(null)} />
      )}
    </div>
  );
}

function statusClass(s: string): string {
  if (s === "pass") return "badge-green";
  if (s === "partial") return "badge-yellow";
  return "badge-red";
}

function formatShort(iso: string): string {
  try {
    return new Date(iso).toLocaleTimeString();
  } catch {
    return iso;
  }
}
