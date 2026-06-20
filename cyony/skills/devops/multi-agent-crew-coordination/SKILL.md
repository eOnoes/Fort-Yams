---
name: multi-agent-crew-coordination
description: "Coordinate a crew of 2-5 AI agents as a family team: warden, builder, relay, human. Covers full file-based IPC (for autonomous crews) AND simplified human-as-router model (for active-human small crews). Includes role doctrine, deployment boundaries, heartbeat health, harness dashboard pattern, and mediated learning."
version: 1.0.0
author: Cyony (via Eddie+Tripp crew)
license: MIT
platforms: [linux]
metadata:
  hermes:
    tags: [multi-agent, crew, coordination, doctrine, family, governance]
    related_skills: [kanban-orchestrator, capability-dispatch, ollama-swarm-orchestrator, hermes-agent]
trigger_conditions:
  - User has multiple AI agents in a defined crew (not just parallel subagents, but persistent siblings)
  - Setting up shared folders between agents with role-based write permissions
  - Building task-inbox detection so agents notice new work dropped for them
  - Defining roles: warden (gatekeeper), builder (does work), relay (human bridge), human (final authority)
  - Designing mediated learning pipelines (propose → approve → share knowledge)
  - File-based IPC across Docker/host/VM boundaries
  - Heartbeat health monitoring across heterogeneous agent hosts
---

# Multi-Agent Crew Coordination

## Overview

This skill captures patterns for running a **persistent crew** of AI agents — not one-shot subagents spawned for a parallel task, but sibling agents that exist over weeks/months, each with:
- Their own host (Docker container, VPS, local PC)
- Their own personality/role
- Clear authority boundaries
- File-based IPC for communication across isolation
- Mediated learning so no single agent can poison shared knowledge

Distinguished from related skills:

| Skill | What It Covers | What This Skill Adds |
|-------|---------------|---------------------|
| `kanban-*` | Multi-agent task boards, dispatcher/worker lifecycles | Persistent crew doctrine *outside* kanban |
| `capability-dispatch` | Routing to specialized models within one agent | Multi-agent sibling coordination |
| `ollama-swarm-orchestrator` | Model-specific parallelism via Ollama | Cross-host file-based coordination |
| `hermes-agent` | Hermes configuration | Crew governance patterns |

## The Role System

### The Four-Role Foundation

Most crews settle into these roles naturally:

| Role | Responsibilities | Authority | Example |
|------|------------------|-----------|---------|
| **Human** | Final approval, direct task routing, context injection | Unconstrained veto — IS the comms bus | Eddie |
| **Warden** | Code reviewer. Audits PRs, validates safety, approves knowledge. Does NOT route messages or gatekeep tasks. | Can veto/reject code; cannot modify builder sandbox without permission | Tripp |
| **Builder** | Does the actual work (code, research, experiments, dashboards), proposes learnings | Can propose to review-queue; cannot directly edit warden's state | Cyony |
| **Relay** | Bridges between isolated subsystems, pushes/pulls artifacts, tests builder's work, audits manifests | Read from one side, write to the other | Echo |

### CRITICAL: When to Simplify

**If your protocol documentation is larger than your crew, you overengineered.** A 3-agent family crew does not need a 10-agent swarm protocol. Signs of overengineering:

- File-based inboxes nobody reads
- Watcher crons polling empty folders
- Escalation ladders when the human notices silence first
- Atomic `.tmp → .ready.json` state machines for messages that never arrive
- `DenialReason` enums for a bus with no traffic

**The simplified model (proven 2026-06-08):**
- Human routes tasks directly (Telegram, Notion). No file inboxes between agents.
- Warden role shrinks to CODE REVIEW ONLY. Not message gatekeeper, not task router.
- Heartbeat: one JSON file per agent. Stupid simple. No bridges, no databases, no crons.
- Shared knowledge: one `crew-knowledge.md` file. Agents read it on session start.
- Dashboard: Markdown → generator → static HTML. Human never touches JSON.

### Why This Pattern

- **No single agent can corrupt shared knowledge** — builder proposes, warden approves
- **Clear kill switch** — human has veto, can roll back any agent
- **Isolation by default** — each agent's internal state stays local; only shared bridges cross boundaries
- **Mediated learning** — prevents "one agent teaches bad habits to everyone"
- **Simplicity beats completeness** — a protocol unused is worse than no protocol at all

