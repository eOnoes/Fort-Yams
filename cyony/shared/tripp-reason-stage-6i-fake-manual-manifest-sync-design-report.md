# Tripp.Reason Stage 6I — Fake/Manual Manifest Sync Design

**Date:** 2026-06-06
**Stage:** Reason-6I
**Assigned:** Cyony

---

## Final Decision

**TRIPP_REASON_STAGE_6I_PASS_MANIFEST_SYNC_DESIGN_READY_FOR_STAGE_6J_FAKE_MANUAL_MANIFEST_SYNC_IMPLEMENTATION**

---

## Active Repo Proof

| Field | Value |
|-------|-------|
| Git root | `/opt/data/shared/Tripp.Reason` |
| Branch | `master` |
| HEAD | `31620a3` |
| Package manager | pnpm@9.15.9 |
| Node.js | v20.19.2 |

---

## Files Changed

**None.** Design gate only. Zero code changes.

---

## Stage 6H Input Summary

| Metric | Value |
|--------|-------|
| Trace event types | 27 |
| Full coverage | 13 |
| Partial coverage | 8 |
| Runtime-only emit points | 6 |
| Missing events | 0 |
| Causal ordering | ✅ Timestamps + eventId + parentEventId DAG |
| Metadata safety | ✅ Secrets in details (opt-in); top-level safe |
| Manifest sync ready | ✅ All 12 prerequisites met |

---

## 1. Input Trace Event Sources

The manifest sync consumes from a single source:

| Source | Format | Path Pattern |
|--------|--------|-------------|
| Trace ledger | JSONL (append-only) | `<workdir>/.tripp/agents/trace/agent-bus-trace.jsonl` |

No other inputs. No live streams, no polling, no file watchers.

---

## 2. Required Event Fields

Every trace event in the ledger carries these required fields:

| Field | Type | Description |
|-------|------|-------------|
| `eventId` | string (UUID) | Unique event identifier |
| `eventType` | AgentBusTraceEventType | One of 27 enum values |
| `severity` | debug \| info \| warning \| error \| critical | Event severity |
| `createdAt` | ISO 8601 string | Event timestamp |
| `actorType` | AgentBusTraceActorType | Who/what produced the event |
| `summary` | string | Human-readable event description |
| `schemaVersion` | string | Schema version (default "1.0.0") |

---

## 3. Optional Event Fields

| Field | Type | Used When |
|-------|------|-----------|
| `packetId` | string | Lifecycle events tied to a task packet |
| `resultId` | string | Result emission events |
| `runId` | string | Grouping correlated events |
| `parentRunId` | string | Nested/cascaded runs |
| `reviewId` | string | Echo/warden review events |
| `parentEventId` | string | Causal backlinks |
| `rootCauseEventId` | string | Failure root cause |
| `agentRole` | ExternalAgentRole | Agent that produced the event |
| `subagentId` | string | Subagent lifecycle events |
| `toolNames` | string[] | Tool-loaded/timeout events |
| `sourcePath` | string | File path for read/write events |
| `targetPath` | string | Target path for move/archive events |
| `details` | Record\<string, unknown\> | Opaque payload (must be redacted) |
| `tags` | string[] | Optional categorization |
| `actorId` | string | Specific actor instance |

---

## 4. Redaction Rules

| Rule | Scope | Action |
|------|-------|--------|
| **Always safe** | `eventId`, `eventType`, `severity`, `createdAt`, `actorType`, `summary`, `schemaVersion`, `packetId`, `resultId`, `runId`, `parentRunId`, `reviewId`, `parentEventId`, `rootCauseEventId`, `agentRole`, `subagentId`, `subagentRole`, `toolNames`, `sourcePath`, `targetPath`, `tags` | **Include as-is** |
| **Never safe** | API keys matching `/sk-[a-zA-Z0-9]{20,}/` | **Strip entirely** |
| **Never safe** | Bearer tokens matching `/Bearer\s+[a-zA-Z0-9_-]{20,}/` | **Strip entirely** |
| **Never safe** | `details` fields named `apiKey`, `token`, `secret`, `password`, `credential` | **Replace with `"[REDACTED]"`** |
| **Conditional** | `details` fields named `prompt`, `objective`, `context` | **Include but truncate to 200 chars** |
| **Conditional** | `details` fields with unknown keys | **Include as-is** (opaque but safe) |
| **Representation** | Every redacted field | **Record in `redaction_applied` on packet entry** |

---

## 5. Event Ordering Rules

1. Primary sort: `createdAt` (ISO 8601, string-sortable)
2. Secondary sort: `eventId` (UUID tiebreaker)
3. Causal edges: `parentEventId` → `eventId` reconstructs partial DAG
4. No reordering — manifest preserves ledger order
5. Events with identical `createdAt` are sorted by `eventId` lexicographically

