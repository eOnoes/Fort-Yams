# Bridge Rules Template

> Adapt paths and folder purposes to your crew. Drop this into your shared bridge
> root so both sides of the IPC have the authoritative documentation.

## Canonical Paths

**Host (side A):** `/root/agents/shared/` *(canonical source, owned by warden user)*
**Container/VM (side B):** `/opt/data/shared/` *(bind-mounted, same filesystem)*

Both paths resolve to the same filesystem. Never treat them as independent.

## Folder Purposes

| Folder | Who Writes | Who Reads | Purpose |
|--------|-----------|-----------|---------|
| `tasks-for-<agent>/` | Warden | Target agent | Work assignments |
| `tasks-from-<agent>/` | Builder agent | Warden | Reports + completed work |
| `review-queue/` | Builders | Warden | Proposals awaiting approval |
| `approved-knowledge/` | Warden | All | Vetted shared state |
| `rejected-or-archived/` | Warden | All | Rejected proposals + reasons |
| `heartbeat/` | All agents (per file) | Aggregator | Status / health |
| `memory/` | Warden (primary), others (append) | All | Shared long-term memory |
| `audit-logs/` | Warden | Warden | Security + change logs |

## Rules

1. **Warden is gatekeeper** — only warden writes to `approved-knowledge/` and `rejected-or-archived/`
2. **Builders propose** — write to `review-queue/` or `tasks-from-<self>/`
3. **No direct mutation** — builders cannot edit warden-owned files in place
4. **Mediated learning** — skill/memory updates go through `review-queue/` first
5. **Audit everything** — warden logs all approvals/rejections
6. **Never overwrite** — clone to new path, diff manually

## Workflow

```
Builder discovers something new
        ↓
Writes proposal to review-queue/
        ↓
Warden reviews:
  [ ] No hardcoded credentials
  [ ] No unexpected outbound network calls
  [ ] No file system escapes
  [ ] No user-input execution
  [ ] No deletion of protected paths
        ↓
If approved → moves to approved-knowledge/
If rejected → moves to rejected-or-archived/ with REJECTION-<id>.md reason
        ↓
All agents can read approved-knowledge/
```

## Permission Ownership

```bash
# Run during initial setup on host side:
chown -R <warden-user>:<warden-group> shared/approved-knowledge/
chown -R <warden-user>:<warden-group> shared/rejected-or-archived/
chown -R <warden-user>:<warden-group> shared/tasks-for-*/
chown -R <builder-user>:<builder-group> shared/tasks-from-<builder>/
chown -R <builder-user>:<builder-group> shared/review-queue/
chmod 777 shared/tasks-for-*/
chmod 777 shared/heartbeat/agents/
```

## Common Mistakes to Avoid

- **Writing HTTP endpoints across the bridge** — use files, not sockets
- **Exposing tokens in any file in the bridge** — redact before commit
- **Renaming files the other side is holding open** — use new+rename atomically
- **Treating `shared/` as a git repo** — it's a runtime bridge, not a source tree
