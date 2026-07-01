# Tripp.Reason Phase 8F Transport Readiness + Named-Agent/Adapter Separation Audit Report

## PHASE
Phase 8F — Transport Readiness Audit + Named-Agent/Adapter Separation Gate

## STATUS
**Phase 8F PASS — Phase 8 safe to pause until Echo endpoint and Control recovery. Named-agent/adapter separation correction recommended but not blocking.**

## FILES REVIEWED
- `packages/@tripp-os/agent-bus/src/schemas.ts` — ExternalAgentRole (provider-specific enum), trust zones, task schemas, hermesTrustZoneCheck
- `packages/@tripp-os/agent-bus/src/traceSchemas.ts` — ActorType enum (also provider-specific)
- `packages/@tripp-os/agent-bus/src/transportSchemas.ts` — transport config, safety rules check agentRole directly
- `packages/@tripp-os/agent-bus/src/transport.ts` — dispatchToRealAgent stub, dispatchRoute
- `packages/cli/src/agentsCommand.ts` — AGENT_DEFAULTS, VALID_ROLES, dry-run harness
- `packages/cli/src/__tests__/dryRun.test.ts` — Phase 8B tests (30)
- `packages/cli/src/__tests__/dryRunGapClosure.test.ts` — Phase 8C tests (30)
- `packages/cli/src/__tests__/hermesEchoTransportSkeleton.test.ts` — Phase 8E tests (31)
- `packages/cli/src/__tests__/agentsCommand.test.ts` — Phase 7D tests (40)
- `docs/ROADMAP.md` — outdated but not blocking

## FILES CHANGED
Only this report was created:
- `reports/tripp-reason-phase-8f-transport-readiness-named-agent-adapter-audit-report.md` — created

No source, config, or package changes.

## SOURCE-OF-TRUTH CONFIRMED
- Working tree: clean (report untracked)
- Last commit: `d3a0dd4` (Phase 8E)
- Validation: 216/216 tests PASS
- Phase 8B-8E: fake E2E + gap closure + disabled skeleton complete

## CURRENT SYSTEM STATE

### Test Coverage Summary
| Phase | File | Tests | What it covers |
|-------|------|-------|---------------|
| 7D | agentsCommand.test.ts | 40 | CLI commands, packet lifecycle, trace |
| 8B | dryRun.test.ts | 30 | Fake E2E pipeline, all 3 agent roles |
| 8C | dryRunGapClosure.test.ts | 30 | Server read-back, dashboard, block/escalate, chain |
| 8E | hermesEchoTransportSkeleton.test.ts | 31 | hermes_echo role, disabled stub, routing, boundaries |
| Core | contracts + agent-bus | 85 | Shared schemas, file bus, trace ledger |
| **Total** | | **216** | |

### Current Agent Role Landscape
| Role Key | Named Agent | Backing Runtime (in name) | Trust Zone | Status |
|----------|------------|--------------------------|------------|--------|
| `openclaw_tripp` | Tripp | OpenClaw | cloud_controlled_reasoning | Active (Control crashed) |
| `hermes_cyony` | Cyony | Hermes | cloud_sandbox_proposal | Active |
| `openclaw_echo` | Echo | OpenClaw (legacy) | local_audit_warden | Deprecated — Echo migrated to Hermes |
| `hermes_echo` | Echo | Hermes (current) | local_audit_warden | Added Phase 8E |

## NAMED AGENT / ROLE / BACKING ADAPTER SEPARATION AUDIT

### Finding: Provider-specific role names conflate identity with runtime

**Current pattern:** `{provider}_{agentname}` — e.g., `openclaw_tripp`, `hermes_echo`

**Problem:** The role enum hard-codes the backing runtime into the agent's identity key. When Echo migrated from OpenClaw to Hermes, a NEW role key (`hermes_echo`) had to be added. The old key (`openclaw_echo`) remains for backward compatibility.

This creates drift risk:
- If Cyony migrates to a new provider → need `newprovider_cyony` role key
- If Tripp migrates → need new role for Tripp
- Safety rules check role keys directly (`if agentRole === "hermes_cyony"`)
- Every migration requires schema + CLI + test changes

**What IS well-separated:**
- **Trust zones** (`cloud_controlled_reasoning`, `cloud_sandbox_proposal`, `local_audit_warden`) — concept-based, provider-agnostic
- **Task types** (`plan`, `review`, `audit`, `warden_review`) — responsibility-based
- **Transport config** (`kind`, `mode`, `enabled`, `allowNetwork`) — adapter-based, independent of role

**Severity: MEDIUM — migration-safe but architecturally fragile**

