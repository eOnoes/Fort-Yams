# Tripp.Reason Phase 8A Planning Gate / Integration Order Report

## PHASE
Phase 8A — Planning Gate / Integration Order Decision

## STATUS
**Phase 8A PASS — Ready for Phase 8B fake end-to-end dry run plan/harness.**

## FILES REVIEWED
- `docs/ROADMAP.md` — Phase 7 complete, Phase 8 stub
- `reports/phase-7i-final-agent-integration-audit-report.md` — Phase 7 PASS
- `packages/cli/src/agentsCommand.ts` — 27 CLI subcommands
- `packages/server/src/routes/` — 10 route files (agents, approvals, health, reply, reports, runs, sessions, status, swarms, tools)
- `apps/dashboard/src/panels/` — 8 panels (AgentBus, Approvals, LiveRun, Overview, Reports, Sessions, Swarms, Tools)
- `packages/external-agents/src/transport.ts` — fake + manual only (no live)
- `packages/external-agents/src/transportSchemas.ts` — "All transports fake/manual by default"
- `packages/core/src/approvalGate.ts` — ApprovalGate in core
- `packages/core/src/reasonLoop.ts` — ReasonLoop with approval integration
- `packages/swarm/src/` — 19 source files, fake/real workers

## FILES CHANGED
Only this report was created:
- `reports/tripp-reason-phase-8a-planning-gate-integration-order-report.md` — created

No source, config, or package changes.

## SOURCE-OF-TRUTH CONFIRMED
- Working tree: clean ✅
- Last commit: `9069747` (ROADMAP sync)
- Phase 7I audit: PASS ✅
- 125/125 tests: PASS ✅

## CURRENT SYSTEM STATE

```
┌─────────────┐    ┌──────────┐    ┌───────────┐    ┌──────────┐
│  CLI (27)   │───▶│ AgentBus │───▶│ Transport │───▶│ Trace    │
│  tripp agent│    │ Inbox/   │    │ FAKE only │    │ Ledger   │
│  *          │    │ Outbox   │    │ (no live) │    │ (7 event │
│             │    │          │    │           │    │ families)│
└─────────────┘    └──────────┘    └───────────┘    └──────────┘
                         │                               │
                         ▼                               ▼
                  ┌───────────┐                  ┌──────────────┐
                  │ Approval  │                  │ Dashboard    │
                  │ Gate      │                  │ (8 panels)   │
                  │ (core)    │                  │ HTTP/SSE     │
                  └───────────┘                  └──────────────┘
                         │                               │
                         ▼                               ▼
                  ┌───────────┐                  ┌──────────────┐
                  │ Server    │                  │ Echo/Warden  │
                  │ (10 APIs) │                  │ Advisory     │
                  │ Fastify   │                  │ Review       │
                  └───────────┘                  └──────────────┘
```

### What exists
| Component | State |
|-----------|-------|
| CLI | 27 agent bus commands (init, inbox, outbox, read, create-task, archive, reject, review, reviews, review-read, trace append/list/validate/chain/packet/result/review) |
| Server | 10 route files, Fastify HTTP |
| Dashboard | 8 panels, Vite+React, SSE streaming |
| Agent Bus | File-based inbox/outbox/reports/archive/rejected/trace |
| Transport | **Fake + manual only** — no live/real adapters |
| ApprovalGate | In core, gates write/edit/shell |
| Trace Ledger | Append-only JSONL, 7 event families, causal chain lookup |
| Echo/Warden | Advisory-only review (review, reviews, review-read CLI) |
| Swarm | 19 source files, fake/real workers, orchestrator pipeline |

### What's missing (relevant to Phase 8)
| Gap | Detail |
|-----|--------|
| Real transport | No live Hermes or OpenClaw adapter wired |
| End-to-end pipeline | No single path that exercises CLI→packet→transport→trace→dashboard→Warden end-to-end |
| Echo endpoint | Unknown after Hermes migration |
| Dashboard UX polish | 8 panels exist but are basic |
| Dry-run harness | No structured test that proves the full approval loop |

## PHASE 8 OPTION MATRIX

