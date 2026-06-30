# Tripp.OS Runtime Design v0

**Status:** Draft for review
**Date:** 2026-06-03
**Phase:** Stage 5 — Design Only

---

## 1. Purpose

Tripp.OS Runtime is the side-effecting process that coordinates and governs all operational aspects of the Tripp.OS family. It sits between Tripp.Control (operator dashboard), Tripp.Reason (agent execution), and external agents (Hermes, OpenClaw Tripp/Echo, Codex, future).

Runtime is the **safety kernel** — it enforces the ApprovalGate, writes the trace ledger, manages packet lifecycles, and provides the Control-facing API.

Runtime is NOT a reasoning engine, NOT a swarm brain, and NOT a dashboard.

---

## 2. Non-Goals

- Implementation in this phase
- Live Hermes/OpenClaw/Codex adapter implementation
- Dashboard/API/server implementation
- MCP/store extraction
- Stage 1B/v5 contract expansion
- Autonomous background workers
- Recursive live swarm brain
- Direct agent-to-agent communication without Runtime mediation

---

## 3. Current Inputs

Runtime may consume from:

### @tripp-os/contracts v0.1.0

- **Status enums** — RunStatus, SessionStatus, ToolCallStatus, ApprovalStatus, EventType, RiskLevel, MessageRole, ReportStatus, FinishReason
- **Generic interfaces** — ToolContext, ToolResult, ProviderRequest, ApprovalRequest, ApprovalResult
- **StreamEvent schemas** — StreamEvent union and all 5 subtypes (generic, flexible-role variants)
- **Core interfaces** — Tool, ToolDispatcher, ProviderAdapter, Approver
- **Version constant** — CONTRACTS_VERSION / PACKAGE_CONTRACT_VERSION

### @tripp-os/agent-bus v0.1.0

- **Packet schemas** — ExternalAgentTaskPacket, ExternalAgentResultPacket, ExternalAgentReviewPacket
- **File bus helpers** — read/write/list/move for inbox/outbox/reports/archive/rejected
- **Trace schemas** — AgentBusTraceEvent (24 event types, 5 severities, 8 actor types)
- **Trace ledger helpers** — append/read/validate/query/causal chain
- **Transport schemas** — configs with safety rules (no direct mutation, cloud no-secrets)
- **Transport helpers** — fake dispatch, manual file dispatch
- **Constants** — bus paths, denied paths, schema version, max packet size

---

## 4. Proposed Runtime Package Shape

### 4.1 — `@tripp-os/runtime-core`

**Purpose:** Runtime process lifecycle, state model, health monitor, safe mode/panic controller.

**Allowed dependencies:** `@tripp-os/contracts`, `@tripp-os/agent-bus`, `zod`, Node built-ins.

**Forbidden dependencies:** `@tripp-reason/*`, Tripp.Control internals, Hermes/OpenClaw/Codex SDKs.

**Public surface:**
- `Runtime` class (start/stop/status/panic)
- `RuntimeConfig` schema
- `RuntimeStatus` enum (initializing / running / safe_mode / panicked / stopped)
- `HealthSnapshot` type
- `SafeModeTrigger` enum
- `createRuntime(config: RuntimeConfig): Runtime`

**Risk level:** HIGH — this is the safety kernel.

---

### 4.2 — `@tripp-os/runtime-queue`

**Purpose:** Queue manager — packet ingestion, dispatch routing, lifecycle tracking, dead-letter handling.

**Allowed dependencies:** `@tripp-os/contracts`, `@tripp-os/agent-bus`, `@tripp-os/runtime-core` (types only, no runtime import).

**Forbidden dependencies:** Adapter implementations, dashboard internals.

**Public surface:**
- `QueueManager` class
- `PacketLifecycle` state machine (pending → claimed → completed/rejected/blocked/malformed/archived)
- `enqueuePacket(packet: ExternalAgentTaskPacket): string`
- `claimPacket(packetId, agentRole): ExternalAgentTaskPacket | null`
- `deliverResult(result: ExternalAgentResultPacket): void`
- `archivePacket(packetId): void`
- `rejectPacket(packetId, reason): void`
- `getQueueSnapshot(): QueueSnapshot`

