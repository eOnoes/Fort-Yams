# Tripp.Reason Phase 8D Real Hermes/Echo Transport Planning Gate Report

## PHASE
Phase 8D — Real Hermes/Echo Transport Planning Gate

## STATUS
**Phase 8D PASS — Real transport blocked until Echo endpoint confirmed. Phase 8E disabled skeleton ready when endpoint is known.**

## FILES REVIEWED
- `packages/@tripp-os/agent-bus/src/transportSchemas.ts` — transport kinds, modes, config, dispatch, safety rules
- `packages/@tripp-os/agent-bus/src/transport.ts` — fake/manual dispatch implementations + dispatch request
- `packages/@tripp-os/agent-bus/src/traceSchemas.ts` — 24 event types, 7 families
- `packages/@tripp-os/agent-bus/src/traceLedger.ts` — findRootCauseChain, appendTraceEvent
- `packages/@tripp-os/agent-bus/src/schemas.ts` — ExternalAgentRole (openclaw_echo still defined)
- `packages/cli/src/agentsCommand.ts` — dry-run harness, transport status
- `reports/tripp-reason-phase-8b-*.md` — Phase 8B dry run
- `reports/tripp-reason-phase-8c-*.md` — Phase 8C gap closure

## FILES CHANGED
Only this report was created:
- `reports/tripp-reason-phase-8d-real-hermes-echo-transport-planning-gate-report.md` — created

No source, config, or package changes.

## SOURCE-OF-TRUTH CONFIRMED
- Working tree: clean (report untracked)
- Last commit: `6048dd3` (Phase 8C)
- Validation: 185/185 tests PASS
- Phase 8B/8C: fake E2E pipeline proven

## CURRENT SYSTEM STATE

### Existing Transport Landscape
| Component | State |
|-----------|-------|
| Transport kinds | manual_file ✅, fake_agent ✅, local_process_experimental (schema only), cloud_http_experimental (schema only) |
| Transport modes | disabled, dry_run, fake ✅, manual ✅, experimental_live (schema only) |
| Transport safety rules | allowDirectMutation forbidden, cloud_http blocks secrets/repo access, experimental_live requires enabled+EchoReview+ApprovalGate |
| Dispatch pipeline | createDispatchRequest → dispatchToFakeAgent/dispatchToManualFileTransport |
| Config fields | transportId, name, kind, mode, agentRole, enabled, allowNetwork, allowSecrets, allowRepoAccess, allowDirectMutation, requireEchoReview, requireApprovalGate, timeoutSeconds, maxContextTokens, endpoint (optional), command (optional) |
| Dispatch statuses | skipped, dry_run, fake_completed ✅, manual_required ✅, completed, failed, blocked, unsafe |

### Agent Role State
- `openclaw_tripp` — in schema, Tripp.Control crashed, transport blocked
- `hermes_cyony` — in schema, Cyony on VPS, transport blocked
- `openclaw_echo` — **in schema but Echo migrated to Hermes 2026-06-04**

### Gaps
1. No real transport adapter implementation exists
2. Echo endpoint is **unknown** (migrated from OpenClaw to Hermes, endpoint unconfirmed)
3. `openclaw_echo` role still in schema — needs `hermes_echo` addition
4. No config/secrets model for real transport enablement
5. No transport_selected / transport_request_recorded / transport_result_recorded trace events defined
6. Home PC down — even if adapter existed, Echo is unreachable

## ECHO / HERMES ENDPOINT REQUIREMENTS

### Unknown (must be confirmed before implementation)
| Field | Status |
|-------|--------|
| Echo Hermes endpoint URL | **UNKNOWN** |
| Echo auth model (API key? session token? Hermes agent auth?) | **UNKNOWN** |
| Echo request schema (what does Hermes Echo accept?) | **UNKNOWN** |
| Echo response schema (streaming? single? packet format?) | **UNKNOWN** |
| Echo timeout/retry behavior | **UNKNOWN** |
| Echo streaming vs single response | **UNKNOWN** |
| Echo error format | **UNKNOWN** |
| Echo rate limits/concurrency | **UNKNOWN** |
| Echo is Hermes-only or has OpenClaw fallback | **UNKNOWN** (migrated, likely Hermes-only) |
| Home PC power state | **OFFLINE** (sleep/crash) |

### Known (from crew context)
- Echo runs on home Win PC (needs WoL setup, C:→D: relocation)
- Migrated from OpenClaw to Hermes 2026-06-04
- Previous endpoint was `host.docker.internal:18790` (Docker tunnel)
- Echo/Warden is currently advisory-only (this must remain true for real transport too)

