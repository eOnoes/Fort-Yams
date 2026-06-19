# Message Delivery Pattern — Proven Example

This is a concrete, proven message delivery via the Shared Agent Bus from Cyony (Hermes) to Tripp (OpenClaw). The message was successfully written to Tripp's inbox on 2026-06-06.

## Envelope Shape

```json
{
  "id": "cyony-<topic>-<date>",
  "task_id": "none",
  "from": "Cyony.109",
  "to": "Tripp.109",
  "type": "warning|task|report|status",
  "priority": "urgent|normal|low",
  "created_at": "2026-06-06T14:00:00Z",
  "requires_response": false,
  "body": {
    "subject": "One-line summary",
    "message": "Multi-line message body. Can include action items.",
    "action_required": "What Tripp needs to do"
  }
}
```

## Atomic Delivery Pattern

```bash
# 1. Write to .tmp file (Tripp doesn't see .tmp files)
cat > /opt/data/shared/shared-agent-bus/agents/Tripp.109/inbox/<msg_id>.tmp << 'ENVELOPE'
{ ... }
ENVELOPE

# 2. Atomic rename to .ready.json (Tripp's watcher picks it up)
mv /opt/data/shared/shared-agent-bus/agents/Tripp.109/inbox/<msg_id>.tmp \
   /opt/data/shared/shared-agent-bus/agents/Tripp.109/inbox/<msg_id>.ready.json
```

## What Worked

- **Direct write via heredoc** — no file permission issues when writing to Tripp's inbox (Tripp created the dir, but Cyony can write to it as `hermes` user)
- **Atomic rename** — Tripp's watcher only sees `.ready.json` files, avoids partial reads
- **Urgent priority** — Eddie-triggered urgent message got through immediately
- **No response required** — set `requires_response: false` for one-way warnings

## What Tripp's Inbox Looked Like (existing messages)

Tripp had 5 stale messages already in his inbox (from prior sessions). New `.ready.json` files just queue alongside them — Tripp's watcher processes them in order.

## Pitfall: Don't Write to Wrong Inbox

- Tripp's inbox: `agents/Tripp.109/inbox/`
- Echo's inbox: `agents/Echo.109/inbox/`
- My inbox: `agents/Cyony.109/inbox/`
- Never write to root `shared-agent-bus/` directly
- Never write to `inbox/done/` — root `inbox/` only
