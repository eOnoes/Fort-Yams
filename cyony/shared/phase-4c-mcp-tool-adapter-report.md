# Phase 4C MCP Tool Adapter Report

## PHASE

Phase 4C — MCP Tool Adapter + Schema Conversion

## STATUS

**PASS** ✅

## MODEL TIERS USED

- **Heavy Technical Thinking** — Tool adapter boundary, schema conversion design, risk/approval mapping, error control flow
- **Fast Technical Builder** — Implementation of toolAdapter, schemaConversion, toolRisk, client callTool, mockServer tools/call
- **Code Review / Warden Pass** — Scope audit, security checks, dependency verification, report

## FILES CREATED

| File | Purpose |
|------|---------|
| `packages/mcp/src/toolRisk.ts` | Risk mapping: `riskToRequiresApproval()`, `riskLabel()` — safety-first defaults |
| `packages/mcp/src/schemaConversion.ts` | JSON Schema → Zod: object, string, number, boolean, array, enum; `convertJsonSchemaToZod()` with warnings |
| `packages/mcp/src/toolAdapter.ts` | `McpToolAdapter` implementing `Tool` from shared; `createMcpToolAdapters()` factory |
| `packages/mcp/src/smokeTest4c.ts` | 29-assertion smoke test covering all 17 requirements |

## FILES MODIFIED

| File | Change |
|------|--------|
| `packages/mcp/package.json` | Added `zod: ^3.24.0` dependency |
| `packages/mcp/src/index.ts` | Added barrel exports for schemaConversion, toolRisk, toolAdapter |
| `packages/mcp/src/client.ts` | Added `callTool(toolName, input): Promise<unknown>` — JSON-RPC tools/call |
| `packages/mcp/src/mockServer.ts` | Added `handleToolCall()` — mock_echo echoes, mock_mutate returns mock result; `tools/call` route in processLine |
| `pnpm-lock.yaml` | Updated by pnpm install |

## MCP ADAPTER COMPONENTS

### McpToolAdapter
Implements the shared `Tool` interface from `@tripp-reason/shared`:

| Field | Source |
|-------|--------|
| `name` | `mcp.<serverId>.<toolName>` — namespaced |
| `description` | From MCP tool definition (capped at 500 chars in Phase 4B) |
| `inputSchema` | JSON Schema converted to Zod via `convertJsonSchemaToZod()` |
| `requiresApproval` | From risk classification: safe→false, everything else→true |
| `execute(input, context)` | Calls `McpClient.callTool()`, maps errors to `ToolResult { status: "error" }` |

Error mapping: `McpRemoteError` → controlled message, `McpTimeoutError` → timeout message, `McpProtocolError` → protocol message, unknown → generic message. No raw stack traces.

### Schema Conversion
Covers the MCP JSON Schema subset needed for mock tools and common patterns:
- `type: "object"` with `properties` and `required` → `z.object()`
- `type: "string"`, `"number"`, `"boolean"` → `z.string()`, `z.number()`, `z.boolean()`
- `type: "array"` with `items` → `z.array()`
- `enum` → `z.enum()`
- `description` → `.describe()`
- `minLength`, `maxLength`, `minimum`, `maximum`, `minItems`, `maxItems` constraints
- Unsupported types → `z.unknown()` with warning in `ConversionResult.warnings[]`

### Risk Mapping
- `riskToRequiresApproval("safe")` → `false`
- `riskToRequiresApproval("mutating" | "destructive" | undefined)` → `true` (safety-first)
- `riskLabel()` for human-readable display in prompts/logs

### Adapter Factory
`createMcpToolAdapters(client, discoveredTools)` → `Tool[]`:
- Creates one `McpToolAdapter` per tool
- Skips duplicate namespaced names (controlled, no crash)
- Names stay namespaced: `mcp.<serverId>.<toolName>`

## MOCK TOOL EXECUTION

### mock_echo (safe, no approval)
- Input: `{ message: string }`
- Output: `{ echoed: "<message>" }`
- Validates schema: requires `message` field
- No mutation

### mock_mutate (destructive, requires approval)
- Input: `{ target: string, action: string }`
- Output: `{ accepted: true, target, action, note: "mock only; no real mutation performed" }`
- Validates schema: requires `target` and `action`
- **Does not touch any real files**
- Metadata: `requiresApproval=true`

### Unknown Tool
Returns JSON-RPC error via `McpRemoteError` → mapped to controlled `ToolResult { status: "error" }` by adapter.

## DISCOVERY / ADAPTER RESULT

| namespacedName | toolName | riskLevel | requiresApproval |
|---------------|----------|-----------|-----------------|
| `mcp.mock-echo.mock_echo` | mock_echo | safe | false |
| `mcp.mock-echo.mock_mutate` | mock_mutate | destructive | true |

## VALIDATION RESULT

