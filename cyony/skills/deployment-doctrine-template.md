# Deployment Doctrine Template

> Adapt this to your crew. Replace `<crew-name>`, `<agent-X>`, etc.

## Folder Map

### LOCAL (Host A)
```
/path/to/host-a/workspace/
├── <agent-name>/           # Agent's internal sandbox
└── shared/                 # Controlled bridge
```

### REMOTE (Host B)
```
/path/to/host-b/workspace/
├── <agent-name>/           # Agent's internal sandbox
└── shared/                 # Same bridge, mounted from host A
```

## Folder Purposes

| Folder | Who Writes | Who Reads | Purpose |
|--------|-----------|-----------|---------|
| `<agent-A>/workspace/` | Agent A | Agent A | Sandbox, experiments |
| `<agent-B>/workspace/` | Agent B | Agent B | Sandbox, experiments |
| `shared/tasks-for-<agent-X>/` | Warden | Builder | Work assignments |
| `shared/tasks-from-<agent-X>/` | Builder | Warden | Work reports |
| `shared/review-queue/` | Builder | Warden | Proposals for approval |
| `shared/approved-knowledge/` | Warden | All | Vetted, shared files |
| `shared/rejected-or-archived/` | Warden | All | Rejected items (with reasons) |
| `shared/heartbeat/` | All (per file) | Aggregator | Status files |

## Rules

### 1. NEVER OVERWRITE
- Clone to new path, merge manually
- Git everything — each workspace is its own repo
- If conflict: backup old, clone new, diff manually

### 2. PROMOTION PATH
```
Build (Agent) → Review (Warden) → Approve → Deploy
     ↓                ↓              ↓
agent/workspace  review-queue   approved-knowledge
```

### 3. AUDIT REQUIREMENTS (Before Cross-Boundary Code Moves)
Warden must verify:
- [ ] No hardcoded credentials
- [ ] No outbound network calls to unexpected hosts
- [ ] No file system escapes (path traversal via `../`)
- [ ] No execution of user input (injection)
- [ ] No deletion of protected paths
- [ ] Git diff reviewed for unexpected changes

If audit fails: reject and document in `rejected-or-archived/` with reason.

### 4. GIT STRATEGY
- Each workspace = its own repo
- `shared/` is NOT a git repo — it's a runtime bridge
- Commit messages include task IDs (e.g., `"feat(Task-123): ...")`

### 5. EMERGENCY PROCEDURES

**If overwrite happens:**
1. STOP — don't panic
2. Check git status
3. If git tracked: `git checkout -- <file>`
4. If not tracked: check backups in `rejected-or-archived/`
5. Document incident in `shared/memory/errors/`

**If unsure:** Ask the human. Better to pause than break.

## Permission Matrix

```bash
# Run once during setup (host side):
chown -R <agent-user>:<agent-group> shared/tasks-from-<agent>/
chown -R <agent-user>:<agent-group> shared/review-queue/
chown -R <agent-user>:<agent-group> shared/heartbeat/agents/
chmod 777 shared/tasks-for-<agent>/     # Warden writes, builder reads
```

## Signatures

This doctrine is binding. Violations are logged.

- Warden: _____________
- Builder: _____________
- Relay: _____________
- Human: _____________
