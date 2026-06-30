# Agent Coordination via Notion

Pattern used for the Cyony/Tripp/Echo/Codex crew with Eddie orchestrating from mobile.

## Page Structure

```
Crew Ops (top-level page, shared with all integrations)
├── Dashboard        — agent status, test counts, blockers
├── Phase Reports    — database: Name, Phase, Status, Tests, Date
├── Build Queue      — database: Task, Stage, Agent, Status, Priority, Prompt, Repo, Expected, Result
├── Repo Guardrails  — lane ownership, forbidden commands, commit rules
└── Inbox            — free-text for quick one-off notes
```

## Build Queue Schema

| Property | Type | Values |
|----------|------|--------|
| Task | title | Free text |
| Stage | rich_text | e.g. "9D", "10C" |
| Agent | multi_select | Cyony, Codex, Kimi, Echo, Tripp |
| Status | select | READY → ASSIGNED → RUNNING → PASS / BLOCKED |
| Priority | select | P0 (NOW), P1 (Today), P2 (Week), P3 (Backlog) |
| Prompt | rich_text | The exact prompt to run |
| Repo | select | Tripp.Reason, Tripp.Control, Tripp.OS |
| Expected | rich_text | What success looks like |
| Result | rich_text | Agent writes outcome here |

## Handoff Flow

1. Eddie drops task in Build Queue → sets Agent + Status: READY
2. Agent polls its queue, moves to ASSIGNED → RUNNING
3. Agent writes result, sets PASS or BLOCKED
4. Dashboard reflects current state

## Multi-Agent Connection

Each agent needs its OWN Notion integration key. Eddie creates one integration per agent at https://notion.so/my-integrations. Then shares the Crew Ops page with each integration: `...` → `Connections` → `Connect to` → select integration.

Agents use the page ID `{crew-ops-page-uuid}` to read/write via the API. ChatGPT cannot get an integration key; it reads the shared page URL, and Eddie pastes ChatGPT output into Build Queue for agents to execute.

## Why Notion over file-based IPC

- Human-readable from phone (no SSH needed)
- Visual: filter/sort databases, see status at a glance
- Survives agent restarts (no in-memory state)
- Multi-agent: any agent with a key can read/write independently
- Audit trail: page history built-in

## Pitfalls

- Must share page with EACH integration individually (forgotten → 404)
- Database creation is two-step in v2025-09-03 (create DB → PATCH data source with properties)
- Callout blocks: no `bold` annotations on individual rich_text segments; apply to entire block or none
- Internal integrations can't create workspace-root pages — always create under an existing page_id
