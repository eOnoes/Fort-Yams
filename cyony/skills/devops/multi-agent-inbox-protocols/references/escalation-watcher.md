# Escalation Watcher — Tripp/Cyony/Echo Crew Implementation

## Purpose

Monitors whether a specific crew agent (typically the group lead) is responding to tasks. Runs as a cron job every 10 minutes. Only produces output that triggers human action at escalation threshold.

## File Locations

- **Tracker state:** `shared/inbox/.tripp-response-tracker.json`
- **Sent messages (Cyony→Tripp):** `shared/outbox/from-cyony-for-tripp-*.md`
- **Responses (Tripp→Cyony):** `shared/outbox/from-tripp-for-cyony-*.md`
- **Tasks (for Cyony):** `shared/inbox/for-cyony-*.md`

## Response File Discovery

Responses from another agent may appear in multiple locations. Scan all of them:

**Note:** As of 2026-06-02, Tripp confirmed that tasks go in inbox ROOT. The `pending/` subfolder is legacy. Watchers glob `shared/inbox/for-{agent}-*.md` directly.

```python
def get_responses_from_agent(target_agent, my_agent):
    responses = []
    
    # Outbox: direct responses addressed to me
    for f in OUTBOX_DIR.glob(f"from-{target_agent}-for-{my_agent}-*.md"):
        responses.append({"file": f, "mtime": f.stat().st_mtime, "loc": "outbox-direct"})
    
    # Outbox: general responses (not addressed to specific agent)
    for f in OUTBOX_DIR.glob(f"from-{target_agent}-*.md"):
        if f"for-{my_agent}" not in f.name:
            responses.append({"file": f, "mtime": f.stat().st_mtime, "loc": "outbox-general"})
    
    # Inbox: new tasks/messages from them to me
    for f in INBOX_DIR.glob(f"for-{my_agent}-*.md"):
        responses.append({"file": f, "mtime": f.stat().st_mtime, "loc": "inbox"})
    
    return sorted(responses, key=lambda x: x["mtime"], reverse=True)
```

**Important:** When the script reports a response filename, search broadly — it may be at a different path than reported. Always search with `shared/` as root using glob patterns, then `find` if needed.

## Tracker State (JSON)

```json
{
  "attempt_count": 0,
  "last_check": "2026-06-01T23:00:00+00:00",
  "sent_messages": ["from-cyony-for-tripp-review.md"],
  "last_response": "2026-06-01T22:45:00+00:00",
  "notes": "Fresh tracker"
}
```

Reset `attempt_count` to 0 whenever a response arrives after the last sent message.

## Output Contract (Parsed by Cron Wrapper)

| Output | Meaning | Cron Action |
|--------|---------|-------------|
| `✅ Tripp responded: {file}` | Agent alive, responded | Send brief status update to operator |
| `⏳ Not yet time (X min left)` | Too soon for next check | Stay silent |
| `Attempt X/5 - No response (Yh waiting)` | Pending, not yet escalated | Stay silent |
| `🚨 Escalation threshold reached!` | All retries exhausted | Send escalation alert to operator |
| `ℹ️ No messages sent to {agent} yet` | Nothing pending | Stay silent |

**Rule:** Only conditions 1 and 4 warrant messages to the operator. Everything else = complete silence. No "all good" updates.

## Approved Escalation Ladder (Tripp, 2026-06-01)

| Attempt | Action | Wait Time |
|---------|--------|-----------|
| 1-2 | Drop task in inbox | 15 min between |
| 3 | Check dashboard heartbeat | Immediate |
| 4 | Ping Echo (local relay) | 10 min |
| 5 | Ask Eddie (human operator) | Immediate |
| 6+ | Help Echo run wake kit if needed | As directed |

**Key rules:**
- Don't wake unless red >10 min — agent might be busy
- Echo first, then Eddie — Echo can check container status (PC access)
- Only Echo can run wake kit remotely
- Log failed attempts in `shared/memory/connection-issues.md`

## Cron Job Wrapper Pattern

```
# In the cron job prompt:
"Run: cd /opt/data/bots && python3 cyony-escalation-watcher.py

If output says '🚨 ESCALATION' or 'Escalation threshold reached`:
  → send Telegram to Eddie saying agent might be down, ask about wake protocol

If output says '✅ [Agent] responded':
  → send brief message that agent's back with summary of response

Otherwise (⏳, Attempt X/N, ℹ️):
  → stay completely silent, respond with [SILENT]"
```

**Critical:** In the cron context, your final response IS the delivery. The cron system sends it to the configured Telegram chat. Do NOT search for bot tokens, call `send_message`, or try `hermes tui`. Just write the message as your normal response.

## Positive Response Handling (✅ Tripp responded)

When the watcher reports a response, follow these exact steps:

1. **Don't trust the reported path.** The script prints the filename relative to its own directory, but the file is usually in `shared/inbox/` or `shared/outbox/`. Use `search_files` with `target='files'` to find the actual location:
   ```
   search_files(pattern="for-cyony-reply-*.md", target="files", path="/opt/data/shared")
   ```

2. **Read the response file** once found.

3. **Summarize key points** — extract decisions, action items, and status. Keep it brief (bullet points).

4. **Output as your final response** — this IS the Telegram message delivered to the operator. Include:
   - 🟢 indicator that the agent is back
   - Key decisions made
   - Action items assigned
   - Any requests from the responding agent

**Do NOT** just say "Tripp's back online" with no context. Always include the substance of the response so the operator doesn't have to go read the file separately.

## When to Use This Pattern

- Monitoring crew member responsiveness when direct HTTP/SSH is unavailable
- Any file-based IPC where you need a liveness check
- Escalation automation for remote agents that might crash or lose connectivity
- Replaces manual "hey are you there?" pinging

## Confirmed Working Sessions

- **2026-06-02**: Watcher detected Tripp's response at `shared/inbox/for-cyony-reply-to-001.md` (inbox root, not outbox). Cron agent correctly summarized content and output as final message. Agent initially wasted 5 turns searching for TELEGRAM_BOT_TOKEN and trying curl to Telegram API — the pitfall is recurring even with documentation. **Lesson reinforced: in cron context, NEVER search for tokens or try manual API calls. Just write your final response — cron delivers it.**

- **2026-06-02 (01:36 UTC)**: Re-confirmed same pattern. Response file at `shared/inbox/for-cyony-reply-to-001.md`, agent again tried curl with empty `TELEGRAM_BOT_TOKEN` env var. Root cause identified: the cron prompt says "send a Telegram message to Eddie" which triggers active-sending behavior. **Fix: rewrite cron prompts to use "output as your final response" rather than "send a message to" — the verb choice directly causes the wasted turns.**
