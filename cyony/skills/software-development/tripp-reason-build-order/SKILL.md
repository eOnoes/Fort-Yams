---
name: tripp-reason-build-order
description: Tripp.Reason phase order and critical architectural boundaries for the clean-room rebuild
trigger: Working on any Tripp.Reason phase build, deciding phase ordering, or implementing streaming/lifecycle
tags: [tripp-reason, build-process, architecture, phase-order]
---

# Tripp.Reason Build Order & Boundaries

## ⚠️ FIRST: pnpm PATH on This VPS

**`pnpm` is NOT on the default PATH.** Every command that uses `pnpm` must be prefixed with the corepack shim. Before ANY pnpm command, export the PATH:

```bash
export PATH="/usr/share/nodejs/corepack/shims:$PATH"
```

Or inline:
```bash
PATH="/usr/share/nodejs/corepack/shims:$PATH" pnpm <cmd>
```

This applies to `pnpm install`, `pnpm typecheck`, `pnpm test`, `pnpm build`, `pnpm --filter`, and all workspace operations. The `npm run` scripts in `package.json` call `pnpm` directly, so `npm run test` will fail with `sh: 1: pnpm: not found` unless pnpm is on PATH. Run pnpm commands directly with PATH set, not through npm.

## Phase 1 Sequence (COMPLETE as of 2026-06-02)
1A shared → 1B store → 1C core → 1D providers → 1E tools → 1F ReasonLoop → 1G CLI

Each phase is independent. NEVER combine phases into a single pass — Tripp (warden) explicitly rejected bundling ReasonLoop with providers. Do NOT propose "Phase 1H: combine X and Y" — it will be rejected.

## Phase 2 Sequence (COMPLETE as of 2026-06-02)
2A persistence-warnings → 2B git-readonly → 2C write/edit → 2D shell/tests → 2E e2e smoke → **2F docs/audit (COMPLETE)**

Each sub-phase delivers a safety layer before the next capability unlocks:
- **2A**: PersistenceWarning tracking — reports show PARTIAL when audit is incomplete
- **2B**: git_status + git_diff (read-only, no approval needed)
- **2C**: write_file + edit_file (approval + backup + workdir-bound)
- **2D**: shell + run_tests (approval + allowlist + denylist + timeout + caps)
- **2E**: End-to-end coding-agent mutation smoke test (PASS — 2026-06-02, 49/49 assertions)

## Critical Boundary: Finish Event Ownership

## Critical Boundary: Finish Event Ownership
- **Providers emit**: `message` and `error` StreamEvents ONLY
- **Providers do NOT emit**: `finish` events
- **ReasonLoop emits**: `finish` events (because only ReasonLoop knows the `runId`)

If a provider emits finish events, it creates phantom lifecycle events that corrupt reports and audit trails.

## Import Direction (Phase 1 locked)
- shared → nothing (leaf)
- store → shared only
- core → shared + store only
- providers → shared only (NOT core, NOT store)
- tools → shared only (NOT core, NOT store, NOT providers)
- ReasonLoop (core) → all of the above (Phase 1F) — but via shared interfaces only, NEVER concrete imports
- **cli (assembly layer)** → imports ALL packages. This is its role — wiring instances together.

CLI is the ONLY package allowed to import concrete provider/tool implementations. Core uses interfaces.

## Current State (Phase 7 COMPLETE — 2026-06-03, checkpointed 2026-06-04)

- **Phases 1-5: ALL COMPLETE** ✅ (10 packages, 0 typecheck/build errors)
- **Phase 5A**: Swarm Contract Lock ✅
- **Phase 5B**: Swarm Package Skeleton + Packet Types ✅
- **Phase 5B.1**: Dynamic Subagent Type Addendum ✅
- **Phase 5C**: Worker Runner with Fake Workers ✅
- **Phase 5D**: Orchestrator + Merger + Warden Smoke ✅
- **Phase 5E**: ReasonLoop-Backed Worker Execution ✅ (67/67 smoke)
- **Phase 5F**: CLI Swarm Registration / tripp swarm run ✅ (27/27 smoke)
- **Phase 5G**: Final Swarm Audit ✅ (27/27 audit smoke, 0 layer violations, 0 Goose, grade B)

**Phase 6A**: Dashboard Contract Lock ✅ (docs-only)
**Phase 6B**: Server API Gaps (swarm + reports endpoints) ✅ (31/31 smoke)
**Phase 6C**: Dashboard scaffold + API client + core panels ✅ (22 files, 34 modules, 6 panels)
**Phase 6D**: Live Run SSE Panel ✅ (SSE parser, EventCard, approval polling, 37 modules)
**Phase 6E**: Dashboard Swarm Panel ✅ (SwarmRunForm, SwarmDetail, WardenVerdictCard, ConflictList, 41 modules)

**Phase 6F**: Final Dashboard Audit ✅ (Phase 6 closed)

**Phase 7A**: Agent Integration Contract Lock ✅ (docs-only, 21KB contract)
**Phase 7B**: File-Based Agent Bus Scaffold ✅ (`.tripp/agents/` folders + protocol doc)
**Phase 7C**: Shared External Agent Packet Schemas ✅ (new package `@tripp-reason/external-agents`, 13 Zod schemas, file-bus helpers, 41/41 tests)
**Phase 7D**: Agent Bus CLI Commands ✅ (`tripp agents init/inbox/outbox/read/create-task/archive/reject`, 14/14 CLI tests)
**Phase 7E**: Echo Review Workflow ✅ (3 CLI commands, 28/28 tests, advisory-only, 0 boundary violations)
**Phase 7F**: Append-Only Agent Bus Trace Ledger ✅ (JSONL append-only, 7 CLI commands, 108/108 tests)
## Phase 7 Sequence (COMPLETE as of 2026-06-03)

```
Phase 7A — Agent Integration Contract Lock (COMPLETE — docs-only)
Phase 7B — File-Based Agent Bus Scaffold (COMPLETE — folders + READMEs + protocol doc)
Phase 7C — Shared External Agent Packet Schemas (COMPLETE — new package, 13 schemas, 41 tests)
Phase 7D — Agent Bus CLI Commands (COMPLETE — 7 commands, 14 tests)
Phase 7E — Echo Review Workflow (COMPLETE — 3 commands, 28 tests, advisory-only)
Phase 7F — Append-Only Trace Ledger (COMPLETE — JSONL, 7 commands, 108 tests)
Phase 7G — Dashboard Agent Bus + Trace Views (COMPLETE — 9 server routes, AgentBusPanel, 108 tests)
Phase 7H — Transport Contract + Fake/Manual Adapter Spike (COMPLETE — contract doc, 6 schemas, 3 CLI commands, cloud disabled)
Phase 7I — Final Agent Integration Audit (COMPLETE — PASS, Phase 7 CLOSED)
```

**Phase 7 COMPLETE** — external agent integration substrate ready.

## Phase 8 Sequence (STARTED 2026-06-04)

