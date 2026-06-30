# Goose LEAN Harness — Audit Findings (2026-06)

Source: Kimi swarm deep audit of `Tripp.Reason` fork (Block's Goose framework).
Full audit zip: `/opt/data/shared/Tripp.Reason_Audit/` (94 files)

## Architecture (3 layers)

```
UI LAYER (external)
  ui/desktop (Electron/React)  →  HTTP API localhost:3000
  ui/sdk (TypeScript ACP)      →  ACP Protocol HTTP/WS
  goose-cli (terminal)         →  Direct Rust API library calls

SERVER LAYER — goose-server (goosed)
  Axum HTTP router (20 route modules, only ~4 have source in checkout)
  SSE streaming (/reply — THE main endpoint)
  Agent management (start/stop/tools)
  Session CRUD + SQLite
  Secret key + API key auth

CORE LAYER — goose (Rust crate)
  Agent loop: reply() → multi-turn tool exec → auto-compact (max 1000 turns)
  30+ providers via trait abstraction
  Extension Manager (MCP client: stdio + Streamable HTTP)
  Tool Inspection Pipeline (5 inspectors)
  Permission system (Chat/Approve/Auto/SmartApprove modes)

MCP TOOLS — goose-mcp
  Computer Controller (web_scrape, automation)
  Developer tools (read/write/shell/search/edit_file)
  Memory system (persistent categorized storage)
  Autovisualiser (charts, sankey, maps)
```

## Agent Struct (core intelligence)

```rust
pub struct Agent {
    provider: SharedProvider,                    // The LLM
    config: AgentConfig,                         // Session/permission/mode config
    extension_manager: Arc<ExtensionManager>,    // MCP extension lifecycle
    tool_confirmation_router: ToolConfirmationRouter,  // Approval flow
    retry_manager: RetryManager,                 // Retry logic
    tool_inspection_manager: ToolInspectionManager,    // 5 security inspectors
    hook_manager: HookManager,                   // Plugin lifecycle hooks
}
```

## Reply Loop (the beating heart)

```
User message
  → Hook: UserPromptSubmit
  → Check slash commands (/compact, /clear, /note, /mode)
  → Auto-compact check (if >80% context used)
  → reply_internal()
      → Collect tools from all extensions
      → Build system prompt (instructions, skills, context)
      → Format conversation for provider
  → MULTI-TURN LOOP (max 1000):
      → Inject MOIM (Multi-Objective Intent Management)
      → Stream LLM response
      → Categorize tool requests (frontend vs backend)
      → Run 5 inspection checks on each tool call
      → Handle approvals (Chat/Approve/Auto/SmartApprove)
      → Execute approved tools, collect results
      → Loop if more work needed
  → Post-processing: emit hooks, update session
```

## Providers — Keep vs Remove

### Keep (Big 5):
1. OpenAI — GPT-4o, o1, o3
2. Anthropic — Claude 3.5/4 Sonnet/Opus
3. OpenRouter — 100+ models unified
4. Ollama — local/cloud models
5. OpenAI Compatible — generic endpoints, LiteLLM proxy

### Remove (22):
azure, bedrock, sagemaker_tgi, databricks, gcpvertexai, google, litellm,
githubcopilot, codex, claude_code, gemini_cli, cursor_agent, chatgpt_codex,
xai, nanogpt, tetrate, snowflake, avian, kimicode, pi_acp, amp_acp,
copilot_acp, codex_acp, claude_acp

### Format Converters — Keep Only:
- `formats/openai` — covers OpenAI, OpenRouter, Ollama, OpenAI-compatible
- `formats/anthropic` — Anthropic direct

## ACP Protocol (Agent Client Protocol)

**Start:** `cargo run -p goose-cli -- serve --host 127.0.0.1 --port 8080`
**Connect:** HTTP POST `http://127.0.0.1:8080/acp/v1/methods`
**Auth:** `x-secret-key` header
**Protocol:** JSON-RPC 2.0

**Methods:**
```
ap.initialize          — Initialize session with extensions
ap.methods/list        — List available MCP methods (tools)
ap.methods/call        — Call a tool
ap.prompts/list        — List available prompts
ap.prompts/get         — Get a prompt
ap.resources/list      — List available resources
ap.resources/read      — Read a resource
ap.context/get         — Get current context
ap.context/update      — Update context
```

## Server Routes (keep only these for lean)

```
POST /agent/start          — Create session + start agent
POST /agent/resume         — Resume existing session
POST /agent/stop           — Stop agent
GET  /agent/tools          — List available tools
POST /agent/call_tool      — Direct tool invocation
POST /reply                — SSE stream (THE main endpoint)
GET  /sessions             — List sessions
GET  /sessions/{id}        — Get session
DELETE /sessions/{id}      — Delete session
```

### Missing routes (HIGH severity gaps):
- `action_required` — tool confirmations
- `config_management` — provider config API
- `mcp_app_proxy` — MCP Apps WebSocket proxy
- `session_events` — real-time updates

## Feature Flags (lean build)

```toml
default = ["rustls-tls", "builtin-developer"]

# ESSENTIAL (always keep)
rustls-tls = ["dep:rustls", "reqwest/rustls", ...]

# BUILT-IN MCP EXTENSIONS
builtin-developer = []      # Core coding tools
builtin-computer = [...]    # Web scrape, automation
builtin-memory = []         # Persistent memory
builtin-viz = []            # Chart rendering

# OPTIONAL
system-keyring = ["dep:keyring"]
recipes = []                # Workflow templates
subagents = []              # Multi-agent execution
```

## Build Profiles

| Profile | Features | Est. Deps | Compile | Binary |
|---------|----------|-----------|---------|--------|
| Minimal | rustls-tls | ~35 | ~2 min | ~15 MB |
| Standard | rustls-tls, builtin-developer | ~40 | ~2.5 min | ~18 MB |
| Full | all optionals | ~50 | ~3.5 min | ~25 MB |
| Original | everything | ~80+ | ~8-12 min | ~50+ MB |

## Quick Start (lean build)

```bash
# Build minimal library
cargo build -p goose --no-default-features --features rustls-tls

# Build standard server
cargo build -p goose-server --features "rustls-tls,builtin-developer"

# Run server
cargo run -p goose-server --bin goosed
# Listens on https://127.0.0.1:3000 with self-signed cert

# Start a session
curl -k -H "x-secret-key: <key>" \
  -H "Content-Type: application/json" \
  -d '{"working_dir":"/tmp/test"}' \
  https://127.0.0.1:3000/agent/start

# Stream a response
curl -k -H "x-secret-key: <key>" \
  -H "Content-Type: application/json" \
  -d '{"session_id":"<id>","message":{"role":"user","content":[{"type":"text","text":"Hello"}]}}' \
  https://127.0.0.1:3000/reply
```

## 4-Phase Implementation Roadmap

**Phase 1 (Week 1) — Core Deletion:**
1. Remove AWS providers (bedrock, sagemaker_tgi) + feature
2. Remove local inference (candle-*, llama-cpp-2) + feature
3. Remove telemetry (posthog) + feature
4. Remove OpenTelemetry + feature
5. Remove 22+ non-essential provider modules
6. Remove gateway module (Telegram)
7. Remove tutorial built-in
8. Remove autovisualiser (or gate behind builtin-viz)
9. Remove computer controller document tools (xlsx, docx, pdf)
10. Remove Nostr SDK + tokio-cron-scheduler

**Phase 2 (Week 2) — Refactoring:**
1. Make HookManager optional (`Option<HookManager>`)
2. Make scheduler_service fully optional with #[cfg]
3. Gate recipe support in AppState
4. Gate gateway_manager in AppState
5. Remove provider-specific OAuth for removed providers
6. Consolidate format converters (keep only openai + anthropic)
7. Update provider initialization to only register kept providers
8. Update routes/mod.rs to only register available routes

**Phase 3 (Week 3) — Server Minimization:**
1. Strip to essential routes only (agent, reply, session, status)
2. Remove WebSocket dependencies if MCP proxy not needed
3. Simplify auth to secret-key only
4. Remove API key auth system

**Phase 4 (Week 4) — Validation:**
1. Run existing tests with lean features
2. Test ACP protocol integration
3. Test SSE streaming with external client
4. Benchmark compile time and binary size
5. Document the lean build process

## Connected vs Disconnected

**STRONG connections:**
- Core agent → Providers (direct Rust trait calls)
- Core agent → MCP tools (extension manager + MCP client)
- Core agent → Session mgr (SQLite via sqlx)
- Server → Core agent (AgentManager singleton)
- Server → SSE streaming (tokio-stream + axum)
- CLI → Core agent (direct library calls)
- ACP protocol → SDK (HTTP + stdio transports)

**DISCONNECTED (by design or missing):**
- 16 server route modules declared but source missing (HIGH)
- Desktop UI → Server needs all missing routes (HIGH)
- MCP Harness (separate Node.js project, test-only)
- Evals (separate projects, invoke goose CLI as black box)
- Plugin marketplace (filesystem only, no registry)
- Skills marketplace (filesystem only)
- Scheduler backend partially wired (MEDIUM)
- Subagent execution (types exist, defaults off)
