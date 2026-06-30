# Tripp.Reason Roadmap

> Phased build plan. Each phase has a goal, allowed/forbidden scope, success condition, and required report output.
> No phase may begin until the previous phase's success condition is met and documented.

---

## Step 0 — Doctrine / Architecture / Roadmap Lock

**Goal:** Lock the shape of the system before any code exists.

**Allowed:**
- Writing DOCTRINE.md, ARCHITECTURE.md, ROADMAP.md
- Writing the Step 0 audit report
- Human and crew review of all three documents

**Forbidden:**
- Any packages, dependencies, source code, or scaffolding
- Any implementation work of any kind

**Success Condition:**
- All three docs exist at `/opt/data/shared/Tripp.Reason/docs/`
- Step 0 report exists at `/opt/data/shared/Tripp.Reason/reports/STEP_0_DOCTRINE_REPORT.md`
- Eddie and Tripp have reviewed and approved the boundaries
- No code has been written

**Required Report:** `reports/STEP_0_DOCTRINE_REPORT.md`

---

## Phase 1 — Kernel / Solo Runtime ✅ (COMPLETE)

**Goal:** Prove the reason loop works end-to-end with one provider, read-only tools, and Markdown reports.

**Allowed:**
- Monorepo skeleton: pnpm-workspace.yaml, package.json, tsconfig.base.json
- `packages/shared/` — Zod schemas + all cross-package contracts: `ProviderAdapter`, `Tool`, `ToolDispatcher`, `Approver`, `ApprovalRequest`, `ApprovalResult`, `ProviderRequest`, `StreamEvent`, `Message`, `Session`, `Run`, `Event`, `ToolCall`, `Approval`, `Report`, `RunReport` (note: provider response is `AsyncIterable<StreamEvent>`, no `ProviderResponse` shape)
- `packages/core/` — ReasonLoop, EventStream, ApprovalGate, RunManager. _Imports_ contracts from shared; does not define them.
- `packages/providers/` — `OpenAICompatibleProvider` (implements `ProviderAdapter` from shared) + `ModelRouter`
- `packages/tools/` — Implements `Tool` from shared. Active: list_dir, read_file, search. Contract-only (gated): write_file, edit_file, shell.
- `packages/store/` — SQLite schema via Drizzle, all Phase 1 tables
- `packages/cli/` — `tripp run "<prompt>"` only (single-shot execution, talks to core directly, no HTTP)
- Report generation: `reports/<session-id>/<run-id>.md`
- Provider config: Ollama Cloud via openai-compatible adapter
- Internal provider async streaming inside ReasonLoop (`AsyncIterable<StreamEvent>`, in-process only)

**Forbidden:**
- HTTP server, SSE endpoints, Fastify, any network-exposed streaming (that is Phase 3)
- MCP bridge (that is Phase 4)
- Swarm runtime (that is Phase 5)
- UI / dashboard (that is Phase 6)
- OpenClaw/Hermes adapters (that is Phase 7)
- Actual execution of write/edit/shell tools (must be gated)
- Multiple provider implementations
- Recipe system, scheduler, hooks, skills, plugins
- `tripp chat` or any interactive/streaming CLI command (that is Phase 3+)

**Success Condition:**
```
tripp run "List the files in /tmp and summarize them"
→ Provider streams response
→ read_file + list_dir tools execute
→ Events persisted to SQLite
→ Session persisted to SQLite
→ Run report generated at reports/<session-id>/<run-id>.md
→ Report shows PASS with tool calls, events, and next step
```

**Required Report:** `reports/phase-1-kernel-report.md`

---

## Phase 2 — Coding Agent Tools ✅ (COMPLETE)

**Status:** Completed 2026-06-02. All 9 tools active. End-to-end mutation smoke test: 49/49 assertions PASS.
**Reports:** phase-2a through phase-2f.

**Delivered:**
- write_file, edit_file, shell, run_tests behind ApprovalGate
- git_status, git_diff (read-only, auto-approved)
- CliApprover with default-deny
- Command safety: spawn-only, allowlist, denylist, chaining blocked, timeout/caps
- Automatic backups before mutations (.tripp/backups/)
- Persistence warnings (PARTIAL status when event persistence fails)
- Tool-call audit persistence (recordToolCall in RunManager)
- End-to-end fake-provider smoke test (49/49 PASS)

**Goal:** Enable mutation behind the ApprovalGate. Prove the system can safely edit files and run commands.

**Allowed:**
- Activating write_file, edit_file, shell behind ApprovalGate
- Adding git_status, git_diff, run_tests tools
- CliApprover implementation (terminal prompts for approval)
- Context window management (TokenCounter)
- Adding a second provider if justified (e.g., Anthropic-native for better tool calling)
- Tests for tool execution + approval flow

**Forbidden:**
- Auto-approval of destructive operations
- Repo-wide rewrites
- Server, MCP, swarm, UI

**Success Condition:**
```
tripp run "Create /tmp/test.txt with 'hello world'"
→ ApprovalGate prompts operator
→ Operator approves
→ Write succeeds
→ git_status shows new file
→ Report documents the mutation + approval decision
```

