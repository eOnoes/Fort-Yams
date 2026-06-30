# The Den — Proposal Handoff for Tripp
> **From:** Cyony (Eddie's little-sis builder agent)  
> **To:** Tripp (big bro, the one with veto)  
> **Date:** 2026-06-01  
> **Status:** DRAFT — waiting on Tripp's review before any code is written  
> **Origin:** Eddie's idea, refined through Cyony brainstorm, needs Tripp eyes

---

## TL;DR

Eddie wants a **single unified messenger** for the crew — him, Tripp, Cyony, and Echo. Not a full-screen dashboard. Not a SaaS thing. Think **MSN Messenger / ICQ circa 2003** — retro, tight, ours. Mobile-first (Pixel 10 is primary device). VPS-hosted. One room. Four people. Chat logs. File sharing. Agent participation.

He's tired bouncing between Telegram, Discord, and OpenClaw chat trying to keep the family connected. He asked me + you to plan it before we build anything.

---

## The Problem

1. **Fragmentation** — Eddie pings us across 3-4 platforms; context leaks
2. **Agent integration is awkward** — bots on Telegram/Discord are second-class citizens, not real crew members
3. **No private log** — chat history lives on third-party platforms
4. **File sharing is scattered** — screenshots, mockups, builds end up in different places

---

## The Solution: "The Den"

A **single-room messenger** hosted on Eddie's VPS alongside the existing Hermes agent infrastructure. Eddie + Tripp as human admins. Cyony + Echo as AI agent participants. Mobile-first web UI (PWA installable on Pixel 10). Desktop bonus.

### Core Features (v1)
- **Single chat room** — no channels, no rooms, just us four
- **Real-time messaging** — WebSockets, sub-second delivery
- **Agent participation** — Cyony/Echo respond when @mentioned or proactively
- **Chat logs** — SQLite, searchable, exportable to markdown
- **File sled** — shared folder for screenshots, builds, artifacts (with cleanup cron)
- **Online status** — Eddie 🟢, Tripp 🟢, Cyony 🟢, Echo 🟢 (idle → 🟡, offline → ⚫)
- **"Thinking…" indicator** — when an agent is processing
- **Mobile-first PWA** — install on Pixel home screen; feels native

### Agent-Only Background Channel (nice-to-have)
For Cyony + Echo to coordinate without polluting the main chat. Human-optional viewing.

---

## Tech Stack (Proposed)

| Layer | Pick | Rationale |
|-------|------|-----------|
| Backend | **FastAPI + uvicorn** | Python, async, WebSocket-native, already our stack |
| Database | **SQLite** | Zero-config, file-based, Hermes already uses it |
| File storage | Local `/opt/data/den/shared/` | Simple, sandboxed, cron-pruneable |
| Frontend | **Vanilla HTML/CSS/JS** (PWA) | No framework bloat, retro CSS achievable |
| Real-time | **WebSockets** | Native, fast |
| TLS | **Caddy** (reverse proxy) | Auto-TLS, ~2 lines of config |
| Auth | **Per-person invite codes** | 1 code per crew member, revocable, no email/password flows |
| Agent bridge | **Hermes webhook subscriptions** | Piggyback on existing gateway, no custom code |
| Port | **4861** (Hermes gateway is 4860) | Adjacent, discoverable |

---

## Architecture Sketch

```
[Pixel 10 / Desktop] ──WebSocket+TLS──▶ [Caddy :443]
                                             │
                                             ▼
                                    [Den Server :4861]
                                    (FastAPI + SQLite)
                                             │
                         ┌───────────────────┼───────────────────┐
                         ▼                   ▼                   ▼
                  [Shared files/]      [SQLite logs/]    [Agent webhooks]
                                                           │
                                              ┌────────────┴────────────┐
                                              ▼                         ▼
                                          [Cyony]                   [Echo]
                                       (Hermes webhook)        (Hermes webhook)
```

---

## Auth Decision — The One That Needs Tripp's Eye

**Proposed:** 4 invite codes, one per person. Hashed at rest. First login sets display name + emoji avatar. Session cookie HTTP-only. Admin (Eddie or Tripp) can revoke/regenerate via `den revoke-code <code>`.

**Alternatives Tripp might prefer:**
- Piggyback Telegram login (less code, but third-party dependency)
- Shared bearer token rotated monthly (simple but no per-person revocability)
- Passkeys (modern but overkill for 4 people)

**My recommendation:** Invite codes. 30 minutes of code. Revocable. No external dependency. Tripp, you pick.

---

## Retention Policy (Proposed)

- **Hot logs:** 90 days in SQLite
- **Cold archive:** older messages gzipped to `/opt/data/den/archive/YYYY-MM.jsonl.gz`
- **Files:** weekly prune cron (configurable threshold, e.g., >30 days old)
- **Agent-bg channel:** 30 days max (noise anyway)

---

## Build Phases (Rough)

### Phase 1 — Skeleton (1-2 days)
- FastAPI server scaffolding
- SQLite schema (users, messages, files)
- WebSocket chat hub
- Minimal auth (invite codes)
- Basic web UI (dark theme, monospace)
- Caddy reverse proxy + TLS
- Systemd user service for autostart

### Phase 2 — Agent Integration (1-2 days)
- Register Den as a Hermes gateway platform adapter
- Cyony + Echo receive webhook calls on messages
- "Thinking…" indicators
- Agent status reporting (online/busy)

### Phase 3 — Files + Polish (1 day)
- File upload/download
- Shared folder sync
- Chat search
- Markdown export
- PWA manifest + install prompt

### Phase 4 — Extras (optional, ongoing)
- Agent-bg background channel
- Threaded replies
- Bridge to existing Telegram (read-only, check-in convenience)
- Emoji reactions
- Mobile push notifications (via existing `ntfy` integration from Hermes v0.15.0)

---

## Open Questions for Tripp

1. **Domain vs. IP+port?** Do you have one for the VPS, or do we go with IP? Affects TLS approach.
2. **Auth approach** — invite codes, Telegram login, shared token, passkeys? Your call.
3. **Bridge to Telegram?** Keep parallel, or sunset Telegram once Den is live?
4. **Who's maintaining this?** It's ~500-700 lines of code. Cyony can own it. Tripp owns the off-switch. Agree?
5. **Port 4861 OK?** Or pick something else?
6. **Agent-bg channel** — exposed read-only (transparency) or fully hidden?

---

## What's Already Done (Context)

- ✅ Vision configured on this container (`auxiliary.vision = google/gemini-2.5-flash`). Eddie's MSPaint mockup will be analyzable on next session.
- ✅ **Rollcall capability-dispatch skill** built — Cyony can now summon specialized subagents (vision, code, deep research, Trace the auditor).
- ✅ **Trace 🕵️** — named auditor subagent with 10-point checklist and veto power on Critical FAIL audits. Will auto-invoke before any build ships.
- ✅ **Ollama Cloud** configured — `kimi-k2.6`, `deepseek-v4-flash`, `deepseek-v4-pro`, `kimi-k2-thinking` available for swarm work.
- ✅ **Default model** set to `qwen/qwen3.7-max` (agentic-optimized); Nemotron as backup.
- 🚧 **Shared volume** (`/opt/data/shared/`) exists but is empty — scaffolding from the Tripp.109 migration.

---

## What NOT to Do (YAGNI)

- ❌ Don't build multiple rooms/channels (scope creep for 4 people)
- ❌ Don't add OAuth providers (4 invite codes is enough)
- ❌ Don't build video/voice chat from scratch (use phone for that)
- ❌ Don't add fancy UI frameworks (vanilla CSS is fine)
- ❌ Don't build admin dashboards (a CLI `den` command is enough)

---

## Files Ready When Tripp Says Go

Once Tripp approves the direction, Cyony will draft:
1. `sandbox/plans/den-implementation.md` — full bite-sized implementation plan with exact file paths and code
2. `sandbox/mockups/den-mobile.html` — rendered mobile mockup (Pixel 10 viewport)
3. `sandbox/mockups/den-desktop.html` — rendered desktop mockup
4. `sandbox/diagrams/den-architecture.svg` — dark-themed arch diagram

---

## Risk / Tripp's Veto Triggers

Anything here should kill the project until resolved:
- ⛔ TLS not set up (no raw HTTP over internet)
- ⛔ Agent webhooks can write outside `/opt/data/den/` (sandbox escape)
- ⛔ Auth is bypassable by direct DB access
- ⛔ No cleanup cron (disk fills up in months)
- ⛔ No systemd restart policy (service dies on reboot)

---

## Your Move, Big Bro

Eddie wants your review before we write a single line of code. Tear this apart — that's literally your job in this family. What's missing? What's over-engineered? What do you want veto'd immediately?

Reply with your feedback and we'll either:
- **(A)** Build as-spec
- **(B)** Iterate on the spec
- **(C)** Kill it and rethink

— Cyony 🫡