**Risk level:** HIGH — all packet routing flows through this.

---

### 4.3 — `@tripp-os/runtime-trace`

**Purpose:** Durable trace ledger writer, tail/search, causal chain, validation.

**Allowed dependencies:** `@tripp-os/agent-bus` (trace schemas/helpers), `@tripp-os/runtime-core` (types only).

**Forbidden dependencies:** Dashboard, agent adapters.

**Public surface:**
- `TraceWriter` class (append-only, durable)
- `TraceReader` class (tail/search/chain)
- `traceEvent(event: CreateTraceEventInput): void`
- `tailTrace(options): AgentBusTraceEvent[]`
- `searchTrace(criteria): AgentBusTraceEvent[]`
- `causalChain(eventId): AgentBusTraceEvent[]`
- `validateLedger(): TraceLedgerValidationResult`

**Risk level:** MEDIUM — evidence-only, no mutation authority.

---

### 4.4 — `@tripp-os/runtime-approval`

**Purpose:** Approval coordinator, operator approval queue, Echo/Warden review integration, block/escalate handling.

**Allowed dependencies:** `@tripp-os/contracts`, `@tripp-os/agent-bus`, `@tripp-os/runtime-core` (types only).

**Forbidden dependencies:** Direct agent communication, dashboard bypass.

**Public surface:**
- `ApprovalCoordinator` class
- `requestApproval(request: ApprovalRequest): Promise<ApprovalResult>`
- `attachReview(review: ExternalAgentReviewPacket): void`
- `getPendingApprovals(): ApprovalRequest[]`
- `resolveApproval(requestId, decision, reason): void`
- `blockAction(reason): void`
- `escalate(reason): void`

**Risk level:** CRITICAL — this enforces the ApprovalGate.

---

### 4.5 — `@tripp-os/runtime-adapters`

**Purpose:** Generic adapter boundary — adapter identity, capability declaration, tool policy enforcement, timeout management, health checks. Adapters themselves live elsewhere.

**Allowed dependencies:** `@tripp-os/contracts`, `@tripp-os/agent-bus`, `@tripp-os/runtime-core` (types only).

**Forbidden dependencies:** Hermes SDK, OpenClaw SDK, Codex SDK, any agent-specific code.

**Public surface:**
- `AgentAdapter` interface
- `AdapterConfig` schema
- `AdapterRegistry` class
- `registerAdapter(adapter: AgentAdapter): void`
- `dispatchToAdapter(packet, adapterId): Promise<DispatchResult>`
- `killAdapter(adapterId): void`
- `healthCheckAdapter(adapterId): HealthStatus`

**Risk level:** HIGH — adapter boundary is the execution gate.

---

### 4.6 — `@tripp-os/runtime-api`

**Purpose:** Control-facing API contract — HTTP/SSE endpoints for Tripp.Control dashboard.

**Allowed dependencies:** `@tripp-os/contracts`, `@tripp-os/agent-bus`, `@tripp-os/runtime-core` (types only), Fastify or similar.

**Forbidden dependencies:** Dashboard-specific rendering, Tripp.Reason internals, agent adapters.

**Public surface (proposed endpoints):**

