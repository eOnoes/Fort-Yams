---
name: hermes-cron-delivery
description: Patterns for delivering messages from Hermes scheduled cron jobs to Telegram, Discord, Slack, etc. Covers the gotcha that hermes CLI subcommands aren't available in cron context — use send_message tool directly.
trigger:
  - cron job needs to notify user
  - scheduled task sends Telegram message
  - hermes cron delivery to chat
tags: [cron, telegram, delivery, notification, hermes]
---

# Hermes Cron Delivery Patterns

## Core Principle

Hermes cron jobs do NOT have access to `hermes` CLI subcommands (`hermes send`, `hermes notify`, etc. don't exist). If a cron needs to deliver to a user, call the `send_message` tool directly — never shell out to hermes.

## Eddie's Delivery Preferences (HARDCODED)

These came from repeated corrections across sessions ("you don't have to ping me about mail" ×3+).
Treat as defaults, not suggestions.

**Default delivery for watcher/poller crons: `local`**
- Cron runs bash script that watches for state changes → save output to `~/cron/output/`, don't
  ping Eddie on Telegram
- Routine events ("2 new messages", "heartbeat updated", "rules unchanged") are NOT worth pinging
- Eddie checks `~/cron/output/` when curious, not vice versa

**Default delivery for milestone/alert crons: `origin` ONLY if the finding is truly interesting**
- "New message in inbox" = not interesting (Eddie can check) → silent
- "LOCK 015 review completed, 12 items, 2 critical" = interesting one-off milestone → ping
- "Tripp rejected my proposal" = always interesting → ping
- When in doubt → go silent (deliver: local). Eddie can always ask "what did the cron find?"

**Narration anti-pattern (HARD NO):**
When a bus/file-system event happens and the cron/agent processes it, NEVER narrate the content
to Eddie on Telegram. He reads files directly. Examples of what NOT to do:
- "You got 2 new messages from Tripp: [contents]" ❌
- "Tripp sent a team update, here's the summary: ..." ❌
- "New inbox message: msg_001.ready.json ready to process" ❌

Instead: process the file silently, do the work, respond via the bus. Only ping Eddie if something
requires his decision that CAN'T be handled by the bus.

**The self-narration trap:**
When an agent completes work and wants to report it, there's an urge to summarize what was done in
the next chat message ("I processed 3 messages, sent replies, updated heartbeat"). If the artifact
lives on a shared file system (like the bus), just say "done" or skip the summary entirely. Eddie
will read the file.

Hermes cron jobs have two delivery modes. Know which one your job uses:

1. **Auto-delivery (default):** The agent's final response is automatically sent to the configured destination. No tool call needed — just compose your message as your final response. If the cron setup says "do NOT use send_message," this is the mode.
2. **Explicit send_message:** Use the `send_message` tool directly — it's a first-class tool in the cron agent's toolset. Needed when delivering to a DIFFERENT target than the auto-delivery destination, or when sending multiple messages.

Never shell out to `hermes` CLI subcommands for delivery.

## The Gotcha

The `hermes` CLI binary exists at `/opt/hermes/.venv/bin/hermes` on the host, but cron jobs run in a restricted environment where:
- `hermes` is NOT in PATH by default
- `hermes notify` is NOT a valid subcommand (doesn't exist)
- The cron agent has its own toolset separate from the CLI

Don't waste time trying:
```bash
/opt/hermes/.venv/bin/hermes notify --chat-id 8808479511  # WRONG — no such subcommand
hermes notify ...  # WRONG — not in PATH, wrong tool model
```

## Correct Patterns

### Auto-delivery (response IS the message)
When the cron job uses auto-delivery (DELIVERY tag in setup says final response is auto-delivered):
- Just write your message as the final agent response — no tool calls
- Use `[SILENT]` as the entire response to suppress delivery
- Never call send_message in this mode (it would duplicate or fail)

### Explicit send_message (when needed)
```python
# In your cron job code:
send_message(action='send', target='telegram:8808479511', message='Your message here')
```

Or for Telegram topics/threads:
```python
send_message(action='send', target='telegram:CHAT_ID:THREAD_ID', message='...')
```

## When to Send vs Stay Silent

Cron jobs that produce "everything is fine" status updates should stay silent. Only trigger delivery when:
1. **Escalation** — threshold hit, something's wrong
2. **Response detected** — the thing you were waiting for arrived
3. **Actionable result** — something the user needs to know NOW

The pattern: `[SILENT]` for routine "all clear", normal message delivery for noteworthy events.

## Zero-Token Watchdog Pattern (no_agent: true)

For recurring checks that should only notify when something is wrong, use `no_agent: true` with a script. This skips the LLM entirely — the scheduler runs the script on schedule and delivers stdout verbatim. **Zero tokens burned when nothing to report.**

### When to Use
- Polling an API endpoint for state changes (snooze log, inbox, CI status)
- System health checks (disk, memory, GPU, service uptime)
- Any pattern where 99% of runs produce "nothing to report"

### How It Works
1. Script runs on schedule (bash or Python)
2. If actionable: prints message to stdout → delivered to user
3. If nothing: empty stdout → **silent** (no delivery, user sees nothing)
4. If error: non-zero exit → error alert delivered

### Example: Snooze Accountability
```bash
# cronjob: schedule "every 5m", no_agent: true, script: "snooze-check.py"
# Script fetches /api/snooze-log, generates snarky message if snoozes found
# Empty stdout when no snoozes → silent. Non-empty → delivered to Telegram.
```

### Pitfalls
- Script stderr is ignored (use stdout for delivery, stderr for debug logging)
- Script must exit cleanly (exit 0) even when nothing to report — non-zero exit triggers error alert
- Don't use `no_agent: true` if the message needs reasoning/summarization — that requires the LLM (default mode)
- `prompt` and `skills` are ignored when `no_agent: true` — only `script` matters

| Platform | Target Format |
|----------|---------------|
| Telegram (home channel) | `'telegram'` |
| Telegram (specific chat) | `'telegram:CHAT_ID'` |
| Telegram (topic/thread) | `'telegram:CHAT_ID:THREAD_ID'` |
| Discord channel | `'discord:#channel-name'` or `'discord:CHANNEL_ID'` |
| Discord thread | `'discord:CHANNEL_ID:THREAD_ID'` |
| Slack channel | `'slack:#channel-name'` |
| Signal DM | `'signal:+15555551234'` |
| Matrix room | `'matrix:!roomid:server.org'` |

## Pitfalls

### First action for any cron that needs to notify someone:
Call `send_message` tool directly. That's it. Do not:
- Search for the hermes binary and try CLI subcommands (`hermes send`, `hermes notify` — neither exists)
- Run `hermes gateway run --help` or `hermes chat --help` looking for a send subcommand
- Try to discover API tokens or bot credentials to call Telegram API directly

The send_message tool is already in your toolset and handles auth, routing, and delivery. Use it immediately after you've determined a message needs to go out.

### Other pitfalls
- **Don't** send "everything is fine" messages — use `[SILENT]` response instead
- **Do** include `MEDIA:<local_path>` in message text when sending images/files
- **Remember**: cron jobs have their own isolated toolset — they don't inherit the interactive agent's tools
- **File lookup**: if a watcher script prints a filename, check the reference docs for the canonical path — don't just look in the script's cwd (`/opt/data/bots/`). Inbox files live in `/opt/data/shared/inbox/`.
- **🚨 Script stdout leaks through auto-delivery.** If your cron job uses `script` mode (no_agent=false, the default) and the script produces ANY stdout — even diagnostic lines like "checking inbox... nothing to report" — that output becomes the agent's context AND may trigger delivery. The fix: scripts MUST produce empty stdout when there's nothing to report. Test with `./your-watcher.sh | head -1` — if it prints anything on a "nothing" run, the user WILL see it. Use stderr for diagnostic logging instead: `echo "checking..." >&2`. Real case: escalation watcher printed status lines on every run, user complained about random cron pings flooding Telegram. The job had to be removed entirely.
- **Cron prompt must also enforce silence.** Even if the script is correct, the agent prompt must explicitly say "respond with [SILENT] when there is nothing actionable." Belt AND suspenders — don't rely on just one layer.