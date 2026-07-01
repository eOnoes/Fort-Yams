# Phase 7H Report — Live/Cloud Agent Transport Contract + Adapter Spike

**PHASE:** Phase 7H — Live/Cloud Agent Transport Contract + Adapter Spike  
**STATUS:** PASS ✅  
**DATE:** 2026-06-03  

---

## Summary

Defined the bounded transport abstraction layer for future external-agent communication. Implemented safe fake and manual-file transports alongside the contract. All live/cloud transport is disabled by default. Every dispatch flows through packet validation, config safety rules, trace event emission, and result validation. No production adapters were created.

## FILES CHANGED

| File | Action |
|------|--------|
| `docs/PHASE_7H_AGENT_TRANSPORT_CONTRACT.md` | **Created** — full transport contract (15 sections) |
| `packages/external-agents/src/transportSchemas.ts` | **Created** — 6 Zod schemas + validators |
| `packages/external-agents/src/transport.ts` | **Created** — 6 helper functions |
| `packages/external-agents/src/index.ts` | Modified — added transport exports |
| `packages/cli/src/agentsCommand.ts` | Modified — 3 transport command functions + 3 registrations + imports |

## TRANSPORT CONTRACTS ADDED

### Schemas

| Schema | Description |
|--------|-------------|
| `ExternalAgentTransportKind` | `manual_file`, `fake_agent`, `local_process_experimental`, `cloud_http_experimental` |
| `ExternalAgentTransportMode` | `disabled`, `dry_run`, `fake`, `manual`, `experimental_live` |
| `ExternalAgentTransportConfig` | Full config with safety rules (secrets/mutation/repo denied) |
| `ExternalAgentDispatchRequest` | Dispatch request with agent role matching |
| `ExternalAgentDispatchStatus` | 8 status values (skipped through unsafe) |
| `ExternalAgentDispatchResult` | Result with validated result packet |

### Runtime validators

- `allowDirectMutation` must always be false
- Cloud HTTP: `allowSecrets` false, `allowRepoAccess` false
- Hermes: must require ApprovalGate
- `experimental_live`: requires `enabled: true`, `requireEchoReview: true`, `requireApprovalGate: true`
- Dispatch result with completed status validates result packet
- Failed/blocked/unsafe status requires errors

## TRANSPORT HELPERS ADDED

| Helper | Description |
|--------|-------------|
| `createDefaultTransportConfig(role, kind?, mode?)` | Safe default config per agent |
| `validateTransportConfig(config)` | Validate against safety rules |
| `createDispatchRequest(packet, config, options)` | Create validated dispatch request |
| `dispatchToFakeAgent(request, workdir?)` | Fake deterministic dispatch → outbox + trace |
| `dispatchToManualFileTransport(request, workdir?)` | Manual dispatch → packet stays in inbox |
| *No live/cloud transport implemented* | |

## CLI COMMANDS ADDED (3)

| Command | Description |
|---------|-------------|
| `tripp agents transport defaults` | Show safe default transport configs for each agent |
| `tripp agents transport dispatch <task-file>` | Dispatch through fake/manual transport |
| `tripp agents transport status` | Show transport readiness (all live disabled) |

## SERVER ROUTES ADDED

None. Transport dispatch is CLI-only in Phase 7H.

## DASHBOARD CHANGES

None. Dashboard was not touched.

## AUTOMATIC TRACE EVENTS

| Transport Action | Trace Event(s) |
|----------------|----------------|
| Fake dispatch starts | `packet_claimed` |
| Fake dispatch completes | `result_written` |
| Manual dispatch registered | `packet_claimed` (details: manual handling required) |
| Dispatch validation fails | `schema_validation_failed` (via existing helpers) |

## VALIDATION

### Tests

| Suite | Result |
|-------|--------|
| external-agents | **68/68 PASS** |
| CLI | **40/40 PASS** |
| **TOTAL** | **108/108 PASS** |

### Build / Typecheck

| Check | Result |
|-------|--------|
| CLI build (`tsc`) | ✅ |
| external-agents build (`tsc --build`) | ✅ |
| No forbidden imports | ✅ |
| No new npm dependencies | ✅ |

### Safety Checks

| Check | Result |
|-------|--------|
| No live adapters active | ✅ |
| No cloud transport enabled | ✅ |
| No production OpenClaw adapter | ✅ |
| No production Hermes adapter | ✅ |
| No production Echo adapter | ✅ |
| No direct repo write authority for external agents | ✅ |
| No mutation authority added | ✅ |
| No secrets to cloud agents | ✅ |
| No dependency graph violations | ✅ |
| No watchers/background workers | ✅ |
| No ApprovalGate bypass | ✅ |
| Legacy untouched | ✅ |
| Server routes unchanged | ✅ |
| Dashboard unchanged | ✅ |

## BOUNDARY CHECK

| Boundary | Status |
|----------|--------|
| Live/cloud mode disabled by default | ✅ |
| No production OpenClaw adapter | ✅ |
| No production Hermes adapter | ✅ |
| No production Echo adapter | ✅ |
| No direct repo write authority for external agents | ✅ |
| No mutation authority added | ✅ |
| No secrets to cloud agents | ✅ |
| No dependency graph violations | ✅ |
| Trace events are evidence only | ✅ |
| Dispatch results do not authorize mutation | ✅ |
| ApprovalGate remains authoritative | ✅ |
| Eddie remains final approver | ✅ |

## RISKS / OPEN QUESTIONS

- When real cloud HTTP is implemented, full safety review required
- Should dispatch results be persisted as separate files?

## NEXT RECOMMENDED STEP

**Phase 7I** — Final Agent Integration Audit (verify full Phase 7 pipeline: inbox → dispatch → outbox → review → trace → dashboard view).