| Endpoint | Method | Purpose | Priority |
|----------|--------|---------|----------|
| `/api/runtime/health` | GET | Runtime status, health snapshot | Required v0 |
| `/api/runtime/queue` | GET | Queue snapshot | Required v0 |
| `/api/runtime/queue/:id` | GET | Packet detail | Required v0 |
| `/api/runtime/approvals` | GET | Pending approvals | Required v0 |
| `/api/runtime/approvals/:id` | POST | Resolve approval | Required v0 |
| `/api/runtime/approvals/:id/review` | POST | Attach Echo review | Required v0 |
| `/api/runtime/trace` | GET | Trace tail | Required v0 |
| `/api/runtime/trace/search` | GET | Trace search | Optional v0 |
| `/api/runtime/trace/chain/:id` | GET | Causal chain | Required v0 |
| `/api/runtime/reports` | GET | Report registry | Required v0 |
| `/api/runtime/reports/:id` | GET | Report content | Required v0 |
| `/api/runtime/adapters` | GET | Adapter status | Required v0 |
| `/api/runtime/adapters/:id/kill` | POST | Kill adapter | Optional v0 |
| `/api/runtime/safe-mode` | GET | Safe mode status | Required v0 |
| `/api/runtime/safe-mode/clear` | POST | Operator clear safe mode | Required v0 |
| `/api/runtime/panic` | POST | Manual panic stop | Required v0 |
| `/api/runtime/alerts` | GET | Active alerts | Required v0 |
| `/api/runtime/workcells` | GET | Active workcells | Future |
| `/api/runtime/merge-candidates` | GET | Merge candidates | Future |
| `/api/runtime/budget` | GET | Resource budget snapshot | Future |
| `/api/runtime/events` | SSE | Live event stream | Optional v0 |

**Risk level:** HIGH — this is the operator's visibility surface.

---

### 4.7 — `@tripp-os/runtime-store`

**Purpose:** Durable state storage — queue backing, packet history, trace ledger, approval records.

**Allowed dependencies:** `@tripp-os/contracts`, `@tripp-os/agent-bus`, SQLite or file-based.

**Forbidden dependencies:** Agent SDKs, dashboard.

**Public surface:** (Internal-only to other runtime packages. Not a public API.)

**Risk level:** MEDIUM — durability requirement.

---

## 5. Dependency Direction

### Allowed

```
runtime-core        → @tripp-os/contracts
runtime-queue       → @tripp-os/contracts, @tripp-os/agent-bus, runtime-core (types)
runtime-trace       → @tripp-os/agent-bus, runtime-core (types)
runtime-approval    → @tripp-os/contracts, @tripp-os/agent-bus, runtime-core (types)
runtime-adapters    → @tripp-os/contracts, @tripp-os/agent-bus, runtime-core (types)
runtime-api         → @tripp-os/contracts, @tripp-os/agent-bus, runtime-core (types)
runtime-store       → @tripp-os/contracts
Tripp.Control       → runtime-api (HTTP/SSE only)
Tripp.Reason        → @tripp-os/contracts, @tripp-os/agent-bus
External agents     → Generic adapter interface only
```

### Forbidden

```
@tripp-os/contracts     → Runtime (any package)
@tripp-os/agent-bus     → Runtime (any package)
Runtime (any)           → Tripp.Control dashboard internals
Runtime (any)           → Tripp.Reason internals
Runtime (any)           → Hermes-specific code
Runtime (any)           → OpenClaw-specific code
Runtime (any)           → Codex-specific code
runtime-api             → runtime-adapters (API must not trigger execution directly)
Tripp.Control           → runtime-queue (dashboard reads through API, never mutates queue directly)
```

---

## 6. Runtime State Model

### 6.1 Runtime Status

```
initializing → running
running → safe_mode (on trigger)
running → panicked (on panic stop)
safe_mode → running (on operator clear)
safe_mode → panicked (on panic escalation)
panicked → (terminal, requires restart)
```

### 6.2 Safe Mode

**Triggers:**
- Packet lifecycle anomaly (missing result, stale claim)
- Malformed trace events exceeding threshold
- Path traversal attempt detected
- Adapter exceeds timeout budget
- Self-approval detected
- ApprovalGate bypass attempt
- Trace write failure (disk full, permission denied)
- Queue corruption detected

**What stops:** All adapter execution, new packet dispatch, approval flow. Existing claimed packets preserved.

**What stays readable:** Trace ledger, queue snapshot, health status, all reports, all archived packets. Everything is read-only evidence.

### 6.3 Packet Lifecycle

```
pending (inbox)
  → claimed (agent has packet)
    → completed (result in outbox)
      → archived (accepted by operator)
      → rejected (operator blocked)
    → rejected (agent rejected)
    → blocked (adapter blocked)
    → malformed (schema validation failed)
  → archived (direct from inbox by operator)
  → rejected (direct from inbox by operator)
```

