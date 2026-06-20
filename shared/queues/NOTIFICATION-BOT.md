# Queue Notification Bot

## Problem
Agents aren't checking queue folders. Need instant notification.

## Solution: Telegram Bot Webhook

When a file is dropped in a queue, auto-send Telegram notification.

### Implementation

```bash
# When dropping a task for Cyony:
1. Write file to shared/queues/cyony/pending/
2. Send Telegram message: "@Cyony109_bot New task in queue: task-id"
3. Pin the message until ACKed
```

### Bot Commands

Agents can query queues via Telegram:
- `/queue` — Show pending tasks
- `/ack task-id` — Acknowledge task
- `/status` — Show agent status

### Alternative: File System Watcher

Use `inotifywait` to watch queue folders and trigger notifications:

```bash
inotifywait -m /root/agents/shared/queues/cyony/pending/ -e create |
while read path action file; do
  echo "New task for Cyony: $file"
  # Send Telegram notification
  curl -X POST "https://api.telegram.org/bot$BOT_TOKEN/sendMessage" \
    -d "chat_id=8808479511" \
    -d "text=@Cyony109_bot New task: $file"
done
```

## Current Status

| Agent | Queue Check | Telegram | Direct API | Watcher |
|-------|-------------|----------|------------|---------|
| Cyony | ❌ Not using | ✅ Responds | ✅ Port 32768 | Could add |
| Echo | ❌ Not using | ✅ Responds | ❌ Tunnel down | Could add |

## Recommendation

1. **Immediate:** Set up file watcher + Telegram notifications
2. **Short-term:** Get Echo's tunnel stable
3. **Long-term:** Agents poll queues every 60s via cron
