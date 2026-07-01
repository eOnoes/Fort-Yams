# Phase 7H Agent Transport Contract

> Defines the bounded transport abstraction layer for future external-agent communication. All transports are disabled/fake by default. Live/cloud transport is opt-in, experimental, and must never bypass Agent Bus, Echo review, or ApprovalGate.

## 1. Purpose

Phase 7H establishes a **transport abstraction** — a controlled boundary through which validated Agent Bus task packets can be routed to external workers and result packets received back. The transport layer is a **thin pipe**, not a bypass. Every dispatch flows through:

1. Packet validation (external-agents schemas)
2. Transport config validation (safety rules)
3. Trace event emission (append-only ledger)
4. Result packet validation (schema checks)
5. Echo review boundary (advisory only)
6. ApprovalGate (all mutations)

## 2. Scope

- Define transport schemas and TypeScript types
- Implement **fake** transport (deterministic, no LLM, no network)
- Implement **manual file** transport (packet stays in inbox for manual handling)
- Add safe CLI commands for dispatch
- Add trace events for transport actions
- Document experimental live transport requirements (not implemented)

## 3. Non-Goals

- ❌ No production live agent adapters
- ❌ No cloud HTTP transport implementation
- ❌ No network calls
- ❌ No LLM invocation
- ❌ No shell execution
- ❌ No mutation authority
- ❌ No ApprovalGate bypass
- ❌ No Echo review bypass
- ❌ No secrets to any transport

## 4. Transport Kinds

| Kind | Description | Implemented |
|------|-------------|-------------|
| `manual_file` | Packet stays in inbox; operator handles externally | ✅ Phase 7H |
| `fake_agent` | Deterministic fake worker; no LLM/network/shell | ✅ Phase 7H |
| `local_process_experimental` | Local process worker (future) | ❌ Future |
| `cloud_http_experimental` | Cloud HTTP worker (future, opt-in only) | ❌ Future |

## 5. Transport Modes

| Mode | Description |
|------|-------------|
| `disabled` | Transport is inactive |
| `dry_run` | Validate dispatch without executing |
| `fake` | Execute via fake transport only |
| `manual` | Packet remains in inbox for manual handling |
| `experimental_live` | Real transport (opt-in, requires Echo review + ApprovalGate) |

Default for all agents: `fake` or `manual`.

## 6. Default Agent Transport Policies

### OpenClaw Tripp
- Kind: `fake_agent`
- Mode: `fake`
- Allows: reasoning, review, decomposition
- Denies: shell, secrets, direct mutation, repo access

### Hermes Cyony
- Kind: `fake_agent`
- Mode: `fake`
- Allows: proposal/prototype in sandbox
- Denies: shell, write, secrets, network, direct mutation

### OpenClaw Echo
- Kind: `manual_file`
- Mode: `manual`
- Allows: warden review, audit, drift check
- Denies: direct mutation

## 7. Safety Rules

- `allowSecrets` must be `false` for cloud HTTP
- `allowDirectMutation` must always be `false`
- `allowRepoAccess` must be `false` for cloud HTTP
- Hermes transport must remain proposal-only (no shell/write/secrets)
- `experimental_live` requires: `enabled: true`, `requireEchoReview: true`, `requireApprovalGate: true`
- `timeoutSeconds` bounded (1–3600)
- `maxContextTokens` bounded (1000–256000)
- Unknown transport kind fails closed
- Dispatch result does NOT authorize mutation

## 8. Fake Transport Behavior

Fake transport is deterministic and safe:

1. Receives validated `ExternalAgentTaskPacket`
2. Creates a valid `ExternalAgentResultPacket` with:
   - `status: "fake_completed"` equivalent (mapped to `success`)
   - `summary` prefixed with `[FAKE]`
   - Empty `proposedChanges`
   - Clear notation that this is a fake/dry-run result
3. Writes result to `.tripp/agents/outbox/` via `writeResultPacket`
4. Emits trace events: `packet_claimed`, `result_written`
5. Never calls LLMs, network, or shell
6. Never produces mutation authority

## 9. Manual File Transport Behavior

Manual transport keeps the packet in the inbox for external handling:

1. Validates the task packet exists and is valid
2. Emits trace event: `packet_claimed` (with details noting manual handling required)
3. Returns dispatch result with status `manual_required`
4. Operator (Eddie/Tripp/Echo) manually handles the packet via CLI or dashboard
5. Never calls external process or network

## 10. Experimental Live Transport Requirements

For future `cloud_http_experimental` or `local_process_experimental`:

- Must be explicitly enabled (`enabled: true` in config)
- Must require Echo review (`requireEchoReview: true`)
- Must require ApprovalGate (`requireApprovalGate: true`)
- Must never receive secrets (`allowSecrets: false`)
- Must never access repo directly (`allowRepoAccess: false`)
- Must never mutate directly (`allowDirectMutation: false`)
- Must fail closed on any error
- Must emit full trace events
- Must have bounded timeout
- Must redact secrets from context
- Must not bypass file-based Agent Bus

## 11. Trace Events

| Dispatch Action | Trace Event(s) |
|----------------|----------------|
| Fake dispatch starts | `packet_claimed` |
| Fake dispatch completes | `result_written` |
| Manual dispatch registered | `packet_claimed` (details: "manual handling required") |
| Dispatch validation fails | `schema_validation_failed` |
| Transport blocked | `packet_rejected` |

## 12. Approval Boundary

- Dispatch results are **evidence**, not approval
- `ExternalAgentResultPacket` does not grant mutation authority
- All proposed changes must flow through `ApprovalGate`
- Echo review remains advisory
- Eddie remains final approver

## 13. Failure Handling

- Invalid config → fail closed, no dispatch
- Invalid task packet → fail closed, trace `schema_validation_failed`
- Path traversal → fail closed, no read
- Fake transport error → trace error, return status `failed`
- Transport timeout → trace warning, return status `failed`
- Cloud transport unreachable → fail closed (future)

## 14. Future Work

- `local_process_experimental` transport
- `cloud_http_experimental` transport (with full safety review)
- WebSocket-based live dispatch
- Dashboard-initiated dispatch
- Subagent pool management via transport layer
- JIT tool loading/unloading via transport events

## 15. Open Questions

- Should dispatch results be persisted as separate files in `.tripp/agents/dispatch/`? Currently results are in outbox only.
- Should the transport layer support batched dispatch (multiple packets to same agent)?
- Should Echo/Warden be able to pre-approve a transport config for a specific packet?