```
Phase 8A — Planning Gate / Integration Order Decision ✅ (PASS)
  → 5 options evaluated, Fake E2E dry run chosen first
  → Real Hermes/Echo blocked (no endpoint), Real OpenClaw/Tripp blocked (Control crashed)

Phase 8B — Fake E2E Dry Run Harness ✅ (PASS, commit 15c7b2d)
  → tripp agents dry-run: CLI → packet → gate check → fake dispatch → trace → Warden
  → 30 new tests, 155 total passing
  → Wires existing primitives, no parallel pipeline

Phase 8C — Dry-Run Gap Closure ✅ (PASS, commit 6048dd3)
  → Server read-back (same functions routes call): inbox/outbox/reviews/trace queryable
  → Dashboard read visibility: read model functions, trace types, review fields
  → Block/escalate verdict coverage: safetyFindings/issues accepted, empty rejected
  → Root cause chain: linked events (6-depth), middle-only, self-only, rootCause priority
  → Boundary checks: no live transport tokens, no mutation events, read-only ops
  → 30 new tests, 185 total passing
Phase 8D — Real Hermes/Echo Transport Planning Gate ✅ (PASS, commit 6048dd3 follow-on)
  → Planning-only: endpoint requirements, transport boundary, ApprovalGate safety, trace safety, config safety
  → Verdict: real transport BLOCKED until Echo endpoint confirmed + PC online + WoL set up
  → Schema gap: openclaw_echo exists but Echo migrated to Hermes → hermes_echo added in 8E

Phase 8E — Disabled Hermes/Echo Transport Skeleton ✅ (PASS, commit d3a0dd4)
  → hermes_echo added to ExternalAgentRoleSchema + AGENT_DEFAULTS (local_audit_warden)
  → dispatchToRealAgent() stub — always returns status: "blocked"
  → dispatchRoute() — mode-based routing (fake/manual/live/disabled)
  → 31 new tests, 216 total passing
  → No network calls, no secrets, no external processes
  → Schema: dispatchToRealAgent only works with config.enabled=true, config.mode="experimental_live"
  → See `references/phase8e-disabled-transport-skeleton.md`

Phase 8F — Transport Readiness + Named-Agent/Adapter Separation Audit ✅ (PASS, commit ac2685c)
  → Audit-only: verified fake/manual coverage (91+ tests), disabled transport safety, ApprovalGate/Warden/trace/dashboard protection
  → Key finding: provider-specific role keys conflate identity with runtime (MEDIUM risk)
  → Decision: Phase 8 safe to pause — 0/10 real transport prerequisites met
  → Named-agent/adapter separation recommended (→ Phase 8G)

Phase 8G — Named-Agent / Adapter Separation Correction ✅ (PASS, commit 2c36db5)
  → Added NamedAgent (tripp, cyony, echo) — provider-agnostic, stable identity
  → Added BackingAdapter (fake, manual, hermes, openclaw) — separate from identity
  → Added AgentIdentity + resolveAgentIdentity() + normalizeAgentIdentity()
  → ROLE_IDENTITY_MAP: all 4 provider keys → stable identities
  → 35 new tests, 251 total passing
  → Provider-specific keys preserved as compatibility aliases only
  → See `references/phase8g-named-agent-adapter-separation.md`

Phase 8H — Final Closure Audit ✅ (PASS, commit 31620a3)
  → Read-only audit: fake/manual E2E coverage, server/dashboard read-back, root-cause chain, ApprovalGate safety
  → 251/251 tests passing. Phase 8 CLOSED.

Phase 8-I — Package/Timeout Handling Audit ✅ (PASS, 2026-06-06, Cyony/Oni)
  → Read-only audit: package handling, timeout behavior, runtime queue safety, agent-bus boundaries
  → 251/251 tests passing. Lockfile clean. No live-agent risk. No command-execution risk.
  → Decision: TRIPP_REASON_PACKAGE_TIMEOUT_AUDIT_PASS_READY_FOR_NEXT_REASON_GATE
  → See `references/read-only-audit-pattern.md` for audit template

Phase 8-J — Typecheck Triage + Package Script Coverage + Timeout Hardening Chain ✅ (PASS, 2026-06-06, Cyony/Oni)
  → 4-stage chained audit (2A→2B→2C→2D), all passing, no blockers
  → Stage 2A: 10 typecheck errors resolved (test-only `!` assertions on optional metadata)
  → Stage 2B: Package test script coverage accepted as-is (CLI is integration harness)
  → Stage 2C: All runtime timeouts verified bounded, timers cleared, fail-closed
  → Stage 2D: Consolidation — READY_FOR_NEXT_REASON_IMPLEMENTATION_GATE
  → 4 test files modified (+10/−10 lines), 5 reports created
  → See `references/chained-audit-pattern.md` for the chain template

Phase 8J — Real Hermes/Echo Transport (BLOCKED: Echo endpoint unknown, PC offline, WoL not set up)
Phase 8I — Real OpenClaw/Tripp Transport (BLOCKED: Tripp.Control crashed Stage 9D)
Phase 8J — Dashboard UX Hardening (deferred)
Phase 8K — Final Phase 8 Audit + Rebaseline
```

## Dry Run Harness Pattern (Phase 8B)

When proving a multi-component pipeline with fake dependencies:
1. Wire existing primitives (dispatchToFakeAgent, emitTrace, writeReviewPacket) — same functions real transport uses
2. Record gate position in trace (approvalgate_required before dispatch)
3. Keep Warden advisory-only (no mutation events)
4. Validate trace chain after run (all required event types present)
5. Test across all agent roles

## Gap Closure Pattern (Phase 8C)

After a fake E2E dry run proves the pipeline, close these gaps before real transport:

1. **Server read-back**: Call the same functions server routes call (listInboxPackets, readTaskPacket, findTraceEventsByPacketId, validateTraceLedger) — prove dry-run data is queryable through existing read paths without spinning up a server.
2. **Dashboard read visibility**: Call the same read-model functions the dashboard API client calls (listInboxPackets, listOutboxPackets, listReviewPackets, readTraceEvents) — prove dashboard panels would see dry-run state.
3. **Block/escalate verdict coverage**: The `ValidatedReviewPacketSchema` has a `blockRequiresFinding` refinement — block/escalate verdicts MUST include at least one issue or safetyFinding. Test acceptance (with findings) and rejection (without).
4. **Root cause chain**: Emit linked trace events with `parentEventId` threading, then call `findRootCauseChain()` — verify chain traversal (6-depth), middle-only ancestors, self-only for unlinked events, empty for missing IDs, and `rootCauseEventId` priority over `parentEventId`.
5. **Boundary checks**: Scan all agent bus files for forbidden tokens (fetch, XMLHttpRequest, WebSocket, EventSource), verify no mutation_applied/requested events, verify Warden stays advisory-only, verify read-only operations don't mutate state.

## Block/Escalate Verdict Schema Pitfall

The `ValidatedReviewPacketSchema` in `@tripp-os/agent-bus` has a `superRefine(blockRequiresFinding)` that rejects block/escalate verdicts with empty issues AND empty safetyFindings. Review filenames follow `review-{timestamp}-{reviewerRole}-{slug}.json` — they do NOT include reviewId. To find by reviewId, loop through `listReviewPackets()` and `readReviewPacket()` each one.

## Agent Bus API Pitfalls (Phase 8B)

| API | Wrong | Correct |
|-----|-------|---------|
| listInboxPackets | `(tmpDir)` | `({ workdir: tmpDir })` |
| listOutboxPackets | `(tmpDir)` | `({ workdir: tmpDir })` |
| readTraceEvents | `(filter, tmpDir)` | `({ workdir: tmpDir })` |
| findTraceEventsByPacketId | `(id, tmpDir)` | `(id, { workdir: tmpDir })` |
| validateTraceLedger result | `.valid` / `.errors` | `.isValid` / `.malformedLines` |
| AgentBusTraceEvent time | `.timestamp` | `.createdAt` |

File-bus + trace-ledger use options objects. Only validateTraceLedger/ensureAgentBus take plain string.

```
Phase 7A — Agent Integration Contract Lock (COMPLETE — docs-only)
Phase 7B — File-Based Agent Bus Scaffold (COMPLETE — folders + READMEs + protocol doc)
Phase 7C — Shared External Agent Packet Schemas (COMPLETE — new package, 13 schemas, 41 tests)
Phase 7D — Agent Bus CLI Commands (COMPLETE — 7 commands, 14 tests)
Phase 7E — Echo Review Workflow (COMPLETE — 3 commands, 28 tests, advisory-only)
Phase 7F — Append-Only Trace Ledger (COMPLETE — JSONL, 7 commands, 108 tests)
Phase 7G — Dashboard Agent Bus + Trace Views (COMPLETE — 9 server routes, AgentBusPanel, 108 tests)
Phase 7H — Transport Contract + Fake/Manual Adapter Spike (COMPLETE — contract doc, 6 schemas, 3 CLI commands, cloud disabled)
Phase 7I — Final Agent Integration Audit (COMPLETE — PASS, Phase 7 CLOSED)
```

**Phase 7 COMPLETE** — external agent integration substrate ready. Next: Tripp.OS extraction planning.

**jCodeMunch**: 1 type-only intra-package cycle (fakeWorkers ↔ workerRunner, non-harmful), 0 layer violations, 0 Goose code. Grade B (85.8).

## Phase 6 Sequence

```
Phase 6A — Dashboard Contract Lock (COMPLETE)
  → docs/PHASE_6_DASHBOARD_CONTRACT.md + report
  → No code (planning only)
  → Defines: UI stack (Vite+React+TS), 7 panels, server API gaps, security, approval UX, swarm dashboard dependency, implementation sequence

Phase 6B — Server API Gaps for Dashboard (NEXT)
  → Add GET /swarms, GET /swarms/:id, POST /swarms/run (P0)
  → Add GET /reports (P1, optional)
  → Server does NOT import dashboard
**Phase 6B**: Server API Gaps (swarm + reports endpoints) ✅ (31/31 smoke)

**Next**: Phase 6C — Dashboard scaffold + API client

**Swarm server runtime pattern** (Phase 6B):
  → apps/dashboard/ via Vite + React + TypeScript
  → Overview, Sessions, Reports, Approvals, Tools panels (existing routes)
  → Dashboard imports shared types only; talks to server via HTTP/SSE

Phase 6D — Live Run SSE Panel ✅
  → POST /reply SSE consumption via fetch + ReadableStream
  → 5 event type cards (message/tool_request/tool_result/finish/error)
  → Streaming text, approval polling (800ms), approve/deny inline
  → Zero new deps, zero server changes, 37 module build

Phase 6E — Dashboard Swarm Panel ✅
  → SwarmRunForm: fake-only, solo/small enabled, medium/large/max disabled
  → SwarmDetail: 8-col task table + 8-col result table + Warden + Conflicts
  → Auto-refresh list + auto-select new swarm after run
  → Zero new deps, zero server changes, 41 module build

Phase 6F — Final Dashboard Audit (NEXT)
```

