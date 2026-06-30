# Phase 1A Shared Contracts Report

## PHASE
Phase 1A — Monorepo Skeleton + Shared Contracts

## STATUS
PASS

## MODEL TIERS USED

| Task | Tier Used | Rationale |
|------|-----------|-----------|
| Schema/interface design | Heavy Technical Thinking | Core data contracts — everything downstream depends on these shapes |
| File creation & scaffolding | Fast Technical Builder | Straightforward file writes, pnpm config, tsconfig |
| Validation & scope checks | Budget Daily Driver | Routine verification commands |
| Pre-report self-review | Code Review / Warden Pass | Doctrine compliance check before writing this report |

## FILES CREATED

### Root Monorepo
| # | File | Purpose |
|---|------|---------|
| 1 | `package.json` | Workspace root, private, scripts: build/typecheck/test/clean |
| 2 | `pnpm-workspace.yaml` | Declares `packages/*` workspace |
| 3 | `tsconfig.base.json` | Shared TS config: ES2022, strict, composite, Node16 modules |
| 4 | `README.md` | Project overview, principles, quick start |

### packages/shared/
| # | File | Purpose |
|---|------|---------|
| 5 | `packages/shared/package.json` | @tripp-reason/shared, deps: zod only |
| 6 | `packages/shared/tsconfig.json` | Extends base, src → dist |
| 7 | `packages/shared/src/status.ts` | All status enums as Zod schemas + TS types |
| 8 | `packages/shared/src/schemas.ts` | Core data + request/response Zod schemas |
| 9 | `packages/shared/src/events.ts` | StreamEvent discriminated union (5 variants) |
| 10 | `packages/shared/src/contracts.ts` | Cross-package interfaces (ProviderAdapter, Tool, ToolDispatcher, Approver) |
| 11 | `packages/shared/src/report.ts` | RunReport schema + ToolCallSummary |
| 12 | `packages/shared/src/index.ts` | Barrel export — single entry point |

### Build Output
| # | Path | Purpose |
|---|------|---------|
| 13 | `packages/shared/dist/*.js` | Compiled JavaScript (5 modules) |
| 14 | `packages/shared/dist/*.d.ts` | Type declarations (5 files) |

**Total source files created: 12** (4 root + 8 shared)
**Total dependencies: zod@3.24+ and typescript@5.7+**

## FILES MODIFIED
None. All files are new creation.

## CONTRACTS CREATED

### Status Enums (status.ts)
| Schema | Type | Values |
|--------|------|--------|
| RunStatusSchema | RunStatus | pending, running, completed, failed, cancelled |
| SessionStatusSchema | SessionStatus | active, archived, completed |
| ToolCallStatusSchema | ToolCallStatus | pending, awaiting_approval, executing, completed, failed, cancelled, denied |
| ApprovalStatusSchema | ApprovalStatus | pending, approved, denied, timed_out |
| EventTypeSchema | EventType | message, tool_request, tool_result, finish, error |
| RiskLevelSchema | RiskLevel | safe, mutating, destructive |
| MessageRoleSchema | MessageRole | user, assistant, system, tool |
| ReportStatusSchema | ReportStatus | PASS, FAIL, PARTIAL |
| FinishReasonSchema | FinishReason | complete, max_turns, error, cancelled |

### Data Schemas (schemas.ts)
| Schema | Type | Fields |
|--------|------|--------|
| MessageSchema | Message | id, session_id, run_id, role, content, created_at |
| ChatMessageSchema | ChatMessage | role, content (stripped for provider requests) |
| SessionSchema | Session | id, title, created_at, updated_at, status, provider, model, mode? |
| RunSchema | Run | id, session_id, status, started_at, completed_at? |
| EventSchema | Event | id, session_id, run_id, type, payload, created_at |
| ToolCallSchema | ToolCall | id, session_id, run_id, tool_name, args, result?, status, created_at |
| ApprovalRecordSchema | ApprovalRecord | id, session_id, run_id, tool_call_id, status, reason?, created_at, resolved_at? |
| ReportRecordSchema | ReportRecord | id, session_id, run_id, path, summary, created_at |
| ProviderRequestSchema | ProviderRequest | model, messages, tools?, maxTokens?, temperature? |
| ApprovalRequestSchema | ApprovalRequest | toolName, args, riskLevel, context{session_id, run_id} |
| ApprovalResultSchema | ApprovalResult | discriminated union: approved=true{reason?} / approved=false{reason} |
| ToolResultSchema | ToolResult | status, output, error? |

