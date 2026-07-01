# TripCore Current State
<!-- 
  Copy this file and edit it. Cyony's generator reads it.
  You only write plain English below. Zero JSON.
  Format: ## Section, then bullet points or pipe tables.
  Agent format: Name | STATUS | Task | Freshness | Notes
-->

Generated: 2026-06-08
Mode: STATIC SNAPSHOT

## Active Lane
Lane: Cyony Harness v1.1
Owner: Cyony
Current Marker: HARNESS_V1_REVIEWED
Next Marker: READY_FOR_TRIPP_REVIEW
Decision: Improve static dashboard without live comms

## Agents
- Cyony | WORKING | Harness v1.1 | fresh | Building static dashboard
- Tripp/Codex | REVIEW | Control safety review | fresh | Reviews schema and boundaries
- Echo | OFFLINE | Win PC recovery | stale | Awaiting physical access
- Kimi | ON_DEMAND | Deep reasoning | n/a | Used by prompt only

## Priority Queue
1. Finish Harness v1.1 | Cyony | active | HTML + README
2. Review Harness v1.1 | Tripp/Codex | pending | safety audit
3. Archive approved evidence | Echo | blocked | Echo online

## Evidence Packages
- Cyony Harness v1 | Cyony | builds/cyony-harness-v1.html | reviewed | patch-required
- Tripp.Control Workup | Codex | D:/Echos.House/builds/apps/Tripp.Control | confirmed | accepted

## Stop Conditions
- Do not add polling
- Do not add live file watching
- Do not add shared-agent-bus mutation
- Do not add automatic dispatch
- Do not require Eddie to write JSON

## Notes
This file is the single source of truth for the dashboard.
Edit this, run the generator, open the HTML.
Never edit the JSON or HTML directly.
