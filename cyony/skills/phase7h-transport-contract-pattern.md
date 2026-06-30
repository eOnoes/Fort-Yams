# Phase 7H Transport Contract + Fake Adapter Spike Pattern

## Build Order

```
Contract doc → transport schemas → transport helpers → CLI commands → export → tests → report
```

## Transport Schemas (`transportSchemas.ts`)

Define 6 Zod schemas with runtime safety validators:

### 1. TransportKind
`manual_file | fake_agent | local_process_experimental | cloud_http_experimental`

### 2. TransportMode
`disabled | dry_run | fake | manual | experimental_live`

Default: `fake` or `manual`. `experimental_live` is opt-in only.

### 3. TransportConfig
Standard config with safety rules enforced in `superRefine`:
- `allowDirectMutation` must always be false
- Cloud HTTP: `allowSecrets: false`, `allowRepoAccess: false`
- Hermes: must require ApprovalGate
- `experimental_live`: requires `enabled: true`, `requireEchoReview: true`, `requireApprovalGate: true`
- Bounded timeout (1–3600s) and context tokens (1000–256000)

### 4. DispatchRequest
Refinement: `agentRole` must match `taskPacket.agentRole`.

### 5. DispatchStatus
`skipped | dry_run | fake_completed | manual_required | completed | failed | blocked | unsafe`

### 6. DispatchResult
Runtime validator: completed/fake_completed with `resultPacket` must pass result packet schema validation. Failed/blocked/unsafe must include errors.

## Transport Helpers (`transport.ts`)

### createDefaultTransportConfig(role, kind?, mode?)
Returns a `ValidatedTransportConfigSchema`-parsed config. Hermes gets `fake_agent/fake`, Echo gets `manual_file/manual`. All get `allowSecrets: false`, `allowDirectMutation: false`, `requireEchoReview: true`, `requireApprovalGate: true`.

### createDispatchRequest(packet, config, options)
Creates a validated `ExternalAgentDispatchRequest`. Defaults: `dryRun: true`, `traceEnabled: true`.

### dispatchToFakeAgent(request, workdir?)
Deterministic fake dispatch:
1. Emit `packet_claimed` trace event (best-effort via try/catch)
2. Build fake `ExternalAgentResultPacket` with `[FAKE]` prefix, empty `proposedChanges`, fake metadata
3. Write to outbox via `writeResultPacket()`
4. Emit `result_written` trace event
5. Return `ExternalAgentDispatchResult` with appropriate status

Fake agent NEVER calls LLMs, network, or shell. Result is clearly marked as non-authoritative.

### dispatchToManualFileTransport(request, workdir?)
Manual transport — packet stays in inbox:
1. Emit `packet_claimed` trace event with "manual handling required" details
2. Return status `manual_required`
3. No file writes, no network calls

## CLI Commands

### tripp agents transport defaults
Shows safe default configs for all 3 agent roles. Prints: transportId, kind, mode, allowNetwork/Secrets/DirectMutation, requireEchoReview, requireApprovalGate. Warns: "Live/cloud DISABLED by default."

### tripp agents transport dispatch <task-file>
Options: `--transport`, `--mode`, `--dry-run`, `--trace`, `--workdir`
Flow: `safeResolve(file) → readTaskPacket → createDefaultTransportConfig → createDispatchRequest → dispatchToFakeAgent|dispatchToManualFileTransport → print result`
Warns: "result is EVIDENCE — NOT approval."

### tripp agents transport status
Reports: live/cloud DISABLED, fake AVAILABLE, manual AVAILABLE, Agent Bus AVAILABLE, trace ledger AVAILABLE. No live adapters active.

## Pitfalls

### No live/cloud transport implementation
Phase 7H is contract + fake only. Do NOT implement `cloud_http_experimental` or `local_process_experimental`. Those are future work.

### Fake agent must be deterministic
Do NOT use random data, LLM calls, or network in fake dispatch. The result must be identical for the same input.

### dispatchToFakeAgent must validate result before writing
The built result packet goes through `ExternalAgentResultPacketSchema` implicitly via `writeResultPacket()`. Don't construct invalid result packets.

### transport.ts has internal cross-references
`transport.ts` imports from `fileBus.ts` (writeResultPacket), `traceLedger.ts` (createTraceEvent, appendTraceEvent), `transportSchemas.ts` (schemas), `schemas.ts` (types), and `constants.ts`. These are all internal to the agent-bus package — no cross-package dependency risk.

### CLI dispatch: import helpers directly, not via dynamic import
The dispatch function can import `dispatchToFakeAgent` and `dispatchToManualFileTransport` statically from `@tripp-reason/external-agents`. No need for dynamic imports.

## Test Coverage

### Schema tests (transportSchemas)
- Safe default config parses
- Cloud HTTP rejects allowSecrets
- allowDirectMutation rejected
- allowRepoAccess rejected for cloud HTTP
- Hermes requires ApprovalGate
- experimental_live requires enabled/EchoReview/ApprovalGate
- Timeout/context bounded
- Dispatch request agentRole matches task packet
- Dispatch result validates result packet
- Failed dispatch requires errors

### Helper tests (transport)
- Default config is safe
- Fake dispatch produces valid result
- Fake dispatch writes to outbox
- Fake dispatch emits trace events
- Manual dispatch does not call network
- Invalid packet fails closed
- Traversal path rejected

### CLI tests
- transport defaults prints safe configs
- transport status shows live disabled
- transport dispatch fake writes result
- Traversal/task rejection tests
- Trace events emitted
