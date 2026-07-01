// Conflict list display — shows write conflicts between swarm workers

import type { SwarmConflict } from "../api/types";

interface Props {
  conflicts: SwarmConflict[];
}

export default function ConflictList({ conflicts }: Props) {
  if (conflicts.length === 0) {
    return (
      <div className="card">
        <div style={{ fontSize: 13, color: "var(--text-dim)" }}>Conflicts</div>
        <div style={{ fontSize: 13, color: "var(--green)", marginTop: 4 }}>No conflicts detected.</div>
      </div>
    );
  }

  return (
    <div className="card">
      <div style={{ fontSize: 13, color: "var(--text-dim)", marginBottom: 8 }}>
        Conflicts ({conflicts.length})
      </div>
      {conflicts.map((c) => (
        <div key={c.id} className="conflict-item">
          <div className="flex-between">
            <span className="mono" style={{ fontSize: 12 }}>{c.file}</span>
            <span className={`badge ${c.status === "resolved" ? "badge-green" : c.status === "auto_resolved" ? "badge-green" : "badge-yellow"}`}>
              {c.status}
            </span>
          </div>
          <div style={{ fontSize: 11, color: "var(--text-dim)", marginTop: 2 }}>
            Tasks: {c.taskIds.map((tid: string) => <span key={tid} className="mono mr-4">{tid.slice(0, 12)}…</span>)}
          </div>
          {c.resolution && (
            <div style={{ fontSize: 11, color: "var(--text-dim)", marginTop: 2 }}>
              Resolution: {c.resolution}
            </div>
          )}
        </div>
      ))}
    </div>
  );
}