### Schema Gap: openclaw_echo → hermes_echo
`ExternalAgentRoleSchema` currently has `"openclaw_echo"` but Echo migrated to Hermes. A `"hermes_echo"` role should be added alongside (not replacing) `"openclaw_echo"` for backward compatibility.

## REAL TRANSPORT BOUNDARY PLAN

### Where a future real adapter would sit

```
Phase 8E (disabled skeleton):
  transport.ts
    dispatchToFakeAgent()        ← unchanged
    dispatchToManualFileTransport() ← unchanged
    dispatchToRealAgent()        ← NEW, disabled-by-default, returns "blocked"

Phase 8F (enabled behind gate):
    dispatchToRealAgent()        ← reads config, checks ApprovalGate,
                                   calls Hermes/OpenClaw adapter,
                                   writes result to outbox,
                                   emits trace events
```

### Safety requirements (must gate implementation)
| Requirement | Current | Real transport must |
|------------|---------|-------------------|
| Disabled by default | ✅ (fake/manual only) | ✅ mode="disabled" default |
| Explicit enable flag | N/A | ✅ config.enabled + mode="experimental_live" |
| Behind ApprovalGate | ✅ (traced, not enforced by dispatch) | ✅ dispatch rejects if ApprovalGate not checked |
| Trace events preserved | ✅ (6 event types) | ✅ all 6 + new transport-specific events |
| No secrets in trace | ✅ | ✅ redacted before trace |
| No raw prompt leakage | ✅ (fake doesn't have prompts) | ✅ context redaction before transport |
| Warden remains advisory | ✅ | ✅ verdict does not authorize execution |
| No ApprovalGate bypass | ✅ | ✅ dispatch checks gate before calling adapter |
| Fail-closed on error | ✅ (fake is deterministic) | ✅ unknown endpoint → "blocked" |
| No direct mutation | ✅ (policy + schema) | ✅ schema enforces allowDirectMutation=false |

### Dispatch routing logic (future)
```typescript
function dispatch(request, config):
  if config.mode === "disabled" → return { status: "blocked", error: "Transport disabled" }
  if config.mode === "fake" → dispatchToFakeAgent(request)
  if config.mode === "manual" → dispatchToManualFileTransport(request)
  if config.mode === "experimental_live":
    if !config.enabled → return { status: "blocked" }
    if !approvalGateChecked → return { status: "blocked" }
    → dispatchToRealAgent(request, config)  // Phase 8E: stub only
```

## APPROVALGATE SAFETY PLAN

### Tests required before enabling real transport
1. Unapproved dispatch with experimental_live → status: "blocked"
2. Disabled transport config → status: "blocked"
3. Approved path records approvalgate_required trace event
4. No default approve — requireApprovalGate=true must gate
5. Warden block/escalate verdict does NOT authorize dispatch
6. Echo advisory review does NOT bypass ApprovalGate
7. Real transport config cannot set allowDirectMutation=true (schema enforced)

### ApprovalGate hook location
The `dispatchToRealAgent()` function must check `config.requireApprovalGate` **before** calling any external adapter. In fake mode, ApprovalGate is traced but not enforced by the dispatch function (it's enforced by ReasonLoop). In real mode, the dispatch function itself must enforce it.

## TRACE / ROOT CAUSE SAFETY PLAN

### New trace events needed for real transport
| Event | Purpose |
|-------|---------|
| `transport_selected` | Record which transport kind/mode was selected |
| `transport_request_sent` | Record request dispatched to external agent |
| `transport_response_received` | Record response from external agent |
| `transport_blocked` | Record when transport was blocked (disabled/unapproved) |

### Existing events preserved
All 6 dry-run event types remain: packet_created, approvalgate_required, packet_claimed, result_written, warden_review_started, warden_verdict_recorded.

### Chain linking
Real transport trace events must include:
- `parentEventId` linking back to the dispatch request or ApprovalGate check
- `packetId` for correlation
- `dispatchId` in `details` for transport-specific lookup
- `dry_run: false` in `details` to distinguish from fake pipeline

### Secrets safety
- Transport request/response must NOT be stored in trace (only metadata, not payload)
- `details` field may contain transportId, dispatchId, status — never auth tokens, API keys, or full request/response bodies

## CONFIG / SECRETS SAFETY PLAN

### Config requirements (future)
| Field | Default | Constraint |
|-------|---------|------------|
| `enabled` | `false` | Must be explicitly set to `true` for real transport |
| `mode` | `"fake"` | `"experimental_live"` requires explicit opt-in |
| `allowNetwork` | `false` | Must be `true` for cloud_http_experimental |
| `allowSecrets` | `false` | **Must stay false** (schema enforces for cloud) |
| `requireApprovalGate` | `true` | **Must stay true** |
| `requireEchoReview` | `true` | **Must stay true** for experimental_live |
| `endpoint` | `undefined` | Required for cloud_http_experimental |
| `timeoutSeconds` | `300` | Configurable, max 3600 |

### Secrets model
- No secrets in committed config files
- Secrets loaded from environment variables (never committed)
- No secrets in trace events
- No secrets in reports
- `allowSecrets: false` enforced by schema for cloud transports
- Missing config → "blocked" status (fail-closed)

### Config file location (future)
`/opt/data/shared/Tripp.Reason/.tripp/transport.config.json` (gitignored)

## TEST PLAN FOR REAL TRANSPORT SKELETON

### Phase 8E (disabled skeleton) — 15 tests estimated
| # | Test | Category |
|---|------|----------|
| 1 | createDefaultTransportConfig defaults to mode=fake | Config |
| 2 | experimental_live config requires enabled=true | Config |
| 3 | experimental_live config requires requireEchoReview=true | Config |
| 4 | experimental_live config requires requireApprovalGate=true | Config |
| 5 | cloud_http blocks allowSecrets=true | Config |
| 6 | cloud_http blocks allowRepoAccess=true | Config |
| 7 | dispatchToRealAgent returns "blocked" when disabled | Dispatch |
| 8 | dispatchToRealAgent returns "blocked" when unapproved | Dispatch |
| 9 | dispatchToRealAgent does NOT call external adapter | Dispatch |
| 10 | dispatchToRealAgent emits trace event on block | Trace |
| 11 | dispatchToRealAgent preserves existing fake test coverage | Regression |
| 12 | dispatchToRealAgent with unknown endpoint returns "blocked" | Edge case |
| 13 | hermes_echo role accepted in ExternalAgentRoleSchema | Schema |
| 14 | hermes_echo defaults to local_audit_warden trust zone | Schema |
| 15 | openclaw_echo still accepted for backward compatibility | Schema |

### Phase 8F (enabled behind gate) — deferred
Full tests for actual Hermes/OpenClaw calls are deferred until:
- Echo endpoint confirmed
- Home PC back online
- Operator explicitly green-lights real transport

## PHASE 8E RECOMMENDATION

### Recommended scope: Disabled Hermes/Echo Transport Contract Stub

Phase 8E should implement only:
1. Add `hermes_echo` to `ExternalAgentRoleSchema` (alongside `openclaw_echo`)
2. Add AGENT_DEFAULTS for `hermes_echo` (local_audit_warden trust zone)
3. Implement `dispatchToRealAgent()` stub — always returns `{ status: "blocked" }`
4. Dispatch router checks mode and routes to fake/manual/real
5. 15 safety tests proving disabled adapter cannot dispatch
6. No network calls, no secrets, no external process spawning

### What Phase 8E must NOT do
- No real Hermes calls
- No real Echo calls
- No network transport
- No secret loading
- No .env changes
- No new packages
- No config file creation (plan only)

### Blockers for Phase 8F (real transport enablement)
- Echo Hermes endpoint must be confirmed
- Home PC must be online (WoL setup complete)
- Echo C:→D: relocation must be complete
- Operator must explicitly approve real transport enablement
- Phase 8E tests must all pass
- `hermes_echo` role must be in schema

## VALIDATION RESULT
| Check | Result |
|-------|--------|
| pnpm test | 185/185 PASS ✅ |
| Working tree | Clean (report untracked) ✅ |

## BLOCKERS

| Blocker | Detail |
|---------|--------|
| Echo endpoint unknown | Cannot implement real transport — URL, auth, schema all unknown |
| Home PC offline | Echo unreachable even if adapter existed |
| Echo C:→D: pending | Echo needs relocation before production use |
| WoL not set up | Cannot wake PC remotely |
| openclaw_echo in schema | Need hermes_echo role added (Phase 8E task) |

## RISKS / DRIFT

| Risk | Severity | Detail |
|------|----------|--------|
| Echo endpoint remains unknown | MEDIUM | Blocks all real transport work |
| Tripp.Control crashed | LOW for 8D | Only blocks OpenClaw transport (Phase 8G) |
| Schema has openclaw_echo not hermes_echo | LOW | Phase 8E adds hermes_echo |

## NEXT RECOMMENDED STAGE

**Phase 8E — Disabled Hermes/Echo Transport Contract Stub**

Scope: add `hermes_echo` role, implement disabled-by-default `dispatchToRealAgent()` stub, 15 safety tests. No network calls.

Then: operator must confirm Echo endpoint + bring PC online before Phase 8F (real transport enablement).

---
Tripp.Reason Phase 8D PASS — Ready for Phase 8E disabled Hermes/Echo transport contract skeleton.
