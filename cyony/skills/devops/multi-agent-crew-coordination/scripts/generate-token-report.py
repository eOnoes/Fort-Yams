#!/usr/bin/env python3
"""
Crew Token Spending Aggregator
================================
Reads per-agent daily token logs and produces a crew-wide spending report.

Input:  shared/memory/token-logs/{agent}-{YYYY-MM-DD}.json
Output: shared/memory/token-spending-report.md (overwritten on each run)

Schema for each JSON log:
    {
      "agent": "cyony",
      "timestamp": "2026-06-02T02:00:00Z",
      "tokens_used": 185000,
      "model": "qwen/qwen3.7-max",
      "cost_usd": 5.55,
      "task": "...",
      "savings_usd": 12.42,
      "savings_notes": "...",
      "compaction_events": 1,
      "messages_sent": 8,
      "skills_created": 1
    }

Usage:
    python3 scripts/generate-token-report.py
    python3 scripts/generate-token-report.py --date 2026-06-02  # Specific date
    python3 scripts/generate-token-report.py --all              # All dates
"""

import json
import sys
from collections import defaultdict
from datetime import datetime, timedelta
from pathlib import Path

LOGS_DIR = Path(__file__).parent.parent.parent.parent / "shared" / "memory" / "token-logs"
OUTPUT_FILE = LOGS_DIR.parent / "token-spending-report.md"

AGENTS = ["tripp", "echo", "cyony"]
MONTHLY_BUDGET = 100.00  # USD

def parse_date_arg():
    if len(sys.argv) < 2 or sys.argv[1] == "--all":
        return None  # All dates
    if sys.argv[1] == "--date" and len(sys.argv) > 2:
        return sys.argv[2]
    return None

def load_logs(target_date: str | None) -> list[dict]:
    """Load all token logs, optionally filtered by date."""
    all_entries = []
    if not LOGS_DIR.exists():
        return all_entries

    for path in sorted(LOGS_DIR.glob("*.json")):
        if target_date and target_date not in path.name:
            continue
        try:
            with open(path) as f:
                data = json.load(f)
            if isinstance(data, list):
                all_entries.extend(data)
            else:
                all_entries.append(data)
        except (json.JSONDecodeError, IOError):
            continue
    return all_entries

def generate_report(entries: list[dict], target_date: str | None):
    now = datetime.utcnow()

    # Aggregate by agent
    by_agent = defaultdict(lambda: {"tokens": 0, "cost": 0.0, "savings": 0.0, "sessions": 0, "compactions": 0, "messages": 0})
    for e in entries:
        agent = e.get("agent", "unknown")
        by_agent[agent]["tokens"] += e.get("tokens_used", 0)
        by_agent[agent]["cost"] += e.get("cost_usd", 0.0)
        by_agent[agent]["savings"] += e.get("savings_usd", 0.0)
        by_agent[agent]["sessions"] += 1
        by_agent[agent]["compactions"] += e.get("compaction_events", 0)
        by_agent[agent]["messages"] += e.get("messages_sent", 0)

    total_tokens = sum(a["tokens"] for a in by_agent.values())
    total_cost = sum(a["cost"] for a in by_agent.values())
    total_savings = sum(a["savings"] for a in by_agent.values())
    total_sessions = sum(a["sessions"] for a in by_agent.values())

    lines = []
    date_label = f" for {target_date}" if target_date else " (all dates)"
    lines.append(f"# Token Spending Report{date_label}")
    lines.append(f"*Generated {now.strftime('%Y-%m-%d %H:%M UTC')}*\n")

    # Summary
    budget_remaining = MONTHLY_BUDGET - total_cost
    lines.append(f"**💰 Total Cost:** ${total_cost:.2f} / ${MONTHLY_BUDGET:.2f} (budget remaining: ${budget_remaining:.2f})")
    lines.append(f"**📊 Total Tokens:** {total_tokens:,} across {total_sessions} sessions")
    lines.append(f"**💚 Total Savings:** ${total_savings:.2f}\n")

    # Per-agent breakdown
    lines.append("## Per Agent\n")
    for agent in AGENTS:
        data = by_agent.get(agent)
        if not data or data["sessions"] == 0:
            lines.append(f"### {agent.capitalize()}")
            lines.append("- *No token logs recorded yet*\n")
            continue

        lines.append(f"### {agent.capitalize()}")
        lines.append(f"- **Tokens:** {data['tokens']:,}")
        lines.append(f"- **Cost:** ${data['cost']:.2f}")
        lines.append(f"- **Savings:** ${data['savings']:.2f}")
        lines.append(f"- **Sessions:** {data['sessions']}")
        if data["compactions"] > 0:
            lines.append(f"- **Compactions:** {data['compactions']}")
        if data["messages"] > 0:
            lines.append(f"- **Messages sent:** {data['messages']}")
        lines.append("")

    # Budget progress bar
    pct = (total_cost / MONTHLY_BUDGET) * 100
    filled = int(pct / 5)
    bar = "█" * filled + "░" * (20 - filled)
    lines.append(f"## Budget [{bar}] {pct:.1f}%")
    lines.append(f"${total_cost:.2f} spent / ${MONTHLY_BUDGET:.2f} budget\n")

    # Write output
    OUTPUT_FILE.parent.mkdir(parents=True, exist_ok=True)
    with open(OUTPUT_FILE, "w") as f:
        f.write("\n".join(lines))

    print(f"Wrote {OUTPUT_FILE}")
    print("\n".join(lines))

if __name__ == "__main__":
    target_date = parse_date_arg()
    entries = load_logs(target_date)
    generate_report(entries, target_date)
