# Phase 7C External Agent Packet Schemas Report

## PHASE

Phase 7C — Shared External Agent Packet Schemas

## STATUS

**PASS**

## FILES CREATED

```
packages/external-agents/package.json              — Package manifest (zod, vitest, @types/node)
packages/external-agents/tsconfig.json              — TypeScript config (excludes tests from build)
packages/external-agents/src/index.ts               — Barrel export
packages/external-agents/src/constants.ts           — Bus paths, default denied paths, schema version
packages/external-agents/src/schemas.ts             — 13 Zod schemas with runtime validators (12,297 bytes)
packages/external-agents/src/fileBus.ts             — Safe file-bus helpers (9,830 bytes)
packages/external-agents/src/__tests__/schemas.test.ts  — 27 schema validation tests
packages/external-agents/src/__tests__/fileBus.test.ts  — 14 file-bus operation tests
reports/phase-7c-external-agent-packet-schemas-report.md — This report
```

Total: **9 files** created (7 source + 2 test).

## FILES MODIFIED

None. No existing packages or configurations were modified.

## SCHEMAS ADDED

| # | Schema | Type | Validation |
|---|--------|------|------------|
| 1 | ExternalAgentRole | enum | openclaw_tripp, hermes_cyony, openclaw_echo |
| 2 | ExternalAgentTrustZone | enum | cloud_controlled_reasoning, cloud_sandbox_proposal, local_audit_warden, human_approval |
| 3 | ExternalAgentTaskType | enum | 10 task types (plan, review, audit, prototype, proposal, implementation_proposal, warden_review, swarm_decomposition, report_review, drift_check) |
| 4 | ExternalAgentPacketStatus | enum | pending, claimed, completed, rejected, blocked, malformed, archived |
| 5 | ExternalAgentToolPolicy | object | allowShell/Write/Network/Secrets (all default false), allowedTools, deniedTools |
| 6 | ExternalAgentApprovalPolicy | object | requiresHumanApproval (default true), agentMayApprove (MUST be false, enforced by refine), requiresApprovalGate, echoReviewRequired |
| 7 | ExternalAgentContextPolicy | object | contextBudgetTokens, redactSecrets (default true), includeRepoSummary, includeFileContents, path arrays |
| 8 | ExternalAgentTaskPacket | object | Full task packet with 20 fields. Runtime validators: Hermes must use sandbox zone, Hermes no shell/write/secrets, cloud agents no secrets |
| 9 | ExternalAgentResultStatus | enum | success, partial, failed, blocked, rejected, unsafe, malformed |
| 10 | ExternalAgentProposedChange | object | path, changeType (create/modify/delete/rename/review_only), summary, patch, risk, requiresApproval |
| 11 | ExternalAgentResultPacket | object | Full result packet with 18 fields. Structured output required. |
| 12 | ExternalAgentReviewVerdict | enum | pass, pass_with_notes, revise, block, escalate |
| 13 | ExternalAgentReviewPacket | object | Full review packet with 14 fields. Runtime validator: block/escalate requires findings. |

**Runtime safeties enforced:**
- `agentMayApprove` refine: rejects `true` with clear message
- Hermes sandbox: `trustZone` must be `cloud_sandbox_proposal`
- Hermes tool policy: no shell, write, or secrets
- Cloud agents: `allowSecrets` must be false, `redactSecrets` must be true
- Block/escalate verdicts: must include at least one issue or safety finding
- All defaults are safe: no shell, no write, no secrets, human approval required

## FILE BUS HELPERS ADDED