**Required Report:** `reports/phase-2-coding-tools-report.md`

---

## Phase 3 — Local Server + SSE ✅ (COMPLETE)

**Status:** Completed 2026-06-02. Fastify HTTP server with 11 REST endpoints, real-time SSE streaming, HTTP approval queue, tripp serve + tripp chat CLI. 47/47 final audit smoke tests PASS.
**Reports:** phase-3a through phase-3e.

**Allowed:**
- `packages/server/` — Fastify HTTP server. Forwards internal `AsyncIterable<StreamEvent>` out as network-visible SSE.
- SSE endpoint: `POST /reply`
- Session endpoints: GET /sessions, GET /sessions/:id/events
- Tool approval endpoint: POST /approvals/:id/resolve
- Health check: GET /health
- `packages/cli/` expansion: `tripp chat` (interactive streaming, talks to server over HTTP/SSE)
- `ApiApprover` in `packages/server` (implements `Approver` from shared, routes through HTTP endpoint)

**Forbidden:**
- WebSocket (unless required and justified)
- Dashboard UI (that is Phase 6)
- MCP, swarm, external agent adapters

**Success Condition:**
```
curl -N http://localhost:3000/reply -d '{"prompt":"hello"}'
→ SSE stream of events
→ Each event appears in real-time
→ Session and run persisted
→ Report generated
```

**Required Report:** `reports/phase-3-server-report.md`

---

## Phase 4 — MCP Bridge ✅ (COMPLETE)

**Status:** Completed 2026-06-03. Full MCP bridge: JSON-RPC over stdio, mock server, tool adapter, schema conversion, ApprovalGate integration, server/CLI registration. 26/26 final audit smoke tests PASS.

**Delivered:**
- `packages/mcp/` with 11 source files (types, errors, jsonRpc, processTransport, registry, client, mockServer, schemaConversion, toolRisk, toolAdapter, config, runtime)
- MCP config loading from `.tripp/mcp.config.json`
- JSON-RPC 2.0 over line-delimited stdio with timeout/crash handling
- Mock MCP server (2 tools: mock_echo safe, mock_mutate destructive)
- McpToolAdapter implementing shared Tool interface
- JSON Schema → Zod conversion (object, string, number, boolean, array, enum)
- Risk mapping: safe→no approval, everything else→approval required
- Server/CLI integration: MCP tools in /tools, MCP status in /status, graceful shutdown
- jCodeMunch verified: 0 dependency cycles, 0 layer violations, 0 Goose code

**Reports:** phase-4a through phase-4f.

---

## Phase 5 — Kimi-Style Swarm Runtime  ✅ (COMPLETE)

**Goal:** Bounded parallel workers. Orchestrator decomposes, workers execute, merger consolidates, warden validates.

**Delivery (2026-06-03):**
- 7 sub-phases (5A–5G): contract lock → types → fake workers → orchestrator pipeline → ReasonLoop workers → CLI `tripp swarm run` → final audit
- `packages/swarm/` — 16 source files: types, schemas, constants, validation, fakeWorkers, workerRunner, orchestrator, planner, merger, conflictDetector, warden, swarmSummary, reasonLoopWorker, workerPrompt, toolFilter, workerResultMapper
- Fake mode (default): deterministic pipeline, 0 provider deps, instant
- Real mode (`--real`): ReasonLoop-backed workers with injected deps
- Worker roles: planner, researcher, coder, reviewer, tester, merger, reporter, warden
- Dynamic SubagentSpec creation (Kimi-style frozen contractors)
- CriticalPathMetrics, serialCollapseRisk, swarmSpamRisk detection
- CLI: `tripp swarm run "<prompt>"` with --mode, --workers, --fake/--real, --approve/--deny-all
- Startup approval: solo/small auto-run, medium/large/max require y/N
- Worker caps: solo=1, small=5, medium=10, large=20, absolute max=25
- jCodeMunch: grade B (85.8), 1 type-only intra-package cycle, 0 layer violations, 0 Goose code
- Swarm smoke: 67/67 (5E) + 27/27 (5F) + 27/27 (5G audit) = all pass

**Reports:** phase-5a through phase-5g.

---

## Phase 6 — Dashboard / Control Surface ✅ (COMPLETE)

**Status:** Completed 2026-06-03. Local web dashboard with 7 panels, SSE live streaming, approval queue, swarm monitoring. 6 sub-phases (6A–6F). Zero direct runtime package imports, zero server route additions for dashboard.

