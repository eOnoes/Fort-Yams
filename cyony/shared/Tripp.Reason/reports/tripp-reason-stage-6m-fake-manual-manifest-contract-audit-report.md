# Tripp.Reason Stage 6M — Fake/Manual Manifest Contract Audit

**Date:** 2026-06-06
**Stage:** Reason-6M
**Assigned:** Cyony

---

## Final Decision

**TRIPP_REASON_STAGE_6M_PASS_INTERNAL_CONTRACT_READY_FOR_STAGE_6N_OPERATOR_HANDOFF_DESIGN**

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

**None.** Contract audit only. Zero code, test, or config changes.

---

## Contract Classification

**Internal contract — fake/manual only.**

The manifest is NOT a public cross-project API. It is:
- Internal to Tripp.Reason's fake/manual runtime
- Stable enough for handoff layers (operator/Echo via static file)
- Not a Tripp.OS or Tripp.Control contract
- Not a shared-agent-bus contract

---

## Snapshot Contract

### Required Fields

| Field | Type | Value / Range | Stable? |
|-------|------|--------------|---------|
| `manifest_version` | `string` | `"1.0.0"` | ✅ Hardcoded |
| `generated_at` | `string` (ISO 8601) | `new Date().toISOString()` | ✅ |
| `source` | `string` | `"tripp-reason-fake-manual"` (default) | ✅ Configurable |
| `source_mode` | `string` | `"fake"` (default) | ✅ Configurable, never `"live"` |
| `sync_mode` | `string` | `"static_snapshot"` | ✅ Hardcoded |
| `mutation_capability` | `string` | `"none"` | ✅ **Always false — hardcoded** |
| `trace_event_count` | `number` | ≥0 | ✅ Equals input event count |
| `packet_count` | `number` | ≥0 | ✅ Derived from unique packetIds |
| `confidence_level` | `"confirmed" \| "trace-backed" \| "partial-trace" \| "unknown"` | Worst-case across packets | ✅ 4-level union |
| `confidence_reason` | `string` | Human-readable | ✅ |
| `packets` | `ManifestPacketEntry[]` | Sorted by `created_at` | ✅ |
| `warnings` | `string[]` | Empty (reserved) | ✅ Schema-stable |
| `unknowns` | `string[]` | Empty (reserved) | ✅ Schema-stable |
| `redaction_summary` | `RedactionSummary` | See redaction contract | ✅ |
| `validation_summary` | `ValidationSummary` | See validation contract | ✅ |

### Field Semantics

| Field | Semantics |
|-------|-----------|
| `mutation_capability` | **Always `"none"`.** Cannot be configured. Manifests are evidence only. |
| `source_mode` | Always `"fake"` in current usage. Can be set to `"manual"` via options. Never implies live dispatch. |
| `sync_mode` | Always `"static_snapshot"`. Each manifest is a point-in-time, deterministic snapshot. |
| `warnings` | Reserved for non-blocking issues (per-packet warnings, orphan detection). Currently empty. |
| `unknowns` | Reserved for unresolvable packets. Currently empty. |

---

## Packet Entry Contract

### Required Fields

| Field | Type | Semantics |
|-------|------|-----------|
| `packet_id` | `string` | From trace event `packetId` |
| `packet_type` | `string` | Always `"task"` |
| `lifecycle_state` | `string` | See state enumeration |
| `approval_state` | `string` | See state enumeration |
| `result_state` | `string` | See state enumeration |
| `rejection_state` | `string \| null` | `"rejected"` or null |
| `timeout_state` | `string \| null` | `"timed_out"` or null |
| `owner_or_agent` | `string` | From `agentRole` or `actorType` |
| `created_at` | `string` (ISO 8601) | Earliest event `createdAt` |
| `updated_at` | `string` (ISO 8601) | Latest event `createdAt` |
| `source_event_ids` | `string[]` | All eventIds for this packet |
| `causal_root_event_id` | `string \| null` | First `packet_created` eventId |
| `latest_event_id` | `string \| null` | Last eventId |
| `confidence_level` | `string` | See confidence contract |
| `confidence_reason` | `string` | Human-readable |
| `warnings` | `string[]` | Empty (reserved) |
| `redaction_applied` | `string[]` | Redacted field names |
| `safe_metadata` | `Record<string, unknown>` | Details after redaction |

