# Phase 4A MCP Contract Report

## PHASE

Phase 4A — MCP Bridge Contract Lock

## STATUS

**PASS** ✅

## MODEL TIERS USED

- **Heavy Technical Thinking** — MCP boundary design, tool-schema import analysis, approval integration verification, security model, runtime separation analysis, JSON Schema → Zod conversion design
- **Code Review / Warden Pass** — Scope control, doctrine compliance, dependency direction enforcement, report

## FILES CREATED

1. **`docs/PHASE_4_MCP_CONTRACT.md`** — Complete MCP bridge contract (25KB, 14 sections): purpose, non-goals, boundary, package structure, registry, tool import, approval, execution, security, config, implementation sequence, route/CLI integration, testing requirements, architecture audit
2. **`reports/phase-4a-mcp-contract-report.md`** — This document

## FILES MODIFIED

1. **`.gitignore`** — Added `tmp/` to ignored paths (as recommended by contract for smoke artifact hygiene)

## MCP CONTRACT SUMMARY

The Phase 4 MCP Bridge Contract defines how external Model Context Protocol (MCP) servers integrate with Tripp.Reason's existing tool, approval, and report infrastructure. Key architectural decisions:

### 1. MCP as an Adapter Layer

The `packages/mcp/` package is an **adapter layer**, identical in architectural role to `packages/providers/`. It imports from `shared` only, implements the `Tool` interface, and exposes MCP tools through the standard `ToolDispatcher.register()` API. Core never imports MCP.

### 2. Namespaced Tool Names

MCP tools use the `mcp.<serverId>.<toolName>` namespace to avoid collision with local tools. Local tool names (`read_file`, `write_file`) are never prefixed.

### 3. Zero Core Changes

The architecture audit confirmed that MCP tools can be integrated with **zero changes to `packages/core/`** and **zero changes to `packages/shared/`**. The existing interfaces (`Tool`, `ToolDispatcher`, `ApprovalGate`, `RunManager`) are fully sufficient.

### 4. ApprovalGate Integration

MCP tool calls route through the exact same ApprovalGate as local tools. No bypass. No separate approval path. MCP tools set `riskLevel` per the contract's risk classification table, and the gate handles the rest.

### 5. Security-First Defaults

- `requiresApproval` defaults to `true` for unknown-risk tools
- Env allowlist only (no inherited `process.env`)
- Commands must be explicit (no `shell: true`)
- Output capped at 128KB
- Per-call timeout (30s default)
- Server disabled by default until configured
- Local child process only (no remote MCP)

### 6. Config-Driven

MCP servers are defined in `.tripp/mcp.config.json`. One file, explicit entries, no discovery. Server restart required to pick up config changes (no hot-reload in Phase 4).

## MCP BOUNDARY DECISION

### Package Structure

```
packages/mcp/
  src/
    index.ts           — barrel exports
    config.ts           — config loader + types
    registry.ts         — McpServerRegistry
    client.ts           — McpClient (JSON-RPC over stdio)
    schemaConversion.ts — JSON Schema → Zod
    mcpToolAdapter.ts   — McpTool implements shared Tool
    errors.ts           — Controlled error types
    mock/
      mockServer.ts     — Mock MCP server for testing
```

### Dependency Direction

```
mcp ← shared               (contracts + schemas only)
cli/server → mcp            (assembly: register MCP tools)
core → shared               (unchanged)
core ↛ mcp                  (NEVER)
tools ↛ mcp                 (NEVER)
```

**Rationale:** MCP is an adapter — same architectural role as providers. Core doesn't know or care whether a tool is local or MCP. It sees `Tool` interface only, dispatched by name string through `ToolDispatcher`. This keeps core clean and testable without MCP.

## TOOL ADAPTER DECISION

### MCP Tool → Tripp Tool Mapping

Each MCP tool becomes a `McpToolAdapter` implementing `Tool`:

| `Tool` Field | MCP Source |
|-------------|-----------|
| `name` | `"mcp." + serverId + "." + toolName` |
| `description` | MCP tool description (capped at 500 chars) |
| `inputSchema` | Converted from MCP JSON Schema to Zod |
| `requiresApproval` | Risk classification (default: `true`) |
| `execute()` | Sends `tools/call` JSON-RPC, returns `ToolResult` |

