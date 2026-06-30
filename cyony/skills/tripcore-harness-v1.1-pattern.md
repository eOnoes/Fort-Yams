# TripCore Harness v1.1 — Static Operator Dashboard Pattern

## When to Use
Building a read-only operator dashboard for a multi-agent crew where the human is the comms bus. Use when:
- Human routes tasks directly (no autonomous dispatch)
- Dashboard must be static (no polling, no live data)
- Human should never touch JSON — plain Markdown only
- Trust levels needed for evidence packages

## Pipeline
```
Eddie → Markdown (current-state.md) → generate-harness.py → Static HTML → Browser
```

## Input Format (current-state.md)
```markdown
# TripCore Current State
Generated: YYYY-MM-DD HH:MM UTC
Mode: STATIC SNAPSHOT

## Active Lane
Lane: <name>
Owner: <agent>
Current Marker: <marker>
Next Marker: <marker>
Decision: <decision text>

## Agents
- Name | STATUS | Task | freshness | Notes

## Priority Queue
1. Task | Agent | state | Notes

## Evidence Packages
- Name | Source | Location | validation_trust | state

## Stop Conditions
- Do not add <boundary>
```

## Agent Statuses
WORKING | REVIEWING | OFFLINE | ON_DEMAND | UNKNOWN

## Trust Levels (5-level, ordered by confidence)
| Level | Meaning | Color |
|-------|---------|-------|
| CONFIRMED | Verified by multiple sources | green |
| REPORT_BACKED | Single agent report | purple |
| OPERATOR_REPORTED | Human operator report | purple |
| REVIEWED | Seen, not validated | yellow |
| UNKNOWN | Unverified | gray |

## Hard Boundaries (mandatory)
- No polling (no setInterval for data)
- No watchers or background crons
- No fetch(), WebSocket, XMLHttpRequest
- No localStorage or indexedDB
- No command execution or shell calls
- No task dispatch buttons
- No shared-agent-bus references (except boundary text)
- No auto-refresh or live runtime inference
- setTimeout allowed ONLY for copy-button UI reset (1500ms)

## Safety Sweep (run on every generated HTML)
```bash
for term in 'fetch(' 'WebSocket' 'XMLHttpRequest' 'setInterval' 'localStorage' 'indexedDB' 'child_process' 'exec(' 'spawn('; do
  echo "$term: $(grep -c "$term" harness.html)"
done
```
Expected: all zeros. If `setTimeout` > 0, verify it's ONLY in copy-button function.

## Report Format (Code Copy)
Final reports should be delivered in ``` code blocks for easy copy-paste. Format:
```
══════════════
 NAME — STATUS
══════════════
 Assigned to: <agent>
 Status: <COMPLETE|PATCHED|...>
────────────────
 FILES CREATED:
 BOUNDARY PROOF:
 NEXT MARKER:
────────────────
 Assigned to: <agent>
══════════════
```

## Files Delivered
- `current-state.md` — editable (human touches this)
- `current-state.example.md` — template
- `generate-harness.py` — parser + HTML generator
- `tripcore-harness-v1.1.html` — output dashboard
- `snapshot.json` — audit only (optional, --json flag)
- `README.md` — usage guide

## Lessons Learned (2026-06-08)

### Crew Comms Simplification
- Eddie's frustration signal "wild AF. lol" triggered the entire simplification — pay attention to enthusiasm/frustration signals
- 10-agent protocol on 3-agent crew = overengineering
- When protocol docs are larger than the crew, simplify first
- Human is always the real bus — don't build a fake one

### Windows UTF-8 Safety (Codex Intake Blocker)
**Symptom:** `py generate-harness.py` fails on Windows with `UnicodeEncodeError: 'charmap' codec can't encode character`
**Root cause:** Python on Windows defaults to cp1252 codec. Emoji in generated HTML break it.
**Fix — 3 mandatory rules for cross-platform generators:**
1. **All file reads:** `open(path, encoding="utf-8")`
2. **All file writes:** `open(path, 'w', encoding='utf-8')` — JSON also needs `ensure_ascii=False`
3. **Atomic writes:** Write to `.tmp` first, `os.replace(tmp, final)` only on success. Never zero existing files mid-failure.
```python
html_tmp = html_path + '.tmp'
with open(html_tmp, 'w', encoding='utf-8') as f:
    f.write(html)
os.replace(html_tmp, html_path)  # atomic on same filesystem
```

### HTML Escaping (Codex Intake Blocker)
**Symptom:** If Eddie pastes `<script>` or raw HTML into `current-state.md`, it becomes live markup in the dashboard.
**Fix:** All Markdown-derived values MUST pass through `html.escape()` before HTML interpolation.
```python
import html
E = html.escape

# Escaped examples:
f'<td>{E(p["task"])}</td>'      # priority queue task
f'<div>{E(notes)}</div>'         # freeform notes
f'<span>{E(lane["decision"])}</span>'  # decision text
```
**What to escape:** agent names, statuses, tasks, notes, lane values, priority items, evidence fields, stop conditions, decision, mode, timestamps, freeform notes — EVERYTHING sourced from Markdown.
**What NOT to escape:** hardcoded Python strings (prompt descriptions, CSS, HTML structure literals).