**Dashboard boundary rules** (from 6A contract):
- `apps/dashboard/` (application, not library — uses Vite, not shared tsc)
- Dashboard → server (HTTP/SSE only, never direct imports)
- Dashboard → shared (types only for client-side typing)
- Dashboard ↛ core/tools/store/providers/swarm/mcp (NEVER)
- core/server ↛ dashboard (NEVER)
- 3 P0 server gaps: swarm endpoints needed before swarm panel (6B before 6E)

## Named-Agent / Adapter Separation Pattern (Phase 8G)

When provider-specific role keys (e.g., `openclaw_tripp`, `hermes_echo`) conflate named agent identity with backing runtime, separate them:

1. **NamedAgent** — stable identity that does NOT encode provider (`tripp`, `cyony`, `echo`)
2. **BackingAdapter** — provider/runtime, may change over time (`fake`, `manual`, `hermes`, `openclaw`)
3. **AgentIdentity** — resolved view: `{ namedAgent, assignedRole, backingAdapter, compatibilityAlias }`
4. **ROLE_IDENTITY_MAP** — maps legacy provider-specific keys to stable identities
5. **normalizeAgentIdentity()** — returns `{ namedAgent, backingAdapter, assignedRole, isLegacyAlias }`

**Key properties:**
- Echo's Warden role does NOT change when backing switches from OpenClaw to Hermes
- Authority rules attach to `assignedRole` (warden/auditor/trace), not provider
- Safety rules check trust zones (`local_audit_warden`), not provider-specific role strings
- Provider-specific keys remain as compatibility aliases — never removed, never expanded

**Test pattern:** 10 sections covering schema acceptance, normalization accuracy, authority independence, backward compatibility, fake/manual regression, and boundary compliance.

## Report Delivery Pattern (Eddie preference — updated 2026-06-04)

Reports are delivered as **compact code blocks in chat** (~30 lines max, condensed tables, verdict + blockers + next step only). Full report always written to disk as canonical. MEDIA file delivery is the exception — use only when Eddie asks or for handoffs to Kimi/Tripp/Echo.

## Git Drift / Checkpoint Stabilization Pattern

When a repo has significant uncommitted work (multiple phases done but never committed), use this stabilization pass before any new implementation:

```
1. AUDIT: git status, git log, pnpm test — confirm current state is passing
2. COMMIT: git add -A (exclude artifacts), commit with clear checkpoint message
3. VERIFY: git status clean, git log shows new commit
4. ROADMAP: sync stale docs (mark phases complete, add next-phase stubs)
5. PLAN: produce next-stage readiness recommendation without implementing
```

**Pitfall:** Working tree changes from Phase 3-7 with only Phase 2 commits in git means a checkout would revert to Phase 2. Always commit before starting new work. This pattern saved Tripp.Reason from losing 5 phases of code to a filesystem hiccup.

## Phase 5 Sequence

```
Phase 5A — Swarm Contract Lock (COMPLETE)
Phase 5B — Swarm Package Skeleton + Packet Types (COMPLETE)
Phase 5B.1 — Dynamic Subagent Type Addendum (COMPLETE)
Phase 5C — Worker Runner with Fake Workers (COMPLETE)
Phase 5D — Orchestrator + Merger + Warden Smoke (COMPLETE)
Phase 5E — Real ReasonLoop-backed Workers (COMPLETE)
Phase 5F — CLI Swarm Registration / tripp swarm run (COMPLETE)
Phase 5G — Final Swarm Audit (COMPLETE)
```

Key Kimi-style additions in 5B.1: SubagentSpec (dynamic, frozen), SwarmRunPlan, CriticalPathMetrics (max-wave formula), detectSerialCollapseRisk, detectSwarmSpamRisk. See `references/kimi-swarm-architecture.md`.

## jCodeMunch Audit Mandate

**Every phase-end audit uses jCodeMunch** — index the repo, run `get_repo_health`, `get_dependency_cycles` (must be 0), `get_layer_violations`, `search_text` for old branding, `check_references` for import compliance. The user expects it; don't wait to be asked.

## Phase 4 Sequence

```
Phase 4A — MCP Contract Lock (COMPLETE)
  → docs/PHASE_4_MCP_CONTRACT.md + report
  → No code (planning only)

Phase 4B — MCP Package Skeleton + Mock Server/Client (COMPLETE)
  → packages/mcp/ created (8 source files)
  → JSON-RPC 2.0 over stdio, process transport, McpClient, mock server, registry
  → Mock server exposes 2 tools: mock_echo (safe), mock_mutate (destructive)
  → Client discovers tools as McpToolInfo[] with namespaced names
  → 17/17 smoke tests PASS
  → Zero core changes

Phase 4C — MCP Tool Adapter + Schema Conversion (COMPLETE)
  → McpToolAdapter implementing Tool from shared
  → JSON Schema → Zod conversion (object, string, number, boolean, array, enum)
  → riskToRequiresApproval() helper (safe→false, everything else→true)
  → createMcpToolAdapters() factory
  → McpClient.callTool() → JSON-RPC tools/call
  → Mock server handles tools/call (mock_echo echoes, mock_mutate returns mock result)
  → 29/29 smoke tests PASS
  → Zero core changes
  → Adapter NOT registered in ToolDispatcher yet (Phase 4D)

Phase 4D — MCP Execution Through ApprovalGate (NEXT)
  → MCP tools flow through existing ApprovalGate
  → CLI approval prompt shows MCP namespace
  → Approve/deny/timeout flows

Phase 4E — Server/CLI MCP Registration
  → Config file loader, server/CLI assembly, GET /status shows MCP

Phase 4F — MCP Final Audit + Full Smoke Test
```

```
Phase 3A — Server Contract Lock
  → docs/PHASE_3_SERVER_CONTRACT.md + report
  → No code (planning only)

Phase 3B — Fastify Server Skeleton + Read-Only HTTP/SSE
  → packages/server/ created (Fastify v5)
  → 9 routes: health, status, tools, sessions, sessions/:id,
               sessions/:id/events, runs/:id, runs/:id/report, reply (SSE)
  → 5 read-only tools over HTTP: list_dir, read_file, search, git_status, git_diff
  → Mutating tools NOT registered (Unknown tool error if requested)
  → ReadOnlyApprover denies all
  → No approval queue, no /approvals routes

Phase 3B-Patch — Real-Time SSE
  → EventStream exported from runtime assembly
  → reply route subscribes to EventStream BEFORE calling reasonLoop.run()
  → Events forwarded to SSE client synchronously during run
  → heartbeat every 15s, disconnect detection, controlled error events

Phase 3C — HTTP Approval Queue (COMPLETE)
  → ApiApprover + in-memory ApprovalQueue
  → GET /approvals + POST /approvals/:id/resolve
  → All 9 tools registered over HTTP
  → Async approval via unresolved Promise (see pattern below)
  → 35/35 smoke tests PASS
  → Zero core changes required

Phase 3D — CLI Serve + Chat (COMPLETE)
  → tripp serve: Fastify server foreground, SIGINT/SIGTERM handlers
  → tripp chat: HTTP/SSE client, interactive + --once mode
  → SSE client: AsyncGenerator parser, heartbeat passthrough
  → Approval prompts: --approve (terminal y/N), --deny-all (auto-deny)
  → serverClient.ts: typed fetch wrappers (health/postReply/getApprovals/resolveApproval)
  → CLI depends on @tripp-reason/server (assembly-layer direction)

Phase 3E — Final Server Audit / Phase Closeout (COMPLETE)
  → Comprehensive 47-assertion smoke test across 7 suites
  → Routes: all 11 verified (200/400/404/413 responses)
  → CLI: --help for all 4 commands (tripp, run, serve, chat)
  → SSE: verified event/error/finish frame flow
  → Approvals: fail-close verified (404 nonexistent, 400 bad body)
  → Security: no secrets in /status, CORS restricted, 1MB body cap, 5min auto-deny timeout
  → Negative paths: 10/10 handled (missing server, bad prompt, oversized body)
  → Documentation: README + ROADMAP updated with Phase 3 completion
  → No server banner pollution on CLI commands (serve index.js now barrel-only)
```
```

## Real-Time SSE Pattern (Phase 3B-Patch)

For adding SSE streaming to a synchronous ReasonLoop:

```typescript
// 1. Export EventStream from runtime assembly
return { repos, dispatcher, eventStream, reasonLoop, runManager, config };

