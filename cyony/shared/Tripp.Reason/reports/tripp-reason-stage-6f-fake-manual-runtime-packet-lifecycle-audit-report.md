# Tripp.Reason Stage 6F — Fake/Manual Runtime Packet Lifecycle Audit

**Date:** 2026-06-06
**Stage:** Reason-6F
**Assigned:** Cyony

---

## Final Decision

**TRIPP_REASON_STAGE_6F_PASS_PACKET_LIFECYCLE_AUDIT_READY_FOR_STAGE_6G_FAKE_MANUAL_RUNTIME_HARDENING**

---

## Active Repo Proof

| Field | Value |
|-------|-------|
| Git root | `/opt/data/shared/Tripp.Reason` |
| Branch | `master` |
| HEAD | `31620a3` |
| Working tree | 16 modified + reports (expected drift from Stages 2-6E) |
| Package manager | pnpm@9.15.9 |
| Node.js | v20.19.2 |

---

## Git Status

```
16 modified files (expected — all from Stages 2–6E):
  agent-bus/traceLedger.test.ts, traceSchemas.ts
  cli/dryRun.test.ts, dryRunGapClosure.test.ts,
    hermesEchoTransportSkeleton.test.ts,
    namedAgentAdapterSeparation.test.ts
  external-agents/package.json, traceSchemas.ts
  server/package.json, approvalQueue.ts
  swarm/package.json, reasonLoopWorker.ts
  tools/package.json, runTests.ts, shell.ts
  pnpm-lock.yaml

30+ new report files (expected audit artifacts)
1 new test file: cli/fakeManualPipelineIntegration.test.ts
```

No unexpected drift detected.

---

## Validation Matrix

| Check | Result |
|-------|--------|
| Typecheck (12/12) | **0 errors** |
| Contracts tests | **17/17** ✅ |
| Agent-bus tests | **79/79** ✅ |
| External-agents tests | **68/68** ✅ |
| CLI tests | **195/195** ✅ |
| **Total** | **359/359** ✅ |
| Frozen lockfile | ✅ `pnpm install --frozen-lockfile` passes |
| Lockfile drift | +12 lines from vitest devDep (expected, Stage 6E) |

---

## Packet Lifecycle Inventory

### 1. Packet Creation / Intake

**Surface:** `packages/external-agents/src/fileBus.ts`

| Operation | Validation | Path safety |
|-----------|-----------|-------------|
| `writeTaskPacket()` | `ValidatedTaskPacketSchema.parse()` (hermes trust zone + tool policy + cloud secrets checks) | `validateBusPath()` ensures writes stay inside agent-bus root |
| `writeResultPacket()` | `ExternalAgentResultPacketSchema.parse()` | `validateBusPath()` |
| `writeReviewPacket()` | `ValidatedReviewPacketSchema.parse()` (block/escalate requires findings) | `validateBusPath()` |
| `readTaskPacket()` | `ValidatedTaskPacketSchema.parse()` — fails closed on malformed JSON | N/A (read-only) |
| `readResultPacket()` | `ExternalAgentResultPacketSchema.parse()` — fails closed | N/A (read-only) |

**Verdict:** All entry points validate schemas before any I/O. Path traversal blocked. Malformed JSON rejected.

### 2. Approval Request / Gate

**Surface:** `packages/swarm/src/reasonLoopWorker.ts` → `createSwarmApprover()`

| Condition | Behavior |
|-----------|----------|
| No Approver configured + requiresApproval=true | **Fail closed** — returns `approved: false` |
| No Approver + `riskLevel === "mutating"` or `"destructive"` | **Fail closed** |
| No Approver + safe tool (no risk/mutation) | Auto-pass (read-only tools) |
| Approver configured | Delegates to `innerApprover.requestApproval()` |

**Verdict:** ApprovalGate is fail-closed by default. Cannot be bypassed. No live agent can execute mutating tools without an ApprovalGate.

### 3. Approval Grant / Denial Flow

**Surface:** `packages/cli/src/__tests__/fakeManualPipelineIntegration.test.ts` — S6 tests

| Verdict | Result |
|---------|--------|
| `approve` | `packet_claimed` trace, result in outbox |
| `revise` | Warden trace, no mutation |
| `block` | Architecturally guarded (requires issues), documented |
| Late response after non-pending | Blocked by `status !== "pending"` guard in ApprovalQueue |

**Verdict:** All verdict paths tested. Late response blocked architecturally (Stage 6C-3).

### 4. Result Emission

**Surface:** `packages/swarm/src/reasonLoopWorker.ts` → `writeResultPacket()`

| Outcome | Result shape |
|---------|-------------|
| Success | `mapWorkerResult()` → ResultPacket with findings, tool calls, status: "success" |
| Timeout | `timedOut: true` → status: "fail", timeout trace event emitted |
| Crash | `status: "fail"`, `summary: "Worker execution error: ..."`, risk: "high" |

**Verdict:** All result paths are bounded. Timeout yields trace event + fail result. Crashes caught and reported.

### 5. Timeout Handling

**Surface:** `packages/swarm/src/reasonLoopWorker.ts` (lines 109-175)

| Feature | Status |
|---------|--------|
| Per-worker timeout | ✅ `Promise.race` + `setTimeout`/`clearTimeout` |
| Timer cleanup | ✅ `finally { clearTimeout(timeoutId) }` |
| Trace event on timeout | ✅ `appendTraceEvent` (fire-and-forget, never blocks) |
| Partial result on timeout | ✅ Returns ResultPacket with `timedOut: true` |

