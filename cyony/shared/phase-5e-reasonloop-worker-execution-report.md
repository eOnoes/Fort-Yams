# Phase 5E ReasonLoop Worker Execution Report

## PHASE

Phase 5E — ReasonLoop-Backed Worker Execution

## STATUS

**PASS** ✅

## MODEL TIERS USED

- **Heavy Technical Thinking** — Worker execution boundary design, ReasonLoop integration, tool allowlist/denylist enforcement, approval behavior, worker isolation, timeout handling
- **Fast Technical Builder** — Implementation of all 6 worker execution components
- **Code Review / Warden Pass** — Scope audit, boundary check, report

## CRASH / REPORT CHECK

Phase 5D report exists and is complete: `reports/phase-5d-orchestrator-fake-pipeline-report.md` (PASS, 24/24 smoke).

## FILES CREATED

| File | Purpose |
|------|---------|
| `packages/swarm/src/workerPrompt.ts` | Builds bounded system+user prompt from SubagentSpec + TaskPacket |
| `packages/swarm/src/toolFilter.ts` | Wraps ToolDispatcher with allowlist/denylist filtering; MCP namespace support |
| `packages/swarm/src/workerResultMapper.ts` | Maps ReasonLoopResult → structured ResultPacket with JSON extraction |
| `packages/swarm/src/reasonLoopWorker.ts` | ReasonLoop-backed worker runner with timeout, SwarmApprover, injection pattern |

## FILES MODIFIED

| File | Change |
|------|--------|
| `packages/swarm/package.json` | Added `@tripp-reason/core` as a workspace dependency |
| `packages/swarm/src/workerRunner.ts` | Added `fakeExecution: false` path → `runReasonLoopWorker` with injected ReasonLoop/ToolDispatcher/ApprovalGate |
| `packages/swarm/src/index.ts` | Added barrel exports for all 4 new modules |

## REASONLOOP WORKER COMPONENTS

### Worker Prompt Builder (`workerPrompt.ts`)
`buildWorkerPrompt(subagent, task)` → `WorkerPromptParts { systemPrompt, userPrompt }`

Produces a bounded prompt that encodes:
- Worker identity (name, role)
- Objective and scope
- File boundaries (allowedFiles, forbiddenFiles)
- Tool boundaries (allowedTools, forbiddenTools)
- Frozen behavior rules (no spawning, no role change, no prompt rewrite)
- Required output format (structured JSON ResultPacket shape)

`toReasonLoopPrompt(parts)` combines system + user into a single string for ReasonLoop.

### Tool Filter (`toolFilter.ts`)
`createFilteredDispatcher(inner, allowedTools?, forbiddenTools?)` → `FilteredToolDispatcher`

- Wraps an existing ToolDispatcher
- `filterTools()` handles match logic: exact, `mcp.*` wildcard, `prefix.*` glob
- `dispatch()` blocks calls to tools outside the filtered set with a controlled error
- `listTools()` returns only the filtered subset
- Does not modify `packages/tools` — pure wrapper pattern

### Worker Result Mapper (`workerResultMapper.ts`)
`mapWorkerResult(input)` → `ResultPacket`

Handles 4 result shapes:
1. **Structured JSON** — parses from `assistantMessage`, populates all fields, caps long text
2. **Unstructured output** — returns `partial` with raw artifacts preserved
3. **Timeout** — returns `partial` with timeout warning and risk note
4. **Run failure** — returns `fail` with critical finding

JSON extraction handles: raw JSON, ```json fences, bare ``` fences, and embedded objects.

### ReasonLoop Worker Runner (`reasonLoopWorker.ts`)
`runReasonLoopWorker(input)` → `ResultPacket`

Execution flow:
1. Build worker prompt from SubagentSpec + TaskPacket
2. Run through injected ReasonLoop with timeout enforcement (`Promise.race`)
3. Map result via `workerResultMapper`
4. Catch errors → controlled fail ResultPacket

### Swarm Approver (`reasonLoopWorker.ts`)
`createSwarmApprover(taskPacket, innerApprover?)` → `Approver`

- **No gate + requiresApproval=true** → fail closed (denies all mutating/destructive)
- **With gate + requiresApproval=true** → delegates to inner approver
- **No gate + safe tools only** → auto-approves