| Function | Purpose | Safety |
|----------|---------|--------|
| `getAgentBusPaths(root?)` | Resolve Agent Bus folder paths | Path resolution only |
| `ensureAgentBus(root?)` | Create all folders, idempotent | `mkdir -p`, creates 6 dirs |
| `createTaskPacketFilename(packet)` | Deterministic filename | Sanitized slug + timestamp + random hex suffix |
| `createResultPacketFilename(packet)` | Deterministic filename | Same pattern |
| `createReviewPacketFilename(packet)` | Deterministic filename | Same pattern |
| `writeTaskPacket(packet, opts)` | Validate + write to inbox | Zod validation, path boundary check, pretty JSON |
| `writeResultPacket(packet, opts)` | Validate + write to outbox | Same safety |
| `readTaskPacket(filePath)` | Read + validate from file | Fails closed on malformed JSON, schema errors |
| `readResultPacket(filePath)` | Read + validate from file | Same safety |
| `listInboxPackets(opts)` | List task files | Filter to `.json`, sorted |
| `listOutboxPackets(opts)` | List result files | Same |
| `movePacketToArchive(filePath, opts)` | Move to archive | Path boundary check |
| `movePacketToRejected(filePath, reason, opts)` | Move to rejected + reason file | Path boundary check, writes `.rejection.md` |

**Safety guarantees:**
- All writes validate with Zod before touching disk
- Path traversal attacks rejected (`validateBusPath`)
- Malformed JSON fails closed (throws `Error`)
- Schema validation errors fail closed (throws `ZodError`)
- Filenames sanitized (lowercase, no unsafe chars, 60-char limit)
- No watchers, no background processes, no network

## VALIDATION

| Check | Result |
|-------|--------|
| Package build (`tsc --build`) | ✅ PASS |
| Full workspace typecheck (11/12 projects) | ✅ PASS |
| Schema tests (27 tests) | ✅ 27/27 PASS |
| File bus tests (14 tests) | ✅ 14/14 PASS (after filename collision fix) |
| Forbidden imports (`@tripp-reason/core`, server, tools, etc.) | ✅ 0 found |
| Dependencies (zod, vitest, @types/node) | ✅ Only allowed deps |
| No server routes added | ✅ |
| No dashboard panels added | ✅ |
| No CLI commands added | ✅ |
| No live adapters added | ✅ |
| No watchers/background workers | ✅ |
| No ApprovalGate bypass | ✅ |
| Legacy untouched | ✅ |

## BOUNDARY CHECK

| Check | Status |
|-------|--------|
| No live agent connection | ✅ |
| No OpenClaw adapter | ✅ |
| No Hermes adapter | ✅ |
| No Echo adapter | ✅ |
| No cloud transport | ✅ |
| No mutation authority added | ✅ File bus is read/write to files, not repo mutation |
| No direct repo write authority for external agents | ✅ Bus writes to `.tripp/agents/`, not repo |
| No secrets handling | ✅ Constants deny secrets paths; schemas enforce no-secrets rules |
| No dependency graph violations | ✅ external-agents ← zod + node built-ins only |

## DEPENDENCY SUMMARY

| Package | Version | Type | Purpose |
|---------|---------|------|---------|
| zod | ^3.24.0 | dependency | Schema validation |
| vitest | ^2.1.0 | devDependency | Test runner |
| @types/node | ^20.0.0 | devDependency | Node.js type definitions |

Total: 3 dependencies (1 runtime, 2 dev). No heavy frameworks. No existing package was modified to add these — they are scoped to `packages/external-agents/`.

## RISKS / OPEN QUESTIONS

| Risk | Mitigation |
|------|-----------|
| Vitest type errors in lint tool | Lint tool uses different tsconfig than build; actual `tsc --build` and `vitest run` both pass. Low risk — cosmetic only. |
| Filename collisions | Random 8-char hex suffix prevents collisions with identical titles. Acceptable for Phase 7C. |
| No integration with existing swarm types yet | Phase 7F will handle swarm integration. Schema is designed to be compatible — uses same `runId`/`status`/`findings`/`risks` patterns. |
| `@tripp-reason/shared` not imported | Contract says "may import shared if useful." Not needed for Phase 7C; can add later if shared provides useful primitives. |

## FORWARD COMPATIBILITY — TRACE LEDGER (Phase 7F)

Phase 7C schemas and file-bus helpers are designed to be forward-compatible with a future append-only Agent Bus event log / trace ledger (Phase 7F). The trace ledger will support causal debugging, delayed-failure review, Warden intervention tracking, subagent lifecycle tracking, and JIT tool lifecycle tracking.

### Required Phase 7F Trace Event Families