**Delivery (2026-06-03):**
- 6 sub-phases (6A–6F): contract lock → server swarm APIs → scaffold + API client → live run SSE → swarm panel → final audit
- `apps/dashboard/` — Vite + React + TypeScript web app, 41 modules, zero runtime package imports
- API client: 11 functions over HTTP/SSE only (health, status, tools, sessions, reports, approvals, swarms, live run)
- 7 panels: Overview, Live Run (SSE streaming + approval polling), Tools, Sessions, Reports, Approvals (default-deny), Swarms (fake-only)
- SSE parser: native fetch + ReadableStream, 5 event types (message/tool_request/tool_result/finish/error), heartbeat handling
- Fake-only swarm dashboard: solo/small enabled, medium/large/max disabled, task/result packet tables, Warden verdict, conflict display
- Styling: dark-first, hard edges, amber accent, desktop-first, plain CSS (no Tailwind), zero animations
- Security: no direct runtime imports, no tool bypass, no secrets exposed, ApprovalGate via server API only
- Dependencies: react, react-dom, vite, @vitejs/plugin-react, typescript (5 total, no heavy UI framework)

**Reports:** phase-6a through phase-6f.

---

## Phase 7 — OpenClaw + Hermes Integration ✅ (COMPLETE)

**Goal:** Connect external agents (OpenClaw Tripp, Hermes Cyony, Hermes Echo) to Tripp.Reason as bounded workers while preserving orchestration, approval, reporting, and safety boundaries.

**Status:** Phase 7 complete 2026-06-03. Phase 7I final audit PASS. 108 tests. 27 CLI commands, 9 server routes, trace ledger, Echo/Warden advisory workflow.

**Agent Roles:**
- **OpenClaw Tripp** — cloud agent, Controller/Supervisor/Lead. Planning, code review, bounded implementation.
- **Hermes Cyony** — cloud sandbox agent, Creative/Builder/Swarmhandler. Exploration, proposals, prototyping.
- **Hermes Echo** — local agent, Warden/Auditor/Trace. Report review, scope drift, doctrine compliance. (Migrated from OpenClaw to Hermes 2026-06-04)

**Trust Model:**
- Cloud agents receive redacted, minimized context — never broad local access
- Hermes is sandbox-only by default — no production writes
- Echo can audit local state but cannot mutate
- All mutations go through Tripp.Reason ApprovalGate
- Operator (Eddie) is final approver

**Transport:** File-based inbox/outbox folders for Phase 7B (`.tripp/agents/{inbox,outbox,reports,archive}/`).

**Implementation Sequence:**
- **7A** — Agent Integration Contract Lock ✅
- **7B** — Agent Bus folder scaffold + protocol documentation ✅
- **7C** — Shared external-agent packet schemas + safe file-bus helpers ✅
- **7D** — Agent Bus CLI commands (`tripp agent inbox/outbox/task/archive/reject`) ✅
- **7E** — Echo review workflow (automated Echo invocation for result packet validation) ✅
- **7F** — Append-only Agent Bus event log / trace ledger (subagent, warden, tool, approval events) ✅
- **7G** — Dashboard Agent Bus panel + trace view ✅
- **7H** — Optional live/cloud transport after safety review ✅
- **7I** — Final Agent Integration Audit ✅

**Allowed:**
- External-agent worker adapters (packages/external-agents/)
- File-based packet exchange with inbox/outbox folders
- CLI commands for packet management
- Append-only trace ledger for causal debugging
- Echo/Warden workflow integration
- Dashboard trace view panel (read-only)
- Safe file-bus helpers with schema validation
- Context minimization and secret redaction

**Forbidden:**
- Always-on remote control connections (until 7H safety review)
- External agent direct tool access
- External agent bypass of ApprovalGate
- Recursive agent spawning
- OpenClaw/Hermes replacing Tripp.Reason runtime
- New provider implementations for external agents
- External agent direct repo mutation
- Trace ledger mutation events that authorize execution

**Required Report:** `reports/phase-7i-final-agent-integration-audit-report.md`

---

## Phase Dependency Graph

```
Step 0 → Phase 1 → Phase 2 → Phase 3 → Phase 4 → Phase 5 → Phase 6 → Phase 7
           │                    │                    │
           │                    │                    └→ Phase 7 needs swarm + server
           │                    └→ Phase 6 needs server
           └→ Minimum viable: Phase 1 alone is useful
```

Phase 1 alone gives the crew a working coding agent with reports.
Everything after Phase 1 is enhancement, not prerequisite.

---

## Phase 8 — Hardening / Real Transport / UX 🔜 (PLANNING)

**Status:** Phase 8A planning pending. No implementation yet.

**Candidate sub-phases:**
- **8A** — Planning gate: scope what Phase 8 should build
- **8B** — Controlled real agent transport adapter (safety review required before enabling)
- **8C** — Dashboard UX hardening
- **8D** — End-to-end agent bus dry run
- **8E** — Final roadmap rebaseline

**Phase 7I recommended Phase 8A as next step.**

---

## Tripp.OS Extraction (Cross-Cutting)

Tripp.OS extraction work runs alongside Tripp.Reason phases.

- **Stage 2** — Agent Bus v0 extracted ✅
- **Stage 3** — Compatibility re-exports ✅
- **Stage 4** — Extraction power audit ✅
- **Stage 4A** — Contracts reconciliation ✅
- **Stage 5** — Runtime design (Kimi) ✅
- **Stage 6B** — Agent Bus source pack delivered to Kimi ⏳
