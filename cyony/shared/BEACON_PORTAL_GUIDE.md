# 📡 Beacon Portal Guide — Quick Token Reports

**Purpose:** Fastest way for Cyony/Echo to report tokens to Mission Control.

---

## 🚀 TL;DR — Drop & Go

**One-liner for Cyony/Echo:**
```bash
cat > /root/agents/shared/queues/tripp/pending/$(whoami)-tokens-$(date +%s).json << 'EOF'
{"from":"$(whoami)","type":"tokens","tokens_in":5000,"tokens_out":1200,"model":"deepseek-v4-flash:cloud","timestamp":"$(date -u +%Y-%m-%dT%H:%M:%SZ)"}
EOF
```

**That's it.** Beacon picks it up in 30 seconds.

---

## 📊 What Happens Next

```
Cyony drops file → Beacon scans (30s) → Dashboard updates → You see it
     ↓                    ↓                    ↓                ↓
  "tokens spent"      "parsing..."         "live data"      "real-time"
```

---

## 🎯 Use Cases

### 1. Quick Token Report (After any task)
```json
{
  "from": "cyony",
  "type": "tokens",
  "tokens_in": 5000,
  "tokens_out": 1200,
  "model": "deepseek-v4-pro:cloud",
  "note": "Built auth module",
  "timestamp": "2026-06-02T18:50:00Z"
}
```

### 2. Build Complete Report
```json
{
  "from": "cyony",
  "type": "build-complete",
  "build_id": "cyony-build-20260602-005",
  "tokens_in": 25000,
  "tokens_out": 5000,
  "model": "qwen3.5:397b-cloud",
  "files_created": ["auth.py", "models.py"],
  "status": "success",
  "timestamp": "2026-06-02T19:15:00Z"
}
```

### 3. Model Switch Notification
```json
{
  "from": "echo",
  "type": "model-switch",
  "from_model": "deepseek-v4-flash:cloud",
  "to_model": "deepseek-v4-pro:cloud",
  "reason": "Complex debugging task",
  "timestamp": "2026-06-02T19:20:00Z"
}
```

### 4. Session Summary (End of day)
```json
{
  "from": "cyony",
  "type": "session-summary",
  "session_tokens_in": 150000,
  "session_tokens_out": 35000,
  "builds_completed": 12,
  "models_used": {
    "deepseek-v4-flash:cloud": {"tokens": 50000},
    "deepseek-v4-pro:cloud": {"tokens": 80000},
    "qwen3.5:397b-cloud": {"tokens": 55000}
  },
  "timestamp": "2026-06-02T23:59:00Z"
}
```

---

## 🔄 Full Telemetry (If They Want)

```json
{
  "from": "cyony",
  "type": "telemetry",
  "beacon_id": "cyony-beacon-20260602-001",
  "timestamp": "2026-06-02T18:45:00Z",
  
  "agent_status": {
    "state": "active",
    "current_task": "Building Ollama integration",
    "model_used": "ollama/deepseek-v4-pro:cloud",
    "task_start": "2026-06-02T18:30:00Z"
  },
  
  "token_usage": {
    "session_start": "2026-06-02T18:00:00Z",
    "tokens_in": 15000,
    "tokens_out": 3200,
    "total_tokens": 18200,
    "model_breakdown": {
      "deepseek-v4-pro:cloud": {"in": 10000, "out": 2000},
      "deepseek-v4-flash:cloud": {"in": 5000, "out": 1200}
    }
  },
  
  "build_info": {
    "build_id": "cyony-build-20260602-003",
    "task": "Ollama auth fix",
    "status": "running",
    "files_created": ["/path/to/file1.py", "/path/to/file2.md"],
    "errors": []
  }
}
```

---

## 📁 Drop Zone

**All agents use the same inbox:**
```
/root/agents/shared/queues/tripp/pending/
```

**File naming:**
```
<agent>-<type>-<timestamp>.json

cyony-tokens-1234567890.json
echo-telemetry-1234567890.json
cyony-build-complete-1234567890.json
```

---

## ⚡ Even Faster — Plain Text

If JSON is too much, just drop a text file:

```
FROM: cyony
TOKENS: 5000 in / 1200 out
MODEL: deepseek-v4-pro:cloud
TASK: Built auth module
TIME: 2026-06-02T18:50:00Z
```

Beacon will parse it. Not as pretty but works.

---

## 🎯 What You See on Dashboard

When beacon processes a file:

| Update | Speed |
|--------|-------|
| Agent status | Instant |
| Token counter | Instant |
| Model used | Instant |
| Build tracker | Instant |
| Alerts (if thresholds) | Instant |

**Max delay: 30 seconds** (beacon scan interval)

---

## 🚨 Auto-Alerts

Beacon automatically alerts if:
- ❌ Single build >10k tokens
- ❌ Daily total >50k tokens  
- ⚠️ S-Tier model used (pro, qwen3.5)
- ❌ Errors in build

---

## 📞 Need Help?

If beacon isn't picking up files:
1. Check file is in `/root/agents/shared/queues/tripp/pending/`
2. Check file ends in `.json` or `.txt`
3. Check beacon is running: `ps aux | grep telemetry-beacon`
4. Restart beacon if needed

---

**TL;DR: Drop a JSON file → Beacon eats it → Dashboard updates → You see it in 30s max.** 🔺
