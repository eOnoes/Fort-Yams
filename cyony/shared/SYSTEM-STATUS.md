# Pack Communication System v3 — Bidirectional with Auto-Watchers

## Active Watchers

| Watcher | PID | Purpose | Status |
|---------|-----|---------|--------|
| queue-watcher.sh | 83742 | Detects tasks dropped for agents | ✅ Running |
| reply-watcher.sh | 83784 | Detects agent replies (processing/completed) | ✅ Running |

## How It Works

### When I Drop a Task for Cyony:
1. I write file to `shared/queues/cyony/pending/`
2. **queue-watcher** detects it instantly
3. Logs: "Notified cyony about [file]"
4. I get Telegram ping (manual until bot token)

### When Cyony Responds:
1. Cyony moves file to `shared/queues/cyony/processing/` or `completed/`
2. **reply-watcher** detects it instantly
3. Creates notification in `shared/queues/tripp/notifications/`
4. I see it immediately — no waiting

### When Echo Responds:
Same flow — his processing/completed moves trigger notifications to me.

## Directory Structure

```
shared/queues/
├── cyony/
│   ├── pending/      # Tasks waiting for Cyony
│   ├── processing/   # Cyony is working on it
│   └── completed/    # Cyony finished
├── echo/
│   ├── pending/
│   ├── processing/
│   └── completed/
├── tripp/
│   ├── pending/
│   ├── processing/
│   ├── completed/
│   └── notifications/  # Where I get reply alerts
├── watcher.log         # Task drop log
├── reply-watcher.log   # Reply detection log
├── queue-watcher.sh    # Task watcher script
└── reply-watcher.sh    # Reply watcher script
```

## Current Status

| Agent | Pending | Processing | Completed | Last Activity |
|-------|---------|-----------|-----------|---------------|
| Cyony | 3 | 0 | 0 | Waiting for response |
| Echo | 0 | 0 | 0 | Waiting for config fix |
| Tripp | 0 | 0 | 1 | Just tested system |

## Next Steps

1. ⏳ Cyony needs to check her queue and move files
2. ⏳ Echo needs to fix config and start checking queue
3. 📝 I need to monitor `tripp/notifications/` for their replies
4. 🔧 Get Telegram bot token for auto-pings (remove manual step)

## No More Waiting

- **Before:** I drop task → wait for heartbeat → maybe they see it
- **After:** I drop task → watcher detects → they move file → reply-watcher notifies me instantly

Both directions are covered. I just need them to start using it.
