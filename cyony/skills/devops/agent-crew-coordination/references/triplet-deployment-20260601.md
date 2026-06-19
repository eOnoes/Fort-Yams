# Triplet Deployment Reference (Session 2026-06-01)

Real-world instantiation of the crew coordination pattern. Use as a concrete example when explaining the pattern to future sessions or new crew members.

## The Crew

| Agent | Role | Host | Runtime |
|-------|------|------|---------|
| Eddie | Human admin / coordinator | various (Pixel 10 mobile, PC) | Telegram |
| Tripp | Warden / auditor / planner | Hostinger VPS (2.24.118.123) | OpenClaw on host |
| Cyony | Builder / experimenter | Same VPS, Docker container | Hermes Agent |
| Echo | Relay / local verifier | Eddie's Windows PC | Hermes Agent, gateway at `127.0.0.1:18789` |

## Network Topology

- Cyony in Docker container `hermes-agent-8eep-hermes-agent-1` on `hermes-isolated` network — no direct internet, no direct access to Tripp's endpoints
- Tripp's OpenClaw gateway bound to `127.0.0.1:18789` (localhost only, after isolation fix)
- Heartbeat aggregator at `http://2.24.118.123:18790/status` (Tripp-owned)
- All agent-to-agent communication goes through the shared volume, never HTTP

## Volume Mounts

- Host: `/root/agents/shared/` ↔ Container: `/opt/data/shared/`
- Same filesystem, bind-mounted

## Folder Map (canonical)

| Folder | Writer | Reader | Purpose |
|--------|--------|--------|---------|
| `tripp/workspace/` (host only) | Tripp | Tripp | Soul, identity, memory |
| `cyony/workspace/` (container) | Cyony | Cyony | Builder sandbox |
| `shared/tasks-for-hermes/` | Tripp | Cyony | Task assignments |
| `shared/tasks-from-hermes/` | Cyony | Tripp | Task reports |
| `shared/review-queue/` | Cyony/Echo | Tripp | Proposals for approval |
| `shared/approved-knowledge/` | Tripp | All | Shared vetted files |
| `shared/rejected-or-archived/` | Tripp | All | Rejected/old |
| `shared/inbox/` | all (per-agent files) | target watcher | Universal inbox |
| `shared/outbox/` | all (response files) | target | `from-{a}-for-{t}-{id}.md` |
| `shared/heartbeat/agents/` | each agent its own JSON | bridge script | Liveness |

## Promotion Path

Build (workspace) → Review (review-queue/) → Tripp audits → Approve (approved-knowledge/) → optional merge to Tripp's workspace

## In-Session Learnings

1. **Inbox permissions gotcha:** Tripp initially wrote `inbox/` and `outbox/` as root; Cyony (hermes) couldn't use. Fix: `chown hermes:hermes` on shared-write folders.
2. **README vs script mismatch:** Universal inbox README described `pending/` subfolder but watcher polled root — asked Tripp to pick one.
3. **Pavlov's bell = cron + manifest:** 3-minute cron scanning 5 folders with `.cyony-pickup-state.json` manifest proved effective.
4. **Fallback channels:** When inbox blocked, `review-queue/` worked for Cyony→Tripp. Always have a fallback.
5. **Heartbeat bridge = file IPC:** Cyony writes JSON; host-side bridge polls every 30s and merges into SQLite dashboard. No HTTP across container.
6. **`expected_minutes`:** Heartbeat v2 default 30 — legitimate long tasks need to report their expected duration to avoid false "stuck" alerts.

## Related Projects

- **Tripp.Reason** — desktop agent UI (Electron/Tauri) in `shared/Tripp.Reason/` (Echo pushed, Tripp approved)
- **Tripp.Control v0.1** — in-progress governance spine (task classification, model routing, escalation audit, Forge warehouse)
- **Wake Kit:** `C:\Users\eMitchell109\Documents\Waking up the triplets\Wake.py`
