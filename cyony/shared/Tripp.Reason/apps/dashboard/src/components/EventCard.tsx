// Reusable event display cards for the Live Run SSE feed

import type { SseEvent, SseEventMessage, SseEventToolRequest, SseEventToolResult, SseEventFinish, SseEventError } from "../api/types";

interface EventCardProps {
  event: SseEvent;
}

export default function EventCard({ event }: EventCardProps) {
  switch (event.type) {
    case "message":
      return <MessageCard event={event} />;
    case "tool_request":
      return <ToolRequestCard event={event} />;
    case "tool_result":
      return <ToolResultCard event={event} />;
    case "finish":
      return <FinishCard event={event} />;
    case "error":
      return <ErrorCard event={event} />;
    default:
      return null;
  }
}

function MessageCard({ event }: { event: SseEventMessage }) {
  return (
    <div className="event-card event-message">
      <div className="event-meta">
        <span className={`badge badge-dim`}>message</span>
        <span className="event-ts">{ts()}</span>
      </div>
      <div className="event-body message-body">{event.content}</div>
    </div>
  );
}

function ToolRequestCard({ event }: { event: SseEventToolRequest }) {
  const riskClass = event.requiresApproval ? "badge-yellow" : "badge-dim";
  const riskLabel = event.requiresApproval ? "needs approval" : "auto";
  return (
    <div className="event-card event-tool-request">
      <div className="event-meta">
        <span className="badge badge-yellow" style={{ marginRight: 6 }}>🔧 tool_request</span>
        <span className={`badge ${riskClass}`}>{riskLabel}</span>
        <span className="event-ts">{ts()}</span>
      </div>
      <div className="event-body">
        <strong className="mono">{event.tool}</strong>
        <ArgsPreview args={event.args} />
      </div>
    </div>
  );
}

function ToolResultCard({ event }: { event: SseEventToolResult }) {
  const statusClass = event.status === "ok" ? "badge-green" : "badge-red";
  return (
    <div className="event-card event-tool-result">
      <div className="event-meta">
        <span className={`badge ${statusClass}`}>
          {event.status === "ok" ? "✓" : "✗"} tool_result
        </span>
        <span className="event-ts">{ts()}</span>
      </div>
      <div className="event-body">
        <strong className="mono">{event.tool}</strong>
        {event.status === "ok" ? null : (
          <div className="error-box" style={{ marginTop: 6, padding: "6px 10px", fontSize: 12 }}>
            {String(event.result ?? "unknown error")}
          </div>
        )}
      </div>
    </div>
  );
}

function FinishCard({ event }: { event: SseEventFinish }) {
  return (
    <div className="event-card event-finish">
      <div className="event-meta">
        <span className="badge badge-green">finish</span>
        <span className="event-ts">{ts()}</span>
      </div>
      <div className="event-body">
        <div>Run completed — <span className="mono">{event.reason}</span></div>
        <div style={{ marginTop: 4 }}>
          Run ID: <span className="mono">{event.runId?.slice(0, 16)}…</span>
        </div>
        {event.reportPath && (
          <div style={{ marginTop: 4 }}>
            Report: <span className="mono">{event.reportPath}</span>
          </div>
        )}
      </div>
    </div>
  );
}

function ErrorCard({ event }: { event: SseEventError }) {
  return (
    <div className="event-card event-error">
      <div className="event-meta">
        <span className="badge badge-red">error</span>
        {event.recoverable && <span className="badge badge-yellow" style={{ marginLeft: 6 }}>recoverable</span>}
        <span className="event-ts">{ts()}</span>
      </div>
      <div className="event-body">{event.message}</div>
    </div>
  );
}

/** Small, safe preview of tool args — truncates long values, no JSON blobs */
function ArgsPreview({ args }: { args: unknown }) {
  if (args == null) return null;
  if (typeof args !== "object") return <div className="mono" style={{ fontSize: 11, color: "var(--text-dim)", marginTop: 4 }}>{String(args).slice(0, 120)}</div>;

  const entries = Object.entries(args as Record<string, unknown>).slice(0, 5);
  if (entries.length === 0) return null;

  return (
    <div style={{ marginTop: 4, fontSize: 11, color: "var(--text-dim)" }}>
      {entries.map(([k, v]) => (
        <div key={k}>
          <span className="mono">{k}</span>:{" "}
          <span>{safeString(v).slice(0, 80)}</span>
        </div>
      ))}
    </div>
  );
}

function safeString(v: unknown): string {
  if (typeof v === "string" && v.length > 100) return v.slice(0, 100) + "…";
  if (typeof v === "object") return JSON.stringify(v).slice(0, 80);
  return String(v);
}

function ts(): string {
  return new Date().toLocaleTimeString();
}
