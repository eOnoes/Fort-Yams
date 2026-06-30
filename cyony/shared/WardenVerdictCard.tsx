// Warden verdict display card — PASS / PARTIAL / FAIL with violations and recommendations

import type { SwarmWardenVerdict } from "../api/types";

interface Props {
  verdict: SwarmWardenVerdict;
}

export default function WardenVerdictCard({ verdict }: Props) {
  const statusClass =
    verdict.status === "PASS" ? "badge-green" :
    verdict.status === "PARTIAL" ? "badge-yellow" : "badge-red";

  return (
    <div className="card">
      <div className="flex-between mb-8">
        <div style={{ fontSize: 13, color: "var(--text-dim)" }}>Warden Verdict</div>
        <span className={`badge ${statusClass}`}>{verdict.status}</span>
      </div>

      <div style={{ fontSize: 13, marginBottom: 12 }}>{verdict.reasoning}</div>

      {verdict.violations.length > 0 && (
        <div style={{ marginBottom: 10 }}>
          <div style={{ fontSize: 12, color: "var(--text-dim)", marginBottom: 6 }}>
            Violations ({verdict.violations.length})
          </div>
          {verdict.violations.map((v, i) => (
            <div key={i} className="warden-violation">
              <span className={`badge ${v.severity === "critical" ? "badge-red" : v.severity === "warning" ? "badge-yellow" : "badge-dim"}`}>
                {v.severity}
              </span>
              <span className="mono" style={{ fontSize: 12 }}>{v.rule}</span>
              <span style={{ fontSize: 12, color: "var(--text-dim)" }}>{v.detail}</span>
            </div>
          ))}
        </div>
      )}

      {verdict.recommendations.length > 0 && (
        <div>
          <div style={{ fontSize: 12, color: "var(--text-dim)", marginBottom: 6 }}>Recommendations</div>
          {verdict.recommendations.map((r, i) => (
            <div key={i} style={{ fontSize: 12, padding: "2px 0" }}>• {r}</div>
          ))}
        </div>
      )}
    </div>
  );
}