### Event Contracts (events.ts)
| Schema | Type | Fields |
|--------|------|--------|
| StreamEventMessageSchema | StreamEventMessage | type="message", content, role="assistant" |
| StreamEventToolRequestSchema | StreamEventToolRequest | type="tool_request", tool, args, requiresApproval |
| StreamEventToolResultSchema | StreamEventToolResult | type="tool_result", tool, result, status |
| StreamEventFinishSchema | StreamEventFinish | type="finish", reason, runId |
| StreamEventErrorSchema | StreamEventError | type="error", message, recoverable |
| StreamEventSchema | StreamEvent | discriminated union of all 5 above |

### Cross-Package Interfaces (contracts.ts)
| Interface | Methods | Consumers |
|-----------|---------|-----------|
| ToolContext | (data: sessionId, runId, workdir) | tools |
| ProviderAdapter | name, stream(), listModels() | core |
| Tool | name, description, inputSchema, requiresApproval, execute() | tools |
| ToolDispatcher | listTools(), dispatch() | core |
| Approver | requestApproval() | core |

### Report Schema (report.ts)
| Schema | Type | Fields |
|--------|------|--------|
| ToolCallSummarySchema | ToolCallSummary | tool, argsSummary, status, duration? |
| RunReportSchema | RunReport | sessionId, runId, status, prompt, provider, model, timestamps, elapsed, events, toolCalls, filesChanged, validation?, nextStep, path |

## DESIGN DECISIONS (Heavy Technical Thinking)

### 1. Message dual shape
**Problem:** Stored messages have DB fields (id, session_id, run_id). Provider requests need only role+content.
**Solution:** Two schemas — `MessageSchema` (stored) and `ChatMessageSchema` (provider-facing). ProviderRequest references `ChatMessage[]`.

### 2. ApprovalRecord vs Approval naming
**Problem:** `Approval` schema name collides with `ApprovalRequest`/`ApprovalResult`.
**Solution:** DB record is `ApprovalRecordSchema`/`ApprovalRecord`. Request/Result keep their architectural names. No confusion between the persistence shape and the contract shape.

### 3. No ProviderResponse type
**Problem:** Architecture doc mentions `ProviderResponse` but provider streaming is async iterable.
**Solution:** The `AsyncIterable<StreamEvent>` IS the response. No separate response wrapper needed. This is intentional — the stream carries events directly to the consumer.

### 4. ToolResult uses z.unknown() for output
**Problem:** Tool output varies widely (file content, search results, structured data).
**Solution:** `output: z.unknown().nullable()` — flexible enough for any tool while still typed at the boundary.

### 5. ApprovalResult as discriminated union
**Problem:** If approved=false, reason is required. If approved=true, reason is optional.
**Solution:** `z.discriminatedUnion("approved", [...])` — the discriminator field enforces the correct shape at parse time.

### 6. RiskLevel for approval routing
The ApprovalRequest includes `riskLevel: "safe" | "mutating" | "destructive"` — this lets ApprovalGate and Approver implementations make decisions without re-inspecting the tool.

### 7. Events payload is z.unknown()
**Problem:** Different event types carry different payloads.
**Solution:** `payload: z.unknown()` — the specific payload shape is determined by the event type. Typed parsing happens at the consumer layer.

