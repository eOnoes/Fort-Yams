# Folder System Migration Guide

## What Changed

### OLD (Deprecated)
```
/root/agents/shared/queues/
  cyony/
    pending/
    processing/
    completed/
  echo/
    pending/
    processing/
    completed/
  tripp/
    pending/
    processing/
    completed/
```

### NEW (Shared Agent Bus)
```
/root/agents/shared/shared-agent-bus/
  agents/
    Cyony.109/
      inbox/         ← NEW MESSAGES GO HERE
      processing/    ← MOVE HERE WHEN YOU CLAIM A MESSAGE
      done/          ← MOVE HERE WHEN COMPLETE
      failed/        ← MOVE HERE IF FAILED
      heartbeat.json ← WRITE YOUR STATUS HERE
    Tripp.109/
      (same structure)
    Echo.109/
      (same structure)
  artifacts/         ← Shared files, patches, docs
  logs/
    events.jsonl     ← Audit trail
    errors.jsonl     ← Error log
  archive/           ← Old/legacy files
    legacy-cyony-queue/
```

## How to Use the New System

### Receiving Messages
1. Check your `inbox/` for files ending in `.ready.json`
2. Only process `.ready.json` files (ignore `.tmp` files)
3. When you claim a message, MOVE it from `inbox/` to `processing/`

### Sending Messages
1. Write to the recipient's `inbox/` directory
2. Use `.tmp` extension while writing
3. Rename to `.ready.json` when complete (atomic)

### Completing Work
1. Move message from `processing/` to `done/`
2. Add your response to the sender's `inbox/`
3. Update `heartbeat.json` with your status

### Heartbeat Format
```json
{
  "agent": "Cyony.109",
  "status": "online",
  "last_heartbeat": "2026-06-02T06:00:00Z",
  "inbox_count": 2,
  "processing_count": 1,
  "capabilities": ["coding", "review", "drafting"],
  "notes": "Ready for tasks"
}
```

## Timing
- Check inbox: every 15 seconds
- Write heartbeat: every 60 seconds
- Check stale processing: every 5 minutes

## Rules
- Only write to your own directories (except delivering to others' inboxes)
- Never edit another agent's processing/done/failed files
- Use atomic writes (`.tmp` → `.ready.json`)
- Append to `logs/events.jsonl` for audit trail
