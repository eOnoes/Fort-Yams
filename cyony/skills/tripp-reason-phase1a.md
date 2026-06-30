# Tripp.Reason Phase 1A — Shared Contracts (Executed 2026-06-02)

Session-specific reference: the first implementation pass after Step 0. Monorepo skeleton + `packages/shared/` as the contract spine that everything downstream imports.

## What Phase 1A Produces

```
Tripp.Reason/
├── package.json              (workspace root, private, tsc 5.9)
├── pnpm-workspace.yaml       (packages/*)
├── tsconfig.base.json        (ES2022, strict, Composite, Node16 modules)
├── README.md
└── packages/shared/
    ├── package.json          (@tripp-reason/shared, deps: zod only)
    ├── tsconfig.json
    └── src/
        ├── index.ts          (barrel export)
        ├── status.ts         (9 enums as Zod schemas + TS types)
        ├── schemas.ts        (12 core schemas: Message, Session, Run, etc.)
        ├── events.ts         (StreamEvent: 5-variant discriminated union)
        ├── contracts.ts      (4 interfaces: ProviderAdapter, Tool, ToolDispatcher, Approver)
        ├── report.ts         (RunReport + ToolCallSummary)
        └── dist/             (compiled JS + .d.ts + sourcemaps)
```

## Scaffold Sequence (order matters)

1. **Install pnpm** (pin to pnpm@9 if Node < 22; see pitfalls)
2. **Root package.json + pnpm-workspace.yaml + tsconfig.base.json + README.md** (monorepo shape)
3. **packages/shared/package.json + tsconfig.json** (package boundary; only dep is zod)
4. **status.ts** (enums first — schemas reference these unions)
5. **schemas.ts** (core data shapes + request/response shapes; imports status enums)
6. **events.ts** (discriminated union; imports FinishReasonSchema from status)
7. **contracts.ts** (interfaces; imports StreamEvent from events, types from schemas)
8. **report.ts** (RunReport; imports ReportStatus from status)
9. **index.ts** (barrel — single entry point for the whole package)
10. **`pnpm install` + `tsc --build` + validation commands**

This sequence avoids circular references: status (leaf) → schemas → events → contracts → report → index. Every file only imports from prior files in the chain.

## Schema Design Decisions (Heavy Technical Thinking)

Eight decisions made during Phase 1A, each justified in the phase report:

### 1. Message dual shape
Stored messages need DB fields (id, session_id, run_id). Provider requests need only role+content. Solution: `MessageSchema` (stored) and `ChatMessageSchema` (provider-facing). `ProviderRequest.references ChatMessage[]`.

### 2. Approval naming divergence (the #1 naming lesson)
`Approval` schema name collides with `ApprovalRequest`/`ApprovalResult`. Solution: DB record renamed to `ApprovalRecordSchema`/`ApprovalRecord`. Keep the architectural request/result names unchanged. **Must be called out explicitly in phase report** so future packages reference the right type.

### 3. No ProviderResponse wrapper
Architecture doc mentions `ProviderResponse` but provider streaming is async iterable — the stream IS the response. The `AsyncIterable<StreamEvent>` carries events directly to the consumer. Omitted the redundant wrapper. **Documented in phase report.**

### 4. ToolResult.output is `z.unknown()`
Tool output varies (file content, search results, structured data). `output: z.unknown().nullable()` keeps it flexible while still typed at the boundary.

### 5. ApprovalResult as `z.discriminatedUnion("approved", [...])`
If `approved=false`, reason is required. If `approved=true`, reason is optional. The discriminator enforces correct shape at parse time.

### 6. RiskLevel in ApprovalRequest
`riskLevel: "safe" | "mutating" | "destructive"` lets ApprovalGate and Approver implementations route decisions without re-inspecting the tool. Lives on the request, not computed by the gate.

### 7. Event payload is `z.unknown()`
Different event types carry different payloads. Typed parsing happens at the consumer layer, not in the shared schema.