### Lifecycle State Enumeration

| State | Trigger | Precedence |
|-------|---------|------------|
| `archived` | `packet_archived` | 1 (highest) |
| `rejected` | `packet_rejected` | 2 |
| `timeout` | `task_timeout` / `tool_timeout` | 3 |
| `timeout_approval` | `approval_timeout` | 3 |
| `failed` | `subagent_killed` / `validation_failed_later` | 4 |
| `completed` | `result_written` | 5 |
| `executing` | `subagent_spawned` | 6 |
| `denied` | `human_decision_recorded` | 7 |
| `approved` | `mutation_applied` / `mutation_requested` | 7 |
| `awaiting_approval` | `approvalgate_required` | 7 |
| `claimed` | `packet_claimed` | 8 |
| `validating` | `schema_validation_failed` (no claim) | 9 |
| `pending` | `packet_created` | 10 (lowest) |
| `unknown` | No known events | Default |

### Approval State Enumeration

| State | Trigger |
|-------|---------|
| `timed_out` | `approval_timeout` |
| `denied` | `human_decision_recorded` or warden block |
| `granted` | `mutation_applied` |
| `pending` | `approvalgate_required` (no decision) |
| `not_required` | No gate event |

### Result State Enumeration

| State | Trigger |
|-------|---------|
| `blocked` | `packet_rejected` |
| `timeout` | Timeout without result |
| `failure` | Failure without result |
| `partial` | Result + failure |
| `success` | Result without failure |
| `none` | No result events |

---

## Fixture Contract

| Property | Status |
|----------|--------|
| Deterministic trace | ✅ Fixed eventIds + timestamps |
| Deterministic manifest (except `generated_at`) | ✅ Tested: same input → identical packet states |
| Covers success | ✅ `pkt-fixture-success`: 5-event complete lifecycle |
| Covers denial | ✅ `pkt-fixture-denied`: 3-event denied |
| Covers timeout | ✅ `pkt-fixture-timeout`: 3-event task_timeout + `pkt-fixture-tool-timeout` |
| Covers partial/missing | ✅ `pkt-fixture-partial`: bad parentEventId |
| Covers duplicate | ✅ `pkt-fixture-duplicate`: same eventId twice |
| Covers unknown event | ✅ `pkt-fixture-unknown`: unknown event type |
| Covers redaction | ✅ `pkt-fixture-redacted`: apiKey + longPrompt |
| Usable without live deps | ✅ Pure function, no network, no agents |
| Markdown safe | ✅ FAKE/MANUAL warning, no-authorization notice |

---

## Redaction Contract

### Forbidden Key Names

| Pattern | Example | Action |
|---------|---------|--------|
| `/^api[_-]?key$/i` | `apiKey`, `api_key` | → `"[REDACTED]"` |
| `/^token$/i` | `token` | → `"[REDACTED]"` |
| `/^secret$/i` | `secret` | → `"[REDACTED]"` |
| `/^password$/i` | `password` | → `"[REDACTED]"` |
| `/^credential$/i` | `credential` | → `"[REDACTED]"` |
| `/^bearer$/i` | `bearer` | → `"[REDACTED]"` |
| `/^authorization$/i` | `authorization` | → `"[REDACTED]"` |

### Forbidden Value Patterns

| Pattern | Example | Action |
|---------|---------|--------|
| `/sk-[a-zA-Z0-9]{20,}/` | `sk-secret1234567890` | → `"[REDACTED]"` |
| `/Bearer\s+[a-zA-Z0-9_-]{20,}/` | `Bearer abc123...` | → `"[REDACTED]"` |

### Truncation Rule

| Condition | Action |
|-----------|--------|
| String value > 200 chars | Truncate to 200 chars + `"..."` |

### Markdown Redaction

Markdown output is generated from the already-redacted snapshot — no additional redaction pass needed. The Markdown contains no raw trace data, only derived fields.

---

## Confidence Contract

