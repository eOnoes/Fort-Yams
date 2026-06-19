# Stage 3 — Contracts Extraction Pitfalls

## isolatedModules Type Re-export (TS1205)

When `tsconfig.base.json` has `"isolatedModules": true` and a file re-exports from another package, mixing type and value exports in a single statement fails:

```
error TS1205: Re-exporting a type when 'isolatedModules' is enabled requires using 'export type'.
```

**Fix:** Split into value exports and type exports:

```typescript
// ✅ Correct — value exports (Zod schemas)
export {
  RunStatusSchema,
  SessionStatusSchema,
} from "@tripp-os/contracts";

// ✅ Correct — type exports (TypeScript types)
export type {
  RunStatus,
  SessionStatus,
} from "@tripp-os/contracts";
```

This was hit in Stage 3 when rewriting `packages/shared/src/status.ts` as a re-export barrel.

## Reason-Specific Schemas Stay

When extracting `@tripp-os/contracts` from `@tripp-reason/shared`, only GENERIC types move. These stay in Reason:

- Session, Run, Message, ChatMessage, Event, ToolCall
- ApprovalRecord, ApprovalRequest, ApprovalResult
- ProviderRequest, ToolResult, ReportRecord
- RunReport, ToolCallSummary, PersistenceWarning

All 15 of these contain ReasonLoop-shaped fields (provider, model, workdir, session_id FK, run_id FK, filesChanged). They are NOT portable to Tripp.OS.

## Duplicate Definition Audit

After extraction, verify no duplicate divergent definitions remain:

| Item | Contracts Version | Shared Version | Verdict |
|------|------------------|---------------|---------|
| Status enums | Canonical via re-export | Re-exports from contracts | ✅ Clean |
| StreamEvent | Canonical via re-export | Re-exports from contracts | ✅ Clean |
| Tool interface | Generic version | Reason-specific version (imports Reason schemas) | ✅ Both valid for their domain |
| ProviderAdapter | Generic version | Reason-specific version | ✅ Both valid |

## Contracts Doesn't Exist Yet? Create It.

If Stage 1 hasn't been implemented yet and `@tripp-os/contracts` doesn't exist, Stage 3 must create it as part of the compatibility pass. Create the minimal package with:

1. `packages/@tripp-os/contracts/package.json` — name, version, zod dep
2. `packages/@tripp-os/contracts/tsconfig.json` — extends `../../../tsconfig.base.json`
3. `packages/@tripp-os/contracts/src/status.ts` — all 9 generic status enums
4. `packages/@tripp-os/contracts/src/contracts.ts` — 5 interfaces + StreamEvent + generic Result/Request/Approval types
5. `packages/@tripp-os/contracts/src/index.ts` — barrel export

Then wire `@tripp-reason/shared` to add `@tripp-os/contracts` as a dep and re-export status enums.
