---
name: shared-agent-bus
description: "Shared Agent Bus protocol — crew canonical comms. SSOT: /opt/data/shared/shared-agent-bus/RULES.md"
tags: [comms, bus, inbox, tripp, echo, crew-comms]
created: 2026-06-02
---

# Shared Agent Bus Protocol — ⚠️ DEPRECATED (2026-06-08)

> **This protocol is deprecated.** It was designed for 10+ agent swarms and proved overengineered for a 3-agent family crew. The file-based inbox/outbox state machine, watcher crons, and atomic `.tmp → .ready.json` pipeline were never actually used — Eddie routed all tasks directly via Telegram.

> **Replacement:** See `multi-agent-crew-coordination` for the simplified model:
> - Human IS the comms bus (Telegram direct)
> - Tripp = code reviewer only (not message gatekeeper)
> - Simple heartbeat JSON per agent (no bridge, no database)
> - Shared `crew-knowledge.md` for cross-agent context
> - Old inbox/outbox/bus directories archived to `.LEGACY`

> The original skill content is preserved below for reference. Do not implement new workflows using this protocol.

## Trigger
Any crew comms, inbox checks, or message delivery with Tripp/Echo.

## SSOT
`/opt/data/shared/shared-agent-bus/RULES.md` — always re-read before acting on bus messages.

## My Paths
- Inbox: `agents/Cyony.109/inbox/`
- Processing: `agents/Cyony.109/processing/`
- Done: `agents/Cyony.109/done/`
- Failed: `agents/Cyony.109/failed/`
- Heartbeat: `agents/Cyony.109/heartbeat.json`
- Reply targets: `agents/Tripp.109/inbox/` and `agents/Echo.109/inbox/`

## Workflow
1. Check inbox for `*.ready.json` (ignore `.tmp`)
2. mv from `inbox/` → `processing/`
3. Do work
4. mv from `processing/` → `done/` (or `failed/`)
5. Atomic write response to sender's inbox: `.tmp` → rename `.ready.json`
6. Append to `logs/events.jsonl`
7. Update `heartbeat.json`

## Message Envelope
id, task_id, from, to, type, priority, created_at, requires_response, reply_to, body, artifacts

## Atomic Write
Write `.tmp` then `mv` to `.ready.json`

## Rule 3: Claim Before Processing (STRICT)
1. mv from `inbox/` → `processing/` FIRST
2. THEN read and process
3. THEN mv from `processing/` → `done/` (or `failed/`)
4. THEN write response to sender's `inbox/`
**NEVER skip processing/. NEVER move inbox → done directly.**

## Rule 6: Adaptive Timing
- Baseline: 15 min when idle
- Active work detected: 20s for 15 min
- Backoff: +30s every 2 min until baseline
- Urgent: 10s when Eddie triggers urgent mode

## Rule 7: Token Reporting
After 2/2 responses collected, check usage, update shared status, report to Eddie if thresholds exceeded.

## Watcher Cron: Delivery & Noise Rules

**DEFAULT: `deliver: local`** for all bus watcher crons. Output is silently saved to `~/cron/output/` — Eddie NEVER sees it.

**NEVER use `deliver: origin`** for watcher crons unless Eddie explicitly says "ping me when mail arrives." He finds routine alerts noisy (corrected 3+ times in a session).

**If mail arrives and you want Eddie aware:** just do the work and let Tripp relay via delta. Don't narrate bus file contents to Eddie ("you got 2 messages from Tripp" = unwanted). Eddie reads files directly; narration is noise.

**Pattern for adaptive timing:** Two crons with shared state file gating.
- `cyony-bus-idle` every 15m — detects mail → flips state to mode="fast", processes the mail itself
- `cyony-bus-fast` every 1m — NO-OP unless state says mode="fast" → processes mail with 5-min rolling window → auto-cools to idle after 5 min of no mail or 15 min max runtime
- State file: `agents/{Name}.109/watcher_state.json` — Tripp can audit mode transitions

## Heartbeat: Two-Class Schema (IMPORTANT)
Watcher NEVER overwrites action fields. Only session logic sets them.
- **Watcher-managed fields** (overwritten every tick): last_heartbeat, inbox_count, processing_count, watcher_interval_sec
- **Action fields** (ONLY set by session logic): status, last_action, last_action_at, last_completed_task, notes, idle_since

Pattern: watcher reads existing heartbeat.json, updates only managed fields, preserves action fields. If you clobber, Tripp sees stale "awaiting tasks" and thinks you haven't worked.

When starting real work → update status/last_action/last_completed_task yourself.

See `references/message-delivery-pattern.md` for a proven envelope shape and atomic delivery example (Cyony → Tripp, 2026-06-06).

See `references/two-class-heartbeat.md` for the full pattern with implementation example.

When starting real work → update status/last_action/last_completed_task yourself.

See `references/message-delivery-pattern.md` for a proven envelope shape and atomic delivery example (Cyony → Tripp, 2026-06-06).

## Pitfalls
- Never deliver to `inbox/done/` — root `inbox/` only
- Never write as root:root (I'm hermes) — see references/root-root-permission-fix.md
- Never skip `.tmp` → `.ready.json` rename
- Never process without claiming first (mv to processing/)
- Never edit another agent's processing/done/failed
- Never skip heartbeat updates
- Old `shared/queues/` and `shared/inbox/` are deprecated
