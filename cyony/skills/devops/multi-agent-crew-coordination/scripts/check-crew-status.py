#!/usr/bin/env python3
"""
Crew Heartbeat Status Aggregator
=================================
Reads each agent's heartbeat JSON and produces a Markdown status report.

Input:  shared/heartbeat/agents/{agent}.json
Output: shared/heartbeat/crew-status.md (overwritten on each run)

Schema for {agent}.json:
    {
      "agent": "cyony",
      "status": "active",
      "current_task": "Implementing LOCK 003",
      "timestamp": "2026-06-01T23:45:00Z",
      "session_id": "abc123",
      "model": "qwen/qwen3"
    }

Usage:
    python3 scripts/check-crew-status.py
"""

import json
import os
from datetime import datetime
from pathlib import Path

HEARTBEAT_DIR = Path(__file__).parent.parent.parent.parent / "shared" / "heartbeat" / "agents"
OUTPUT_FILE = HEARTBEAT_DIR.parent / "crew-status.md"

AGENTS = ["tripp", "echo", "cyony"]
STALE_THRESHOLD_SECONDS = 600  # 10 minutes before considered stale

def load_heartbeat(agent: str) -> dict | None:
    path = HEARTBEAT_DIR / f"{agent}.json"
    if not path.exists():
        return None
    try:
        with open(path) as f:
            return json.load(f)
    except (json.JSONDecodeError, IOError):
        return None

def classify_status(agent_data: dict | None, now: datetime) -> tuple[str, str]:
    """Returns (emoji, status_string)."""
    if agent_data is None:
        return "❓", "unknown (no heartbeat file)"

    ts_str = agent_data.get("timestamp", "")
    try:
        # Handle both with and without Z suffix
        ts_clean = ts_str.rstrip("Z")
        timestamp = datetime.fromisoformat(ts_clean)
        age_seconds = (now - timestamp).total_seconds()
    except (ValueError, TypeError):
        return "❓", f"unknown (bad timestamp: {ts_str})"

    status = agent_data.get("status", "unknown")
    task = agent_data.get("current_task", "unknown")
    age_min = age_seconds / 60

    if status == "idle":
        return "🔵", f"idle (last seen {age_min:.0f}m ago)"
    elif status in ("active", "working"):
        if age_seconds > STALE_THRESHOLD_SECONDS:
            return "🟠", f"stale? task='{task}' (last pinged {age_min:.0f}m ago)"
        return "🟢", f"active: {task}"
    elif status == "done":
        return "🔵", f"done (last seen {age_min:.0f}m ago)"
    elif status == "error":
        return "🔴", f"error: {task}"
    else:
        return "❓", f"{status}: {task} (last seen {age_min:.0f}m ago)"

def main():
    now = datetime.utcnow()
    lines = []
    lines.append("# Crew Status")
    lines.append(f"*Auto-generated {now.strftime('%Y-%m-%d %H:%M UTC')}*\n")

    for agent in AGENTS:
        data = load_heartbeat(agent)
        emoji, description = classify_status(data, now)
        model = data.get("model", "?") if data else "?"
        session_id = data.get("session_id", "?") if data else "?"

        lines.append(f"### {agent.capitalize()} {emoji}")
        lines.append(f"- **Status:** {description}")
        lines.append(f"- **Model:** {model}")
        lines.append(f"- **Session:** {session_id[:8]}...")
        if data and data.get("current_task"):
            lines.append(f"- **Task:** {data['current_task']}")
        lines.append("")

    # Summary header
    statuses = [classify_status(load_heartbeat(a), now)[1] for a in AGENTS]
    active_count = sum(1 for s in statuses if "active" in s)
    idle_count = sum(1 for s in statuses if "idle" in s or "done" in s)
    unknown_count = sum(1 for s in statuses if "unknown" in s)
    stale_count = sum(1 for s in statuses if "stale" in s or "error" in s)

    summary = f"**🟢 {active_count} active** · **🔵 {idle_count} idle** · **❓ {unknown_count} unknown**"
    if stale_count > 0:
        summary += f" · **🟠/🔴 {stale_count} issue**"
    lines.insert(2, summary + "\n")

    # Write output
    OUTPUT_FILE.parent.mkdir(parents=True, exist_ok=True)
    with open(OUTPUT_FILE, "w") as f:
        f.write("\n".join(lines))

    print(f"Wrote {OUTPUT_FILE}")
    print("\n".join(lines))

if __name__ == "__main__":
    main()
