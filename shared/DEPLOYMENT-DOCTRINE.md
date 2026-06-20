# Deployment Doctrine — Tripp, Cyony, Echo

## Folder Map

### LOCAL (Echo's PC — D:\ drive)
```
D:\tripp109\                  # Eddie's projects
├── Tripp.Reason\             # Frontend/dashboard app
├── Waking up the triplets\   # PowerShell wake kit
└── echo-local\               # Echo's personal workspace
```

### CLOUD (VPS — /root/agents/)
```
/root/agents/
├── openclaw/
│   └── workspace/             # TRIPP'S WORKSPACE — DO NOT TOUCH
│       ├── AGENTS.md
│       ├── SOUL.md
│       ├── IDENTITY.md
│       ├── GOVERNANCE.md
│       └── memory/
│
├── cyony/
│   └── workspace/             # CYONY'S WORKSPACE — builder sandbox
│       ├── builds/
│       ├── skills/
│       └── experiments/
│
├── shared/                    # CONTROLLED BRIDGE
│   ├── tasks-for-hermes/      # Tripp assigns → Cyony picks up
│   ├── tasks-from-hermes/     # Cyony reports → Tripp reviews
│   ├── review-queue/          # Cyony proposes → Tripp approves
│   ├── approved-knowledge/    # Tripp-approved shared files
│   ├── rejected-or-archived/  # Rejected stuff
│   ├── heartbeat/             # Agent status files
│   └── memory/                # Shared memory (errors, etc.)
│
└── incoming-reviews/          # EXTERNAL PROJECTS LANDING ZONE
    └── Tripp.Reason/          # Echo pushes here first
```

## Rules

### 1. NEVER OVERWRITE
- Clone to new path, merge manually
- Git everything — each workspace is its own repo
- If conflict: backup old, clone new, diff manually

### 2. PROMOTION PATH
```
Build (Cyony/Echo) → Review (Tripp) → Approve → Deploy
        ↓                    ↓              ↓
   cyony/workspace/    review-queue/   approved-knowledge/
   echo-local/         incoming/       tripp/workspace/
```

### 3. WHO WRITES WHERE

| Folder | Who Writes | Who Reads | Purpose |
|--------|-----------|-----------|---------|
| `tripp/workspace/` | Tripp only | Tripp | My soul, identity, memory |
| `cyony/workspace/` | Cyony | Cyony | Her sandbox, experiments |
| `shared/tasks-for-hermes/` | Tripp | Cyony | Task assignments |
| `shared/tasks-from-hermes/` | Cyony | Tripp | Task reports |
| `shared/review-queue/` | Cyony/Echo | Tripp | Proposals for approval |
| `shared/approved-knowledge/` | Tripp | All | Shared, vetted files |
| `shared/rejected-or-archived/` | Tripp | All | Rejected/old stuff |
| `incoming-reviews/` | Echo | Tripp | External project landing |

### 4. AUDIT REQUIREMENTS

Before ANY code moves from cloud → local or local → cloud:

**Tripp must verify:**
- [ ] No hardcoded credentials
- [ ] No outbound network calls (unless approved)
- [ ] No file system escapes (path traversal)
- [ ] No execution of user input (injection)
- [ ] No deletion of protected paths
- [ ] Git diff reviewed for unexpected changes

**If audit fails:**
- Reject and document in `rejected-or-archived/`
- Explain why in `review-queue/REJECTION-<id>.md`

### 5. GIT STRATEGY

Each workspace is independent:
```bash
# Tripp's workspace
cd /root/agents/openclaw/workspace
git init  # if not already
git add .
git commit -m "checkpoint"

# Cyony's workspace
cd /root/agents/cyony/workspace
git init
git add .
git commit -m "experiment: <description>"

# Shared is NOT a git repo — it's a runtime bridge
```

### 6. EMERGENCY PROCEDURES

**If overwrite happens:**
1. STOP — don't panic
2. Check git status: `git status`
3. If git tracked: `git checkout -- <file>` to restore
4. If not tracked: check backups in `shared/rejected-or-archived/`
5. Document incident in `shared/memory/errors/`

**If unsure:** Ask Eddie. Better to pause than break.

## Examples

### Example 1: Cyony builds a skill
```
Cyony writes: /root/agents/cyony/workspace/skills/new-skill.md
        ↓
Copies to: /root/agents/shared/review-queue/new-skill.md
        ↓
Tripp audits: checks for safety, scope, quality
        ↓
Tripp approves: moves to /root/agents/shared/approved-knowledge/
        ↓
Tripp may merge into his workspace if useful
```

### Example 2: Echo pushes Tripp.Reason
```
Echo pushes: /root/agents/incoming-reviews/Tripp.Reason/
        ↓
Tripp inspects: reads code, checks for conflicts
        ↓
Tripp decides:
  - Approve → merge to appropriate location
  - Reject → move to rejected-or-archived/ with note
  - Modify → edit, then approve
```

### Example 3: Tripp updates governance
```
Tripp edits: /root/agents/openclaw/workspace/GOVERNANCE.md
        ↓
Tripp commits: git commit -m "update: new boundary rule"
        ↓
Tripp may copy to: /root/agents/shared/approved-knowledge/
        ↓
Cyony reads from approved-knowledge/ (read-only)
```

## Signatures

This doctrine is binding. Violations are logged.

- Tripp (Warden): _____________
- Cyony (Builder): _____________
- Echo (Relay): _____________
- Eddie (Human): _____________
