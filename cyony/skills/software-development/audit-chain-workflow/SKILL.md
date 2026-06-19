---
name: audit-chain-workflow
description: Read-only-first chained audit gates for Tripp.Reason and similar projects — bounded patches, decision markers, chain-through without stopping for clean audits.
---

# Audit Chain Workflow

Run sequences of read-only audit/hardening gates in a chain. Only stop for real blockers — not after every clean audit.

## Trigger

User assigns a chained audit sequence (e.g., "Stage 2A→2B→2C→2D") with decision options, boundary rules, and report requirements.

## Delivery Format

**Always deliver final reports as full markdown in a ```code block in chat.** Users want copy-pasteable output — NOT MEDIA file attachments, NOT summary tables only. The report file still gets written to disk at the specified path, but the chat delivery is the primary user-facing artifact.

Each stage's report should also be delivered in code-copy format when the stage completes, unless the user explicitly asks to skip intermediate reports.

## Workflow Pattern

### 1. Read-only audit first
- Inspect, don't modify
- Reproduce errors before touching anything
- Classify scope (test-only? source? contracts?)

### 2. Bounded patch only if safe
- Test-only fixes: non-null assertions, optional chaining, fixture adjustments
- Schema additions: new enum values only (backward-compatible)
- Package scripts: only if using already-installed tooling
- **Never**: weaken strictness, change runtime sources to fix tests, change contracts, add dependencies without approval

### 3. Validate after every change
- Run typecheck + full test matrix
- Confirm lockfile still clean
- Confirm no drift

### 4. Chain through
- If a stage passes cleanly, go directly to the next — don't wait for signoff
- If a stage defers cleanly (documented, no risk), chain through
- Stop ONLY for: validation failure, package drift, dependency requirement, scope risk, ownership boundary violation, or operator-approval gate

## Stage 6O: Implementation Gate

See `references/stage-6n-6q-handoff-bundle-chain.md` for the full 4-gate handoff chain (6N design → 6O implementation → 6P audit → 6Q fixture).

## Stage 6P: Read-Only Audit Gate

Pure audit — no code changes. Verify design alignment (all metadata fields match 6N design), bundle shape (5 files), output path boundaries, redaction safety, consumer boundary enforcement, and run 26-term forbidden behavior search. See reference file.

## Stage 6R: Operator Handoff Audit (Read-Only)

A read-only culmination audit of the full 6N→6Q handoff lane. All 4 gates are complete — this audit verifies the end-to-end flow is coherent, all contract invariants hold, and no cross-project boundaries were crossed.

1. **End-to-end flow**: Trace → Manifest → Bundle → Operator. Each stage independently validated, full chain coherent.
2. **Internal contract**: `contract_classification: "internal-fake-manual-only"`, `mutation_capability: "none"`, `source_mode: "fake"` — all hardcoded constants.
3. **Consumer boundaries**: 5 roles documented, 7 forbidden actions listed, Echo is passive-only.
4. **Redaction pipeline**: trace → manifest mapper → bundle generator → operator simulation. 3-tier: key names, value patterns, length truncation.
5. **Forbidden behavior search**: 27 terms across all 6 handoff/manifest source and test files. Zero actual violations.
6. **Validation**: full suite, typecheck, lockfile. No new dependencies.

Decision: `TRIPP_REASON_STAGE_6R_PASS_STATIC_OPERATOR_HANDOFF_AUDIT_READY_FOR_STAGE_6S`

## Stage 6S: Static Operator Packet Simulation

Simulate how an operator receives, validates, classifies, and accepts/rejects a handoff bundle — without live agents, shared bus, or cross-project writes.

New module: `packages/cli/src/fakeManualOperatorSimulation.ts`

```typescript
export async function simulateOperatorHandoff(
  bundleDir: string,
): Promise<OperatorPacketResult>
```

### Operator flow (10 steps)
1. Validate 5-file bundle shape (reject if any missing)
2. Read `handoff-metadata.json` (reject if invalid JSON)
3. Check `contract_classification` (reject if ≠ "internal-fake-manual-only")
4. Check `mutation_capability` (reject if ≠ "none")
5. Read `manifest.json` → check `source_mode` (reject if live/experimental_live/cloud/remote)
6. Scan all 5 files for secrets (reject on match)
7. Validate `recommended_next_marker` (warn if empty)
8. Check `redaction_status` (reject if not safe_for_operator_review)
9. Classify confidence: high (confirmed, no warnings, not stale) / medium (warnings or stale) / low (partial trace or unknowns) / rejected (any rejection condition)
10. Build `OperatorPacketSummary` with packet_status, decision, confidence_level, confidence_reason, recommended_next_marker, warnings, unknowns, redaction_status, consumer_forbidden_actions, operator_notes

### OperatorPacketSummary shape
```typescript
interface OperatorPacketSummary {
  packet_status: "accepted" | "rejected";
  decision: string;                    // "Accepted — high confidence"
  confidence_level: "high" | "medium" | "low" | "rejected";
  confidence_reason: string;
  recommended_next_marker: string;
  warnings: string[];
  unknowns: string[];
  redaction_status: { applied, secrets_stripped, safe_for_review };
  consumer_forbidden_actions: string[];
  operator_notes: string;              // "Static fake/manual handoff..."
}
```

### Test structure: 5 sections, 30 tests
- 6S-1 Accepted: 8 tests — clean (high), warnings (medium), unknowns (low), stale (medium/low), partial (low), marker present, forbidden actions present, redaction present
- 6S-2 Rejected: 8 tests — missing manifest.json, missing metadata, mutation≠none, contract≠internal-fake-manual-only, source_mode=live, source_mode=experimental_live, secret content, empty next_marker (accepted with warning)
- 6S-3 Summary Safety: 4 tests — no secrets, fake/manual notes, 7 forbidden actions, BLOCKED marker for rejected
- 6S-4 Confidence Classification: 5 tests — high, medium (warnings), medium (stale), low (partial), low (unknowns)
- 6S-5 Boundary: 5 tests — no live dispatch, no file mutation, no shared-bus paths, no Echo/Codex/Kimi imports, no shared-agent-bus in code

Decision: `TRIPP_REASON_STAGE_6S_PASS_SIMULATION_ONLY_READY_FOR_STAGE_6T`

## Stage 6R: Operator Handoff Audit (Read-Only)

A read-only culmination audit of the full 6N→6Q handoff lane. All 4 gates are complete — this audit verifies the end-to-end flow is coherent, all contract invariants hold, and no cross-project boundaries were crossed.

1. **End-to-end flow**: Trace → Manifest → Bundle → Operator. Each stage independently validated, full chain coherent.
2. **Internal contract**: `contract_classification: "internal-fake-manual-only"`, `mutation_capability: "none"`, `source_mode: "fake"` — all hardcoded constants.
3. **Consumer boundaries**: 5 roles documented, 7 forbidden actions listed, Echo is passive-only.
4. **Redaction pipeline**: trace → manifest mapper → bundle generator → operator simulation. 3-tier: key names, value patterns, length truncation.
5. **Forbidden behavior search**: 27 terms across all 6 handoff/manifest source and test files. Zero actual violations.
6. **Validation**: full suite, typecheck, lockfile. No new dependencies.

Decision: `TRIPP_REASON_STAGE_6R_PASS_STATIC_OPERATOR_HANDOFF_AUDIT_READY_FOR_STAGE_6S`

## Stage 6S: Static Operator Packet Simulation

Simulate how an operator receives, validates, classifies, and accepts/rejects a handoff bundle — without live agents, shared bus, or cross-project writes.

New module: `packages/cli/src/fakeManualOperatorSimulation.ts`

```typescript
export async function simulateOperatorHandoff(
  bundleDir: string,
): Promise<OperatorPacketResult>
```

### Operator flow (10 steps)
1. Validate 5-file bundle shape (reject if any missing)
2. Read `handoff-metadata.json` (reject if invalid JSON)
3. Check `contract_classification` (reject if ≠ "internal-fake-manual-only")
4. Check `mutation_capability` (reject if ≠ "none")
5. Read `manifest.json` → check `source_mode` (reject if live/experimental_live/cloud/remote)
6. Scan all 5 files for secrets (reject on match)
7. Validate `recommended_next_marker` (warn if empty)
8. Check `redaction_status` (reject if not safe_for_operator_review)
9. Classify confidence: high (confirmed, no warnings, not stale) / medium (warnings or stale) / low (partial trace or unknowns) / rejected (any rejection condition)
10. Build `OperatorPacketSummary` with packet_status, decision, confidence_level, confidence_reason, recommended_next_marker, warnings, unknowns, redaction_status, consumer_forbidden_actions, operator_notes

### OperatorPacketSummary shape
```typescript
interface OperatorPacketSummary {
  packet_status: "accepted" | "rejected";
  decision: string;                    // "Accepted — high confidence"
  confidence_level: "high" | "medium" | "low" | "rejected";
  confidence_reason: string;
  recommended_next_marker: string;
  warnings: string[];
  unknowns: string[];
  redaction_status: { applied, secrets_stripped, safe_for_review };
  consumer_forbidden_actions: string[];
  operator_notes: string;              // "Static fake/manual handoff..."
}
```

### Test structure: 5 sections, 30 tests
- 6S-1 Accepted: 8 tests — clean (high), warnings (medium), unknowns (low), stale (medium/low), partial (low), marker present, forbidden actions present, redaction present
- 6S-2 Rejected: 8 tests — missing manifest.json, missing metadata, mutation≠none, contract≠internal-fake-manual-only, source_mode=live, source_mode=experimental_live, secret content, empty next_marker (accepted with warning)
- 6S-3 Summary Safety: 4 tests — no secrets, fake/manual notes, 7 forbidden actions, BLOCKED marker for rejected
- 6S-4 Confidence Classification: 5 tests — high, medium (warnings), medium (stale), low (partial), low (unknowns)
- 6S-5 Boundary: 5 tests — no live dispatch, no file mutation, no shared-bus paths, no Echo/Codex/Kimi imports, no shared-agent-bus in code

Decision: `TRIPP_REASON_STAGE_6S_PASS_SIMULATION_ONLY_READY_FOR_STAGE_6T`

## Decision Option Naming

Follow the established convention:
```
TRIPP_REASON_{STAGE}_{VERDICT}_{REASON}_CHAINING_TO_{NEXT}
TRIPP_REASON_{STAGE}_{VERDICT}_{REASON}
```

Examples:
- `TRIPP_REASON_TIMEOUT_2A_PASS_TYPECHECK_YELLOW_FLAG_RESOLVED_CHAINING_TO_2B`
- `TRIPP_REASON_3A_PASS_TIMEOUT_TRACE_EVENT_IMPLEMENTED_CHAINING_TO_3B`
- `TRIPP_REASON_3B_PASS_EXTERNAL_AGENTS_TESTS_DEFERRED_DEPENDENCY_APPROVAL_NEEDED_CHAINING_TO_3C`
- `TRIPP_REASON_3C_BLOCKED_LIVE_AGENT_SCOPE_RISK`

## Non-Null Assertion Pattern for Test Typecheck Fixes

When `metadata` or similar fields are `.optional()` in Zod schemas and tests access them without narrowing:

```typescript
// BEFORE (typecheck error: 'metadata' is possibly 'undefined')
expect(result.metadata.fake).toBe(true);

