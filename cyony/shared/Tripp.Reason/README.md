# Tripp.Reason

Lean local-first agent runtime for coding agents, prompt routing, tool execution, swarm coordination, and audit-backed task completion.

## Status

**Phase 5 — Kimi-Style Swarm Runtime (COMPLETE)** ✅
**Phase 6 — Dashboard / Control Surface (COMPLETE)** ✅

Phases 1–6 are complete. The runtime now supports:

- **`tripp run`** — Direct local execution with 9 local tools + MCP tools behind ApprovalGate
- **`tripp serve`** — Fastify HTTP/SSE server, 11 routes, MCP tools in /tools + /status
- **`tripp chat`** — Interactive HTTP/SSE client with terminal approval prompts
- **MCP Bridge** — Load external MCP servers via `.tripp/mcp.config.json`, tools route through existing ApprovalGate
- **`tripp swarm run`** — Bounded Kimi-style multi-worker orchestration. Fake mode (default) for deterministic pipelines, real mode (`--real`) for ReasonLoop-backed workers. Startup approval gates for medium/large/max modes.
- **Dashboard** — Local web control surface (Vite + React + TypeScript). Live SSE streaming, approval queue, swarm monitoring, session/report browsing. Dark-first, hard-edge styling.

Next: **Phase 7 — OpenClaw + Hermes Integration**.

## Dashboard Quick Start

```bash
# Start the server (must be running for dashboard)
tripp serve

# In a separate terminal, start the dashboard dev server:
cd apps/dashboard
pnpm dev

# Dashboard opens at http://localhost:5173
# API base URL defaults to http://127.0.0.1:3030
# Override with VITE_TRIPP_API_BASE env var if needed

# Build dashboard for production:
pnpm --filter tripp-dashboard build
# Output: apps/dashboard/dist/
```

**Dashboard panels:**
- **Overview** — Server health, provider/model, tools count, MCP status, swarm API status
- **Live Run** — Prompt input, SSE streaming, event feed (message/tool_request/tool_result/finish/error), approval polling
- **Tools** — Tool list with approval badges, local vs MCP source
- **Sessions** — Session list with status, provider, timestamps
- **Reports** — Report list with type, path, size
- **Approvals** — Pending approvals with explicit approve/deny (default-deny posture)
- **Swarms** — Fake-only swarm runs (solo/small), task/result packet tables, Warden verdict, conflict display

**Dashboard limitations:**
- No Electron — web browser only
- No config editing from UI
- No real-mode swarm from dashboard (CLI only)
- No OpenClaw/Hermes integration (Phase 7)
- No MCP marketplace UI
- No swarm live SSE (synchronous fake runs only)

## Swarm Quick Start

```bash
# Fake mode (default, no provider config needed)
tripp swarm run "[parallel] audit the docs for consistency"

# Solo mode
tripp swarm run "[single] fix the bug in auth.ts"

# Real mode (requires provider config)
tripp swarm run "[parallel] implement login" --real --mode small

# Swarm modes and caps
tripp swarm run --help
```

**Key behaviors:**
- Fake mode is default — deterministic, instant, 0 provider deps
- Real mode (`--real`) mirrors `tripp run` assembly
- Worker count hard cap: 25 (mode caps: solo=1, small=5, medium=10, large=20)
- Startup approval required for medium/large/max modes
- Swarm reports: `reports/<date>/<swarm-id>.md`
- Warden reviews every run for scope/safety violations

**Current limitations:**
- No server swarm endpoints yet (Phase 6+)
- No UI/dashboard yet (Phase 6)
- No OpenClaw/Hermes adapters yet (Phase 7)

## MCP Quick Start

Create `.tripp/mcp.config.json`:

```json
{
  "servers": [
    {
      "id": "my-server",
      "displayName": "My MCP Server",
      "command": "node",
      "args": ["./my-mcp-server.js"],
      "enabled": true
    }
  ]
}
```

MCP tools appear in `GET /tools` with namespaced names (`mcp.my-server.tool_name`), route through the same ApprovalGate as local tools, and appear in run reports.

## Architecture

See `docs/ARCHITECTURE.md` for the full system shape.

## Principles

- Core runs without UI, swarm, or MCP
- Every run produces a Markdown report
- All mutation gated behind ApprovalGate
- `packages/shared` is the single source of truth for all cross-package contracts
- Goose is reference material, not a parent

## Quick Start

```bash
# Install dependencies
pnpm install

# Build all packages
pnpm build

# Type check
pnpm typecheck
```

## Running (CLI)

### Local execution (`tripp run`)

```bash
# Set required environment variables
export TRIPP_OPENAI_COMPATIBLE_BASE_URL="https://ollama.com/v1"
export TRIPP_OPENAI_COMPATIBLE_API_KEY="your-key"
export TRIPP_MODEL="deepseek-v4-pro"  # or any model at the base URL

# Run a prompt
pnpm tripp run "List files in /tmp"

# Custom workdir
pnpm tripp run "Summarize the project" --workdir /path/to/project
```

### Server mode (`tripp serve`)

```bash
# Start the local HTTP/SSE server (default http://127.0.0.1:3030)
tripp serve

# Custom port and host
tripp serve --port 4040 --host 127.0.0.1

# Public bind requires explicit opt-in
TRIPP_ALLOW_PUBLIC_BIND=true tripp serve --host 0.0.0.0
```

