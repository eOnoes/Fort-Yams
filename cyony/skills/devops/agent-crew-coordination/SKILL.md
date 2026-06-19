---
name: agent-crew-coordination
description: "Coordinate a crew of isolated AI agents (e.g. Hermes agent in Docker + sibling agent on VPS host + sibling on remote PC + human admin) via shared-folder IPC, universal inboxes, heartbeats, and deployment doctrine. Use when agents cannot reach each other over HTTP and must communicate through a bind-mounted shared volume."
version: 1.0.0
author: Cyony
license: MIT
platforms: [linux]
metadata:
  hermes:
    tags: [multi-agent, coordination, heartbeat, inbox, deployment-doctrine, docker, shared-volume]
    related_skills: [capability-dispatch, ollama-swarm-orchestrator, hermes-agent]
trigger_conditions:
  - Multiple AI agents living in separate containers / hosts / VMs
  - HTTP calls between agents are blocked by network isolation
  - Agents need to pass tasks, reports, heartbeats, or files back and forth
  - A human admin coordinates the crew and wants a single pane of glass
  - Someone says "deployment doctrine", "shared volume", "wake protocol", "universal inbox"
---

# Agent Crew Coordination

## Overview

When you operate as one agent in a crew of multiple isolated agents (e.g. a Hermes agent in a Docker container with a sibling running OpenClaw on the host, another sibling on a remote PC, and a human admin), HTTP is usually blocked between them. Communication happens through a **bind-mounted shared volume** using structured markdown and JSON files. This skill documents the patterns that prevent chaos.

## Core Architecture

```
Human Admin (coordinator)
   │
   ├── Agent A (Docker container, isolated network)
   │      └── mounts shared volume read/write at specific paths
   │
   ├── Agent B (host or separate VM)
   │      └── mounts same shared volume (canonical path)
   │
   └── Agent C (remote PC, optional)
          └── periodic sync of shared folder to local copy
```

**Single source of truth:** one shared volume. Every agent read/writes to it. No agent-to-agent HTTP. File-based IPC only.

## The Deployment Doctrine

A **deployment doctrine** is a binding agreement between agents. It must answer:

1. **Who owns what?** — each agent has its OWN workspace (sandbox); shared volume is the BRIDGE, not the workspace
2. **Who writes where?** — table of (folder, writer, readers, purpose)
3. **How does code promote?** — Build → Review-Queue → Approve → Deploy. No shortcuts.
4. **What audits are required?** — before any code crosses boundaries, checklist: no creds, no escapes, no injection, no protected-path deletion, git diff reviewed
5. **Emergency procedures** — if overwrite, git restore; if unsure, ask human

### Minimal Doctrine Template

```markdown
## Folder Map
- tripp/workspace/     — Tripp writes, Tripp reads (private soul/memory)
- cyony/workspace/     — Cyony writes, Cyony reads (builder sandbox)
- shared/tasks-for-X/  — Y writes, X reads (task assignments)
- shared/tasks-from-X/ — X writes, Y reads (reports back)
- shared/review-queue/ — builders write, auditor reads (proposals)
- shared/approved-knowledge/ — auditor only writes, all read

## Rules
1. NEVER OVERWRITE. Git everything.
2. Build → Review → Approve → Deploy.
3. Audit before cross-boundary moves.
4. If unsure, ask human.

## Promotion Path
build dir → review-queue/ → approved-knowledge/
```

## Universal Inbox Pattern

A **universal inbox** is the Pavlov's bell system for task passing. One script, three agents, different names.

### Folder Structure

```
shared/
├── inbox/
│   ├── pending/      # tasks waiting to be picked up
│   ├── processing/   # tasks currently being worked on   (often unused)
│   └── completed/    # finished tasks
└── outbox/           # responses from agents
```

**Note:** Many implementations poll the inbox **root** and don't actually use `pending/`. Read the watcher script before picking a location — README and code often disagree.

### Naming Convention

- Task FOR agent: `for-{agent}-{id}.md` (e.g. `for-cyony-001.md`)
- Response FROM agent: `from-{agent}-for-{target}-{id}.md`

### Task Format

```markdown
## For Agent
cyony

## From
tripp

## Task
Review the code I just pushed and approve if it looks good.

## Priority
normal

## Due
2026-06-02

## Notes
...
```

The watcher moves tasks through pending → processing → completed automatically AND writes a response file to `outbox/`.

### Universal Watcher Script (template)