**1. Packet lifecycle events:** `packet_created`, `packet_read`, `packet_claimed`, `result_written`, `result_read`, `schema_validation_failed`, `packet_rejected`, `packet_archived`

**2. Echo / Warden review events:** `warden_review_started`, `warden_verdict_recorded`, `warden_stop_issued`, `warden_stop_resolved`
- `warden_stop_issued` captures: trigger, target agent, target packet/result/review, scope, severity, reason
- `warden_stop_resolved` captures: resolution type, patch applied / escalated / rejected / overridden-by-Tripp / overridden-by-Operator, final decision owner, linked follow-up packet/report

**3. Subagent lifecycle events:** `subagent_spawned`, `subagent_completed`, `subagent_killed`, `subagent_audited`
- `subagent_spawned` captures: parent agent, parent packet/result, task, timeout, allowed tools, scope
- `subagent_completed` captures: output summary, status, exit code, files referenced, result packet
- `subagent_killed` captures: timeout/kill reason, partial output path, retry decision
- `subagent_audited` captures: audit agent, verdict, findings, linked review packet/report

**4. JIT tool lifecycle events:** `tools_loaded`, `tools_unloaded`
- `tools_loaded` captures: tool names, task packet, requesting agent, allowed duration/scope, reason
- `tools_unloaded` captures: tool names, cleanup status, leaks/retained state if detected

**5. Human / approval events:** `human_decision_recorded`, `mutation_requested`, `approvalgate_required`, `mutation_applied`, `validation_failed_later`, `root_cause_linked`

### Trace Ledger Back-Linking

Every trace record must be able to link back to: `packetId`, `resultId`, `reviewId`, `runId`, `parentRunId`, `agentRole`, `parentAgentRole`, `subagentId`, `subagentRole`, `toolName`, file path, event timestamp, validation status, failure reason, Warden verdict, later-discovered issue, root-cause link.

### Trace Ledger Design Rules

- Append-only — no deleting, no rewriting past entries
- Corrections become new entries
- Every event timestamped
- Every event carries stable IDs
- Malformed events fail closed
- Trace records are evidence, not approval
- No trace event can authorize mutation
- ApprovalGate remains authoritative
- Eddie remains final approver

### Compatibility Preserved in Phase 7C

The following Phase 7C structures are forward-compatible with trace ledger requirements:
- All packet schemas carry stable IDs (`packetId`, `runId`, `resultId`, `reviewId`)
- File-bus operations (`writeTaskPacket`, `readResultPacket`, `movePacketToArchive`, `movePacketToRejected`) are natural trace points
- `movePacketToRejected` already preserves traceability via `.rejection.md` companion files
- Schema validation failures (`schema_validation_failed`) are already detectable via Zod error handling

**Do NOT build the trace ledger in Phase 7C.** This section documents forward requirements only. Implementation belongs in Phase 7F.

## REVISED PHASE ORDERING

| Phase | Scope | Status |
|-------|-------|--------|
| **7C** | Packet schemas + safe file helpers | ✅ DONE |
| **7D** | Agent Bus CLI commands (`tripp agent inbox/outbox/task/archive/reject`) | Next |
| **7E** | Echo review workflow (automated Echo invocation for result packet validation) | Pending |
| **7F** | Append-only Agent Bus event log / trace ledger | Pending |
| **7G** | Dashboard Agent Bus panel + trace view | Pending |
| **7H** | Optional live/cloud transport after safety review | Pending |
| **7I** | Final Agent Integration Audit | Pending |

## NEXT RECOMMENDED STEP

**Phase 7D** — Agent Bus CLI Commands.

Recommended scope:
- Add CLI commands under `tripp agent` namespace
- `tripp agent inbox` — list pending tasks
- `tripp agent outbox` — list returned results
- `tripp agent task create` — create and write a task packet to inbox
- `tripp agent task read` — read and display a task or result packet
- `tripp agent archive` — move completed packets to archive
- `tripp agent reject` — move failed/unsafe packets to rejected
- CLI imports `@tripp-reason/external-agents` for schemas and file bus helpers