### 8. Added "cancelled" to FinishReason
Architecture doc had "complete | max_turns | error". Added "cancelled" for operator-initiated run cancellation. Defensible divergence documented in report.

## Key Interface Shapes (contract reference)

```typescript
// ProviderAdapter
interface ProviderAdapter {
  readonly name: string;
  stream(request: ProviderRequest): AsyncIterable<StreamEvent>;
  listModels(): Promise<string[]>;
}

// Tool
interface Tool {
  readonly name: string;
  readonly description: string;
  readonly inputSchema: z.ZodType<unknown>;
  readonly requiresApproval: boolean;
  execute(input: unknown, context: ToolContext): Promise<ToolResult>;
}

// ToolDispatcher
interface ToolDispatcher {
  listTools(): Tool[];
  dispatch(toolName: string, input: unknown, context: ToolContext): Promise<ToolResult>;
}

// Approver
interface Approver {
  requestApproval(operation: ApprovalRequest): Promise<ApprovalResult>;
}
```

## Validation Checklist (run at end of Phase 1A)

```bash
# Forbidden packages — all must not exist
for d in packages/core packages/providers packages/tools packages/store \
         packages/server packages/cli packages/mcp packages/swarm; do
  [ -d "$d" ] && echo "❌ BREACH: $d" || echo "✅ $d absent"
done

# Goose branding — zero matches
grep -ri "goose\|block\|square" packages/shared/src/ || echo "✅ No Goose branding"

# Docs intact
for f in docs/DOCTRINE.md docs/ARCHITECTURE.md docs/ROADMAP.md; do
  [ -f "$f" ] && echo "✅ $f" || echo "❌ $f MISSING"
done

# Compile
npx tsc --noEmit -p packages/shared/tsconfig.json  # zero errors expected
npx tsc --build packages/shared/                   # produces dist/
```

## Pitfalls Discovered

### `pnpm` version vs Node version
- pnpm@11 requires Node 22+
- Node 20 systems must pin to pnpm@9 (`npm install --prefix ~/local-pnpm pnpm@9`)
- Latest `corepack prepare pnpm@latest` will install pnpm that fails on Node 20 with `node:sqlite` missing module error
- Fix: test `pnpm --version` after install; if errors, downgrade

### Schema naming divergence MUST be documented
When you rename a schema from the architecture doc (e.g. `Approval` → `ApprovalRecord`), future packages will reference the wrong name unless the divergence is explicitly called out in the phase report. This is a **mandatory section** in every Phase 1x report when schemas don't 1:1 match the architecture doc.

### "Stream IS the response" trap
When an architecture doc mentions both a streaming return AND a response object type, the response object is often redundant. The `AsyncIterable<StreamEvent>` IS the response — no wrapper needed. Question both before implementing both. Same trap applies to "ProviderResponse", "ChatResponse", "ToolResponse" patterns.

### Barrel export discipline
`packages/shared/src/index.ts` is the ONLY public entry point. Every file inside shared/ is internal. Other packages import from `@tripp-reason/shared` — never from internal paths like `@tripp-reason/shared/contracts`. Enforce via package.json `"exports": { ".": {...} }` with no subpath exports.

## Handoff to Phase 1B

Phase 1B = `packages/store/` (SQLite via Drizzle). Imports all types from `@tripp-reason/shared`. Must not define duplicate schemas — all validation types come from shared. The schema names in the store's Drizzle tables must match the shared schema names (including renames like `ApprovalRecord`).

## Files of Record

- `/opt/data/shared/Tripp.Reason/reports/phase-1a-shared-contracts-report.md` — full report with decisions, Warden Pass, scope compliance
- `/opt/data/shared/Tripp.Reason/packages/shared/src/*` — the source files
- `/opt/data/shared/Tripp.Reason/packages/shared/dist/*` — compiled output