---

## 6. Causal DAG Reconstruction Rules

For each packet, reconstruct the causal chain:

1. Find the earliest event for the packet (root = `packet_created`)
2. Follow `parentEventId` → `eventId` edges for branching chains (timeout, retry, cascaded runs)
3. Follow `rootCauseEventId` → `eventId` for failure attribution
4. Events without `parentEventId` are roots
5. Events with `parentEventId` pointing to a missing event are flagged with `confidence: "partial-trace"`
6. Cyclic references (should not exist) break the chain and flag `confidence: "unknown"`

---

## 7. Packet Lifecycle State Derivation

State is derived by scanning all events for a given `packetId` and applying precedence rules:

| State | Trigger Events | Precedence |
|-------|---------------|------------|
| `pending` | `packet_created` (default) | Lowest |
| `validating` | `packet_read`, `schema_validation_failed` | Overrides pending |
| `claimed` | `packet_claimed` | Overrides validating |
| `awaiting_approval` | `approvalgate_required` | Overrides claimed |
| `approved` | `mutation_requested` → `mutation_applied` | Overrides awaiting |
| `denied` | `human_decision_recorded` (denial) | Overrides awaiting |
| `executing` | `subagent_spawned` | Overrides approved |
| `completed` | `result_written` | Overrides executing |
| `failed` | `validation_failed_later`, `subagent_killed` | Overrides executing |
| `timeout` | `task_timeout`, `tool_timeout`, `approval_timeout` | Overrides executing/awaiting |
| `rejected` | `packet_rejected` | Terminal (highest) |
| `archived` | `packet_archived` | Terminal (highest) |

**Rule:** The latest applicable event type determines the state. Terminal states (rejected, archived) cannot be overridden.

---

## 8. Approval State Derivation

| Approval State | Trigger Events | Confidence |
|---------------|---------------|------------|
| `not_required` | No `approvalgate_required` event | `confirmed` |
| `pending` | `approvalgate_required` present, no decision | `trace-backed` |
| `granted` | `mutation_requested` → `mutation_applied` | `confirmed` |
| `denied` | `human_decision_recorded` (denial) or `warden_verdict_recorded` (block) | `confirmed` |
| `timed_out` | `approval_timeout` present, no decision | `confirmed` |
| `unknown` | Conflicting events or missing causal chain | `unknown` |

---

## 9. Result State Derivation

| Result State | Trigger Events | Confidence |
|-------------|---------------|------------|
| `none` | No result events | `inferred` |
| `success` | `result_written` with no failure/timeout events | `confirmed` |
| `partial` | `result_written` + `validation_failed_later` | `trace-backed` |
| `failure` | `subagent_killed` or `validation_failed_later` (no result) | `trace-backed` |
| `timeout` | `task_timeout` / `tool_timeout` + no `result_written` | `confirmed` |
| `blocked` | `packet_rejected` | `confirmed` |

---

## 10. Timeout / Crash / Rejection State Derivation

| State | Trigger | Overrides |
|-------|---------|-----------|
| `timeout_approval` | `approval_timeout` | Overrides `awaiting_approval` |
| `timeout_task` | `task_timeout` | Overrides `executing` |
| `timeout_tool` | `tool_timeout` | Overrides `executing` |
| `crash_subagent` | `subagent_killed` | Overrides `executing` |
| `crash_validation` | `validation_failed_later` | Overrides `completed` |
| `rejected_safety` | `packet_rejected` + `.rejection.md` | Terminal |
| `rejected_schema` | `schema_validation_failed` + `packet_rejected` | Terminal |

---

## 11. Confidence Level Derivation

| Level | Criteria |
|-------|----------|
| `confirmed` | Full causal chain with no gaps; all expected events present |
| `trace-backed` | Core events present but one or more optional events missing |
| `partial-trace` | Causal chain has gaps (missing `parentEventId` target) |
| `runtime-only` | Event types exist only in source emit points, never seen in trace |
| `inferred` | State derived from absence of events rather than presence |
| `unknown` | Conflicting events, cyclic references, or no events at all |

**Default for packets with zero events:** `unknown`

---

## 12. Manifest Snapshot Schema

