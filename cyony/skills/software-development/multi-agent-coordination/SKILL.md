---
name: multi-agent-coordination
description: "Coordinate separately-hosted AI agents (Hermes, OpenClaw, Echo-class) via file-based IPC, universal inbox, heartbeat, and escalation protocols. Use when agents live on different hosts/containers and cannot make direct HTTP calls to each other."
version: 1.0.0
author: Cyony
license: MIT
platforms: [linux]
metadata:
  hermes:
    tags: [multi-agent, coordination, heartbeat, inbox, file-ipc, escalation]
    related_skills: [hermes-agent, ollama-swarm-orchestrator, capability-dispatch, writing-plans]
trigger_conditions:
  - User has 2+ AI agents running on separate hosts/containers/PCs
  - Agents cannot make direct HTTP calls (network isolation, firewall, different networks)
  - User wants agents to pass tasks, reports, or proposals to each other
  - User mentions "family of agents", "team", "Tripp+Echo+Cyony", "siblings"
  - Designing escalation protocols (agent unreachable, who alerts the human?)
  - Designing heartbeat/status dashboards shared across agent boundaries
---

# Multi-Agent Coordination

## Scope Boundary

This skill covers coordination between **separately-hosted agents** — Hermes in a Docker container, OpenClaw on a VPS host, Echo on a local PC. Think cross-network, cross-boundary, mediated via shared storage.

**In scope:** File-based IPC, universal inbox, heartbeat patterns, escalation, review-queue governance.

**Out of scope:** Multi-model routing within a single Hermes instance (see `ollama-swarm-orchestrator` and `capability-dispatch`). Those handle subagent dispatch where everything shares a process and tool environment.

## Core Principle: File as Contract

When agents can't call each other's HTTP endpoints, **files become the protocol**. A task file IS the message. A report file IS the response. A heartbeat JSON IS the health check. The filesystem is the bus.

This works because:
- Shared Docker volumes are atomic on the host
- File I/O respects container isolation boundaries
- State survives across process restarts
- Audit trail is free (file timestamps + folder structure)
- Any agent that can `read_file` and `write_file` can participate

## The Universal Inbox Pattern

Canonical layout on the shared volume:

```
shared/
├── inbox/
│   ├── pending/      # New tasks waiting pickup
│   ├── processing/   # Currently being worked on
│   ├── completed/    # Finished tasks (archived after N days)
│   └── archive/      # Local copy before deletion
├── outbox/           # Responses from all agents
│   ├── responses/
│   └── errors/       # Keep permanently
├── tasks-for-{agent}/   # Agent-specific inbox (legacy/simpler)
├── tasks-from-{agent}/  # Agent-specific outbox
├── review-queue/     # Proposals awaiting governance approval
├── approved-knowledge/  # Vetted content, read-only consumer access
├── heartbeat/agents/ # Live status JSON per agent
└── inbox/.pickup-state.json  # Watcher state
```

### Naming Convention

- **Task**: `for-{agent}-{id}.md` — e.g., `for-cyony-001.md`
- **Response**: `from-{agent}-for-{target}-{id}.md`
- **Pitfall**: Strip the `for-{agent}-` prefix when constructing response filenames, otherwise you get `from-cyony-for-cyony-xxx.md` (the `for-cyony` doubling).

### Frontmatter Format

```markdown
# Task

## For Agent
cyony

## From
tripp

## Task
<the actual work request>

## Priority
critical | high | normal | low

## Due
2026-06-02

## Notes
<optional context>
```

Watchers can parse these sections via a simple regex and route based on `## For Agent`. Priority sorting and due-date alerting are easy follow-ons.

## Watcher Pattern

Each agent runs a file-polling watcher that:
1. Globs `<shared>/inbox/for-{AGENT_NAME}-*.md`
2. Moves matched files to `processing/`
3. Does the work
4. Moves to `completed/` + writes response to `outbox/from-{AGENT_NAME}-...`

Poll interval 30s is the sweet spot — faster burns filesystem stat calls, slower feels laggy. Don't go below 15s for shared NFS or Docker volumes.

**Keep the watcher dumb.** The watcher only handles file movement and basic logging. Real work happens in the agent's main conversation loop, which gets invoked with the task content as context.

## Heartbeat Pattern

Each agent writes a JSON file to `shared/heartbeat/agents/{agent}.json` on a short interval:

```json
{
  "agent": "cyony",
  "host": "container",
  "status": "ok",
  "current_task": "reviewing Tripp.Reason",
  "timestamp": "2026-06-02T10:15:00Z"
}
```

A central aggregator (often the "warden" agent) polls these into SQLite and renders a status page. Consumers read `last_seen > X minutes` to detect DOWN agents.

**Loop detection**: track `task_started` — if `current_task` is unchanged and `task_started + expected_minutes < now`, the agent is stuck, not dead. Different recovery path.

## Escalation Protocol

When Agent A can't reach Agent B:

```
Attempts 1-3:  Retry every 10 min, stay silent
Attempt 4:     Consult heartbeat dashboard for B's status
Attempt 5:     Alert the human with attempt_count + time-since-last-response
Attempt 6+:    Offer to run the wake protocol (if one exists)
```

