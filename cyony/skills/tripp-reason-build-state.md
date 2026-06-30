# Tripp.Reason Build State (2026-06-03)

Current state of Eddie's crew-owned clean-room monorepo build.

## Phase Status

| Phase | Name | Status |
|-------|------|--------|
| 0 | Planning | ✅ |
| 1A-1G | Kernel / Solo Runtime | ✅ |
| 2A-2F | Coding Agent Tools | ✅ |
| 3A-3E | Server + SSE | ✅ |
| 4A-4F | MCP Bridge | ✅ |
| 5A-5G | Kimi-Style Swarm Runtime | ✅ |
| 6A-6F | Dashboard / Control Surface | ✅ |
| 7A | OpenClaw + Hermes Integration — Contract Lock | ✅ |
| 7B-7H | Integration Implementation | 📋 NEXT |

## Active Packages (10 + 1 app)

| Package/App | Files | Imports |
|-------------|-------|---------|
| shared | 6 | (leaf) |
| store | 5 | shared |
| core | 9 | shared, store |
| providers | 6 | shared |
| tools | 15 | shared |
| server | 19 | shared, store, core, providers, tools, mcp, swarm |
| cli | 14 | shared, store, core, providers, tools, server, mcp, swarm |
| mcp | 12 | shared, zod, Node built-ins |
| swarm | 16 | shared, core, zod |
| dashboard | 18 | **none** (HTTP/SSE only, 0 runtime imports) |

## Dashboard (Phase 6 — Complete)

- **Location:** `apps/dashboard/` (application, not library — nothing imports it)
- **Stack:** Vite + React + TypeScript, 41 modules, 5 npm deps
- **Panels (7):** Overview, Live Run (SSE), Tools, Sessions, Reports, Approvals, Swarms
- **API client:** 11 functions over HTTP/SSE only, zero `@tripp-reason/*` imports
- **SSE:** native fetch + ReadableStream parser, 5 event types, heartbeat handling
- **Swarm:** fake-only dashboard, solo/small enabled, medium+ 🔒 disabled
- **Style:** dark-first, hard edges, amber accent, plain CSS, 1.72 KB gzipped
- **Security:** 0 runtime imports, 0 secrets, 0 filesystem access, ApprovalGate via server API

## jCodeMunch Health (2026-06-03)

- Grade: B (86.5)
- Cycles: 1 type-only intra-package (swarm, non-harmful)
- Layer violations: 0
- Goose/Reasonix references: 0
- Dead code: 2.1%

## Tool Surface

**Local tools (9):** list_dir, read_file, search, git_status, git_diff, write_file, edit_file, shell, run_tests — all active behind ApprovalGate.

**MCP tools (config-driven):** loaded from `.tripp/mcp.config.json`, namespaced as `mcp.<serverId>.<toolName>`, route through same ApprovalGate/dispatcher as local tools.

## Key Design Decisions

- **Server is assembly layer**: Same role as CLI — imports all packages, wires them, exposes HTTP routes
- **Real-time SSE**: EventStream subscribe-before-run — events forwarded live during execution
- **Dashboard is a thin API consumer**: HTTP/SSE only, never imports runtime packages directly
- **apps/ vs packages/**: `apps/` = deployable applications (final consumers), `packages/` = libraries (consumed by others)
- **Async HTTP approval**: ApiApprover returns unresolved Promise → ReasonLoop naturally pauses at `await approvalGate.check()` — zero core changes
- **Fail-closed**: `if (requiresApproval) { if (!gate) FAIL; }` — not `if (requiresApproval && gate)`
- **DeepSeek direct-API only**: Never via OpenRouter or Ollama. Base: `https://api.deepseek.com`, key: `DEEPSEEK_API_KEY`
- **MCP namespacing**: `mcp.<serverId>.<toolName>` prevents collisions with local tool names
- **MCP partial failure**: One server failing doesn't crash the runtime — status reflects error, others continue
- **Swarm fake-only from dashboard**: Real mode gated to CLI. Medium+ requires startup approval not yet available over HTTP
