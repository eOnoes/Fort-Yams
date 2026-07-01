---
name: fort-yams-audit-and-navigation
description: "Navigate the Fort-Yams repo, find agent artifacts, audit toolkits/setup docs, and verify tool auth. Covers the file layout pitfalls and the A-D audit pattern."
version: 1.0.0
tags: [fort-yams, fleet, shared-memory, audit, navigation]
---

# Fort-Yams Navigation & Audit

## Fort-Yams Repo Structure

```
Fort-Yams/
├── echo/              ← Echo's workspace (Win PC)
├── cyony/             ← Cyony's workspace (VPS)
│   ├── skills/        ← Agent-specific skills (cyony-build-toolkit.md lives HERE)
│   ├── shared/        ← OLD shared pool (many legacy .js/.json files)
│   └── config.yaml
├── tripp/             ← Tripp's workspace
└── shared/            ← Crew knowledge base
    └── skills/        ← Fleet-wide skills (fort-yams-shared-memory.md lives HERE)
```

### ⚠️ CRITICAL PATH PITFALL
The repo has **two different `shared/` locations** that overlap in name:
- `cyony/shared/` — OLD legacy pool, full of .js/.json/.md artifacts
- `shared/skills/` — NEW fleet-wide skill docs (Echo's canonical location)

**When searching for a file, ALWAYS search recursively across the whole repo:**
```bash
find /opt/data/Fort-Yams -name "*filename*" 2>/dev/null
```
Never assume a file is in `cyony/shared/` just because it's "for Cyony."

### Cyony's Actual Container Path
`/opt/data/Fort-Yams/` — NOT `/root/Fort-Yams/` (the shared-memory doc has this wrong).

## Git Workflow
```bash
# Pull at session start
cd /opt/data/Fort-Yams && git pull origin main

# Check recent changes
git log --oneline -10

# Push after writing
git add . && git commit -m "Descriptive message" && git push origin main
```

## A-D Audit Pattern (for validating toolkits/setup docs)

When Eddie asks you to test Echo's setup docs, run this structured audit:

### A. Does it work?
- Verify each tool/command referenced in the doc actually runs
- Check env vars are set: `env | grep TOOL_NAME`
- Check binaries exist: `which tool_name`
- Check auth: `tool_name login status` or a minimal API call
- **Key pattern:** Auth failures are environment-specific, NOT permanent tool constraints. Don't encode "tool X doesn't work" — encode "tool X needs auth setup"

### B. Can I see/audit?
- Confirm the file exists at the expected path
- Read and review the content for correctness

### C. What needs changed?
- Path corrections (e.g., `/root/Fort-Yams/` → `/opt/data/Fort-Yams/`)
- Auth status (expired keys, missing OAuth)
- Clarifications (e.g., delegate_task vs direct API call)
- Env var references instead of hardcoded/redacted values in examples

### D. Anything else the user asked for
- Selfies, reports, whatever the specific request was

## Tool Auth Status (as of 2026-06-30, verified working)
| Tool | Installed | Auth | Endpoint/Notes |
|------|-----------|------|----------------|
| Codex CLI | ✅ v0.142.4 | ✅ ChatGPT OAuth | Model: gpt-5.5. Needs `--yolo` in container (bubblewrap sandbox). Auth via `codex login --device-auth` |
| Kimi API | N/A (curl/requests) | ✅ Key valid | Endpoint: `https://api.kimi.com/coding/v1/chat/completions`. Model: `kimi-k2.5`. Key in `/opt/data/.env` as `KIMI_API_KEY` |
| Git (Fort-Yams) | ✅ | ✅ | Pull/push working |

### Kimi Quick Reference
```python
import requests
resp = requests.post('https://api.kimi.com/coding/v1/chat/completions',
    headers={'Content-Type': 'application/json', 'Authorization': f'Bearer {key}'},
    json={'model': 'kimi-k2.5', 'messages': [...]})
```

### Codex Quick Reference
```bash
codex exec --yolo "Build prompt here"  # --yolo needed in container
codex exec --full-auto "Safer mode"     # Still needs sandbox fix
```

## Eddie's Build Workflow
Plan first (stack/build/control) → Kimi research → Eddie approves → Codex builds → Cyony audits.
Free reign with guardrails. Kimi = research powerhouse. Codex = builder.

## Known Doc Corrections (in Fort-Yams repo, not yet patched)
1. `shared/skills/fort-yams-shared-memory.md` — Cyony path says `/root/Fort-Yams/`, should be `/opt/data/Fort-Yams/`
2. `cyony/skills/cyony-build-toolkit.md` — Kimi endpoint should be `api.kimi.com/coding/v1/chat/completions` (not `api.moonshot.ai`), model `kimi-k2.5`
3. `cyony/skills/cyony-build-toolkit.md` — Codex needs `--yolo` flag note for container environments
4. `cyony/skills/cyony-build-toolkit.md` — `delegate_task` Option 1 for Kimi is misleading; delegate_task routes through Hermes subagents, not directly to Kimi API