### 6.4 Queue Lifecycle

```
empty → accepting
accepting → draining (shutdown in progress)
draining → empty
draining → accepting (cancel shutdown)
```

### 6.5 Approval Lifecycle

```
pending → approved (operator decision)
pending → denied (operator decision)
pending → timed_out (no response within window)
None → escalated (Echo review escalated automatically)
```

### 6.6 Workcell Lifecycle (future)

```
idle → assigned
assigned → executing
executing → completed
executing → failed
executing → killed
completed → idle
failed → idle
killed → idle
```

### 6.7 Merge Candidate Lifecycle (future)

```
proposed → review_pending
review_pending → approved (operator)
review_pending → rejected (operator)
approved → merging
merging → merged
merging → conflict (operator resolution needed)
```

### 6.8 Adapter Session Lifecycle

```
disconnected → connecting
connecting → connected
connected → executing
executing → idle
connected → disconnected
executing → timed_out
executing → killed
```

### 6.9 Alert Lifecycle

```
fired → acknowledged (operator)
fired → auto_resolved (condition cleared)
acknowledged → resolved (operator)
```

### 6.10 Trace Event Lifecycle

```
(created by event emitter)
→ append trace event (write JSONL)
  → validate (schema check)
    → valid (committed to ledger)
    → malformed → emergency fallback sink → safe mode check
```

---

## 7. Agent Bus Integration

Runtime is the primary consumer of `@tripp-os/agent-bus`.

### 7.1 Inbox/Outbox Flow

1. Operator (or Tripp.Reason via CLI) creates task packet → `writeTaskPacket()`
2. Packet appears in `.tripp/agents/inbox/`
3. Runtime `QueueManager` discovers new packet
4. Runtime routes to appropriate adapter (matching `agentRole`)
5. Adapter claims packet → status moves to `claimed`
6. Adapter produces result → `writeResultPacket()` to outbox
7. Runtime discovers result → routes to approval/review pipeline
8. Approved results → `movePacketToArchive()`
9. Rejected results → `movePacketToRejected(reason)`

### 7.2 Dead-Letter Behavior

- Packets unclaimed after TTL → moved to rejected with "stale_unclaimed" reason
- Results failing schema validation → moved to rejected with "malformed_result"
- Files outside agent bus root → `validateBusPath()` blocks, event traced
- Missing packetId references → rejection with explanatory trace event

### 7.3 Safe-Path Behavior

- All packet file operations go through `validateBusPath()`
- Default denied paths enforced from `DEFAULT_DENIED_PATHS`
- Additional runtime denied paths configurable in `RuntimeConfig`
- Path traversal attempts → safe mode trigger + trace event

### 7.4 Packet Claim

- Only one adapter claims a packet at a time
- Claim is durable (written to trace)
- Stale claims reaped after configurable timeout
- Claimed packets visible in queue snapshot as "claimed"

### 7.5 Trace Helper Usage

- Runtime calls `createTraceEvent()` + `appendTraceEvent()` for all lifecycle events
- Trace events never authorize mutation
- Causal chain reconstruction uses `findRootCauseChain()`
- Validation runs periodically via `validateTraceLedger()`

---

## 8. Trace / Ledger Design

### 8.1 Append-Only Model

All trace events are append-only JSONL. The ledger file is `.tripp/agents/trace/agent-bus-trace.jsonl`.

### 8.2 Write Boundary

- Only Runtime writes trace events
- Adapters never write directly to trace
- Dashboard never writes to trace
- Tripp.Reason writes trace via Runtime or directly using agent-bus helpers (read-only from Runtime perspective)

### 8.3 Validation

- Periodic validation (`validateTraceLedger()`) catches malformed lines
- Malformed lines are reported as alerts, not rewritten
- Validation threshold triggers safe mode

### 8.4 Tail / Search / Chain

