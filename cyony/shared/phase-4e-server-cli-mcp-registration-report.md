# Phase 4E Server/CLI MCP Registration Report

## PHASE

Phase 4E — Server/CLI MCP Registration

## STATUS

**PASS** ✅

## MODEL TIERS USED

- **Heavy Technical Thinking** — MCP runtime assembly design, server/CLI lifecycle integration, config loading safety, shutdown behavior, approval boundary preservation
- **Fast Technical Builder** — Implementation of config loader, runtime assembly, server/CLI wiring
- **Code Review / Warden Pass** — jCodeMunch audit (0 cycles, dependency direction verified), scope compliance, security review, report

## FILES CREATED

| File | Purpose |
|------|---------|
| `packages/mcp/src/config.ts` | MCP config loader — reads .tripp/mcp.config.json, supports env override, validates schema |
| `packages/mcp/src/runtime.ts` | MCP runtime assembly — starts servers, discovers tools, creates adapters, returns tools+status+shutdown |
| `.tripp/mcp.config.json` | Example mock config for testing |
| `tmp/phase4e-smoke.mjs` | 21-assertion server integration smoke test |

## FILES MODIFIED

| File | Change |
|------|--------|
| `packages/mcp/src/index.ts` | Added barrel exports for config + runtime modules |
| `packages/server/package.json` | Added `@tripp-reason/mcp` dependency |
| `packages/server/tsconfig.json` | Added mcp project reference |
| `packages/server/src/runtime.ts` | Now async; loads MCP runtime, appends tools to dispatcher, exposes `mcp` on ServerRuntime |
| `packages/server/src/routes/status.ts` | Accepts McpRuntime; exposes mcp.enabled, configPath, server/connected/tool counts, per-server statuses |
| `packages/server/src/server.ts` | Registers onClose hook for graceful MCP shutdown; startup logs MCP summary |
| `packages/cli/package.json` | Added `@tripp-reason/mcp` dependency |
| `packages/cli/tsconfig.json` | Added mcp project reference |
| `packages/cli/src/runCommand.ts` | Loads MCP runtime, appends tools to dispatcher, prints MCP summary |

## MCP CONFIG / RUNTIME

### Config Loading (`config.ts`)
- Default path: `.tripp/mcp.config.json`
- Env override: `TRIPP_MCP_CONFIG`
- CLI flag: `--mcp-config <path>` (passed through)
- No config file → returns `null` (MCP disabled, no error)
- Invalid JSON → throws controlled error
- Validates shape: `{ servers: [{ id, displayName, command, args?, ... }] }`
- Safety: explicit commands only, args array, env allowlist, cwd resolved to workdir

### Runtime Assembly (`runtime.ts`)
`assembleMcpRuntime(workdir, explicitConfigPath?)` → `McpRuntime`:
- Loads config, starts enabled servers, discovers tools
- Creates `McpToolAdapter` instances for discovered tools
- **Partial failure:** if one server fails, records error in status, continues loading others
- Returns `{ tools, clients, status, shutdown() }`

### Status (`McpRuntimeStatus`)
```typescript
{
  enabled: boolean,
  configPath: string,
  serverCount: number,
  connectedCount: number,
  totalToolCount: number,
  servers: [{ id, displayName, enabled, connected, toolCount, toolNames[], error? }]
}
```

## SERVER INTEGRATION

### Runtime Assembly
`assembleRuntime()` is now async. After creating local tools, it calls `assembleMcpRuntime()` and appends MCP tools to the dispatcher. MCP failure is non-fatal — server runs without MCP tools if assembly fails.

### /status
Returns `mcp` block with full runtime status. No secrets/env values exposed. Example output:
```json
{
  "mcp": {
    "enabled": true,
    "configPath": ".tripp/mcp.config.json",
    "serverCount": 1,
    "connectedCount": 1,
    "totalToolCount": 2,
    "servers": [{
      "id": "mock-echo",
      "displayName": "Mock Echo",
      "enabled": true,
      "connected": true,
      "toolCount": 2,
      "toolNames": ["mcp.mock-echo.mock_echo", "mcp.mock-echo.mock_mutate"]
    }]
  }
}
```

### /tools
Shows MCP tools alongside local tools with full namespaced names and approval metadata. Example: `mcp.mock-echo.mock_echo` with `requiresApproval: false`.

### /reply
No changes needed. ReasonLoop dispatches tools by name string through ToolDispatcher — MCP tools work identically to local tools.

### Shutdown
Server `onClose` hook calls `mcp.shutdown()` which disconnects all MCP clients gracefully.

## CLI INTEGRATION

### tripp run
After creating local tools, `executeRun()` calls `assembleMcpRuntime()` and registers MCP tools into the dispatcher. Prints summary if MCP tools loaded: `🔌 MCP: 1/1 servers, 2 tools loaded`.

### tripp serve
No direct changes needed — delegates to server which loads its own MCP config.

### tripp chat
No changes needed — connects to server over HTTP/SSE which already has MCP tools.

## ACTIVE TOOL SURFACE

**Local tools (9):**
| Tool | requiresApproval |
|------|-----------------|
| list_dir | false |
| read_file | false |
| search | false |
| git_status | false |
| git_diff | false |
| write_file | true |
| edit_file | true |
| shell | true |
| run_tests | true |

