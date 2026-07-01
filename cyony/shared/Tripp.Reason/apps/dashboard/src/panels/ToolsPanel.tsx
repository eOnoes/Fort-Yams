import { useState, useEffect } from "react";
import { getTools } from "../api/client";
import type { ToolInfo } from "../api/types";

export default function ToolsPanel() {
  const [tools, setTools] = useState<ToolInfo[]>([]);
  const [error, setError] = useState("");

  useEffect(() => {
    getTools().then(setTools).catch((e) => setError(e.message));
  }, []);

  if (error) return <div className="error-box">{error}</div>;

  const locals = tools.filter((t) => !t.name.startsWith("mcp."));
  const mcps = tools.filter((t) => t.name.startsWith("mcp."));

  return (
    <div>
      {locals.length > 0 && (
        <>
          <h3 style={{ fontSize: 13, color: "var(--text-dim)", marginBottom: 8 }}>Local Tools ({locals.length})</h3>
          <table className="data-table mb-8">
            <thead><tr><th>Name</th><th>Description</th><th>Approval</th></tr></thead>
            <tbody>
              {locals.map((t) => (
                <tr key={t.name}>
                  <td className="mono">{t.name}</td>
                  <td>{t.description}</td>
                  <td>{t.requiresApproval ? <span className="badge badge-yellow">required</span> : <span className="badge badge-green">auto</span>}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </>
      )}
      {mcps.length > 0 && (
        <>
          <h3 style={{ fontSize: 13, color: "var(--text-dim)", marginBottom: 8 }}>MCP Tools ({mcps.length})</h3>
          <table className="data-table">
            <thead><tr><th>Name</th><th>Description</th><th>Approval</th></tr></thead>
            <tbody>
              {mcps.map((t) => (
                <tr key={t.name}>
                  <td className="mono">{t.name}</td>
                  <td>{t.description}</td>
                  <td>{t.requiresApproval ? <span className="badge badge-yellow">required</span> : <span className="badge badge-green">auto</span>}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </>
      )}
      {tools.length === 0 && !error && <div className="empty-state">No tools loaded.</div>}
    </div>
  );
}