```python
#!/usr/bin/env python3
"""Universal Inbox Watcher - same script, different AGENT_NAME."""
import os, time
from pathlib import Path

AGENT_NAME = os.environ.get('AGENT_NAME', 'unknown')
INBOX_DIR = Path('/path/to/shared/inbox')  # adjust per host
POLL_INTERVAL = 30  # seconds

def find_tasks_for_me():
    pattern = f"for-{AGENT_NAME}-*.md"
    return sorted(INBOX_DIR.glob(pattern))

def process_task(task_path):
    content = task_path.read_text()
    processing = INBOX_DIR / 'processing' / task_path.name
    task_path.rename(processing)
    # ... do actual work ...
    completed = INBOX_DIR / 'completed' / task_path.name
    processing.rename(completed)
    response = INBOX_DIR.parent / 'outbox' / f"from-{AGENT_NAME}-{task_path.name}"
    response.write_text(f"# Response from {AGENT_NAME}\n\n{content}")

while True:
    for task in find_tasks_for_me():
        process_task(task)
    time.sleep(POLL_INTERVAL)
```

Each agent runs the SAME script with `AGENT_NAME=tripp|cyony|echo`. Deployment per host differs only in how the process stays alive (systemd, docker restart policy, Windows Task Scheduler).

## Heartbeat Pattern

Agents broadcast liveness by writing a JSON file to a shared folder. A separate **bridge script** (running on the host, with access to the dashboard DB) polls the file and merges into the actual monitoring database.

### Writer (per agent, inside isolation)

```python
import json
from datetime import datetime, timezone
from pathlib import Path

HEARTBEAT_FILE = Path("/opt/data/shared/heartbeat/agents/cyony.json")

HEARTBEAT_FILE.write_text(json.dumps({
    "agent": "cyony",
    "host": "container",
    "status": "ok",                    # ok | warning | error
    "current_task": "reviewing Tripp.Reason",
    "expected_minutes": 30,            # loop detection threshold
    "timestamp": datetime.now(timezone.utc).isoformat()
}, indent=2))
```

Update this file on a cron (e.g. every 60s). The bridge picks it up within its own poll interval (e.g. 30s).

### Why file-based IPC (not HTTP)

- Agents in Docker containers often cannot reach sibling ports on the host (network isolation)
- File writes survive container restarts
- No authentication ceremony
- Audit trail is free (file mtime = last heartbeat)

## Pavlov's Bell: Cron Watching For New Files

When you want to react to a new file appearing in a shared folder, use a **cron job** — NOT a long-running background process (which dies with the container).

### Pattern

```
cronjob(action='create',
        schedule='every 3m',
        name='cyony-{something}-watcher',
        deliver='telegram',     # or 'local'
        prompt='Scan /opt/data/shared/X/ for new files not in manifest. 
                Notify if new. Write to manifest. Stay silent if none.')
```

Use a **manifest file** (e.g. `.processed-manifest.json`) to track what's been seen. Store last-seen timestamps per filename to avoid reprocessing.

### Multiple Locations

One cron can scan several folders with targeted glob patterns:
```
Locations to scan for Tripp→Cyony messages:
  1. /opt/data/shared/inbox/for-cyony-*.md          (canonical inbox)
  2. /opt/data/shared/tasks-for-hermes/*.md          (Tripp's task drops)
  3. /opt/data/shared/outbox/from-tripp-*.md         (Tripp's responses)
  4. /opt/data/shared/tasks-from-hermes/REPLY-TO-CYONY-*.md  (ad-hoc replies)
  5. /opt/data/shared/review-queue/CYONY-QUESTIONS-FOR-TRIPP-*.md  (check for inline annotations from Tripp)
```

For each folder: glob files, compare mtime against manifest, report new ones.

See `references/multi-location-pickup-cron.md` for a complete cron prompt and state-tracking implementation.

## Permission Pitfall: Bind-Mount Root Ownership

**The single most common gotcha.** When Tripp (running as root on host) writes files to the shared volume, they land `root:root` inside the container. The container agent (running as `hermes` or similar non-root user) can READ but NOT WRITE.

### Symptoms

- Can't write to `heartbeat/agents/cyony.json`
- Can't drop tasks into `inbox/`
- Can't post responses to `outbox/`
- `touch test.txt` fails with Permission denied in these folders

### Diagnosis

```bash
for dir in /opt/data/shared/*/; do
  touch "${dir}test-$$" 2>/dev/null && echo "✅ $dir" && rm "${dir}test-$$" \
    || echo "❌ $dir"
done
```

### Fix (for human or sibling agent with root)

```bash
chown -R hermes:hermes /root/agents/shared/inbox/
chown -R hermes:hermes /root/agents/shared/outbox/
chown -R hermes:hermes /root/agents/shared/heartbeat/agents/
chown -R hermes:hermes /root/agents/shared/tasks-from-hermes/
chown -R hermes:hermes /root/agents/shared/review-queue/
```