**MCP tools (2, with mock config):**
| Tool | requiresApproval |
|------|-----------------|
| mcp.mock-echo.mock_echo | false |
| mcp.mock-echo.mock_mutate | true |

**Total: 11 tools** (9 local + 2 MCP)

## VALIDATION RESULT

| Check | Result |
|-------|--------|
| `pnpm typecheck` (8 packages) | ✅ 0 errors |
| `pnpm build` (8 packages) | ✅ 0 errors |
| jCodeMunch dependency cycles | ✅ 0 cycles |
| jCodeMunch import audit | ✅ mcp only imported by server+CLI+mcp |

## SMOKE TEST RESULT

**21/21 assertions PASS** across 9 test suites:

| # | Test | Assertions | Result |
|---|------|-----------|--------|
| 1 | No MCP config: server starts, MCP disabled | 4 | ✅ |
| 2 | Mock config: MCP enabled, connected, tools | 3 | ✅ |
| 3 | /tools includes namespaced MCP tools | 3 | ✅ |
| 4 | mock_echo requiresApproval=false | 1 | ✅ |
| 5 | mock_mutate requiresApproval=true | 1 | ✅ |
| 6 | Dispatch MCP tool through server | 2 | ✅ |
| 7 | Approval behavior (safe/mutating) | 2 | ✅ |
| 8 | Server shutdown closes MCP | 1 | ✅ |
| 9 | Scope (core/tools isolation) | 3 | ✅ |

## SECURITY CHECKS

| Check | Status |
|-------|--------|
| No full env passthrough (env allowlist only) | ✅ |
| No shell:true (explicit commands, args array) | ✅ |
| Disabled servers blocked (enabled: false = not started) | ✅ |
| Bad server controlled error (partial failure, status.error) | ✅ |
| No secrets exposed in /status | ✅ |
| MCP mutating tools require approval | ✅ |
| Denial/timeout blocks MCP call (existing ApprovalGate) | ✅ |
| Core does not import mcp | ✅ — verified by jCodeMunch + typecheck |
| Tools does not import mcp | ✅ — verified by jCodeMunch + typecheck |

## SCOPE COMPLIANCE

| Check | Status |
|-------|--------|
| No packages/swarm | ✅ |
| No UI/dashboard | ✅ |
| No new providers | ✅ |
| No MCP marketplace | ✅ |
| No external MCP discovery | ✅ |
| No remote/multi-user MCP | ✅ |
| No OpenClaw/Hermes adapters | ✅ |
| No ReasonLoop MCP-specific code | ✅ |

## J-MUNCH AUDIT

jCodeMunch indexed the full repo (104 files, 1426 symbols) and confirmed:

- **Dependency cycles: 0** — no circular imports
- **`@tripp-reason/mcp` importers:** only `packages/server/` (runtime.ts, status.ts, package.json) and `packages/cli/` (runCommand.ts, package.json) plus `packages/mcp/` itself
- **Core, tools, providers, store, shared: 0 references to mcp** ✅
- **Repo health grade: B** (86.5 composite) — acceptable for active development
- **Top hotspots:** reasonLoop.ts (complexity 71), writeFile.ts (29) — expected for core orchestration and mutation safety code
- **Dead code: 2.1%** — all config/barrel files, no dead source modules

## DESIGN DECISIONS

### Config Path
Default `.tripp/mcp.config.json` in workdir, overridable via `TRIPP_MCP_CONFIG` env or `--mcp-config` flag. Simple, explicit, no discovery magic.

### No-Config Behavior
MCP is entirely optional. No config → no MCP tools → no error → existing behavior unchanged. Status shows `mcp.enabled: false`.

### Partial Server Failure
If one MCP server fails to start, its status reflects the error but other enabled servers continue loading. The overall runtime is not crashed. This prevents a single bad MCP config from breaking the entire server.

### Shutdown
Server `onClose` Fastify hook calls `mcp.shutdown()` which disconnects all MCP clients via `Promise.allSettled`. CLI tools currently loaded by server (via `tripp serve`) get shutdown through the server close. Standalone `tripp run` MCP connections close when the Node process exits.

### Status Exposure
`/status` includes full MCP runtime status with per-server details. Tool names are listed (for debugging) but no env values, secrets, or raw process info is exposed.

### CLI Summary
`tripp run` prints a one-line MCP summary only when tools are loaded: `🔌 MCP: N/M servers, K tools loaded`. Silent when MCP is disabled or has no tools.

## BLOCKERS

None.

## NEXT STEP

**Phase 4F — MCP Final Audit + Full Smoke Test**

Phase 4F will:
- Run comprehensive end-to-end smoke test (config → server → tools → approval → report → shutdown)
- jCodeMunch final architecture audit
- Clean up tmp/ artifacts
- Verify all Phase 4 contract requirements
- Close Phase 4

Phase 4E is complete. All 21 smoke tests pass. jCodeMunch confirms 0 cycles, clean dependency direction. Ready for Phase 4F.

---

*Report generated 2026-06-03. Phase 4E Server/CLI MCP Registration Report — PASS. Audited with jCodeMunch.*