// AFTER (non-null assertion — test already validates metadata presence)
expect(result.metadata!.fake).toBe(true);
```

This is test-only, preserves assertion strength, and doesn't change runtime behavior. Use `!` not `?.` — the test expects metadata to exist.

## Trace Event Addition Pattern

When adding new trace event types to an existing Zod enum schema:

1. Add to `AgentBusTraceEventTypeSchema` enum (backward-compatible — new values only)
2. Add validation rules in `superRefine` for required causal identifiers
3. Add tests: valid event creation, invalid event rejection, ledger append/read
4. Mirror changes in any sibling packages (e.g., both `agent-bus` and `external-agents`)
5. Document emit points even if not yet wired

## Timeout Trace Emit Wiring Pattern

When wiring trace events at existing timeout catch points, use **fire-and-forget best-effort**:

```typescript
// Fire-and-forget — never blocks the timeout handler
appendTraceEvent(
  createTraceEvent({
    eventType: "task_timeout" as any,  // 'as any' if build types are stale
    severity: "error",
    actorType: "system",
    packetId: taskPacket.id,
    subagentId: subagent.id,
    summary: `Worker timeout after ${timeoutMs}ms`,
    details: { timeoutMs },
  }),
  workdir,
).catch(() => { /* best-effort */ });
```

Key rules:
- **Never await** — trace emission must not delay the timeout response
- **Always catch** — trace failure must not break the existing timeout path
- **Use `as any`** for eventType if the consuming package's compiled types haven't picked up the schema change yet (runtime validation in `createTraceEvent` still enforces correctness)
- **Capture workdir early** — if inside a Promise callback, hoist `context.workdir` before the Promise

## Dependency Addition for Trace Wiring

When wiring trace emit points requires adding `@tripp-os/agent-bus` as a dependency:

1. Add to package.json using workspace protocol: `"@tripp-os/agent-bus": "workspace:*"`
2. Run `pnpm install` (NOT `--frozen-lockfile` — the lockfile WILL change)
3. Run full typecheck + test matrix after
4. Only add to explicitly approved packages — never broaden

## Emit Point Deferral

Some emit points cannot be wired because the existing code doesn't carry the identifiers required by the trace schema validation. Example:

- `approval_timeout` requires `packetId` or `reviewId`
- `ApprovalQueue` items only carry `sessionId` + `runId`
- Adding `packetId` to `ApprovalRequest` would require a contract schema change
- **Defer and document** — don't force it or relax validation

### Resolution Pattern: Relax Validation, Don't Change Contracts

When an emit point is deferred because the upstream schema lacks an identifier, the safest resolution is often to **relax the trace validation** rather than **expand the upstream contract**:

1. **Check what identifiers ARE available** at the emit point (e.g., `runId` is in the approval item)
2. **Check if the trace schema can accept that identifier** (e.g., `AgentBusTraceEvent` already has a `runId` field)
3. **Relax the validation rule** to accept the available identifier (e.g., change from `packetId || reviewId` to `packetId || reviewId || runId`)
4. **Keep it backward-compatible** — adding accepted values, never removing
5. **No upstream contract changes** — the ApprovalRequest, ApprovalQueue, and all consumers stay untouched

This is a Stage 5 pattern: the validation relaxation is a local trace-schema change, not a cross-contract change. It's safe because:
- The trace schema already has the field (`runId`)
- The emit point already has the value
- The relaxation is additive (more ways to satisfy validation)
- No shared contracts are touched

**Contrast with the wrong approach:** Adding `packetId` to `ApprovalRequestSchema` would cascade through all Approver implementations (CliApprover, ApiApprover, ReadOnlyApprover, SwarmApprover, ApprovalGate) — a much broader change with cross-package impact.

## Stage 5: Schema-Safe Contract Resolution

When a trace event can't be wired because the upstream schema lacks an identifier (e.g., `approval_timeout` needs `packetId` but `ApprovalRequest` only carries `runId`), the safest path is a **validation relaxation in the trace schema**, not a contract-level change:

1. **Check available identifiers** at the emit point (e.g., `runId` IS in the approval item)
2. **Check the trace schema** already has the field (`AgentBusTraceEvent.runId` exists)
3. **Relax the validation rule** to accept the available field (e.g., `packetId || reviewId || runId`)
4. **Keep it backward-compatible** — adding accepted values, never removing
5. **Zero upstream contract changes** — ApprovalRequest, ApprovalQueue, all consumers untouched

**Why this beats contract expansion:** Adding `packetId` to `ApprovalRequestSchema` cascades through every Approver implementation (CliApprover, ApiApprover, ReadOnlyApprover, SwarmApprover, ApprovalGate) — a cross-package change. The validation relaxation is a local trace-schema change.

## Stage 6: Integration Test Harness Pattern

When the fake/manual pipeline is confirmed safe and timeout events are wired, add an integration test harness that proves the full pipeline:

1. **New test file** in `packages/cli/src/__tests__/` — no runtime source changes
2. **Import from existing deps only** — `@tripp-reason/external-agents` re-exports everything from agent-bus
3. **Test sections:** full trace chain (6+ events), timeout event validation, dispatch route safety, ApprovalGate integration, result read-back
4. **Use `as any`** for timeout event types — the test package's compiled types may be stale from schema additions in earlier stages
5. **Rebuild dependency packages** if tests fail with schema validation errors: `pnpm --filter @tripp-os/agent-bus build && pnpm --filter @tripp-reason/external-agents build`

### Approval Flow Hardening (Stage 6C)

After the integration harness is in place, harden the approval flow with additional test sections:

1. **Allow/deny ordering** — prove `approvalgate_required` always precedes `packet_claimed` for all agents
2. **Verdict safety** — revise verdict produces warden traces but zero mutation events; block verdict requires issues payload (architecturally valid — don't force-feed fake issues)
3. **Multi-run safety** — multiple sequential dry runs don't accumulate unauthorized state, ledger still validates
4. **Timeout coexistence** — all three timeout event types coexist in the same ledger without conflict
5. **Payload safety** — timeout event details never contain `api_key`, `password`, `secret`, `token`, or `prompt`; only safe keys (`timeoutMs`, `toolName`, `riskLevel`, `command`, `exitCode`, `signal`, `role`)

### Late Response: Architecturally Handled

The `ApprovalQueue.resolve()` method already rejects post-timeout responses:
```typescript
if (!item || item.status !== "pending") return false;
```
After timeout sets `status = "timed_out"`, late approvals are rejected by the existing guard. No additional hardening needed — document as sufficient.

## Stage 6D: Result Lifecycle Hardening Pattern

After the fake/manual pipeline and approval flow are hardened (Stages 6B/6C), harden what happens AFTER a run produces a result:

### 6D-1: Surface Audit
Audit every path that touches fake/manual results: dispatch result, CLI read-back, trace ledger events, timeout results, approval results, blocked/denied results. Identify states to test: completed/success, failed, blocked by approval, denied, timed out, malformed (if fixtureable), missing (if fixtureable), repeated sequential runs.

### 6D-2: Success/Failure Path Hardening
Add tests proving: result status matches trace event status, result packet contains required lifecycle fields, result does not leak raw payloads/secrets/tokens/prompts, result metadata includes safety warning. Add to existing integration test file.

### 6D-3: Blocked/Denied/Timeout Result Hardening
Prove: blocked/denied/timeout results are safe, traceable, and fail-closed. No late approval changes timeout outcome. No retry loop starts. If malformed/missing result modeling doesn't exist, document as not applicable.

### 6D-4: Sequential and Duplicate Result Hardening
Prove: consecutive runs produce distinct result IDs and distinct trace event IDs, no cross-run approval state leakage, ledger validates after multiple runs. If duplicate/late-result modeling doesn't exist, document as not applicable.

### 6D-5: Trace Coverage Audit
Confirm all result lifecycle trace coverage is complete and payload-safe. Don't invent new event types unless the gate blocks.

### 6D-6: Boundary Regression
Standard regression audit: live agents, fake/manual defaults, ApprovalGate, command execution, shared-bus, external repos.

### 6D-7: Consolidation
Same as other stage consolidations — recommend next gate (typically packet lifecycle audit → 6F).

### Test Sections Convention
New stages add sections to the existing integration test file (`fakeManualPipelineIntegration.test.ts`):
- S8: Result Success/Failure Path — 4 tests
- S9: Repeated Run Isolation — 4 tests
- Continue numbering from prior stages (S1-S7 from 6B/6C)

## Stage 6E: Dep-Approval Gate / Test Harness Wiring Pattern

When a "yellow flag" from a Stage 2 audit identifies a package with test files but no test harness, and the gate later approves resolving it:

### 6E-1: Dependency Audit
1. Inspect the package: `package.json`, existing scripts, test files, imports used
2. Check if the required tool (e.g., vitest) is already hoisted in workspace `node_modules`
3. Confirm the exact version convention used by other packages (`grep vitest **/package.json`)
4. Try running tests without adding the dep — pnpm strict mode will block access
5. Classify: no-dep-needed / devDep-needed / already-covered / broader-change-needed

### 6E-2: Minimum Wiring
Apply exactly the convention other packages in the workspace use:
```bash
# Add devDep (matches existing version convention)
pnpm --filter @scope/package add -D vitest@^2.1.0
# Add test script matching convention
# "test": "vitest run" in package.json scripts
```
**No vitest config file needed** if other packages don't have one — vitest auto-discovers via defaults.

### Post-Wiring Validation
1. Build the package: `pnpm --filter @scope/package build`
2. Run the package tests: `pnpm --filter @scope/package test`
3. Run full test matrix + typecheck
4. Verify frozen lockfile: `pnpm install --frozen-lockfile`

### 6E-3: Boundary Regression
Run targeted safety searches in the wired package's `src/`:
- `live|real_transport|dispatchToReal` — no new live paths
- `Tripp\.Control|Tripp\.OS` — 0 references to external repos
- `setInterval|watch|chokidar|background` — 0 background loops
- `shared-agent-bus|shared_agent_bus` — no shared-bus references outside the workspace dep
Standard regression: typecheck, full matrix, frozen lockfile, live-agent status, ApprovalGate, contracts unchanged.

### 6E-4: Consolidation
Recommend next gate. Typical: packet lifecycle audit (6F) if result lifecycle (6D) is hardened.

## Stage 6G: Packet Lifecycle Hardening Pattern

After result lifecycle (6D) and dep-approval (6E) are hardened, add S10-S14 to the integration test file:

- **S10: Packet Creation Edge Cases** — validate schema rejection of missing fields, invalid statuses, wrong trust zones. Use `require()` for schema imports to avoid workspace type resolution issues: `const { ValidatedTaskPacketSchema } = require("@tripp-reason/external-agents");`
- **S11: Read-Back Integrity** — round-trip through `writeTaskPacket`/`readTaskPacket`, prove defaults preserved, prove reads don't mutate, prove malformed JSON throws. Use `(writeTaskPacket as any)(...)` to bypass strict Zod enum type narrowing in tests.
- **S12: Dead-Letter / Rejection Coverage** — prove `movePacketToRejected` moves to `.tripp/agents/rejected/`, creates companion `.rejection.md` with timestamp, and records the reason.
- **S13: No-Live Guarantees** — prove default transport is `fake` with safety gates, `experimental_live` throws, `dispatchRoute` stays local. Use `(createDefaultTransportConfig as any)(...)` for all transport calls — strict Zod enum types block string literals in test contexts.
- **S14: Trace Ledger Completeness** — prove all events have `eventId` + `createdAt` (NOT `timestamp`), causal ordering, no live trace events, no API key patterns.

### S14 `tmpDir` closure pitfall
When defining a reusable `opts` object with `workdir: tmpDir` at the `describe` level, `tmpDir` is NOT yet set — `beforeEach` runs AFTER the describe block. Fix: use a **function** that returns the opts, called inside each `it`:

```typescript
// WRONG — tmpDir is undefined at describe time
const opts = { ... workdir: tmpDir };