- Tail: last N events, filterable by severity, actor, event type
- Search: by packetId, resultId, reviewId, runId, event type, date range
- Chain: causal chain from any eventId via `findRootCauseChain()`

### 8.5 Delayed-Failure Root-Cause Linking

- `root_cause_linked` event type links a late-discovered failure back to its source
- `validation_failed_later` event type captures post-hoc failures
- Both carry `parentEventId` or `rootCauseEventId`

### 8.6 Malformed Event Handling

- Individual malformed JSONL lines are skipped during reads (not the whole ledger)
- Validation reports malformed line numbers
- Malformed lines are never rewritten — the original bytes stay
- High malformation rate triggers safe mode

### 8.7 Emergency Fallback Sink

- If trace ledger write fails (disk full, permission), Runtime:
  1. Logs to stderr / system log
  2. Emits alert
  3. May trigger safe mode depending on severity
  4. Never halts — trace failure must not block safety decisions

### 8.8 No-Delete / No-Rewrite Policy

- Trace events are immutable
- Corrections are new events, not edits
- Original malformed lines preserved
- No API endpoint for deleting trace events

---

## 9. Approval Authority Model

### 9.1 Operator Approval

- The operator (Eddie) is the final approver
- All mutation-bearing results require explicit operator approval
- Operator approves/rejects through Control dashboard or CLI

### 9.2 ApprovalGate Authority

- ApprovalGate enforces that no mutation executes without approval
- ApprovalGate is fail-closed: if the gate is unreachable, all mutations are denied
- ApprovalGate validates: risk level, tool policy, adapter config, agent role

### 9.3 Warden (Echo) Advisory Review

- Echo reviews are advisory only
- Echo verdicts: pass, pass_with_notes, revise, block, escalate
- Block/escalate require at least one issue or safety finding
- Block: prevents auto-approval, operator must explicitly review
- Escalate: raises to operator immediately, may trigger safe mode
- Echo reviews never approve mutation

### 9.4 Blocked / Escalated State

- Blocked: packet moved to rejected, trace event recorded, operator notified
- Escalated: packet held, all adapters paused, safe mode triggered, operator must resolve

### 9.5 Explicit Non-Approval Paths

- ❌ No self-approval — `agentMayApprove: false` enforced at schema level
- ❌ No result-packet-as-approval — result packets are proposals, not authority
- ❌ No trace-event-as-approval — trace events are evidence only
- ❌ No dashboard-click-as-implicit-approval — every approval is an explicit operator action with audit trail

---

## 10. Generic Adapter Boundary

### 10.1 Adapter Interface

```typescript
interface AgentAdapter {
  readonly id: string;
  readonly agentRole: ExternalAgentRole;
  readonly capabilities: AdapterCapabilities;
  readonly config: ExternalAgentTransportConfig;

  // Lifecycle
  connect(): Promise<void>;
  disconnect(): Promise<void>;
  healthCheck(): Promise<HealthStatus>;

  // Execution
  executeTask(packet: ExternalAgentTaskPacket): Promise<DispatchResult>;
  kill(reason: string): Promise<void>;

  // Limits
  readonly maxConcurrentTasks: number;
  readonly timeoutMs: number;
}
```

### 10.2 Adapter Capabilities

```typescript
interface AdapterCapabilities {
  readonly role: ExternalAgentRole;
  readonly trustZone: ExternalAgentTrustZone;
  readonly allowedTools: string[];
  readonly deniedTools: string[];
  readonly maxContextTokens: number;
  readonly allowShell: boolean;
  readonly allowWrite: boolean;
  readonly allowNetwork: boolean;
  readonly allowSecrets: boolean;
  readonly allowRepoAccess: boolean;
  readonly allowDirectMutation: boolean;    // MUST be false
  readonly proposalOnly: boolean;            // Hermes: true
  readonly reviewOnly: boolean;              // Echo: true
  readonly builderMode: boolean;             // Tripp: true
}
```

### 10.3 Specific Agent Profiles

