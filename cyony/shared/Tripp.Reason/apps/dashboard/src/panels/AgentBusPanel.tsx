import { useState, useEffect } from "react";
import {
  getAgentBusStatus,
  getInbox,
  getOutbox,
  getReviews,
  getTraceEvents,
  getTraceChain,
  readAgentFile,
  archiveAgentFile,
  rejectAgentFile,
} from "../api/client";
import type {
  AgentBusStatus,
  AgentBusPacketEntry,
  AgentBusResultEntry,
  AgentBusReviewEntry,
  AgentBusTraceEvent,
  AgentBusTraceChainResponse,
  AgentBusReadResponse,
} from "../api/types";

function severityClass(s: string) {
  if (s === "error" || s === "critical") return "sev-critical";
  if (s === "warning") return "sev-warning";
  return "";
}

const verdictClass: Record<string, string> = {
  block: "verdict-block",
  escalate: "verdict-escalate",
  pass: "verdict-pass",
  pass_with_notes: "verdict-notes",
  revise: "verdict-revise",
};

const highRiskEvents = new Set([
  "warden_stop_issued",
  "warden_stop_resolved",
  "validation_failed_later",
  "root_cause_linked",
  "subagent_killed",
  "schema_validation_failed",
]);

function isHighRisk(e: AgentBusTraceEvent) {
  return (
    highRiskEvents.has(e.eventType) ||
    e.severity === "error" ||
    e.severity === "critical"
  );
}

