# Phase 7A Agent Integration Contract Report

## PHASE

Phase 7A — OpenClaw + Hermes Integration Contract Lock

## STATUS

**PASS**

## MODEL TIERS USED

- **Heavy Technical Thinking** — External agent boundary design, trust zone modeling, packet contract design, transport option analysis, approval/sandbox/warden safety model, security requirements enumeration
- **Code Review / Warden Pass** — Doctrine compliance verification, scope control, dependency direction audit

## FILES CREATED

```
docs/PHASE_7_AGENT_INTEGRATION_CONTRACT.md    — Full integration contract (21,394 bytes)
reports/phase-7a-agent-integration-contract-report.md — This report
```

## FILES MODIFIED

```
docs/ROADMAP.md    — Expanded Phase 7 section with sub-phase breakdown (7A–7H), agent roles, trust model, transport decision, allowed/forbidden scope
```

No implementation code created. No dependencies added. Build and typecheck pass (10/10).

## AGENT INTEGRATION CONTRACT SUMMARY

The contract defines how Tripp.Reason coordinates with three external agents as bounded workers:

| Agent | Location | Role | Status |
|-------|----------|------|--------|
| OpenClaw Tripp | Cloud | Controller/Supervisor/Lead | Bounded worker |
| Hermes Cyony | Cloud | Creative/Builder/Swarmhandler | Sandbox-only |
| OpenClaw Echo | Local | Warden/Auditor/Trace | Audit trust |

**Core principle:** Tripp.Reason does not replace these agents. It coordinates, routes, records, gates, and audits their work. All mutations go through Tripp.Reason's ApprovalGate. All external output is reviewed by the Warden pipeline before operator approval.

## AGENT ROLE DECISION

### OpenClaw Tripp (Cloud Worker)
- Receives bounded task packets with redacted context
- Returns structured result packets with explicit proposed changes
- Allowed: planning, code review, bounded implementation if approved
- Forbidden: bypassing orchestration, direct mutation, spawning agents

### Hermes Cyony (Cloud Sandbox)
- Strictly sandboxed — no production writes
- Receives minimized, redacted context — never broad local access
- Allowed: exploration, prototyping, architecture proposals, creative output
- Forbidden: production writes, secret access, destructive ops, self-promotion to production

### OpenClaw Echo (Local Warden)
- Runs locally with audit trust (can read reports, logs, repo state)
- Reviews external agent output for scope drift, doctrine compliance, safety
- Recommends PASS/PARTIAL/FAIL — advisory only, cannot override operator
- Forbidden: mutation, overriding Eddie, bypassing Tripp.Reason logs

## TRUST ZONE DECISION

Six trust zones defined with explicit access rules:

| Zone | Trust Level | Key Rule |
|------|-------------|----------|
| Local Runtime | Full | Tripp.Reason core — tools, filesystem, DB |
| Cloud Sandbox (Hermes) | Minimal | Copied context only, no local access |
| Cloud Worker (Tripp) | Bounded | Task packets + context bundles only |
| Local Warden (Echo) | Audit | Read reports/logs/repo, cannot mutate |
| Production Repo | Operator-guarded | Mutations through ApprovalGate only |
| Report/Archive | Read-only for agents | Agents can read own reports |

Cloud agents never receive broad local access. Context is minimized and secrets redacted at Tripp.Reason boundary before transmission.

## PACKET CONTRACT DECISION

### Design Decision: Extend existing swarm packet types

Rather than create entirely new packet types, the contract extends the existing `TaskPacket` and `ResultPacket` from `@tripp-reason/swarm` with agent-specific fields.

**ExternalAgentTaskPacket** adds: `agentId`, `agentRole`, `agentProvider`, `contextBundle`, `outputFormat`, `reportRequired`, `returnChannel`

**ExternalAgentResultPacket** mirrors the existing `ResultPacket` structure (status, summary, findings, proposedChanges, filesTouched, risks, validation) with agent identification fields.

This design ensures:
- External agents can become swarm worker backends (Phase 7F) without changing packet contracts
- Existing fake/real workers and new external workers share the same interface
- Type compatibility allows `external-agents` package to import from `swarm` (type-only)

### Key Requirements
1. Structured output required — no vague prose
2. All proposed mutations must be explicit (file, diff, reason)
3. Uncertainty must be marked (`needsHumanReview: true`)
4. Timeout enforced — late responses discarded
5. Fail-closed — missing/malformed fields → treated as FAIL

