# Real-World Crew Infrastructure Reference

This document captures a real deployment of multi-agent inbox protocols from a June 2026 session. Use as a worked example when setting up your own crew.

## Crew Composition

- **Eddie** — Human admin, coordinates via Telegram
- **Tripp (OpenClaw)** — Big-bro warden/auditor, runs on VPS host
- **Cyony (Hermes)** — Self-improving builder, in Docker container on VPS
- **Echo (Hermes)** — Local verifier, on Eddie's Windows PC

## Folder Map (Production Example)

```
/root/agents/
├── openclaw/
│   └── workspace/             # Tripp's soul, identity, memory — Tripp only
│       ├── AGENTS.md
│       ├── SOUL.md
│       └── memory/
│
├── cyony/
│   └── workspace/             # Cyony's sandbox (builds, skills, experiments)
│
├── shared/                    # Controlled bridge (bind-mount to Docker)
│   ├── inbox/                 # Universal inbox (pending → processing → completed)
│   │   ├── pending/
│   │   ├── processing/
│   │   └── completed/
│   ├── outbox/                # Agent-to-agent responses
│   ├── tasks-for-hermes/      # Legacy pre-inbox assignment channel
│   ├── tasks-from-hermes/     # Legacy pre-inbox reports
│   ├── review-queue/          # Cyony/Echo → Tripp approval proposals
│   ├── approved-knowledge/    # Tripp-vetted shared files
│   ├── rejected-or-archived/  # Tripped rejected proposals
│   ├── builds/                # Shared artifacts
│   ├── knowledge/             # Shared knowledge base
│   ├── souls/                 # Identity files (per-agent)
│   ├── memory/                # Shared memory + heartbeat DB
│   │   └── heartbeat/         # heartbeat_v2.py + heartbeat.db
│   └── heartbeat/
│       └── agents/            # Per-agent JSON heartbeats (cyony.json, etc.)
│
└── incoming-reviews/          # External project landing zone
    └── Tripp.Reason/          # Pushed from Echo's PC, reviewed by Tripp

/opt/data/bots/                # Cron watcher scripts (run from here, monitor shared/)
├── cyony-escalation-watcher.py  # Tracks attempts to reach Tripp, escalates to Eddie
└── (other cron scripts)
```

The shared directory is a Docker bind-mount so both `/root/agents/shared/` (host) and `/opt/data/shared/` (container) resolve to the same filesystem. Cyony runs as user `hermes` inside the container; writable shared dirs need `chown hermes:hermes`.

## Roles & Promotion Logic

```
Build (Cyony/Echo sandbox)
        ↓
Review (Tripp audits)
        ↓
Approve (approved-knowledge/)
        ↓
Deploy (Tripp merges to workspace)
```

**Write permissions:**
- Cyony: own workspace, inbox/pending → processing → completed, outbox/, heartbeat/agents/cyony.json, review-queue/, tasks-from-hermes/
- Tripp: own workspace, inbox for others, review-queue (read), approved-knowledge (write), rejected-or-archived (write)
- Echo: own workspace, inbox for others, review-queue/
- Eddie: anything (human override)

## Universal Watcher Deployment

### Per-agent env var

```bash
# Each agent sets this at launch
export AGENT_NAME=tripp    # or cyony or echo
```

### Cyony (Docker container)

```bash
docker exec hermes-agent-8eep-hermes-agent-1 bash -c \
  "export AGENT_NAME=cyony && \
   nohup python3 /opt/data/shared/inbox/universal-watcher.py \
   > /tmp/inbox-watcher.log 2>&1 &"
```

### Systemd service (for production)

```ini
[Unit]
Description=Universal Inbox Watcher
After=network.target

[Service]
Type=simple
User=root
Environment=AGENT_NAME=tripp
ExecStart=/usr/bin/python3 /root/agents/shared/inbox/universal-watcher.py
Restart=always

[Install]
WantedBy=multi-user.target
```

## Heartbeat Bridge

