# Tripp.Reason Step 0 (Executed 2026-06-02)

Session-specific reference: clean-room rebuild of Goose (Block's Rust AI agent framework) as a TypeScript/pnpm monorepo for a multi-agent crew.

## Context

- **Legacy:** Block's `goose` (Rust + Electron + Ink TUI + ACP, 30+ providers, ~2800 files)
- **Fork attempted:** `eOnoes/Tripp.Reason` → grew heavy; trimming became harder than rebuilding
- **Decision (via `architecture-fork-vs-build`):** clean-room TypeScript rebuild, Goose as read-only requirements source
- **Stack:** Node.js + TypeScript, pnpm monorepo, Fastify server, SQLite + Drizzle, Zod schemas

## Path Setup

```
/opt/data/shared/Tripp.Reason.Legacy/    ← frozen fork + audit (read-only)
/opt/data/shared/Tripp.Reason/           ← new clean-room
  ├─ docs/
  │   ├─ DOCTRINE.md
  │   ├─ ARCHITECTURE.md
  │   └─ ROADMAP.md
  ├─ reports/
  │   └─ STEP_0_DOCTRINE_REPORT.md
  └─ STEP_0_ALL_FILES.txt  (combined for review handoff)
```

Moving the legacy was done by renaming the existing fork dir to `.Legacy/` and creating fresh `docs/` + `reports/` subdirs at the canonical path.

## DOCTRINE.md Structure (as written)

- **What Tripp.Reason Is** — lean local-first agent runtime for coding agents + swarm coordination + audit-backed task completion
- **What It Is NOT** (15-item table with "ghost being killed" column):
  - not Goose, not a fork, not a provider zoo (5 max, 1 in Phase 1)
  - not desktop-first (local web only), not a plugin marketplace
  - not a swarm launcher by default (default=1), not a local inference engine
  - not a UI-first project, not a replacement for OpenClaw/Hermes (amplifies them)
  - not a chatbot, telemetry farm, Telegram gateway, recipe system, scheduler
- **15 Hard Rules** — "Core runs without UI/Swarm/MCP", "Every run produces MD report", "Default worker count 1, max 25", "No Goose branding"
- **Phase 1 allowed/forbidden** — explicit lists with ❌ markers
- **Clean-room rule** — legacy at `.Legacy/` read-only, no line-by-line porting
- **ApprovalGate rule** — safe ops (read/list/search) vs gated (write/edit/shell/network)
- **Provider bloat prevention** — max 5 ever, phase 1 = openai-compatible only
- **Swarm restraint** — Solo 1 / Small 3-5 / Medium 6-10 / Large 11-20 / Max 25 (manual approval)
- **OpenClaw/Hermes relationship** — amplifies not replaces

## ARCHITECTURE.md Structure

- 9-package pnpm monorepo layout
- **Dependency direction graph** (strict, shared=leaf):
  ```
  shared ← (leaf)
  core, providers, tools, store ← shared
  server, cli ← core, providers, tools, store, shared
  mcp ← shared
  swarm ← core, shared
  ```
- **Contract ownership in shared** (first-class principle):
  - `ProviderAdapter`, `Tool`, `ToolDispatcher`, `Approver`
  - `ApprovalRequest`, `ApprovalResult`, `ProviderRequest`, `ProviderResponse`
  - `StreamEvent`, `Message`, `Session`, `Run`, `Event`, `ToolCall`, `Approval`, `Report`, `RunReport`
  - Import rule: "every other package imports its contracts from shared. No package defines its own duplicate"
- Per-package responsibilities (core imports contracts from shared, providers/tools implement them)
- Store schema: sessions/runs/messages/events/tool_calls/approvals/reports tables (+swarm_runs/workers in Phase 5+)
- Event contract — typed union, persisted before emit
- Report contract — template with Status/Prompt/Model/Duration/Events/Tool Calls/Files Changed/Validation/Next Step
- Minimum Phase 1 runtime flow (6 steps: prompt → stream → events → session → report → CLI output)
- **Streaming distinction section** — internal `AsyncIterable<StreamEvent>` allowed in Phase 1; HTTP/SSE server forbidden until Phase 3

## ROADMAP.md Structure

7 phases, each with Goal/Allowed/Forbidden/Success Condition/Required Report:

- **Step 0:** Doctrine/Architecture/Roadmap lock
- **Phase 1:** Kernel/Solo Runtime — `tripp run "..."` with single provider, read-only tools, MD reports
- **Phase 2:** Coding Agent Tools — write/edit/shell activated behind ApprovalGate, CliApprover implements Approver from shared
- **Phase 3:** Local Server + SSE — Fastify, ApiApprover in server, tripp chat (streaming)
- **Phase 4:** MCP Bridge — load external MCP servers through the same ApprovalGate
- **Phase 5:** Kimi-Style Swarm — orchestrator + 8 worker roles, max 25
- **Phase 6:** Dashboard — Vite + React local web app
- **Phase 7:** OpenClaw + Hermes Integration — crew adapters as bounded workers

Dependency graph: Phase 1 alone is minimal viable.

## Step 0A Patches Applied

Three surgical corrections before review:

1. **Contract ownership** — ARCHITECTURE.md previously implied ProviderAdapter was defined in core or providers. Fixed: shared owns all cross-package interfaces; core/providers/tools only import/implement.

2. **CLI phase scope conflict** — ARCHITECTURE.md had `cli` as "(Phase 3+)" but ROADMAP.md required `tripp run` in Phase 1. Fixed: `packages/cli` is Phase 1+ with `tripp run` only, expands in Phase 3 with `tripp chat`.

3. **Streaming distinction** — Phase 1 allows "provider stream" but forbids "SSE". Made explicit: Phase 1 has internal `AsyncIterable<StreamEvent>` (in-process); Phase 3 adds Fastify HTTP forwarding this stream as network SSE. New dedicated section; both docs updated.

Report status was bumped to **PATCHED PASS** with `PATCHES APPLIED` and `PHASE 1 READINESS` sections.

## Clean-Room Boundary Verification

Run before handoff:
```bash
find /opt/data/shared/Tripp.Reason -type f | sort
```

Expected 5 files only: the 3 docs, the report, and the combined `.txt`. Zero source files. Zero `packages/`. Zero deps.

Reported in conversation as: "✅ Clean-room boundary intact. Docs and reports only."

## Key Lessons From This Execution

1. **"What It Is NOT" table with "ghost being killed" column** is the most useful section. Forces precision.
2. **Contract ownership** was the primary ambiguity — if not locked in shared/, future agents will define interfaces in core or providers by default.
3. **Streaming wording was ambiguous** — "provider stream" vs "server SSE" needed explicit distinction or Phase 1 would accidentally build an HTTP endpoint.
4. **Combined .txt delivery pattern** is essential for review handoff via chat. Five sections, clear dividers, one attachment.
5. **Phase 1 CLI contradiction** between architecture and roadmap was a real bug — one doc said Phase 3+, the other required it at Phase 1. The patch pass caught it; review wouldn't have.
6. **Status `PATCHED PASS` is a useful semantic.** Distinguishes first-pass success from post-correction success. Reviewers see at a glance that the docs were internally reconciled.

## Reference Files

- `/opt/data/shared/Tripp.Reason/STEP_0_ALL_FILES.txt` — the consolidated deliverable (4 files with dividers)
- `/opt/data/shared/Tripp.Reason.Legacy/` — the frozen fork
- `Kimi_Agent_Tripp.reason Audit Plan.zip` — the audit source (94 files including FINAL-AUDIT-REPORT.md, lean-harness-plan.md, gap-analysis.md)
