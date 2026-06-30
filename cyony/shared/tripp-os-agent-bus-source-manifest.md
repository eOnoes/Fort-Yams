# Tripp.OS Agent Bus — Source Manifest

## Package Identity
- **Name:** @tripp-os/agent-bus
- **Version:** 0.1.0
- **Type:** ESM module
- **Dependency:** zod ^3.24.0

## File Manifest

| File | Size | SHA-256 | Type | Purpose |
|------|------|---------|------|---------|
| `packages/agent-bus/package.json` | 466B | `96b2ad24c42dd1f8321e…` | config | Package metadata |
| `packages/agent-bus/tsconfig.json` | 280B | `e98519992427ee153953…` | config | TypeScript build config |
| `packages/agent-bus/src/index.ts` | 485B | `c088cb7f75808f74c0a2…` | source | Barrel re-export |
| `packages/agent-bus/src/constants.ts` | 1345B | `094470ad643ffb3536df…` | source | Bus paths, denied paths, schema version |
| `packages/agent-bus/src/schemas.ts` | 12287B | `b6718c14e53d6eaa81c1…` | source | 13 packet/review/policy Zod schemas + runtime validators |
| `packages/agent-bus/src/fileBus.ts` | 14137B | `290de0e7a53a321a68fb…` | source | 14 helpers: read/write/list/move/review |
| `packages/agent-bus/src/traceSchemas.ts` | 6221B | `dab914f3010e49767cc6…` | source | 5 trace schemas: 24 event types, severities, actors |
| `packages/agent-bus/src/traceLedger.ts` | 8530B | `89127fc10128d3f27e54…` | source | 10 helpers: append/read/validate/query/chain |
| `packages/agent-bus/src/transportSchemas.ts` | 7905B | `ea51cb233abe0bef01d2…` | source | 6 transport schemas with safety rules |
| `packages/agent-bus/src/transport.ts` | 9285B | `1b4c000edc8bacb8bdf1…` | source | 6 helpers: fake dispatch, manual file dispatch |
| `packages/agent-bus/src/__tests__/schemas.test.ts` | 11064B | `5c25da2bec10805cdcb0…` | test | Schema validation (27 tests) |
| `packages/agent-bus/src/__tests__/fileBus.test.ts` | 8418B | `4a6839e634933b178a66…` | test | File bus helpers (14 tests) |
| `packages/agent-bus/src/__tests__/traceLedger.test.ts` | 13105B | `ddb82f9706a8c90fa11f…` | test | Trace ledger helpers (27 tests) |

## Counts
- Source files: 8 (including index.ts)
- Test files: 3
- Config files: 2
- Total: 13

## Test Split
- schemas.test.ts — 27
- fileBus.test.ts — 14
- traceLedger.test.ts — 27
- Total — 68

## Export Count
- 73 total (29 schemas/types, 10 constants, 30 helpers, 4 support types)

## JSDoc Drift
- Namespace only: @tripp-reason/external-agents → @tripp-os/agent-bus
- Zero functional changes from Tripp.Reason external-agents originals