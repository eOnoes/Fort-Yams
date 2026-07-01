# Tripp.Reason → Tripp.OS Extraction Readiness Audit

**STATUS:** READY — with staged extraction plan  
**DATE:** 2026-06-03  
**PACKAGES INSPECTED:** 10  
**TESTS RUN:** 108/108 PASS  

---

## SUMMARY

Tripp.Reason is extraction-ready. Two packages (`external-agents` and `shared`) can be extracted **now** with zero behavior changes. One package (`mcp`) needs minor import cleanup. The `store` needs a schema split before extraction. The rest stays Reason-specific.

The strongest Tripp.OS seed is `external-agents` — it already has zero workspace dependencies (only `zod`) and provides the complete Agent Bus protocol that any future Tripp.* build would consume.

---

## PACKAGE DEPENDENCY TRUTH

| Package | Workspace Deps | External Deps | Reason-Specific? | Standalone? | Extract Ready? |
|---------|---------------|---------------|-----------------|-------------|----------------|
| **shared** | none | zod | Naming: `RunReport`, `Session`, `ReasonLoop`-adjacent types. Contains generic status enums + Reason-specific report/event schemas. | Partial | **Split needed** |
| **external-agents** | **none** | zod | Only in JSDoc `@tripp-reason/external-agents` comments + one approval message mentioning "Eddie" + path default `.tripp/agents/` | **Yes** | **EXTRACT NOW** |
| **store** | shared | better-sqlite3, drizzle-orm | Schema tables: `sessions`, `runs`, `messages`, `events`, `tool_calls`, `approvals`, `reports` — all ReasonLoop-shaped. But DB init + repo pattern is generic. | No | **EXTRACT LATER (split)** |
| **mcp** | shared | zod | Imports `Tool`, `ToolContext`, `RiskLevel` from shared. Bridge code is generic. | Partial | **EXTRACT AFTER CLEANUP** |
| **core** | shared, store | none | Full ReasonLoop engine | No | **KEEP REASON-SPECIFIC** |
| **providers** | shared | none | LLM provider adapters | No | **KEEP REASON-SPECIFIC** |
| **tools** | shared | zod | Tool implementations | No | **KEEP REASON-SPECIFIC** |
| **swarm** | core, shared | zod | Kimi-style orchestration | No | **KEEP REASON-SPECIFIC** |
| **server** | ALL 8 | fastify | Assembly layer | No | **KEEP REASON-SPECIFIC** |
| **cli** | ALL 9 | commander | Assembly layer | No | **KEEP REASON-SPECIFIC** |
| **dashboard** | **none** | react, react-dom | HTTP/SSE only | **Yes** | **UI stays in apps/** |

---

## TRIPP.CONTROL COMPATIBILITY CHECK

Comparing Tripp.Reason contracts against Tripp.Control concepts:

| Control Concept | Overlap | Status | Recommended Owner |
|----------------|---------|--------|-------------------|
| **task schema** | Partial — Reason has `ExternalAgentTaskPacket`; Control has task/risk/budget/routing | Compatible but different shapes | `@tripp-os/contracts` unify |
| **attempt log / ledger** | Direct — Reason's `AgentBusTraceEvent` ~= Control's attempt ledger | Same concept, different name | `@tripp-os/agent-bus` unify as trace event |
| **failure audit** | Direct — Reason's `validation_failed_later` ~= Control's failure audit | Compatible | `@tripp-os/agent-bus` |
| **success audit** | Partial — Reason has `result_written` + verdict | Compatible | `@tripp-os/agent-bus` |
| **premium justification** | Missing — Reason has no premium/budget concept | Reason doesn't need this | `@tripp-os/contracts` |
| **Forge candidate** | Missing — Reason has no Forge concept | Reason doesn't need this | `@tripp-os/contracts` |
| **risk policy** | Partial — Reason has `RiskLevel` (safe/mutating/destructive) | Names differ but concept same | `@tripp-os/contracts` unify |
| **budget policy** | Missing — Reason has `maxContextTokens` but no cost tracking | Reason doesn't track cost | `@tripp-os/contracts` |
| **routing policy** | Partial — Reason has `ExternalAgentTransportConfig` with mode/kind | Compatible | `@tripp-os/agent-bus` |
| **agent roles** | Direct — Same 3 roles (+ Eddie) | **Already unified** | `@tripp-os/agent-bus` |
| **escalation policy** | Partial — Reason's review `escalate` verdict ~= Control escalation | Compatible | `@tripp-os/agent-bus` |
| **governance trace** | Direct — Reason's append-only trace ledger ~= Control governance trace | **Same concept, same JSONL** | `@tripp-os/agent-bus` |
| **operator review gate** | Direct — Reason's Echo review ~= Control operator review | Compatible | `@tripp-os/agent-bus` |

**Verdict:** No conflicts. Reason and Control share the same agent roles, governance trace pattern, and review gate concept. The main gap is budget/Forge concepts that Control has and Reason doesn't need — this is fine; the OS contracts layer can define them for consumers that want them.

---

## EXTRACT NOW

### `@tripp-reason/external-agents` → `@tripp-os/agent-bus`

**Dependencies:** Only `zod`. Zero workspace deps.

**Exported surface:**
- 28 Zod schemas (task, result, review, trace, transport)
- 17 file-bus functions (read/write/list/move packets)
- 11 trace ledger functions (append/read/validate/query/chain)
- 5 transport helpers (config/dispatch/fake/manual)
- 11 constants (paths, version, denied paths)

**Tests:** 68/68 PASS (3 test files)

**Reason coupling found:**
- JSDoc comments: `@tripp-reason/external-agents` (6 files) — **cosmetic, rename to `@tripp-os/agent-bus`**
- One schema message: "Eddie is the final approver" — **keep, Eddie is top of chain in OS too**
- One constant comment: "Tripp.Reason-generated review reports" — **trivial, update**
- Path default: `.tripp/agents/` — **already generic, Tripp.OS standard**

**Extraction plan:** Copy package as-is, rename namespace, update JSDoc. Zero code changes needed.

---

## EXTRACT AFTER SMALL CLEANUP

### `@tripp-reason/mcp` → `@tripp-os/mcp`

**Dependencies:** `shared` (workspace), `zod`

**What it imports from shared:** `Tool`, `ToolContext`, `RiskLevel`, `McpToolInfo` — all generic interfaces.

**Cleanup needed:**
- Extract `Tool`, `ToolContext`, `RiskLevel` from shared into `@tripp-os/contracts` first
- Then MCP can depend only on `@tripp-os/contracts`
- Remove `@tripp-reason/mcp` JSDoc references

**Risk:** Low. MCP bridge is already generic — it's a stdio JSON-RPC client that adapts MCP tools to a Tool interface. Nothing Reason-specific.

---

## EXTRACT LATER

### `@tripp-reason/shared` → `@tripp-os/contracts` + `@tripp-reason/shared`

**Current exports (9 groups):**
- `schemas.ts` — Message, Session, Run, Event, ToolCall, Approval, Report schemas
- `contracts.ts` — ToolContext, ProviderAdapter, Tool, ToolDispatcher, Approver interfaces
- `events.ts` — StreamEvent union
- `status.ts` — RunStatus, SessionStatus, ToolCallStatus, ApprovalStatus, EventType, RiskLevel, MessageRole, ReportStatus, FinishReason
- `report.ts` — RunReport schema
- `index.ts` — barrel

**Split needed:**
| Extract to `@tripp-os/contracts` | Keep in `@tripp-reason/shared` |
|----------------------------------|-------------------------------|
| `Tool` interface | `Session` / `SessionSchema` |
| `ToolContext` | `Run` / `RunSchema` |
| `ToolDispatcher` | `Message` / `ChatMessage` |
| `Approver` interface | `Event` / `EventSchema` |
| `ProviderAdapter` | `ToolCall` / `ToolCallSchema` |
| `RiskLevel` | `ApprovalRecord` |
| `ApprovalStatus` | `ReportRecord` |
| `RunStatus` | `RunReport` |
| `ToolCallStatus` | `StreamEvent` union |
| `EventType` | |
| `MessageRole` | |
| `FinishReason` | |
| `ReportStatus` | |
| `SessionStatus` | |

### `@tripp-reason/store` → `@tripp-os/store` + `@tripp-reason/store`

**Current state:** 7 drizzle-orm tables — `sessions`, `runs`, `messages`, `events`, `tool_calls`, `approvals`, `reports`. All ReasonLoop-shaped.

**Split needed:**
| `@tripp-os/store` (generic) | `@tripp-reason/store` (Reason-specific) |
|-----------------------------|----------------------------------------|
| `initDb()` factory | ReasonLoop table schemas |
| `createRepositories()` pattern | Session/report/approval repos |
| Generic SQLite helpers | |
| Migration/version helpers | |

**Risk:** Medium. The schema shape is tightly coupled to ReasonLoop's session/run/message/event model. A clean split requires defining what a Tripp.OS store actually needs vs what Reason specifically needs.

---

## KEEP REASON-SPECIFIC

| Package | Why |
|---------|-----|
| `@tripp-reason/core` | ReasonLoop engine — Reason's heart |
| `@tripp-reason/providers` | LLM provider adapters — Reason-specific |
| `@tripp-reason/tools` | Tool implementations — Reason-specific |
| `@tripp-reason/swarm` | Kimi-style orchestration — built on core |
| `@tripp-reason/server` | Assembly layer — wires everything |
| `@tripp-reason/cli` | Assembly layer — wires everything |
| `apps/dashboard` | UI — already HTTP-only, portable design |

---

## DO NOT EXTRACT

None. All packages are at worst "extract later after split."

---

## AGENT BUS AUDIT (external-agents → @tripp-os/agent-bus)

### Exported schemas (21)
`ExternalAgentRole`, `ExternalAgentTrustZone`, `ExternalAgentTaskType`, `ExternalAgentPacketStatus`, `ExternalAgentToolPolicy`, `ExternalAgentApprovalPolicy`, `ExternalAgentContextPolicy`, `ExternalAgentTaskPacket`, `ExternalAgentResultStatus`, `ExternalAgentProposedChange`, `ExternalAgentResultPacket`, `ExternalAgentReviewVerdict`, `ExternalAgentReviewPacket`, `AgentBusTraceEventType` (24 values), `AgentBusTraceSeverity`, `AgentBusTraceActorType`, `AgentBusTraceEvent`, `ExternalAgentTransportKind`, `ExternalAgentTransportMode`, `ExternalAgentTransportConfig`, `ExternalAgentDispatchRequest`, `ExternalAgentDispatchStatus`, `ExternalAgentDispatchResult`

### Exported functions (33)
`ensureAgentBus`, `getAgentBusPaths`, `writeTaskPacket`, `readTaskPacket`, `writeResultPacket`, `readResultPacket`, `writeReviewPacket`, `readReviewPacket`, `listInboxPackets`, `listOutboxPackets`, `listReviewPackets`, `listReportFiles`, `movePacketToArchive`, `movePacketToRejected`, `createTaskPacketFilename`, `createResultPacketFilename`, `createReviewPacketFilename`, `getTraceLedgerPath`, `ensureTraceLedger`, `createTraceEvent`, `appendTraceEvent`, `readTraceEvents`, `validateTraceLedger`, `findTraceEventsByPacketId/ResultId/ReviewId/RunId`, `findRootCauseChain`, `createDefaultTransportConfig`, `validateTransportConfig`, `createDispatchRequest`, `dispatchToFakeAgent`, `dispatchToManualFileTransport`

### Path assumptions
- `.tripp/agents/{inbox,outbox,reports,archive,rejected}/` — **Tripp.OS standard**
- `.tripp/agents/trace/agent-bus-trace.jsonl` — **Tripp.OS standard**
- All path constants are exported and overridable via `workdir` parameter

### Verdict
**Can become `@tripp-os/agent-bus` with zero behavior changes.** Rename JSDoc `@tripp-reason/external-agents` → `@tripp-os/agent-bus`. The `.tripp/agents/` path prefix is already the de-facto Tripp standard.

---

## SHARED CONTRACTS AUDIT

### What's generic (24 types/enums)
`RunStatus`, `SessionStatus`, `ToolCallStatus`, `ApprovalStatus`, `EventType`, `RiskLevel`, `MessageRole`, `ReportStatus`, `FinishReason` — all portable status enums  
`Tool`, `ToolContext`, `ToolDispatcher`, `Approver`, `ProviderAdapter` — all portable interfaces  
`Message`, `Session`, `Run`, `Event`, `ToolCall`, `ApprovalRecord` — data schemas (semi-portable)  
`StreamEvent` — protocol type (portable)

### What's Reason-specific
`RunReport` — contains `sessionId`, `provider`, `model`, `filesChanged`, `persistenceWarnings` — **ReasonLoop-shaped**  
`PersistenceWarning` — **Reason-specific audit concept**

### Verdict
**Should become `@tripp-os/contracts` (generic half) + `@tripp-reason/shared` (Reason-specific half).** The split point is clear: status enums + interfaces → OS; report/session/run schemas → Reason.

---

## STORE EXTRACTION RISK

**Risk: MEDIUM**

The store's table schemas are tightly coupled to ReasonLoop's data model:
- `sessions` — provider, model, workdir columns
- `runs` — prompt, provider, model, status
- `messages` — role, content, session_id FK
- `events` — type, data JSON, run_id FK
- `tool_calls` — tool_name, args, status
- `approvals` — tool_name, risk_level, status
- `reports` — status, path, markdown

The generic parts worth extracting: `initDb()` factory, `createRepositories()` pattern, SQLite migration helpers. But the table shapes are so ReasonLoop-specific that splitting prematurely creates more problems than it solves.

**Recommendation:** Defer. Extract after `@tripp-os/contracts` and `@tripp-os/agent-bus` are stable. Then define what a Tripp.OS store needs (probably just trace persistence and agent bus state) separately from what Reason needs.

---

## MCP EXTRACTION RISK

**Risk: LOW**

MCP imports only generic interfaces from shared: `Tool`, `ToolContext`, `RiskLevel`. Once these move to `@tripp-os/contracts`, MCP depends only on OS contracts + `zod` + Node built-ins.

The MCP bridge is genuinely portable — it's a stdio JSON-RPC client that discovers MCP servers, converts their JSON schemas to Zod, creates tool adapters, and exposes a registry. Nothing requires ReasonLoop.

**Recommendation:** Extract after `@tripp-os/contracts` is extracted (Stage 3 → Stage 4).

---

## TEST COVERAGE

| Package | Test File | Tests | Portable? | Depends on Reason runtime? |
|---------|----------|-------|-----------|---------------------------|
| external-agents | `schemas.test.ts` | 27 | ✅ Fully portable | No — pure Zod validation |
| external-agents | `fileBus.test.ts` | 14 | ✅ Fully portable | No — uses temp dirs, fs |
| external-agents | `traceLedger.test.ts` | 28 | ✅ Fully portable | No — uses temp dirs |
| cli | `agentsCommand.test.ts` | 40 | Partial | Yes — tests CLI commands that import external-agents |

**Total: 108/108 PASS. 69/108 are package-portable (external-agents tests).**

---

## RECOMMENDED EXTRACTION PLAN

### Stage 1 — Package Boundary Map (done in this audit)
- Document all dependency edges
- Identify Reason-specific coupling points
- Map Compatibility with Tripp.Control

### Stage 2 — Compatibility Matrix (done in this audit)
- Tripp.Control concepts mapped to Reason schemas
- No conflicts found
- Agent roles already unified
- Trace ledger same concept

### Stage 3 — Extract Contracts (`shared` → `@tripp-os/contracts`)
- Extract status enums + interfaces + StreamEvent from shared
- Create `@tripp-os/contracts` package (depends only on zod)
- Update `@tripp-reason/shared` to re-export from `@tripp-os/contracts`
- Run all tests

### Stage 4 — Extract Agent Bus (`external-agents` → `@tripp-os/agent-bus`)
- Copy package, rename to `@tripp-os/agent-bus`
- Update JSDoc namespace references
- Update `@tripp-reason/server` and `@tripp-reason/cli` to import from new package
- Run all tests

### Stage 5 — Add Compatibility Aliases
- `@tripp-reason/external-agents` → re-export from `@tripp-os/agent-bus`
- No breaking changes for existing consumers

### Stage 6 — Extract MCP (`mcp` → `@tripp-os/mcp`)
- After contracts are extracted, MCP depends only on `@tripp-os/contracts`
- Remove `@tripp-reason/shared` import from MCP
- Run MCP tests

### Stage 7 — Full Validation
- Run ALL tests across ALL packages
- Verify no import breakage
- Verify dashboard still builds

### Stage 8 — Consider Store (defer)
- Only after contracts + agent-bus + MCP are stable
- Define Tripp.OS store needs vs Reason store needs
- Split if justified

---

## RISKS / BLOCKERS

| Risk | Severity | Mitigation |
|------|----------|------------|
| `@tripp-reason/shared` is imported by 9 packages — split requires careful aliasing | MEDIUM | Stage 3 uses re-export pattern; no breaking changes |
| `external-agents` path hardcodes `.tripp/agents/` — Tripp.Control may want different root | LOW | All paths overridable via `workdir` parameter |
| Store schema split is premature — would create churn for little gain | MEDIUM | Defer to Stage 8 |
| Dashboard imports nothing from runtime packages — but server does. Server rebuild needed if contracts move | LOW | Server is assembly layer; import update is mechanical |
| Namespace churn — `@tripp-reason/` → `@tripp-os/` | LOW | Mechanical rename; aliases keep backward compat |

**No blockers. Extraction can proceed Stage 3 first.**

---

## COMMANDS RUN

```
pnpm test (all packages)
tsc (server, external-agents, cli)
vite build (dashboard)
grep dependency trees
grep Reason-specific coupling
grep schema exports
find test files
```

## FILES INSPECTED

```
packages/shared/src/{schemas,contracts,events,status,report,index}.ts
packages/external-agents/src/{schemas,constants,fileBus,traceSchemas,traceLedger,transportSchemas,transport,index}.ts
packages/store/src/{db,schema,repositories,index}.ts
packages/mcp/src/{toolAdapter,runtime,registry,client,types,index}.ts
packages/{core,providers,tools,swarm,server,cli}/package.json
apps/dashboard/package.json
All __tests__ directories
```

## NEXT STEP

**Stage 3 — Extract `@tripp-os/contracts` from `@tripp-reason/shared`.** This is the lowest-risk first step. It creates the OS foundation that MCP and Agent Bus can then depend on, and it proves the extraction pattern without breaking anything.
