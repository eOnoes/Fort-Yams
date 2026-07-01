# Phase 4B MCP Skeleton + Mock Client Report

## PHASE

Phase 4B — MCP Package Skeleton + Mock MCP Server / Client Discovery

## STATUS

**PASS** ✅

## MODEL TIERS USED

- **Heavy Technical Thinking** — MCP protocol boundary, JSON-RPC over stdio behavior, process lifecycle, discovery contracts, failure handling
- **Fast Technical Builder** — Implementation of all 8 source files + scaffolding
- **Code Review / Warden Pass** — Final audit, scope compliance, security checks, dependency direction verification, report

## CRASH RECOVERY CHECK

Phase 4A artifacts verified present before implementation:

- `/opt/data/shared/Tripp.Reason/docs/PHASE_4_MCP_CONTRACT.md` ✅ — Present (25KB, 636 lines)
- `/opt/data/shared/Tripp.Reason/reports/phase-4a-mcp-contract-report.md` ✅ — Present (11.6KB, 245 lines)

## FILES CREATED

### Source Files (8)

| File | Purpose |
|------|---------|
| `packages/mcp/package.json` | Package config, workspace dependency on `@tripp-reason/shared`, `@types/node` dev dependency |
| `packages/mcp/tsconfig.json` | Extends tsconfig.base.json, references shared |
| `packages/mcp/src/index.ts` | Barrel exports — full public API surface |
| `packages/mcp/src/types.ts` | MCP-specific type definitions: McpServerConfig, McpToolInfo, JSON-RPC types, protocol shapes |
| `packages/mcp/src/errors.ts` | Controlled error hierarchy: McpError → StartupError, TimeoutError, ProtocolError, ServerDisabledError, ServerCrashError, RemoteError |
| `packages/mcp/src/jsonRpc.ts` | JSON-RPC 2.0: constructors, serialization (line-delimited JSON), parsing, type guards, standard error codes |
| `packages/mcp/src/processTransport.ts` | Stdio transport: spawn(shell=false), env allowlist, startup timeout, line-delimited message I/O, shutdown (SIGTERM → 5s grace → SIGKILL), stderr capture (capped at 64KB) |
| `packages/mcp/src/registry.ts` | McpServerRegistry: register, get, list, listEnabled, isEnabled, unregister |
| `packages/mcp/src/client.ts` | McpClient: connect → initialize → discoverTools → disconnect. Pending request map, response routing, exit tracking |
| `packages/mcp/src/mockServer.ts` | Standalone mock MCP server: reads JSON-RPC from stdin, responds to initialize/tools/list/shutdown, exits on stdin close |

### Smoke Test

| File | Purpose |
|------|---------|
| `packages/mcp/src/smokeTest.ts` | 8-test suite covering connect, discovery, namespacing, risk classification, shutdown, disabled servers, registry, startup failure |

## FILES MODIFIED

None outside `packages/mcp/`.

- `pnpm-lock.yaml` — Updated by `pnpm install` (new package + `@types/node`)
- `packages/mcp/node_modules/` — Auto-created by pnpm

## MCP COMPONENTS CREATED

### JSON-RPC 2.0 (`jsonRpc.ts`)
- `createRequest(method, params?, id?)` → `JsonRpcRequest`
- `createNotification(method, params?)` → `JsonRpcNotification`
- `createResponse(id, result)` → `JsonRpcResponse`
- `createErrorResponse(id, code, message, data?)` → `JsonRpcResponse`
- `serializeMessage(msg)` → line-delimited JSON string
- `parseMessage(line)` → `JsonRpcMessage | null`
- Type guards: `isRequest`, `isResponse`, `isNotification`
- Standard error codes: `JSON_RPC_ERRORS` (-32700..-32603)

### Process Transport (`processTransport.ts`)
- `spawnProcess(config, timeout)` — spawn with `shell: false`, env allowlist only
- Line-delimited JSON-RPC over stdin/stdout via `readline`
- Startup timeout (default 10s)
- Shutdown: SIGTERM → 5s grace → SIGKILL
- Stderr capture capped at 64KB
- Exit tracking via `ProcessTransport.exited` promise
- Returns controlled `McpStartupError` for disabled servers or timeout

### McpClient (`client.ts`)
- `connect(config)` — spawn process → send initialize → send initialized notification
- `discoverTools()` — send tools/list → return `McpToolInfo[]` with namespaced names
- `disconnect()` — shutdown → exit notification → process kill
- Pending request map routes responses by JSON-RPC id
- Background read loop processes stdout lines
- Process exit monitoring rejects pending requests with `McpServerCrashError`

### McpServerRegistry (`registry.ts`)
- In-memory `Map<string, McpServerConfig>`
- `register`, `get`, `list`, `listEnabled`, `isEnabled`, `unregister`
- Duplicate registration detection

### Mock MCP Server (`mockServer.ts`)
- Standalone script: `node packages/mcp/dist/mockServer.js`
- Reads line-delimited JSON-RPC from stdin
- Responds to: `initialize` (server info), `tools/list` (mock tools), `shutdown` (graceful exit)
- Returns `METHOD_NOT_FOUND` for unknown methods
- Returns `PARSE_ERROR` for malformed JSON
- Exits cleanly on stdin close or shutdown
- Exposes 2 mock tools (see Discovery below)

## DISCOVERY RESULT

Mock server discovered **2 tools**:

| namespacedName | toolName | riskLevel | requiresApproval |
|---------------|----------|-----------|-----------------|
| `mcp.mock-echo.mock_echo` | mock_echo | safe | false |
| `mcp.mock-echo.mock_mutate` | mock_mutate | destructive | true |

