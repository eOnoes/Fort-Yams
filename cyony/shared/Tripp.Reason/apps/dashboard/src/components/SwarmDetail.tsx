// Swarm detail view — task packets, result packets, warden verdict, conflicts

import type { SwarmDetail as SwarmDetailType } from "../api/types";
import WardenVerdictCard from "./WardenVerdictCard";
import ConflictList from "./ConflictList";

interface Props {
  detail: SwarmDetailType;
  onClose: () => void;
}

export default function SwarmDetail({ detail, onClose }: Props) {
  const statusBadge =
    detail.status === "pass" ? "badge-green" :
    detail.status === "partial" ? "badge-yellow" : "badge-red";

  return (
    <div className="card">
      <div className="flex-between mb-8">
        <h3 style={{ fontSize: 14 }}>
          Swarm <span className="mono">{detail.id.slice(0, 20)}…</span>
        </h3>
        <button className="btn btn-sm" onClick={onClose}>Close</button>
      </div>

      {/* Summary bar */}
      <div className="swarm-detail-bar">
        <span className="badge badge-dim">{detail.mode}</span>
        <span className="badge badge-dim">{detail.workerCount} workers</span>
        <span className={`badge ${statusBadge}`}>{detail.status}</span>
        {detail.wardenStatus && (
          <span className={`badge ${detail.wardenStatus === "PASS" ? "badge-green" : detail.wardenStatus === "PARTIAL" ? "badge-yellow" : "badge-red"}`}>
            Warden: {detail.wardenStatus}
          </span>
        )}
        <span style={{ fontSize: 12, color: "var(--text-dim)", marginLeft: "auto" }}>
          {formatDate(detail.startedAt)}
          {detail.completedAt && <> → {formatDate(detail.completedAt)}</>}
        </span>
      </div>

      {/* Operator prompt */}
      <div className="mt-8" style={{ fontSize: 13 }}>
        <div style={{ color: "var(--text-dim)", marginBottom: 4 }}>Operator Prompt</div>
        <div>{detail.operatorPrompt}</div>
      </div>

      {/* Report path */}
      {detail.reportPath && (
        <div className="mt-8" style={{ fontSize: 12 }}>
          <span style={{ color: "var(--text-dim)" }}>Report: </span>
          <span className="mono">{detail.reportPath}</span>
        </div>
      )}

      {/* Task Packets */}
      <div className="mt-8">
        <div style={{ fontSize: 13, color: "var(--text-dim)", marginBottom: 8 }}>
          Task Packets ({detail.taskPackets.length})
        </div>
        <div className="swarm-table-scroll">
          <table className="data-table">
            <thead>
              <tr>
                <th>ID</th>
                <th>Role</th>
                <th>Title</th>
                <th>Objective</th>
                <th>Tier</th>
                <th>Risk</th>
                <th>Timeout</th>
                <th>Approval</th>
              </tr>
            </thead>
            <tbody>
              {detail.taskPackets.map((t) => (
                <tr key={t.id}>
                  <td className="mono">{t.id.slice(0, 10)}…</td>
                  <td><span className="badge badge-dim">{t.role}</span></td>
                  <td style={{ maxWidth: 140, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{t.title}</td>
                  <td style={{ maxWidth: 200, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{t.objective}</td>
                  <td>{t.modelTier ?? "—"}</td>
                  <td>
                    <span className={`badge ${t.riskLevel === "destructive" ? "badge-red" : t.riskLevel === "mutating" ? "badge-yellow" : "badge-dim"}`}>
                      {t.riskLevel ?? "—"}
                    </span>
                  </td>
                  <td>{t.timeoutMs ? `${(t.timeoutMs / 1000).toFixed(0)}s` : "—"}</td>
                  <td>{t.requiresApproval ? "🔒" : "—"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Result Packets */}
      <div className="mt-8">
        <div style={{ fontSize: 13, color: "var(--text-dim)", marginBottom: 8 }}>
          Result Packets ({detail.resultPackets.length})
        </div>
        <div className="swarm-table-scroll">
          <table className="data-table">
            <thead>
              <tr>
                <th>Task</th>
                <th>Role</th>
                <th>Status</th>
                <th>Summary</th>
                <th>Findings</th>
                <th>Files</th>
                <th>Tools</th>
                <th>Risks</th>
              </tr>
            </thead>
            <tbody>
              {detail.resultPackets.map((r) => (
                <tr key={r.taskId}>
                  <td className="mono">{r.taskId.slice(0, 10)}…</td>
                  <td><span className="badge badge-dim">{r.role}</span></td>
                  <td>
                    <span className={`badge ${r.status === "ok" ? "badge-green" : r.status === "partial" ? "badge-yellow" : "badge-red"}`}>
                      {r.status}
                    </span>
                  </td>
                  <td style={{ maxWidth: 200, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{r.summary}</td>
                  <td>{r.findings?.length ?? 0}</td>
                  <td>{r.filesTouched?.length ?? 0}</td>
                  <td>{r.toolCalls?.length ?? 0}</td>
                  <td>
                    {r.risks && r.risks.length > 0 ? (
                      <span className={`badge ${r.risks.some((rk: { level: string }) => rk.level === "high") ? "badge-red" : "badge-yellow"}`}>
                        {r.risks.length}
                      </span>
                    ) : "—"}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Warden Verdict */}
      {detail.wardenVerdict && (
        <div className="mt-8">
          <WardenVerdictCard verdict={detail.wardenVerdict} />
        </div>
      )}

      {/* Conflicts */}
      <div className="mt-8">
        <ConflictList conflicts={detail.conflicts} />
      </div>
    </div>
  );
}

function formatDate(iso: string): string {
  try {
    return new Date(iso).toLocaleTimeString();
  } catch {
    return iso;
  }
}