**Cyony writes** (every 60s via heartbeat_v2.py or cron):
```json
{
  "agent": "cyony",
  "host": "container",
  "status": "ok",
  "current_task": "what you're doing",
  "timestamp": "2026-06-01T20:15:00Z"
}
```

**Bridge on Tripp's side** (`cyony-bridge.py`, polls every 30s):
- Reads `shared/heartbeat/agents/cyony.json`
- Merges into `shared/memory/heartbeat/heartbeat.db` (SQLite)
- Merges with Tripp's + Echo's heartbeats

**Dashboard** (`heartbeat_v2.py`, port 18790):
- `POST /heartbeat` — agents report directly (if network allows)
- `GET /status` — dark-theme HTML status page
- `GET /api/agents` — JSON endpoint
- Background thread: sends Telegram alerts after 5 min of silence

## Real Bugs Hit

### Permission ownership
When host process (root) creates shared folders, container process (hermes) can't write. Fix:
```bash
chown -R hermes:hermes /root/agents/shared/inbox
chown -R hermes:hermes /root/agents/shared/outbox
# etc. for each writable shared dir
```

### Response filename duplication
Watcher script line `response_path = INBOX_DIR.parent / 'outbox' / f"from-{AGENT_NAME}-{task_path.name}"` generates `from-cyony-for-cyony-task.md`. Fix: strip `for-{AGENT_NAME}-` prefix from task.name before concatenation.

### One-Test-Equals-Truth (from systematic-debugging)
Cyony tested inbox/ permissions once, got `Permission denied`, concluded "blocked", wrote a whole message asking Tripp via review-queue to fix it. Meanwhile Tripp's messages sat in the same folder (which was fixed mid-session). Cyony never re-tested.

**Lesson:** Environmental state changes during long conversations. Always re-test after waiting a few minutes, especially for shared-state issues where teammates may be concurrently fixing the same thing.

### Silent watcher failures
First watcher deployment as background process crashed on import. Subsequent tasks piled up in `pending/` with no alert. Fix: log errors to `outbox/errors/` and add separate liveness probe.

## Archival Policy (Production)

- **Completed tasks older than 7 days** → move to `shared/archive/{YYYY-MM}/`
- **Outbox responses older than 7 days** → same
- **Error logs** → keep forever
- **Audit trails** → keep forever
- **Tripp runs cleanup at 3 AM** via `cleanup.py`
- **Copy to Echo's PC** via `D:\echoshouse\archive/` mount
- **Echo's monthly purge** — deletes anything archived >90 days

## Communication Channels Summary

| Use Case | Channel |
|----------|---------|
| Assign work | Drop file in `shared/inbox/pending/` |
| Acknowledgment mid-work | Move to `processing/` + brief outbox note |
| Report completion | Move to `completed/` + full outbox response |
| Propose knowledge sharing | Drop in `shared/review-queue/` |
| Approved knowledge | Tripp moves from review-queue → approved-knowledge |
| Heartbeat status | Write own JSON to `shared/heartbeat/agents/` |
| Emergency wake | Eddie runs Wake.py on PC, Tripp's wake method SSH+OpenClaw |
| Casual human-to-agent chat | Telegram/direct messaging, no task files |

## Scaling Notes

- **More agents:** Just add `AGENT_NAME` env var and watcher instance. No protocol changes.
- **More folders:** Add to shared structure, update deployment doctrine, no code changes needed.
- **Cross-network:** Bind-mount shared volume; no HTTP required between agents.
- **Human operators:** Same protocol — humans drop task files, agents respond the same way.

## What NOT to Build

- Don't add HTTP endpoints between agents if file-based works (isolation is a feature)
- Don't use a database for inbox state when file paths ARE the state
- Don't build a UI on top of this until you have months of proven file-based coordination
- Don't add priority sorting until alphabetical processing proves insufficient
- Don't archive older than 90 days until you've needed to retrieve old ones

The system should stay boring. Boring = reliable.
