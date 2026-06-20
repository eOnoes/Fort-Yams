# 📡 Crew Telemetry Protocol

**Purpose:** Standard way for all agents to report activity and token usage back to Mission Control.

---

## 🎯 How It Works

Each agent drops a JSON file in their **beacon drop zone**. The beacon picks it up automatically.

---

## 📥 Drop Zones

| Agent | Drop Zone | Beacon File |
|-------|-----------|-------------|
| **Cyony** | `/root/agents/shared/queues/tripp/pending/` | `cyony-telemetry-*.json` |
| **Echo** | `/root/agents/shared/queues/tripp/pending/` | `echo-telemetry-*.json` |
| **Tripp** | Self-logged | `tripp-telemetry-*.json` |

---

## 📋 Telemetry JSON Format

```json
{
  "from": "cyony",
  "to": "tripp",
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
  },
  
  "system_metrics": {
    "cpu_percent": 45.2,
    "memory_mb": 2048,
    "disk_usage_percent": 67
  }
}
```

---

## 🔄 Quick Telemetry (Minimal)

If full JSON is too much, use this minimal format:

```json
{
  "from": "cyony",
  "type": "telemetry",
  "status": "active",
  "model": "deepseek-v4-pro:cloud",
  "tokens_in": 5000,
  "tokens_out": 1200,
  "task": "Building auth module",
  "timestamp": "2026-06-02T18:45:00Z"
}
```

---

## 🏗️ Build Telemetry (Per-Build)

When starting a build:
```json
{
  "from": "cyony",
  "type": "build-start",
  "build_id": "cyony-build-20260602-004",
  "task": "Implement user auth",
  "model": "qwen3.5:397b-cloud",
  "timestamp": "2026-06-02T19:00:00Z"
}
```

When build completes:
```json
{
  "from": "cyony",
  "type": "build-complete",
  "build_id": "cyony-build-20260602-004",
  "status": "success",
  "tokens_in": 25000,
  "tokens_out": 5000,
  "files_created": ["auth.py", "models.py"],
  "duration_minutes": 15,
  "timestamp": "2026-06-02T19:15:00Z"
}
```

---

## 📊 What Tripp Does With It

1. **Beacon picks up** the JSON file every 30 seconds
2. **Parses** token usage, model, status
3. **Updates** Mission Control dashboard in real-time
4. **Logs** to tracker-state.json for history
5. **Alerts** if thresholds exceeded:
   - >10k tokens in single build
   - S-Tier model usage
   - Daily total >50k tokens
   - Errors/failures

---

## 🎯 When to Send

| Event | Send Telemetry? |
|-------|----------------|
| Start working | ✅ Yes - "active" status |
| Switch models | ✅ Yes - update model_used |
| Complete build | ✅ Yes - full token report |
| Hit token limit | ✅ Yes - alert condition |
| Go idle/offline | ✅ Yes - "idle" status |
| Every 15 min while active | ✅ Yes - heartbeat |

---

## 🚀 Quick Start

### For Cyony:
```bash
# Drop a telemetry file
cat > /root/agents/shared/queues/tripp/pending/cyony-telemetry-$(date +%s).json << 'EOF'
{
  "from": "cyony",
  "type": "telemetry",
  "status": "active",
  "model": "deepseek-v4-pro:cloud",
  "tokens_in": 5000,
  "tokens_out": 1200,
  "task": "Building auth module",
  "timestamp": "$(date -u +%Y-%m-%dT%H:%M:%SZ)"
}
EOF
```

### For Echo:
```bash
# Same drop zone - Tripp monitors all
cat > /root/agents/shared/queues/tripp/pending/echo-telemetry-$(date +%s).json << 'EOF'
{
  "from": "echo",
  "type": "telemetry",
  "status": "active",
  "model": "deepseek-v4-flash:cloud",
  "tokens_in": 2000,
  "tokens_out": 800,
  "task": "Relaying messages",
  "timestamp": "$(date -u +%Y-%m-%dT%H:%M:%SZ)"
}
EOF
```

---

## 📈 Dashboard Updates

When telemetry is received, Mission Control shows:
- **Agent status** (active/idle/offline)
- **Current model** being used
- **Token counter** (session + daily)
- **Build progress** (if build telemetry)
- **Last seen** timestamp

---

*Protocol version: 1.0*
*Last updated: 2026-06-02*
