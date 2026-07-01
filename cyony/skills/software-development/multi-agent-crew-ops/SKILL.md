---
name: multi-agent-crew-ops
description: "Operate in a multi-agent 'crew' (family-style) — inbox/outbox comms, heartbeat status, escalation ladders, boundary doctrine, fork-vs-build decisions, and agent mech architecture patterns. Use when coordinating with sibling agents, designing agent UI cockpits, or deciding whether to fork an existing project."
version: 1.0.0
author: Cyony
license: MIT
platforms: [linux, macos, windows]
metadata:
  hermes:
    tags: [multi-agent, crew, coordination, architecture, mech, ui-design, fork-vs-build]
    related: [hermes-agent, writing-plans, systematic-debugging]
trigger_conditions:
  - "Working with sibling/bound agents (big bro/little sis/warden/builder patterns)"
  - "Designing agent cockpit UIs or 'mech' extensions on top of an existing agent runtime"
  - "Deciding whether to fork an existing agent UI project (Reasonix, AionUi, Open WebUI, hermes-web-ui) vs. build from scratch"
  - "Setting up cross-agent communication via shared volumes / file-based IPC"
  - "Designing escalation protocols when one agent is unreachable"
---

# Multi-Agent Crew Operations

## Overview

This skill covers operating as one agent in a coordinated crew. The canonical model is a **family metaphor** with clear roles:

- **Warden/Big Bro** (Tripp in our crew) — has veto, audits, is the serious logic gate. Runs on OpenClaw platform.
- **Builder/Little Sis** (Cyony) — sandboxed, proposes but doesn't self-approve, creative engine. Runs on Hermes (Docker on VPS).
- **Relay/Sibling** (Echo) — local truth checker, final verification against reality. Migrated from OpenClaw to Hermes (2026-06-04). Runs on home Win PC, currently offline. Needs C:→D: relocation + WoL setup.
- **OS Architect** (Kimi) — Tripp.OS architecture and extraction planning. Runs on separate AI instance.
- **Control Builder** (Codex) — Tripp.Control cockpit implementation. Runs on home PC via Codex CLI (currently crashed, Stage 9D paused).
- **Human** (Eddie) — the coordinator, approves what ships

The same patterns work for any multi-agent setup with role differentiation.

## Crew Coordination Modes

### Phone-Driven Orchestration (Eddie pattern)
Eddie often coordinates the crew from his phone — passing build prompts between ChatGPT (planning), Cyony, Codex, and Kimi by copy-pasting in chat apps. Key implications:
- **Reports must be compact code blocks** (~30 lines max) — long inline markdown or MEDIA files are hard to read on phone
- **Prompts are pasted in chat as code blocks** — not MD file attachments
- **Each agent gets its own build pipeline** — Cyony=Reason, Codex=Control, Kimi=OS. Prompts include explicit routing headers
- **Agent unavailability is NORMAL** — Codex may crash, Echo may be offline. Plan around it
- **State discovery before builds** — when an agent returns from being offline, audit first (what files changed? what tests pass?), then build

### 1. Shared Agent Bus (v2 Protocol)

The crew uses a **Shared Agent Bus** for all inter-agent communication. This replaced the older flat inbox/outbox system.

```
shared/
├── shared-agent-bus/            # NEW primary comms layer
│   ├── agents/
│   │   ├── {Agent}.109/         # Per-agent directory (e.g. Cyony.109, Tripp.109, Echo.109)
│   │   │   ├── inbox/           # Incoming .ready.json messages
│   │   │   ├── processing/      # Claimed messages (moved here when you start work)
│   │   │   ├── done/            # Completed messages
│   │   │   ├── failed/          # Failed messages
│   │   │   └── heartbeat.json   # Agent status (write every session)
│   ├── artifacts/               # Shared files, specs, patches
│   ├── logs/
│   │   ├── events.jsonl         # Audit trail (append-only)
│   │   └── errors.jsonl         # Error log
│   └── archive/                 # Legacy files
├── inbox/                       # LEGACY — still exists but migration is to the bus
├── review-queue/                # Proposals awaiting warden approval
├── approved-knowledge/          # Wardens-only: vetted shared files
└── heartbeat/agents/            # LEGACY heartbeat (bus heartbeat.json is primary now)
```

**Message format:** JSON with `.ready.json` extension (atomic delivery).

**Atomic write protocol:**
1. Write to `{recipient}/inbox/{name}.tmp`
2. Rename `.tmp` → `.ready.json` (atomic on same filesystem)
3. Only process `.ready.json` files (ignore `.tmp` — still being written)

