# Phase 7D Agent Bus CLI Commands Report

## PHASE

Phase 7D — Agent Bus CLI Commands

## STATUS

**PASS**

## FILES CREATED

```
packages/cli/src/agentsCommand.ts                — 7 CLI commands, ~440 lines (16,119 bytes)
packages/cli/src/__tests__/agentsCommand.test.ts  — 14 smoke tests (8,277 bytes)
```

## FILES MODIFIED

```
packages/cli/package.json      — Added @tripp-reason/external-agents (workspace:*) and vitest (dev dep)
packages/cli/src/main.ts       — Registered registerAgentsCommands(program)
```

No server routes added. No dashboard panels added. No adapters. No watchers.

## COMMANDS ADDED

All commands under `tripp agents` namespace:

| # | Command | Purpose | Key Behavior |
|---|---------|---------|--------------|
| 1 | `tripp agents init` | Ensure Agent Bus folders exist | Uses `ensureAgentBus()`, prints paths, idempotent |
| 2 | `tripp agents inbox` | List inbox task packets | Validates each packet, marks malformed with ⚠️, never executes |
| 3 | `tripp agents outbox` | List outbox result packets | Validates each packet, marks malformed with ⚠️, never executes |
| 4 | `tripp agents read <file>` | Read and validate a packet | Detects task/result shape, pretty JSON output, path traversal rejected |
| 5 | `tripp agents create-task` | Create task packet in inbox | 5 required + 10 optional flags, agent-specific safe defaults, warns not approval |
| 6 | `tripp agents archive <file>` | Move packet to archive | Path boundary check, preserves filename |
| 7 | `tripp agents reject <file> --reason "<r>"` | Move packet to rejected | Requires reason, writes `.rejection.md`, preserves traceability |

### create-task defaults by agent role

| Agent | trustZone | Key Safeties |
|-------|-----------|-------------|
| OpenClaw Tripp | `cloud_controlled_reasoning` | No secrets, no shell, no write |
| Hermes Cyony | `cloud_sandbox_proposal` | Sandbox-only, no shell/write/secrets, redactSecrets=true |
| OpenClaw Echo | `local_audit_warden` | Warden advisory only, no mutation |

All create-task defaults:
- `allowShell: false`, `allowWrite: false`, `allowNetwork: false`, `allowSecrets: false`
- `agentMayApprove: false` (enforced)
- `requiresHumanApproval: true`, `requiresApprovalGate: true`
- `redactSecrets: true`
- `reportRequired: true`
- Standard 12 denied paths from `DEFAULT_DENIED_PATHS`
- Every created packet prints explicit warning: "NOT approval" and "NOT mutation authority"

## VALIDATION

| Check | Result |
|-------|--------|
| CLI package build | ✅ PASS |
| CLI typecheck | ✅ PASS |
| Full workspace typecheck (11/12) | ✅ PASS |
| Full workspace build | ✅ PASS |
| CLI agent tests (14 tests) | ✅ 14/14 PASS |
| External-agents tests (41 tests) | ✅ 41/41 PASS |
| CLI → forbidden imports (core, server, etc.) | ✅ 0 found |
| External-agents → forbidden imports | ✅ 0 found |
| No server routes added | ✅ |
| No dashboard panels added | ✅ |
| No live adapters added | ✅ |
| No watchers/background workers | ✅ |
| No ApprovalGate bypass | ✅ |
| Legacy untouched | ✅ |

### CLI Test Coverage

| Test | Assertions |
|------|-----------|
| agents init creates folders | 6 folder existence checks |
| agents init is idempotent | Second call succeeds |
| create-task for OpenClaw Tripp | Role, trustZone, toolPolicy, approvalPolicy |
| create-task for Hermes | Sandbox, no secrets, redactSecrets |
| create-task for Echo | Local audit warden zone |
| create-task rejects invalid agent role | Rejects with message |
| create-task rejects invalid task type | Rejects with message |
| inbox lists valid packets | 2 packets listed without errors |
| outbox handles empty | No outbox packets, no crash |
| read valid task packet | JSON output, schema PASS message |
| read rejects path traversal | `/etc/passwd` → throws |
| read rejects outside paths | `/tmp/outside.json` → throws |
| archive moves to archive | File removed from inbox, appears in archive |
| reject moves to rejected + trace | 2 files (json + rejection.md), reason preserved |

## BOUNDARY CHECK

| Check | Status |
|-------|--------|
| No live agent connection | ✅ |
| No OpenClaw adapter | ✅ |
| No Hermes adapter | ✅ |
| No Echo adapter | ✅ |
| No cloud transport | ✅ |
| No mutation authority added | ✅ Create-task warns "NOT mutation authority" |
| No direct repo write authority for external agents | ✅ Bus writes to `.tripp/agents/`, not repo |
| No secrets handling beyond rejection/default-deny | ✅ toolPolicy.allSecrets always false |
| No dependency graph violations | ✅ CLI → external-agents (allowed assembly layer import) |
| No trace ledger implementation yet | ✅ Deferred to Phase 7F |
| External-agents does NOT import CLI | ✅ |

## DEPENDENCY CHANGES

| Package | Change |
|---------|--------|
| `@tripp-reason/cli` | Added `@tripp-reason/external-agents: workspace:*` (runtime dependency) |
| `@tripp-reason/cli` | Added `vitest: ^2.1.0` (dev dependency for tests) |

No other packages were modified.

## RISKS / OPEN QUESTIONS

| Risk | Mitigation |
|------|-----------|
| CLI outputs go to stdout/stderr (not captured cleanly in tests) | All tests use `expect().resolves/rejects` — functional correctness verified |
| No `tripp agents doctor` command | Optional per spec; deferred. Init + inbox/outbox already provide health visibility. Add in Phase 7E if needed. |
| create-task generates runId automatically | Good for now; future integration with swarm runs may want swarm-provided runId |

## FORWARD COMPATIBILITY

All CLI commands are compatible with future trace ledger (Phase 7F):
- Every packet has `packetId`, `runId`, `createdAt`, `createdBy`
- `reject` command already writes `.rejection.md` companion files (trace-ready)
- `archive` command preserves original filenames (deterministic audit trail)
- Commands do not emit trace events yet — trace insertion points are clear and will be added in Phase 7F

## NEXT RECOMMENDED STEP

**Phase 7E** — Echo Review Workflow.

Recommended scope:
- CLI command: `tripp agents review <file>` — invoke Echo review on a result packet
- Echo review uses `ExternalAgentReviewPacket` schema
- Echo runs through Tripp.Reason (not standalone)
- Review result written to `reports/` folder
- Warden verdict (pass/pass_with_notes/revise/block/escalate) with findings
- No live Echo connection — fake/default Echo first
- Preserve trace ledger compatibility for future `warden_stop_issued/warden_stop_resolved` events
