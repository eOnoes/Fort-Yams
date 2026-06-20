# TripCore Harness v1.1 — README

## What It Is
A static operator dashboard for the Tripp.Reason crew. Eddie writes plain Markdown.
Cyony's generator converts it to a readable HTML dashboard. No JSON required from Eddie.

## The Pipeline
```
Eddie writes markdown  →  generate-harness.py  →  tripcore-harness-v1.1.html
(current-state.md)                                   (open in browser)
```

## How to Use

### 1. Edit the Markdown
```bash
nano /opt/data/shared/builds/current-state.md
```
See `current-state.example.md` for the template. Only edit plain English.
Never touch JSON.

### 2. Generate the Dashboard
```bash
cd /opt/data/shared/builds
python3 generate-harness.py --input current-state.md

# Optional: also output snapshot.json for audit
python3 generate-harness.py --input current-state.md --json
```

### 3. Open the Dashboard
```bash
firefox tripcore-harness-v1.1.html
# Or download and open in any browser
```

## Does Eddie Ever Touch JSON?
**No.** JSON exists only as an audit artifact (`snapshot.json`). 
The Markdown file is the single source of truth.

## File Map
```
builds/
├── current-state.md              ← Eddie edits THIS (plain English)
├── current-state.example.md      ← Template to copy
├── generate-harness.py           ← Generator (run after editing md)
├── tripcore-harness-v1.1.html    ← OUTPUT: open in browser
├── snapshot.json                 ← OUTPUT: audit artifact (optional)
└── README.md                     ← This file
```

## Dashboard Sections
- Snapshot Source card — input path, timestamp, confidence
- Active Lane — current marker, next marker, owner, decision
- Decision Strip — current decision + recommended action
- Agent Status — 4 agents with status, task, heartbeat age
- Priority Queue — ranked items with stop conditions
- Evidence Packages — with trust levels (CONFIRMED, REPORT_BACKED, etc.)
- Stop Conditions — hard boundaries list
- Notes — freeform operator notes
- Prompt Blocks — copy-ready for Cyony, Tripp, Echo, Kimi
- Hard Boundaries section — compliance verification

## Trust Levels
| Level | Meaning |
|-------|---------|
| CONFIRMED | Verified by multiple sources |
| REPORT_BACKED | Single agent report |
| REVIEWED | Seen, not validated |
| UNKNOWN | Unverified |

## Safety
All hits on boundary sweep are in compliance text, not functional code.
See boundary section in generated HTML for full list.
