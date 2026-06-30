# Phase 5 Swarm Runtime Contract

> Locked before any swarm code exists. Defines the Kimi-style bounded multi-worker orchestration model, worker roles, packet contracts, approval interaction, concurrency limits, and implementation sequence.

## Purpose

Phase 5 adds bounded Kimi-style multi-worker orchestration to Tripp.Reason while preserving the existing approval, tool, MCP, report, and runtime boundaries. The swarm runtime decomposes complex tasks into bounded worker packets, executes them in parallel under strict concurrency caps, merges results, and passes everything through a Warden review pass before final report generation.

This is NOT unbounded agent chaos. It is a disciplined orchestration layer that amplifies the existing ReasonLoop, not a replacement for it.

```
Operator (Eddie) = Final approver
Orchestrator      = Task classifier + decomposition owner
Planner           = Task packet designer
Workers (N)       = Bounded task executors
Merger            = Result consolidator
Warden            = Scope/safety/drift judge
Tripp.Reason      = Execution brain (ReasonLoop + ApprovalGate + ToolDispatcher)
```

## Non-Goals

- ❌ No unbounded agent spawning — hard cap at 25, default 1
- ❌ No default large swarm — solo mode is the default
- ❌ No swarm without explicit operator intent — requires `tripp swarm run` command
- ❌ No workers bypassing ApprovalGate — all mutating tools route through existing gate
- ❌ No worker direct repo mutation outside the tool system — workers use ToolDispatcher
- ❌ No hidden background autonomy — every worker run is audited
- ❌ No OpenClaw/Hermes integration yet — external agent adapters are Phase 7
- ❌ No UI/dashboard yet — Phase 6
- ❌ No MCP architecture changes — MCP tools are tools; workers see them identically
- ❌ No provider sprawl — uses existing providers + tier routing
- ❌ No recursive swarm spawning — workers cannot spawn workers
- ❌ No swarm as a required component — system works without it (like MCP)

## Kimi-Style Operating Model

The swarm follows a disciplined decompose → execute → merge → review pipeline:

```
Operator prompt
  ↓
Orchestrator classifies complexity (solo/small/medium/large)
  ↓
Planner creates task packets (bounded, role-specific)
  ↓
Workers execute bounded tasks (each owns a ReasonLoop or instance)
  ↓
Workers return structured result packets (not vague prose)
  ↓
Merger consolidates results (conflict detection, dedup)
  ↓
Warden validates (scope drift, safety, approval compliance)
  ↓
Final swarm report generated
```

**Key principles:**
- One orchestrator, many workers, one merger, one warden
- Workers are role-bounded: one worker = one focused task packet
- Workers return structured result packets, not free-form text
- Orchestrator owns decomposition and merge coordination
- Warden is the final safety gate before report delivery
- Operator remains the final human approver for gated operations

## Worker Roles

Initial role set for Phase 5:

### Planner
- **Allowed:** Analyze prompt, classify complexity, decompose into task packets, assign roles and model tiers
- **Forbidden:** Execute code, mutate files, make tool calls beyond planning
- **Expected output:** Array of structured TaskPackets with role assignments and dependencies

### Researcher
- **Allowed:** Search files, read documentation, gather context, list directories, git inspection
- **Forbidden:** Write/edit files, execute shell commands beyond read-only search
- **Expected output:** Structured findings with references to files, symbols, and external context

### Coder
- **Allowed:** Write files, edit files, execute build commands, run tests
- **Forbidden:** Delete files outside task scope, push/merge git, access files outside allowedFiles
- **Expected output:** Code changes with file paths, diffs, build/test results

