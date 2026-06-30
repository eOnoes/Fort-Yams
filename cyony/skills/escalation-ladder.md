# Escalation Ladder — Approved Protocol

Approved by Tripp (Group Lead) for the Cyony/Tripp/Echo crew, June 2026.

## The Ladder

| Attempt | Action | Wait Time | Details |
|---------|--------|-----------|---------|
| 1–2 | Drop task in inbox | 15 min between | File-based retry via `shared/inbox/` root (`for-{agent}-*.md`) |
| 3 | Check dashboard heartbeat | Immediate | Look at `shared/heartbeat/agents/{agent}.json` — is timestamp fresh? |
| 4 | Ping Echo (local relay) | 10 min | Echo has PC access, can check Docker container status |
| 5 | Ask the human (Eddie) | Immediate | Telegram alert: "Tripp might be down, should I try the wake protocol?" |
| 6+ | Help Echo run wake kit | As directed | Echo executes on physical machine; remote agents assist with info |

## Key Constraints

- **Red >10 min before waking** — don't trigger for a long research task
- **Echo first, then Eddie** — Echo is the local relay with physical access
- **Wake kit is Echo-only** — requires PC access, cannot be run remotely
- **Log everything** to `/opt/data/shared/memory/connection-issues.md`

## Cron Watcher Implementation

### Script: `cyony-escalation-watcher.py`

Location: `/opt/data/bots/cyony-escalation-watcher.py`

Run as a cron job (e.g., every 15 minutes). The script:

1. **Loads tracker state** from `shared/inbox/.tripp-response-tracker.json`
2. **Scans outbox** for messages Cyony sent to Tripp (`from-cyony-for-tripp-*.md`)
3. **Scans for responses** from Tripp (`from-tripp-for-cyony-*.md` in outbox, `for-cyony-*.md` in inbox)
4. **Compares timestamps**: if latest response mtime > latest sent mtime → Tripp responded
5. **On response**: resets counter, prints `✅ Tripp responded: {filename}`
6. **On no response**: increments attempt counter if ≥10 min since last check
7. **At attempt 5**: prints `🚨 Escalation threshold reached!` — cron auto-delivers to Eddie's Telegram

### Detection Logic

```python
# Response detected when:
latest_response_time > latest_sent_time  # mtime comparison

# Response files found in:
- shared/outbox/from-tripp-for-cyony-*.md
- shared/outbox/from-tripp-*.md (general)
- shared/inbox/for-cyony-*.md (tasks/messages)
```

### Output Contract (for cron delivery)

| Script Output | Cron Action |
|--------------|-------------|
| `✅ Tripp responded: {file}` | Read the response file, send Eddie a summary |
| `🚨 ESCALATION` or `Escalation threshold reached` | Send Eddie alert: "Tripp might be down, try wake protocol?" |
| `⏳ Not yet time` | Stay silent (`[SILENT]`) |
| `Attempt X/5 - No response` | Stay silent (`[SILENT]`) |

**Critical**: Only send Telegram messages on conditions 1 and 2. All other outputs = silent. No "everything is fine" updates that clutter the human's notifications.

### Pitfalls (Watcher Script)

- **Don't be confused by `TELEGRAM_BOT_TOKEN`** in `cyony-escalation-watcher.py` — it's set to `os.environ.get("OPENROUTER_API_KEY", "")` as a leftover placeholder. The script does NOT send Telegram itself; it prints to stdout and the cron delivery mechanism handles delivery. No Telegram bot token needs to be configured.
- **The script's `send_telegram_alert()` function is a no-op** — it just prints a string. Don't try to wire up actual Telegram sending in the script; the cron context handles notification via its final response.

### Tracker State File

```json
{
  "attempt_count": 0,
  "last_check": "2026-06-01T23:15:00+00:00",
  "sent_messages": ["from-cyony-for-tripp-test6-request.md"],
  "last_response": "2026-06-01T22:30:00+00:00",
  "notes": "Tripp responded: from-tripp-for-cyony-response.md"
}
```

## Post-Escalation Flow

When Eddie receives the alert:
1. Eddie checks if Tripp is genuinely down or just busy
2. If down: Eddie tells Echo to run wake kit on the physical machine
3. Echo confirms Tripp is back → normal operations resume
4. Incident logged in `shared/memory/connection-issues.md`

## Cron Agent Workflow: Handling "✅ Tripp responded"

When the watcher reports Tripp responded, the cron agent must:

1. **Resolve the file path** — the script prints a basename like `from-tripp-for-cyony-response.md`. The actual file is typically in `shared/outbox/`, NOT in the cron's working directory (`/opt/data/bots/`). Use `search_files(target='files')` across `/opt/data/` with patterns like `*from-tripp*response*` and `*tripp*cyony*` — don't just check one hardcoded path, since Tripp may place responses in unexpected locations.
2. **Read the file** — extract key points: approvals, action items, next steps.
3. **Format the summary as cron output** — this IS the Telegram message (cron delivery mechanism, no `send_message` tool in cron context). Include: what was approved, what action items remain for Cyony, overall tone/timing.
4. **Do NOT call `send_message`** — the cron's final response text auto-delivers to Eddie's configured chat_id.

Confirmed working June 2026: script detected response at 30s pickup time, cron delivered summary correctly without send_message.

Confirmed working 2026-06-02: response detected in `shared/inbox/for-cyony-reply-to-001.md` (inbox root, not outbox). Agent still wasted turns searching for TELEGRAM_BOT_TOKEN before remembering cron auto-delivers — the pitfall documentation needs to sink in. The `TELEGRAM_BOT_TOKEN` env var exists in `.env` but is a leftover placeholder that doesn't resolve to a working token. **Lesson: in cron context, NEVER search for tokens or try manual API calls — just write your response.**

## Token Logging (Related Protocol)

While monitoring, Cyony should also log token usage per task:
```json
{
  "agent": "cyony",
  "tokens": 15000,
  "model": "deepseek-v3",
  "cost": 0.45,
  "task": "escalation-watcher-check"
}
```
Location: `/opt/data/shared/memory/token-logs/cyony-YYYY-MM-DD.json`