// RIGHT — evaluates tmpDir at test time
function opts() { return { ... workdir: tmpDir }; }
// Inside each it: await executeAgentsDryRun(opts());
```

## Stage 6F: Packet Lifecycle Audit (Read-Only)

A read-only audit gate surveying the full packet lifecycle without code changes. Produces an inventory of lifecycle surfaces:

1. **Packet creation / intake** — schema validation, path bounding
2. **Approval request** — fail-closed defaults, bypass detection
3. **Approval grant / denial** — verdict paths tested, late response guarded
4. **Result emission** — success/timeout/crash bounded
5. **Timeout handling** — `Promise.race` + `clearTimeout`, fire-and-forget trace
6. **Trace ledger events** — coverage mapped, payloads safe
7. **File-bus fake/manual behavior** — local-only, path-validated, no transport
8. **Schema validation** — Zod + runtime refinements, no loopholes
9. **Dead-letter / rejection** — `movePacketToRejected` + `.rejection.md`
10. **Ownership boundaries** — Tripp.Control, Tripp.OS, shared-agent-bus = 0 references

Use `grep -r` to map every event type to source emit points and test files. Classify each: full/partial/runtime-only/missing. No implementation — if gaps exist, document and defer.

## Stage 6H: Runtime Trace Audit (Read-Only)

A read-only trace coverage audit across all 27 event types:

1. **Map every event type** to source emit points (`grep -r "\"$event\"" packages --include="*.ts" -l`)
2. **Classify coverage**: full (src+test), partial (src+≥1 test), runtime-only (src only), missing (neither)
3. **Verify causal ordering**: `createdAt` + `eventId` + `parentEventId` DAG
4. **Assess manifest sync readiness**: stable names, timestamps, packetIds, redaction, no-live, no-shared-bus
5. **Run safety searches**: `shared-agent-bus`, `Tripp\.Control`, `Tripp\.OS`, `experimental_live`, `setInterval`, `Notion`
6. **No changes made** — this is a pure audit gate

Runtime-only events (emit points exist but not exercised in fake pipeline) are design-expected, not blockers.

## Stage 6I: Design Gate (Zero Code Changes)

When a design gate is required before implementation, produce a comprehensive design document covering:

1. **Input sources** — where data comes from (single source, read once)
2. **Schema design** — both snapshot and per-entry schemas with every field enumerated
3. **State derivation rules** — lifecycle, approval, result, timeout, rejection with precedence
4. **Confidence model** — confirmed / trace-backed / partial-trace / runtime-only / inferred / unknown
5. **Redaction model** — always-safe fields, never-safe patterns, conditional truncation
6. **Ordering rules** — primary/secondary sort, causal DAG reconstruction
7. **Idempotency** — same input → byte-identical output
8. **Edge cases** — duplicates, missing, cycles, empty, unknown event types
9. **Test strategy** — phased plan for the next implementation gate
10. **Explicit non-goals** — what is NOT being built (live sync, Echo integration, etc.)

Use TypeScript-like interface definitions in the design doc. No code is written. The design must be specific enough that the next gate can implement it without further design decisions.

## Stage 6J: Test-First Implementation Gate

When implementing from a Stage 6I design:

1. **New module** in `packages/cli/src/` — pure functions, deterministic, static/manual
2. **New test file** in `packages/cli/src/__tests__/` — 5-phase test structure matching the design's test strategy
3. **Zero dependency changes** — use only existing workspace deps
4. **Phase structure**: 6J-1 Schema, 6J-2 Pure mapper, 6J-3 Redaction, 6J-4 Edge cases, 6J-5 Boundaries
5. **File output** goes to `.tripp/agents/manifest/` — path-bounded, no cross-project writes
6. **Optional Markdown companion** alongside JSON for human readability
7. **Boundary tests check** source code (not runtime) for forbidden patterns

### Manifest Sync Mapper Pattern

```typescript
// Pure function — deterministic, no side effects
export function buildManifestFromEvents(
  events: AgentBusTraceEvent[],
  options?: { source?: string; sourceMode?: string },
): ManifestSnapshot

