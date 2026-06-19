# Adaptive Watcher Crontab Prompt Templates

The two prompts below encode the non-trivial logic: **gated fast cron** and **transition idle cron**. Copy-and-modify for any Hermes agent adopting the pattern (e.g., Echo).

## Cron 1: `*-bus-fast` (every 1m, gated)

The fast cron MUST read the state file FIRST and exit silently if mode≠fast. This is why it doesn't spam — every minute it wakes up, sees mode=idle, and goes back to sleep with zero tool calls.

```
You are {AGENT}. Run a FAST-CYCLE watcher tick. Gated by shared state file.

STEP 1 — READ STATE
Read {BUS}/{agent_dir}/watcher_state.json and parse JSON. Fields: mode, active_until, last_transition, transitioned_by.

STEP 2 — GATE CHECK
Get current UTC time.
IF mode != "fast": exit with empty output. Do NOT touch inbox, heartbeat, etc.
IF mode == "fast" AND active_until set AND current_time > active_until:
  Write state: mode="idle", active_until=null, last_transition=<now>, transitioned_by="fast-cron-auto-cooldown"
  Exit empty.
IF mode == "fast" AND within window: proceed.

STEP 3 — INBOX
List *.ready.json in {BUS}/{agent_dir}/inbox/ (root only).
IF empty: update heartbeat (preserve action fields — only touch watcher-managed fields), exit empty.
IF has files: proceed.

STEP 4 — PROCESS (per SSOT RULES.md)
For each .ready.json:
  a. mv inbox/X → processing/X (claim FIRST per Rule 3)
  b. Read message JSON
  c. Do work per body
  d. Write reply to sender's inbox/ via atomic writes (.tmp → .ready.json)
  e. mv processing/X → done/X
  f. Append to logs/events.jsonl

STEP 5 — EXTEND WINDOW
Write state: mode="fast", active_until=now+5min, last_transition=<now>, transitioned_by="fast-cron-work-done"

STEP 6 — UPDATE HEARTBEAT (action fields)
Set status, last_action, last_action_at, last_completed_task, notes + watcher-managed fields.

STEP 7 — OUTPUT
Brief summary if work done, else empty. deliver=local so output is silent anyway.

CRITICAL: No questions. No pings unless message asks. On error: append to logs/errors.jsonl. NEVER deliver to inbox/done/.
```

## Cron 2: `*-bus-idle` (every 15m, transitions on mail)

The idle cron has dual responsibility: maintain heartbeat AND detect mail to kick off fast mode. When mail arrives it writes the state file to fast mode and processes the mail itself (doesn't wait for fast cron).

```
You are {AGENT}. Run an IDLE-CYCLE watcher tick. Fires every 15 minutes.

STEP 1 — INBOX CHECK
List *.ready.json in {BUS}/{agent_dir}/inbox/ (root only). Count.

STEP 2a — NO MAIL: IDLE
Read state file. Update heartbeat (preserve action fields — only watcher-managed). Exit empty.

STEP 2b — MAIL DETECTED: TRANSITION TO FAST MODE
Write state: mode="fast", active_until=now+15min, last_transition=<now>, transitioned_by="idle-cron-mail-detected"
Then process mail yourself per SSOT RULES.md (same workflow as fast cron step 4).

STEP 3 — UPDATE HEARTBEAT
Action fields if work done. Watcher fields always.

STEP 4 — OUTPUT
Brief summary if work done, else empty.

CRITICAL: Same as fast cron.
```

## State File Schema
```json
{"mode":"idle|fast","active_until":"ISO|null","last_transition":"ISO","transitioned_by":"string"}
```

## Setup Recipe (for Echo to replicate)
```
1. Replace old single-cron watcher
2. Create idle cron: schedule "every 15m", enabled_toolsets [file, terminal, search], deliver=local
3. Create fast cron: schedule "every 1m", enabled_toolsets [file, terminal, search], deliver=local
4. Seed state file: mode=idle
5. Both crons must be self-contained (no shared context), so the full prompt goes in each
```

## Pitfalls
- deliver=local is required — otherwise fast cron's silent ticks flood the channel
- enabled_toolsets must include file/terminal/search so the cron can manipulate files
- Fast cron MUST read state first and exit fast — don't load mailbox or heartbeat when gated out
- Idle cron must process mail itself when it detects it, not just set state and hope fast cron picks up (race window of up to 60s)
- Active window should be 5-15 min total, not indefinite — otherwise a single mail item locks in fast mode forever
- State file needs to be writable by cron agent (check perms — Tripp creates root:root often)
