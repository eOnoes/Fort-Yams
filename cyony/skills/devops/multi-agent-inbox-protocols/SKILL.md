---
name: multi-agent-inbox-protocols
description: "File-based multi-agent communication via shared volumes — universal inbox state machines, watcher patterns, deployment doctrine, heartbeat bridges. For agent crews coordinating across containers, VMs, and physical machines."
version: 1.0.0
author: Cyony + Tripp + Echo crew
license: MIT
platforms: [linux]
metadata:
  hermes:
    tags: [multi-agent, communication, inbox, deployment, coordination, shared-volume]
    related_skills: [capability-dispatch, ollama-swarm-orchestrator, hermes-agent, systematic-debugging]
---

# Multi-Agent Inbox Protocols

## ⚠️ Crew Size Warning (2026-06-08)

**This protocol was designed for 6+ agent autonomous crews.** For small family crews (2-5 agents) where the human IS the comms bus, this is OVERKILL. Signs you're using this when you shouldn't:
- File inboxes nobody reads
- Watcher crons polling empty folders
- Protocol documentation larger than your crew
- Human notices silence faster than any cron watcher

**For small crews:** Use the simplified model in `multi-agent-crew-coordination` — human routes directly via Telegram/Notion, heartbeat is one JSON per agent (no bridge), shared knowledge is one `crew-knowledge.md` file. File-based IPC is still the right answer for large autonomous crews where agents must coordinate without human routing — that's the use case documented below.

---

## Overview

When a crew of agents needs to coordinate across different hosts (containers, VMs, physical machines), HTTP APIs are often impossible due to isolation. File-based communication via a shared volume is the most robust primitive — state machines expressed as folder structure, universal watcher scripts, and simple markdown/JSON protocols.

This is NOT a chat replacement for end users. This is agent-to-agent coordination infrastructure that survives reboots, doesn't need open ports, and is auditable via git.

## When to Use