// File reader — reads JSONL once, delegates to pure mapper
export async function buildManifestFromTraceFile(
  workdir?: string,
  options?: { source?: string; sourceMode?: string },
): Promise<ManifestSnapshot>

// File writer — writes JSON + optional Markdown to manifest dir
export async function writeManifest(
  snapshot: ManifestSnapshot,
  workdir?: string,
): Promise<{ jsonPath: string; mdPath: string }>
```

Key rules: deterministic (same input → same output), never polls/watches/subscribes, reads file once, writes only within workdir.

## Stage 6K: Manifest Sync Audit (Read-Only)

After manifest implementation (6J), audit the manifest as a contract:

1. **Read the full implementation** — verify every field from 6I design is present
2. **Classify alignment**: match/exact, minor-deviation, missing. Record in a table.
3. **Check purity**: pure function, deterministic output, explicit-only I/O
4. **Verify state derivation**: lifecycle, approval, result — precedence, edge cases
5. **Audit redaction**: 3 tiers (key names, value patterns, length truncation), redaction summary accuracy
6. **Validate file I/O**: read once, write explicit-only, path bounded, no markers
7. **Run safety searches** in the manifest module source: `shared-agent-bus`, `Tripp\.Control`, `Tripp\.OS`, `experimental_live`, `child_process`, `setInterval`, `fs\.watch`
8. **Classify yellow flags**: dead imports, reserved arrays, deferred features
9. **No code changes** in this gate

## Stage 6L: Manifest Output Fixture Gate

After audit (6K), produce a real fixture manifest validating the end-to-end pipeline:

1. **Create a fixture trace** with representative events: success, denied, timeout, partial, duplicate, unknown, redacted, tool-timeout
2. **Generate a manifest** from the fixture using `buildManifestFromEvents()`
3. **Verify per-packet**: lifecycle state, approval state, result state, confidence, source_event_ids, causal_root_event_id, latest_event_id
4. **Verify redaction**: apiKey → `[REDACTED]`, longPrompt truncated, safe fields intact
5. **Verify validation summary**: total/valid events, duplicates counted, missing targets counted
6. **Write + read-back**: `writeManifest()` → JSON + MD → `fs.readFile()` + `JSON.parse()` → verify fields survive round-trip
7. **Verify Markdown safety**: contains "FAKE/MANUAL", "Do not use for authorization", "ApprovalGate remains authoritative"
8. **Verify no secrets** in written JSON: raw values must not survive redaction
9. **Resolve Stage 6K yellow flags**: remove dead imports, document reserved arrays, document deferred cycle detection
10. **End-to-end dry run test**: `executeAgentsDryRun()` → `buildManifestFromTraceFile()` → verify manifest has trace events

## Stage 6M: Manifest Contract Audit (Read-Only)

After fixture validation (6L), audit the manifest shape as a stable internal contract:

1. **Classify contract scope**: internal-only vs public. Never promote to public without explicit approval.
2. **Snapshot contract**: all 15+ fields present, types documented, semantics clear
3. **Packet entry contract**: all 19+ fields present, state enumerations complete (12 lifecycle, 5 approval, 6 result)
4. **Redaction contract**: forbidden key names, value patterns, truncation rule — all documented
5. **Confidence contract**: all 4 produced levels + 2 reserved levels documented; edge cases mapped
6. **Fixture contract**: deterministic, covers all scenarios, usable without live deps
7. **Boundary contract**: `mutation_capability` always `"none"`, `source_mode` never `"live"`, zero shared-bus/Control/OS references
8. **Run safety searches**: same pattern as 6K
9. **Classify remaining yellow flags** as resolved/deferred/documentation-only

## Stage 6N: Operator Handoff Design (Design Gate)

After contract audit (6M), design how operator/Echo consume the manifest:

1. **Define producers and consumers**: who generates, who reads, who gets summaries only
2. **Define handoff bundle shape**: 5 files (manifest.json, manifest.md, handoff-summary.md, handoff-metadata.json, README-OPERATOR-HANDOFF.md)
3. **Define handoff metadata schema**: 17+ fields with types and semantics
4. **Define consumer permissions**: Operator (full read/inspect/compare/transfer), Echo (read-only evidence), Codex/Kimi/Tripp (summary only)
5. **Define forbidden actions**: no live-dispatch, no bus-mutation, no agent-activation, no cross-project-write, no auto-polling, no public-api-promotion
6. **Define invalid bundle conditions**: missing manifest, wrong mutation_capability, raw secrets, wrong contract_classification, live source_mode, cross-project paths
7. **Design handoff summary template**: operator-friendly markdown with quick stats, how-to-read, safety warnings
8. **Design README-OPERATOR-HANDOFF.md**: what you MAY do, what you MUST NOT do, contract classification, safety guarantees
9. **Preserve internal contract**: `contract_classification: "internal-fake-manual-only"` hardcoded
10. **Plan Stage 6O implementation**: 5-phase test structure (generator, schema, safety, invalid, boundary)

## Stage 6O: Static Handoff Bundle Implementation

After handoff design (6N), implement the 5-file bundle generator:

1. **New module**: `packages/cli/src/fakeManualHandoffBundle.ts` — single function `packageHandoffBundle(snapshot, workdir?)`
2. **Validation**: reject `mutation_capability !== "none"`, reject `source_mode` in forbidden list (`"live"`, `"experimental_live"`, `"cloud"`, `"remote"`), reject secret-like values in content, reject cross-project paths
3. **Output**: `.tripp/agents/handoff/handoff-bundle-<timestamp>/` directory with 5 files
4. **Handoff metadata**: generate `handoff-metadata.json` with all 17 fields, redaction status, confidence summary, stale state summary
5. **Handoff summary**: generate `handoff-summary.md` with quick stats, how-to-read instructions
6. **Operator README**: generate `README-OPERATOR-HANDOFF.md` with permissions and forbid-lists
7. **Reuse manifest.md**: call `buildManifestMarkdown()` if available, or inline the template
8. **Test phases**: 6O-1 generator (all 5 files), 6O-2 schema (all 17 metadata fields), 6O-3 safety (reject live/secret), 6O-4 invalid (6 rejection conditions), 6O-5 boundary (no shared-bus/Control/OS/Echo imports)
9. **Boundary test pattern**: read the source file with `fs.readFile()`, check for `from.*shared-agent-bus` and `require.*shared-agent-bus` (not literal string matches in README templates — those contain the terms in \"what you must NOT do\" instructions and will produce false positives)

## Pitfalls

- **tool_timeout requires `toolNames` at TOP LEVEL, not in `details`**: The trace schema validates `data.toolNames` (a top-level field: `z.array(z.string()).default([])`) — NOT `details.toolNames`. Passing `toolNames` inside `details` silently defaults to `[]` and fails the `tool_timeout must include at least one toolName` validation. Correct: `createTraceEvent({ eventType: "tool_timeout" as any, toolNames: ["shell"], details: { ... } })`.
- **Trace event timestamp field is `createdAt`, not `timestamp`**: `AgentBusTraceEvent.createdAt` — accessing `.timestamp` compiles fine (because `as any`) but returns `undefined` at runtime.
- **Event type names differ from intuitive guesses**: `warden_verdict_recorded` not `warden_verdict`, severity `"warning"` not `"warn"`, `command_executed` not `command_approval_granted`. Always grep the actual `AgentBusTraceEventTypeSchema` enum before writing assertions.
- **pnpm not on PATH from npm scripts**: Use `npx pnpm` — pnpm is available via npx even when not directly on PATH. This is the most reliable way to invoke pnpm in any context.
- **`import.meta.dirname` not available in all Node.js versions**: Use `fileURLToPath(import.meta.url)` with `path.dirname()` instead. The `import.meta.dirname` API is too new for some environments.
- **Source file boundary checks catch doc comments**: When testing source files for forbidden terms (e.g., `shared-agent-bus`), the source file itself may contain the term in a doc comment like "never mutates shared-agent-bus." Strip comments before regex matching: `src.replace(/\/\/.*|\/\*[\s\S]*?\*\//g, "")`.
- **TypeScript TS2783 — duplicate keys from spread**: When a helper function lists a field explicitly AND spreads `...overrides` which also has it, TypeScript errors with "specified more than once, so this usage will be overwritten." Fix: destructure the conflicting keys first: `const { eventType, packetId, ...rest } = overrides;` then build the object with `...rest` followed by explicit `eventType, packetId,`.
- **`executeAgentsDryRun` is in CLI, not external-agents**: Import from `"../agentsCommand.js"` in CLI test files — NOT from `@tripp-reason/external-agents`. The function is CLI-specific.
- **Missing test harness (dep-approval pattern)**: If a package has test files but no vitest devDep, defer AND document as a yellow flag. When later approved: (1) confirm dep is already hoisted in workspace, (2) match existing version convention exactly, (3) add devDep + test script only, (4) no config file unless other packages have one. This is Stage 6E — it's the resolution to the earlier "defer and document" stance.
- **Don't stop after every clean audit**: The user explicitly wants chaining. Only stop for real blockers
- **Test-only type errors don't block the chain**: Classify and fix them, don't halt the pipeline
- **Mirror schema changes**: `@tripp-os/agent-bus` and `@tripp-reason/external-agents` have duplicated trace schemas — update both
- **Stale compiled dist after schema changes**: New trace event types added to source schemas won't resolve in consuming packages until the schema packages are rebuilt. Run `pnpm --filter @tripp-os/agent-bus build && pnpm --filter @tripp-reason/external-agents build` before running tests that reference new event types. Tests that fail with "Type X is not assignable to Y" after schema additions are likely stale-dist failures, not code bugs.
- **CLI package can't directly import `@tripp-os/agent-bus`**: The CLI package doesn't have agent-bus as a dependency. Import from `@tripp-reason/external-agents` instead, which re-exports everything. Adding agent-bus as a CLI dep requires explicit approval.
- **pnpm strict mode blocks hoisted deps**: Even though vitest is installed in workspace `node_modules` (hoisted), pnpm won't let an undeclared package access it. `npx vitest` fails with "not found." The dep MUST be declared in `package.json` for pnpm to expose it.
- **`tmDir` closure pitfall with reusable opts**: When defining a reusable `opts` object with `workdir: tmpDir` at the `describe` level, `tmpDir` is NOT yet set because `beforeEach` runs AFTER the describe block evaluates. Fix: use a **function** that returns the opts, called inside each `it`: `function opts() { return { ... workdir: tmpDir }; }` → `await executeAgentsDryRun(opts())`
- **`approvalgate_required` may not be in validTypes produced by dry run**: The test's expected event types list may include events the current dry run doesn't produce. If `toContain` fails, check what's actually emitted and adjust assertions — don't force nonexistent events.
- **Source file boundary checks hit README templates**: When reading a source file to check for forbidden terms like `shared-agent-bus`, `Tripp.Control`, `Tripp.OS`, or `Echo`, the file may contain those terms in README template strings or "what you must NOT do" instructions. Instead of stripping string literals, check for imports/requires only: `expect(src).not.toMatch(/from.*shared-agent-bus/)` and `expect(src).not.toMatch(/require.*shared-agent-bus/)`
- **Vitest cwd path doubling in boundary tests**: When vitest runs from a package subdirectory (`packages/cli/`), `process.cwd()` already resolves there. Using `path.resolve(process.cwd(), "packages/cli/src/file.ts")` produces a doubled path: `packages/cli/packages/cli/src/file.ts`. Fix: use just the relative path from the package root: `path.resolve(process.cwd(), "src/file.ts")`.
- **Manifest `generated_at` non-deterministic by design**: Each call uses `new Date().toISOString()`. Tests should not assert exact timestamp values — only that it's a valid ISO 8601 string.
- **Manifest shape vs metadata shape in fixture tests**: The manifest snapshot has `confidence_level` (string), NOT `confidence_summary` (object). The handoff metadata derives `confidence_summary` from the manifest's packets. Don't assert `typeof parsed.confidence_summary === "object"` on manifest JSON — use `typeof parsed.confidence_level === "string"`.
- **Handoff fixture regex secret check**: In handoff-summary.md tests, don't use `/***/` (invalid regex — `*` needs a preceding atom). Use `/sk-[a-zA-Z0-9]{5}/` or a string-based check instead.
- **`/***/` invalid regex causes TypeScript `Expected 1 arguments, got 0`**: In test files, `/***/` is parsed as a regex with an invalid quantifier (first `*` has nothing to quantify). TypeScript catches this at the `.toMatch()` or `.not.toMatch()` call site. Fix: use a valid regex like `/sk-[a-zA-Z0-9]{5}/` or switch to a string-based check.
- **`expect().toContain() || expect().toContain()` void expression error**: `expect()` returns `void`, so chaining with `||` produces TypeScript error TS1345. Fix: use `String.includes()` with `||` and a single `expect()`: `const hasMatch = content.includes("x") || content.includes("y"); expect(hasMatch).toBe(true);`
- **`confidence_summary` vs `confidence_level` field mismatch**: The manifest snapshot has `confidence_level` (string), NOT `confidence_summary` (object). The handoff metadata DERIVES `confidence_summary` from packet analysis. When validating manifest JSON, assert `typeof parsed.confidence_level === "string"` — not `typeof parsed.confidence_summary === "object"`. The latter is `undefined` on the manifest.
- **pnpm not on PATH**: Use `npx --yes pnpm@9` — pnpm is available via npx even when not directly installed or on PATH. This is the most reliable cross-environment invocation. The `PATH=/usr/share/nodejs/corepack/shims:$PATH` approach in `tripp-reason-build-order` is VPS-specific; `npx pnpm@9` works everywhere.
- **Secret regex must match alphanumeric-only**: The secret pattern `/sk-[a-zA-Z0-9]{20,}/` only matches alphanumeric characters after `sk-`. Strings like `sk-proj-abcdef...` have hyphens and won't match. Use `sk-abcdefghijklmnopqrstuvwxyz` (no hyphens) when injecting test secrets.
- **`warnings`/`unknowns` reserved arrays**: Manifests initialize them as empty `[]` but may not populate in the initial implementation. Document as "reserved for future use" — don't force-populate with synthetic data.
- **Manifest Markdown builder: reuse, don't duplicate**: `buildManifestMarkdown()` is defined in `fakeManualManifest.ts`. The handoff bundle generator should call it directly rather than creating a third copy of the template.

## Report Files

Write reports to the specified path (typically `reports/tripp-reason-stage-{id}-{description}.md`). Also deliver the full content in chat as a code block.

## Reference Files

- `references/stage-5-schema-relaxation-pattern.md` — Stage 5 pattern: relax trace validation instead of expanding upstream contracts
- `references/stage-6-integration-harness-pattern.md` — Stage 6 pattern: fake/manual integration test harness with full trace coverage
- `references/integration-test-file-structure.md` — Template for S1-S7 integration test sections, imports, fixtures, and pitfalls
- `references/stage-6i-6j-manifest-sync-pattern.md` — Stage 6I design → 6J implementation: manifest sync mapper, schema, derivation rules, redaction, test structure
- `references/stage-6n-6q-handoff-bundle-chain.md` — Stages 6N→6O→6P→6Q: handoff design, bundle implementation, audit, fixture export — full 4-gate chain pattern with pitfall catalog
- `references/stage-6r-6s-operator-audit-simulation.md` — Stages 6R→6S: operator handoff audit + packet simulation — 2-gate chain with pitfall catalog
- `references/comprehensive-audit-sweep-template.md` — 16-section template for package/timeout/runtime readiness audits: repo proof → scripts inventory → validation matrix → timeout/queue/trace/approval/adapter/bus/contracts findings → forbidden sweep → drift → boundaries → marker

## References

- `references/decision-options.md` — Full decision option naming catalog for Tripp.Reason stages