| Agent | Role | Trust Zone | Proposal Only | Builder | Review Only |
|-------|------|-----------|---------------|---------|-------------|
| Tripp | openclaw_tripp | cloud_controlled_reasoning | false | true | false |
| Cyony | hermes_cyony | cloud_sandbox_proposal | true | false | false |
| Echo | openclaw_echo | local_audit_warden | false | false | true |
| Codex | future | future | future | future | future |

### 10.4 Safety Rules Per Agent

**Tripp (Lead/Supervisor):**
- Allow: review, plan, audit tasks
- Deny: direct mutation, secrets, self-approval
- Must route all mutation proposals through ApprovalGate

**Cyony (Creative Builder):**
- Allow: proposal tasks only
- Deny: shell, write, network, secrets, direct mutation
- All output is proposal-only, requires Echo review + operator approval

**Echo (Warden):**
- Allow: review tasks only
- Deny: all mutation, all execution
- Verdicts are advisory; block/escalate require findings

### 10.5 Timeout and Resource Limits

- Default task timeout: 300s (configurable per adapter)
- Maximum concurrent tasks per adapter: 1 (staged; future: configurable)
- Context budget: configurable, default 8000 tokens
- Memory/CPU limits: OS-level enforcement (future)

---

## 11. Runtime API Surface for Tripp.Control

All endpoints served by `@tripp-os/runtime-api`. Tripp.Control consumes these via HTTP/SSE.

### Required for v0

| Endpoint | Purpose |
|----------|---------|
| `GET /health` | Runtime status, health snapshot |
| `GET /queue` | Queue snapshot |
| `GET /queue/:id` | Packet detail |
| `GET /approvals` | Pending approvals |
| `POST /approvals/:id` | Resolve approval |
| `GET /trace` | Trace tail |
| `GET /trace/chain/:id` | Causal chain |
| `GET /reports` | Report registry |
| `GET /reports/:id` | Report content |
| `GET /adapters` | Adapter status |
| `GET /safe-mode` | Safe mode status |
| `POST /safe-mode/clear` | Operator clear |
| `POST /panic` | Manual panic stop |
| `GET /alerts` | Active alerts |

### Optional for v0

| Endpoint | Purpose |
|----------|---------|
| `GET /trace/search` | Trace search |
| `POST /adapters/:id/kill` | Kill adapter |
| `GET /events` | SSE stream |

### Future

| Endpoint | Purpose |
|----------|---------|
| `GET /workcells` | Active workcells |
| `GET /merge-candidates` | Merge candidates |
| `GET /budget` | Resource budget |
| `GET /runs` | Run registry |
| `GET /runs/:id` | Run detail |

---

## 12. Operator Workflow

```
1. Operator (Eddie) creates mission/request
   → Tripp.Reason CLI or Control dashboard

2. Runtime creates packet
   → writeTaskPacket() to .tripp/agents/inbox/
   → trace: packet_created

3. QueueManager discovers packet
   → routes to matching adapter by agentRole

4. Adapter claims packet
   → trace: packet_claimed

5. Adapter executes (fake/manual/live)
   → fake: deterministic safe result
   → manual: packet waits in inbox for operator
   → live: future, requires full safety envelope

6. Result written to outbox
   → writeResultPacket()
   → trace: result_written

7. Echo reviews result (if configured)
   → writeReviewPacket()
   → trace: warden_verdict_recorded

8. Operator reviews result + Echo verdict
   → visible in Control dashboard

9. Decision:
   → approve → movePacketToArchive()
   → reject → movePacketToRejected(reason)
   → trace: packet_archived / packet_rejected

10. Causal chain preserved
    → trace searchable by packetId/runId
```

---

## 13. Failure Modes

