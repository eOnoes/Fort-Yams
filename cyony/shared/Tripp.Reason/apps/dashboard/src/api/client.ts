// Dashboard API client — talks to server over HTTP only

const BASE = import.meta.env.VITE_TRIPP_API_BASE ?? "http://127.0.0.1:3030";

async function get<T>(path: string): Promise<T> {
  const res = await fetch(`${BASE}${path}`);
  if (!res.ok) throw new Error(`${res.status} ${res.statusText}`);
  return res.json();
}

async function post<T>(path: string, body: unknown): Promise<T> {
  const res = await fetch(`${BASE}${path}`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ message: res.statusText }));
    throw new Error((err as { message?: string }).message ?? `${res.status}`);
  }
  return res.json();
}

import type {
  HealthResponse,
  ServerStatus,
  ToolInfo,
  SessionSummary,
  ReportEntry,
  ApprovalItem,
  SwarmSummary,
  SwarmDetail,
  SwarmRunRequest,
  AgentBusStatus,
  AgentBusPacketEntry,
  AgentBusResultEntry,
  AgentBusReviewEntry,
  AgentBusMdReportEntry,
  AgentBusTraceResponse,
  AgentBusTraceChainResponse,
  AgentBusReadResponse,
} from "./types";

export function getHealth(): Promise<HealthResponse> {
  return get("/health");
}

export function getStatus(): Promise<ServerStatus> {
  return get("/status");
}

export function getTools(): Promise<ToolInfo[]> {
  return get("/tools");
}

export function getSessions(): Promise<{ sessions: SessionSummary[] }> {
  return get("/sessions");
}

export function getReports(): Promise<{ reports: ReportEntry[] }> {
  return get("/reports");
}

export function getApprovals(): Promise<{ approvals: ApprovalItem[] }> {
  return get("/approvals");
}

export function approveApproval(id: string, reason?: string) {
  return post(`/approvals/${id}/resolve`, { approved: true, reason });
}

export function denyApproval(id: string, reason?: string) {
  return post(`/approvals/${id}/resolve`, { approved: false, reason });
}

export function getSwarms(): Promise<{ swarms: SwarmSummary[] }> {
  return get("/swarms");
}

export function getSwarm(id: string): Promise<SwarmDetail> {
  return get(`/swarms/${id}`);
}

export function runFakeSwarm(req: SwarmRunRequest): Promise<SwarmSummary> {
  return post("/swarms/run", { ...req, fake: true, real: false });
}

// ── Phase 7G: Agent Bus API ──────────────────────────────────

export function getAgentBusStatus(): Promise<AgentBusStatus> {
  return get("/agents/status");
}

export function getInbox(): Promise<{ packets: AgentBusPacketEntry[] }> {
  return get("/agents/inbox");
}

export function getOutbox(): Promise<{ results: AgentBusResultEntry[] }> {
  return get("/agents/outbox");
}

export function getReviews(): Promise<{
  reviews: AgentBusReviewEntry[];
  mdReports: AgentBusMdReportEntry[];
}> {
  return get("/agents/reviews");
}

export function getTraceEvents(params?: {
  limit?: number;
  eventType?: string;
  severity?: string;
  packetId?: string;
  resultId?: string;
  reviewId?: string;
  runId?: string;
}): Promise<AgentBusTraceResponse> {
  const qs = new URLSearchParams();
  if (params?.limit) qs.set("limit", String(params.limit));
  if (params?.eventType) qs.set("eventType", params.eventType);
  if (params?.severity) qs.set("severity", params.severity);
  if (params?.packetId) qs.set("packetId", params.packetId);
  if (params?.resultId) qs.set("resultId", params.resultId);
  if (params?.reviewId) qs.set("reviewId", params.reviewId);
  if (params?.runId) qs.set("runId", params.runId);
  const q = qs.toString();
  return get(`/agents/trace${q ? "?" + q : ""}`);
}

export function getTraceChain(
  eventId: string
): Promise<AgentBusTraceChainResponse> {
  return get(`/agents/trace/chain/${eventId}`);
}

export function readAgentFile(
  filePath: string
): Promise<AgentBusReadResponse> {
  return get(`/agents/read?path=${encodeURIComponent(filePath)}`);
}

export function archiveAgentFile(filePath: string) {
  return post("/agents/archive", { path: filePath });
}

export function rejectAgentFile(filePath: string, reason: string) {
  return post("/agents/reject", { path: filePath, reason });
}
