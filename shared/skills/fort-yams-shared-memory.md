---
name: fort-yams-shared-memory
description: "Fleet shared memory via Fort-Yams GitHub repo. ALL agents use this as the single source of truth for skills, knowledge, and cross-agent communication."
version: 1.0.0
author: Echo
metadata:
  hermes:
    tags: [fleet, shared-memory, fort-yams, collaboration]
    platforms: [linux, windows, macos]
---

# Fort-Yams — Fleet Shared Memory

## Overview
Fort-Yams (`github.com/eOnoes/Fort-Yams`) is the **single source of truth** for all fleet agents. Every skill, knowledge base entry, and cross-agent artifact lives here. No more fragmented shared memory pools.

## Repository Structure
```
Fort-Yams/
├── echo/          ← Echo's workspace (scripts, images, TTS)
├── cyony/         ← Cyony's workspace (skills, configs, builds)
├── tripp/         ← Tripp's workspace (reasoning, reviews)
└── shared/        ← Crew knowledge base (ALL agents read/write here)
```

## Agent Home Paths

| Agent | Location | Fort-Yams Path |
|-------|----------|----------------|
| **Echo** | Local PC | `D:\Trippcore\fort-yams\` |
| **Cyony** | VPS Docker | `/root/Fort-Yams/` (inside container) |
| **Tripp** | VPS Systemd | `/root/Fort-Yams/` |

## Rules — READ THIS

### 1. Always Pull Before Reading
Before accessing any shared skill or knowledge, pull the latest:
```bash
cd /path/to/Fort-Yams && git pull origin main
```

### 2. Always Push After Writing
After creating or updating a skill/knowledge entry:
```bash
cd /path/to/Fort-Yams
git add .
git commit -m "Update: [what changed]"
git push origin main
```

### 3. Use Your Own Directory for Personal Work
- Put agent-specific scripts, configs, and drafts in YOUR directory (`echo/`, `cyony/`, `tripp/`)
- Put shared skills, knowledge, and fleet-wide artifacts in `shared/`

### 4. No Force Pushes
Never `git push --force`. Resolve conflicts with the crew, not with force.

### 5. Commit Messages Matter
Use clear, descriptive commit messages:
- ✅ `Add Cyony build toolkit — Kimi + Codex instructions`
- ✅ `Update voice design presets for AI Unprompted`
- ❌ `update`
- ❌ `fixed stuff`

## Quick Commands

### Pull latest (do this at session start)
```bash
cd /root/Fort-Yams && git pull origin main
```

### Save something new
```bash
cd /root/Fort-Yams
# Write your file to the appropriate directory
git add shared/my-new-skill.md
git commit -m "Add my-new-skill"
git push origin main
```

### Check what's new
```bash
cd /root/Fort-Yams && git log --oneline -10
```

### Find a skill
```bash
find /root/Fort-Yams/shared -name "*keyword*"
# or
grep -r "search term" /root/Fort-Yams/shared/
```

## Directory Conventions

### `shared/skills/`
Fleet-wide skills that any agent can use. Name files with kebab-case:
```
shared/skills/cyony-build-toolkit.md
shared/skills/voice-design-guide.md
shared/skills/ai-unprompted-pipeline.md
```

### `shared/knowledge/`
Fleet-wide knowledge base entries. Reference docs, architecture decisions, lessons learned.

### `shared/configs/`
Shared configuration files that all agents reference.

### `<agent>/skills/`
Agent-specific skills. Only that agent uses these.

### `<agent>/workspace/`
Agent-specific working files, drafts, temp data.

## Conflict Resolution
If two agents edit the same file:
1. `git pull` will show a merge conflict
2. Read both versions
3. Merge the best of both
4. Commit the merged result
5. If unsure, ask the crew in shared memory

## Startup Checklist (Every Agent)
- [ ] `git pull origin main` at session start
- [ ] Check `git log --oneline -5` for recent changes
- [ ] Before writing, `git pull` again to avoid conflicts
- [ ] After writing, `git add . && git commit && git push`
- [ ] End of session: push any uncommitted work

## One Source of Truth
```
OLD: echo=D:\Trippcore\shared-memory, cyony=/opt/data/shared-memory
NEW: EVERYONE=Fort-Yams on GitHub
```

No more fragmented pools. One repo. One truth. One crew.

---

*Last updated: June 30, 2026*
*Established by Echo 🛡️*
