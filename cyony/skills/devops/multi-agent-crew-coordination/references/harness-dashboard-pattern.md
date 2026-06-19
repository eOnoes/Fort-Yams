# Harness Dashboard Pattern — Markdown-in, HTML-out

## Overview

For small crews (2-5 agents) where the human is the active router, an operator dashboard lets the human see team state without touching JSON or running terminal commands. The pattern is:

```
Eddie edits Markdown  →  Python generator script  →  Static HTML dashboard
(current-state.md)       (generate-harness.py)        (tripcore-harness.html)
```

The human ONLY edits a plain English Markdown file. The generator converts it to a dark-themed, mobile-friendly static HTML dashboard. JSON exists only as an optional audit artifact — the human never touches it.

## Pipeline Files

```
builds/
├── current-state.md              ← Human edits THIS (plain English)
├── current-state.example.md      ← Template to copy
├── generate-harness.py           ← Generator (run after editing md)
├── tripcore-harness-v1.1.html    ← OUTPUT: open in browser
├── snapshot.json                 ← OUTPUT: audit artifact (optional, --json flag)
└── README.md                     ← Usage guide
```

## Markdown Input Format

The human writes a Markdown file with these sections (see `current-state.example.md`):

```markdown
# TripCore Current State
Generated: 2026-06-08
Mode: STATIC SNAPSHOT

## Active Lane
Lane: <name>
Owner: <agent>
Current Marker: <marker>
Next Marker: <marker>
Decision: <decision text>

## Agents
- Name | STATUS | Task | freshness | Notes
  # STATUS: WORKING, REVIEW, OFFLINE, ON_DEMAND, UNKNOWN
  # freshness: fresh, stale, n/a

## Priority Queue
1. Task description | Agent | state | Evidence notes
   # state: active, pending, blocked, done

## Evidence Packages
- Package name | Source agent | Location/path | validation | state
  # validation: confirmed, reported, reviewed, unknown

## Stop Conditions
- Do not add polling
- Do not add live comms
...

## Notes
Freeform text.
```

**Human never writes JSON.** Pipe-separated fields within bullet points. The parser handles the rest.

## Dashboard Sections (Generated HTML)

1. **Snapshot Source card** — input path, timestamp, confidence, static/non-live warning
2. **Active Lane** — current marker, next marker, owner, decision
3. **Decision Strip** — current decision + recommended next action
4. **Agent Status** — per-agent cards with status badge, task, heartbeat freshness
5. **Priority Queue** — ranked table with state badges
6. **Evidence Packages** — table with trust levels (CONFIRMED, REPORT_BACKED, REVIEWED, UNKNOWN)
7. **Stop Conditions** — hard boundaries list
8. **Notes** — freeform operator notes
9. **Prompt Blocks** — copy-ready for each agent, starting/ending with "Assigned to: <agent>"
10. **Hard Boundaries footer** — compliance verification text

## Hard Boundaries (Mandatory)

The generated HTML must contain ZERO of these in functional code:
- `fetch()`, `WebSocket`, `XMLHttpRequest` — no live data
- `setInterval` — no polling (copy-button `setTimeout` for 1500ms UI reset is the ONLY exception)
- `localStorage`, `indexedDB` — no browser storage
- File writes, shell commands, task dispatch buttons
- References to `shared-agent-bus` (except in boundary warning text)
- Network calls of any kind

## Generator Script Template

The generator (`generate-harness.py`) does:
1. Reads the Markdown file
2. Parses each `## Section` into structured data
3. Parses agent lines (`- Name | STATUS | Task | Freshness | Notes`)
4. Parses priority queue (numbered items with pipe separators)
5. Parses evidence packages (bullet items with pipe separators)
6. Generates dark-themed HTML with all data baked in
7. Optionally outputs `snapshot.json` for audit (`--json` flag)

Reference implementation: the `generate-harness.py` built in the Cyony/Tripp/Echo crew (2026-06-08). Available in the crew's `builds/` directory.

## Why This Pattern

- **Human edits one file.** Markdown is readable, diffable, and requires zero technical knowledge.
- **JSON is hidden.** The generator handles internal structure; the human never sees it.
- **Dashboard is portable.** Single HTML file, opens in any browser, no server needed.
- **Boundaries are enforced by the generator.** No way for the human to accidentally add polling or live comms.
- **Aligns with Tripp.Control doctrine.** Read-only operator surface, no mutation, no autonomous behavior.
