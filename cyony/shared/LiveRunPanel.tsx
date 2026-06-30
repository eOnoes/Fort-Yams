// Live Run SSE Panel — prompt input, streaming event feed, approval polling

import { useState, useRef, useEffect, useCallback } from "react";
import { connectReplySse } from "../api/sse";
import { getApprovals, approveApproval, denyApproval } from "../api/client";
import EventCard from "../components/EventCard";
import type { SseEvent, ReplyRequest, ApprovalItem } from "../api/types";

type RunStatus = "idle" | "running" | "finished" | "error";

export default function LiveRunPanel() {
  // Form state
  const [prompt, setPrompt] = useState("");
  const [sessionId, setSessionId] = useState("");
  const [title, setTitle] = useState("");
  const [model, setModel] = useState("");
  const [provider, setProvider] = useState("");
  const [workdir, setWorkdir] = useState("");

  // Run state
  const [status, setStatus] = useState<RunStatus>("idle");
  const [events, setEvents] = useState<SseEvent[]>([]);
  const [streamText, setStreamText] = useState("");
  const [meta, setMeta] = useState<{ sessionId?: string; runId?: string; reportPath?: string }>({});
  const [error, setError] = useState("");
  const abortRef = useRef<AbortController | null>(null);
  const feedRef = useRef<HTMLDivElement>(null);

  // Approval polling state
  const [pendingApprovals, setPendingApprovals] = useState<ApprovalItem[]>([]);
  const [actingApproval, setActingApproval] = useState<string | null>(null);
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Auto-scroll event feed
  useEffect(() => {
    if (feedRef.current) {
      feedRef.current.scrollTop = feedRef.current.scrollHeight;
    }
  }, [events]);

  // Approval polling while running
  useEffect(() => {
    if (status !== "running") {
      if (pollRef.current) { clearInterval(pollRef.current); pollRef.current = null; }
      return;
    }
    pollRef.current = setInterval(() => {
      getApprovals()
        .then((r) => setPendingApprovals(r.approvals.filter((a) => a.status === "pending")))
        .catch(() => { /* polling is best-effort */ });
    }, 800);
    return () => { if (pollRef.current) clearInterval(pollRef.current); };
  }, [status]);

  const handleApproval = useCallback(async (id: string, approved: boolean) => {
    setActingApproval(id);
    try {
      if (approved) await approveApproval(id);
      else await denyApproval(id);
      // Refresh approvals list
      const r = await getApprovals();
      setPendingApprovals(r.approvals.filter((a) => a.status === "pending"));
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Approval action failed");
    }
    setActingApproval(null);
  }, []);

  const handleRun = () => {
    if (!prompt.trim()) return;

    // Clear prior state
    setError("");
    setEvents([]);
    setStreamText("");
    setMeta({});
    setPendingApprovals([]);
    setStatus("running");

    const body: ReplyRequest = { prompt: prompt.trim() };
    if (sessionId.trim()) body.sessionId = sessionId.trim();
    if (title.trim()) body.title = title.trim();
    if (model.trim()) body.model = model.trim();
    if (provider.trim()) body.provider = provider.trim();
    if (workdir.trim()) body.workdir = workdir.trim();

    abortRef.current = connectReplySse(body, {
      onEvent(event) {
        setEvents((prev) => [...prev, event]);
        if (event.type === "message") {
          setStreamText((prev) => prev + event.content);
        }
        if (event.sessionId) setMeta((m) => ({ ...m, sessionId: event.sessionId }));
        if (event.runId) setMeta((m) => ({ ...m, runId: event.runId }));
        if (event.type === "finish" && event.reportPath) {
          setMeta((m) => ({ ...m, reportPath: event.reportPath }));
        }
      },
      onDone() {
        setStatus((s) => (s === "running" ? "finished" : s));
      },
      onError(msg) {
        setStatus("error");
        setError(msg);
      },
      onHeartbeat() {
        // Connection is alive — could update a liveness indicator if desired
      },
    });
  };

  const handleStop = () => {
    abortRef.current?.abort();
    abortRef.current = null;
    setStatus("idle");
  };

  const handleClear = () => {
    abortRef.current?.abort();
    abortRef.current = null;
    setPrompt("");
    setSessionId("");
    setTitle("");
    setModel("");
    setProvider("");
    setWorkdir("");
    setStatus("idle");
    setEvents([]);
    setStreamText("");
    setMeta({});
    setError("");
    setPendingApprovals([]);
  };

  const isRunning = status === "running";

  return (
    <div className="live-run">
      {/* Prompt input area */}
      <div className="card">
        <div style={{ color: "var(--text-dim)", fontSize: 12, marginBottom: 10 }}>Run Prompt</div>

        <textarea
          className="input prompt-input"
          value={prompt}
          onChange={(e) => setPrompt(e.target.value)}
          placeholder="Enter prompt to send to Tripp.Reason…"
          disabled={isRunning}
          rows={3}
        />

        <div className="prompt-options mt-8">
          <input className="input" placeholder="Session ID" value={sessionId} onChange={(e) => setSessionId(e.target.value)} disabled={isRunning} />
          <input className="input" placeholder="Title" value={title} onChange={(e) => setTitle(e.target.value)} disabled={isRunning} />
          <input className="input" placeholder="Model" value={model} onChange={(e) => setModel(e.target.value)} disabled={isRunning} />
          <input className="input" placeholder="Provider" value={provider} onChange={(e) => setProvider(e.target.value)} disabled={isRunning} />
          <input className="input" placeholder="Workdir" value={workdir} onChange={(e) => setWorkdir(e.target.value)} disabled={isRunning} />
        </div>

        <div className="flex-row mt-8">
          <button className="btn btn-primary" onClick={handleRun} disabled={isRunning || !prompt.trim()}>
            {isRunning ? "Running…" : "Run"}
          </button>
          {isRunning && (
            <button className="btn btn-danger" onClick={handleStop}>Stop</button>
          )}
          {!isRunning && (events.length > 0 || error) && (
            <button className="btn" onClick={handleClear}>Clear</button>
          )}
        </div>

        {isRunning && (
          <div style={{ marginTop: 8, fontSize: 12, color: "var(--text-dim)" }}>
            <span className="status-dot on" /> Streaming…
          </div>
        )}
      </div>

      {/* Error display */}
      {error && (
        <div className="error-box mt-8">{error}</div>
      )}

      {/* Run metadata strip */}
      {(meta.sessionId || meta.runId || meta.reportPath) && (
        <div className="card mt-8 run-meta">
          {meta.sessionId && <span className="meta-item">Session: <span className="mono">{meta.sessionId.slice(0, 16)}…</span></span>}
          {meta.runId && <span className="meta-item">Run: <span className="mono">{meta.runId.slice(0, 16)}…</span></span>}
          {meta.reportPath && <span className="meta-item">Report: <span className="mono">{meta.reportPath}</span></span>}
          {status === "finished" && <span className="badge badge-green">complete</span>}
          {status === "error" && <span className="badge badge-red">error</span>}
        </div>
      )}

      {/* Pending approvals during active run */}
      {pendingApprovals.length > 0 && (
        <div className="card mt-8">
          <div style={{ color: "var(--yellow)", fontWeight: 600, marginBottom: 8 }}>
            ⚠ {pendingApprovals.length} pending approval{pendingApprovals.length > 1 ? "s" : ""}
          </div>
          {pendingApprovals.map((a) => (
            <div key={a.id} className="flex-between" style={{ padding: "6px 0", borderBottom: "1px solid var(--border)" }}>
              <div style={{ fontSize: 13 }}>
                <span className="mono">{a.toolName}</span>
                <span className={`badge ml-8 ${a.riskLevel === "destructive" ? "badge-red" : "badge-yellow"}`}>{a.riskLevel}</span>
              </div>
              <div className="flex-row">
                {actingApproval === a.id ? (
                  <span style={{ fontSize: 12, color: "var(--text-dim)" }}>…</span>
                ) : (
                  <>
                    <button className="btn btn-primary btn-sm" onClick={() => handleApproval(a.id, true)}>Approve</button>
                    <button className="btn btn-danger btn-sm" onClick={() => handleApproval(a.id, false)}>Deny</button>
                  </>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Streaming text area */}
      {streamText && (
        <div className="card mt-8">
          <div style={{ color: "var(--text-dim)", fontSize: 12, marginBottom: 8 }}>Response</div>
          <pre className="stream-text">{streamText}</pre>
        </div>
      )}

      {/* Event feed */}
      {events.length > 0 && (
        <div className="card mt-8">
          <div style={{ color: "var(--text-dim)", fontSize: 12, marginBottom: 8 }}>
            Event Feed ({events.length})
          </div>
          <div className="event-feed" ref={feedRef}>
            {events.map((ev, i) => (
              <EventCard key={i} event={ev} />
            ))}
          </div>
        </div>
      )}

      {/* Idle placeholder */}
      {status === "idle" && events.length === 0 && !error && (
        <div className="empty-state mt-8">
          Enter a prompt and click <strong>Run</strong> to start a live streaming session.
        </div>
      )}
    </div>
  );
}