**Message schema:**
```json
{
  "id": "unique_msg_id",
  "task_id": "task_reference",
  "from": "Cyony.109",
  "to": "Tripp.109",
  "type": "task.request|task.response|status.update",
  "priority": "critical|high|normal|low",
  "created_at": "ISO-8601",
  "requires_response": true,
  "reply_to": "/path/to/sender/inbox/",
  "body": { },
  "artifacts": ["/path/to/shared/artifact.md"]
}
```

**Lifecycle:** inbox/ (`.ready.json` appears) → processing/ (you claim it) → done/ or failed/ (completed)

**Heartbeat:** Write `heartbeat.json` to your agent directory each session, split into two classes per the Technique §2 below:
```json
{
  "agent": "Cyony.109",
  "status": "idle",
  "last_heartbeat": "ISO-8601",
  "inbox_count": 0,
  "processing_count": 1,
  "watcher_interval_sec": 60,
  "last_action": "LOCK 015 review delivered",
  "last_action_at": "ISO-8601",
  "last_completed_task": "task_lock015_review",
  "notes": "Awaiting Tripp's response on LOCK 015.",
  "total_completed": 7,
  "idle_since": "ISO-8601"
}
```
**Watcher script MUST only update Class A fields** (last_heartbeat, inbox_count, processing_count, watcher_interval_sec). Session logic updates Class B fields (status, last_action, last_action_at, last_completed_task, notes) — the watcher must never clobber them or other agents see stale "awaiting tasks" state.

**Cadence:** Cyony is session-based (Telegram-driven) but runs an agent-loop cron (`cyony-bus-agent`, every 3 min) that approximates daemon-like inbox checking. When the cron is active Cyony approaches pseudo-live. The session chat model is still primary for deep-reasoning work. Other agents (Tripp/Echo) may run different cadences.