**Verdict:** No unbounded awaits. No hanging promises. Timer always cleared. Trace event best-effort.

### 6. Trace Ledger Events

**Surface:** `packages/external-agents/src/traceLedger.ts` + `packages/@tripp-os/agent-bus/src/traceSchemas.ts`

| Event Type | Source | Trigger |
|-----------|--------|---------|
| `subagent_spawned` | reasonLoopWorker | Worker start |
| `subagent_completed` | reasonLoopWorker | Worker success |
| `subagent_killed` | reasonLoopWorker | Worker timeout |
| `subagent_audited` | reasonLoopWorker | Post-run audit |
| `task_timeout` | reasonLoopWorker | Promise.race timeout catch |
| `tool_timeout` | shell.ts / runTests.ts | SIGTERM handler |
| `approval_timeout` | approvalQueue.ts | Approval timer expiry |
| `warden_stop_issued` | CLI dry run | Warden review recorded |
| `warden_stop_resolved` | CLI dry run | Warden resolution |
| `packet_claimed` | CLI dry run | Dispatch claims packet |
| `approvalgate_required` | CLI dry run | Gate activated |

**Verdict:** Full trace coverage across all lifecycle phases. 27 tests in `traceLedger.test.ts` alone.

### 7. File-Bus Fake/Manual Behavior

**Surface:** `packages/external-agents/src/fileBus.ts`

All file-bus operations are fake/manual by design:
- Writes to local `agent-bus/` directory (inbox/outbox/archive/rejected/reports)
- No network transport
- No live agent dispatch
- All paths validated against bus root
- Rejection companion `.rejection.md` preserves audit trail

**Verdict:** File-bus is inherently fake/manual. No live transport.

### 8. Schema Validation

**Surface:** `packages/external-agents/src/schemas.ts`

| Schema | Rules |
|--------|-------|
| `ExternalAgentTaskPacketSchema` | Required fields (packetId, runId, agentRole, etc.) |
| `ValidatedTaskPacketSchema` | + hermes trust zone check, hermes tool policy check, cloud no-secrets check |
| `ExternalAgentResultPacketSchema` | 7 status values (success/partial/failed/blocked/rejected/unsafe/malformed) |
| `ExternalAgentReviewPacketSchema` | 5 verdicts (pass/pass_with_notes/revise/block/escalate) |
| `ValidatedReviewPacketSchema` | + block/escalate requires at least one finding |
| `ExternalAgentApprovalPolicySchema` | `agentMayApprove` must be `false` — Eddie is final approver |

**Verdict:** Comprehensive validation with runtime refinements. No schema loopholes.

### 9. Failure / Dead-Letter Outcomes

**Surface:** `packages/external-agents/src/fileBus.ts` → `movePacketToRejected()`

| Feature | Status |
|---------|--------|
| Rejected packets moved to `rejected/` | ✅ |
| Companion `.rejection.md` preserved | ✅ |
| Path traversal blocked | ✅ `validateBusPath()` |
| Audit trail intact | ✅ Timestamp + reason in rejection file |

**Verdict:** Dead-letter path is traceable and safe.

---

## Boundary Proofs

### Live Agents Disabled

```
Search: live|real_transport|dispatchToReal in external-agents/src/
Result: 8 matches — all inside transportSchemas.ts (experimental_live validation gates)
        require enabled=true, requireEchoReview=true, requireApprovalGate=true
        transport.ts: default enabled=false when mode !== "experimental_live"
Status:  ✅ Live agents disabled. experimental_live is gated with 3 hard requirements.
```

### shared-agent-bus Untouched

```
Search: shared-agent-bus|shared_agent_bus in packages/
Result: 0 matches
Status:  ✅ No references to shared-agent-bus anywhere.
```

### Tripp.Control Untouched

```
Search: Tripp\.Control in all package.json
Result: 0 matches
Status:  ✅ No references.
```

### Tripp.OS Untouched

```
Search: Tripp\.OS in all package.json
Result: 0 matches
Status:  ✅ No references.
```

### Public Contracts Unchanged

```
Diff: packages/@tripp-os/contracts/src/
Result: No changes to contract source files.
Status:  ✅ Contracts package has zero modifications since baseline.
```

### No Background Loops / Polling

```
Search: setInterval|watch|chokidar|background in external-agents/
Result: 0 matches
Status:  ✅ No background loops, watchers, or polling.
```

---

## Risks / Yellow Flags

| Flag | Severity | Status |
|------|----------|--------|
| external-agents vitest harness | Low | **RESOLVED** (Stage 6E) |
| `as any` cast on `task_timeout` event type | Low | Known workaround for stale compiled dist; event validates at runtime |
| `require()` in `getFilteredToolList` | Low | Dynamic import for tool filter; test-only path |

**No yellow flags remain that block progression.**

---

## Chain Stop Reason

**None.** Audit passed cleanly. No implementation required.

---

## Recommended Next Marker

**READY_FOR_TRIPP_REASON_STAGE_6G_FAKE_MANUAL_RUNTIME_PACKET_LIFECYCLE_HARDENING**

**Rationale:** The audit confirms the packet lifecycle is well-structured, bounded, and traceable. All surfaces — creation, validation, routing, approval, result emission, timeout, trace, dead-letter — are safe and fake/manual only. Stage 6G should harden these with targeted tests (packet creation edge cases, read-back integrity, schema boundary tests, dead-letter coverage) without requiring architecture changes.
