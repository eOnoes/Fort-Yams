# Tripp.reason (goose) AI Coding Agent Framework
## Complete Deep Audit Report + LEAN Harness Plan

**Audit Date:** June 2025  
**Auditor:** Multi-agent parallel audit team  
**Source:** https://github.com/eOnoes/Tripp.reason  
**Files Analyzed:** 80+ source files across 5 crates, 2849 files in tree  

---

## Table of Contents

1. [What This Project Is](#1-what-this-project-is)
2. [Architecture Overview](#2-architecture-overview)
3. [Complete Model/Provider List](#3-complete-modelprovider-list-30-providers)
4. [How the Agent Aspect Works](#4-how-the-agent-aspect-works)
5. [How the Harness Aspect Works](#5-how-the-harness-aspect-works)
6. [What's Connected vs Disconnected](#6-whats-connected-vs-disconnected)
7. [Gap Analysis Summary](#7-gap-analysis-summary)
8. [LEAN Harness Design](#8-lean-harness-design)
9. [Connection Plan for OpenClaw/Hermes](#9-connection-plan-for-openclawhermes)
10. [Implementation Roadmap](#10-implementation-roadmap)
11. [Quick Start Commands](#11-quick-start-commands)

---

## 1. What This Project Is

**Tripp Reason** is a branded fork of the **Goose** AI coding agent framework (originally by Block/Square). It's a Rust-based multi-crate workspace that implements a full-featured AI coding agent with:

- **30+ LLM providers** (OpenAI, Anthropic, Google, Azure, AWS Bedrock, Ollama, OpenRouter, etc.)
- **MCP (Model Context Protocol)** extension system for tools
- **Desktop app** (Electron/React) + CLI + Server (goosed)
- **Session management** with SQLite persistence
- **Permission system** with SmartApprove mode
- **Recipe system** for parameterized workflows
- **Hooks/plugins system** following Open Plugins spec
- **Skills system** for filesystem-discovered capabilities
- **Telegram gateway** for remote access
- **Evaluation harnesses** (Open Model Gym, Harbor)

This fork adds:
- **Tripp branding** (black + #B5E61D interface)
- **Kimi K2.6 swarm extension** for parallel subagent workflows via Moonshot

---

## 2. Architecture Overview

```
+------------------------------------------------------------------+
|                        TRIFF REASON SYSTEM                        |
+------------------------------------------------------------------+
|                                                                   |
|  UI LAYER (external processes)                                    |
|  +------------------+  +------------------+  +----------------+  |
|  | ui/desktop/      |  | ui/sdk/          |  | goose-cli      |  |
|  | (Electron/React) |  | (TypeScript ACP) |  | (terminal)     |  |
|  +--------+---------+  +--------+---------+  +--------+-------+  |
|           |                     |                     |          |
|           +----------+----------+----------+----------+          |
|                      |          |                     |           |
|                      v          v                     v           |
|              HTTP API    ACP Protocol          Direct Rust API    |
|              localhost:3000  HTTP/WS           Library calls       |
|                      |          |                     |           |
+------------------------------------------------------------------+
|                      |          |                     |           |
|  SERVER LAYER        v          v                     v           |
|  +----------------------------------------------------------+    |
|  | goose-server (goosed)                                    |    |
|  |  - Axum HTTP router (20 route modules)                   |    |
|  |  - SSE streaming (/reply)                                |    |
|  |  - Agent management (start/stop/tools)                   |    |
|  |  - Session CRUD + SQLite                                 |    |
|  |  - Secret key + API key auth                             |    |
|  |  - WebSocket proxies for MCP Apps                        |    |
|  +------------------+---------------------------------------+    |
|                     |                                             |
|                     v                                             |
|  CORE LAYER                                                       |
|  +----------------------------------------------------------+    |
|  | goose (core crate)                                       |    |
|  |                                                          |    |
|  |  Agent Loop          Providers (30+)    Session Mgr      |    |
|  |  +------------+      +------------+     +------------+   |    |
|  |  | reply()    |----->| OpenAI     |     | SQLite     |   |    |
|  |  | multi-turn |      | Anthropic  |     | create/get |   |    |
|  |  | tool exec  |      | Ollama     |     | list/del   |   |    |
|  |  | compact    |      | OpenRouter |     +------------+   |    |
|  |  | max 1000   |      | +26 more   |                    |    |
|  |  +------------+      +------------+                    |    |
|  |       |                                              |    |
|  |  +----v--------------------------------------+       |    |
|  |  | Extension Manager (MCP client)            |       |    |
|  |  | - Stdio extensions                        |       |    |
|  |  | - Streamable HTTP extensions              |       |    |
|  |  | - Built-in extensions                     |       |    |
|  |  +-------------------------------------------+       |    |
|  |       |                                              |    |
|  |  +----v--------------------------------------+       |    |
|  |  | Tool Inspection Pipeline (5 inspectors)    |       |    |
|  |  | - Security Inspector (dangerous ops)       |       |    |
|  |  | - Egress Inspector (data exfiltration)     |       |    |
|  |  | - Adversary Inspector (LLM-based review)   |       |    |
|  |  | - Permission Inspector (user approval)     |       |    |
|  |  | - Repetition Inspector (loop detection)    |       |    |
|  |  +-------------------------------------------+       |    |
|  |                                                          |    |
|  +----------------------------------------------------------+    |
|                     |                                             |
|  MCP TOOLS          v                                             |
|  +----------------------------------------------------------+    |
|  | goose-mcp                                                |    |
|  |  - Computer Controller (web_scrape, automation)          |    |
|  |  - Developer tools (read/write/shell/search)             |    |
|  |  - Memory system (persistent storage)                    |    |
|  |  - Autovisualiser (charts, sankey, maps)                 |    |
|  |  - Tutorial system                                       |    |
|  |  - Peekaboo (macOS GUI automation)                       |    |
|  +----------------------------------------------------------+    |
|                                                                   |
+------------------------------------------------------------------+
|  EVAL/TEST (disconnected)                                         |
|  +------------------+  +------------------+                      |
|  | evals/open-model |  | evals/harbor/    |                      |
|  | -gym/            |  | (Python/Docker)  |                      |
|  | (Node.js MCP     |  |                  |                      |
|  |  harness)        |  |                  |                      |
|  +------------------+  +------------------+                      |
+------------------------------------------------------------------+
```

---

## 3. Complete Model/Provider List (30+ Providers)

### Tier 1: Essential (Keep for LEAN)

| # | Provider | Models | Auth |
|---|----------|--------|------|
| 1 | **OpenAI** | GPT-4o, GPT-4, GPT-3.5-turbo, o1, o3 | API Key |
| 2 | **Anthropic** | Claude 3.5/4 Sonnet, Opus, Haiku | API Key |
| 3 | **OpenRouter** | 100+ models via unified API | API Key |
| 4 | **Ollama** | Any local model (Llama, Mistral, Qwen, etc.) | None (local) |
| 5 | **OpenAI Compatible** | Generic OpenAI-compatible endpoints | API Key |

### Tier 2: Cloud Platform (Remove for LEAN)

| # | Provider | Models | Auth |
|---|----------|--------|------|
| 6 | **Azure OpenAI** | GPT-4o, GPT-4 | Azure AD / API Key |
| 7 | **AWS Bedrock** | Claude, Llama, Titan | AWS IAM |
| 8 | **AWS SageMaker TGI** | HuggingFace models | AWS IAM |
| 9 | **Google Gemini** | Gemini 2.5 Pro/Flash, Gemini 3 | API Key / OAuth |
| 10 | **Google Vertex AI** | Gemini, PaLM | GCP Service Account |
| 11 | **Databricks** | DBRX, external models | Databricks token |
| 12 | **Snowflake** | Cortex models | Snowflake JWT |

### Tier 3: IDE/CLI Integrations (Remove for LEAN)

| # | Provider | Description |
|---|----------|-------------|
| 13 | **GitHub Copilot** | Copilot models via IDE |
| 14 | **OpenAI Codex** | Codex CLI integration |
| 15 | **Claude Code** | Anthropic Claude CLI |
| 16 | **Gemini CLI** | Google Gemini CLI |
| 17 | **Cursor Agent** | Cursor IDE agent |
| 18 | **ChatGPT Codex** | ChatGPT Codex mode |

### Tier 4: Niche/Specialized (Remove for LEAN)

| # | Provider | Description |
|---|----------|-------------|
| 19 | **xAI/Grok** | Grok models |
| 20 | **NanoGPT** | NanoGPT models |
| 21 | **Tetrate** | Tetrate models |
| 22 | **Avian** | Avian provider |
| 23 | **Kimi Code** | Moonshot Kimi (via OpenRouter) |
| 24 | **Pi ACP** | Pi assistant |
| 25 | **AMP ACP** | Amazon AMP |
| 26 | **Claude ACP** | Claude ACP |
| 27 | **Copilot ACP** | Copilot ACP |
| 28 | **Codex ACP** | Codex ACP |
| 29 | **LiteLLM** | LiteLLM proxy gateway |
| 30 | **Local Inference** | Candle/llama.cpp direct |

---

## 4. How the Agent Aspect Works

### 4.1 The Agent Struct

```rust
pub struct Agent {
    provider: SharedProvider,                    // The LLM (OpenAI, Anthropic, etc.)
    config: AgentConfig,                         // Session mgr, permission mgr, mode
    extension_manager: Arc<ExtensionManager>,    // MCP extension lifecycle
    tool_confirmation_router: ToolConfirmationRouter,  // Approval flow
    retry_manager: RetryManager,                 // Retry logic
    tool_inspection_manager: ToolInspectionManager,    // 5 security inspectors
    hook_manager: HookManager,                   // Plugin lifecycle hooks
    // ... more fields
}
```

### 4.2 The Core Reply Loop

This is the beating heart of the agent:

```
User sends message
  |
  v
[1] Hook: UserPromptSubmit
  |
  v
[2] Check slash commands (/compact, /clear, /note, /mode, etc.)
  |
  v
[3] Auto-compact check (if conversation > 80% of context limit)
  |
  v
[4] reply_internal()
      |
      +-- Prepare: collect tools from all extensions
      +-- Build system prompt (with instructions, skills, context)
      +-- Format conversation for provider (OpenAI/Anthropic/etc. format)
      |
      v
[5] MULTI-TURN LOOP (max 1000 turns):
      |
      +-- [5a] Inject MOIM (Multi-Objective Intent Management)
      +-- [5b] Stream LLM response
      +-- [5c] Categorize tool requests (frontend vs backend)
      +-- [5d] Run 5 inspection checks on each tool call
      +-- [5e] Handle approvals (Chat/Approve/Auto/SmartApprove modes)
      +-- [5f] Execute approved tools, collect results
      +-- [5g] Drain elicitation messages (ask user for input)
      +-- [5h] Check for final output / goal completion
      +-- [5i] Check max turns limit
      +-- [5j] Loop back to [5a] if more work needed
      |
      v
[6] Post-processing: emit hooks, update session, return
```

### 4.3 Tool Inspection Pipeline (Security)

Every tool call passes through 5 inspectors before execution:

1. **Security Inspector** - Detects dangerous operations (rm -rf, etc.)
2. **Egress Inspector** - Detects potential data exfiltration
3. **Adversary Inspector** - LLM-based adversarial review (opt-in via `~/.config/goose/adversary.md`)
4. **Permission Inspector** - User approval based on GooseMode
5. **Repetition Inspector** - Detects repetitive tool call loops

### 4.4 Permission Modes

| Mode | Behavior | Use Case |
|------|----------|----------|
| `Chat` | All tools require approval | Maximum safety |
| `Approve` | Same as Chat | Legacy name |
| `Auto` | All tools auto-approved | Trusted environments |
| `SmartApprove` | LLM decides approval with annotations | Balanced |

### 4.5 Agent Configuration

```yaml
# ~/.config/goose/config.yaml
GOOSE_PROVIDER: openai
GOOSE_MODEL: gpt-4o
GOOSE_MODE: smartapprove  # chat | approve | auto | smartapprove
GOOSE_MAX_ACTIVE_AGENTS: 10
GOOSE_AUTO_COMPACT_THRESHOLD: 0.8
GOOSE_DISABLE_SESSION_NAMING: false
GOOSE_THINKING_EFFORT: medium
```

---

## 5. How the Harness Aspect Works

### 5.1 MCP Harness (Test Fixture)

Located at `evals/open-model-gym/mcp-harness/` - a **standalone Node.js MCP server** with 35 mock tools:

```
Google Drive (mock)    - list_files, read_file, write_file
Google Sheets (mock)   - read_sheet, write_sheet, append_row
Salesforce (mock)      - query, create_record, update_record
Slack (mock)           - send_message, read_messages
Calendar (mock)        - list_events, create_event, delete_event
Gmail (mock)           - search_emails, send_email
Jira (mock)            - search_issues, create_issue, update_issue
GitHub (mock)          - search_issues, create_pr, merge_pr
```

**Connection:** The harness is loaded as a stdio MCP extension:
```bash
goose run --with-extension "node mcp-harness/dist/index.js"
```

**Purpose:** Testing agents without real SaaS credentials. Agents call mock tools, harness logs to `tool-calls.log`, test runner validates.

### 5.2 Evaluation Harness (Open Model Gym)

Located at `evals/open-model-gym/` - a **TypeScript test matrix runner**:

```yaml
# config.yaml defines the test matrix:
models:
  - name: opus
    provider: anthropic
    model: claude-opus-4-5-20251101

runners:
  - name: goose-full
    type: goose
    bin: goose
    extensions: [developer, todo, skills]

scenarios:
  - name: file-editing
    prompt: "Create a file called test.txt with content 'hello world'"
    validators:
      - file_exists: test.txt
      - file_matches: { path: test.txt, content: "hello world" }
```

**How it works:**
1. For each (model x runner x scenario) combination:
2. Set up isolated workdir
3. Write runner-specific config
4. Spawn MCP harness as stdio extension
5. Run agent with scenario prompt
6. Validate results (file_exists, file_matches, tool_called)
7. Keep **WORST** result across 3 repetitions (catches flaky passes)
8. Generate `report.html` with pass/fail matrix

### 5.3 Harbor Benchmark

Located at `evals/harbor/` - **Python/Docker benchmark**:
- Uses Harbor framework with goose adapter
- Agents execute inside Docker task containers
- Supports Terminal-Bench 2.0 dataset

### 5.4 LEAN Server Harness (goosed)

The production harness is the `goosed` server:

```
POST /agent/start           - Create session + start agent
POST /agent/resume          - Resume existing session
POST /agent/restart         - Restart agent with new config
POST /agent/stop            - Stop agent
GET  /agent/tools           - List available tools
POST /agent/call_tool       - Direct tool invocation
POST /agent/add_extension   - Load MCP extension
POST /agent/remove_extension - Unload MCP extension
POST /reply                 - SSE stream of agent responses (THE MAIN ENDPOINT)
GET  /sessions              - List sessions
GET  /sessions/{id}         - Get session
DELETE /sessions/{id}       - Delete session
```

---

## 6. What's Connected vs Disconnected

### CONNECTED (Working Integration)

| Component | Connection | Status |
|-----------|-----------|--------|
| Core agent -> Providers | Direct Rust calls via trait | STRONG |
| Core agent -> MCP tools | Extension manager + MCP client | STRONG |
| Core agent -> Session mgr | SQLite via sqlx | STRONG |
| Core agent -> Permission | Permission manager | STRONG |
| Server -> Core agent | AgentManager singleton | STRONG |
| Server -> SSE streaming | tokio-stream + axum | STRONG |
| CLI -> Core agent | Direct library calls | STRONG |
| MCP built-ins -> Agent | Registered at startup | STRONG |
| ACP protocol -> SDK | HTTP + stdio transports | STRONG |

### DISCONNECTED / PARTIAL

| Component | Issue | Severity |
|-----------|-------|----------|
| **16 server route modules** | Declared but source missing | HIGH |
| action_required route | Tool confirmations need this | HIGH |
| config_management route | Provider config API missing | HIGH |
| mcp_app_proxy route | MCP Apps WebSocket proxy missing | HIGH |
| mcp_ui_proxy route | MCP UI proxy missing | HIGH |
| recipe route | Recipe API missing | MEDIUM |
| session_events route | Real-time events missing | HIGH |
| UI Desktop -> Server | Needs all missing routes | HIGH |
| MCP Harness | Separate Node.js project, no build link | LOW (by design) |
| Open Model Gym | Invokes goose CLI as black box | LOW (by design) |
| Harbor eval | Separate Python/Docker project | LOW (by design) |
| Documentation | Static Docusaurus, no runtime link | NONE (by design) |
| V8 vendor | Not present in checkout | LOW |
| OIDC proxy | Not present in checkout | LOW |
| Plugin marketplace | No central registry | MEDIUM |
| Skills marketplace | Filesystem only | LOW |
| Gateway (Telegram) | Only Telegram, no others | LOW |
| Scheduler | Backend not fully wired | MEDIUM |
| Subagent execution | Types exist, defaults off | LOW |

---

## 7. Gap Analysis Summary

### Critical Gaps (Must Fix)

1. **Missing server routes** - The desktop app and external agents need `action_required`, `config_management`, `mcp_app_proxy`, `mcp_ui_proxy`, `session_events` routes to function fully.

2. **Incomplete WebSocket proxy** - MCP Apps (interactive charts, visualizations) require WebSocket bridges that are declared but not implemented.

3. **Desktop app contract mismatch** - The Electron desktop expects 20+ routes but only ~4 have source files in the checkout. This may mean the routes are generated or live in a separate branch.

### Medium Gaps (Should Fix)

4. **No plugin marketplace** - Plugins are discovered from filesystem only (`~/.config/goose/plugins/`). No central repository or installer.

5. **No skills marketplace** - Same as plugins - filesystem only (`~/.agents/skills/`).

6. **Scheduler backend incomplete** - Scheduling tools exist but the cron backend is partially wired.

### Low/By Design (Acceptable)

7. **Evals disconnected** - This is correct. Evaluations should be external test fixtures.

8. **MCP harness disconnected** - This is correct. Test fixtures shouldn't be in the production build.

9. **Docs disconnected** - This is correct. Documentation is static.

---

## 8. LEAN Harness Design

### Philosophy

1. **API-first**: HTTP + SSE endpoints; all UI is external
2. **MCP-centric**: Tools come via MCP; built-ins are minimal
3. **Provider-minimal**: 5 providers cover 99% of use cases
4. **Feature-gate everything**: Every non-essential subsystem is optional
5. **No local inference**: API-based LLMs only
6. **ACP is the integration point**: External agents connect via Agent Client Protocol

### What to Keep

| Component | Why Essential |
|-----------|---------------|
| Core Agent Loop | Multi-turn conversation, tool dispatch, streaming |
| Provider Factory | Abstraction over LLM APIs |
| SSE Streaming | Real-time response delivery |
| Session Manager | Persistent chat sessions |
| Permission System | Tool approval safety |
| Developer Built-in | Core coding tools (read, write, shell, search) |
| MCP Client | Talks to MCP tool servers |
| Extension Manager | Loads/unloads MCP extensions |
| ACP Protocol | Primary external integration point |
| Config System | YAML + env var overlay |
| SQLite Persistence | Session storage |
| Tool Inspection | Security + egress + repetition checks |

### What to Remove

| Component | Savings |
|-----------|---------|
| 22+ non-essential providers | ~20 source modules |
| AWS SDK (bedrock, sagemaker) | ~15 crates |
| Local inference (Candle, llama.cpp) | ~25 crates + C++ deps |
| Telemetry (PostHog) | ~3 crates |
| OpenTelemetry | ~5 crates |
| Telegram gateway | ~5 crates |
| Tutorial system | Minimal |
| Autovisualiser | Heavy deps (lopdf, docx, umya) |
| Computer controller docs (xlsx, docx, pdf) | ~3 heavy crates |
| Nostr SDK | ~2 crates |
| Hooks system | ~3 modules |
| Skills system | ~2 modules |
| Signup flows | ~3 modules |

### Expected Results

| Metric | Original | LEAN | Improvement |
|--------|----------|------|-------------|
| Direct dependencies | ~80+ | ~35-40 | **50-56% reduction** |
| Compile time (clean) | 8-12 min | 2-3.5 min | **60-70% faster** |
| Binary size | ~50+ MB | ~15-25 MB | **50-70% smaller** |

---

## 9. Connection Plan for OpenClaw/Hermes

### Option 1: ACP HTTP Server (Recommended)

The **Agent Client Protocol** is the cleanest integration point.

```bash
# Start the ACP server
goose serve --host 127.0.0.1 --port 8080

# External agent connects via HTTP POST
# Endpoint: http://127.0.0.1:8080/acp/v1/methods
# Auth: x-secret-key header
# Protocol: JSON-RPC 2.0
```

**ACP Methods:**
```
ap.initialize          - Initialize session with extensions
ap.methods/list        - List available MCP methods (tools)
ap.methods/call        - Call a tool
ap.prompts/list        - List available prompts
ap.prompts/get         - Get a prompt
ap.resources/list      - List available resources
ap.resources/read      - Read a resource
ap.context/get         - Get current context
ap.context/update      - Update context
```

### Option 2: SSE Streaming (Real-time)

```typescript
const eventSource = new EventSource('https://127.0.0.1:3000/reply', {
  headers: { 'x-secret-key': secretKey }
});

eventSource.onmessage = (event) => {
  const msg = JSON.parse(event.data);
  switch (msg.type) {
    case 'Message':     // Assistant response chunk
    case 'Finish':      // Done
    case 'Error':       // Error
    case 'ToolRequest': // Tool approval needed
  }
};
```

### Option 3: Direct Library Embedding (Rust Only)

```rust
use goose::agents::{Agent, AgentConfig};

let agent = create_agent_with_provider("anthropic").await?;
let stream = agent.reply(message, config, None).await?;
// Process stream...
```

### Option 4: MCP Server Mode

```json
{
  "mcpServers": {
    "goose": {
      "command": "goosed",
      "args": ["--mcp"],
      "env": {
        "GOOSE_PROVIDER": "openai",
        "OPENAI_API_KEY": "sk-..."
      }
    }
  }
}
```

### Minimal Runtime for OpenClaw/Hermes

```
+-------------------+        HTTP/SSE         +------------------+
|  OpenClaw Agent   | <---------------------> |  goosed (lean)   |
|  or Hermes Agent  |    x-secret-key auth    |                  |
|                   |                        |  +------------+  |
|  Can use:         |                        |  | Axum Router|  |
|  - ACP protocol   |                        |  +------------+  |
|  - SSE streaming  |                        |       |          |
|  - Direct MCP     |                        |  +----v-----+    |
|                   |                        |  | Agent    |    |
|                   |                        |  | Manager  |    |
+-------------------+                        |  +----|-----+    |
                                             |       |          |
                                    +--------v-------+          |
                                    |                          |
                           +--------v---------+  +-------------v-----+
                           | LLM Provider     |  | MCP Extensions    |
                           | (OpenAI/         |  | (developer +      |
                           |  Anthropic/etc)  |  |  user-defined)    |
                           +------------------+  +-------------------+
```

---

## 10. Implementation Roadmap

### Phase 1: Core Deletion (Week 1)

1. Remove 22+ non-essential provider modules
2. Remove AWS provider modules and `aws-providers` feature
3. Remove local inference modules and `local-inference` feature
4. Remove telemetry (`posthog`) module and `telemetry` feature
5. Remove OpenTelemetry modules and `otel` feature
6. Remove gateway module (Telegram)
7. Remove tutorial built-in MCP server
8. Remove autovisualiser (or gate behind `builtin-viz`)
9. Remove computer controller document tools (xlsx, docx, pdf)
10. Remove Nostr SDK dependency

### Phase 2: Refactoring (Week 2)

1. Make `HookManager` in `Agent` optional (`Option<HookManager>`)
2. Make `scheduler_service` fully optional with `#[cfg]`
3. Gate `recipe` support in `AppState`
4. Gate `gateway_manager` in `AppState`
5. Consolidate format converters (keep only openai + anthropic)
6. Update provider initialization to only register kept providers

### Phase 3: Server Stabilization (Week 3)

1. Implement missing critical routes:
   - `action_required` (tool confirmations)
   - `config_management` (provider config)
   - `session_events` (real-time updates)
2. Simplify auth to secret-key only
3. Ensure SSE streaming is robust

### Phase 4: Validation (Week 4)

1. Run tests with lean features
2. Test ACP protocol integration with external mock agent
3. Test SSE streaming
4. Benchmark compile time and binary size
5. Document the lean build process

---

## 11. Quick Start Commands

```bash
# 1. Clone repository
git clone https://github.com/eOnoes/Tripp.reason.git
cd Tripp.reason

# 2. Build minimal library (no built-ins)
cargo build -p goose --no-default-features --features rustls-tls

# 3. Build standard harness (with developer tools)
cargo build -p goose-server --features "rustls-tls,builtin-developer"

# 4. Run tests for lean build
cargo test -p goose --no-default-features --features rustls-tls
cargo test -p goose-server --features builtin-developer

# 5. Configure provider
mkdir -p ~/.config/goose
echo 'GOOSE_PROVIDER: openai' >> ~/.config/goose/config.yaml
echo 'OPENAI_API_KEY: sk-...' >> ~/.config/goose/secrets.yaml

# 6. Run the server
cargo run -p goose-server --bin goosed

# 7. In another terminal - start a session
curl -k -H "x-secret-key: <key from server output>" \
  -H "Content-Type: application/json" \
  -d '{"working_dir":"/tmp/test"}' \
  https://127.0.0.1:3000/agent/start

# 8. Stream a response
curl -k -H "x-secret-key: <key>" \
  -H "Content-Type: application/json" \
  -d '{"session_id":"<id>","message":{"role":"user","content":[{"type":"text","text":"Hello"}]}}' \
  https://127.0.0.1:3000/reply
```

---

## Appendix: Audit Artifacts

This audit produced the following detailed documents:

| Document | Path | Lines | Content |
|----------|------|-------|---------|
| Core Crate Audit | `/mnt/agents/output/audit-core-crate.md` | ~1257 | All goose crate modules, providers, agent architecture |
| Server Audit | `/mnt/agents/output/audit-server.md` | ~1609 | All API routes, state management, auth |
| CLI & MCP Audit | `/mnt/agents/output/audit-cli-mcp.md` | ~1547 | All CLI commands, MCP tools, built-ins |
| Gap Analysis | `/mnt/agents/output/gap-analysis.md` | ~681 | Disconnected components, missing routes |
| LEAN Harness Plan | `/mnt/agents/output/lean-harness-plan.md` | ~988 | Minimal build spec, feature flags, Cargo.toml |
| **This Report** | `/mnt/agents/output/FINAL-AUDIT-REPORT.md` | ~500 | Executive summary and action plan |

---

*End of Audit Report*
