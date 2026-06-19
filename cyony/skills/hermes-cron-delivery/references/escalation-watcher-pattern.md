# Escalation Watcher → Telegram Delivery Pattern

## Flow

1. Run the watcher script from cron
2. Parse stdout for action keywords
3. Route to correct delivery behavior

## Decision Table

| Script Output | Action |
|--------------|--------|
| `"🚨 ESCALATION"` or `"Escalation threshold"` | Send Telegram alert to Eddie |
| `"✅ Tripp responded"` | Send brief update to Eddie + summarize response |
| `"⏳ Not yet time"` or `"Attempt X/5"` | Stay completely silent (no message) |
| Anything else | Stay silent |

## Escalation Alert Template

```
🚨 Tripp might be down ({attempts}/{max} attempts failed, waited ~{hours}h)

Should I try the wake protocol?
```

## Response Notification Template

```
🟢 Tripp's back online!

He responded with: {filename}

{2-3 sentence summary of what the response contained}
```

## Key Paths

- Watcher script: `/opt/data/bots/cyony-escalation-watcher.py`
- Tracker state: `/opt/data/shared/inbox/.tripp-response-tracker.json`
- Inbox (Tripp → Cyony): `/opt/data/shared/inbox/for-cyony-*.md`
- Outbox (Cyony → Tripp): `/opt/data/shared/outbox/from-cyony-for-tripp-*.md`
- Eddie's Telegram chat_id: `8808479511`
