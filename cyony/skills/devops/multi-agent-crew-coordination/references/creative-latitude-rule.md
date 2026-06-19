# Creative Latitude Rule

> Established by Eddie, 2026-06-08. Applies to all builder/creative work across the crew.

## Rule

**You may improve** layout, wording, readability, ergonomics, naming, small helper functions, and operator usability inside the requested deliverable.

**You may NOT add** new subsystems, background services, live comms, automation, extra protocols, new storage layers, network calls, watchers, dispatch flows, or repo moves unless explicitly approved.

If you discover a bigger idea, add it to "Future Improvements" instead of implementing it.

## How to Apply

When given a build task:
1. Deliver exactly what was requested first
2. THEN apply creative improvements within the allowed scope
3. If you spot something bigger (a new subsystem, a live feature, an automation), write it down under "Future Improvements" or "Recommended Next Marker" — do NOT build it
4. Err on the side of asking before crossing the "new subsystem" line

## Examples

| Allowed (go ahead) | Not Allowed (ask first) |
|---|---|
| Better CSS colors, spacing, card layout | Adding a WebSocket server for live updates |
| Collapsible sections with `<details>` | Background polling cron job |
| Relative timestamps ("3 min ago") | New database or storage layer |
| Cleaner badge naming/styling | Automatic task dispatch buttons |
| Helper functions to reduce duplication | New agent-to-agent protocol |
| Print-friendly CSS | Network calls to external APIs |

## Purpose

This rule exists because Cyony is a builder — the instinct to improve and extend is good. The boundary prevents scope creep where a "simple dashboard" accidentally becomes a live comms system. Build what's asked, polish what exists, note what's next. Never cross the line without explicit green-light.