### Reviewer
- **Allowed:** Review code changes, inspect diffs, run static analysis, suggest improvements
- **Forbidden:** Make code changes directly (proposes, doesn't apply)
- **Expected output:** Review findings with severity levels, suggested fixes, approval/rejection

### Tester
- **Allowed:** Run test suites, validate changes, check edge cases, report coverage
- **Forbidden:** Modify source code, change test expectations without approval
- **Expected output:** Test results with pass/fail counts, coverage summary, regressions

### Merger
- **Allowed:** Consolidate result packets, detect conflicts, produce unified summary
- **Forbidden:** Modify individual worker results, override Warden verdicts
- **Expected output:** Consolidated result with conflict report and final change list

### Reporter
- **Allowed:** Generate swarm report, aggregate tool calls, format output
- **Forbidden:** Change worker results, alter Warden verdicts
- **Expected output:** Markdown swarm report per report contract

### Warden
- **Allowed:** Review scope compliance, check safety rules, validate approval decisions, block unsafe merges
- **Forbidden:** Execute tools, modify files, override operator approval decisions
- **Expected output:** Warden verdict (PASS/PARTIAL/FAIL) with violation details and recommendations

## Worker Count / Concurrency Rules

Per DOCTRINE.md Swarm Restraint Rule:

| Mode | Max Workers | Approval Required |
|------|------------|-------------------|
| Solo (default) | 1 | No |
| Small | 3–5 | No |
| Medium | 6–10 | Yes |
| Large | 11–20 | Yes |
| Max cap | 25 | Yes + manual |

Additional constraints:
- Default swarm size: 3 or fewer until proven reliable
- Hard cap: 25 (system-enforced, not configurable)
- No recursive swarm spawning — workers cannot spawn sub-workers
- No worker can act as an orchestrator
- Concurrency is role-aware: planner runs first, then workers in parallel, then merger, then warden
- File-locking prevents concurrent writes to same file

## Task Packet Contract

```typescript
interface TaskPacket {
  /** Unique task identifier */
  id: string;
  /** Worker role assigned */
  role: WorkerRole;
  /** Human-readable task title */
  title: string;
  /** Specific objective */
  objective: string;
  /** Scope boundaries */
  scope: string;
  /** Files the worker is allowed to read/modify */
  allowedFiles?: string[];
  /** Files explicitly off-limits */
  forbiddenFiles?: string[];
  /** Tools the worker may use (namespaced names allowed) */
  allowedTools?: string[];
  /** Tools explicitly blocked */
  forbiddenTools?: string[];
  /** Model tier for this worker (from MODEL_TIERS.md) */
  modelTier: ModelTierLabel;
  /** Risk classification */
  riskLevel: "safe" | "mutating" | "destructive";
  /** Per-worker timeout in milliseconds */
  timeoutMs: number;
  /** Whether this worker's tool calls require approval */
  requiresApproval: boolean;
  /** References to other task packets or context (for dependencies) */
  contextRefs?: string[];
  /** Expected output shape description */
  expectedOutput: string;
  /** Dependencies: task IDs that must complete before this one starts */
  dependsOn?: string[];
}
```

## Result Packet Contract

```typescript
interface ResultPacket {
  /** References the originating task */
  taskId: string;
  /** Worker role that produced this result */
  role: WorkerRole;
  /** Overall status */
  status: "pass" | "partial" | "fail";
  /** Human-readable summary (capped at 2000 chars) */
  summary: string;
  /** Structured findings */
  findings: Finding[];
  /** Files touched during execution */
  filesTouched: string[];
  /** Tool calls made (namespaced names preserved) */
  toolCalls: ToolCallSummary[];
  /** Proposed changes (file paths + diffs) */
  proposedChanges: ProposedChange[];
  /** Self-validation notes */
  validation: string;
  /** Risks identified */
  risks: RiskNote[];
  /** Recommendation for next steps */
  nextRecommendation: string;
  /** Raw artifacts (capped, optional) */
  rawArtifacts?: unknown;
}

interface Finding {
  severity: "info" | "warning" | "critical";
  message: string;
  source: string; // file, symbol, or context reference
}

interface ProposedChange {
  file: string;
  diff: string; // capped at 10KB per change
  reason: string;
}

interface RiskNote {
  level: "low" | "medium" | "high";
  description: string;
  mitigation?: string;
}
```

**Workers must return structured packets, not vague prose.** The merger processes packets programmatically. Free-form text is limited to `summary` (2000 char cap) and `validation` fields.

## Approval Integration

Swarm operations preserve the existing ApprovalGate system:

- **Worker tool calls** route through the same `ApprovalGate.check()` as solo runs
- **No mutation without approval** — `requiresApproval: true` tools gate identically
- **Medium/large swarm startup** requires operator approval before workers spawn
- **Individual worker mutating tools** require approval (presented with worker role + task context)
- **Warden reviews approval-sensitive results** — can flag suspicious approvals
- **Approvals appear in swarm reports** — who approved what, when, why
- **Fail-closed** — if no ApprovalGate is configured, swarm refuses to spawn mutating workers
- **ApiApprover / CliApprover** work unchanged — swarm is just another consumer of the Approver interface

## Tool / MCP Integration

- Workers use the existing ReasonLoop + ToolDispatcher system
- Local tools and MCP tools appear as normal tools — no MCP-specific worker bypass
- `allowedTools` / `forbiddenTools` in TaskPacket control per-worker tool access
- MCP namespaced names (`mcp.<server>.<tool>`) are valid in allow/deny lists
- Workers cannot access tools outside their task packet allowlist
- ToolDispatcher enforces tool access — unknown tools return controlled error

## Provider / Model Tier Routing

Follows `MODEL_TIERS.md` tier labels (never hardcoded model names):

| Role | Default Tier | Rationale |
|------|-------------|-----------|
| Orchestrator | Heavy Technical Thinking | Complex task classification |
| Planner | Heavy Technical Thinking | Task decomposition design |
| Coder | Fast Technical Builder | Implementation speed |
| Researcher | Budget Daily Driver | Cost-effective exploration |
| Reviewer | Code Review / Warden Pass | Structured review |
| Tester | Fast Technical Builder | Test execution |
| Merger | Budget Daily Driver | Consolidation |
| Reporter | Budget Daily Driver | Report formatting |
| Warden | Code Review / Warden Pass | Safety/scope verification |

**Rules:**
- Default to cheapest capable tier for each role
- Operator can override tier per swarm run
- No hardcoded model names in swarm core — use tier labels only
- Coder escalates to Heavy Technical Thinking for high-risk tasks
- Warden always uses Code Review / Warden Pass

## Conflict Detection

- **No two workers may write the same file** in the same swarm run unless the orchestrator explicitly serializes them (declared dependency in TaskPacket.dependsOn)
- **Read-only workers may overlap** — multiple researchers can read the same files
- **Mutation workers require file reservation** — `allowedFiles` acts as a lock
- **Conflicts produce Warden warning** — merger cannot proceed until Warden clears
- **Conflict report** includes: file path, competing workers, proposed resolution

## Report Contract

Every swarm run produces a Markdown report at `reports/<swarm-id>/swarm-report.md`:

```markdown
# Tripp.Reason Swarm Report

## Status
PASS | PARTIAL | FAIL

## Swarm ID
<id>

## Operator Prompt
<prompt>

## Mode / Worker Count
<mode> — <count> workers

## Workers
| Role | Model Tier | Status | Findings |
|------|-----------|--------|----------|

## Task Packets
<per-packet details>

## Tool Calls
<aggregated tool calls with namespaced names>

## Files Changed
<list or "None">

## Approvals
<pending + resolved approvals>

## Conflicts
<list or "None">

## Warden Verdict
<PASS/PARTIAL/FAIL> — <reasoning>

## Final Recommendation
<next step or "Done">

## Next Step
<suggested follow-up>
```

## Failure Behavior

- **Worker failure** does not crash the entire swarm unless the failed worker is critical (planner, warden)
- **Timeout** produces PARTIAL result with timeout metadata
- **Merge can proceed with partial results** only if Warden approves
- **Warden can mark swarm FAIL/PARTIAL/PASS** — final authority
- **Report must preserve failed worker packets** — no silent data loss
- **Non-critical worker failures** produce PARTIAL status; critical failures produce FAIL

## Package Boundary

```
packages/swarm/
  src/
    index.ts              — barrel exports
    types.ts              — TaskPacket, ResultPacket, WorkerRole, SwarmConfig
    orchestrator.ts        — SwarmOrchestrator (classify, coordinate)
    planner.ts             — TaskDecomposer (prompt → TaskPacket[])
    workerRegistry.ts      — Role → worker runner mapping
    workerRunner.ts        — Execute one TaskPacket → ResultPacket
    merger.ts              — Consolidate ResultPacket[]
    warden.ts              — Review scope/safety/approval compliance
    conflictDetector.ts    — File write conflict detection
    swarmReport.ts         — Generate swarm markdown report
    concurrencyLimiter.ts  — Enforce caps, approval thresholds
```

**Dependency direction:**

```
swarm ← shared               (contracts + schemas only)
swarm ← core                 (ReasonLoop, ApprovalGate, RunManager — worker execution)
cli/server → swarm           (assembly: tripp swarm run, swarm status)
core ↛ swarm                 (NEVER)
tools ↛ swarm                (NEVER)
mcp ↛ swarm                  (NEVER)
```

**Rules:**
- `swarm` imports `shared` (contracts) and `core` (ReasonLoop for workers)
- `swarm` must NOT import `providers`, `tools`, `mcp`, `server`, or `cli`
- `cli`/`server` may import `swarm` as assembly (like MCP)
- `core` must NOT import `swarm` — swarm is a consumer of core, not a dependency

## Phase 5 Implementation Sequence

| Sub-phase | Deliverable | Dependencies |
|-----------|------------|-------------|
| **5A** (THIS) | Swarm Contract Lock | None |
| **5B** | Swarm Package Skeleton + Packet Types (TaskPacket, ResultPacket, WorkerRole) | 5A |
| **5C** | Local In-Process Worker Runner with Fake Workers (deterministic packets) | 5B |
| **5D** | Orchestrator + Planner + Merger + Warden Smoke (fake workers) | 5C |
| **5E** | Real Worker Execution (ReasonLoop-backed, ApprovalGate, tool access) | 5D |
| **5F** | Server/CLI Swarm Registration (tripp swarm run, GET /swarms, /swarms/:id) | 5E |
| **5G** | Final Swarm Audit + Full Integration Smoke Test | 5F |

## Testing Requirements

- **No live provider dependency** for initial tests — fake workers with deterministic output
- **Fake workers first** — prove orchestration before real execution
- **Deterministic packet tests** — same input → same decomposition
- **Conflict detection tests** — two workers claiming same file → Warden blocks
- **Approval threshold tests** — medium/large swarm requires approval, small doesn't
- **Timeout tests** — worker timeout produces PARTIAL, not crash
- **Report generation tests** — all worker packets preserved in report
- **No recursive spawning tests** — worker attempting to spawn → controlled error
- **Hard cap tests** — 26th worker → controlled error
- **Tool allowlist tests** — worker restricted to allowedTools cannot call others
- **MCP tool passthrough tests** — namespaced MCP tools work in allowlists

## Open Questions

| # | Question | Status |
|---|----------|--------|
| 1 | Should each worker own a full ReasonLoop instance, or share one with per-worker context? | **Open** — shared loop is simpler; per-worker loops isolate failures better. Decision deferred to 5C. |
| 2 | Should swarm store tables (swarm_runs, swarm_workers) be created in 5B or deferred to 5E? | **Open** — tables exist in schema already. May populate in 5B as stub, activate in 5E. |
| 3 | How much parallelism is safe initially? 3 workers (small mode) proven before scaling. | **Decision**: start with 3 max, prove, then unlock medium. |
| 4 | Should file locks live in swarm (conflictDetector) or in core (file-system level)? | **Open** — swarm-level is simpler for Phase 5. Core-level is more robust but architectural. |
| 5 | Is Warden a dedicated worker role or a mandatory final pass that always runs? | **Open** — mandatory pass is simpler (always runs). Role-as-worker is more flexible. |
| 6 | Do workers need isolated filesystem views or shared workdir? | **Open** — shared workdir is simplest for Phase 5. Isolation is safer but complex. |
| 7 | Should tripp swarm run block until complete (like tripp run) or return immediately with swarm ID? | **Open** — blocking is simpler for Phase 5. Async with status polling is better UX. |

## Tmp / Smoke Artifact Policy

Phase 5 smoke tests follow the Phase 4 pattern: scripts under `tmp/phase5*-smoke.mjs`, gitignored. Old smoke repos cleaned. Useful scripts kept for reference. No dedicated test-smoke area needed — tmp/ suffices.

---

*Contract locked 2026-06-03. No swarm code exists yet. Phase 5B will create the package skeleton.*
