# Crew Monitoring Systems

## 1. Heartbeat Status Board
**Location:** `/opt/data/shared/heartbeat/crew-status.md`

**What it shows:**
- Online/Stale/Unknown status for each agent
- Last seen timestamp
- Current model (if online)
- Current task (if online)

**How it works:**
- Each agent writes heartbeat to `shared/heartbeat/agents/{name}.json`
- Format: `{"timestamp": "ISO8601", "model": "...", "task": "..."}`
- Status script checks freshness (5-minute threshold)
- Run: `python3 /opt/data/scripts/check-crew-status.py`

**Current status:**
- ✅ Online: 0
- ⚠️ Stale: 1 (Cyony - heartbeat from 71 min ago, need to update)
- ❓ Unknown: 2 (Tripp & Echo - no heartbeat files yet)

---

## 2. Token Spending Report
**Location:** `/opt/data/shared/memory/token-spending-report.md`

**What it tracks:**
- Total tokens and cost across all agents
- Per-agent breakdown (entries, tokens, cost, recent tasks)
- Per-model breakdown (uses, tokens, cost)

**How agents log tokens:**
Write JSON to `shared/memory/token-logs/{agent}-{date}.json`:
```json
{
  "timestamp": "2026-06-01T23:45:00Z",
  "tokens_used": 15000,
  "model": "claude-sonnet-4-20250514",
  "cost_usd": 0.45,
  "task": "Reviewed forge module candidate"
}
```

**Run report:** `python3 /opt/data/scripts/generate-token-report.py`

**Current spending:**
- Cyony: 65,000 tokens, $1.95
- Tripp: 0 (no logs yet)
- Echo: 0 (no logs yet)

---

## How to Use

**Check crew status:**
```bash
cat /opt/data/shared/heartbeat/crew-status.md
```

**Check spending:**
```bash
cat /opt/data/shared/memory/token-spending-report.md
```

**Refresh both:**
```bash
python3 /opt/data/scripts/check-crew-status.py
python3 /opt/data/scripts/generate-token-report.py
```

---

## For Other Agents

**Tripp:** Your host bridge should already be writing heartbeats. If not, add a heartbeat writer to your cron that posts to `/root/agents/shared/heartbeat/agents/tripp.json`.

**Echo:** On your Windows side, you'll need to set up a similar heartbeat writer that pushes to the shared volume. Can we sync that folder from your D:\ drive?

All agents should append to their own `token-logs/{agent}-{date}.json` file after each task. The report generator will pick it up.
