import { useState, useEffect } from "react";
import { getApprovals, approveApproval, denyApproval } from "../api/client";
import type { ApprovalItem } from "../api/types";

export default function ApprovalsPanel() {
  const [items, setItems] = useState<ApprovalItem[]>([]);
  const [error, setError] = useState("");
  const [acting, setActing] = useState<string | null>(null);

  const load = () => {
    getApprovals()
      .then((r) => setItems(r.approvals.filter((a) => a.status === "pending")))
      .catch((e) => setError(e.message));
  };

  useEffect(() => { load(); }, []);

  const handle = async (id: string, approved: boolean) => {
    setActing(id);
    try {
      if (approved) await approveApproval(id);
      else await denyApproval(id);
      load();
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Approval action failed");
    }
    setActing(null);
  };

  if (error) return <div className="error-box">{error}</div>;
  if (items.length === 0) return <div className="empty-state">No pending approvals.</div>;

  return (
    <div>
      {items.map((a) => (
        <div key={a.id} className="card">
          <div className="flex-between mb-8">
            <div>
              <span className="mono" style={{ fontWeight: 600 }}>{a.toolName}</span>
              <span className={`badge ml-8 ${a.riskLevel === "destructive" ? "badge-red" : "badge-yellow"}`}>{a.riskLevel}</span>
            </div>
            <div className="flex-row">
              {acting === a.id ? (
                <span style={{ fontSize: 12, color: "var(--text-dim)" }}>Processing…</span>
              ) : (
                <>
                  <button className="btn btn-primary btn-sm" onClick={() => handle(a.id, true)}>Approve</button>
                  <button className="btn btn-danger btn-sm" onClick={() => handle(a.id, false)}>Deny</button>
                </>
              )}
            </div>
          </div>
          <div style={{ fontSize: 12, color: "var(--text-dim)" }}>
            Session: <span className="mono">{a.sessionId?.slice(0, 12)}…</span>
            {a.expiresAt && <> · Expires: {new Date(a.expiresAt).toLocaleTimeString()}</>}
          </div>
        </div>
      ))}
    </div>
  );
}
