# Bridge Rules: Tripp ↔ Cyony ↔ Echo

## Canonical Paths

**Host (Tripp):** `/root/agents/shared/` (bind-mounted to Docker volume)
**Container (Cyony):** `/opt/data/shared/` (same volume, inside container)

## Folder Purposes

| Folder | Who Writes | Who Reads | Purpose |
|--------|-----------|-----------|---------|
| `tasks-for-hermes/` | Tripp | Cyony | Tripp assigns work to Cyony |
| `tasks-from-hermes/` | Cyony | Tripp | Cyony reports back results |
| `review-queue/` | Cyony | Tripp | Cyony proposes learnings/skills |
| `approved-knowledge/` | Tripp | All | Tripp-approved shared knowledge |
| `rejected-or-archived/` | Tripp | All | Rejected proposals, old stuff |
| `audit-logs/` | Tripp | Tripp | Security/change logs |
| `memory/` | Tripp | Tripp | Long-term memory (Tripp only) |
| `heartbeat/` | Tripp | Tripp | Health monitoring data |

## Rules

1. **Tripp is the gatekeeper** — only Tripp writes to `approved-knowledge/`
2. **Cyony proposes** — writes to `review-queue/` or `tasks-from-hermes/`
3. **No direct mutation** — Cyony cannot edit Tripp's files directly
4. **Mediated learning** — all skill/memory updates go through review-queue first
5. **Audit everything** — Tripp logs all approvals/rejections

## Workflow

```
Cyony discovers something new
        ↓
Writes proposal to review-queue/
        ↓
Tripp reviews (approve/reject/modify)
        ↓
If approved → moved to approved-knowledge/
If rejected → moved to rejected-or-archived/
        ↓
Both agents can read approved-knowledge/
```