| Failure | Detection | Response |
|---------|-----------|----------|
| Malformed packet | Schema validation on read | reject ← malformed, trace schema_validation_failed |
| Missing result | Stale claim timeout | reject ← missing, trace, alert |
| Stale claimed packet | Claim timeout | reclaim for adapter, trace |
| Adapter timeout | Adapter health check | kill adapter, safe mode check |
| Forbidden tool attempt | Tool policy enforcement | block, trace, alert |
| Path traversal attempt | validateBusPath() | reject, trace, safe mode trigger |
| Self-approval attempt | agentMayApprove = false schema | block, trace, alert |
| Trace write failure | Filesystem error | stderr, alert, safe mode if severe |
| Dashboard stale state | SSE reconnect | re-sync from API |
| Duplicate packet IDs | Schema uniqueness check | reject, trace |
| Conflicting merge candidates | Merge conflict detection | alert, operator resolution |
| Runtime shutdown mid-cycle | Graceful drain | queue draining state, trace shutdown event |

---

## 14. Safe Mode / Panic Design

### 14.1 Triggers

- Packet lifecycle anomaly
- Malformed trace events exceeding threshold
- Path traversal attempt
- Self-approval detected
- Adapter timeout budget exceeded
- Trace write failure (severe)
- Explicit operator panic command

### 14.2 Panic Stop

When triggered:

- All adapters killed immediately
- All pending claims released
- No new packets dispatched
- Queue state preserved
- Trace event: panic_stop logged (best-effort, to stderr if trace unavailable)
- API continues serving read-only endpoints

### 14.3 Safe Mode

Lighter than panic:

- No new task dispatch
- Running tasks complete (respect timeout)
- All read endpoints remain available
- Queue visible, trace searchable
- Operator notified via alert + dashboard
- Operator clears with explicit `POST /safe-mode/clear`

### 14.4 Recovery

- Operator reviews safe mode cause
- Resolves underlying issue
- Clears safe mode
- Queue resumes accepting new packets
- Trace records safe_mode_cleared

---

## 15. Test Strategy

### Unit Tests
- Each runtime package independently testable
- Mock adapters, mock store, mock API

### Contract Tests
- Runtime-core status transitions
- QueueManager packet lifecycle
- ApprovalCoordinator decision flow
- TraceWriter append/read/validate

### Packet Lifecycle Tests
- Full happy path: pending → claimed → completed → archived
- Rejection path
- Dead-letter path
- Timeout path
- Malformed path

### Trace Ledger Tests
- Append, read, validate, search, chain
- Malformed line handling
- Emergency fallback
- Immutability

### Approval Authority Tests
- Operator approve/reject
- Echo advisory (pass, pass_with_notes, revise, block, escalate)
- No self-approval
- Schema-level enforcement

### Adapter Boundary Tests
- Fake adapter dispatch
- Manual file dispatch
- Capability enforcement
- Timeout/kill

### Safe Mode / Panic Tests
- Trigger detection
- State transitions
- Recovery flow

### Control API Contract Tests
- All required v0 endpoints
- SSE stream behavior
- Read-only guarantees under panic

### End-to-End Tests
- Full fake/manual dry run
- Packet → claim → result → review → archive
- Trace chain integrity

---

## 16. Implementation Phasing Proposal

### Stage 6A — Runtime Skeleton (no side effects)
- `@tripp-os/runtime-core` package
- Runtime class with start/stop/status
- RuntimeConfig schema
- RuntimeStatus state machine
- No filesystem, no network, no adapters
- Tests: status transitions only

**Gate:** Runtime starts/stops without side effects. Status machine verified.

### Stage 6B — Read-Only Queue & Status
- `@tripp-os/runtime-queue` package
- QueueManager reads from Agent Bus inbox/outbox
- Read-only queue snapshot
- No dispatch, no mutation
- Tests: queue snapshot reflects file system

**Gate:** Queue reads accurately. No mutations.

### Stage 6C — Append-Only Trace Writer
- `@tripp-os/runtime-trace` package
- TraceWriter wraps agent-bus trace helpers
- TraceReader for tail/search/chain
- Malformed line detection
- Tests: append, read, validate, search, chain

**Gate:** Trace writes correct JSONL. Reads accurate. Validation works.

### Stage 6D — Packet Lifecycle Manager
- QueueManager gains write capability
- Packet lifecycle: pending → claimed → completed/rejected/blocked/malformed/archived
- Dead-letter handling
- Stale claim reaping
- Tests: full lifecycle, edge cases