### 8. FinishReason includes "cancelled"
Extended beyond architecture doc's "complete | max_turns | error" to include "cancelled" — needed for operator-initiated run cancellation.

## WARDEN PASS — Doctrine Compliance Check

### ✅ ARCHITECTURE.md compliance
- All 13 schemas listed in ARCHITECTURE.md `shared` section → present
- All 4 interfaces listed → present
- `shared` imports nothing from other packages → confirmed (no cross-package imports)
- Import rule enforced → barrel export is single entry point

### ✅ DOCTRINE.md compliance
- No Goose code or branding → grep confirmed zero matches
- No runtime classes → all exports are schemas, types, and interfaces only
- No provider implementation → confirmed
- No tool implementation → confirmed
- No implementations of any kind → confirmed

### ✅ ROADMAP.md Phase 1 scope compliance
- `packages/shared/` with Zod schemas + contracts → ✅
- No other packages created → confirmed all 8 others do not exist
- No server, CLI, MCP, swarm, UI → confirmed

### ✅ Naming divergence from architecture doc
Two intentional renames documented above and in DECISIONS section:
1. `Approval` → `ApprovalRecord` (DB record naming clarity)
2. `ProviderResponse` → omitted (stream IS the response)

Both are defensible and do not break any contract. Other packages will reference `ApprovalRecord` for persistence and use the interface types as-is.

## VALIDATION RESULT

| Command | Outcome |
|---------|---------|
| `pnpm install` | ✅ 2 packages (typescript, zod) installed |
| `npx tsc --noEmit -p packages/shared/tsconfig.json` | ✅ Zero errors |
| `npx tsc --build packages/shared/` | ✅ 25 output files generated |
| Forbidden directories check | ✅ All 8 package dirs absent |
| Goose branding grep | ✅ Zero matches |
| Docs intact check | ✅ All 4 docs present |

## SCOPE COMPLIANCE

✅ No core implementation
✅ No provider implementation
✅ No tool implementation
✅ No store implementation
✅ No CLI implementation
✅ No server implementation
✅ No MCP implementation
✅ No swarm implementation
✅ No UI implementation
✅ No Goose code copied
✅ No source code outside packages/shared
✅ No forbidden package directories

**Clean-room boundary intact.**

### Repository state
```
Tripp.Reason/
├── docs/
│   ├── DOCTRINE.md
│   ├── ARCHITECTURE.md
│   ├── ROADMAP.md
│   └── MODEL_TIERS.md
├── reports/
│   ├── STEP_0_DOCTRINE_REPORT.md
│   ├── MODEL_TIER_REPORT.md
│   └── phase-1a-shared-contracts-report.md  ← this file
├── packages/
│   └── shared/
│       ├── package.json
│       ├── tsconfig.json
│       └── src/
│           ├── index.ts
│           ├── status.ts
│           ├── schemas.ts
│           ├── events.ts
│           ├── contracts.ts
│           └── report.ts
├── package.json
├── pnpm-workspace.yaml
├── tsconfig.base.json
├── pnpm-lock.yaml
├── node_modules/
└── README.md
```

## BLOCKERS
None.

## NEXT STEP

**Phase 1A is complete. Recommend proceeding to Phase 1B.**

Phase 1B — Store Package:
- `packages/store/` — SQLite via Drizzle ORM
- Schema definitions mapped 1:1 to shared Zod schemas
- All Phase 1 tables: sessions, runs, messages, events, tool_calls, approvals, reports
- Repository functions: create/get/list for each entity
- No runtime beyond store operations

**Phase 1A → 1B handoff:**
- 1B imports all types from `@tripp-reason/shared`
- 1B adds `drizzle-orm` and `better-sqlite3` (or `@libsql/client`) dependencies
- 1B must not define any duplicate schemas — all validation types come from shared

---

*Phase 1A complete. Shared contracts compiled, validated, doctrine-compliant. Ready for Phase 1B.*