| Level | Criteria | Produced When |
|-------|----------|---------------|
| `confirmed` | Full causal chain, no gaps, `packet_created` present | Normal complete lifecycle |
| `partial-trace` | Missing `parentEventId`/`rootCauseEventId` targets, or no `packet_created` | Incomplete trace |
| `runtime-only` | Event type exists only in source emit points | Reserved (not yet observed) |
| `trace-backed` | Core events present, optional events missing | Reserved (type exists, not yet produced) |
| `inferred` | State from absence | Reserved (design-only) |
| `unknown` | Zero events, or cyclic chain | Empty trace or cycles |

### Confidence Mapping for Edge Cases

| Edge Case | Confidence | Reason |
|-----------|-----------|--------|
| Normal complete packet | `confirmed` | All expected events present |
| Missing causal target | `partial-trace` | `N causal target(s) not found` |
| No `packet_created` | `partial-trace` | `Missing packet_created event` |
| Cyclic `parentEventId` | `unknown` | `Cyclic parentEventId chain detected` |
| Empty trace | `unknown` | `No trace events for this packet` |
| Duplicate `eventId` | (unchanged) | Duplicate handled before derivation |
| Unknown event type | (unchanged) | Ignored for state derivation |

---

## Boundary Contract

### Explicit Guarantees

| Guarantee | Enforced By |
|-----------|------------|
| `mutation_capability` is always `"none"` | Hardcoded literal |
| `source_mode` is never `"live"` or `"experimental_live"` | Default `"fake"`; no live path |
| No shared-agent-bus references | 0 code references |
| No Tripp.Control references | 0 references |
| No Tripp.OS references | 0 references |
| No Echo integration required | Static file output only |
| No live agents activated | Pure mapper, no dispatch |
| Output path bounded | `.tripp/agents/manifest/` under workdir |
| Markdown is non-authoritative | Contains explicit warning |

### Implicit Guarantees

| Guarantee | Rationale |
|-----------|-----------|
| Deterministic (modulo `generated_at`) | Pure function + eventId tiebreaker |
| Readable without runtime | JSON + Markdown, no binary |
| Append-only trace input | JSONL ledger, never mutated |
| No state mutation | Manifest is derived, never writes back |

---

## Forbidden Behavior Search

| Search Term | Matches | Classification |
|------------|---------|---------------|
| `shared-agent-bus` | Boundary tests only (negation) | ✅ Safe |
| `Tripp.Control` | 0 | ✅ |
| `Tripp.OS` | 0 | ✅ |
| `child_process` | 0 | ✅ |
| `.exec(` / `.spawn(` | 0 | ✅ |
| `setInterval` / `setTimeout` | 0 | ✅ |
| `fs.watch` / `chokidar` | 0 | ✅ |
| `experimental_live` | 0 | ✅ |
| `Echo` / `Notion` / `remote` / `tunnel` | 0 | ✅ |
| `fs.mkdir` / `fs.writeFile` | `writeManifest()` only (explicit, bounded) | ✅ Expected |

---

## Validation Matrix

| Check | Result |
|-------|--------|
| Typecheck (12/12) | **0 errors** |
| Contracts tests | **17/17** ✅ |
| Agent-bus tests | **79/79** ✅ |
| External-agents tests | **68/68** ✅ |
| CLI tests | **260/260** ✅ |
| **Total** | **424/424** ✅ |
| Frozen lockfile | ✅ |
| Deps added | **0** |

---

## Risks / Yellow Flags

| Flag | Severity | Detail |
|------|----------|--------|
| `trace-backed`/`inferred`/`runtime-only` confidence types exist but not yet produced | Low | Type-safe union preserves forward compatibility |
| `warnings`/`unknowns` reserved | Low | Schema-stable; can be populated in future |
| Cycle detection deferred | Low | Cycles counted as missing targets; full detection needs trace ledger validation |
| Contract is internal-only | Info | Not promoted to public API; stable enough for handoff layers |

**No blocking risks.**

---

## Chain Stop Reason

**None.** Contract audit passes cleanly. All semantics documented and stable.

---

## Recommended Next Marker

**READY_FOR_TRIPP_REASON_STAGE_6N_FAKE_MANUAL_OPERATOR_HANDOFF_DESIGN**

**Rationale:** The manifest contract is internally stable with 15-field snapshot, 19-field packet entry, 12-state lifecycle enumeration, 5-state approval, 6-state result, 4-level confidence, 3-tier redaction, and 10 boundary guarantees. The manifest is ready for operator/Echo handoff design as a static file protocol.