## TRANSPORT DECISION

**Recommended: File/message packet exchange with inbox/outbox folders.**

Five options were compared:

| Transport | Verdict |
|-----------|---------|
| File dropbox / shared folders | ✅ **Selected for Phase 7B** |
| HTTP local endpoint | Deferred (adds server complexity) |
| MCP-style bridge | Deferred (over-engineered for 3 agents) |
| Shared agent bus | Rejected (too complex, pub/sub overkill) |
| Manual copy-paste | Fallback only |

**Rationale for file-based:**
- No always-on remote control — explicit inbox/outbox is auditable
- Works with any agent that can read/write files
- No network configuration needed for first integration
- Aligns with Tripp.Reason's file-system-native design
- HTTP/MCP can be added later without changing packet contract

**Proposed structure:** `.tripp/agents/{inbox,outbox,reports,archive}/{tripp,cyony,echo}/`

## APPROVAL / WARDEN DECISION

### Approval Flow
```
ExternalAgentResultPacket → Warden (Echo) review → Swarm merger → Swarm warden → Operator (Eddie) → ApprovalGate → Report
```

### Key Rules
- External agents cannot approve their own mutations
- Hermes cannot self-promote sandbox output to production
- Echo/Warden recommends but Eddie approves
- Tripp.Reason ApprovalGate remains authoritative for tool execution
- Fail closed if approval system unavailable
- Every decision logged and auditable

## SECURITY DECISIONS

| Rule | Implementation |
|------|---------------|
| No secrets in packets | Redaction before cloud transmission |
| Context minimization | Send only what task requires, not broad dumps |
| Redaction at boundary | Secrets stripped at Tripp.Reason, not at agent |
| Path boundaries | File paths within allowed scope; traversal blocked |
| Report retention | All external output archived for audit |
| Audit logs | Every packet logged with timestamps + content hashes |
| No unbounded attachments | File sizes capped |
| No arbitrary execution | Agents return proposals, not commands |
| Timeout required | Every task has hard timeout |
| Fail closed | Security check failure → operation blocked |
| Operator final | No automated approval chain overrides Eddie |
| External = untrusted | Even Tripp (cloud) treated as untrusted input |

## IMPLEMENTATION SEQUENCE

| Phase | Scope | Status |
|-------|-------|--------|
| **7A** | Contract Lock | ✅ |
| **7B** | Packet Types + Inbox/Outbox Protocol | Next |
| **7C** | Hermes Sandbox Adapter | Pending |
| **7D** | OpenClaw Tripp Adapter | Pending |
| **7E** | OpenClaw Echo Warden Adapter | Pending |
| **7F** | Swarm External Worker Backend | Pending |
| **7G** | Dashboard/Server Agent Status | Pending |
| **7H** | Final Audit | Pending |

## OPEN QUESTIONS

10 open questions documented in contract. Key unresolved items:

1. Exact transport available for Hermes cloud sandbox
2. Whether OpenClaw exposes API or file protocol
3. Echo execution mode (process vs CLI command)
4. JSON vs Markdown vs both for packets
5. Dashboard agent panel placement (7G vs Phase 8)

All open questions are flagged as requiring resolution before their respective implementation phases begin. None block Phase 7B (packet types + folder protocol).

## SCOPE COMPLIANCE

| Check | Status |
|-------|--------|
| No adapter implementation created | ✅ Docs only |
| No `packages/agents/` or `packages/external-agents/` | ✅ |
| No swarm runtime modifications | ✅ |
| No server/CLI/dashboard modifications | ✅ |
| No new dependencies | ✅ |
| No connection to real OpenClaw/Hermes | ✅ |
| Build/typecheck (10/10) | ✅ |
| ROADMAP updated | ✅ |

## NEXT STEP

**Phase 7B** — External Agent Packet Types + Inbox/Outbox Folder Protocol.

Recommended scope:
- Create `packages/external-agents/` with packet Zod schemas and TypeScript types (extending `@tripp-reason/swarm` types)
- Implement inbox/outbox folder protocol (`writeTaskPacket`, `readResultPacket`, `archivePacket` functions)
- Packet naming convention and format validation
- Smoke tests with fake packets (no live agents)
- Architecture: `external-agents ← shared, swarm (type-only); core/server/cli ↛ external-agents`