### Schema Conversion Strategy

| JSON Schema Type | Zod Equivalent |
|-----------------|---------------|
| `type: "string"` | `z.string()` |
| `type: "number"` / `integer` | `z.number()` |
| `type: "boolean"` | `z.boolean()` |
| `type: "object"` with properties | `z.object({...})` |
| `type: "array"` | `z.array(...)` |
| `enum` | `z.enum([...])` |
| `required` field | Non-optional `.required()` |
| `description` field | `.describe(...)` |
| Fallback (complex/unparseable) | `z.record(z.unknown())` with warning |

### Risk Classification

| MCP Signal | Tripp Risk | Requires Approval |
|-----------|-----------|-------------------|
| `destructive: true` | `destructive` | ✅ Always |
| `readOnlyHint: false` or absent | `mutating` (default) | ✅ Always |
| `readOnlyHint: true` | `safe` | ❌ No |
| Unknown/unclassified | `mutating` | ✅ Always |

**Default-deny principle:** Safety first. Only tools explicitly annotated as safe skip approval.

## APPROVAL INTEGRATION DECISION

### Flow Diagram

```
Provider requests tool: "mcp.filesystem.write_file"
  ↓
ReasonLoop
  ↓
ApprovalGate.check({ toolName: "mcp.filesystem.write_file", riskLevel: "destructive", ... })
  ↓
  ├─ riskLevel "safe" → auto-approve (no approver call)
  └─ riskLevel "mutating"/"destructive" → approver.requestApproval({...})
       ↓
       ├─ Approved → ToolDispatcher.dispatch("mcp.filesystem.write_file", args, ctx)
       │    → McpToolAdapter.execute() → JSON-RPC tools/call → ToolResult
       │    → RunManager.recordToolCall(...)
       └─ Denied → ApprovalDeniedError → reported to provider
```

### Key Properties Confirmed

- **ApprovalGate** unchanged — routes by `riskLevel`, no tool-origin awareness needed
- **ApiApprover** unchanged — creates pending approval by tool name string
- **CliApprover** unchanged — terminal prompt shows tool name and args
- **ApprovalRequest** schema sufficient — `toolName: string`, `args: unknown`, `riskLevel`, `context`
- **ApprovalResult** schema sufficient — discriminated union on `approved`
- **RunManager** sufficient — `recordToolCall()` takes `toolName: string`
- **Report** sufficient — `ToolCallSummary.tool: string` — namespace prefix works

## SECURITY DECISIONS

| Security Property | Decision |
|------------------|----------|
| **Env isolation** | Env allowlist only. No inherited `process.env`. Only keys declared in `mcp.config.json` are passed. |
| **Command safety** | `spawn()` with `shell: false`. Must be explicit binary path or name. No shell evaluation. |
| **Workdir boundary** | MCP server cwd must be within Tripp.Reason workdir or explicitly configured. |
| **Output caps** | `maxOutputBytes` (default: 128KB) per tool call. Truncated output includes warning. |
| **Per-call timeout** | `toolTimeoutMs` (default: 30s). Hung calls return controlled error. |
| **Startup timeout** | `startupTimeoutMs` (default: 10s). Failed startup marks server disabled. |
| **Secret redaction** | Env values never appear in reports or tool-call summaries. Only env KEY names appear. |
| **Unknown-risk default** | `requiresApproval` defaults to `true`. Safety-first for unclassified tools. |
| **Disabled servers** | Registry returns controlled error for any tool from a disabled server. |
| **No network MCP** | stdio child process only. No HTTP/SSE transport for MCP servers. |
| **Graceful cleanup** | SIGTERM → 5s grace → SIGKILL on process exit. No zombie processes. |
| **No raw stack traces** | All MCP errors wrapped in controlled messages. Protocol errors reported generically. |
| **Local-only by default** | MCP server is a local child process. No remote MCP exposure. |

## IMPLEMENTATION SEQUENCE

