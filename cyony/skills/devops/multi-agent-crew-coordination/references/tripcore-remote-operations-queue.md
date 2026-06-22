# Trippcore Remote Operations Queue — Build-Ready Spec (2026-06-22)

## Overview
Filesystem-based persistent job queue for multi-agent coordination. Designed by Eddie, reviewed by Scout (Cyony), Tripp, and Kimi. Ready for Echo to implement.

**Key principle:** Extend existing infrastructure (`shared/queues/`, `shared/shared-agent-bus/`). No new dependencies. No Redis. No message brokers. Just files on disk.

## Architecture
- Shared filesystem-based persistent queue
- No direct agent-to-agent sockets
- Every job is a durable file on disk
- Base path: `shared/` (relative, resolves to `/root/agents/shared/` on VPS)
- Never use absolute `/trippcore/` — breaks across Docker contexts

## Directory Structure
```
shared/
├── queues/
│   ├── tripp/
│   │   ├── pending/
│   │   ├── processing/
│   │   └── completed/
│   ├── cyony/
│   │   ├── pending/
│   │   ├── processing/
│   │   └── completed/
│   ├── echo/
│   │   ├── pending/
│   │   ├── processing/
│   │   └── completed/
│   ├── dead/
│   ├── archive/
│   └── .wake
├── shared-agent-bus/
│   └── agents/
│       ├── tripp/watcher_state.json
│       ├── cyony/watcher_state.json
│       └── echo/watcher_state.json
└── queues/.audit.log
```

## Job Lifecycle
```
PENDING → CLAIMED → RUNNING → COMPLETED
                    ↓        ↓
                  FAILED → DEAD (after max_retries)
```

## Job Schema (Request)
```json
{
  "id": "job_YYYYMMDD_HHMMSS_<random5>",
  "source": "hermes",
  "target": "codex",
  "type": "tts_fix",
  "priority": "normal",
  "prompt": "Fix the instruct bug...",
  "context": {},
  "timeout_s": 300,
  "retry_count": 0,
  "max_retries": 2,
  "created_at": "ISO8601",
  "reply_to": "hermes",
  "reply_to_id": null,
  "hmac": "sha256:<hash>",
  "_meta": {
    "claimed_at": null,
    "claimed_by": null,
    "processing_started_at": null
  }
}
```

## Atomic Write Pattern
```python
fd = os.open(filepath, os.O_CREAT | os.O_WRONLY | os.O_SYNC)
os.write(fd, json_bytes)
os.fsync(fd)
os.close(fd)
os.rename(tmp_path, final_path)
```

## Wake Mechanism (Zero Polling)
1. **Primary:** inotify on each agent's `pending/` directory
2. **Fallback:** `.wake` file (touch after dropping job, debounce 2s)
3. **Critical jobs:** Telegram ping + `.wake` touch

## Priority System
Filename prefix: `0_` = critical, `1_` = normal, `2_` = background
`sorted(os.listdir(pending_dir))` yields priority order naturally.

## HMAC Auth
- Shared secret: `TRIPPCORE_SHARED_SECRET` in each agent's `.env`
- Sign everything except `hmac` field itself
- Use `hmac.compare_digest()` for timing-attack safety
- Support `TRIPPCORE_SHARED_SECRET_PREVIOUS` for grace period during rotation

## Agent Heartbeat (`watcher_state.json`)
- Write `last_heartbeat` every 60s while alive
- Other agents consider dead if heartbeat > 120s old
- `active_job` field tracks what's being processed

## Queue Hygiene (3 AM cron)
- Archive completed jobs > 7 days (gzip)
- Compress dead jobs > 7 days
- Delete archives > 30 days
- Disk space guard: if > 90%, delete background jobs > 1 day

## Logging (Scout addition)
Every state transition logs to `shared/queues/.audit.log`:
```
2026-06-22T14:30:22Z | job_id | STATE → STATE | agent:name | detail
```

## Implementation Phases
1. File-based queue + wake trigger (Hermes writes, Codex watches)
2. Job states, retries, dead letter queue
3. Priority routing, output routing, heartbeat
4. Multi-agent bus (all agents join)

## Success Criteria
- Job survives agent crash
- Job survives reboot
- No polling (wake-based)
- Atomic state transitions
- HMAC verified on every job
- Audit trail in `.audit.log`

## Key Design Decisions
- **Filename prefix sorting** over separate priority queues — simpler, atomic
- **Single-agent queue by default** — claim racing impossible when only one agent watches each `pending/`
- **Wake file over polling** — filesystem watcher + coarse `.wake` signal
- **HMAC on every job** — prevents rogue agents from injecting work
- **Dead letter queue per target agent** — easier audit routing
- **Output routing via `reply_to`** — results go where they're needed, not hardcoded