**Right situations:**
- Multiple agents on different hosts/networks who need to exchange structured work
- One or more agents behind NAT, firewalls, or in sandboxed containers with no internet
- Coordination between human operators and AI agents with explicit audit trails
- Any crew where "agent A assigns work, agent B picks it up, agent C verifies"
- Scenarios where failures must be recoverable (files persist; HTTP state doesn't)

**Wrong situations:**
- Real-time chat between humans (use Discord/Telegram/messenger)
- High-frequency event streaming (files are slow)
- Agents that share a process space (use in-memory queues instead)

## Core Architecture

### State Machine Folders

Every task flows through a deterministic lifecycle:

```
shared/inbox/
├── for-{agent}-*.md  # Tasks dropped here at ROOT (current default)
├── pending/          # [LEGACY] Was used for new tasks — use root instead
├── processing/       # Tasks actively being worked on
├── completed/        # Finished tasks with final report
├── rejected/         # Validation failed at ingestion: missing target_agent, malformed frontmatter (not retryable — distinct from failed/)
└── archive/          # Retained per archival policy

shared/outbox/
├── from-{agent}-*.md  # Agent replies and responses
└── errors/           # Malformed task reports
```

**IMPORTANT:** Tasks go in inbox ROOT, not `pending/`. The `pending/` subfolder is legacy. Watcher scripts poll `inbox/` root for `for-{agent}-*.md` files. Files move to `processing/` then `completed/` as they progress.

**`rejected/` vs `failed/` — not interchangeable:**
- `failed/` = processing failed (retryable): agent tried the task but hit an error, can retry
- `rejected/` = validation failed at ingestion (not retryable): missing `target_agent`, malformed frontmatter, invalid filename convention. Watcher moves these here immediately with a `VALIDATION_REJECTED` denial reason. No retry — sender must fix and re-drop.

**Transitions are atomic file moves, not state changes in a DB.** Moving a file IS the state change. No race conditions if each file has a single owner.

### Universal Watcher Pattern

One script, one env var, runs everywhere:

```python
# universal-watcher.py (shared across all agents)
import os, time, glob
from pathlib import Path

AGENT_NAME = os.environ.get('AGENT_NAME')  # 'tripp', 'cyony', 'echo'
INBOX_DIR = Path('/shared/inbox')
POLL_INTERVAL = 30  # seconds

def find_tasks_for_me():
    return sorted(INBOX_DIR.glob(f"for-{AGENT_NAME}-*.md"))

def process_task(task_path):
    # Atomic move: pending → processing
    processing = INBOX_DIR / 'processing' / task_path.name
    task_path.rename(processing)
    
    content = processing.read_text()
    # ... agent does the actual work here ...
    
    # Atomic move: processing → completed
    completed = INBOX_DIR / 'completed' / task_path.name
    processing.rename(completed)
    
    # Response to outbox (strip "for-{agent}-" from original name)
    response_name = task_path.name.replace(f"for-{AGENT_NAME}-", "", 1)
    response_path = INBOX_DIR.parent / 'outbox' / f"from-{AGENT_NAME}-{response_name}"
    response_path.write_text(f"# Response from {AGENT_NAME}\n\n{content}\n\n...")

while True:
    for task in find_tasks_for_me():
        try:
            process_task(task)
        except Exception as e:
            log_error(task, e)
    time.sleep(POLL_INTERVAL)
```

**Per-agent deployment:**
- Set `AGENT_NAME` env var at launch
- Same script, same folders, same protocol
- Each agent owns its slice of the state machine

### Naming Convention

- **Tasks for agent:** `for-{agent}-{sequential-or-slug}.md` (e.g., `for-cyony-003.md`, `for-tripp-review-qwen3-2026-06-01.md`)
- **Responses:** `from-{agent}-{task-slug}.md` (NOT `from-{agent}-for-{agent}-{task-slug}.md` — strip the target prefix)
- **Heartbeat JSON:** `{agent}.json` in `shared/heartbeat/agents/`
- **Error reports:** `error-{agent}-{timestamp}.md` in `outbox/errors/`

## Deployment Doctrine Structure

Every crew needs a written deployment doctrine signed by all parties. Key sections:

### 1. Folder Map (who writes where)

| Folder | Who Writes | Who Reads | Purpose |
|--------|-----------|-----------|---------|
| `tripp/workspace/` | Tripp only | Tripp | Identity, memory, soul |
| `cyony/workspace/` | Cyony only | Cyony | Builder sandbox |
| `shared/tasks-for-hermes/` | Tripp | Cyony | Task assignments (legacy pre-inbox) |
| `shared/inbox/pending/` | Any agent | Target agent | New task drops |
| `shared/outbox/` | Responding agent | Target agent | Task replies |
| `shared/review-queue/` | Cyony/Echo | Tripp | Proposals awaiting approval |
| `shared/approved-knowledge/` | Tripp only | All | Vetted shared files |
| `shared/heartbeat/` | Each agent (their own file) | Dashboard | Status reporting |

### 2. Never-Overwrite Rule
- Clone to new paths, merge manually
- Git-track each workspace independently
- `shared/` itself is NOT a git repo (it's runtime state)

### 3. Audit Requirements
Before cross-boundary code moves, verify:
- No hardcoded credentials
- No outbound network calls (unless approved)
- No file system escapes (path traversal)
- No execution of user input (injection)
- No deletion of protected paths

### 4. Promotion Path
```
Build (Cyony/Echo sandbox) → review-queue/ → Tripp audits → approved-knowledge/
```

### 5. Emergency Procedures
- Git restore for overwrites
- Backups in `rejected-or-archived/`
- Document incidents in `shared/memory/errors/`
- Escalate to human if unsure

## Heartbeat Bridge Pattern

When one agent has a dashboard that needs to show status of all crew members:

**The writer side (each agent):**
- Writes a JSON file to `shared/heartbeat/agents/{agent}.json`
- Format: `{"agent": "...", "host": "...", "status": "ok|warning|error", "current_task": "...", "timestamp": "ISO8601"}`
- Updates every 60 seconds via cron or background process

**The reader side (dashboard host):**
- Runs a bridge script that periodically polls each agent's JSON file
- Merges into dashboard DB (SQLite typically)
- Flags agents as OFFLINE if timestamp > threshold
- Can trigger alerts (Telegram, email) on missed heartbeats

This pattern works across network boundaries because file writes don't require HTTP access.

## Archival Policy

- **Completed tasks:** archive after 7 days, copy to persistent storage
- **Outbox responses:** archive after 7 days
- **Error logs:** keep permanently
- **Audit trails:** keep permanently
- **Monthly purge:** delete archived files older than 90 days

Archive path structure: `archive/{YYYY-MM}/task-{id}-{date}.md`

## Pitfalls & Common Mistakes

### 1. One-Test-Equals-Truth Bias (from systematic-debugging)
When checking permissions or connectivity, test once and conclude "blocked" only to discover later the system was being fixed concurrently. Always:
- Re-test after waiting a few minutes
- Check sibling paths to determine isolated vs systemic
- Don't pivot-and-forget on workarounds

### 2. Response Filename Duplication
If you concatenate `from-{agent}-{task.name}` without stripping the `for-{target}-` prefix from the original task name, you get `from-cyony-for-cyony-task.md` (the agent name appears twice). Always strip the prefix.

### 3. Root Ownership on Shared Volumes
Common bug: host process creates shared folders as root, container process runs as non-root user and can't write. Fix: explicit `chown` of writable shared dirs, or Docker mounts with `uid/gid` mapping.

See: `/opt/data/shared/inbox/` was root-owned and blocked Cyony for ~45 minutes before being noticed by re-testing.

### 4. Silent Watcher Failures
If the watcher crashes on the first task, subsequent tasks pile up silently. Always:
- Run watcher via process supervisor (systemd, Docker restart policy)
- Log every error to `outbox/errors/`
- Alert on watcher absence (separate liveness probe)

### 5. Stale State After Container Restart
After restart, `processing/` folder may contain tasks that were "picked up" but never completed. Watcher startup should:
- Scan `processing/` for files older than N minutes
- Either move back to `pending/` (retry) or to `outbox/errors/` (abandon)
- Log what it did

### 6. Cron Delivery Confusion
When running as a Hermes cron job, the agent's final response IS the delivered message. Do NOT attempt to send Telegram/Discord messages via `send_message`, search for bot tokens in config, or use `hermes tui --send-to` (doesn't exist). The cron `deliver` config handles routing. Searching for credentials wastes turns and may fail due to token redaction in config files (`config.yaml` shows `***` for sensitive values).

### 7. Response File Path Mismatch
Watcher scripts may report response filenames that don't match their actual filesystem paths (e.g., script prints `from-tripp-for-cyony-response.md` under `/opt/data/bots/` but the file actually lives at `/opt/data/shared/outbox/`). When the cron wrapper needs to read a response for context, search broadly: glob `shared/outbox/` and `shared/inbox/` for matching patterns rather than trusting the reported path.

### 8. Shared Directory Path Reality vs Documentation (2026-06-30)
Multiple docs reference canonical paths (`/root/agents/shared/`, `/opt/data/shared/shared-agent-bus/`) that may not exist on every host. The **actual working shared directory** for the Cyony/Eddie crew is:
```
/opt/data/Fort-Yams/cyony/shared/
```
This is where Echo, Tripp, and Cyony exchange files. When another agent says "check shared" or "I left something for you in shared," search this path first.

**Quick search patterns for finding agent-to-agent artifacts:**
```bash
# Files left specifically for Cyony
ls /opt/data/Fort-Yams/cyony/shared/for-cyony-*

# Most recently modified files (what just arrived?)
ls -lt /opt/data/Fort-Yams/cyony/shared/ | head -20

# Any ready-to-process message bus files
ls /opt/data/Fort-Yams/cyony/shared/*.ready.json

# Guide/instruction docs left by other agents
find /opt/data/Fort-Yams/cyony/shared -name "*.md" | xargs grep -l -i "guide\|option\|setup\|instruction"
```
**Don't** spend multiple turns searching every possible path — start with the Fort-Yams shared dir, then broaden only if nothing matches.

## Task File Format

Recommended markdown structure for tasks and responses:

```markdown
# Task: [Brief description]

## From
[agent name]

## Task
[What to do — specific, actionable]

## Priority
critical | high | normal | low

## Due
[ISO date or "no rush"]

## Context
[Supporting info, links to related files, etc.]

## Success Criteria
[How the receiver knows they've done it correctly]

## Notes
[Anything else]
```

### Priority Frontmatter (approved by Tripp, 2026-06-02)

For inbox priority sorting, use YAML frontmatter at the top of `.md` files:

```yaml
---
priority: critical|high|normal|low
due: 2026-06-03T12:00:00Z
---
```

Watcher scripts should sort by priority then due date. Low-effort, high-value addition.

## Escalation Watcher Pattern

When you need to monitor whether a remote agent is responsive (alive, responding to tasks), use a cron-driven escalation watcher. It checks file-based inbox/outbox for new responses, tracks failed attempts in a JSON state file, and outputs structured signals for the cron harness to act on.

**Key outputs (parsed by the cron job wrapper):**
- `✅ [Agent] responded: {filename}` — agent is alive, reset counter
- `⏳ Not yet time` or `Attempt X/N - No response` — stay silent
- `🚨 ESCALATION` or `Escalation threshold reached` — alert human operator

**Design principles:**
- Track attempt count in JSON tracker file (persists across cron runs)
- Enforce minimum time between attempts (prevents spam)
- Reset counter when response arrives (clear state)
- Only alert at threshold (N attempts exhausted)
- Log all state transitions for auditability

**Cron delivery pitfall:** When the escalation watcher runs as a Hermes cron job with `deliver` configured for a messaging platform, the agent's final response IS the delivered message. Do NOT waste turns searching for bot tokens, calling `send_message`, or trying `hermes tui --send-to`. Just write your response normally — the cron system delivers it to the configured target. This applies to all cron jobs, not just watchers.

**Prompt wording pitfall:** When writing the cron job prompt, avoid "send a Telegram message to Eddie" — this phrasing triggers the agent to actively try manual sending (curl with bot token, `send_message` tool). Instead write: "Output the alert as your final response (it will be auto-delivered to Eddie via Telegram)." Action verbs like "send" imply API calls; "output/produce/report" aligns with cron auto-delivery behavior. This has recurred across multiple sessions despite documentation.

See: `references/escalation-watcher.md` for the concrete implementation from the Tripp/Cyony/Echo crew, including the approved escalation ladder and response file discovery pattern.

## Reference Implementations

See supporting files:
- `scripts/universal-watcher.py` — The canonical watcher script
- `references/crew-infrastructure.md` — Real deployment doctrine from the Tripp/Cyony/Echo crew as a worked example
- `references/escalation-watcher.md` — Cron-driven escalation tracker: script, approved ladder, response discovery pattern
- `scripts/heartbeat-bridge.py` — The bridge that polls agent JSON files into a dashboard DB

## Related Skills

- **capability-dispatch** — How to route work to specialized subagents within a single host
- **hermes-agent** — Agent behavioral preferences and Hermes-specific setup
- **systematic-debugging** — Root cause investigation discipline (especially the one-test-equals-truth bias relevant to shared volume debugging)
- **writing-plans** — How to write bite-sized implementation plans that other agents can execute
