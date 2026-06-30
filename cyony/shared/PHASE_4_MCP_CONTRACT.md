# Phase 4 MCP Bridge Contract

> Locked before any MCP code exists. Defines what the MCP bridge layer MUST and MUST NOT do, how MCP tools integrate with the existing tool/approval/report system, and the implementation sequence.

## Purpose

Phase 4 adds external tool compatibility through the Model Context Protocol (MCP) while preserving Tripp.Reason's existing tool interface, ApprovalGate, report generation, and audit boundaries. MCP servers are loaded as tool adapters — the ReasonLoop sees them as ordinary tools, not a separate execution path.

The MCP bridge is an **adapter layer**, not a new runtime. Same architectural role as the `providers` package: it wraps an external protocol (JSON-RPC over stdio) into the shared `Tool` interface that core already consumes.

```
Phase 4 (target):
  MCP server (external process)
      ↕ JSON-RPC over stdio
  packages/mcp/ (adapter)
      ↓ implements shared Tool
  ToolDispatcher.register(mcpTool)
      ↓ same dispatch path
  ReasonLoop → ApprovalGate → execute → report
```

## Non-Goals

- ❌ No MCP tool bypass of ApprovalGate — all mutating/destructive MCP tools go through approval
- ❌ No MCP mutation without approval — `requiresApproval: true` for unknown-risk tools
- ❌ No MCP becoming a core dependency — `core` must not import `mcp`
- ❌ No MCP server marketplace or discovery — explicit user-configured servers only
- ❌ No remote/multi-user MCP exposure — MCP servers run locally via child process
- ❌ No swarm integration — swarm orchestration is Phase 5
- ❌ No UI/dashboard for MCP — dashboard is Phase 6
- ❌ No provider architecture changes — MCP tools are tools, not providers
- ❌ No replacement of local tools — local tools remain first-class
- ❌ No MCP as a required component — feature flag optional, system works without it
- ❌ No new dependencies added casually — only if absolutely required for JSON-RPC or MCP protocol
- ❌ No MCP SSE/HTTP transport initially — stdio child process only

## MCP Boundary

### What the MCP package IS

The `packages/mcp/` package is an **adapter layer**, identical in architectural role to `packages/providers/`:

- Imports from `shared` (contracts, schemas)
- Implements `Tool` from shared for each discovered MCP tool
- Manages MCP server processes (spawn, lifecycle, cleanup)
- Converts MCP tool schemas (JSON Schema) to Zod for input validation
- Does NOT define new contracts — reuses existing `Tool`, `ApprovalRequest`, `ToolResult`

### What the MCP package MUST NOT do

- Must not make `core` import `mcp` — dependency arrow is one-way
- Must not bypass `ApprovalGate` — all tools route through the same gate
- Must not define its own `Tool` interface — must implement `Tool` from `shared`
- Must not put provider/routing logic in MCP — tool dispatch is ReasonLoop's job
- Must not create a parallel execution path — MCP tools go through `ToolDispatcher.dispatch()`
- Must not leak MCP server process internals into reports — controlled output only
- Must not expose raw MCP server output without caps/redaction

### Dependency Direction

```
Phase 4:
  mcp ← shared               (contracts + schemas only)
  cli/server → mcp            (assembly: register MCP tools)
  core → shared               (unchanged)
  core ↛ mcp                  (never)
  tools ↛ mcp                 (never)
```

`mcp` imports `shared` only. `cli`/`server` may register MCP tools into the dispatcher, same as they register local tools.

### Assembly Flow

```
cli runCommand.ts:
  const mcpRegistry = loadMcpRegistry(config);
  for (const mcpTool of mcpRegistry.getTools()) {
    dispatcher.register(mcpTool);       // same API as local tools
  }
  // ... rest of ReasonLoop setup unchanged

server routes:
  const { getTools, startAll } = createMcpBridge(config);
  await startAll();
  for (const tool of getTools()) {
    dispatcher.register(tool);
  }
  // ... routes unchanged
```

## Package Boundary

### `packages/mcp/` Module Structure