### Provider-Specific References in Source (10 total)
All 10 references are in schema/transport safety rules:
- `hermes_cyony` — trust zone check, requireApprovalGate check
- `openclaw_tripp`, `hermes_cyony`, `openclaw_echo`, `hermes_echo` — role enum
- ActorType enum also uses provider-specific keys

### what-is-hermes_echo
`hermes_echo` is currently a **migration alias** serving as an ExternalAgentRole enum value. It is NOT yet a clean "named agent + backing adapter" separation. It exists because the role enum forces provider into the name.

**Recommendation for future Phase 8G:**
1. Keep `hermes_echo` as a migration-compatible alias (do not remove)
2. Add a `namedAgent` field separate from `agentRole` or `backingAdapter`
3. Move provider checks from role keys to trust zones or transport mode
4. `Echo = { namedAgent: "echo", responsibility: "warden/auditor/trace", defaultAdapter: "hermes", trustZone: "local_audit_warden" }`

This is a Phase 8G task — not blocking 8F closure.

## FAKE / MANUAL E2E COVERAGE AUDIT

### ✅ Complete — 91 dedicated E2E tests

| Capability | Covered by | Tests |
|------------|-----------|-------|
| CLI dry-run (all 4 roles) | dryRun + hermesEcho | 4+ |
| Packet creation + inbox | dryRun + gapClosure | 4+ |
| ApprovalGate check traced | dryRun + gapClosure | 4+ |
| Fake dispatch → outbox | dryRun + gapClosure | 4+ |
| Manual dispatch path | agentsCommand | 1+ |
| Trace ledger causal chain | dryRun + gapClosure | 6+ |
| Server read-back (5 routes) | gapClosure | 6 |
| Dashboard read model | gapClosure | 4 |
| Warden advisory-only | dryRun + gapClosure | 5+ |
| Multi-run isolation | dryRun | 2 |
| Invalid role/verdict rejection | dryRun + gapClosure + hermesEcho | 5+ |
| Block/escalate findings requirement | gapClosure | 5 |
| Root-cause chain depth | gapClosure | 5 |
| **Total** | | **91+** |

### Gaps: None critical
- Dashboard is not exercised via live HTTP (only read model functions) — acceptable for fake E2E
- Server routes are not tested via running Fastify instance (only route handler functions) — acceptable
- No fake E2E for non-CLI entry points (programmatic API, scheduled task) — out of scope

**Verdict: Fake/manual coverage is complete enough to pause.**

## DISABLED REAL TRANSPORT AUDIT

### ✅ Safe — fail-closed by design

| Check | Status |
|-------|--------|
| dispatchToRealAgent always returns blocked | ✅ 4 tests |
| experimental_live cannot succeed | ✅ dispatchRoute + test |
| disabled mode cannot succeed | ✅ dispatchRoute + test |
| dry_run cannot hit live transport | ✅ dispatchRoute + test |
| No network tokens (fetch/XHR/WS/SSE) | ✅ 6 boundary tests |
| No process spawning (spawn/exec) | ✅ boundary tests |
| No secret references (.env, apiKey) | ✅ boundary tests |
| allowDirectMutation = false | ✅ schema enforced |
| hermes_echo defaults safe | ✅ local_audit_warden + fake |

**Verdict: Disabled skeleton is safe. No real transport can execute.**

## APPROVALGATE / WARDEN SAFETY AUDIT

### ✅ Protected

| Check | Status |
|-------|--------|
| ApprovalGate trace event present in dry run | ✅ approvalgate_required |
| No default approve | ✅ requiresApprovalGate enforced |
| Warden block doesn't authorize execution | ✅ blocked stub + tests |
| Warden escalate doesn't authorize execution | ✅ blocked stub + tests |
| Warden advisory-only | ✅ "does NOT approve mutation" warnings |
| Real stub not enabled by Warden pass verdict | ✅ always blocked regardless |
| Schema enforces allowDirectMutation=false | ✅ refinement rule |

**Verdict: ApprovalGate and Warden boundaries are intact.**

## TRACE / ROOT CAUSE AUDIT

### ✅ Coverage adequate

| Check | Status |
|-------|--------|
| Dry-run chain: 6 event types verified | ✅ dryRun + gapClosure |
| Linked events traversable | ✅ gapClosure S16 (5 tests) |
| Unlinked events return self-only | ✅ |
| Missing eventId returns empty chain | ✅ |
| rootCauseEventId priority over parentEventId | ✅ |
| Blocked transport trace events safe | ✅ packet_claimed + packet_rejected |
| Trace events are evidence-only | ✅ "evidence — NOT approval" |

### Minor note: transport_blocked event naming
Current blocked stub uses `packet_claimed` + `packet_rejected` for blocked transport. A future Phase 8F+ could add a dedicated `transport_blocked` event type for cleaner semantics. Not blocking.

## SERVER / DASHBOARD READINESS AUDIT