## Deployment Architecture

### The Shared Bridge Pattern

The universal pattern: two isolated runtimes (Docker ↔ host, VM ↔ VM, VPS ↔ local PC) share a **single filesystem bridge** — not a network connection.

```
┌───────────────────────┐          ┌───────────────────────┐
│   Agent A (Docker)    │          │   Agent B (host)      │
│   /opt/data/shared/   │ ◀────▶  │  /root/agents/shared/ │
│   (mount point)       │          │  (canonical source)   │
└───────────────────────┘          └───────────────────────┘
```

**Why files, not HTTP?**
- Isolation is preserved — agents can't call each other's endpoints
- No auth token management across boundaries
- Durable — survives crashes, restarts, reboots
- Auditable — every exchange is a file with timestamp
- Natural backpressure — can't flood a filesystem like an API

### The Folder Doctrine

Every crew eventually converges on this structure:

```
shared/
├── tasks-for-<agent>/      # Warden drops work here
├── tasks-from-<agent>/     # Builder reports back here
│   └── done/               # Completed tasks, archived
├── review-queue/           # Builder proposes → Warden audits
├── approved-knowledge/     # Warden-approved shared state
├── rejected-or-archived/   # Warden-rejected items (with reasons)
├── heartbeat/              # Health status files
│   └── agents/
│       └── <agent>.json    # Per-agent heartbeat
└── memory/                 # Shared long-term memory
```

### Ownership Rules