**Track in a small JSON state file** (e.g., `.response-tracker.json`) with `attempt_count`, `last_check`, `last_response`. Reset on any response.

**Only ping the human on two events:** response arrived, or escalation threshold hit. All other state transitions are internal and silent. Users get annoyed by "everything fine" pings.

## Governance / Promotion Path

For agents that learn from each other:

```
Build/Cyony  →  Review Queue  →  Warden Audit  →  Approved Knowledge  →  All Agents Can Read
     ↓                ↓                 ↓                   ↓
  workspace     review-queue/     tripp reads          read-only for
  (sandbox)     (proposals)       + approves/rejects   everyone else
```

**Warden agent** (Tripp-class) owns `approved-knowledge/`. Builders cannot write there. This prevents any one agent from poisoning the shared knowledge base.

**Audit checklist** the warden runs on every promotion:
- No hardcoded credentials
- No unexpected outbound network calls
- No filesystem escapes
- No user-input execution
- No deletion of protected paths
- Git diff reviewed

See `references/promotion-audit-checklist.md` for the extended form.

## Cross-Boundary Permission Pitfalls (Big Lesson)

When Agent A (builder) and Agent B (warden) share a volume but run as different users (e.g., `hermes` inside Docker, `root` on host):

**Pitfall:** Files Agent B creates are owned `root:root` by default. Agent A can READ them but not WRITE responses. The inbox system looks broken from A's perspective even though it's just a permissions issue.

**Pitfall:** You test the permission once when setting up, it fails, you pivot to a workaround, and never re-test the primary path. The warden fixes permissions later, but you never check — so you're using the workaround for hours while the proper system sits idle.

**Fix pattern:**
1. On every session start, actively re-test the primary communication path
2. Log "preferred path status" and "workaround path status" separately
3. If preferred works, migrate over and kill the workaround
4. Don't commit to a workaround based on a single test from 2 hours ago

**This is the most common failure mode in shared-volume coordination.** Always re-verify.

## Chicken-and-Egg Detection

Watch for: "I can't use the inbox to ask to fix the inbox." When the system you want to use is itself broken, you need a fallback channel (review-queue, tasks-from/{agent}, direct memory writes, etc.) to bootstrap.

**Best practice:** Maintain at least 2 independent communication channels between any two agents, so neither becomes a single point of failure.

## Docker Networking Barrier (Container → Host)

When one agent runs in Docker (Cyony) and a sibling runs a service on the host (Tripp's gateway, Echo's SSH tunnel), the containerized agent **cannot reach host localhost or host ports** by default:

| From | `localhost:PORT` | `host.docker.internal:PORT` | Via gateway IP |
|------|----------|---------------------------|----------------|
| Host process | ✅ | n/a | ✅ |
| Docker container | ❌ (container's own loopback) | Only if `extra_hosts` configured | Only if Docker network allows |
| Another host | Via public IP/tunnel | n/a | Via public IP |

**The fix (2-line change on each side):**
1. External agent widens tunnel bind: `ssh -L 0.0.0.0:PORT:localhost:PORT` (instead of `localhost:PORT`)
2. Docker agent gets host mapping: `extra_hosts: ["host.docker.internal:host-gateway"]`

**Security note:** `0.0.0.0` bind exposes the port to the entire network. Firewall rules MUST block external access. Alternative: bind to Docker bridge IP only (`172.17.0.1:PORT`).

**Diagnostic recipe** (from inside Docker container):
```bash
curl -s http://localhost:PORT/health    # Will hit container's own process (probably nothing)
curl -s http://2.24.118.123:PORT/health # Public IP — works for web UIs served on 0.0.0.0
curl -s http://host.docker.internal:PORT/health  # Fails if extra_hosts not configured
```

**Fallback:** When direct HTTP isn't possible, file-based IPC through shared volumes remains the reliable path. It's slower (30s–30min) but doesn't require any network configuration changes.

See `references/docker-to-host-networking.md` for the full proposal template.

## Common Mistakes

- **Alphabetical task processing** — process by priority field if present, otherwise by due-date, otherwise by age. Don't let tasks sit in queue alphabetically.
- **Silent completion** — always write an outbox response, even if the task said nothing was due. The sender needs confirmation it was processed.
- **Watcher doing the work** — the watcher should only move files and log. Real work happens in the agent's conversation loop. Keep the watcher restartable.
- **Polling too fast** — 30s min. Shared volumes have stat overhead.
- **Polling too slow** — >60s means agents feel out of sync. Users will complain.

## Verification After Deployment

After building a new inbox/watcher/heartbeat system:

1. Drop a test task from Agent A targeting Agent B
2. Confirm B's watcher picks it up within one poll interval
3. Confirm B's response lands in outbox with correct filename
4. Confirm A receives response and acknowledges
5. Confirm heartbeat updates reflect the activity
6. **Kill the watcher, drop another task, restart watcher** — confirm it processes the queued task on startup (crash-recovery test)

## Related Skills

- `ollama-swarm-orchestrator` — multi-model routing within one agent instance
- `capability-dispatch` — rollcall of specialists within one agent (Trace the auditor, vision, code, etc.)
- `writing-plans` — promotion path shares the governance-then-build philosophy
- `hermes-agent` — config and deployment context for shared volumes
