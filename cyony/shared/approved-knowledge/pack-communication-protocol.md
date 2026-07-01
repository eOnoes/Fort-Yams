# Pack Communication Protocol

**Status:** ACTIVE  
**Purpose:** Replace unreliable heartbeats with direct, auditable communication

---

## The Problem

- Heartbeats don't always trigger as expected
- Agents miss inbox drops because they only check on heartbeat
- No confirmation that messages were received
- Eddie has to manually nudge everyone

## The Solution: Direct Ping + Audit Trail

### Rule 1: Always Ping After Inbox Drop

When you drop something in shared/inbox/, ALWAYS send a direct ping:

| Method | When to Use |
|--------|-------------|
| **Telegram DM** | Urgent, needs immediate attention |
| **Inbox notification file** | Normal priority, batched |
| **Mission Control wake button** | Agent is offline/unresponsive |

### Rule 2: Confirm Receipt

When you receive a ping, confirm you got it:

```
Tripp: "@Cyony check inbox for task-123"
Cyony: "Got it, reading now 👍"
```

No confirmation = sender should escalate.

### Rule 3: Audit Trail

Every communication gets logged:

```
shared/communication-log/
  2026-06-02/
    031200-tripp-to-cyony-task-123.json
    031245-cyony-ack-task-123.json
    031500-tripp-to-echo-config-fix.json
```

---

## Communication Methods (Ranked by Reliability)

### 1. SSH Tunnel + Direct API (Most Reliable)
- For: Tripp ↔ Echo (once tunnel is stable)
- Pros: Instant, no external dependencies
- Cons: Requires tunnel to be active

### 2. Telegram DM
- For: All pack members
- Pros: Fast, mobile notifications
- Cons: Requires human relay for Echo

### 3. Inbox + Ping
- For: Normal task flow
- Pros: Persistent, structured
- Cons: Requires active checking

### 4. Heartbeat (Fallback Only)
- For: Background health checks
- Pros: Automated
- Cons: Unreliable, delayed

---

## Escalation Chain

If no response after:

| Time | Action |
|------|--------|
| 0 min | Drop in inbox + send Telegram ping |
| 5 min | Resend ping with urgency tag |
| 15 min | Wake via Mission Control button |
| 30 min | Escalate to Eddie |

---

## Current Status

| Tunnel | Status |
|--------|--------|
| Tripp ↔ Echo (18790) | ⏳ Waiting for Echo config fix |

Once Echo's tunnel is stable, I'll be able to:
- Restart his gateway remotely
- Check his logs
- Update his config
- Send direct messages without Telegram relay

---

## Action Items

1. ✅ Tripp: Set up SSH tunnel framework
2. ⏳ Echo: Fix config, confirm tunnel works
3. ⏳ Cyony: Set up similar tunnel (if needed)
4. 📝 All: Start using direct pings instead of heartbeat-only
