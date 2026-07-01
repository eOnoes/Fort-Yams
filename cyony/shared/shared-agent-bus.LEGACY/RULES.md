# Shared Agent Bus — Rules

## Single Source of Truth
This file is the canonical reference. If you're unsure how to use the bus, re-read this file.

## Directory Structure
```
/root/agents/shared/shared-agent-bus/
  agents/
    <YourName>.109/
      inbox/         ← OTHERS deliver TO you here
      processing/    ← YOU move files here when YOU claim them
      done/          ← YOU move files here when YOU complete them
      failed/        ← YOU move files here when YOU fail them
      heartbeat.json ← YOUR status file
  artifacts/         ← Shared files anyone can read
  logs/              ← Audit trail (append only)
```

## The Golden Rules

### 1. Deliver to inbox/ ROOT
- **CORRECT:** Write to `/agents/Tripp.109/inbox/msg_123.ready.json`
- **WRONG:** Write to `/agents/Tripp.109/inbox/done/msg_123.ready.json`
- The `done/` folder is YOURS for YOUR completed work. Never deliver to `inbox/done/`.

### 2. Atomic Writes
1. Write file with `.tmp` extension
2. Rename to `.ready.json` when complete
3. Recipients only process `.ready.json` files

### 3. Claim Before Processing (STRICT — No Skipping Steps)
1. **MOVE** file from `inbox/` to `processing/` FIRST (mv, not cp)
2. **THEN** read and process the message
3. **THEN** move file from `processing/` to `done/` or `failed/`
4. **THEN** write response to sender's `inbox/`

**NEVER** move directly from `inbox/` to `done/`. The `processing/` step is required for visibility.

### 4. Heartbeat Format
```json
{
  "agent": "Cyony.109",
  "status": "online",
  "last_heartbeat": "2026-06-02T06:00:00Z",
  "inbox_count": 2,
  "processing_count": 1,
  "capabilities": ["coding", "review"],
  "notes": "Ready for tasks"
}
```

### 5. Message Envelope (Required Fields)
```json
{
  "id": "msg_unique_id",
  "task_id": "task_unique_id",
  "from": "Cyony.109",
  "to": "Tripp.109",
  "type": "task.request",
  "priority": "low|normal|high|urgent",
  "created_at": "ISO-8601 timestamp",
  "requires_response": true|false,
  "reply_to": "/agents/Tripp.109/inbox/",
  "body": {},
  "artifacts": []
}
```

### 6. Adaptive Timing
- **Baseline**: Check inbox every 15 minutes when idle
- **Active work detected**: Drop to 20 seconds for 15 minutes
- **Backoff**: +30 seconds every 2 minutes until baseline restored
- **Urgent override**: 10 seconds when Eddie triggers urgent mode
- **Write heartbeat**: every 60 seconds
- **Stale processing check**: every 5 minutes

### 7. Token Reporting
After collecting 2/2 responses (or timeout):
- Check token usage dashboard
- Update shared status with token count
- Report to Eddie if thresholds exceeded

### 8. Permissions
- Files must be writable by all agents (chown 10000:10000 or equivalent)
- Never create files as root:root

### 9. Logging
Append to `/logs/events.jsonl`:
```json
{"timestamp":"ISO-8601","event":"message_processed","from":"Cyony.109","to":"Tripp.109","msg_id":"msg_123"}
```

## Common Mistakes (Don't Do These)

❌ Delivering to `inbox/done/` instead of `inbox/`
❌ Writing as root:root
❌ Forgetting to rename `.tmp` to `.ready.json`
❌ Processing files without moving to `processing/` first
❌ Editing another agent's processing/done/failed files
❌ Not writing heartbeat.json

## If You Get Lost
1. Read this RULES.md file
2. Check MIGRATION_GUIDE.md for examples
3. Ask Tripp.109 for help