**Risk classification logic:**
- `mock_echo` → description contains "safe", "non-mutating", "echo" → classified as `safe`, `requiresApproval=false`
- `mock_mutate` → description contains "destructive" → classified as `destructive`, `requiresApproval=true`
- Unknown/unclassified tools default to `mutating`, `requiresApproval=true` (safety-first)

## VALIDATION RESULT

| Check | Result |
|-------|--------|
| `pnpm typecheck` (8 packages) | ✅ 0 errors |
| `pnpm build` (8 packages) | ✅ 0 errors |
| `mcp` package compiles | ✅ |
| Dependency direction (mcp ← shared only) | ✅ |

## SMOKE TEST RESULT

**17/17 assertions PASS** across 8 test suites:

| # | Test | Assertions | Result |
|---|------|-----------|--------|
| 1 | Mock server starts over stdio | 1 | ✅ PASS |
| 2 | Tool discovery (≥2 tools) | 1 | ✅ PASS |
| 3 | Namespaced names (mcp.mock-echo.*) | 4 | ✅ PASS |
| 4 | Risk classification (safe/destructive) | 4 | ✅ PASS |
| 5 | Client shutdown cleans process | 1 | ✅ PASS |
| 6 | Disabled server blocks connection | 2 | ✅ PASS |
| 7 | Registry enabled/disabled checks | 4 | ✅ PASS |
| 8 | Startup failure returns controlled error | 2 | ✅ PASS |

**Detailed results:**
- 1.1: Client connected successfully ✅
- 2.1: 2 tools discovered ✅
- 3.1–3.4: Namespacing correct (mcp.mock-echo.mock_echo, mcp.mock-echo.mock_mutate) ✅
- 4.1–4.2: mock_echo → riskLevel=safe, requiresApproval=false ✅
- 4.3–4.4: mock_mutate → riskLevel=destructive, requiresApproval=true ✅
- 5.1: Client disconnected cleanly ✅
- 6.1–6.2: Disabled server throws McpStartupError ✅
- 7.1–7.4: isEnabled, listEnabled, list, size all correct ✅
- 8.1–8.2: Nonexistent script throws controlled error ✅

## SECURITY CHECKS

| Check | Status |
|-------|--------|
| No `shell: true` — all spawns use `shell: false` | ✅ |
| Explicit mock command only (`node` with explicit args) | ✅ |
| No full env passthrough — only declared `env` keys | ✅ |
| No secrets printed anywhere | ✅ |
| Startup timeout enforced (default 10s) | ✅ |
| Response timeout per pending request (default 30s) | ✅ |
| Stderr captured with 64KB cap | ✅ |
| Disabled registry entry blocks `spawnProcess` | ✅ |
| No `core/tools/server/cli` import `mcp` | ✅ verified via typecheck |

## SCOPE COMPLIANCE

| Check | Status |
|-------|--------|
| No ToolDispatcher integration | ✅ — McpClient returns McpToolInfo metadata only |
| No MCP tool execution through ReasonLoop | ✅ — callTool stub exists but unwired |
| No server/CLI MCP registration | ✅ — CLI and server packages unchanged |
| No packages/swarm created | ✅ |
| No UI/dashboard files created | ✅ |
| No new provider packages | ✅ |
| No approval queue integration for MCP | ✅ |
| No real external MCP server loading | ✅ — mock server only |
| core does not import mcp | ✅ — verified by typecheck |
| tools does not import mcp | ✅ — verified by typecheck |
| No new dependencies beyond `@types/node` | ✅ |
| No Goose code | ✅ — clean room maintained |

## DESIGN DECISIONS

### Line-Delimited JSON-RPC
Each JSON-RPC message is a single line of JSON terminated by `\n`. Chosen for simplicity — no Content-Length headers, no framing protocol. The `readline` Node built-in handles line splitting. Messages are parsed with `JSON.parse` and validated for `jsonrpc: "2.0"`.

### Stdio Transport Only
Phase 4B uses `node:child_process` spawn with piped stdin/stdout/stderr. No HTTP/SSE transport. This matches the Phase 4A contract decision: "No MCP SSE/HTTP transport initially — stdio child process only."

### Mock Server Shape
The mock server is a standalone Node script that reads from stdin and writes to stdout. It handles `initialize`, `tools/list`, and `shutdown` JSON-RPC methods. Exposes 2 tools with contrasting risk profiles for testing classification logic.

### Tool Namespace
MCP tools are namespaced as `mcp.<serverId>.<toolName>`. This prevents collision with local tool names (`read_file`, `write_file`, etc.) and is enforced at discovery time, not at execution time.

### Risk / Default Approval Metadata
Risk classification uses description heuristics: "destructive" → destructive, "safe"/"read-only"/"echo" → safe, others → mutating (default). `requiresApproval` defaults to `true` for all non-safe tools. This is metadata only in Phase 4B — no Tool integration yet.

### Why No Dispatcher Integration
Phase 4B is scoped to package skeleton + discovery only. `McpClient.discoverTools()` returns `McpToolInfo[]` which is metadata (names, descriptions, schemas, risk). Phase 4C will create `McpToolAdapter` implementing `Tool` from shared and register with `ToolDispatcher`. Keeping these phases separate ensures the basic protocol works before wiring it into the execution path.

## BLOCKERS

None.

## NEXT STEP

**Phase 4C — MCP Tool Adapter + Schema Conversion**

Phase 4C will:
- Create `McpToolAdapter` implementing `Tool` from shared
- Implement JSON Schema → Zod conversion
- Register MCP tools into `ToolDispatcher`
- Verify mock MCP tool `mcp.mock-echo.mock_echo` appears in `GET /tools`

Phase 4B is complete. All 17 smoke tests pass. Zero core changes. Ready for Phase 4C.

---

*Report generated 2026-06-03. Phase 4B MCP Skeleton + Mock Client Report — PASS.*