### Interactive chat (`tripp chat`)

```bash
# Connect to local server (interactive session)
tripp chat

# Single prompt (non-interactive)
tripp chat --once "List files in /tmp"

# With terminal approval prompts
tripp chat --approve

# Auto-deny all mutation approvals
tripp chat --deny-all

# Custom server URL
tripp chat --server http://127.0.0.1:4040
```

### Server API endpoints

| Route | Method | Purpose |
|-------|--------|---------|
| `/health` | GET | Liveness check |
| `/status` | GET | Runtime config (no secrets) |
| `/tools` | GET | Registered tool list + schemas |
| `/sessions` | GET | List sessions |
| `/sessions/:id` | GET | Session detail + runs |
| `/sessions/:id/events` | GET | Events for a run (`?runId=`) |
| `/runs/:id` | GET | Full run detail |
| `/runs/:id/report` | GET | Generated report (Markdown) |
| `/reply` | POST | Start run, SSE stream events |
| `/approvals` | GET | Pending tool approvals |
| `/approvals/:id/resolve` | POST | Approve/deny a pending tool |

## Tools

### Read-Only (auto-approved, no approval required)
- `list_dir` — List directory contents
- `read_file` — Read UTF-8 text files
- `search` — Text search across files
- `git_status` — Git working tree status
- `git_diff` — Git diff (stat or full)

### Mutation / Execution (requires approval)
- `write_file` — Create or overwrite files (backup before overwrite)
- `edit_file` — Targeted text replacements (backup before edit)
- `shell` — Bounded command execution (allowlist, timeout, output caps)
- `run_tests` — Test runner with auto-detect (timeout, output caps)

## Safety Model

- **ApprovalGate**: Mutation/execution tools require explicit operator approval. No ApprovalGate configured → fail-closed.
- **Workdir boundary**: All tool paths validated against the workdir. Path traversal blocked.
- **Command safety**: Shell uses `spawn` with `shell: false`. Allowlist-only commands, dangerous commands rejected, chaining operators blocked.
- **Backups**: Automatic `.tripp/backups/<timestamp>/` before any file mutation.
- **Output caps**: Shell output capped at 128KB per stream. Timeouts enforced (30s shell, 120s tests).

## Reports

Every run produces a Markdown report at:

```
reports/<session-id>/<run-id>.md
```

Reports include: status (PASS/PARTIAL/FAIL), prompt, provider/model, event summary, tool calls, files changed, validation, and next step.

## Current Limitations

- Provider: OpenAI-compatible adapter only (covers Ollama Cloud, OpenRouter, DeepSeek direct)
- No OpenClaw/Hermes adapters (Phase 7)
- No swarm real-mode from dashboard UI
- No config editing from dashboard
- No live-up-to-date tool call persistence for agent context windows

## Phase History

### Phase 1 — Kernel / Solo Runtime ✅
Monorepo skeleton, shared contracts (8 Zod schemas, 4 interfaces), SQLite store (7 tables), Core primitives (ReasonLoop, EventStream, ApprovalGate, RunManager, ReportGenerator), OpenAI-compatible provider adapter, read-only tools (list_dir, read_file, search), CLI (`tripp run`).

### Phase 2 — Coding Agent Tools ✅
Mutation activation behind ApprovalGate (write_file, edit_file, shell, run_tests), git read-only tools (git_status, git_diff), backups, command safety (allowlist/denylist/chaining/timeout/caps), persistence warnings, tool-call audit persistence, end-to-end smoke validation (49/49 tests PASS).

### Phase 3 — Local Server + SSE ✅
Fastify HTTP server with 11 REST endpoints + real-time SSE streaming, HTTP Approval Queue (ApiApprover + ApprovalQueue), all 9 tools active over HTTP behind ApprovalGate, `tripp serve` + `tripp chat` CLI commands (interactive + `--once` modes with terminal approval prompting), security hardening (local bind, no secrets, CORS restricted, body cap, fail-close). 47/47 final audit smoke tests PASS.

### Phase 4 — MCP Bridge ✅
Full MCP bridge: JSON-RPC over stdio, mock server, tool adapter, schema conversion, ApprovalGate integration, server/CLI registration. 26/26 final audit smoke tests PASS. 11 source files, 0 Goose code.

### Phase 5 — Kimi-Style Swarm Runtime ✅
Bounded parallel workers with orchestrator/planner/merger/warden pipeline. Fake mode (default, deterministic) + real mode (ReasonLoop-backed workers). CLI: `tripp swarm run`. Worker caps: solo=1, small=5, medium=10, large=20, max=25. 7 sub-phases, jCodeMunch grade B (85.8), 0 layer violations, 0 Goose code.

### Phase 6 — Dashboard / Control Surface ✅
Local web control surface: Vite + React + TypeScript, 7 panels (Overview, Live Run SSE, Tools, Sessions, Reports, Approvals, Swarms), dark-first hard-edge styling. API client over HTTP/SSE only — zero direct runtime package imports. Fake-only swarm dashboard, default-deny approval posture. 6 sub-phases.

## Governance

- DOCTRINE.md — hard rules and anti-bloat constraints
- ARCHITECTURE.md — package boundaries and contracts
- ROADMAP.md — phased build plan
- MODEL_TIERS.md — model routing for build work
- PHASE_2_MUTATION_SAFETY.md — safety rules for all mutating tools

## License

Apache-2.0