// 2. In the SSE route: subscribe BEFORE running the loop
const unsub = runtime.eventStream.subscribe((event: StreamEvent) => {
  if (!sse.closed) sse.writeEvent(event);
});

// 3. Run the loop (blocks, but events emit synchronously via EventStream)
const result = await runtime.reasonLoop.run({ prompt, ... });

// 4. Cleanup
unsub();
clearInterval(heartbeat);
sse.end();
```

**Why this works:** EventStream uses synchronous emit — subscriber callbacks fire in the same event loop tick. While `await reasonLoop.run()` is pending, `runManager.recordEvent()` → `eventStream.emit()` happens synchronously during the run, and the subscriber forwards to SSE immediately. This is true live streaming, not post-hoc event fetching.

## Async HTTP Approval Pattern (Phase 3C)

For adding an HTTP approval queue to a synchronous ReasonLoop — with ZERO core changes:

```typescript
// 1. ApiApprover wraps ApprovalQueue. requestApproval() returns
//    an UNRESOLVED Promise. ReasonLoop's existing await blocks naturally.
class ApiApprover implements Approver {
  constructor(private queue: ApprovalQueue) {}
  async requestApproval(req: ApprovalRequest): Promise<ApprovalResult> {
    const { promise } = this.queue.enqueue({ ...req, sessionId, runId });
    return promise;  // unresolved! ReasonLoop pauses here.
  }
}

// 2. ApprovalQueue holds items with resolve functions.
//    Operator calls POST /approvals/:id/resolve → resolve() → ReasonLoop resumes.
class ApprovalQueue {
  enqueue(req) {
    let resolve;
    const promise = new Promise(r => { resolve = r; });
    const item = { id, ...req, _resolve: resolve, status: "pending" };
    // Auto-deny on timeout:
    setTimeout(() => this.resolve(id, { approved: false, reason: "timed out" }), 5 * 60 * 1000);
    return { item, promise };
  }
  resolve(id, result) {
    item._resolve(result);  // ← this unblocks ReasonLoop
  }
}
```

**Why zero core changes:** ReasonLoop already does `await approvalGate.check(request)`. The Approver interface returns `Promise<ApprovalResult>`. When ApiApprover returns an unresolved Promise, ReasonLoop naturally pauses at that await. When the operator resolves the approval, the Promise fulfills, and ReasonLoop continues. No refactoring, no new lifecycle hooks, no core imports of server code.

**Setup order:**
1. Export `approvalQueue` from `assembleRuntime()`
2. Register `approvalsRoute(app, queue)` in `createServer()`
3. Use all 9 tools in the dispatcher (not just 5 read-only)
4. /status shows `pendingApprovals: queue.pendingCount`

## Phase-Close Documentation Pattern (Phase 2F confirmed)

When closing a phase, update exactly these files — no more, no less:

1. **README.md** — Status line at top, tool list, safety model, quick start (env vars + example commands), current limitations (honest about what's not yet built), phase history summary
2. **ROADMAP.md** — Add `✅ (COMPLETE)` to the phase header. Add 3-5 line delivery summary with key metrics (e.g., "9 tools, 49/49 smoke assertions PASS")
3. **Safety/domain doc** (PHASE_2_MUTATION_SAFETY.md or equivalent) — Replace all ⏳ with ✅. Replace "prerequisites" language with "activation status" language. Add a confirmation table citing the smoke test that proved each property.

**Don't touch** ARCHITECTURE.md or DOCTRINE.md unless grep reveals actual drift. These are structural docs — they describe the system shape, not activation state. If you find yourself wanting to update them, ask: "did the architecture actually change, or just the roster?"

## Smoke Test Pattern

## Smoke Test Pattern
Every phase ends with a smoke-test.mjs in the package dir, run after build:
- Use `node packages/<pkg>/smoke-test.mjs` (direct dist imports, no tsx)
- Use temp workdirs (`/tmp/tripp-<pkg>-smoke-${Date.now()}`) for fs tests
- Use `:memory:` SQLite for store tests
- Use mock fetch for provider tests (simulate SSE chunks)
- Always delete smoke-test.mjs after passing — it's not permanent
- Verify at end: `ls -d packages/*/` — only allowed packages exist

## Recurring tsconfig/Dependency Pitfalls (hit every phase)
| Phase | Issue | Fix |
|---|---|---|
| 1B (store) | Drizzle 0.38 nullable col inference | `as any` cast on `values({...})` — see "Drizzle 0.38 Deep Dive" below |
| 1D (providers) | `fetch`/`Response`/`TextDecoder` unknown | Add `"lib": ["ES2022", "DOM", "DOM.Iterable"]` to pkg tsconfig |
| 1E (tools) | `node:fs/promises`/`node:path`/`Buffer` unknown | Add `@types/node` devDep + `"types": ["node"]` |
| 1F (loop) | ApprovalGate type mismatch when passing approver separately | ApprovalGate wraps approver at creation — don't pass approver to ReasonLoop, pass the already-built gate |
| 1G (CLI) | Provider config field `model` doesn't exist | It's `defaultModel` in `OpenAICompatibleConfig`. Check the actual type, not the intuitive name |
| 1G (CLI) | `createEventManager` / `initSqliteStore` / `createToolDispatcher` don't exist | Real names: `createEventStream`, `initDb`, `createDispatcher`. **Read the actual `packages/*/src/index.ts` barrel BEFORE writing CLI wiring code** |
| 2C (CLI) | "no exported member 'runTestsTool'" | `pnpm --filter @tripp-reason/tools build` must run before CLI typecheck — CLI reads tools dist |
| 2D (tools) | Regex chaining detection catches `>` in JS arrow functions | Redesign: exact-match on standalone args only. Regex containment is wrong for `shell: false` |
| 4B (mcp) | New package with Node built-ins fails typecheck | Add `@types/node` devDep to package.json AND rerun `pnpm install` (may need `echo "y" |` for rebuild prompt) |
| 4B (mcp) | `override` modifier on Error.cause breaks ES5 target | Remove `override` keyword — use `public readonly cause?: unknown` without override |
| 4B (mcp) | `as JsonRpcMessage` cast rejected by strict mode | Use double cast: `as unknown as JsonRpcMessage` |
| 4B (mcp) | Smoke test `.ts` not compiled to dist | Run from source with `npx tsx packages/mcp/src/smokeTest.ts` |
| 4B (mcp) | `pnpm` not found in npm scripts | Export PATH: `export PATH="/usr/share/nodejs/corepack/shims:$PATH"` before pnpm commands |
| 5E (swarm) | `ApprovalGate` imported from `@tripp-reason/shared` but doesn't exist there | `ApprovalGate` is exported from `@tripp-reason/core`, not `@tripp-reason/shared`. Shared exports `Approver` (interface) + `ApprovalRequest`/`ApprovalResult` (schemas); core exports `ApprovalGate` (class) + `createApprovalGate` |
| 5E (swarm) | `store.initDb(":memory:")` destructured as `{ db, repos }` | `initDb()` returns `TrippDb` (Drizzle-wrapped db) only. Call `store.createRepositories(db)` separately to get `Repositories`. Pattern: `const db = store.initDb(":memory:"); const repos = store.createRepositories(db);` |
| 5F (swarm) | `getWorkerCapForMode(mode)` returns `{ min, max }` not `number` | Dereference `.max` on the returned object: `const cap = getWorkerCapForMode(mode); const maxCap = cap.max;` |
| 5F (swarm) | `TS2802: Type 'Set<string>' can only be iterated through when using '--downlevelIteration'` | Wrap Sets in `Array.from()` before iterating: `for (const f of Array.from(allFiles))`. Affects CLI (`tsconfig.json` targets ES2020 which lacks Set iteration). |
| 5F (swarm) | Commander subcommand nesting: `tripp swarm run` | Use `program.command('swarm').command('run')` pattern (not `program.command('swarm run')`). Each nested command gets its own `.description()` and `.action()`. Flags go on the innermost command. |
| 5F (swarm) | `execSync` error output goes to stderr, lost in catch block | Pipe stderr to stdout in the shell command: `node cli/dist/index.js ${args} 2>&1`. This ensures all output is captured in `execSync` result on both success and failure paths. |
| 6B (swarm) | Server smoke test: `loadConfig()` takes zero arguments — reads `process.env` only | Set env vars BEFORE importing config module: `process.env.TRIPP_SERVER_PORT = "13031"; ...` then `const config = loadConfig()`. Do NOT pass an options object. |
| 6B (swarm) | Route module parameter: `swarm` variable not found in function body after rename | When duck-typing route modules, rename the parameter consistently everywhere: function parameter AND all usages in the body. Prefer a single unambiguous name like `swarmRouter`. |
| 6B (swarm) | `as JsonRpcMessage` cast rejected by strict mode | Use double cast: `as unknown as JsonRpcMessage` |
| 7C (external-agents) | New package with vitest: test files fail `tsc --build` | Exclude `src/__tests__` in tsconfig.json. Vitest handles its own TS compilation — `tsc --build` only compiles production source. Pattern: `\"exclude\": [\"dist\", \"node_modules\", \"src/__tests__\"]` |
| 7C (external-agents) | `@types/node` not found for `node:fs/promises` | Add `\"@types/node\": \"^20.0.0\"` as devDep. `pnpm install` resolves it automatically. Other packages (cli, mcp, server, tools) already have it. |
| 7C (external-agents) | Filename collisions | Add random hex suffix: `crypto.randomBytes(4).toString("hex")` |
| 8E (transport) | `createDefaultTransportConfig(role, experimental_live)` throws ZodError | Default sets `enabled: false` for experimental_live — schema requires `enabled: true`. Use explicit config with `enabled: true`. Stub still blocks. |
| 8E (transport) | `dispatchRoute` not found after source change | Rebuild dist: `pnpm --filter @tripp-os/agent-bus build` — package uses `main: ./dist/index.js` |