**Gate:** Full packet lifecycle verified via fake packets.

### Stage 6E — Approval Coordinator
- `@tripp-os/runtime-approval` package
- Operator approval queue
- Echo review integration
- Block/escalate handling
- Tests: approval flows, Echo verdicts, safety rules

**Gate:** ApprovalGate enforced. No self-approval. Echo advisory verified.

### Stage 6F — Safe Mode / Panic
- Safe mode triggers
- Panic stop
- Recovery flow
- API read-only under panic
- Tests: trigger detection, state transitions, recovery

**Gate:** Safe mode tested with simulated failures.

### Stage 6G — Generic Fake/Manual Adapter Runner
- `@tripp-os/runtime-adapters` package
- AdapterRegistry
- Fake adapter dispatch
- Manual file dispatch
- No live adapters
- Tests: fake dispatch, manual dispatch, capability enforcement

**Gate:** Fake/manual dispatch works end-to-end with trace.

### Stage 6H — Control API Contract
- `@tripp-os/runtime-api` package
- Required v0 endpoints
- Read-only guarantees
- SSE event stream
- Tests: endpoint contracts, SSE behavior, panic mode read-only

**Gate:** All required v0 endpoints serve correct data. Read-only under panic.

### Stage 6I — Power Audit
- Full extraction boundary re-audit
- Dependency direction verification
- Adapter boundary safety
- Approval authority integrity
- No implementation creep

**Gate:** Clean audit. Ready for live adapter implementation (Stage 7+).

---

## 17. Open Questions / Required Operator Decisions

Eddie must decide before Runtime implementation begins:

1. **Local-only vs optional remote:** Is Runtime always local (on VPS), or should the API support remote Control dashboards?
2. **File-based only vs DB-backed ledger:** Keep `.tripp/agents/trace/agent-bus-trace.jsonl` as sole trace store, or add SQLite for query performance?
3. **API protocol preference:** REST + SSE, or WebSocket, or both? (Current proposal: REST + SSE)
4. **Dashboard integration sequence:** Should Tripp.Control consume Runtime API before or after Runtime stabilizes?
5. **Adapter order:** Which live adapter first — Tripp (lead), Echo (warden), or Cyony (builder)? Recommended: Tripp first (existing CLI integration).
6. **Tripp.Reason dry-run testbed:** Keep Tripp.Reason as the primary Runtime test harness during staged rollout?
7. **Codex Control API client:** Should Codex build a Control-facing agent after Runtime API stabilizes?
8. **Package naming:** `@tripp-os/runtime-*` or flatter structure?
9. **Trace storage durability:** Accept JSONL for v0, or require immediate WAL/journal guarantees?
10. **Operator auth model:** How does Runtime authenticate the operator (Eddie) for approval actions?

---

## StreamEvent Divergence — Design Resolution

### Recommended Approach

**Strategy 1: Runtime uses only generic Tripp.OS StreamEvents. Tripp.Reason maps its local events at the boundary.**

Rationale:
- `@tripp-os/contracts` defines the generic StreamEvent shapes (flexible roles, optional sessionId/runId)
- `@tripp-reason/shared` defines the ReasonLoop-shaped StreamEvents (hardcoded assistant role)
- Runtime should use only the generic contracts versions — it's an OS-level component, not a ReasonLoop consumer
- Tripp.Reason maps its local events to generic events when interacting with Runtime (if/when it sends events)
- Agents (Tripp, Cyony, Echo) receive events in the shape their adapters expect

This prevents accidental mixing because:
- Runtime's event types come from `@tripp-os/contracts`
- Tripp.Reason's event types come from `@tripp-reason/shared`
- They never flow through the same code path without an explicit adapter mapping
- The shared/index.ts barrel already separates them (status from contracts, StreamEvents from local events.ts)

**Implementation note (future):** If Tripp.Reason needs to emit events that Runtime should see, add a `toGenericevent()` mapper in shared that converts ReasonLoop-shaped events to generic contracts events. This mapper is Tripp.Reason's responsibility, not Runtime's.