```typescript
interface ManifestSnapshot {
  manifest_version: string;          // "1.0.0"
  generated_at: string;              // ISO 8601
  source: string;                    // "tripp-reason-fake-manual"
  source_mode: string;               // "fake" | "manual"
  sync_mode: string;                 // "static_snapshot"
  mutation_capability: string;       // "none"
  trace_event_count: number;         // Total events scanned
  packet_count: number;              // Unique packets derived
  confidence_level: "confirmed" | "trace-backed" | "partial-trace";
  confidence_reason: string;         // Human-readable explanation
  packets: ManifestPacketEntry[];    // One entry per unique packetId
  warnings: string[];                // Non-blocking issues
  unknowns: string[];                // Unresolvable packets/events
  redaction_summary: RedactionSummary;
  validation_summary: ValidationSummary;
}

interface RedactionSummary {
  fields_redacted: number;
  secrets_stripped: number;
  prompts_truncated: number;
  redaction_rules_applied: string[];
}

interface ValidationSummary {
  total_events: number;
  valid_events: number;
  malformed_events: number;
  duplicate_event_ids: number;
  missing_causal_targets: number;
  is_valid: boolean;
}
```

---

## 13. Manifest Packet Entry Schema

```typescript
interface ManifestPacketEntry {
  packet_id: string;
  packet_type: string;               // Derived from taskType or "unknown"
  lifecycle_state: string;           // See §7
  approval_state: string;            // See §8
  result_state: string;              // See §9
  rejection_state: string | null;    // See §10
  timeout_state: string | null;      // See §10
  owner_or_agent: string;            // Derived from agentRole
  created_at: string;                // Earliest event createdAt
  updated_at: string;                // Latest event createdAt
  source_event_ids: string[];        // All eventIds for this packet
  causal_root_event_id: string;      // First eventId (or null)
  latest_event_id: string;           // Last eventId
  confidence_level: string;          // See §11
  confidence_reason: string;
  warnings: string[];
  redaction_applied: string[];       // Fields redacted for this packet
  safe_metadata: Record<string, unknown>; // Subset of details after redaction
}
```

---

## 14. Manifest Update Rules

| Rule | Description |
|------|-------------|
| **Regenerate, don't patch** | Each manifest run produces a complete snapshot |
| **No incremental updates** | The manifest is a point-in-time snapshot |
| **Idempotent** | Same input trace → same output manifest (deterministic) |
| **No cross-manifest merging** | Each manifest is self-contained |
| **No live merge** | Manifests are never merged with running state |

---

## 15. Idempotency Rules

| Rule | Description |
|------|-------------|
| Same trace → same manifest | Deterministic output (sorting by eventId tiebreaker) |
| Empty trace → valid empty manifest | `packet_count: 0`, confidence: "unknown" |
| Duplicate eventIds in trace | Use first occurrence, flag in `warnings` |
| Re-run with no changes | Produces byte-identical manifest |

---

## 16. Duplicate Event Handling

| Scenario | Behavior |
|----------|----------|
| Duplicate `eventId` | Use first occurrence; flag `duplicate_event_ids` in validation |
| Same `packetId`, different `eventId` | Normal — multiple events per packet |
| Same `packetId` + `eventType` repeated | Normal — e.g., multiple `packet_read` events |
| Cyclic `parentEventId` chains | Break at cycle; flag `confidence: "unknown"` |

---

## 17. Missing Event Handling

| Missing Scenario | Behavior |
|-----------------|----------|
| `parentEventId` targets non-existent event | Flag `missing_causal_targets`; `confidence: "partial-trace"` |
| `rootCauseEventId` targets non-existent event | Same as above |
| No `packet_created` for a packet | `lifecycle_state: "unknown"`, `confidence: "partial-trace"` |
| No events at all for a referenced `packetId` | Create entry with `confidence: "unknown"` |

---

## 18. Runtime-Only Event Handling

The 6 runtime-only events (`packet_read`, `result_read`, `schema_validation_failed`, `subagent_killed`, `subagent_audited`, `warden_stop_issued`, `human_decision_recorded`) are handled as follows:

| Rule | Description |
|------|-------------|
| State derivation includes them | If present in trace, they affect lifecycle state |
| Absence is not an error | These are design-expected to be absent in fake pipeline |
| `confidence: "runtime-only"` | Applied if an event type exists only in source emit points and has never been observed |
| No special casing | They use the same state derivation rules as all other events |

---

## 19. Unknown State Handling

| Scenario | Behavior |
|----------|----------|
| Packet with zero trace events | `lifecycle_state: "unknown"`, included in `unknowns[]` |
| Conflicting events (e.g., `result_written` + `packet_rejected`) | `lifecycle_state: "conflict"`, flagged in `warnings[]` |
| Event type not in known enum | Counted as malformed by `validateTraceLedger`, excluded from manifest |
| Packet referenced but never created | `lifecycle_state: "orphan"`, `confidence: "unknown"` |

---

## 20. Report / Audit Output Format

The manifest is a single JSON file:

```
<workdir>/.tripp/agents/manifest/manifest-<timestamp>.json
```

Optional companion Markdown summary:

```
<workdir>/.tripp/agents/manifest/manifest-<timestamp>.md
```