| # | Option | Risk | Safety Value | Prerequisites Met? | Recommendation |
|---|--------|------|-------------|-------------------|----------------|
| A | Fake E2E dry run | **LOW** | **HIGH** — proves full loop without real agents | ✅ All components exist | **DO FIRST** |
| B | Dashboard UX hardening | LOW | MEDIUM — UI polish before behavior is proven | ✅ Dashboard exists | WAIT for dry-run evidence |
| C | Real Hermes/Echo transport | **HIGH** | LOW — wiring real agent before pipeline proven | ❌ Echo endpoint unknown, no dry run | BLOCK until A complete |
| D | Real OpenClaw/Tripp transport | **HIGH** | LOW — Tripp.Control unstable | ❌ Tripp.Control crashed during Stage 9D | BLOCK until A+C complete |
| E | Trace/Warden hardening | LOW | MEDIUM — trace already functional | ✅ 7 event families exist | BUNDLE with A |

## FAKE END-TO-END DRY RUN ASSESSMENT (Option A)

**Verdict: DO FIRST. Highest safety value, lowest risk.**

### Scope
Wire the existing fake transport + manual transport into a single end-to-end path:
1. CLI creates task packet → inbox
2. Packet read + schema validated
3. Fake adapter claims packet → produces result
4. Result written to outbox
5. Trace ledger records every event (packet_created → packet_claimed → result_written)
6. Dashboard shows packet in AgentBus panel
7. Echo/Warden review invoked (advisory)
8. Full trace chain verifiable via `tripp agent trace chain`

### Files likely touched
- `packages/external-agents/src/transport.ts` — may need dry-run harness wrapper
- `packages/cli/src/agentsCommand.ts` — may add `tripp agent dry-run` command
- `packages/server/src/routes/agents.ts` — verify dashboard visibility
- New test file: `packages/external-agents/src/__tests__/dryRun.test.ts`

### Safety properties preserved
- No real agent execution
- No network calls (fake adapter is deterministic)
- ApprovalGate gate remains authoritative
- Eddie remains final approver
- Trace ledger records all evidence

### What it proves
- Full pipeline is coherent
- CLI→inbox→transport→outbox→trace→dashboard→Warden chain works
- No gaps between components
- ApprovalGate fires at correct points
- Trace events are causally linked
- Dashboard reads correct data from Agent Bus

## DASHBOARD UX HARDENING ASSESSMENT (Option B)

**Verdict: WAIT. Polish UI after behavior is proven.**

Current dashboard has 8 panels. Gaps that exist:
- AgentBus panel: basic tables, no inline action buttons
- Approvals panel: default-deny view only, no batch operations
- LiveRun panel: SSE streaming works, approval polling basic
- Swarms panel: fake-only mode, no real swarm status

These are real gaps but should be informed by dry-run evidence. Don't build UX for a pipeline that hasn't been exercised end-to-end.

## REAL HERMES / ECHO TRANSPORT ASSESSMENT (Option C)

**Verdict: BLOCKED. Must complete A first.**

Blockers:
1. **Echo endpoint unknown** — Echo migrated from OpenClaw to Hermes. Endpoint (was `host.docker.internal:18790`) unconfirmed.
2. **No dry-run proof** — Pipeline not exercised end-to-end even with fake adapters.
3. **ApprovalGate risk** — Real transport means real external process. Need to prove gate works before adding network surface.

Required before Option C:
- Phase 8B (fake dry run) complete
- Echo endpoint confirmed and reachable
- Transport contract extended for Hermes protocol (currently OpenClaw-shaped)

## REAL OPENCLAW / TRIPP TRANSPORT ASSESSMENT (Option D)

**Verdict: BLOCKED. Tripp.Control unstable.**

Blockers:
1. **Tripp.Control crashed during Stage 9D** — recovery pending when operator returns home
2. Same blockers as Option C (no dry run, ApprovalGate unproven for real transport)
3. Tripp remains on OpenClaw — adapter needs OpenClaw protocol, different from Hermes

Should only proceed after both Option A (dry run) AND Option C (Hermes transport) are complete.

## TRACE / WARDEN HARDENING ASSESSMENT (Option E)

**Verdict: BUNDLE with Option A. Low standalone value.**

Current trace ledger: 7 event families, causal chain lookup, validation. Sufficient for dry run.