## TOOL ALLOWLIST / DENYLIST BEHAVIOR

| Rule | Behavior |
|------|----------|
| `allowedTools` defined | Only listed tools pass; all others blocked |
| `allowedTools` undefined | All tools pass (subject to forbiddenTools) |
| `forbiddenTools` defined | Blocks listed tools regardless of allowlist |
| `forbiddenTools` priority | Overrides allowedTools for same tool |
| MCP exact match | `mcp.mock.echo` in allowlist → permitted |
| MCP prefix glob | `mcp.mock.*` → matches `mcp.mock.echo`, `mcp.mock.mutate` |
| MCP broad wildcard | `mcp.*` → matches all MCP namespaced tools |
| Unknown tool dispatch | Returns `{ status: "error", error: "Tool not in allowed set" }` |

## APPROVAL BEHAVIOR

| Scenario | Result |
|----------|--------|
| No ApprovalGate + `requiresApproval: true` + mutating tool | DENIED (fail closed) |
| No ApprovalGate + `requiresApproval: false` + safe tool | APPROVED (auto-pass) |
| With ApprovalGate + approver approves | APPROVED |
| With ApprovalGate + approver denies | DENIED with reason |
| Gateway docs keep unchanged | MCP tools are tools; swarm does not bypass |

## TIMEOUT / FAILURE BEHAVIOR

| Scenario | ResultPacket Status | Findings |
|----------|---------------------|----------|
| Worker exceeds `taskPacket.timeoutMs` | `partial` | Warning: timeout after Nms |
| ReasonLoop run fails (status: `failed`) | `fail` | Critical: ReasonLoop failed |
| Malformed/unstructured output | `partial` | Warning: output not structured |
| Unexpected crash | `fail` | Critical: worker crashed |
| Raw artifacts preserved | Always (capped at 5000 chars) | Via `rawArtifacts` field |

## VALIDATION RESULT

| Check | Result |
|-------|--------|
| `pnpm typecheck` (9 packages) | ✅ 0 errors |
| `pnpm build` (9 packages) | ✅ 0 errors |

## SMOKE TEST RESULT

**67/67 assertions PASS:**

### Component Tests (50 assertions)
| # | Area | Tests | Result |
|---|------|-------|--------|
| 1-11 | Worker prompt | Name, role, objective, scope, allowed tools, forbidden tools, allowed files, forbidden files, no-spawn, role freeze, task separator | ✅ |
| 12-21 | Tool filtering | allowlist permits, allowlist blocks, forbidden blocks, MCP exact, MCP glob, MCP wildcard, filtered dispatcher exposes subset, dispatch allowed, dispatch blocked | ✅ |
| 22-30 | Result mapper | Malformed→partial, structure warning, raw artifacts, structured→pass, filesTouched, toolCalls, proposedChanges, summary, JSON fence extraction | ✅ |
| 31-41 | Swarm approver | Fail-closed no gate, denial reason, approved path, denied path, timeout→partial, timeout finding, timeout risk | ✅ |

### ReasonLoop Integration Tests (6 assertions)
| # | Test | Result |
|---|------|--------|
| 42-47 | Fake provider + in-memory DB → valid pass ResultPacket | ✅ |
| 48-49 | Malformed provider output → partial with raw artifacts | ✅ |
| 50-51 | Timeout simulation → partial with timeout finding | ✅ |

### Static Boundary Checks (11 assertions)
| # | Check | Result |
|---|-------|--------|
| 52-58 | swarm depends only on shared + core (not providers/tools/mcp/server/cli) | ✅ |
| 59 | core does NOT depend on swarm | ✅ |
| 60 | server does NOT depend on swarm | ✅ |
| 61 | CLI does NOT depend on swarm | ✅ |
| 62 | Worker prompt forbids worker spawning | ✅ |