```
packages/mcp/
  src/
    index.ts           — barrel exports (createMcpBridge, etc.)
    config.ts           — MCP config types + loader (.tripp/mcp.config.json)
    registry.ts         — McpServerRegistry (manages server definitions)
    client.ts           — McpClient (JSON-RPC over child_process stdio)
    schemaConversion.ts — JSON Schema → Zod conversion
    mcpToolAdapter.ts   — McpTool implements shared Tool
    errors.ts           — Controlled MCP error types
    mock/               — Mock MCP server for testing (Phase 4B)
      mockServer.ts
```

### Dependency Rule

- `mcp` imports `shared` only (Tool, ToolContext, ToolResult, ApprovalRequest, etc.)
- `mcp` may import `node:child_process`, `node:path` (Node.js built-ins)
- `mcp` must NOT import `core`, `store`, `providers`, `tools`, `server`, `cli`
- `cli`/`server` may import `mcp` as an assembly step (registering tools)
- `core` must NOT import `mcp` (and doesn't need to — it only sees `Tool` interface)

## MCP Server Registry

### Registry Entry Schema

Each registered MCP server is defined by a config entry:

```typescript
interface McpServerConfig {
  /** Unique identifier for this server (used in namespace: mcp.<id>.<tool>) */
  id: string;

  /** Human-readable name for reports and approvals */
  displayName: string;

  /** Executable command (must be explicit — no shell evaluation) */
  command: string;

  /** Arguments passed to the command */
  args?: string[];

  /** Environment variables exposed to the server process */
  env?: Record<string, string>;

  /** Working directory for the server process */
  cwd?: string;

  /** Whether this server is enabled */
  enabled?: boolean;

  /** Risk classification for tools from this server */
  riskProfile?: McpRiskProfile;

  /** Startup timeout in milliseconds (default: 10000) */
  startupTimeoutMs?: number;

  /** Per-tool execution timeout in milliseconds (default: 30000) */
  toolTimeoutMs?: number;

  /** Specific tools to allow (if empty, all tools are imported) */
  allowedTools?: string[];

  /** Specific tools to deny */
  deniedTools?: string[];

  /** Maximum output size in bytes (default: 128KB) */
  maxOutputBytes?: number;
}

interface McpRiskProfile {
  /** Default risk for unclassified tools */
  defaultRisk: "safe" | "mutating" | "destructive";

  /** Per-tool risk overrides */
  toolRiskOverrides?: Record<string, "safe" | "mutating" | "destructive">;
}
```

### Registry Rules

- **No arbitrary env passthrough** — `process.env` is never inherited wholesale. Only explicitly declared `env` keys are passed.
- **No secrets exposed in reports** — env values are redacted from tool-call summaries. Only env KEY names appear.
- **Command must be explicit** — no `$SHELL`, no `bash -c`, no templated commands. Must be resolved at config time.
- **cwd must be workdir-bound** or explicitly configured. If empty, defaults to Tripp.Reason workdir.
- **Disabled by default** — `enabled` defaults to `false`. Server is inactive until user enables it.
- **Allowed/denied list** — `allowedTools` is a whitelist. `deniedTools` removes from whitelist. Empty allowedTools = all imported.
- **startupTimeoutMs** — if server doesn't respond to `initialize` within timeout, it's marked as failed.
- **toolTimeoutMs** — per-call timeout. Exceeding it returns a controlled error, not a crash.

## MCP Tool Import

### Tool Namespace Convention

MCP tools are imported with namespaced names to avoid collisions with local tools:

```
mcp.<serverId>.<toolName>
```

Examples:
- `mcp.filesystem.read_file` — filesystem server's read_file tool
- `mcp.github.search_repos` — GitHub server's search tool
- `mcp.memory.recall` — memory server's recall tool

Local tool names (`read_file`, `write_file`, etc.) are NEVER prefixed. Only MCP tools get the `mcp.` namespace.

### Tool Adapter Implementation

Each MCP tool becomes a `Tool` implementation:

```typescript
class McpToolAdapter implements Tool {
  readonly name: string;          // "mcp.filesystem.read_file"
  readonly description: string;   // From MCP tool definition (capped at 500 chars)
  readonly inputSchema: ZodType<unknown>; // Converted from MCP JSON Schema
  readonly requiresApproval: boolean;    // Based on risk classification

  async execute(input: unknown, context: ToolContext): Promise<ToolResult> {
    // 1. Input already validated by ToolDispatcher.dispatch()
    // 2. Send JSON-RPC tools/call to MCP server process
    // 3. Await response within toolTimeoutMs
    // 4. Cap output to maxOutputBytes
    // 5. Return controlled ToolResult
  }
}
```

### Schema Conversion

MCP tools expose JSON Schema for their inputs. The adapter converts these to Zod schemas for validation:

- `type: "string"` → `z.string()`
- `type: "number"` → `z.number()`
- `type: "boolean"` → `z.boolean()`
- `type: "object"` with `properties` → `z.object({...})`
- `type: "array"` → `z.array(...)`
- `enum` → `z.enum([...])`
- `required` → non-optional fields
- `description` → `.describe(...)` on Zod types

**Fallback:** If schema conversion fails or the schema is too complex, fall back to `z.record(z.unknown())` — passthrough validation with a warning logged.

### Description Sanitization

- MCP tool description is capped at 500 characters
- Control characters stripped
- Markdown/HTML formatting may be preserved but must be safe for report rendering

### Risk Classification

| MCP Annotations | Tripp Risk Level | Requires Approval |
|----------------|-----------------|-------------------|
| `destructive: true` | `destructive` | ✅ Always |
| `readOnlyHint: false` or absent | `mutating` (default) | ✅ Always |
| `readOnlyHint: true` | `safe` | ❌ No (unless overridden) |
| Unknown/unclassified | `mutating` | ✅ Always |

**Rule:** The default is `requiresApproval: true`. Safety first. Only tools explicitly marked as safe/read-only skip approval. Server-level `riskProfile` can override per-server defaults.

## Approval Integration

### MCP Through Existing ApprovalGate

MCP tool calls flow through the **exact same ApprovalGate** as local tools. Zero changes to the gate, dispatcher, or reason loop:

```
ReasonLoop
  → receives tool_request from provider
  → reasonLoop routes tool call:
      1. ApprovalGate.check({ toolName, args, riskLevel })
         → If "safe": auto-approved
         → If "mutating"/"destructive": goes to Approver
      2. If denied → ApprovalDeniedError → ReasonLoop reports denial to provider
      3. If approved → ToolDispatcher.dispatch(toolName, args, context)
         → ToolDispatcher looks up tool by name (local or MCP — same map)
         → Executes tool
      4. RunManager.recordToolCall(...) persists result
  → Provider receives tool_result
```

### Key Properties

- **No direct execution** — provider NEVER calls MCP directly. Always through ToolDispatcher.
- **ApiApprover unchanged** — HTTP approval queue handles MCP tools identically to local tools.
- **CliApprover unchanged** — terminal prompts show `mcp.<server>.<tool>` with args summary.
- **Pending approval display** — shows MCP server name, tool name, and args summary. No MCP internals exposed.
- **Denial/timeout prevents call** — same as local tools. Fail-closed.
- **MCP tool result persisted** — as normal `ToolCall` record with `tool_name: "mcp.filesystem.read_file"`.

### Approval Context

When an MCP tool requires approval, the operator sees:

```
🛡️  Approval required: mcp.filesystem.write_file
    Server: Local Filesystem MCP
    Args: path="/tmp/test.txt", content="Hello" (47 bytes)
    Risk: destructive
    Approve? [y/N]
```

## Execution Model

### MCP Client Process Management

- **One child process per MCP server** (not per tool)
- **Startup:** Spawn `command` with `args`, pipe stdin/stdout/stderr
- **Initialize:** Send JSON-RPC `initialize` request, wait for response
- **Heartbeat:** Optional periodic ping to detect dead servers
- **Tool List:** Send `tools/list` to discover available tools, build adapters
- **Tool Call:** Send `tools/call` with tool name and arguments
- **Lifecycle:** Process termination sends `shutdown` (if supported), then SIGTERM, then SIGKILL after grace period

### Timeout and Error Handling

| Event | Timeout | Behavior |
|-------|---------|----------|
| Server startup | `startupTimeoutMs` (default: 10s) | Server marked failed, tools unavailable |
| Tool call | `toolTimeoutMs` (default: 30s) | Return `ToolResult { status: "error", ... }` |
| Tool call output | `maxOutputBytes` (default: 128KB) | Truncate with warning in result |
| Server crash mid-call | N/A | Return `ToolResult { status: "error", error: "MCP server crashed" }` |
| Server crash between calls | N/A | Mark server dead, all tools from this server return errors |

### Controlled Error Responses

- No raw stack traces in `ToolResult.error`
- MCP protocol errors wrapped in controlled messages
- Server crash: `"MCP server '<id>' exited unexpectedly"`
- Timeout: `"Tool call 'mcp.<id>.<tool>' timed out after 30s"`
- Output cap: `"Output truncated at 128KB. Full output: 256KB"`

### Lifecycle Cleanup

- `McpBridge.stopAll()` → graceful shutdown of all servers
- Process exit handler: cleanup all child processes
- SIGTERM → shutdown → SIGKILL after 5s grace period
- Server restart: manual only (no auto-restart in Phase 4)

## Security Requirements

| Rule | Detail |
|------|--------|
| Local-only by default | No remote MCP servers (stdio child processes only) |
| Command allowlist | Only explicitly configured commands. No shell evaluation (`shell: false` in spawn) |
| Env allowlist only | No inherited `process.env`. Only explicitly declared keys passed |
| No arbitrary shell execution | `spawn(command, args, { shell: false })` |
| No network-exposed MCP bridge | MCP runs as local child process, no HTTP/S |
| Workdir boundary | MCP server cwd must be within Tripp.Reason workdir or explicitly configured |
| Timeout enforced | Per-call `toolTimeoutMs` prevents hung processes |
| Output capped | `maxOutputBytes` prevents memory exhaustion |
| Secret redaction | Env values never appear in reports/tool summaries |
| Approval required for unknown risk | `requiresApproval` defaults to `true` |
| Disabled servers cannot be invoked | Registry returns error for disabled server tools |
| No raw process env | `env` must be declared in config, not inherited |
| No path traversal | Tool inputs validated against workdir where applicable |

## Config Shape

### Config File Location

```
.tripp/mcp.config.json
```

At project root (alongside `.tripp/reason.sqlite`).

### Config Schema

```json
{
  "version": 1,
  "servers": [
    {
      "id": "filesystem",
      "displayName": "Local Filesystem MCP",
      "command": "npx",
      "args": ["-y", "@modelcontextprotocol/server-filesystem", "/tmp/mcp-smoke"],
      "enabled": false,
      "riskProfile": {
        "defaultRisk": "mutating",
        "toolRiskOverrides": {
          "read_file": "safe",
          "list_directory": "safe"
        }
      },
      "startupTimeoutMs": 10000,
      "toolTimeoutMs": 30000,
      "maxOutputBytes": 131072,
      "cwd": "/opt/data/shared/Tripp.Reason"
    }
  ]
}
```

**Mock server entry (for testing):**

```json
{
  "id": "mock-echo",
  "displayName": "Mock Echo MCP",
  "command": "node",
  "args": ["packages/mcp/dist/mock/mockServer.js"],
  "enabled": true,
  "riskProfile": {
    "defaultRisk": "safe",
    "toolRiskOverrides": {
      "mock_write": "destructive"
    }
  }
}
```

### Config Rules

- `version: 1` — schema version for future migration
- `enabled` defaults to `false` if not present
- Missing `riskProfile` → `defaultRisk: "mutating"` (approval required)
- Missing `allowedTools` → all tools imported
- Config is NOT hot-reloaded. Server restart required to pick up changes.
- Config is read at assembly time (CLI startup or server startup), not at runtime.

## Phase 4 Implementation Sequence

### Phase 4A — MCP Contract Lock (THIS PHASE) ✅

- Create `docs/PHASE_4_MCP_CONTRACT.md`
- Create `reports/phase-4a-mcp-contract-report.md`
- No code written
- Contract reviewed

### Phase 4B — MCP Package Skeleton + Mock MCP Server

**Allowed:**
- `packages/mcp/` package scaffolding (package.json, tsconfig.json, barrel export)
- Mock MCP server that implements MCP JSON-RPC protocol over stdio
- Mock server registers 2 tools: `mock_echo` (safe) and `mock_write` (destructive)
- MCP client that can connect to mock server, send `initialize`, `tools/list`, `tools/call`
- Types for MCP protocol messages (JSON-RPC request/response/notification)

**Forbidden:**
- Real MCP server loading
- Tool adapter integration with dispatcher
- Config file loading
- ApprovalGate integration with MCP tools

**Success Condition:**
- Mock MCP server starts, accepts JSON-RPC over stdio
- Client connects, discovers tools, calls mock_echo, receives response
- Mock MCP protocol tested without real MCP SDK dependency

### Phase 4C — MCP Tool Adapter + Schema Import

**Allowed:**
- `McpToolAdapter` implementing `Tool` from shared
- JSON Schema → Zod conversion
- Tool namespace (`mcp.<serverId>.<toolName>`)
- Risk classification from server config
- Registration into ToolDispatcher

**Forbidden:**
- Real MCP server loading
- ApprovalGate integration testing beyond mock

**Success Condition:**
- Mock MCP tool `mcp.mock-echo.mock_echo` appears in `GET /tools`
- `ToolDispatcher.dispatch("mcp.mock-echo.mock_echo", input, context)` works
- Schema conversion handles basic types (string, number, object, array, enum)
- Description capped at 500 chars

### Phase 4D — MCP Execution Through ApprovalGate

**Allowed:**
- MCP tools with `requiresApproval: true` go through ApprovalGate
- Mock destructive tool (`mock_write`) requires approval
- CLI approval prompt shows MCP server/tool name
- ApiApprover handles MCP approval through HTTP queue
- Denied MCP approval returns controlled error
- Timeout returns controlled error

**Forbidden:**
- Real MCP server loading
- Config file loading (still hardcoded mock config)

**Success Condition:**
- `tripp run "use mcp.mock-echo.mock_write to write hello"` → approval prompt with MCP namespace
- Operator approves → tool executes successfully
- Operator denies → controlled error, no execution
- Timeout → controlled error after timeoutMs

### Phase 4E — Server/CLI MCP Registration

**Allowed:**
- Config file loader (`loadMcpConfig()`)
- Server startup: load config, register MCP tools into dispatcher
- CLI: register MCP tools at assembly time
- `GET /tools` includes MCP tools alongside local tools
- `GET /status` shows MCP server status
- `GET /approvals` shows MCP approvals
- Reports include MCP tool calls (namespaced names)
- Graceful shutdown of MCP server processes

**Forbidden:**
- Hot-reload of MCP config
- Multi-server concurrency initially (one at a time)

**Success Condition:**
- `tripp serve` with MCP config loads mock server
- `GET /tools` shows `mcp.mock-echo.mock_echo` and `mcp.mock-echo.mock_write`
- `tripp chat --once "echo hello"` works through MCP tool
- `tripp chat --approve --once "write to file"` goes through approval
- Report shows MCP tool call with namespaced name

### Phase 4F — MCP Final Audit

- Build/typecheck: all packages pass
- Full mock MCP smoke test (echo, write, approve, deny, timeout, crash, disabled)
- Route audit: `/tools`, `/status`, `/approvals` include MCP tools
- Security audit: env redaction, workdir boundary, output caps, no shell
- Report: `reports/phase-4f-mcp-final-audit-report.md`

## Route / CLI Integration

### How Existing Surfaces Expose MCP

| Surface | MCP Exposure |
|---------|-------------|
| `GET /tools` | MCP tools listed alongside local tools with `mcp.` prefix |
| `POST /reply` | MCP tools callable through ReasonLoop (transparent to provider) |
| `GET /approvals` | MCP approvals show server + tool name in response |
| `POST /approvals/:id/resolve` | Same flow — MCP tools resolved identically |
| `GET /status` | New field: `mcpServers: [{ id, displayName, status, toolCount }]` |
| `GET /sessions/:id/events` | Tool calls show `mcp.<server>.<tool>` names |
| `tripp run` | MCP tools available when config loaded |
| `tripp chat` | MCP tools available in interactive + `--once` mode |
| Reports | `ToolCallSummary.tool` shows namespaced name |

### Tool Listing Example

```
GET /tools → {
  "tools": [
    { "name": "read_file", "description": "...", "requiresApproval": false },
    { "name": "write_file", "description": "...", "requiresApproval": true },
    { "name": "mcp.mock-echo.mock_echo", "description": "Echoes input back", "requiresApproval": false },
    { "name": "mcp.mock-echo.mock_write", "description": "Writes to mock storage", "requiresApproval": true }
  ]
}
```

## Testing Requirements

### Mock MCP Server (Required)

A mock MCP server is required for Phase 4 testing. It must:

- Implement MCP JSON-RPC protocol over stdio
- Respond to `initialize`, `tools/list`, `tools/call`
- Register at least 2 tools: one safe (`mock_echo`), one destructive (`mock_write`)
- No external MCP SDK dependency — pure Node.js implementation
- Deterministic behavior for smoke testing

### Required Test Scenarios

| Scenario | Expected Outcome |
|----------|-----------------|
| Schema import (mock_echo) | Tool appears in dispatcher list |
| Read-only MCP tool call | Executes without approval |
| Mutating MCP tool call | Triggers ApprovalGate |
| Approve MCP tool | Tool executes, result recorded |
| Deny MCP tool | ApprovalDeniedError, no execution |
| Timeout MCP call | Controlled error after timeoutMs |
| MCP server crash | Controlled error, other tools unaffected |
| Disabled server | Tools from disabled server return errors |
| Env redaction | Env values absent from reports |
| Report includes MCP call | Tool name is namespaced in report |

### No Live External MCP Dependency

- All Phase 4 testing uses the mock MCP server
- No real MCP SDK, no network calls, no external processes
- PASS condition does not require a real MCP server

## Architecture Audit Summary

### Current Architecture Compatibility

| Component | MCP Compatible? | Notes |
|-----------|----------------|-------|
| `Tool` interface | ✅ Yes | Name, description, inputSchema, requiresApproval, execute — all apply |
| `ToolDispatcher` | ✅ Yes | `register()` accepts any Tool. `dispatch()` looks up by string name |
| `ApprovalGate` | ✅ Yes | Routes by `riskLevel`. MCP tools set riskLevel, gate is unchanged |
| `ApprovalRequest` | ✅ Yes | `toolName: string`, `args: unknown` — namespace prefix works |
| `ApprovalResult` | ✅ Yes | Discriminated union, no changes needed |
| `RunManager.recordToolCall` | ✅ Yes | Records `toolName: string`, `args: unknown`, `status` |
| `RunReport` | ✅ Yes | `ToolCallSummary.tool: string` — namespace prefix works |
| `ReasonLoop` | ✅ Yes | Tool dispatch is opaque — doesn't care if local or MCP |
| `ApiApprover` | ✅ Yes | Creates pending approval by `toolName` — namespace works |
| `CliApprover` | ✅ Yes | Terminal prompt shows tool name and args |
| `Repositories` | ✅ Yes | Tool call persistence is name-agnostic |
| Server routes | ✅ Yes | All routes use tool name as string key |

### Zero Core Changes Required

MCP tools can be integrated with **zero changes to `packages/core/`** and **zero changes to `packages/shared/`**. The existing interfaces are sufficient:

- `Tool` interface already supports arbitrary tool names (string)
- `ToolDispatcher.register()` accepts any Tool implementation
- `ApprovalGate.check()` routes by riskLevel (no tool-origin awareness)
- `RunManager` records tool calls by string name

### Potential Risks

| Risk | Mitigation |
|------|-----------|
| MCP server process leaks | Process lifecycle managed by McpClient. SIGTERM + SIGKILL cleanup |
| JSON Schema → Zod conversion mismatch | Fallback to `z.record(z.unknown())` with warning |
| MCP tool name collides with local tool | `mcp.` namespace prefix guarantees no collision |
| MCP server env leaks secrets | Env allowlist only. Redacted in reports |
| MCP stdout/stderr floods memory | Output capped at `maxOutputBytes`. Stderr discarded |
| MCP server blocks indefinitely | Per-call `toolTimeoutMs` with controlled error |
| MCP config hot-reload complexity | Deferred. Restart-only in Phase 4 |

## Tmp / Smoke Artifact Policy

### Current State

Phase 3E audit identified 8 files in `tmp/` — all smoke test scripts and outputs from Phases 2E-3E.

### Decision

- **Leave tmp/ as-is for Phase 4.** Smoke scripts are useful reference for Phase 4 testing patterns.
- **Do not move** smoke scripts into a `test-smoke/` area during Phase 4 — that's a repo hygiene concern.
- **Add `tmp/` to `.gitignore`** if not already present.
- **Archive during a later repo hygiene pass** (post-Phase 4, pre-Phase 5).
- **Do not delete useful smoke scripts casually.**

Phase 4 smoke tests should go in `tmp/phase4-*` following the existing convention.

---

*Contract lock. No MCP code until Phase 4B.*
