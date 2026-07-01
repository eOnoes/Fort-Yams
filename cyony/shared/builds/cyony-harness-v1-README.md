# Cyony Harness v1 — Static Operator Dashboard

## What It Is
A read-only, static HTML snapshot of the Tripp.Reason crew state. 
Opens in any browser. No server. No polling. No writes.

## How to Open
```
# On VPS — copy to any web-accessible path or open locally:
firefox /opt/data/shared/builds/cyony-harness-v1.html

# Or download to your phone/laptop and open there
```

## Inputs (baked into HTML at build time)
- `/opt/data/shared/heartbeat/agents/*.json` — one per agent
- `/opt/data/shared/memory/crew-knowledge.md` — shared context
- `/opt/data/shared/approved-knowledge/` — evidence packages
- `/opt/data/shared/review-queue/` — pending reviews

## To Refresh the Dashboard
Re-run the build script (TBD in Harness v2) with fresh heartbeat data.
For now: re-build the HTML after any state change worth capturing.

## Sections
1. **Active Lane** — current marker, next marker, owner, blocked-by
2. **Agent Status** — heartbeat age, task, status per agent
3. **Priority Queue** — ordered work items with evidence requirements
4. **Evidence Packages** — available evidence, source, validation state
5. **Decision Options** — operator choices with required evidence
6. **Prompt Blocks** — copy-ready prompts for each agent

## Hard Boundaries
- ❌ No live polling (no setInterval for data)
- ❌ No network calls (no fetch, WebSocket, XHR)
- ❌ No file writes or disk mutation
- ❌ No automatic task dispatch
- ❌ No shell command execution
- ❌ No agent-to-agent message routing
- ✅ Only setTimeout for copy-button feedback (1500ms UI only)

## Next
- Harness v2: optional refresh script that regenerates HTML from live heartbeat JSONs
- Harness v3: when Tripp.OS/agent-bus is live, Control can read comms state