### Drizzle 0.38 Deep Dive
The nullable column bug manifests as TypeScript claiming a field doesn't exist in `$inferInsert`. The intuitive fix — adding `.nullable()` to the column — fails because the method doesn't exist in Drizzle 0.38's SQLite driver. When you try it, the errors that come back are **not from your code** — they're from Drizzle's bundled MySQL/Postgres/SingleStore type definitions bleeding through the SQLite type layer. This looks like a huge type error storm but isn't.

**The right fix**: `as any` on the `.values({...} as any)` call. Add a one-line comment above it. Runtime behaves correctly (SQLite accepts both null/undefined), and Zod validates at the boundary. Don't spend cycles trying to fix the type system — it won't help.

## Smoke Test Recipe
Phase 1 smoke tests: throwaway `.mjs` scripts deleted after passing. Phase 2E+ smoke tests: permanent `tmp/smoke-test-<phase>.mjs` scripts kept for repeatability.

**Phase 1 pattern (throwaway):**
1. `pnpm build` (must build dist/ before smoke test can import from `./dist/index.js`)
2. Write `<package>/smoke-test.mjs` with direct `./dist/index.js` or `../other/dist/index.js` imports
3. Run `node <package>/smoke-test.mjs`
4. **`rm` the smoke test file BEFORE writing the report** (it's not permanent infrastructure)
5. Document test count and what each test exercised in the report

See `references/smoke-test-pattern.md` for the actual mock-provider/dispatcher/SQLite boilerplate you can copy-paste between phases.

## Templates

- **`templates/contracts-smoke-test.template.ts`** — Reusable vitest smoke test for contracts/interface-only packages. Covers version constants, status enum exports, interface shapes, StreamEvent validation, and no-leakage checks. Copy, replace enum/interfaces lists, and run.

## Reference Files
- **`references/smoke-test-pattern.md`** — Mock provider, mock dispatcher, in-memory SQLite, temp workdir w/ auto-cleanup patterns used across Phases 1B–1F
- **`references/cross-package-assembly.md`** — Ritual for reading barrel exports before writing CLI/server wiring code (prevents the wrong-name trap from Phase 1G)
- **`references/kimi-swarm-architecture.md`** — Kimi Moonshot swarm architecture reference (dynamic subagents, frozen workers, critical-path metrics)
- **`references/phase5e-reasonloop-smoke-pattern.md`** — Phase 5E ReasonLoop worker integration pattern: in-memory DB + FakeProviderAdapter variants + mock ToolDispatcher + key pitfalls (initDb shape, ApprovalGate source, Drizzle close)
- **`references/phase6b-server-swarm-pattern.md`** — Phase 6B server swarm assembly: in-memory registry, duck-typed routes, safety gates, server smoke test config (loadConfig/process.env), /status additions
- **`references/phase6c-dashboard-scaffold-pattern.md`** — Dashboard build patterns (Phases 6C+6D): Vite+React+TS app under apps/, workspace setup, API client pattern, CSS design system, panel template, SSE parser + LiveRunPanel + approval polling, validation check commands, pitfalls
- **`references/echo-review-report-template.md`** — Phase 7E Echo review report standard template: required sections (Identity, Source Result, Issues, Findings, Approval Boundary, Next Action), verdict rules, mandatory advisories
- **`references/trace-ledger-pattern.md`** — Phase 7F append-only trace ledger build pattern: schemas → helpers → CLI → auto-emission, best-effort emitTrace wrapper, validation-before-append guard, JSONL storage model, convenience command delegation, automatic event emission wiring table

- `references/phase7g-dashboard-agentbus-pattern.md` — Phase 7G dashboard Agent Bus + trace view pattern: server routes (9 /agents/* endpoints, safeAgentPath), dashboard layer (types → API client → AgentBusPanel → CSS → App.tsx wiring), detail pane, chain view, pitfalls
- `references/phase7h-transport-contract-pattern.md` — Phase 7H transport contract + fake adapter spike: schemas (6 schemas with safety validators), helpers (createDefaultTransportConfig, dispatchToFakeAgent, dispatchToManualFileTransport), CLI commands (defaults, dispatch, status), pitfall: no live transport implementation
- `references/phase7i-final-audit-pattern.md` — Phase 7I audit-only phase pattern: build→test→structure→imports→safety→traceability→report. Pitfalls: no feature addition, no scope expansion, run ALL tests, surgical fixes only
- `references/phase8b-dry-run-harness-pattern.md` — Phase 8B dry run harness: wire existing primitives, 6 required trace events, API pitfalls, 10-section test pattern
- **`references/phase8c-gap-closure-pattern.md`** — Phase 8C gap closure: server read-back, dashboard visibility, block/escalate verdict schema pitfall, root cause chain, boundary checks
- **`references/phase8e-disabled-transport-skeleton.md`** — Phase 8E disabled-by-default transport pattern: schema extension (hermes_echo), agent defaults, always-blocked stub, dispatch router, safety tests (31 tests), pitfalls (must set enabled:true + mode:experimental_live for dispatchToRealAgent tests; hermes_echo requires rebuilding @tripp-os/agent-bus dist after schema changes)
- `references/tripp-os-extraction-audit-pattern.md` — Tripp.OS extraction readiness audit: dependency truth matrix, Reason-specific coupling scan, classification (EXTRACT NOW/AFTER CLEANUP/LATER/KEEP), Tripp.Control compatibility mapping, staged extraction plan, Phase 7I proven methodology
- `references/tripp-os-extraction-power-audit.md` — Stage 4 post-extraction boundary power audit pattern: SHA-256 file identity check, cross-package duplicate export scan, duplicate classification taxonomy (compatibility alias/shim/divergent), import path preservation audit, forbidden content scan, 10-step audit methodology, report template
- `references/read-only-audit-pattern.md` — Read-only safety/readiness audit template for Tripp.Reason: 19-section format, decision tokens, inspection commands, report format, and pitfalls. Used for Phase 8F, 8H, and 8-I audits.
- `references/api-client-reconstruction-20260616.md` — Full reconstruction of `api_client.rs` after secrets cleanup: damage report, reverse-engineered API surface, feature gate map, error cascade pattern, and build fixes applied. Use as reference when recovering from similar Rust codebase scrubs.
- `references/chained-audit-pattern.md` — Multi-stage chained audit pattern (N-A→N-B→N-C→N-D): stop conditions, decision tokens per stage, allowed/forbidden per stage, common stage types (typecheck triage, package script coverage, timeout hardening, consolidation), pitfalls. Used for Phase 8-J timeout chain.

General rule: root `tsconfig.base.json` has `"lib": ["ES2022"]` only. Each package that needs DOM or Node APIs must add its own lib/types override — don't try to fix this in base.

Always run: `pnpm install && pnpm build` (not just typecheck) to verify dist output exists for downstream smoke tests.

## Gated Contracts Pattern (Phase 1E established, retired by Phase 2D)
Tools/behaviors that WILL exist in Phase 2+ but aren't active yet:
- Define the Tool with full Zod input schema (future-proof contract) in `gatedContracts.ts`
- Set `requiresApproval: true`
- `execute()` returns `{ status: "error", error: "<name> is a gated contract..." }`
- Do NOT register in active dispatcher — prevents accidental routing
- Document in phase report as "gated contract-only"

**Retirement lifecycle** (Phase 2C/2D confirmed):
1. Real implementation goes in dedicated file (e.g., `writeFile.ts`, `shell.ts`)
2. Stub removed from `gatedContracts.ts`
3. Real tool exported from `index.ts` and added to `activeTools` array
4. Real tool imported in CLI `runCommand.ts` and registered in dispatcher
5. `gatedContracts.ts` becomes empty placeholder when all tools activated

## Rust Build (VPS — no libclang, no OpenSSL)

The `local-inference` default feature pulls in `llama-cpp-2` which requires `libclang` (bindgen). This VPS does NOT have libclang installed. **Always build without local-inference:**

```bash
cd /opt/data/Tripp.reason
cargo build --release --no-default-features -F "code-mode,rustls-tls"
```

Use `rustls-tls` (pure Rust, no system deps) — NOT `native-tls`. This VPS lacks both `pkg-config` and `libssl-dev`, and we don't have root to install them. `rustls-tls` is the default in the crate's feature list and compiles without any system dependencies.

Do NOT use `-F code-mode` alone — you need both `code-mode` AND a TLS feature. Without one, the build fails with "At least one of rustls-tls or native-tls features must be enabled."

**Feature gate dependency chain**: `native-tls` → `pem`, `pkcs1`, `pkcs8`, `sec1` (all optional deps). The `convert_key_to_pkcs8_pem` function and its tests are gated behind `#[cfg(feature = "native-tls")]`. When building with `rustls-tls`, this code path is NOT compiled — so the optional key-conversion crates are never imported.

## Secrets Cleanup Recovery Pattern

When a repo has been force-pushed after scrubbing exposed secrets (private keys, tokens, PEM blocks), the cleanup often leaves structural damage:

1. **Stray closing braces** — test functions that contained secret constants get deleted but their closing `}` remains, causing "unexpected closing delimiter" errors.
2. **Missing trait/struct definitions** — types like `AuthProvider` trait and `OAuthConfig` struct that were defined alongside scrubbed constants get removed too, but consumers still reference them.
3. **Missing impl blocks** — entire `impl ApiClient { ... }` blocks can be scrubbed if they contained auth logic near secrets. All methods disappear: `new()`, `with_timeout()`, `request()`, `response_get()`, `response_post()`, `api_post()`.
4. **Missing helper structs** — `RequestBuilder`, `ApiResponse` wrapper types that support the API client disappear.
5. **Missing internal functions** — `convert_key_to_pkcs8_pem` and similar utility functions get scrubbed if they processed PEM content.
6. **Feature-gate breakage** — scrubbed functions that were gated behind `#[cfg(feature = "native-tls")]` lose their gates, causing import errors for optional crates (`pem`, `pkcs1`, `pkcs8`, `sec1`).
7. **Recovery workflow**:
   - Run `cargo build` to surface errors — the error count can be 120+ from cascading type failures
   - Categorize errors by type: `grep "^error\[" | sort -u` to see distinct error classes
   - For missing types: grep consumers (`grep -rn "TypeName" crates/`) to reverse-engineer trait signatures and struct fields
   - For missing methods: grep the codebase for usage patterns to reconstruct the full API surface
   - For stray braces: read surrounding context ±40 lines to understand block structure
   - Reconstruct minimal definitions — dead-code variants (`#[allow(dead_code)]`) can be stubs
   - Gate scrubbed functions behind their original `#[cfg(feature = "...")]` if they depend on optional crates
8. **Rust edition linter false positives**: The inline linter may report "async fn is not permitted in Rust 2015" for code using `#[async_trait]`. Ignore these — the actual `cargo build` uses the Cargo.toml edition (2021) and compiles correctly.
9. **Build iteration**: Expect 4-6 build cycles. Each cycle fixes a layer of errors, revealing the next layer. Don't get discouraged by 100+ error counts on early cycles — they cascade from a few missing definitions.

## Pitfalls
- Don't use `node-fetch` or `axios` — Node 20+ has native `fetch()`
- Mock fetch for smoke tests — no need for live API calls during build
- Ollama Cloud quota gets burned by crew usage — check before live tests; mocked equivalent is sufficient for phase PASS
- Drizzle insert `as any` is permanent pattern — don't try to fix in later phases
- Auto-linter `tsc: Permission denied` errors in write_file output are spurious — ignore, real build via `pnpm typecheck` works fine
- `write_file` in smoke tests needs `.mjs` extension and direct `./dist/index.js` imports (workspace: aliases don't resolve in standalone scripts)
- **Before writing any CLI/wiring code that imports from 5 packages, READ every `packages/*/src/index.ts` barrel** — intuitive names are almost always wrong (createEventManager vs createEventStream, initSqliteStore vs initDb, createToolDispatcher vs createDispatcher). Hit this twice in 1G.
- `Approver.requestApproval(ApprovalRequest)` returns `Promise<ApprovalResult>` (discriminated union), NOT `Promise<boolean>`. CliApprover got this wrong first pass.
- ReasonLoop returns `reportPath: undefined` — design choice from 1F. CLI must query `repos.getReportByRun(runId)` after the run for the path.
- Gated tools (write_file, edit_file, shell in Phase 1E) are **defined but NOT registered** in active dispatcher. Do not wire them into ToolDispatcher.createDispatcher() in Phase 1G or later phases unless Phase 2 explicitly unlocks them.
- **`pnpm --filter <pkg> build` MUST run before `pnpm typecheck`** when downstream packages import from built dist. CLI imports from `@tripp-reason/tools` dist — if tools isn't rebuilt after adding new exports, CLI typecheck fails with "no exported member 'newTool'". Order: `pnpm --filter @tripp-reason/tools build && pnpm typecheck && pnpm build`.
- **Fail-closed approval pattern** (Phase 2C): ReasonLoop must use `if (tool.requiresApproval) { if (!gate) FAIL; else check; }` — NOT `if (requiresApproval && gate) check`. The latter silently skips approval when gate is missing, which is a safety hole.
- **Command safety chaining detection** (Phase 2D): Use exact-match on standalone args (e.g., `args: ["&&"]`), NOT regex substring on all content. Regex matching `>` catches JavaScript arrow functions in `node -e` code. With `shell: false` (spawn), embedded operators in code are safe — only standalone args are dangerous.
- **GatedContracts.ts retirement pattern**: New tools start as stubs in gatedContracts.ts. When activated in a later phase, real implementation goes in its own file (writeFile.ts, shell.ts), stub removed from gatedContracts.ts, and tool added to `activeTools` array. gatedContracts.ts becomes empty when all tools activated.
- **Git repo must exist before git tools work** (Phase 2B): git_status/git_diff return "Not a git repository" if no `.git` exists. Run `git init && git commit` before testing git tools.
- **Tool call persistence gap** (Phase 2E): ReasonLoop records `tool_result` StreamEvents but the store has a separate `tool_calls` table. The reportGenerator queries `listToolCallsByRun()` — not `listEventsByRun()`. If ReasonLoop doesn't call `repos.createToolCall()`, the report's TOOL CALLS section is always empty. Fix: add `recordToolCall` to RunManager (interface + implementation), wire into ALL return paths of handleToolRequest — success AND every error path. Otherwise approved-denied dispatch looks the same as no-tool-called.
- **Smoke test self-deletion** (Phase 2E): If the smoke test `.mjs` lives INSIDE the temp workdir it `rm -rf`s at startup, the script deletes itself and subsequent runs fail with MODULE_NOT_FOUND. Place smoke script one level ABOVE the cleanup target: `tmp/smoke-test.mjs` with workdir `tmp/phase-2e/`.
- **Report file path extraction** (Phase 2E): Tool results use ToolResult shape `{ status, output: { path, ... } }`, not bare `{ path }`. The report generator's `extractFilesChanged` must check BOTH `result.path` (flat) AND `result.output.path` (nested) or file changes won't appear in reports' FILES CHANGED section.
- **Smoke test imports** (Phase 2E): Workspace aliases (`@tripp-reason/*`) don't resolve in standalone `.mjs` scripts. Use dynamic imports with absolute paths to compiled output: `await import(\`${REPO}/packages/core/dist/index.js\`)`. Always `pnpm build` before running the smoke test.
- **Don't chain individual patches for repetitive code** (Phase 2E lesson): When adding the same pattern to N identical error/return paths (e.g., wiring `recordToolCall` into 8 return branches of `handleToolRequest`), use a single `execute_code` block with `read_file` + Python string manipulation to apply the pattern everywhere at once. Individual `patch` calls for each return path wastes turns and frustrates the operator. This is what Eddie meant by "struggle session."
- **Server barrel export vs entry point** (Phase 3D): `packages/server/src/index.ts` serves dual purpose — it's both the `main` entry point for `node packages/server/dist/index.js` AND the barrel export for `import from "@tripp-reason/server"`. If you add `main()` auto-run to index.ts, it fires during EVERY CLI command (not just `tripp serve`) because the imports are loaded at parse time. Fix: separate barrel exports from auto-run code — use a guard like `if (process.argv[1]?.endsWith("index.js")) main()` OR remove auto-run entirely (CLI's `executeServe()` calls `startServer()` directly, so the auto-run is only for manual server start). The former is cleaner for direct server invocation; the latter is cleaner for CLI-only use.
- **Server typecheck noise is NOT real errors** (Phase 3B lesson): Adding a new server package brings Drizzle + pino type noise from `node_modules/` into the lint output. These are NOT errors in your code — `skipLibCheck: true` in `tsconfig.base.json` already suppresses them during actual `tsc`. Run `pnpm typecheck` and grep for `error TS` in `packages/` — if only `node_modules/` errors appear, typecheck is clean.
- **Server bootstrap in smoke tests** (Phase 3E lesson): `loadConfig()` takes ZERO arguments — it reads exclusively from `process.env`. Set env vars via `process.env.TRIPP_* = value` BEFORE calling `loadConfig()`. The function to start the server is `startServer(config)`, not the barrel `index.js` (which is just a re-export file). For standalone test server launchers, import from `packages/server/dist/config.js` and `packages/server/dist/server.js` separately.
- **CLI entry point is dist/index.js, NOT dist/main.js** (Phase 3E lesson): `main.js` exports `createCLI()` but never calls `.parse()`. Only `index.js` calls `createCLI().parse()` and is the actual bin entry. When testing CLI commands via `node`, use `packages/cli/dist/index.js`.
- **ESM .mjs smoke tests: import, not require** (Phase 3E lesson): `.mjs` files use ES module syntax. `require("node:fs")` fails with "require is not defined" — use `await import("node:fs")` instead. Same for all Node built-in modules.
- **Phase reports are MD file attachments, not inline** (Eddie preference): Write report to `reports/phase-N-report.md`, then reply with `MEDIA:/path/to/report.md` + a 1-2 line summary. Do NOT paste the full markdown report inline — it's for download/sharing with planners.
- **Status route activeTools is an array, not a number** (Phase 3E lesson): `GET /status` returns `activeTools: ["list_dir", "read_file", ...]` (string array of tool names), not an integer count. Assert `Array.isArray(status.json?.activeTools)` in smoke tests.
- **Smoke test script placement** (Phase 3E lesson): Place smoke scripts in `tmp/` with the phase prefix (e.g., `tmp/phase3e-smoke.mjs`). Use dynamic imports with absolute paths to compiled dist. Always `pnpm build` before running. Use `tmp/phase3e-test-server.mjs` as a separate launcher that the smoke script doesn't try to start itself — decouple server lifecycle from test assertions for reliability.
- **Dashboard phase: response truncation at ~10+ file writes per turn** (Phases 6C+6D lesson): When creating 15+ new files in a dashboard scaffold phase, the response text gets truncated mid-sentence (context window overflow from many write_file calls). The files ARE written to disk (tool calls complete before truncation), but the human-readable summary is lost. **Fix**: limit dashboard implementation phases to ~6 file operations per turn. Spread large file-creation phases across multiple turns or use `execute_code` to batch writes programmatically. 3 creates + 3 patches = fine; 22 creates in one turn = truncated response.
- **SSE POST /reply vs EventSource** (Phase 6D): Server uses POST /reply for streaming, not GET. Browser `EventSource` only supports GET — must use `fetch()` + `ReadableStream` + manual text/event-stream parsing.
- **Approval polling cleanup** (Phase 6D): When polling approvals during a live run, the interval must clear when run status changes. Use `useEffect` return cleanup function: `return () => clearInterval(id)`. Don't let polling continue after run finishes/stops.
- **Dashboard never imports @tripp-reason/* packages** — all data flows through HTTP/SSE. Define local types in `api/types.ts` that mirror server shapes. Re-grep for `from '@tripp-reason` before every phase report.
- **Swarm panel typed sub-interfaces** (Phase 6E): Replace `unknown[]` types with proper `SwarmTaskPacket`, `SwarmResultPacket`, `SwarmWardenVerdict`, `SwarmConflict` interfaces in `api/types.ts`. Tables need typed fields — `as any` casts don't work for array `.map()` callbacks.
- **Medium/large/max shown disabled, not hidden** (Phase 6E): Use `disabled` attr + `🔒` icon + `title` tooltip explaining the blocker. Honest roadmap visibility > hiding options.
- **Auto-select new swarm after fake run** (Phase 6E): `runFakeSwarm()` returns the created swarm ID. Immediately call `viewDetail(result.id)` so the operator sees results without clicking.

- **Contract-only phases produce docs, not code** (Phase 7A lesson): When a phase introduces external systems Tripp.Reason doesn't control (OpenClaw, Hermes), lock the contract BEFORE any scaffold. Output: a comprehensive contract doc + a sub-phase breakdown in ROADMAP.md. No packages, no package.json, no dependencies. The contract defines roles, trust zones, packet contracts, transport options, safety rules, and the implementation sequence. Pattern: 1 purpose → 2 non-goals → 3 agent roles → 4 trust zones → 5 packet contracts → 6 transport options → 7 approval/safety → 8 sandbox rules → 9 security → 10 sequence → 11 testing → 12 open questions.

- **Agent bus scaffold: folders + READMEs, no code** (Phase 7B lesson): The file-based agent bus is `.tripp/agents/{inbox,outbox,reports,archive,rejected}/` with a README per folder explaining purpose, allowed/prohibited contents, and lifecycle. The root README establishes the bus as a transport-not-approval mechanism. Create the protocol doc (`docs/PHASE_7B_AGENT_BUS_PROTOCOL.md`) with 13 sections: purpose, scope, non-goals, folder layout, packet lifecycle, naming convention, content rules, role routing, approval boundary, security, failure handling, future hooks, open questions. See `docs/PHASE_7B_AGENT_BUS_PROTOCOL.md` for the full template.

- **CLI agent commands use commander subcommand nesting** (Phase 7D lesson):

- **Trace ledger build pattern: schemas → helpers → CLI → auto-emission** (Phase 7F lesson): The append-only trace ledger follows a four-layer build pattern: (1) **Schemas** (`traceSchemas.ts`): Zod schemas for event types (24 event types), severity, actor, and the validated `AgentBusTraceEvent` with runtime refinement rules (subagent events require subagentId, tools events require toolNames, root_cause_linked requires rootCauseEventId). (2) **Helpers** (`traceLedger.ts`): `createTraceEvent` (builds validated object), `appendTraceEvent` (validates then appends JSONL line — MUST validate before write, not just stringify), `readTraceEvents` (parses + validates each line, skipping malformed), `validateTraceLedger` (reports valid/malformed counts + line numbers, never rewrites), `findRootCauseChain` (walks parentEventId/rootCauseEventId backward), plus query helpers by packetId/resultId/reviewId/runId. (3) **CLI commands**: `trace append` (17 optional flags), `trace list` (filterable), `trace validate` (integrity check), `trace chain <eventId>` (causal chain), plus convenience commands (`trace packet/result/review <id>`) that delegate to `trace list` with the right filter. (4) **Automatic emission**: Inject `emitTrace()` calls into existing CLI commands — `create-task` emits `packet_created`, `archive` emits `packet_archived`, `reject` emits `packet_rejected`, `review` emits `warden_review_started` + `warden_verdict_recorded`. The `emitTrace` wrapper is best-effort: it catches all errors silently so trace failures never block the main operation. See `references/trace-ledger-pattern.md`.

- **Validation-before-append guard** (Phase 7F pitfall): When implementing a persistence helper that accepts typed objects (e.g., `appendTraceEvent(event: AgentBusTraceEvent)`), do NOT trust the type system alone — call `ValidatedSchema.parse(event)` before writing. TypeScript types are compile-time only; a caller can construct an invalid object matching the interface shape but failing runtime rules (e.g., `root_cause_linked` without `rootCauseEventId`). If `appendTraceEvent` just calls `JSON.stringify(event)` + `fs.appendFile`, invalid events silently corrupt the ledger. Fix: validate with the runtime schema and return the validated object.

- **Test imports: schemas from schema file, not helper file** (Phase 7F pitfall): When tests import both schemas and helpers, make sure schemas come from the schema module (e.g., `../traceSchemas.js`), not the helpers module (e.g., `../traceLedger.js`). `tsc` catches this at build time (TS2304: Cannot find name), but if both modules are cross-referenced, the error can be cryptic ("Cannot read properties of undefined (reading 'parse')"). Always verify: `grep "export.*Schema" src/traceSchemas.ts` to confirm which file owns the schemas. `tripp agents init|inbox|outbox|read|create-task|archive|reject` follows the same pattern as `tripp swarm run` — `program.command('agents')` creates the parent, then `agents.command('init')`, `agents.command('inbox')`, etc. nest underneath. The function that registers them (`registerAgentsCommands(program)`) is called from `main.ts`'s `createCLI()`. Each subcommand gets its own `.description()`, `.argument()`, `.requiredOption()`, and `.action()`. See `packages/cli/src/agentsCommand.ts` for the full pattern. CLI imports `@tripp-reason/external-agents` as an assembly-layer dependency — this is allowed (CLI is the wiring layer).

- **Agent-specific safe defaults per role** (Phase 7D lesson): Each agent role gets different trustZone and tool policy defaults enforced at CLI create-task time: OpenClaw Tripp → `cloud_controlled_reasoning`, Hermes Cyony → `cloud_sandbox_proposal` (no shell/write/secrets), OpenClaw Echo → `local_audit_warden`. The defaults map is `AGENT_DEFAULTS: Record<ExternalAgentRole, { trustZone: ExternalAgentTrustZone }>`. Every create-task prints explicit warnings: "NOT approval" and "NOT mutation authority."

- **Forward compatibility: trace ledger documented but NOT implemented** (Phase 7C lesson): When a future requirement (append-only event log, subagent lifecycle tracking, Warden stop events) is requested mid-sequence, document it in the phase report under a "FORWARD COMPATIBILITY" section with explicit "Do NOT build in this phase" language. Update ROADMAP phase ordering accordingly. The trace ledger gets its own phase (7F), not wedged into the schema phase (7C).

- **Echo review workflow: package helpers → CLI → tests** (Phase 7E lesson): The review workflow follows a three-layer pattern: (1) Add file-bus helpers to `packages/external-agents/src/fileBus.ts` — `writeReviewPacket`, `readReviewPacket`, `listReviewPackets`, `listReportFiles`, plus a `buildReviewMarkdown` function that generates the structured MD report. (2) Add CLI commands in `cli/agentsCommand.ts` — `executeAgentsReview` (creates review from result, enforces block/escalate finding requirements, builds packet, writes JSON + MD via package helpers), `executeAgentsReviews` (lists review JSON + MD files), `executeAgentsReviewRead` (validates JSON or displays MD). ReviewerRole is forced to `openclaw_echo` — it's not configurable. Verdict validation: block/escalate MUST include at least one issue or safety finding. (3) Tests: use a helper `createResultPacket` that calls the package's `writeResultPacket` to populate the outbox, then run the review flow end-to-end. Every test must verify the approval boundary language in the generated MD report.

- **Markdown test assertions: match raw text, not rendered** (Phase 7E pitfall): When generating Markdown content (review reports, docs) and writing tests against it, the raw text includes `**bold**` markers. Asserting `"NOT approve mutation"` fails because the actual content is `"**NOT** approve mutation"`. Always match against the raw Markdown source, not what it would render as. Use `toContain("**NOT** approve mutation")` not `toContain("NOT approve mutation")`.

- **Server missing external-agents dependency** (Phase 7G pitfall): When adding server routes that import from `@tripp-reason/external-agents`, the package must be in server's `package.json` dependencies. If not present, `tsc` fails with "Cannot find module '@tripp-reason/external-agents'". Fix: add `"@tripp-reason/external-agents": "workspace:*"` to server's dependencies, then `pnpm install --filter @tripp-reason/server && pnpm build`.

- **safeAgentPath resolves relative to workdir, not cwd** (Phase 7G pitfall): The server route path safety helper must resolve the file path relative to the server's configured workdir (`config.workdir`), not `process.cwd()`. Use `path.resolve(workdir, filePath)` not `path.resolve(filePath)`. The workdir is passed to every route registration function.

- **Build catches missing test imports before tests run** (Phase 7E lesson): When adding new exported functions to a module and importing them in tests, `tsc` build catches the TS2304 error (cannot find name) before vitest even runs. Fix the imports in the test file, rebuild, then run tests. The error is deterministic and easy to fix — don't waste turns debugging test failures when it's a missing import.

- **Review packet naming convention**: `review-YYYYMMDD-HHMMSS-openclaw_echo-{short-slug}.json` with companion `.md` report. The slug is derived from the review summary via `sanitizeSlug()`. Both files share the same base name — only the extension differs. This makes JSON↔MD pairing trivial for listing tools.

- **Partial-read typos in patch tool**: always verify the diff for unintended changes like DSCHEMA_VERSION → SCHEMA_VERSION

- **isolatedModules blocks mixed value/type re-exports** (Tripp.OS Stage 3): When re-exporting from another package with isolatedModules: true, split into export (values like Zod schemas) and export type (TypeScript types). TS1205 error otherwise. See tripp-os-package-extraction skill.

- **Phase 7 COMPLETE, Tripp.OS Stages 2-3 done**: agent-bus extracted (68 tests), contracts created, compatibility barrels wired. See tripp-os-package-extraction skill. (Phase 7H lesson): When using `patch` to replace an old_string in a file that was previously read with `offset`/`limit` pagination, the tool produces `_warning: was last read with offset/limit pagination (partial view)`. If your old_string matches partial content or you accidentally type a mangled symbol (e.g., `DSCHEMA_VERSION` instead of `SCHEMA_VERSION`), the patch "succeeds" but introduces a typo. The patch tool diff shows the error immediately (look for `D→S`). Fix with a second patch restoring the correct symbol. Always verify: the patch tool's lint output is pre-existing noise, but the diff IS reliable — scan it for unintended changes.

- **pnpm --filter passthrough in monorepos**: `pnpm -r run build --filter @pkg` passes `--filter` as a CLI arg to individual npm scripts. `tsc --build --filter @pkg` and `vitest run --filter @pkg` both fail (unknown option). Fix: `cd packages/@pkg && npx tsc --build` and `cd packages/@pkg && npx vitest run`. Don't use the top-level pnpm `-r` with `--filter` for build/test scripts — it leaks the flag into sub-script argv.

- **read_file dedup across similar filenames**: When two packages have same-named files (e.g., `contracts.ts` in both `@tripp-os/contracts` and `@tripp-reason/shared`), reading one then the other may trigger "File unchanged since last read" blocking the second read — even though they're different files. Bypass: use `terminal` with `cat` or `head` to force-read the second file.

## Phase 5F: Swarm CLI Assembly Pattern

The `tripp swarm run` command follows the same wiring as `tripp run` but for swarm workers. Key patterns:

**Swarm orchestrator hook**: `OrchestratorInput` accepts optional `reasonLoop`, `toolDispatcher`, `approvalGate`. When injected, the orchestrator sets `context.fakeExecution = false` and forwards deps through `WorkerExecutionContext`. In swarm 5D-5E transition, the orchestrator import changed from `runFakeWorker` to `runWorker` — this single hook enables both fake and real modes.

**Real mode assembly** mirrors `executeRun`: `initDb` → `createRepositories` → `OpenAICompatibleProvider` → `createDispatcher` → `CliApprover` → `createApprovalGate` → `createRunManager` → `createReasonLoop` → pass to `runSwarmPipeline`. Fake mode (default) uses deterministic pipeline with no provider deps.

**Startup approval**: `doesModeRequireApproval(mode)` from swarm constants gates medium/large/max. Prompt with `readline.createInterface`, default deny after 30s. `--deny-all` skips and exits. Uses `throwOnDenial: false` on `createApprovalGate` so swarm handles denials gracefully.

**Swarm report path**: `reports/<YYYY-MM-DD>/<swarm-id>.md` under workdir. Written via `writeFile` with Markdown sections for status, tasks, workers, files, conflicts, warden verdict, and next step.

**Commander subcommand nesting**: `tripp swarm run` uses `program.command('swarm').command('run')` — two-level nesting. Flags go on the innermost `.command('run')`.
