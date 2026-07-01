import { useState, useEffect } from "react";
import { getHealth, getStatus } from "../api/client";
import type { HealthResponse, ServerStatus } from "../api/types";

export default function OverviewPanel() {
  const [health, setHealth] = useState<HealthResponse | null>(null);
  const [status, setStatus] = useState<ServerStatus | null>(null);
  const [error, setError] = useState("");

  useEffect(() => {
    getHealth().then(setHealth).catch(() => setError("Server unreachable"));
    getStatus().then(setStatus).catch(() => {});
  }, []);

  if (error) return <div className="error-box">⚠️ {error}</div>;
  if (!status) return <div className="empty-state">Loading…</div>;

  return (
    <div>
      <div className="card-grid">
        <div className="card">
          <div style={{ color: "var(--text-dim)", fontSize: 12 }}>Server</div>
          <div style={{ fontSize: 16, fontWeight: 600, marginTop: 4 }}>
            <span className={`status-dot ${health ? "on" : "off"}`} />
            {health?.status ?? "unknown"}
          </div>
          {health && <div style={{ fontSize: 11, color: "var(--text-dim)", marginTop: 4 }}>Uptime: {Math.round(health.uptimeMs / 1000)}s</div>}
        </div>
        <div className="card">
          <div style={{ color: "var(--text-dim)", fontSize: 12 }}>Provider / Model</div>
          <div style={{ fontSize: 14, marginTop: 4 }}>{status.providerName} / {status.model}</div>
        </div>
        <div className="card">
          <div style={{ color: "var(--text-dim)", fontSize: 12 }}>Active Tools</div>
          <div style={{ fontSize: 16, fontWeight: 600, marginTop: 4 }}>{status.activeTools.length}</div>
        </div>
        <div className="card">
          <div style={{ color: "var(--text-dim)", fontSize: 12 }}>Pending Approvals</div>
          <div style={{ fontSize: 16, fontWeight: 600, marginTop: 4 }}>
            {status.pendingApprovals > 0 ? (
              <span style={{ color: "var(--yellow)" }}>{status.pendingApprovals}</span>
            ) : "0"}
          </div>
        </div>
        <div className="card">
          <div style={{ color: "var(--text-dim)", fontSize: 12 }}>MCP Status</div>
          <div style={{ fontSize: 14, marginTop: 4 }}>
            {status.mcp.enabled
              ? `${status.mcp.connectedCount}/${status.mcp.serverCount} servers, ${status.mcp.totalToolCount} tools`
              : "Disabled"}
          </div>
        </div>
        <div className="card">
          <div style={{ color: "var(--text-dim)", fontSize: 12 }}>Swarm API</div>
          <div style={{ fontSize: 14, marginTop: 4 }}>
            {status.swarmApiEnabled ? (
              <span style={{ color: "var(--green)" }}>Enabled — {status.swarmRunsCount} runs</span>
            ) : "Disabled"}
          </div>
        </div>
      </div>
      <div className="card mt-8">
        <div style={{ color: "var(--text-dim)", fontSize: 12, marginBottom: 8 }}>Environment</div>
        <div style={{ fontSize: 13 }}>
          <div>Workdir: <span className="mono">{status.workdir}</span></div>
          <div>DB: <span className="mono">{status.dbPath}</span></div>
          <div>Read-only mode: {status.readonlyMode ? "Yes" : "No"}</div>
        </div>
      </div>
    </div>
  );
}