### Required Test Coverage
| Req | Description | Covered |
|-----|-------------|---------|
| 1 | ReasonLoop worker returns valid ResultPacket pass | ✅ (test 42-47) |
| 2 | Worker prompt includes role, objective, scope, tool limits, no-spawn | ✅ (tests 1-11) |
| 3 | allowedTools permits listed tool | ✅ (tests 12-13) |
| 4 | allowedTools blocks unlisted tool | ✅ (test 14) |
| 5 | forbiddenTools blocks listed tool | ✅ (tests 15-16) |
| 6 | MCP namespaced tool accepted in allowlist | ✅ (tests 17-21) |
| 7 | no ApprovalGate + requiresApproval fails closed | ✅ (tests 31-32) |
| 8 | approved mutation path proceeds | ✅ (test 34) |
| 9 | denied mutation returns fail/partial | ✅ (test 35) |
| 10 | malformed output → partial | ✅ (tests 22-24, 48-49) |
| 11 | timeout → partial/fail | ✅ (tests 36-38, 50-51) |
| 12 | ReasonLoop worker does not import concrete providers/tools/MCP/server/CLI | ✅ (tests 52-58) |
| 13 | core does not import swarm | ✅ (test 59) |
| 14 | no server/CLI swarm registration | ✅ (tests 60-61) |
| 15 | no worker can spawn another | ✅ (test 62) |

## PACKAGE BOUNDARY CHECK

| Check | Status |
|-------|--------|
| swarm imports @tripp-reason/shared | ✅ |
| swarm imports @tripp-reason/core | ✅ |
| swarm does NOT import providers/tools/mcp/server/cli | ✅ |
| core does NOT import swarm | ✅ |
| server does NOT import swarm | ✅ |
| CLI does NOT import swarm | ✅ |
| No new npm dependencies added | ✅ |

## SCOPE COMPLIANCE

| Check | Status |
|-------|--------|
| No server routes added | ✅ |
| No CLI swarm commands added | ✅ |
| No UI/dashboard | ✅ |
| No OpenClaw/Hermes adapters | ✅ |
| No new provider implementations | ✅ |
| No MCP architecture changes | ✅ |
| No worker-to-worker communication | ✅ |
| No recursive swarm spawning | ✅ |
| No file mutation outside test tmp | ✅ |
| Concrete providers/tools injected, not instantiated by swarm | ✅ |
| FakeProviderAdapter for tests only (smoke script) | ✅ |

## DESIGN DECISIONS

### ReasonLoop Injection
Workers accept an already-constructed `ReasonLoop` instance. This means providers, RunManager, toolDispatcher, and approvalGate are all wired at the assembly layer (future server/CLI). Swarm never instantiates concrete provider or tool implementations — it only consumes the shared `ReasonLoop` interface. This keeps the package boundary clean.

### Tool Filter Wrapper
Rather than modifying `packages/tools` or requiring a new dispatcher implementation, `createFilteredDispatcher` wraps any `ToolDispatcher` with allow/deny list logic. The wrapper delegates to the inner dispatcher for allowed tools and returns controlled errors for blocked ones. MCP support uses prefix glob matching (`mcp.*`, `mcp.mock.*`).

### Worker Prompt Shape
The bounded prompt enforces structure at the prompt level — the worker receives its role, scope, tool boundaries, and output format as a system prompt. This is the first line of defense against scope drift, alongside the tool filter and Warden in later phases.

### Result Mapping
The mapper handles 4 distinct output shapes (structured JSON, unstructured text, timeout, failure). JSON extraction is lenient — it tries raw parse, fenced blocks, and embedded objects. Unstructured output is never lost — it's preserved in `rawArtifacts` for audit.

### Timeout Handling
Per-worker timeout uses `Promise.race` with a rejection timer. On timeout, the worker returns a controlled `partial` ResultPacket. The orchestrator can then decide whether to retry or fail the swarm run.

### Why Server/CLI Integration Waits for Phase 5F
Phase 5E proves that a worker can execute through ReasonLoop with injected dependencies. Phase 5F will wire swarm into `tripp swarm run` (CLI) and add `/swarms` endpoints (server). Keeping these phases separate means the worker execution contracts are validated before the assembly layer adds routing complexity.

## BLOCKERS

None.

## NEXT STEP

**Phase 5F — Server/CLI Swarm Registration**

Wire `tripp swarm run` CLI command, `GET /swarms`, `GET /swarms/:id` HTTP endpoints. The worker execution pipeline (Phase 5D orchestrator + Phase 5E ReasonLoop workers) is ready to be assembled behind CLI and server interfaces.

---

*Report generated 2026-06-03. Phase 5E ReasonLoop Worker Execution Report — PASS. 67/67 smoke.*
