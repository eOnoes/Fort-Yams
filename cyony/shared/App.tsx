import { useState } from "react";
import OverviewPanel from "./panels/OverviewPanel";
import LiveRunPanel from "./panels/LiveRunPanel";
import ToolsPanel from "./panels/ToolsPanel";
import SessionsPanel from "./panels/SessionsPanel";
import ReportsPanel from "./panels/ReportsPanel";
import ApprovalsPanel from "./panels/ApprovalsPanel";
import SwarmsPanel from "./panels/SwarmsPanel";
import AgentBusPanel from "./panels/AgentBusPanel";

type Panel = "overview" | "live-run" | "tools" | "sessions" | "reports" | "approvals" | "swarms" | "agent-bus";

const PANELS: { id: Panel; label: string }[] = [
  { id: "overview", label: "Overview" },
  { id: "live-run", label: "Live Run" },
  { id: "tools", label: "Tools" },
  { id: "sessions", label: "Sessions" },
  { id: "reports", label: "Reports" },
  { id: "approvals", label: "Approvals" },
  { id: "swarms", label: "Swarms" },
  { id: "agent-bus", label: "Agent Bus" },
];

export default function App() {
  const [panel, setPanel] = useState<Panel>("overview");

  const label = PANELS.find((p) => p.id === panel)?.label ?? "";

  return (
    <>
      <nav className="sidebar">
        <div className="sidebar-header">
          <h1>Tripp.Reason Control</h1>
          <div className="sub">Local Dashboard</div>
        </div>
        {PANELS.map((p) => (
          <button
            key={p.id}
            className={`nav-item${panel === p.id ? " active" : ""}`}
            onClick={() => setPanel(p.id)}
          >
            {p.label}
          </button>
        ))}
        <div className="status-strip">
          Phase 7 · <span className="status-dot on" /> API Active
        </div>
      </nav>
      <main className="main-area">
        <div className="top-bar">
          <h2>{label}</h2>
        </div>
        <div className="panel-content">
          {panel === "overview" && <OverviewPanel />}
          {panel === "live-run" && <LiveRunPanel />}
          {panel === "tools" && <ToolsPanel />}
          {panel === "sessions" && <SessionsPanel />}
          {panel === "reports" && <ReportsPanel />}
          {panel === "approvals" && <ApprovalsPanel />}
          {panel === "swarms" && <SwarmsPanel />}
          {panel === "agent-bus" && <AgentBusPanel />}
        </div>
      </main>
    </>
  );
}
