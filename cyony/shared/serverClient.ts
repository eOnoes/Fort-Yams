/** HTTP helpers for Phase 3 server API. */
export interface ServerClient {
  serverUrl: string;
  health(): Promise<{ status: string; uptimeMs: number; phase: string }>;
  postReply(body: Record<string, unknown>): Promise<Response>;
  getApprovals(): Promise<{ approvals: Array<{ id: string; toolName: string; riskLevel: string; status: string; argsSummary: string }> }>;
  resolveApproval(id: string, approved: boolean, reason?: string): Promise<any>;
}

export function createServerClient(serverUrl: string): ServerClient {
  const base = serverUrl.replace(/\/$/, "");
  return {
    serverUrl: base,
    async health() { return fetch(`${base}/health`).then(r => r.json()) as any; },
    async postReply(body) { return fetch(`${base}/reply`, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(body) }); },
    async getApprovals() { return fetch(`${base}/approvals`).then(r => r.json()) as any; },
    async resolveApproval(id, approved, reason) {
      const r = await fetch(`${base}/approvals/${id}/resolve`, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ approved, reason }) });
      if (!r.ok) throw new Error(`HTTP ${r.status}`);
      return r.json();
    },
  };
}