The Markdown summary includes:
- Packet count and confidence distribution
- Approval state breakdown
- Timeout/crash/rejection counts
- Redaction summary
- Warnings and unknowns (collapsed)
- "⚠️ This is a FAKE/MANUAL manifest. No live execution occurred."

---

## 21. Test Strategy for Stage 6J

Stage 6J should implement test-first, fake/manual only:

### Phase 6J-1: Schema Tests
- Manifest snapshot schema validates
- Packet entry schema validates
- Empty manifest schema validates
- Redaction summary schema validates
- Validation summary schema validates

### Phase 6J-2: Pure Mapper Tests
- Single `packet_created` event → correct entry
- Full pass pipeline → correct lifecycle order
- Revise pipeline → correct denial state
- Three timeout types → correct timeout states
- Rejection + .rejection.md → correct rejection state
- Three sequential runs → distinct entries, no leakage

### Phase 6J-3: Redaction Tests
- API key in details → stripped
- Bearer token in details → stripped
- Named secret field → replaced with `[REDACTED]`
- Safe fields → included as-is
- Prompt truncation → 200 chars max

### Phase 6J-4: Edge Case Tests
- Duplicate eventId → first wins, flag
- Missing parentEventId target → partial-trace confidence
- Cyclic parentEventId chain → break, unknown confidence
- Empty trace → empty manifest, packet_count: 0
- Unknown event type → excluded, counted as malformed

### Phase 6J-5: Boundary Tests
- No live agent activation
- No shared-agent-bus mutation
- No Tripp.Control/Tripp.OS references
- Manifest stays within `.tripp/agents/manifest/`
- Frozen lockfile unchanged
- No new dependencies

---

## 22. Explicit Non-Goals

| Non-Goal | Why Not |
|----------|---------|
| Live manifest sync | Requires polling/watchers — never in fake/manual |
| Echo integration | Echo owns cross-project trace; this is Tripp.Reason only |
| Notion export | Out of scope for Tripp.Reason |
| Real-time dashboard | Would require background loops |
| Cross-project manifest merge | Tripp.Control / Tripp.OS boundaries |
| Manifest diff / changelog | V2 feature; not needed for initial sync |
| Manifest-to-manifest comparison | V2 feature |
| Automated manifest delivery to Echo | Echo gateway currently down; design for static file only |
| Incremental manifest | Static snapshot is simpler and idempotent |

---

## Static / Manual Boundary Proof

| Constraint | Enforced By |
|-----------|------------|
| No polling | Design: `readTraceEvents` reads file once |
| No watchers | Design: no `fs.watch` / chokidar |
| No background loops | Design: function called explicitly, returns immediately |
| No subscriptions | Design: no event emitters |
| No live transport | Design: reads local JSONL file only |
| No shared-bus writes | Design: writes to local `.tripp/agents/manifest/` only |
| No cross-project writes | Design: all output within workdir |
| No live agent activation | Design: no dispatch, no approval bypass |

---

## Boundary Proofs

| Boundary | Status |
|----------|--------|
| Live agents | Disabled (no dispatch path in manifest code) |
| Fake/manual defaults | Unchanged |
| ApprovalGate | Not involved (manifest reads trace, never approves) |
| shared-agent-bus | Untouched (0 references) |
| Tripp.Control | Untouched (0 references) |
| Tripp.OS | Untouched (0 references) |
| Public contracts | Zero changes |
| Dependencies | Zero additions |

---

## Validation

Since this is a design-only gate with zero code changes, full test suite re-run is not required. Baseline confirmed:

| Check | Result |
|-------|--------|
| Typecheck (12/12) | 0 errors |
| Tests | 376/376 (unchanged) |
| Lockfile | Clean, frozen OK |

---

## Risks / Yellow Flags

| Risk | Severity | Mitigation |
|------|----------|------------|
| Manifest format drift between design and implementation | Low | Stage 6J implements test-first; schema tests lock the contract |
| `details` field redaction is best-effort | Low | Redacted fields recorded in manifest; consumer can verify |
| Runtime-only events not observable in fake pipeline | Low | Design handles absence gracefully; confidence reflects it |
| Echo handoff needs separate design gate | Info | Explicit non-goal; static file is sufficient for now |

---

## Chain Stop Reason

**None.** Design is complete and ready for implementation.

---

## Recommended Next Marker

**READY_FOR_TRIPP_REASON_STAGE_6J_FAKE_MANUAL_MANIFEST_SYNC_IMPLEMENTATION**

**Rationale:** The manifest sync design covers all 22 required scope items with concrete schemas, derivation rules, redaction model, confidence levels, and a test-first Stage 6J implementation plan. No implementation was performed — this is a pure design artifact ready for the next gate.