| Sub-phase | Deliverable | Dependencies |
|-----------|------------|-------------|
| **4A** (THIS) | MCP Contract Lock | None |
| **4B** | MCP package skeleton + Mock MCP server + JSON-RPC client | 4A |
| **4C** | McpToolAdapter + Schema conversion + Dispatcher registration | 4B |
| **4D** | MCP execution through ApprovalGate + approve/deny/timeout flows | 4C |
| **4E** | Config loader + Server/CLI registration + Report integration | 4D |
| **4F** | MCP Final Audit + Full smoke test | 4E |

## OPEN QUESTIONS

| # | Question | Status | Resolution |
|---|----------|--------|-----------|
| 1 | MCP SDK dependency? | **Resolved** | No external MCP SDK. Pure Node.js JSON-RPC over stdio. Mock server for testing. |
| 2 | What if JSON Schema has `$ref` or `allOf`? | **Deferred** | Fallback to `z.record(z.unknown())`. Complex schema conversion can be enhanced in Phase 4+. |
| 3 | Multiple concurrent MCP servers? | **Deferred to 4E** | Start with single-server. Multi-server registration is registry concern, not runtime concern. |
| 4 | MCP server auto-restart? | **Resolved** | No auto-restart in Phase 4. Manual restart (server restart or config change). Crash = tools unavailable until restart. |
| 5 | MCP over SSE/HTTP transport? | **Resolved** | Not in Phase 4. Stdio only. SSE transport can be considered post-Phase 4 if needed. |
| 6 | MCP tool versioning? | **Deferred** | Not addressed. Tools are re-discovered on server startup. No version pinning. |
| 7 | Should ARCHITECTURE.md be updated? | **Resolved** | Not needed. ARCHITECTURE.md describes package boundaries and contracts, which MCP fits within. Contract doc is the authoritative MCP reference. |
| 8 | Real MCP SDK integration test? | **Resolved** | Not required for PASS. Mock server is sufficient. Real SDK can be tested post-Phase 4. |

## TMP / SMOKE ARTIFACT DECISION

### Action Taken

- **`tmp/` added to `.gitignore`** — Smoke artifacts are now git-ignored.
- **Existing tmp/ artifacts preserved** — 8 files from Phases 2E-3E remain as reference.
- **Phase 4 smoke tests** — Will follow convention: `tmp/phase4b-*.mjs`, `tmp/phase4c-*.mjs`, etc.
- **Future repo hygiene** — Archive or clean tmp/ in a dedicated hygiene pass (post-Phase 4, pre-Phase 5).

## SCOPE COMPLIANCE

| Check | Status |
|-------|--------|
| No `packages/mcp/` created | ✅ — No package directory |
| No MCP client code | ✅ — Zero source files |
| No MCP server code | ✅ — Zero source files |
| No MCP config loader | ✅ — Config shape defined, not implemented |
| No MCP tool adapter | ✅ — Interface only, no implementation |
| No new dependencies added | ✅ — `pnpm-lock.yaml` unchanged |
| No package.json changes | ✅ — All package.json files unchanged |
| No code to build/typecheck | ✅ — Pure documentation |
| Scope: docs-only | ✅ — 2 markdown files |

## NEXT STEP

**Phase 4B — MCP Package Skeleton + Mock MCP Server.** 

Create `packages/mcp/` scaffold with MCP JSON-RPC client over stdio and a mock MCP server for testing. No real MCP SDK dependency. No tool adapter or dispatcher integration yet.

### Phase 4B Readiness

- [x] MCP contract locked (`docs/PHASE_4_MCP_CONTRACT.md`)
- [x] Architecture audit confirms zero core changes needed
- [x] Tool interface confirmed sufficient
- [x] Approval flow confirmed compatible
- [x] Report integration confirmed compatible
- [x] Security model defined
- [x] Implementation sequence planned (4A→4F)
- [x] Mock server requirements specified
- [x] `tmp/` gitignored for smoke artifacts

**Phase 4A is complete. Ready for Phase 4B.**

---

*Report generated 2026-06-02. Phase 4A MCP Contract Lock — PASS.*