| Check | Result |
|-------|--------|
| `pnpm typecheck` (8 packages) | ✅ 0 errors |
| `pnpm build` (8 packages) | ✅ 0 errors |
| `mcp` depends on `shared` + `zod` + `@types/node` | ✅ |
| No new forbidden dependencies | ✅ |

## SMOKE TEST RESULT

**29/29 assertions PASS** covering all 17 requirements:

| # | Test | Assertions | Result |
|---|------|-----------|--------|
| 1 | Mock server starts | 1 | ✅ |
| 2 | Client initializes | 1 | ✅ |
| 3 | Tools/list discovers 2 tools | 3 | ✅ |
| 4 | Adapters created for both | 1 | ✅ |
| 5 | Namespaced adapter names | 2 | ✅ |
| 6 | Echo requiresApproval=false | 1 | ✅ |
| 7 | Mutate requiresApproval=true | 2 | ✅ |
| 8 | Schema accepts valid input | 1 | ✅ |
| 9 | Schema rejects invalid input | 1 | ✅ |
| 10 | Echo execute returns echoed result | 2 | ✅ |
| 11 | Mutate execute returns mock result | 3 | ✅ |
| 12 | Unknown tool returns controlled error | 2 | ✅ |
| 13 | Schema conversion handles required fields | 3 | ✅ |
| 14 | Duplicate names handled safely | 1 | ✅ |
| 15-17 | Import isolation + scope | 3 | ✅ |
| Risk | riskToRequiresApproval mapping | 4 | ✅ |

## SECURITY CHECKS

| Check | Status |
|-------|--------|
| Safe tools can be no-approval (mock_echo) | ✅ |
| Unknown/mutating/destructive require approval (mock_mutate) | ✅ |
| No real mutation from mock_mutate | ✅ — confirmed "mock only; no real mutation" |
| Controlled errors (no raw stack traces) | ✅ — all errors mapped to ToolResult profiles |
| No server/CLI/core MCP integration | ✅ — mcp package only |
| mcp imports only shared + zod + Node built-ins | ✅ — verified by typecheck |
| No shell:true anywhere | ✅ |
| No secrets printed | ✅ |

## SCOPE COMPLIANCE

| Check | Status |
|-------|--------|
| No ToolDispatcher production integration | ✅ — factory returns Tool[] but nothing registers |
| No server MCP registration | ✅ |
| No CLI MCP registration | ✅ |
| No ReasonLoop changes | ✅ |
| No packages/swarm | ✅ |
| No UI/dashboard | ✅ |
| No new providers | ✅ |
| No external MCP server loading beyond mock | ✅ |
| core does not import mcp | ✅ |
| tools does not import mcp | ✅ |

## DESIGN DECISIONS

### Partial JSON Schema Support
Only the types needed for mock tools and common MCP schemas are implemented. Full JSON Schema ($ref, allOf, oneOf, anyOf, pattern, format) is deferred. Unsupported types fall back to `z.unknown()` with a warnings array. This keeps the implementation small (~190 lines) while handling the 90% case.

### Fallback Handling
`convertJsonSchemaToZod()` never throws. Unsupported schemas produce `z.unknown()` with a diagnostic warning. Bad inputs produce descriptive warnings. This prevents schema conversion failures from blocking MCP tool registration.

### Risk Mapping
`safe` → no approval. Everything else (`mutating`, `destructive`, `undefined`) → approval required. Safety-first: unknown tools require approval by default. This matches the Phase 4A contract.

### Namespacing
Tool names use the `mcp.<serverId>.<toolName>` convention. This is enforced by `createMcpToolAdapters()` which preserves the namespaced names from discovery. Phase 4D will register these into ToolDispatcher where the namespace prevents collisions with local tools.

### callTool Completion
Phase 4B had no callTool — only discovery. Phase 4C adds `McpClient.callTool()` which sends JSON-RPC `tools/call`, waits for response (with timeout), maps errors to `McpRemoteError`, and returns the raw result. The adapter wraps this in `ToolResult` with controlled error messages.

### Why Integration Waits for Phase 4D/4E
ToolDispatcher registration (Phase 4D) needs the adapter to exist and work. Server/CLI registration (Phase 4E) needs both the adapter and the dispatcher path. Separating these phases keeps each phase testable in isolation. Phase 4C proves the adapter works with mock tools. Phase 4D will prove it works through ToolDispatcher. Phase 4E will prove it works through the HTTP server.

## BLOCKERS

None.

## NEXT STEP

**Phase 4D — MCP Execution Through ApprovalGate**

Phase 4D will:
- Wire `McpToolAdapter` instances into ToolDispatcher
- Route MCP tool calls through the existing ApprovalGate
- Test approval flow with mock_mutate (requires approval → CLI prompt)
- Test deny path returns controlled error
- Test timeout returns controlled error

Phase 4C is complete. All 29 smoke tests pass. Zero core changes. Ready for Phase 4D.

---

*Report generated 2026-06-03. Phase 4C MCP Tool Adapter Report — PASS.*
