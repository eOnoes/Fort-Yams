# Pack Queue System

## Instant Communication Without Heartbeats

### How It Works

1. **Tripp needs Cyony's help**
   - Drops task in `shared/queues/cyony/pending/`
   - Sends direct API call to Cyony's gateway
   - Cyony ACKs and moves to `processing/`

2. **Cyony finishes**
   - Moves to `completed/`
   - Sends direct API call back to Tripp
   - Tripp gets instant notification

3. **Echo comes online**
   - Checks `shared/queues/echo/pending/`
   - Processes backlog
   - Confirms via API or Telegram

### Direct API Endpoints

| Agent | URL | Status |
|-------|-----|--------|
| Tripp | http://localhost:18789 | ✅ Online |
| Cyony | http://localhost:32768 | ✅ Online (needs auth) |
| Echo | http://localhost:18790 | ⏳ Waiting for config fix |

### Queue Directories

```
shared/queues/
├── cyony/
│   ├── pending/     # Tasks waiting for Cyony
│   ├── processing/  # Cyony is working on these
│   └── completed/   # Done tasks
├── echo/
│   ├── pending/
│   ├── processing/
│   └── completed/
└── tripp/
    ├── pending/
    ├── processing/
    └── completed/
```

### Message Format

```json
{
  "id": "task-123",
  "from": "tripp",
  "to": "cyony",
  "priority": "high",
  "message": "Help needed with...",
  "timestamp": "2026-06-02T03:30:00Z",
  "status": "pending"
}
```

### Rules

1. **Always ACK within 2 minutes**
2. **Move to processing when starting**
3. **Move to completed when done**
4. **No response in 5 min = escalate to Eddie**
5. **Use Telegram as fallback if API fails**

### Current Status

| Agent | Tunnel | Queue | Direct API |
|-------|--------|-------|------------|
| Tripp | N/A (host) | ✅ Ready | ✅ Online |
| Cyony | Same VPS | ✅ Ready | ✅ Online (port 32768) |
| Echo | SSH 18790 | ✅ Ready | ⏳ Config fix needed |