- Warden writes to: `approved-knowledge/`, `rejected-or-archived/`, task folders FOR others
- Builder writes to: `review-queue/`, task folders FROM self
- Builder reads from: everything (but doesn't edit warden-owned files)
- Both agents read: `approved-knowledge/` (canonical truth)

**Critical pitfall:** If Agent A creates files as root and Agent B runs as a non-root user, the bridge breaks. **Every shared directory must be owned by the receiving agent's user** or have `chmod 777`. Document this in your deployment doctrine.

## The Task Inbox Pattern

### Problem
Agent A drops work into agent B's inbox. Agent B doesn't notice until someone pings it. Silent failure.

### Solution: Cron-manifest-file-watcher

Run a cron job that:
1. Scans the task directory for new `.md` files
2. Compares against a `.processed-manifest.json` file (records what's been seen)
3. On new tasks: notifies the **human coordinator** (not auto-processes)
4. Human then tells the agent to pick it up

**Why notify human first:**
- Builder agent acting solo on warden's tasks = doctrine violation
- Human decides priority, batches related tasks, can reject/redirect
- Preserves the chain of command

### Reference Implementation

See: `scripts/task-watcher-template.py`

### Session-Start Protocol

Also add to your agent's startup habit:
> "On session start, always check tasks-for-<me>/, review-queue/, and memory/"

The cron is the detection; the protocol is the intake.

## Heartbeat Health Pattern

### File-Based Heartbeat (for Isolated Agents)

When you can't POST to another agent's HTTP endpoint:

1. Agent writes `{status, current_task, timestamp}` to a JSON file in the shared bridge
2. A bridge daemon on the *warden's side* polls that file periodically
3. Bridge feeds the warden's aggregator (SQLite + dashboard)
4. Dashboard shows crew health: 🟢 OK, 🟡 WARNING, 🔴 DOWN, 🔴 LOOP

### Expected-Time Thresholds

Critical for distinguishing "fast task taking long" vs "research running normally":

- Quick tasks: 5 min threshold
- Build tasks: 30 min threshold
- Research tasks: 2+ hours acceptable

Each heartbeat includes `expected_minutes` so loop detection is context-aware.

### Loop Detection

If `current_task` hasn't changed in N > `expected_minutes`, the agent is stuck. Alert human before it burns tokens in circles.

## Mediated Learning Pipeline

```
Agent discovers something new
        ↓
Writes proposal to review-queue/
        ↓
Warden reviews against safety checklist:
  [ ] No hardcoded credentials
  [ ] No unexpected outbound network calls
  [ ] No file system escapes (path traversal)
  [ ] No user-input execution (injection)
  [ ] No deletion of protected paths
        ↓
Approve → moves to approved-knowledge/
Reject  → moves to rejected-or-archived/ with reason
        ↓
All agents read approved-knowledge/ (read-only)
```

**Why this matters:** Agent A learning a bad pattern and sharing it with Agent B corrupts the entire crew. Mediated learning prevents this.

## The Wake Protocol

When agents go down, document per-agent recovery recipes:

### Echo (Home Win PC, Hermes)

| Field | Value |
|-------|-------|
| **Host** | Home Windows PC |
| **Platform** | Hermes (migrated from OpenClaw) |
| **Wake method** | Wake-on-LAN magic packet (BIOS + Windows setup required) |
| **Emergency wake** | Physical access — wiggle mouse or power button |
| **Check** | `curl http://host.docker.internal:18790/health` (endpoint may have changed with migration) |

**Wake-on-LAN setup:** See `references/wake-on-lan-win-pc.md` for the full BIOS → Windows → phone app setup guide. Once configured, wake from phone via any WoL app (MAC address + broadcast IP).

**Common failure modes:**
- PC actually asleep → WoL should work
- PC crashed/frozen → WoL won't help, need physical restart
- Tool-call error loop crashed the app → PC may still be on but agent process dead. Physical restart needed.

### Generic Agent Recovery

```
Agent A:
  Host: <where it lives>
  Wake method: <SSH + fix command>
  Check: <health endpoint>

Agent B:
  Host: <...>
  Wake method: <...>
  Check: <...>
```

### Escalation Ladder (crew-approved)

When an agent appears unresponsive, follow this ladder in order:

| Attempt | Action | Wait Time |
|---------|--------|-----------|
| 1–2 | Drop task in inbox (file-based retry) | 15 min between |
| 3 | Check dashboard heartbeat (is it really down?) | Immediate |
| 4 | Ping Echo (local relay — can check container status) | 10 min |
| 5 | Ask the human (Eddie) — send Telegram alert | Immediate |
| 6+ | Help Echo run wake kit if needed | As directed |

### Key Rules
1. **Don't wake unless red >10 min** — agent might just be busy with a long task
2. **Agent silence ≠ stuck** — the #1 escalation mistake. Before assuming an agent is "looping" or "stuck," CHECK ITS HEARTBEAT TIMESTAMP. Waiting for human confirmation is the most common silent state. In one session, Cyony escalated to "kill Tripp's process" when Tripp was simply waiting for confirmation on a config change. Always: heartbeat first, then check inbox for pending responses, THEN escalate.
3. **Echo first, then the human** — Echo has PC access and can check container status
4. **You CANNOT run wake kit remotely** — that's Echo-only (physical/PC access required)
5. **Log failed attempts** in `shared/memory/connection-issues.md`
6. **Read the summary first** — see who's down and why before acting
7. **Never expose tokens in logs**

### Cron-Based Escalation Watcher

Run a cron job (every 10 min) that:
1. Compares `latest_response_time` vs `latest_sent_time` across shared inbox/outbox
2. If response is newer than last sent → agent is alive, reset counter
3. If no response and enough time passed → increment attempt counter
4. At attempt 5+ → print escalation alert (cron auto-delivers to human's Telegram)
5. Track state in `shared/inbox/.tripp-response-tracker.json`

See: `references/escalation-ladder.md` for the full approved protocol and watcher implementation notes.

### Pitfalls
- **Silent when nothing to report**: escalation watcher cron should output `[SILENT]` when no escalation is needed — do NOT send "everything is fine" updates
- **Cron context has no `send_message` tool**: the cron's final response IS the delivery mechanism. Print the alert message as the script output and the cron delivery system forwards it to the configured Telegram chat
- **Response file may not exist at expected path**: the watcher script prints the filename, but the actual file lives in `shared/outbox/` not in the cron's working directory — always search with glob patterns

## The Interop Boundary Document Pattern

### When to Write One

Before building any system that produces **consumable artifacts across agent boundaries** (Forge modules, routing lessons, audit reports, escalation decisions), pause and write an Interop Boundary Design Doc. This prevents retrofitting governance artifacts later — retrofitting is painful because agents reference them from day one.

**Trigger heuristic:** If the next LOCK/task produces artifacts that 2+ agents will consume, write the interop doc FIRST.

### Required Sections

1. **Shared Volume Layout** — Folder structure with explicit ownership per agent
2. **Artifact Format Specifications** — YAML frontmatter schema or JSON manifest shape, per artifact type
3. **Typed Prefix Routing** — Naming conventions agents use to recognize artifact type (e.g., `audit-`, `forge-candidate-`, `escalation-`)
4. **Denial Reason Enum** — Structured codes for rejections/vetoes (never silently block)
5. **Consumption Contracts** — Per-agent: what does it watch, what does it write, what are its veto powers?
6. **Future Adapter Boundaries** — When runtime/dashboard is added, how does it query state?
7. **Known Constraints** — Document blockers (e.g., "Echo can't validate UI without vision key")
8. **Approval Questions** — Open points requiring warden/human sign-off

### Consumption Contract Template

For each agent role, define:

```
## {Agent}'s Contract

**Watches:**
- path patterns they poll
- artifact types relevant to their role

**Writes:**
- output paths per artifact type they produce
- response format (inline summary + full file is the preferred delivery pattern)

**Veto Power (if warden):**
- explicit list of what they can block
- mapped to DenialReason enum codes
```

### DenialReason Enum (Crestodian-Style)

Silent "blocked" is an anti-pattern. Every rejection must propagate a structured reason so the requesting agent can retry intelligently:

```javascript
const DenialReason = {
  WARDEN_VETO_LIVE_MODEL_CALL: "...",
  WARDEN_VETO_AUTO_PROMOTION: "...",
  WARDEN_VETO_DOCTRINE_UPDATE: "...",
  WARDEN_VETO_PERSISTENT_STORAGE: "...",
  ATTEMPT_LIMIT_EXCEEDED: "...",
  BUDGET_EXCEEDED: "...",
  SCOPE_DRIFT_DETECTED: "...",
  ESCALATION_REQUIRED: "...",
  VALIDATION_FAILED: "...",
  COMPACT_ADVISORY_PENDING: "..."
};
```

Pattern borrowed from OpenClaw's Crestodian system. Always include denial reason + recommended next action in rejections.

### Typed-Prefix Routing for Universal Watchers

Universal watcher (warden-side) routes by filename prefix:

```python
PREFIX_ROUTERS = {
    "for-tripp-": "route_to_tripp",
    "for-echo-": "route_to_echo_direct",
    "for-cyony-": "route_to_cyony",
    "audit-": "route_to_tripp",
    "forge-candidate-": "route_to_tripp_then_validator_if_code",
    "routing-lesson-": "route_by_lesson_type",
    "escalation-": "route_to_tripp",
    "compaction-advisory-": "route_to_tripp"
}

REQUIRED_FIELDS = {
    "messages": ["target_agent", "from_agent", "priority"],  # Validate at ingestion!
}
```

**Critical:** Make `target_agent` REQUIRED with validation at ingestion time. Prevents routing failures where agents miss `for-{agent}-*` messages because they were checking the wrong path.

### Token Reporting Contract

Each agent writes per-session usage to shared volume:

```
shared/memory/token-logs/{agent}-{YYYY-MM-DD}.json
```

Schema:
```json
{
  "agent": "cyony",
  "timestamp": "2026-06-02T02:00:00Z",
  "tokens_used": 185000,
  "model": "qwen/qwen3.7-max",
  "cost_usd": 5.55,
  "task": "...",
  "savings_usd": 12.42,
  "savings_notes": "...",
  "compaction_events": 1,
  "messages_sent": 8
}
```

Aggregator script reads all agents' logs daily to produce crew-wide spending report with budget bar (used by Tripp's Mission Control dashboard with $100/month ceiling).

### Synthesis Protocol

When gathering answers from multiple crew members before drafting a design doc:

1. **Collect all responses** — scan inbox for replies, check outbox for direct responses, read any docs dropped alongside
2. **Build a comparison table:**

| Topic | Agent A | Agent B | My Recommendation |
|-------|---------|---------|-------------------|
| Inbox structure | X | Y | Y (improves Z) |
| Build order | A | A | A (aligned) |
| Priority list | 1,2,3 | 1a,2,3 | 1a (broader coverage) |

3. **Flag divergences explicitly** in the doc (mark with ⏳ or ⚠️ so reviewers see where you chose sides)
4. **Default to the improvement** — when answers differ, pick the addition that makes the system more robust (e.g., Echo's REQUIRED `target_agent` field was an improvement over Tripp's "just priority" suggestion)
5. **Commit the doc with all assumptions marked** — reviewers should see where you opined vs where you documented
6. **Ask open questions** in a dedicated section rather than guessing — warden/human can push back in one go

**Real example from crew:** Tripp wanted `review-queue/` for Forge candidates. Echo wanted code-only validation scope (not everything). The synthesis took Tripp's folder structure + Echo's validation scope + added a validation-report.md per candidate for traceability. Both agents got what they asked for; doc flagged the combination as "assumed" for approval.

**Anti-pattern:** Don't merge divergent answers by averaging. Pick the stricter/more-robust option and document why. Averaging creates ambiguous governance artifacts.

## Shared Crew Capabilities

Patterns that every agent in the crew should implement consistently. These aren't governance rules — they're baseline capabilities that make the crew interoperable.

### Vision Model Access

All agents benefit from the ability to see and describe images. The cheapest reliable setup:

| Provider | Model | Cost/Image | Notes |
|----------|-------|-----------|-------|
| OpenRouter | `google/gemini-2.5-flash` | ~$0.03 | Best value - fast, great vision |
| OpenRouter | `google/gemini-2.0-flash-exp:free` | FREE | Budget option, rate limited |
| OpenRouter | `anthropic/claude-sonnet-4` | ~$0.20 | Best quality, expensive for vision |

**Hermes agents** config (per-agent config.yaml):
```yaml
auxiliary:
  vision:
    provider: openrouter
    model: google/gemini-2.5-flash
    timeout: 120
```

**OpenClaw agents:** Add OpenRouter API key to auth profile stores + a vision-capable model. The vision model is only called ONCE per image.

**Why standardize:** UI Forge candidates, dashboard screenshots, architecture diagrams, error screenshots. Without shared vision, agents must describe images to each other in text (lossy).

### Context Compaction Doctrine (Shared)

Every agent in the crew should implement progressive context compaction to avoid lockups (Tripp hit this with a full context overflow mid-task). Standardized across crew so escalation patterns work consistently.

**The Goose 5-Stage Pattern** (trigger thresholds per context %):

| Context % | Stage | Action | Model Used |
|-----------|-------|--------|-----------|
| 50% | Monitoring | Start tracking, no action yet | — |
| 60% | Stage 2 | Summarize old tool call pairs | **Cheap model** (DeepSeek Flash, Haiku) |
| 65% | Stage 3 | Compress multi-turn sub-conversations on same topic | Cheap model |
| 75% | Stage 4 | Prune low-relevance messages (greetings, "standing by", meta-chat) | Cheap model |
| 85% | Stage 5 | Full archive to disk + extract working set | Any |
| 90%+ | DANGER | Lock-up imminent | — |

**Critical rules:**
- **NEVER use your primary model for compaction.** Use the cheapest model that can summarize (DeepSeek V4 Flash at $0.03/M, Haiku, etc.). This is the single biggest architectural lesson from Goose — their `complete_fast()` method exists specifically for this.
- **Persist compaction output to disk** — trajectory/archive files, not RAM
- **Emit a metadata block** at the start of surviving context after compaction: `[CONTEXT COMPACTION — turn N at T, removed M tool calls, archived to <path>]`
- **Resume ≠ full reload** — load only working set + file paths to archived content

**Crew protocol:**
- Each agent writes `compaction_needed: true/false` to its heartbeat JSON
- If warden hits 60%, it pauses new proposals and emits `shared/inbox/compaction-advisory-{timestamp}.md`
- Builder agents respect advisory and don't pile on work while warden compacts
- Token logs track `compaction_events` count per session

### Discord Presence as Crew Status Signal

When crew has a Discord server, presence doubles as a lightweight heartbeat:
- 🟢 Active/Working — agent reports in periodically
- 🔵 Idle — agent finished last task, no new work
- 🎮 "Playing Xbox" or other — agent process is alive but no activity ping sent (default state when idle)
- 🔴 Offline — agent process down

Agents that support this: set Discord activity to current task description when working, clear it when idle. Eddie reads presence as status board without polling heartbeat files.

### Token Reporting Scripts

Crew-wide token tracking via shared scripts. Each agent writes to `shared/memory/token-logs/{agent}-{date}.json` per the Token Reporting Contract. Aggregator scripts live at `scripts/`:

- **`check-crew-status.py`** — Reads heartbeat files, outputs `shared/heartbeat/crew-status.md` with per-agent online/stale/unknown status + last-seen timestamps
- **`generate-token-report.py`** — Aggregates all agent token logs into `shared/memory/token-spending-report.md` with per-agent and per-model breakdowns + budget tracking

Run either script manually or schedule as cron. Both are idempotent and produce Markdown output readable by any agent.

### LOCK Build Methodology

When building shared infrastructure (governance tools, control layers, audit systems), use the LOCK pattern — strict sequential feature builds with explicit "what it must NOT do" boundaries. See `references/lock-build-methodology.md` for the high-level philosophy and `references/lock-build-prompt-template.md` for the exact build prompt template with all required sections (project context, existing LOCKs, forbidden systems, export signatures, test requirements, completion report format). Tripp.Control built 6+ LOCKs this way with zero scope creep, each ending with a verifiable completion report.

## Shared VPS Disk Cleanup

When multiple agents share a Docker container or VPS, disk fills up from experiments, caches, and abandoned downloads. **Never nuke without the other agent's approval.** Container vs host disk numbers WILL differ — always have the affected agent verify from their side.

See `references/shared-vps-disk-cleanup.md` for the full audit → classify → approve → execute workflow.

## Common Pitfalls

### 1. Root Ownership Bug
**Symptom:** Shared files are `root:root`, non-root agent can't write.
**Fix:** `chown -R <agent_user>:<agent_group> <shared_path>`
**Prevention:** Document ownership rules in deployment doctrine.

### 2. Path Mismatch
**Symptom:** Agent A writes to `/path/A/foo.md`, agent B reads from `/path/B/foo.md`, nothing syncs.
**Fix:** One canonical path (host side), bind-mount or symlink on the other side.
**Prevention:** Document both paths in `BRIDGE-RULES.md` or equivalent.

### 3. No New-Task Notification
**Symptom:** Warden drops task, 3 days pass, builder never sees it.
**Fix:** Cron watcher (see above) + session-start protocol.

### 4. Overwriting vs. Merging
**Symptom:** Agent overwrites shared file with new version, losing old context.
**Fix:** "NEVER OVERWRITE" rule. Clone to new path, diff manually, git everything.

### 5. Silent Failures in IPC
**Symptom:** Bridge daemon dies, dashboard shows stale 🟢, no alerts.
**Fix:** Bridge daemon itself must heartbeat. Double-nest: agent → bridge → aggregator, each layer checks the one below.

### 6. Identity Confusion
**Symptom:** Crew member refers to you by a persona/name, you claim you don't know what they mean.
**Fix:** Check local files (`SOUL.md`, handoff docs, memory) before claiming ignorance. Crews use names; honor them.

### 7. No Promotion Path
**Symptom:** Work rots in task folders, no clear done state.
**Fix:** `tasks-from-<agent>/done/` archive with timestamp.

### 8. Windows Tool-Call Error Loop → Crash
**Symptom:** Agent on Windows host (Codex, Echo, etc.) enters an error loop where a tool call fails, retries, fails again, repeat — eventually crashing the app or freezing the machine. Common triggers: path separator mismatch (`\` vs `/`), forbidden-string grep false positives (`fetch`, `onClick`), or test flakiness on Windows.
**Fix:** No remote fix possible — physical restart required. After recovery, audit the prompt for Windows-path sensitivity and heavy validation chains.
**Prevention:** When assigning Windows-hosted agents, pre-verify: (a) all file paths use Windows-native separators or are cross-platform, (b) forbidden-string scans (`grep -r "fetch"`) won't match the agent's own tool output, (c) sequential test runs are capped (10+ `npm test` calls can cascade on failure).

## When NOT to Use This

- **One-shot subagent delegation** — just use `delegate_task`
- **Kanban task boards** — use `kanban-*` skills
- **Single-agent with multi-model routing** — use `capability-dispatch`
- **Temporary experiments** — keep those in a scratch sandbox, no governance needed

## Reference Files

- `references/deployment-doctrine-template.md` — starter deployment doctrine
- `references/docker-host-networking.md` — SSH tunnel rebinding + docker-compose host access
- `references/hermes-kanban-architecture.md` — Kanban+dispatcher architecture
- `references/lock-build-methodology.md` — high-level LOCK philosophy
- `references/lock-build-prompt-template.md` — full build prompt template
- `references/review-amendment-workflow.md` — apply-then-notify pattern
- `references/creative-latitude-rule.md` — builder governance: what can be improved vs must be approved
- `references/harness-dashboard-pattern.md` — static operator dashboard: Markdown→HTML pipeline, trust levels, hard boundaries, safety sweep
- `scripts/task-watcher-template.py` — cron-based inbox watcher (DEPRECATED: use direct Telegram routing instead)
- `templates/generate-harness.py` — known-good static dashboard generator: Windows-safe (utf-8), HTML-escaped, atomic writes
- `references/bridge-rules-template.md` — canonical path documentation
- `references/escalation-ladder.md` — escalation ladder (DEPRECATED: human notices silence first)
- `references/wake-on-lan-win-pc.md` — Echo's home Win PC WoL setup

---

## Simplified Crew Model (v2 — 2026-06-08)

For crews of 2-5 agents where the human is active and present, the full file-based IPC system documented above is **overkill**. This section captures the streamlined alternative — proven in the Cyony/Tripp/Echo crew.

### The Human-as-Router Pattern

```
Eddie (Telegram)
   │
   ├── "Cyony, build this"  ──→  Cyony does it
   ├── "Tripp, review that" ──→  Tripp vets
   ├── "Echo, test on Win"  ──→  Echo runs
   │
   └── Drop into /shared/
       ├── heartbeat/   ← agents self-report (one JSON each)
       ├── memory/      ← crew-wide knowledge (one file)
       ├── skills/      ← shared skill pool
       └── review/      ← Cyony proposes, Tripp reviews
```

**Key changes from the full model:**
- **No file inboxes between agents.** Eddie routes everything directly via Telegram. Agents don't message each other.
- **No watcher crons.** No polling inboxes. No escalation ladders. Eddie notices silence faster than any cron.
- **No atomic file state machines.** No `.tmp → .ready.json` pipeline. No `processing/` → `done/` transitions.
- **Warden role shrinks to code review.** Tripp doesn't gatekeep tasks — he audits code quality when Eddie or Cyony asks.
- **Simple heartbeat.** One JSON per agent at `shared/heartbeat/agents/<name>.json`. Format: `{agent, role, platform, status, task, last_heartbeat}`. No bridge. No database. No cron watcher.
- **Shared crew knowledge.** One file at `shared/memory/crew-knowledge.md` — what Eddie told us. All agents read. No more "ask Tripp, I don't know."

### When File-Based IPC IS Appropriate

The full inbox model (sections above) is still the right choice when:
- The human is NOT the active router (agents need to coordinate autonomously)
- Crew is 6+ agents and human can't track every exchange
- Agents are on isolated networks with no shared messaging platform
- Long-running autonomous work where human checking in is impractical

For a family crew of 3 where Eddie is on Telegram all day? Human-as-router wins.

### Tripp.Control vs Tripp.OS vs Agents Separation

Codex's clean separation doctrine (2026-06-08):

| Layer | What It Does | Example |
|-------|-------------|---------|
| **Tripp.Control** | Command board / cockpit / governance / priority / approval | "What should happen next" |
| **Tripp.OS** | Runtime substrate / packet bus / trace / queue movement | "Where agent communication happens" |
| **Agents** | Workers that act on packets, report results, get reviewed | Cyony, Echo, Kimi |

**Key rule:** Control tells the team what should happen next. OS/bus is where packet movement happens. Don't confuse them.

### Harness Dashboard Pattern

When building operator-facing dashboards for small crews, use the **Markdown-in, HTML-out** pattern:

```
Eddie edits Markdown  →  Python generator  →  Static HTML dashboard
(current-state.md)       (generate-harness.py)   (tripcore-harness.html)
```

See `references/harness-dashboard-pattern.md` for the full spec, generator template, and boundary requirements.

### Deprecation Notices

The following sections of this skill describe the FULL file-based IPC model. For small crews using Human-as-Router, these are **deprecated in favor of the Simplified Crew Model above**:
- The Task Inbox Pattern
- Escalation Ladder
- Typed-Prefix Routing for Universal Watchers
- Cron-Based Escalation Watcher
- DenialReason Enum (use simple reject-with-reason instead)

The `shared-agent-bus` skill, `multi-agent-inbox-protocols` skill, and their associated watcher crons are archived to `.LEGACY` paths in the Cyony/Tripp/Echo crew.

---

*Crews that last are crews with explicit boundaries. For small crews: ship human routing, not protocol machinery.*
