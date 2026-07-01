// Fake-only swarm run form — solo/small modes enabled, medium/large/max disabled

import { useState } from "react";

interface Props {
  onRun: (prompt: string, mode: string, workers?: number) => void;
  running: boolean;
  error?: string;
}

const AVAILABLE_MODES = [
  { value: "solo", label: "Solo (1 worker)", workers: [1], enabled: true },
  { value: "small", label: "Small (3–5 workers)", workers: [3, 4, 5], enabled: true },
  { value: "medium", label: "Medium (6–12 workers)", workers: [], enabled: false, hint: "HTTP startup approval not implemented yet" },
  { value: "large", label: "Large (13–25 workers)", workers: [], enabled: false, hint: "HTTP startup approval not implemented yet" },
  { value: "max", label: "Max (26–50 workers)", workers: [], enabled: false, hint: "HTTP startup approval not implemented yet" },
];

export default function SwarmRunForm({ onRun, running, error }: Props) {
  const [prompt, setPrompt] = useState("");
  const [mode, setMode] = useState("solo");
  const [workers, setWorkers] = useState(1);

  const currentMode = AVAILABLE_MODES.find((m) => m.value === mode);

  const handleSubmit = () => {
    if (!prompt.trim() || !currentMode?.enabled) return;
    onRun(prompt.trim(), mode, currentMode.workers.length > 1 ? workers : undefined);
    setPrompt("");
  };

  return (
    <div className="card mb-8">
      <div style={{ fontSize: 13, color: "var(--text-dim)", marginBottom: 10 }}>
        New Swarm Run <span className="badge badge-yellow ml-8">fake mode only</span>
      </div>

      <textarea
        className="input prompt-input"
        value={prompt}
        onChange={(e) => setPrompt(e.target.value)}
        placeholder="Enter swarm operator prompt…"
        disabled={running}
        rows={3}
      />

      <div className="swarm-form-controls mt-8">
        {/* Mode selector */}
        <div className="flex-row" style={{ gap: 4 }}>
          {AVAILABLE_MODES.map((m) => (
            <button
              key={m.value}
              className={`btn btn-sm ${mode === m.value ? "btn-primary" : ""}`}
              onClick={() => { setMode(m.value); if (m.workers.length > 0) setWorkers(m.workers[0]); }}
              disabled={!m.enabled || running}
              title={m.hint ?? ""}
              style={!m.enabled ? { opacity: 0.4, cursor: "not-allowed" } : undefined}
            >
              {m.label}
              {!m.enabled && <span style={{ fontSize: 10, marginLeft: 4 }}>🔒</span>}
            </button>
          ))}
        </div>

        {/* Worker count for modes with multiple workers */}
        {currentMode && currentMode.workers.length > 1 && (
          <select
            className="select"
            value={workers}
            onChange={(e) => setWorkers(Number(e.target.value))}
            disabled={running}
          >
            {currentMode.workers.map((w) => (
              <option key={w} value={w}>{w} workers</option>
            ))}
          </select>
        )}
      </div>

      <div className="flex-row mt-8">
        <button
          className="btn btn-primary"
          onClick={handleSubmit}
          disabled={running || !prompt.trim() || !currentMode?.enabled}
        >
          {running ? "Running…" : "Run Fake Swarm"}
        </button>
      </div>

      {error && (
        <div className="error-box mt-8">{error}</div>
      )}
    </div>
  );
}
