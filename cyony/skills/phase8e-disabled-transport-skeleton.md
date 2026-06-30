# Phase 8E — Disabled Transport Skeleton Pattern

## When to use
After fake E2E dry run (8B) and gap closure (8C) prove the pipeline, but BEFORE real transport is confirmed. Adds the structural path without enabling live transport.

## Pattern: 5-step disabled skeleton

1. **Schema extension** — Add new role/kind to existing Zod enums. Keep backward compat (don't remove old values).

2. **Agent defaults** — Add `AGENT_DEFAULTS` entry for new role (trustZone, no mutation, requires ApprovalGate).

3. **Always-blocked stub** — `dispatchToRealAgent()` returns `{ status: "blocked" }` with error message containing `real_transport_disabled`. Emits trace events (packet_claimed + packet_rejected) as evidence. No network, no secrets, no process spawning.

4. **Dispatch router** — `dispatchRoute()` switch on `config.mode`:
   - `"fake"` → existing `dispatchToFakeAgent`
   - `"manual"` → existing `dispatchToManualFileTransport`
   - `"experimental_live"` → `dispatchToRealAgent` (always blocked)
   - `"disabled"` / `"dry_run"` → blocked

5. **Safety tests** (~30 tests, 7 describe blocks):
   - S1: Role schema (accepted, existing roles preserved, invalid rejected)
   - S2: AGENT_DEFAULTS (dry run works, trust zone correct, fake only, invalid rejected)
   - S3: dispatchToRealAgent (blocked, no result packet, trace events, all roles)
   - S4: dispatchRoute (fake→fake, manual→manual, live→blocked, disabled→blocked)
   - S5: No live tokens (scan transport.ts for fetch/XMLHttpRequest/WebSocket/spawn/.env/http.request)
   - S6: ApprovalGate safety (no bypass, Warden stays advisory, allowDirectMutation=false, requireApprovalGate=true)
   - S7: Regression (fake dispatchRoute works, all roles dry run passes)

## Critical pitfall

**`createDefaultTransportConfig(role, "cloud_http_experimental", "experimental_live")` throws ZodError** because the default sets `enabled: false` for experimental_live mode, but the schema's safety rules require `enabled: true` for that mode. Use an explicit config object with `enabled: true` for experimental_live tests. The stub (`dispatchToRealAgent`) still returns "blocked" regardless.

## Build step

After changing source in `@tripp-os/agent-bus`, rebuild the dist:
```
pnpm --filter @tripp-os/agent-bus build
```
The package uses `"main": "./dist/index.js"` — new exports aren't available until rebuilt.

## Test file scanning

When scanning transport.ts for forbidden tokens from tests in `packages/cli/src/__tests__/`, the correct path is:
```typescript
path.resolve(process.cwd(), "../@tripp-os/agent-bus/src/transport.ts")
```
(`process.cwd()` = `packages/cli`, so `../` = `packages/`)

## Exports

Both `dispatchToRealAgent` and `dispatchRoute` must be exported from `@tripp-os/agent-bus/src/transport.ts` (canonical), and `@tripp-reason/external-agents` re-exports them via `export * from "@tripp-os/agent-bus"` in its `index.ts`.