### ✅ Read-only paths verified

| Check | Status |
|-------|--------|
| Server /agents/status route | ✅ returns counts + trace stats |
| Server /agents/inbox route | ✅ list + task packet read |
| Server /agents/outbox route | ✅ list + result packet read |
| Server /agents/reviews route | ✅ list + review packet read |
| Server /agents/trace route | ✅ events + filters |
| Server /agents/trace/chain/:eventId | ✅ causal chain |
| Server /agents/read route | ✅ typed packet read |
| Server /agents/archive (POST) | ✅ safe write — approved pattern |
| Server /agents/reject (POST) | ✅ safe write — approved pattern |
| Dashboard read model functions | ✅ inbox/outbox/reviews/trace |
| Dashboard mutation blocked | ✅ no live mutation in Phase 8 |
| Read-only operations don't mutate | ✅ gapClosure S17 |

**Verdict: Server and dashboard are ready for dry-run visibility. No mutation paths.**

## REAL TRANSPORT ENABLEMENT CONDITIONS

### Hard prerequisites — NONE are met

| Prerequisite | Status |
|-------------|--------|
| Echo Hermes endpoint URL confirmed | ❌ UNKNOWN |
| Echo auth model confirmed | ❌ UNKNOWN |
| Echo request schema confirmed | ❌ UNKNOWN |
| Echo response schema confirmed | ❌ UNKNOWN |
| Home PC online / reachable | ❌ OFFLINE |
| Wake-on-LAN set up | ❌ NOT DONE |
| Echo C:→D: migration complete | ❌ NOT DONE |
| Tripp.Control/Codex stable | ❌ CRASHED (Stage 9D) |
| Named-agent/adapter separation clarified | ❌ NEEDS Phase 8G |
| ApprovalGate live-enable test plan written | ❌ NOT DONE |
| Trace redaction policy written | ❌ NOT DONE |
| Operator explicitly approves live transport | ❌ NOT REQUESTED |

### What CAN be done without these
- Tripp.OS extraction work (Kimi, Stage 7+)
- Tripp.Control recovery (Codex, when PC returns)
- Named-agent/adapter separation planning (Phase 8G)
- Existing fake/manual hardening if gaps found

## PAUSE / PROCEED DECISION

### Decision: A — Phase 8 can pause safely

**Rationale:**
1. Fake/manual E2E coverage is complete (91+ tests, 6-event pipeline)
2. Disabled real transport skeleton is fail-closed (always blocked)
3. ApprovalGate, Warden, trace, server, and dashboard are all protected
4. Zero real transport prerequisites are met
5. Named-agent/adapter separation is architecturally desirable but not blocking
6. No implementation can safely proceed without Echo endpoint + Control recovery

### What Phase 8G should address (after pause)
If Eddie chooses to resume Phase 8 before real transport:
- **Phase 8G-A**: Named-agent/adapter separation — add `namedAgent` field, decouple provider from role keys
- **Phase 8G-B**: Fake/manual hardening — if new gaps discovered
- **Phase 8G-C**: Hand off to Kimi for Tripp.OS extraction continuation

## VALIDATION RESULT

| Check | Result |
|-------|--------|
| pnpm test | 216/216 PASS ✅ |
| Working tree | Clean (report untracked) ✅ |
| Phase 8B-8E all committed | ✅ |

## BLOCKERS

| Blocker | Detail |
|---------|--------|
| Echo endpoint unknown | Blocks all real Hermes/Echo transport |
| Home PC offline | Echo unreachable |
| Tripp.Control crashed | Blocks real OpenClaw/Tripp transport |
| Named-agent/adapter conflation | Architectural fragility — not blocking pause |

## RISKS / DRIFT

| Risk | Severity | Detail |
|------|----------|--------|
| Provider-specific role keys | MEDIUM | Every agent migration requires schema changes |
| Safety rules check agentRole directly | MEDIUM | Rules need updating when provider changes |
| openclaw_echo still in schema | LOW | Kept for backward compat — remove in cleanup pass |
| ROADMAP.md stale | LOW | Phase 7 shows COMPLETE, Phase 8 needs update |

## NEXT RECOMMENDED STAGE

**Phase 8 PAUSE — Safe to suspend until:**

1. Echo endpoint confirmed + home PC online
2. Tripp.Control/Codex recovered
3. Operator green-lights real transport planning

**Alternative: Phase 8G — Named-Agent/Adapter Separation Correction**
If work continues before endpoint confirmation, Phase 8G should:
- Add `namedAgent` field separate from backing adapter
- Decouple provider-specific checks from role keys
- Keep `hermes_echo` as migration-compatible alias

---
Tripp.Reason Phase 8F PASS — Phase 8 safe to pause until Echo endpoint and Control recovery.