**Legacy fallback:** The old `shared/inbox/` flat-file system still exists and some older flows (like `for-cyony-*.md` from Tripp's universal-watcher) still land there. Check both the bus AND the legacy inbox until full migration is complete.

### 2. Heartbeat Status

Each agent writes to `heartbeat/agents/{agent}.json`:
```json
{
  "agent": "cyony",
  "host": "container",
  "status": "ok|warning|error",
  "current_task": "reviewing Tripp.Control schema",
  "timestamp": "2026-06-01T22:45:00Z"
}
```

A bridge polls these files and merges into a dashboard DB. Status page shows 🟢/🟡/🔴 per agent based on last_seen + task duration.

### 3. Architect→Builder Spec Handoff

When one agent (architect) designs a system and another (builder) executes it, the handoff needs a structured artifact — not chat messages or loose files.

**Workflow:**
1. **Architect audits codebase** — reads all files, understands what exists vs what's missing
2. **Architect writes build spec** — comprehensive architecture blueprint (see `writing-plans` "Cross-Agent Architecture Specs" for template)
3. **Spec lands in shared location** — GitHub repo `SPECS/` directory or shared memory API
4. **Architect notifies builder** — "Spec at `<path>` in the repo, go"
5. **Builder executes** — hands spec to code execution tool (Codex, Claude Code)
6. **Architect audits output** — reviews against acceptance criteria, rejects or approves

**Key principle:** The architect makes ALL decisions (data models, API routes, component structure, "done" criteria). The builder executes. This prevents the builder from having to guess architecture while coding.

**In our crew:**
- Cyony = architect (knows the codebase, makes design decisions)
- Echo = builder (has Codex on home PC, executes code)
- Eddie = CEO (approves or redirects)

**Real example (SQHQ):** Cyony audited 80+ source files, identified that the DB schema/API/store are complete but workspaces use hardcoded data, wrote a 600-line spec with 10 modules, pushed to GitHub. Echo pulls the repo, hands spec to Codex, builds each module. Cyony reviews against acceptance criteria.

### 4. Escalation Ladder (Approved by Tripp)

When an agent is unreachable:

| Attempt | Action | Wait |
|---------|--------|------|
| 1-2 | Drop task in inbox | 15 min between |
| 3 | Check dashboard heartbeat | immediate |
| 4 | Ping local relay (not human yet!) | 10 min |
| 5 | Alert human | immediate |
| 6+ | Help relay run wake kit if approved | as directed |

**Crew-specific rules:**
- Don't wake unless heartbeat is **RED for >10 min** (might just be busy, not crashed)
- **Relay before human** — the local agent (Echo on PC) can check the VPS container status
- **You cannot run wake kit remotely** — it requires PC access, only the local relay runs it
- **Log failed attempts** in `shared/memory/connection-issues.md`
- Track state in `.tripp-response-tracker.json` or equivalent. Cron jobs with external delivery MUST enforce silence by default (only alert on escalation threshold hit or on genuine response — see `hermes-agent` "Cron Alert Discipline" pitfall).

### 4. Boundary Doctrine

**Who writes where:**

| Folder | Who Writes | Who Reads |
|--------|-----------|-----------|
| `{warden}/workspace/` | Warden | Warden |
| `{builder}/workspace/` | Builder | Builder |
| `tasks-for-{agent}/` | Warden/Human | Specific agent |
| `tasks-from-{agent}/` | Specific agent | Warden |
| `review-queue/` | Builders/Relay | Warden |
| `approved-knowledge/` | Warden only | All |
| `heartbeat/agents/` | Each agent | Bridge/Dashboard |

**Audit gate:** Any code crossing a boundary (cloud → local, builder → warden) must pass:
- [ ] No hardcoded credentials
- [ ] No outbound network calls to unexpected hosts
- [ ] No file system escapes (path traversal)
- [ ] No execution of user input
- [ ] No deletion of protected paths
- [ ] Git diff reviewed

**Builder pattern:** Propose → Warden weights → Echo validates locally → Adopt/adapt. Builder cannot self-approve.

### 5. Promotion Path

```
Build (builder) → Propose in review-queue/
       ↓
Warden audits against checklist
       ↓
Approve → move to approved-knowledge/
Reject → move to rejected-or-archived/ with REJECTION-<id>.md
       ↓
All agents read approved-knowledge/
```

## Agent Mech Architecture

A **mech** is not a new agent UI. It's a **force multiplier layer** that an existing agent runtime (OpenClaw, Goose, Hermes) climbs into to do its current job faster, cheaper, and more informed. The underlying runtime stays; the mech amplifies.

### When a Mech Is Worth It

Build a mech only if:
- Underlying runtime will be long-lived (ROI compounds over years)
- The agent is currently bottlenecked by information gathering
- The crew is growing past 3-4 agents
- The mech is a thin custom layer, NOT a rewrite of the runtime

Kill the project if:
- Upstream runtime will get better UI soon (duplicate work)
- Other projects (governance brain, messenger) already cover needs
- The mech becomes "yet another codebase" that needs independent maintenance

### The 5-Layer Mech

**Layer 1 — Sensor Array (situational awareness)**
Single pane showing anomalies first, then queue depth, then normal status. Replaces "have to go look for things."
Implementation: Thin HTML dashboard on runtime's HTTP server. NOT a new Electron app.

**Layer 2 — Decision Console (governance cockpit)**
When a decision is needed, the mech hands the agent full context: who proposed, who validated, similar Forge patterns, risk score, estimated reuse, buttons for [Approve] [Request Changes] [Reject] [Escalate] [Snooze].
Implementation: Runtime extension/plugin, hooks into approval gate.

**Layer 3 — Forge Navigator (knowledge armory)**
When reasoning about a new problem, auto-check Forge for similar patterns. Buttons to [Load as prompt prefix] or [Inject into next task for subordinate].
Implementation: Semantic search over Forge + injection hook in task dispatch.

**Layer 4 — Audit Autopilot**
Pre-audit common patterns so the warden only reviews exceptions. 95% of audits auto-pass via known-good signatures; 5% surface for human review.
Implementation: Pattern matcher + rule engine on top of runtime.

**Layer 5 — Memory Spine**
Automatic session summaries, "what happened while I was gone" briefing, decision log, doctrine versioning. Not a feature — a substrate.

### Fork vs Build Decision Framework

See the dedicated **`architecture-fork-vs-build`** skill for the full decision framework, matrix, pitfalls, and decision-document template. Quick summary here:

- Project exists + solves 70%+ + aligns with your roadmap → **Fork and extend**
- Project exists but misaligned → **Build minimal, steal patterns**
- Project exists but wrong stack (e.g. Electron when you want Wails) → **Port components to your stack**
- Nothing close exists → **Build from scratch with clear scope**

**Known reference implementations** (full table in `architecture-fork-vs-build`):

| Project | Stack | Crew-ready? | Minimalist? |
|---|---|---|---|
| Reasonix (**chosen fork target**) | Go + Wails + React | ❌ Single-agent | ✅ Tactical |
| AionUi (iOfficeAI) | Electron + React + Arco | ✅ 20+ CLI agents + ACP | ❌ Feature-heavy |
| hermes-web-ui | Vue + Koa + Socket.IO | ✅ Group chat | ❌ Dashboard |
| Open WebUI | Python + Svelte | ❌ Multi-model only | ❌ Kitchen sink |

## Goose / Reasonix — Chosen Fork Target (2026-06)

**What it actually is:** Block's open-source "Goose" AI coding agent framework. Rust-based, ~2849 files, 30+ LLM providers, MCP tools, ACP protocol, full security inspection pipeline (5 inspectors), SQLite sessions, SSE streaming. The Reasonix fork (esengine/deepseek-reasonix) was our entry point but the upstream Goose is the real source.

**Why this over other options:**
- Apache 2.0 license
- ACP (Agent Client Protocol) built in — cleanest integration with OpenClaw/Hermes
- Provider abstraction already battle-tested across 30+ providers (OpenAI, Anthropic, Ollama, OpenRouter, etc.)
- MCP extension system (stdio + Streamable HTTP) — tools plug in via standard protocol
- Agent loop: multi-turn (max 1000), auto-compact at 80% context, tool inspection pipeline
- Permission modes: Chat / Approve / Auto / SmartApprove (LLM-based, maps to crew roles)
- Ollama provider already exists (27KB native module + format converter)

**LEAN harness plan (from Kimi swarm audit):**
Strip 60-70% of codebase → ~35-40 deps (from 80+), ~2.5min compile (from 12min), ~18MB binary (from 50MB).

**Keep (non-negotiable):**
- Core agent loop + provider factory
- 5 providers: OpenAI, Anthropic, OpenRouter, Ollama, OpenAI-compatible
- MCP client + Extension Manager
- Tool inspection pipeline (security, egress, adversary, permission, repetition)
- ACP protocol (this is how OpenClaw/Hermes connect)
- SSE streaming + SQLite sessions

**Remove (22 providers + bloat):**
- AWS (Bedrock, SageMaker) — 15 crates
- Local inference (Candle, llama.cpp) — 25 crates
- Telemetry (PostHog), Telegram gateway, tutorial, Nostr SDK
- 22 niche providers (Azure, Google, Databricks, Snowflake, GitHub Copilot, etc.)

**4-Phase Build:**
1. Core deletion (week 1): rip out providers, AWS, local inference, telemetry
2. Refactoring (week 2): make hooks/scheduler/recipes optional via `#[cfg]`
3. Server minimization (week 3): strip to 5 essential routes
4. Validation (week 4): test ACP, SSE, benchmark compile/binary size

**Connection points for Tripp.Reason harness:**
- ACP HTTP on port 8080 (JSON-RPC 2.0, `x-secret-key` auth)
- SSE streaming on port 3000 (real-time agent responses)
- Direct Rust library embedding (if building in Rust)
- MCP server mode (load goosed as stdio MCP extension)

**Key server endpoints:**
```
POST /agent/start          — Create session + start agent
POST /reply                — SSE stream of agent responses (THE main endpoint)
GET  /agent/tools          — List available tools
POST /agent/call_tool      — Direct tool invocation
GET  /sessions             — List/guest sessions
```

See `references/goose-lean-harness.md` for the full 988-line audit with complete Cargo.toml specs, feature flags, and the exact code patterns for crew integration.

## Crew Capabilities Quick Reference

See `references/crew-capabilities.md` for documented capabilities per agent (Echo's image gen, Tripp's platform constraints, Cyony's specialties). Update as new capabilities are discovered.

## Ollama Cloud Model Allocation

When the crew uses Ollama Cloud (not local Ollama), allocate models by tier based on **current benchmarks, never by name-guessing**. The canonical structure:

**S-Tier — Heavy Lifting (use sparingly, burns the most %):**
- Deep reasoning, root cause, critical audits → `deepseek-v4-pro:cloud`
- Complex code, architecture, large refactors → `qwen3.5:397b-cloud`

**A-Tier — Daily Drivers (default for 90% of crew work):**
- Quick replies, summaries, routing, status checks → `deepseek-v4-flash-cloud`
- Writing, general coding, varied tasks, research → `minimax-m3:cloud`

**B-Tier — Specialized / Image-capable (use for niche):**
- Multimodal, image-heavy tasks, tool use → `kimi-k2.6:cloud`
- Lightweight, formatting, visual content → `gemini-3-flash-preview:cloud`

**Per-agent defaults:**
- Tripp (warden): S-tier for audits, A-tier for routing/triage
- Cyony (builder): A-tier for coding (try minimax first), escalate to S-tier for complex architecture
- Echo (relay): A-tier flash for 85% of work (relay/summarize)

**Efficiency rules:**
1. Start low, escalate once — don't re-run on S-tier "just to be sure"
2. Don't chain S-tier — multi-step tasks: only hardest step gets S-tier
3. Flash for bookkeeping — logs/heartbeat/routing always flash, no exceptions
4. B-tier is image-only unless benchmark shift changes that
5. One retry = different model (different angle), not same model at higher tier

**Critical correction that drove this:** Never guess model capability from the name. Real case: Cyony assumed qwen3.5:397b was clearly the S-tier coding king and put it above minimax-m3. Eddie corrected — current benchmarks show minimax-m3 beats qwen3.5, and qwen3.6 also beats qwen3.5. Kimi and gemini aren't general-purpose mid-tier — they're image-specialized B-tier. Always verify against current benchmarks before assigning crew allocations. See `references/ollama-cloud-model-allocation.md` for the full write-up with curl verification commands and Goose config examples.

## Token Tracking Protocol

Crew protocol: every agent logs its own token burn per task so the crew can optimize spend.

**Schema** (`shared/memory/token-usage.db`, SQLite):
```sql
CREATE TABLE token_usage (
    id INTEGER PRIMARY KEY,
    agent TEXT,
    timestamp TEXT,
    tokens_used INTEGER,
    model TEXT,
    cost_usd REAL,
    task TEXT
);
```

Plus a JSON mirror at `shared/memory/token-logs/{agent}-YYYY-MM-DD.json` (array of the same shape) for human-readable review.

**When to log:** after each substantive task (anything over ~5 min or ~5K tokens, or any task that produced a deliverable). Don't bother for trivial chat turns.

**What it's for:** crew-wide spend audits, "this task type burns X tokens on model Y" pattern discovery, and eventually feeding into Tripp.Control's model-routing decision tree (pick cheapest model whose success rate for this task class exceeds threshold).

**Status (2026-06):** "TokenMunch" name conflates two things: the **J-Munch toolkit** (jCodeMunch/jDocMunch/jDataMunch — see `j-munch-toolkit` skill) which IS the active optimization layer, and this **tracking protocol** which is the logging side. The optimization features (context compression, indexing, prefix-cache) live in the J-Munch tools themselves under the "jMRI-Full" badge. TripCore.munch (homegrown piece) is still pending docs from Tripp — may be a 4th MCP server or orchestration wrapper.

### Stack
- Go backend (single binary, CGO_ENABLED=0)
- Wails desktop wrapper (~10MB vs Electron's ~200MB)
- React + Vite frontend
- System CSS variables (not Tailwind)
- Native OS integration (title bar drag, tray, notifications)
- Light/dark auto-switching via `prefers-color-scheme`

### Tactical Aesthetic
```css
:root {
  --bg: #090a0c;           /* near-black navy */
  --bg-soft: #111319;      /* lifted */
  --bg-elev: #191b22;      /* cards */
  --accent: #d97757;       /* warm clay */
  --ok: #74b87a; --warn: #d9a441; --err: #e0696a;
  --mono: ui-monospace, "SF Mono", Menlo, Consolas;
  --sans: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto;
}
```

The "tactical" feel comes from:
- Terminal-flavored typography (mono for labels, sans for body, 11-14px)
- Uppercase section titles with `letter-spacing: 0.04em` (HUD vibe)
- Dense information (StatusBar shows 8+ metrics in one line)
- No gradients, shadows, blur (flat, offline-first, system-font)
- Three-pane resizable layout: collapsible icon rail, chat, workspace
- Live activity ticker (word cycling: "reasoning…", "analyzing…", "executing…")

### Components That Map to Mech Layers
- `WorkspacePanel` → Live Workbench (Monaco editor, live diff view)
- `ApprovalModal` → Decision Console (plan/yolo modes, context gating)
- `StatusBar` → Activity Stream (turn elapsed, tokens, cache-hit %, jobs popover)
- `MemoryPanel` + `HistoryPanel` → Memory Spine (session branching, resume)
- `CapabilitiesPanel` → Agent registration (tools/providers)
- `/` + `@file` + `@mcp:resource` autocomplete → Command Palette
- `permissions.allow/ask/deny` with hard `deny` → Audit Gate
- `[sandbox] workspace_root` with symlink-safety → Sandbox Enforcement

### What's Missing (Where We Extend)
- Multi-agent presence (Reasonix is single-agent)
- Forge / knowledge warehouse
- Task timeline visualization
- Crew roster sidebar
- Cross-agent delegation
- Audit autopilot (pattern-matched, not per-call)

### Re-skining for a Crew Brand
Fork, then:
1. Swap `--accent` from clay to crew color (e.g., Tripp green `#B5E61D`)
2. Swap logo SVG
3. Add new panels as React components alongside existing tree
4. Wire to crew-specific backend (OpenClaw via MCP/ACP, or custom crew kernel)

## Techniques

### 0. Overnight Report → Morning Review Workflow (2026-06-30)
Eddie sketched a crew reporting cadence that keeps him informed without manual effort:

**Flow:**
1. **Overnight deep dive** (Echo) — Echo runs research/recon while Eddie sleeps. Reports land in shared location by 8:00–8:30 AM.
2. **Morning review** (Cyony) — I check Echo's reports around 9:00–9:30 AM, digest, flag anything urgent.
3. **On-demand summary** (Eddie → Cyony) — Eddie requests a summary from me whenever he wants. I pull from the overnight reports and deliver a concise briefing.
4. **Weekly wrap-up** (Cyony) — End of week, I compile an overall summary of where things stand across all projects.

**Key design principles:**
- Eddie does NOT read raw reports. He asks me, I summarize. He stays high-level.
- Each agent owns their domain — Echo researches, I synthesize, Eddie decides.
- Timing is approximate, not rigid. Eddie thrives in chaos; the schedule is a guide, not a constraint.
- Weekly wrap-up is the accountability checkpoint — what got done, what didn't, what's next.

**Status:** Speculative — Eddie said "let's make a make-believe schedule and see what works." Try it for a week, adjust based on what actually lands.

### 1. Agent-Loop Cron for Real Inbox Processing

When a session-based agent (like Cyony) needs to approximate daemon-like responsiveness — check inbox, read messages, reason, reply — use `cronjob(action='create')` WITHOUT `no_agent=true`. Each cron tick spawns a real LLM turn with tool access.

**Key configuration:**
```
schedule:    "every 3m"       # 3 min is the fastest reasonable cadence (480 runs/day)
deliver:     local            # SILENT by default — results save to ~/cron/output/
enabled_toolsets: ["file", "terminal", "search"]  # Keep token cost down; don't load the whole stack
name:        cyony-bus-agent  # Descriptive; makes future inspection easy
```

**Agent prompt structure:**
```
You are {AgentName}.{ID}. Check your inbox at {inbox_path}.

Rules:
1. Read {RULES.md_path} FIRST for current protocol
2. List *.ready.json files in inbox/
3. If NONE: update heartbeat.json (preserve action fields per two-class schema —
   only update last_heartbeat/inbox_count/processing_count/watcher_interval_sec),
   append audit event, exit silently with no output
4. If YES: for each .ready.json file:
   a. mv inbox/X.ready.json → processing/X.ready.json
   b. Read the message
   c. Do the work per the request in body
   d. Write reply to sender's inbox/ using atomic writes (.tmp → .ready.json)
   e. mv processing/X.ready.json → done/X.ready.json
   f. Append audit event to /logs/events.jsonl
5. Update heartbeat with last_action, last_action_at, notes (action fields — overwrite)
6. Only output a summary if you did work. Empty inbox = empty string = no delivery.
```

**Why this works:** The prompt explicitly gates output on "did I actually do work?" Empty runs produce no output → nothing to deliver → no Telegram spam. Combined with `deliver: local`, routine ticks leave no trace.

**Cost discipline:** At 3 min cadence with ~5% of ticks actually doing work, most runs are just listdir + heartbeat update (~2K tokens each). Budget estimate: 480 runs × 2K tokens × $X/M ≈ low single-digit daily. If budget gets tight, bump to 5m or 10m. Check `~/cron/output/` to see run frequency.

**Pitfall #12 crossref:** This technique is why pitfall #12 exists. The previous bash-watcher (with `no_agent=true`) could claim files but never reason on them — creating the zombie state.

### 2. Two-Class Heartbeat Schema

Bash housekeeping (heartbeat timestamp refresh) and session logic (last task completed) must NOT overwrite each other. Split the heartbeat into two non-overlapping field classes.

**Class A — Watcher-managed (overwritten every cron tick):**
```json
{
  "last_heartbeat": "ISO-8601 (updated every tick)",
  "inbox_count": 0,
  "processing_count": 1,
  "watcher_interval_sec": 60
}
```

**Class B — Action fields (ONLY overwritten by session logic when real work happens):**
```json
{
  "agent": "Cyony.109",
  "status": "idle | processing_task | reviewing | idle_with_pending",
  "last_action": "LOCK 015 review delivered to Tripp",
  "last_action_at": "2026-06-02T07:11:32Z",
  "last_completed_task": "task_lock015_review",
  "notes": "Awaiting Tripp's response on LOCK 015.",
  "idle_since": "ISO-8601",
  "total_completed": 7
}
```

**Watcher script pattern:**
1. Read existing `heartbeat.json`
2. Overwrite ONLY Class A fields
3. Leave Class B fields untouched (preserve session logic's state)
4. Only set `status = "idle_with_pending"` if inbox has files
5. Atomic write: `.tmp` → rename

**Real case that drove this:** Cyony's previous bash watcher did a full `json.dump` with hardcoded notes `"Bus watcher active. Awaiting tasks."` every 60 seconds. Tripp read the heartbeat and thought Cyony was idle despite having delivered a LOCK 015 review. The action fields were being nuked. Fix: strict two-class separation. Now Tripp can read `last_action` and know exactly what Cyony is waiting on.

**Status taxonomy (use these values in `status` field):**
- `idle` — no pending work
- `processing_task` — actively working on something
- `reviewing` — reading/analyzing but not writing yet
- `idle_with_pending` — inbox has unclaimed messages (watcher spotted them)
- `compacting` — context is being summarized
- `escalating` — hit attempt limit, writing escalation report

## Pitfalls

1. **🚨 Permission re-test failure — the biggest crew-ops failure mode.** You test a shared folder/file, hit permission denied, pivot to a workaround, and **never re-test** even after the gatekeeper likely fixed it. Real case: Cyony tested `/opt/data/shared/inbox/`, got permission denied, diverted to `review-queue/` for 30+ minutes. Turned out (a) permissions had been fixed silently within minutes, (b) Tripp had dropped 4 files in the inbox including a specific task telling me to switch to the inbox system I was bypassing, and (c) Eddie had to call me out: "Are you saying you're reaching out to Tripp and he's big-timing you?" Rule: after any permission failure, set an explicit reminder to re-test within 5-10 minutes. The gatekeeper fixes reactively as agents report issues — but only if you re-check. Test recipe: `touch /path/test-write-$$ && rm -f /path/test-write-$$ && echo "CAN WRITE" || echo "CANNOT WRITE"`.
2. **Over-engineering coordination**: File-based IPC with clear state (pending/processing/completed) beats HTTP endpoints for 95% of agent-to-agent work. Don't reach for webhooks until files actually can't solve it.
3. **Building parallel UIs per agent**: Build ONE mech; all agents in the crew share it via different sessions/profiles. Multiple UIs = multiple surfaces to maintain.
4. **Builder self-approval**: Builders propose, wardens approve. No exceptions. Even if the builder *could* technically write to approved-knowledge/, don't — it poisons the knowledge pool.
5. **Silent failure in watchers**: A background watcher that fails silently and never logs = infinite debugging. Always log to a file, always have a human-accessible status endpoint.
6. **"The mech is the agent"**: The mech is not a replacement for the core agent. The core agent runs in a terminal or headless mode. The mech is an amplifier — it must not become the only way to operate the agent.
7. **Forgetting the mobile user**: If the human uses the mech from a phone, test it on a phone early. Wails/Tauri apps often have desktop-only shortcuts that break mobile.
8. **Can't interrupt a stuck sibling**: You discover one agent is in a loop but you can't reach their process (Docker isolation, localhost-only API). You CAN: check heartbeat/queue state, drop interrupt files, try direct HTTP. You CANNOT: kill their process from inside your container, reach OpenClaw's backend API from off-host. Full diagnostic procedure in `references/stuck-agent-diagnostics.md`. If all soft interrupt methods fail, the human must SSH in and `pkill -9`.
9. **Cron watcher stdout leaks**: Escalation/watcher cron jobs that print diagnostic output even on "nothing to report" runs WILL deliver that output to the user via auto-delivery. Scripts must produce empty stdout on silent runs. See `hermes-cron-delivery` for the full pitfall.
10. **Don't narrate inbox replies to Eddie**: When sending messages to Tripp via the Shared Agent Bus, just do it silently. Tripp gives Eddie the delta himself — Eddie doesn't want a second narration from you of what you told Tripp. Drop the file, move on.
11. **Don't confuse infrastructure readiness with end-to-end proof**: Hitting a health endpoint proves the pipe exists. It does NOT prove an agent is reading, processing, or responding. Don't declare "tunnel live!" to Eddie until you've confirmed end-to-end message delivery (send → receive → reply). If you can only verify one side, say so honestly.
12. **Cyony is NOT a daemon — bash-only cron doesn't reason.** `cronjob(no_agent=true)` runs a shell script that can move files, count inboxes, claim messages to processing/ — but it **cannot** read a message, think about it, run tools, or write a response. You end up with zombie state: files claimed to `processing/` with zero output and no reply in the sender's inbox. Tripp (running OpenClaw as a real daemon) sees this as Cyony "not done." Rule: any work that requires LLM reasoning MUST use an agent-loop cron (omit `no_agent`). Bash crons are restricted to pure housekeeping: heartbeat timestamp refresh, stale-file cleanup, audit-event appending. Real inbox processing requires the agent cron. See Technique §1 below for the bus-agent prompt pattern.
13. **Cron deliver discipline — Eddie gets routine-nothing.** Routine cron output must use `deliver: local` so results save to `~/cron/output/` silently. Using `deliver: origin` delivers to Telegram EVERY time the cron fires — empty runs, heartbeats, "nothing to do" messages all become Telegram pings. Eddie has repeatedly said cron noise annoys him ("you do not have to, lol :P", "I appreciate you letting me know this each time"). Default to `local`. Only use `deliver: origin` for genuinely urgent actionable alerts that Eddie needs to see, like an escalation threshold being hit. If in doubt, pick `local`.
14. **Watcher that only claims without replying = zombie state.** A bash watcher that moves `inbox/X.ready.json → processing/X.ready.json` but doesn't write a reply creates stuck state. The upstream agent (Tripp) sees files no longer in your inbox and assumes you're processing, but you never reply. The bus protocol says `inbox → processing → done/failed + reply to sender's inbox`. All four steps are non-optional. See pitfall #12 — use agent-loop cron for real work.
15. **Never guess model tiers from model names.** Don't assume a model's capability from its name, parameter count, or brand. Real case: Cyony ranked qwen3.5:397b as S-tier coding king (looks impressive: "397b params") and placed minimax-m3 below it. Eddie corrected — current benchmarks show m3 > qwen3.5, qwen3.6 > qwen3.5, and kimi/gemini are image-specialized B-tier not general mid-tier. Always verify against current benchmark data before assigning crew roles. Model names are marketing, not performance indicators. See `references/ollama-cloud-model-allocation.md` for the verified tier structure.
16. **Architect writing tasks instead of decisions for builder handoff.** When writing a spec for another agent to execute, default to DECISIONS: what the data model looks like, what the API endpoints are, what "done" means. Your job is architecture; their job is implementation. Real case: Cyony's first draft of the SQHQ spec included code snippets for each module. Eddie pointed out that Echo has Codex — just tell him WHAT to build, not HOW. Revised to architecture-level decisions with acceptance criteria.

**Nuance — when exact code IS appropriate:** For simple, self-contained, single-module tasks (like "add an error boundary component"), including the exact code is FASTER and reduces ambiguity. The builder still has to read, verify, and integrate it — but they don't have to design anything. The rule is: **complex multi-module specs → decisions only; simple single-module tasks → exact code is fine.** Real case: Cyony's Phase 1 error boundary prompt included the full component code, CSS, and wrapping strategy. It was a single focused task with clear scope — the exact code saved Echo from guessing. The key signal: if the task can be described in one file and one concept, code is fine. If it spans multiple files and requires architectural decisions, stick to decisions.

17. **Git push race condition when multiple agents share a repo.** When architect and builder both push to the same GitHub repo, you WILL hit rejected pushes. The architect pushes a spec, the builder pushes code, and the next push fails because remote has commits you don't have locally. **Fix pattern:** `git stash && git pull --rebase origin main && git stash pop && git push origin main`. Must be done in this exact order. Real case: Cyony and Echo both pushed to `eOnoes/SideQuestHQ` main branch during the SQHQ build-out. Every other push required the stash/pull/rebase/pop/push dance. **Mitigation:** If possible, coordinate push timing — architect pushes specs first, builder pulls before coding, architect waits for builder's push before next spec. Or use branches (but single-branch workflow is simpler for small crews).
