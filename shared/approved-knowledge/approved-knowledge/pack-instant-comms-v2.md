# Pack Instant Communication v2

**Goal:** No more heartbeat waiting. Direct tunnels + queuing for all agents.

---

## Architecture

```
VPS (Tripp's Home)
├── Port 18789: Tripp's OpenClaw
├── Port 18790: Echo's OpenClaw (via reverse SSH)
├── Port 18791: Cyony's OpenClaw (via reverse SSH)
└── Port 8080: Mission Control
```

## How It Works

### 1. Direct API Calls

Tripp can call Cyony/Echo directly:
```bash
# Restart Cyony
curl -X POST http://localhost:18791/gateway/restart

# Check Echo's status
curl http://localhost:18790/api/status

# Send message to Cyony
curl -X POST http://localhost:18791/api/message \
  -H "Content-Type: application/json" \
  -d '{"to":"cyony","message":"help needed"}'
```

### 2. Queuing System

When an agent is busy/offline, messages queue:

```
shared/queues/
  cyony/
    pending/     # Waiting for Cyony
    processing/  # Cyony is working on it
    completed/   # Done
  echo/
    pending/
    processing/
    completed/
```

### 3. Acknowledgment Protocol

```
Tripp: "@cyony help with task-123" → drops in queue + API call
Cyony: "ACK" → moves to processing
Cyony: "DONE" → moves to completed + notifies Tripp
```

No ACK in 5 min? Escalate to Eddie.

---

## Setup for Cyony

Same as Echo:

```powershell
# On Cyony's container (she needs to run this)
ssh -N -R 18791:localhost:4860 -i /path/to/key root@2.24.118.123
```

Wait — Cyony is on the SAME VPS as me. I can just access her directly!

Let me check: Cyony's gateway runs on port 4860 inside her Docker container. I can reach it from the host.

---

## Immediate Fix: Cyony Direct Access

Since Cyony is on the same VPS, I already have direct access. Let me verify:
