# Stage 6I → 6J: Manifest Sync Design → Implementation Path

## Architecture

The manifest sync layer is a **pure, deterministic, static/manual** mapper that transforms trace events into a structured snapshot. It never polls, watches, subscribes, or activates live agents.

### Module location
```
packages/cli/src/fakeManualManifest.ts        # mapper module
packages/cli/src/__tests__/fakeManualManifest.test.ts  # tests
```

### Three exported functions
```
buildManifestFromEvents(events, options?) → ManifestSnapshot     // pure
buildManifestFromTraceFile(workdir?, options?) → Promise<Snapshot>  // reads JSONL
writeManifest(snapshot, workdir?) → Promise<{jsonPath, mdPath}>     // writes files
```

### Design constraints
- Deterministic: same input → byte-identical output (sorted by createdAt, eventId tiebreaker)
- Static/manual: reads file once, never polls
- No live agents: zero dispatch, zero approval bypass
- Path-bounded: all output within `.tripp/agents/manifest/`
- No deps: zero dependency additions

## Manifest Snapshot Schema

```typescript
interface ManifestSnapshot {
  manifest_version: "1.0.0";
  generated_at: string;           // ISO 8601
  source: string;                 // "tripp-reason-fake-manual"
  source_mode: "fake" | "manual";
  sync_mode: "static_snapshot";
  mutation_capability: "none";
  trace_event_count: number;
  packet_count: number;
  confidence_level: "confirmed" | "trace-backed" | "partial-trace" | "unknown";
  confidence_reason: string;
  packets: ManifestPacketEntry[];
  warnings: string[];
  unknowns: string[];
  redaction_summary: RedactionSummary;
  validation_summary: ValidationSummary;
}
```

## Packet Entry Schema

```typescript
interface ManifestPacketEntry {
  packet_id: string;
  packet_type: string;            // "task"
  lifecycle_state: string;        // 12 states (pending → archived)
  approval_state: string;         // not_required/pending/granted/denied/timed_out
  result_state: string;           // none/success/partial/failure/timeout/blocked
  rejection_state: string | null; // "rejected" or null
  timeout_state: string | null;   // "timed_out" or null
  owner_or_agent: string;         // from agentRole or actorType
  created_at: string;             // earliest event createdAt
  updated_at: string;             // latest event createdAt
  source_event_ids: string[];     // all eventIds
  causal_root_event_id: string | null;
  latest_event_id: string | null;
  confidence_level: string;
  confidence_reason: string;
  warnings: string[];
  redaction_applied: string[];    // field names redacted
  safe_metadata: Record<string, unknown>;
}
```

## Lifecycle State Derivation (Precedence: highest last)

| State | Trigger Events |
|-------|---------------|
| pending | `packet_created` (default) |
| validating | `schema_validation_failed` |
| claimed | `packet_claimed` |
| awaiting_approval | `approvalgate_required` |
| approved | `mutation_applied` / `mutation_requested` |
| denied | `human_decision_recorded` |
| executing | `subagent_spawned` |
| completed | `result_written` |
| failed | `subagent_killed` / `validation_failed_later` |
| timeout | `task_timeout` / `tool_timeout` |
| timeout_approval | `approval_timeout` |
| rejected | `packet_rejected` (terminal) |
| archived | `packet_archived` (terminal) |

## Redaction Rules

| Rule | Pattern |
|------|---------|
| Secret key names | `/^api[_-]?key$/i`, `token`, `secret`, `password`, `credential`, `bearer`, `authorization` |
| API key values | `/sk-[a-zA-Z0-9]{20,}/` → `[REDACTED]` |
| Bearer tokens | `/Bearer\s+[a-zA-Z0-9_-]{20,}/` → `[REDACTED]` |
| Value truncation | Strings > 200 chars → `slice(0,200) + "..."` |
| Safe fields | All top-level trace fields (eventId, eventType, createdAt, etc.) — included as-is |

## Confidence Model

| Level | Criteria |
|-------|----------|
| `confirmed` | Full causal chain, all expected events present |
| `trace-backed` | Core events present, some optional missing |
| `partial-trace` | Causal chain has gaps (missing parentEventId target) |
| `runtime-only` | Event type exists only in source emit points |
| `inferred` | State derived from absence of events |
| `unknown` | Conflicting events, cycles, or no events at all |

## Test Structure (6J: 5 phases, 38 tests)

### 6J-1: Schema (7 tests)
Valid empty manifest, single-packet manifest, required snapshot fields, required packet fields, mutation_capability is "none", source/sync mode values, redaction summary exists.

### 6J-2: Pure Mapper (12 tests)
One test per lifecycle state derivation: pending, awaiting_approval, granted, denied, timeout, timeout_approval, completed, failed, rejected. Plus: stable ordering by createdAt, eventId tiebreaker, causal root + latest event IDs.

### 6J-3: Redaction (6 tests)
apiKey → [REDACTED], token → [REDACTED], API key value pattern → [REDACTED], redaction summary counts fields, long values truncated at 200 chars, safe top-level fields unchanged.

### 6J-4: Edge Cases (6 tests)
Duplicate eventId (first wins, flagged), missing parentEventId (partial-trace confidence), unknown event types don't crash, empty trace → empty manifest, events without packetId handled, idempotent (same input twice → identical).

### 6J-5: Boundaries (7 tests)
No shared-agent-bus in code (excluding comments), no Tripp.Control, no Tripp.OS, no polling/watchers/background loops/child_process, file output stays within manifest dir, buildManifestFromTraceFile reads real trace ledger, no live-agent activation.

## Helper Pattern: makeEvent()

```typescript
function makeEvent(overrides: Partial<AgentBusTraceEvent> & { eventType: any; packetId: string }): AgentBusTraceEvent {
  const { eventType, packetId, ...rest } = overrides;
  return {
    schemaVersion: "1.0.0",
    eventId: rest.eventId ?? randomUUID(),
    severity: "info",
    createdAt: rest.createdAt ?? new Date().toISOString(),
    actorType: "system",
    summary: rest.summary ?? `Event: ${eventType}`,
    ...rest,
    eventType,   // MUST come after ...rest to avoid TS2783
    packetId,    // MUST come after ...rest
  } as AgentBusTraceEvent;
}
```

The destructure-before-spread pattern avoids TS2783: when `eventType` and `packetId` are both in `overrides` AND in the explicit return fields, the spread of `...overrides` creates duplicate keys. Destructuring them first (removing from `rest`) prevents the conflict.