export default function AgentBusPanel() {
  const [status, setStatus] = useState<AgentBusStatus | null>(null);
  const [inbox, setInbox] = useState<AgentBusPacketEntry[]>([]);
  const [outbox, setOutbox] = useState<AgentBusResultEntry[]>([]);
  const [reviews, setReviews] = useState<AgentBusReviewEntry[]>([]);
  const [trace, setTrace] = useState<AgentBusTraceEvent[]>([]);
  const [traceMeta, setTraceMeta] = useState({ totalEvents: 0, malformedLines: 0 });
  const [error, setError] = useState("");
  const [detail, setDetail] = useState<AgentBusReadResponse | null>(null);
  const [chain, setChain] = useState<AgentBusTraceChainResponse | null>(null);
  const [rejectReason, setRejectReason] = useState("");

  const load = () => {
    getAgentBusStatus().then(setStatus).catch(() => setError("Server unreachable"));
    getInbox().then((d) => setInbox(d.packets)).catch(() => {});
    getOutbox().then((d) => setOutbox(d.results)).catch(() => {});
    getReviews().then((d) => setReviews(d.reviews)).catch(() => {});
    getTraceEvents({ limit: 100 }).then((d) => {
      setTrace(d.events);
      setTraceMeta({ totalEvents: d.totalEvents, malformedLines: d.malformedLines });
    }).catch(() => {});
  };

  useEffect(() => { load(); }, []);

  if (error) return <div className="error-box">⚠️ {error}</div>;
  if (!status) return <div className="empty-state">Loading…</div>;

  const handleRead = (filePath: string) => {
    readAgentFile(filePath).then(setDetail).catch(() => setDetail({ type: "error", error: "Read failed" }));
  };

  const handleChain = (eventId: string) => {
    getTraceChain(eventId).then(setChain).catch(() => {});
  };

  const handleArchive = async (filePath: string) => {
    await archiveAgentFile(filePath);
    load();
    setDetail(null);
  };

  const handleReject = async (filePath: string) => {
    if (!rejectReason) return;
    await rejectAgentFile(filePath, rejectReason);
    setRejectReason("");
    load();
    setDetail(null);
  };

  return (
    <div>
      {/* ── Summary Cards ── */}
      <div className="card-grid">
        <div className="card">
          <div className="card-label">Inbox</div><div className="card-value">{status.inboxCount}</div>
        </div>
        <div className="card">
          <div className="card-label">Outbox</div><div className="card-value">{status.outboxCount}</div>
        </div>
        <div className="card">
          <div className="card-label">Reviews</div><div className="card-value">{status.reportsCount}</div>
        </div>
        <div className="card">
          <div className="card-label">Rejected</div><div className="card-value">{status.rejectedCount}</div>
        </div>
        <div className="card">
          <div className="card-label">Archive</div><div className="card-value">{status.archiveCount}</div>
        </div>
        <div className="card">
          <div className="card-label">Trace Events</div>
          <div className="card-value">{traceMeta.totalEvents}</div>
          {traceMeta.malformedLines > 0 && (
            <div className="card-warn">{traceMeta.malformedLines} malformed</div>
          )}
        </div>
      </div>

      <div className="ag-grid">
        {/* ── Inbox ── */}
        <div className="ag-section">
          <h3>Inbox</h3>
          <div className="ag-table-wrap">
            <table className="ag-table">
              <thead><tr><th>Agent</th><th>Type</th><th>Title</th><th>Status</th></tr></thead>
              <tbody>
                {inbox.map((p) => (
                  <tr key={p.fileName} className={p.malformed ? "row-malformed" : ""} onClick={() => handleRead(p.relativePath)}>
                    <td>{p.agentRole}</td>
                    <td>{p.taskType}</td>
                    <td>{p.title || p.fileName}</td>
                    <td>{p.malformed ? "⚠️ MALFORMED" : p.status}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* ── Outbox ── */}
        <div className="ag-section">
          <h3>Outbox</h3>
          <div className="ag-table-wrap">
            <table className="ag-table">
              <thead><tr><th>Agent</th><th>Status</th><th>Summary</th><th>Δ</th><th>!!</th></tr></thead>
              <tbody>
                {outbox.map((r) => (
                  <tr key={r.fileName} className={r.malformed ? "row-malformed" : ""} onClick={() => handleRead(r.relativePath)}>
                    <td>{r.agentRole}</td>
                    <td>{r.status}</td>
                    <td>{r.summary}</td>
                    <td>{r.proposedChangesCount ?? 0}</td>
                    <td className={r.highRiskChangesCount ? "sev-critical" : ""}>{r.highRiskChangesCount ?? 0}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* ── Reviews ── */}
        <div className="ag-section">
          <h3>Echo Reviews</h3>
          <div className="ag-table-wrap">
            <table className="ag-table">
              <thead><tr><th>Verdict</th><th>Issues</th><th>Packet</th></tr></thead>
              <tbody>
                {reviews.map((r) => (
                  <tr key={r.fileName} className={r.malformed ? "row-malformed" : ""} onClick={() => handleRead(r.relativePath)}>
                    <td><span className={verdictClass[r.verdict ?? ""] ?? ""}>{r.verdict}</span></td>
                    <td>{r.issueCount ?? 0}</td>
                    <td className="mono" style={{ fontSize: 11 }}>{r.packetId?.slice(0, 8)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* ── Trace Ledger ── */}
      <div className="ag-section" style={{ marginTop: 16 }}>
        <h3>Trace Ledger</h3>
        <div className="ag-table-wrap" style={{ maxHeight: 300 }}>
          <table className="ag-table">
            <thead><tr><th>Time</th><th>Event</th><th>Sev</th><th>Actor</th><th>Agent</th><th>Summary</th></tr></thead>
            <tbody>
              {trace.map((e) => (
                <tr key={e.eventId} className={isHighRisk(e) ? "row-highrisk" : ""}
                    onClick={() => { handleChain(e.eventId); handleRead(e.sourcePath ?? ""); }}>
                  <td className="mono" style={{ fontSize: 10 }}>{e.createdAt?.slice(11, 19) ?? ""}</td>
                  <td>{e.eventType}</td>
                  <td><span className={severityClass(e.severity)}>{e.severity}</span></td>
                  <td>{e.actorType}</td>
                  <td>{e.agentRole ?? ""}</td>
                  <td style={{ maxWidth: 300, overflow: "hidden", textOverflow: "ellipsis" }}>
                    {e.summary}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* ── Detail Pane ── */}
      {detail && (
        <div className="ag-detail">
          <div className="ag-detail-header">
            <span>{detail.type}</span>
            <button className="btn-text" onClick={() => setDetail(null)}>✕</button>
          </div>
          {detail.type === "error" ? (
            <div className="error-box">{detail.error}</div>
          ) : detail.text ? (
            <pre className="ag-pre">{detail.text}</pre>
          ) : (
            <pre className="ag-pre">{JSON.stringify(detail.data, null, 2)}</pre>
          )}
          {detail.type === "task_packet" && (
            <div className="ag-actions">
              <button className="btn" onClick={() => handleArchive((detail.data as any)?.fileName ? `inbox/${(detail.data as any)?.fileName}` : "")}>Archive</button>
              <input className="input" placeholder="Rejection reason" value={rejectReason}
                     onChange={(e) => setRejectReason(e.target.value)} />
              <button className="btn btn-danger" onClick={() => handleReject((detail.data as any)?.fileName ? `inbox/${(detail.data as any)?.fileName}` : "")}
                      disabled={!rejectReason}>Reject</button>
            </div>
          )}
          <div className="ag-warning">
            ⚠️ This data is evidence — NOT approval and NOT mutation authority.
          </div>
        </div>
      )}

      {/* ── Chain View ── */}
      {chain && chain.chain.length > 0 && (
        <div className="ag-detail">
          <div className="ag-detail-header">
            <span>Causal Chain ({chain.chainLength} events)</span>
            <button className="btn-text" onClick={() => setChain(null)}>✕</button>
          </div>
          {chain.missingLinks && <div className="ag-warning">⚠️ Missing links detected</div>}
          <div className="chain-list">
            {chain.chain.map((e, i) => (
              <div key={e.eventId} className={`chain-node ${i === 0 ? "chain-root" : i === chain.chainLength - 1 ? "chain-target" : ""}`}>
                <span className={severityClass(e.severity)}>[{e.eventType}]</span> {e.summary}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