Current Warden: advisory-only review workflow (tripp agent review/reviews/review-read). Sufficient for dry run.

Hardening recommendations should come from dry-run evidence (what trace events are missing? what review workflow gaps are exposed?).

## APPROVALGATE SAFETY REQUIREMENTS

These must hold for any Phase 8 work:

| Requirement | Current | Dry Run | Real Transport |
|-------------|---------|---------|---------------|
| ApprovalGate authoritative | ✅ | ✅ Must stay | ✅ Must stay |
| Eddie final approver | ✅ | ✅ | ✅ |
| No auto-approve destructive ops | ✅ | ✅ | ✅ |
| Trace records all approvals | ✅ | ✅ | ✅ |
| No bypass via transport | ✅ (fake only) | ✅ | ⚠️ Must gate |
| No secrets in packets | ✅ | ✅ | ✅ |
| Fail-closed on malformed input | ✅ | ✅ | ✅ |
| No external agent direct mutation | ✅ | ✅ | ✅ |

## RECOMMENDED PHASE 8 ORDER

```
Phase 8A (this report)        ← PLANNING GATE ✅ DONE
    │
Phase 8B                       ← Fake E2E dry run plan/harness
    │                             Prove CLI→packet→transport→trace→dashboard→Warden
    │                             No real agents. No network calls.
    │
Phase 8C                       ← Address gaps found in dry run (trace, Warden, dashboard)
    │                             Evidence-driven, not speculative.
    │
Phase 8D                       ← Real Hermes/Echo transport
    │                             Only after Echo endpoint confirmed + dry run passes
    │
Phase 8E                       ← Real OpenClaw/Tripp transport
    │                             Only after Tripp.Control stable + Hermes transport works
    │
Phase 8F                       ← Dashboard UX hardening
    │                             Polish informed by real behavior
    │
Phase 8G                       ← Final Phase 8 audit + roadmap rebaseline
```

## RECOMMENDED PHASE 8B SCOPE

**Phase 8B — Fake End-to-End Pipeline Dry Run**

Implement a dry-run harness that exercises:

1. **CLI → Inbox**: `tripp agent create-task` creates valid task packet
2. **Read + Validate**: packet passes schema validation
3. **Fake Transport**: fake adapter claims packet, produces deterministic result
4. **Outbox**: result written with correct packet correlation
5. **Trace Chain**: full event chain recorded (packet_created → packet_claimed → result_written → warden_verdict_recorded)
6. **Warden Review**: advisory Echo review invoked on result
7. **Dashboard Visibility**: AgentBus panel reflects packet lifecycle
8. **Causal Chain**: `tripp agent trace chain` shows complete causal path

### Must stay fake/manual
- Transport adapters (no live Hermes/OpenClaw calls)
- Agent execution (deterministic fake results only)

### Must stay advisory-only
- Echo/Warden review (verdict does not authorize execution)

### Must stay read-only
- Dashboard panels (no inline mutation from UI)
- Trace ledger (append-only, no rewriting)

### Validation gates before Phase 8C
- All existing 125 tests pass
- New dry-run test exercises full pipeline
- Trace chain verifiable via CLI
- Dashboard shows dry-run artifacts
- No ApprovalGate bypass detected
- No live transport introduced

## VALIDATION RESULT

| Check | Result |
|-------|--------|
| pnpm test | 125/125 PASS ✅ |
| Working tree | Clean ✅ |
| Phase 7I audit | PASS ✅ |

## BLOCKERS
None for Phase 8B.

## RISKS / DRIFT

| Risk | Severity | Detail |
|------|----------|--------|
| Echo endpoint unknown | LOW for 8B | Only blocks Phase 8D (real Hermes transport) |
| Tripp.Control unstable | LOW for 8B | Only blocks Phase 8E (real OpenClaw transport) |
| Dry run reveals gaps | EXPECTED | That's the point of doing it |

## NEXT RECOMMENDED STAGE
**Phase 8B — Fake End-to-End Pipeline Dry Run**

Do not wire real transport. Do not touch Tripp.Control. Prove the pipeline first.

---
Tripp.Reason Phase 8A PASS — Ready for Phase 8B fake end-to-end dry run plan/harness.