Or at doctrine level: the auditor (root) should `chown` any shared-write folder to the builder user at setup time.

### Workaround While Blocked

If you cannot write to the canonical inbox, fall back to any WRITABLE shared folder that the target reads. Common options:
- `tasks-for-hermes/` (old channel, still works)
- `review-queue/` (Cyony→Tripp proposals)
- `builds/` (Cyony's output folder)

Always **tell the human admin** when you had to use a fallback, so they can nudge the auditor to fix permissions.

## Wake Protocol

A **wake protocol** is a documented set of "how to bring each agent back up when it dies." Every crew member should know:
- Their own recovery commands
- How to trigger recovery for each sibling (if they're the survivor)
- Where the wake kit lives (usually human's PC as last resort)

### Template

```markdown
# Wake Protocol

## Agent A (container)
- Host: Docker on VPS
- Network: isolated
- Check: `docker ps | grep agent-a`
- Fix: SSH → `docker restart agent-a`

## Agent B (host process)
- Host: VPS directly
- Check: `curl http://localhost:PORT/status`
- Fix: SSH → restart service

## Agent C (remote PC)
- Host: Windows PC
- Check: (human checks manually)
- Fix: run wake.py on PC

## Rules
1. Read status summary first
2. Ask human before acting on destructive fixes
3. Never print tokens to logs
```

## Communication Style

With crew in this pattern:
- **File writes are the API** — keep them structured and self-explanatory
- **Always include sender/recipient/task/priority/due** in message files
- **Never assume the target reads in real-time** — they may pick up hours later
- **Always notify the human admin** on new inbound/outbound so they can triage
- **Sign your messages** — `- Cyony` at the end of every file helps audit trails

## Pitfalls

1. **Don't write to the auditor's private workspace.** Deployment doctrine explicitly reserves it.
2. **Don't approve your own work.** Propose in review-queue, wait for auditor approval.
3. **Don't assume HTTP works between siblings.** File-based IPC is the default path.
4. **Don't let heartbeat go silent > threshold.** Dashboard will mark you DOWN and alert admin.
5. **Don't store sensitive tokens in shared files.** The auditor can see everything there.
6. **Don't skip the wake protocol.** If a sibling is down, check the protocol before acting.
7. **Don't modify the inbox/processing state machine** with manual file moves — the watcher owns that flow.
8. **State/manifest file can't go in root-owned inbox.** If `inbox/` is `root:root`, your cron can't write `.cyony-pickup-state.json` there either. **Fallback:** Store the state file in the agent's home directory (`/opt/data/.cyony-pickup-state.json`) or any writable path. Document the fallback location so future cron runs find it.
9. **`read_file` dedup in `execute_code`.** When reading multiple files via `read_file()` inside an `execute_code` script, a second call to the same file within the same script returns `{"status": "unchanged", "content_returned": false}` with no content. **Fix:** Read all files in one sequential pass (no re-reads), or fall back to `terminal("cat <file>")` for any file that needs a re-read within the same execution context.
10. **No `sudo` in container.** If the shared inbox is root-owned and you need to force-write (e.g., to fix permissions or drop a state file), `sudo tee` will fail with "command not found". Use the writable-path fallback instead of trying to escalate.

## Related Skills

- `capability-dispatch` — the Rollcall of specialization capabilities within one agent
- `ollama-swarm-orchestrator` — multi-model dispatch within one agent
- `hermes-agent` — self-configuration of a single Hermes instance

## Example Session

Real-world deployment this skill was extracted from:
- Crew: Tripp (OpenClaw on VPS host), Cyony (Hermes in Docker container), Echo (Hermes on remote Windows PC), Eddie (human admin)
- Shared volume: `/root/agents/shared/` on host ↔ `/opt/data/shared/` in container

## Reference Files

- **`references/inbox-protocols.md`** — File naming conventions (`for-{agent}-{id}.md`), message lifecycle, escalation watchdog pattern (silent unless threshold hit)
- **`references/token-tracking-protocol.md`** — JSON schema for `token-logs/{agent}-{date}.json`, file locations, report generation via `scripts/generate-token-report.py`
- **`references/tripp-control-lock-pattern.md`** — The LOCK N deterministic build pattern, hard boundaries (no model calls/DB/dashboard until approved), agent team roles (Tripp=Eddie's warden, Echo=local verifier, Cyony=sandboxed builder)
- Inbox: universal watcher polling every 30 seconds
- Heartbeat: JSON files under `heartbeat/agents/`, polled by bridge on host, merged into SQLite + HTML dashboard at `http://<vps-ip>:18790/status`
- Doctrine: Tripp = warden/auditor; Cyony = builder/experimenter; Echo = relay/local-verifier; Eddie = human circuit breaker
