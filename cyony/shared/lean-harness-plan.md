# LEAN Harness Design: Tripp.reason (goose) AI Coding Agent Framework

## Executive Summary

This document designs a **minimal LEAN harness** for the goose AI coding agent that can:

1. **Force-multiply an OpenClaw agent or Hermes agent** via the Agent Client Protocol (ACP)
2. **Serve as a standard coding harness** using a backend subscription or API
3. **Preserve core functionality** -- sessions, streaming, tool execution, and multi-provider support

The LEAN harness strips approximately **60-70% of the codebase** by weight while retaining 100% of the agent's core capabilities. The design targets a **~40-dependency core** (down from ~80+) with **compile times reduced by 50%+**.

---

## Design Philosophy

### Principles

1. **API-first**: The harness exposes HTTP + SSE endpoints; all UI is external
2. **MCP-centric**: Tools come via the Model Context Protocol; built-ins are minimal
3. **Provider-minimal**: Support the 5 providers that cover 99% of use cases
4. **Feature-gate everything**: Every non-essential subsystem is behind a feature flag
5. **No local inference**: API-based LLMs only; no Candle, no llama.cpp, no GPU code
6. **SQLite is acceptable**: Session persistence is worth the sqlx dependency
7. **ACP is the integration point**: External agents connect via the Agent Client Protocol

---

## Component Recommendations

### KEEP -- Essential for the Lean Harness

These components are **non-negotiable**. Removing them breaks the agent.

| Component | Crate | Why Essential |
|-----------|-------|---------------|
| Core Agent Loop | `goose` | The beating heart -- multi-turn conversation, tool dispatch, streaming |
| Provider Factory | `goose::providers` | Abstraction over all LLM APIs |
| SSE Streaming | `goose-server::routes::reply` | Real-time response delivery |
| Session Manager | `goose::session` | Persistent chat sessions |
| Conversation | `goose::conversation` | Message container + validation |
| Permission System | `goose::permission` | Tool approval safety layer |
| Config System | `goose::config` | YAML config + env var overlay |
| MCP Client | `goose::agents::mcp_client` | Talks to MCP tool servers |
| Extension Manager | `goose::agents::extension_manager` | Loads/unloads MCP extensions |
| Tool Inspection | `goose::security` | Security + egress + repetition checks |
| ACP Protocol | `goose::acp` | Primary external integration point |
| Token Counter | `goose::token_counter` | Context window management |
| HTTP Server | `goose-server` (trimmed) | Axum + SSE endpoint delivery |
| SQLite Persistence | `sqlx` (sqlite) | Session storage |
| JSON Schema | `schemars` + `jsonschema` | Tool input validation |

### KEEP-OPTIONAL -- Feature-Gated

These add value but can be disabled. Each has a feature flag.

| Component | Feature Flag | Why Optional |
|-----------|-------------|--------------|
| Developer Extension | `builtin-developer` | Core coding tools (read, write, shell, search) |
| Computer Controller | `builtin-computer` | Web scrape, automation scripts |
| Memory System | `builtin-memory` | Persistent categorized memory |
| Autovisualiser | `builtin-viz` | Chart rendering for MCP Apps |
| System Keyring | `system-keyring` | OS keyring for secrets; can use file fallback |
| OpenTelemetry | `otel` | Tracing/metrics; pure instrumentation |
| Nostr Sharing | `nostr` | Social session sharing; niche |
| Recipe System | `recipes` | Workflow templates; complex YAML |
| Subagent Tools | `subagents` | Multi-agent; defaults off anyway |

### REMOVE -- Can Be Removed for Lean Build

These have **no critical dependencies** elsewhere.

| Component | Reason for Removal | Savings |
|-----------|-------------------|---------|
| AWS Providers (`bedrock`, `sagemaker_tgi`) | Huge AWS SDK; use OpenRouter or OpenAI-compatible instead | ~15 crates |
| Local Inference (`candle-*`, `llama-cpp-2`, `tokenizers`, `symphonia`) | No API-based harness needs local models | ~25 crates + C++ deps |
| CUDA/Vulkan | Hardware acceleration for local inference only | Build complexity |
| Telemetry (`posthog`) | Analytics; non-essential | ~3 crates |
| Gateway (Telegram) | Niche messaging; not core to coding | ~5 crates + telegram logic |
| Tutorial System | Onboarding; not needed for harness | Minimal |
| Autovisualiser (if gated off) | Chart rendering | `image`, `lopdf` deps |
| Computer Controller (if gated off) | Web scrape, xlsx, docx, pdf | `lopdf`, `docx-rs`, `umya-spreadsheet` |
| Peekaboo | macOS GUI automation; not in harness | macOS only anyway |
| Hooks System | Plugin lifecycle; power-user feature | ~3 modules |
| Skills System | Local prompt templates; filesystem discovery | ~2 modules |
| Recipe Deeplink | URL encoding for recipe sharing | ~1 module |
| Signup Flows (NanoGPT, OpenRouter, Tetrate) | Onboarding wizards | ~3 modules |
| OAuth Provider-Specific (`gemini_oauth`, `azureauth`) | Only if those providers removed | ~2 modules |
| Nostr SDK + `nostr` | Social sharing | ~2 crates |

### REMOVE-CAREFUL -- Has Dependencies, Needs Refactoring

These require **code changes** before removal.

| Component | Dependency Risk | Refactoring Required |
|-----------|----------------|---------------------|
| **Scheduler** (`schedule_tool`, `tokio-cron-scheduler`) | Referenced in `AgentConfig`, agent reply loop | Make `scheduler_service: Option<...>` fully optional with `#[cfg]` |
| **Hooks** (`HookManager` in `Agent`) | `Agent` struct contains `hook_manager: HookManager` | Replace with `Option<HookManager>` or no-op stub |
| **Recipe System** | Referenced in server `AppState` | Gate `recipe_file_hash_map` and `recipe_session_tracker` behind `#[cfg]` |
| **Multiple OAuth** (`oauth_device_flow`, `gemini_oauth`) | Referenced in provider init | Gate per provider; generic OAuth kept |
| **MOIM** (Multi-Objective Intent Management) | Referenced in agent reply loop | Already minimal impact; keep or stub |
| **Gateway Manager** | In `AppState`, server routes | Make fully optional; server routes already missing |

---

## Minimal Provider Set

### The Big 5 (Keep These)

| # | Provider | Module | Why Keep | Use Case |
|---|----------|--------|----------|----------|
| 1 | **OpenAI** | `openai` | GPT-4o, o1, o3 | Primary API for most users |
| 2 | **Anthropic** | `anthropic` | Claude 3.5/4 Sonnet/Opus | Best coding agent |
| 3 | **OpenRouter** | `openrouter` | 100+ models via one API | Flexibility, cost optimization |
| 4 | **Ollama** | `ollama` | Local models via Ollama server | Privacy, no cloud dependency |
| 5 | **OpenAI Compatible** | `openai_compatible` | Generic OpenAI-compatible endpoints | Self-hosted, LiteLLM proxy |

### Remove (22 Providers)

```
azure, bedrock, sagemaker_tgi, databricks, gcpvertexai, google,
litellm, githubcopilot, codex, claude_code, gemini_cli, cursor_agent,
chatgpt_codex, xai, nanogpt, tetrate, snowflake, avian, kimicode,
pi_acp, amp_acp, copilot_acp, codex_acp, claude_acp
```

**Rationale**: OpenRouter covers Azure, Bedrock, Google, xAI, and most others. Ollama covers local models. OpenAI-compatible covers self-hosted. The removed providers add **~20 source modules** plus **authentication complexity** (OAuth, device flow, custom auth) for minimal gain.

### Format Converters to Keep

| Converter | Why |
|-----------|-----|
| `formats/openai` | OpenAI, OpenRouter, Ollama, OpenAI-compatible |
| `formats/anthropic` | Anthropic direct |

Remove: `bedrock`, `databricks`, `gcpvertexai`, `google`, `ollama`, `openai_responses`, `openrouter`, `snowflake`

---

## MCP Tools: Minimal Built-in Set

### KEEP: Developer Extension

The `developer` built-in provides the **core coding tools**:

| Tool | Purpose | Harness Need |
|------|---------|--------------|
| `read_file` | Read file contents | **CRITICAL** |
| `write_file` | Write/create files | **CRITICAL** |
| `edit_file` | Apply diffs to files | **CRITICAL** |
| `shell` | Execute shell commands | **CRITICAL** |
| `search` | Grep/regex search in files | **CRITICAL** |
| `list_directory` | List files in a directory | **CRITICAL** |

### KEEP-OPTIONAL: Computer Controller (gated)

| Tool | Purpose | Harness Need |
|------|---------|--------------|
| `web_scrape` | HTTP fetch | Useful for web research |
| `automation_script` | Run platform scripts | Useful for automation |

### KEEP-OPTIONAL: Memory (gated)

| Tool | Purpose | Harness Need |
|------|---------|--------------|
| `remember_memory` | Store persistent data | Nice for long-term context |
| `retrieve_memories` | Recall stored data | Nice for long-term context |

### REMOVE: Visualization, Tutorial

| Tool | Why Remove |
|------|-----------|
| `render_*` (autovisualiser) | Charts not needed for coding harness |
| `load_tutorial` | Onboarding only |
| `xlsx_tool`, `docx_tool`, `pdf_tool` | Document processing; heavy deps |
| `cache` (computer controller) | File cache; not essential |

---

## Lean Workspace Cargo.toml

### Workspace-Level Configuration

```toml
# Cargo.toml (workspace root)
[workspace]
members = ["crates/goose", "crates/goose-server", "crates/goose-mcp", "crates/goose-sdk"]
resolver = "2"

[workspace.package]
version = "0.1.0"
edition = "2021"
rust-version = "1.80"
authors = ["Tripp Reason Team"]
license = "MIT"
repository = "https://github.com/tripp-reason/goose"
description = "Lean AI coding agent harness"

[workspace.dependencies]
# Core async
anyhow = "1.0"
tokio = { version = "1.43", features = ["full"] }
futures = "0.3"
async-trait = "0.1"
async-stream = "0.2"
tokio-stream = "0.1"
tokio-util = "0.7"

# HTTP
reqwest = { version = "0.12", default-features = false, features = ["json", "http2", "charset", "gzip"] }
axum = { version = "0.8", features = ["ws", "macros"] }
tower-http = { version = "0.6", features = ["cors"] }
http = "1.2"
bytes = "1.10"

# Serialization
serde = { version = "1.0", features = ["derive"] }
serde_json = "1.0"
serde_yaml = "0.9"

# LLM / MCP
rmcp = { version = "0.8", features = ["client", "transport-child-process", "transport-streamable-http-client"] }
agent-client-protocol = { git = "https://github.com/aaif-goose/agent-client-protocol", branch = "main" }
agent-client-protocol-schema = { git = "https://github.com/aaif-goose/agent-client-protocol", branch = "main" }

# Database
sqlx = { version = "0.8", default-features = false, features = ["sqlite", "chrono", "json", "macros", "runtime-tokio-rustls"] }

# Crypto / Security
sha2 = "0.10"
base64 = "0.22"
blake3 = "1.8"
jsonwebtoken = { version = "10.4", default-features = false, features = ["use_pem"] }
oauth2 = { version = "5.0", default-features = false }

# Templating
minijinja = { version = "2.20", features = ["loader"] }

# Tracing
tracing = "0.1"
tracing-subscriber = { version = "0.3", features = ["env-filter", "fmt"] }

# Misc
uuid = { version = "1.18", features = ["v7"] }
regex = "1.11"
chrono = { version = "0.4", features = ["serde"] }
clap = { version = "4.5", features = ["derive"] }
serde_urlencoded = "0.7"
url = "2.5"
rand = "0.9"
once_cell = "1.21"
thiserror = "2.0"
dirs = "6.0"
etcetera = "0.10"
tempfile = "3.19"
which = "7.0"
shell-words = "2.0"
ignore = "0.10"
rayon = "1.10"
indexmap = "2.14"
pulldown-cmark = "0.13"
encoding_rs = "0.8"
winapi = "0.3"
arboard = "3.5"
webbrowser = "1.1"
nanoid = "0.5"
schemars = { version = "0.8", features = ["derive"] }
jsonschema = "0.30"
tiktoken-rs = "0.11"
utoipa = { version = "5.3", features = ["chrono"] }
zip = "2.6"
fs2 = "0.4"

# TLS
rustls = { version = "0.23", features = ["aws_lc_rs"] }
```

### Core Crate: `crates/goose/Cargo.toml`

```toml
[package]
name = "goose"
version.workspace = true
edition.workspace = true
rust-version.workspace = true

[features]
default = ["rustls-tls", "builtin-developer"]

# --- ESSENTIAL (always keep) ---
rustls-tls = ["dep:rustls", "reqwest/rustls", "rmcp/reqwest", "oauth2/reqwest"]
native-tls = ["reqwest/native-tls", "rmcp/transport-streamable-http-client-reqwest", "oauth2/reqwest"]

# --- BUILT-IN MCP EXTENSIONS ---
builtin-developer = []      # Core coding tools (read, write, shell, search)
builtin-computer = [        # Web scrape, automation scripts
    "dep:reqwest",
]
builtin-memory = []         # Persistent memory
builtin-viz = []            # Chart rendering (heavy deps removed)

# --- OPTIONAL SUBSYSTEMS ---
system-keyring = ["dep:keyring"]
recipes = []                # Recipe/workflow templates
nostr = ["dep:nostr", "dep:nostr-sdk"]  # Social sharing
subagents = []              # Multi-agent execution

# --- REMOVED FROM LEAN BUILD ---
# aws-providers = [...]     # REMOVED
# local-inference = [...]   # REMOVED
# telemetry = []            # REMOVED
# otel = [...]              # REMOVED
# cuda = [...]              # REMOVED
# vulkan = [...]            # REMOVED

[dependencies]
# --- CORE (always required) ---
rmcp = { workspace = true }
oauth2 = { workspace = true }
anyhow = { workspace = true }
thiserror = { workspace = true }
futures = { workspace = true }
reqwest = { workspace = true }
tokio = { workspace = true }
serde = { workspace = true }
serde_json = { workspace = true }
serde_yaml = { workspace = true }
serde_urlencoded = { workspace = true }
async-trait = { workspace = true }
async-stream = { workspace = true }
tokio-stream = { workspace = true }
tokio-util = { workspace = true }
uuid = { workspace = true }
regex = { workspace = true }
chrono = { workspace = true }
minijinja = { workspace = true }
sha2 = { workspace = true }
base64 = { workspace = true }
url = { workspace = true }
axum = { workspace = true }
tracing = { workspace = true }
tracing-subscriber = { workspace = true }
jsonwebtoken = { workspace = true }
blake3 = { workspace = true }
serde_path_to_error = "0.1"
sqlx = { workspace = true }
rand = { workspace = true }
indexmap = { workspace = true }
pulldown-cmark = { workspace = true }
encoding_rs = { workspace = true }
schemars = { workspace = true }
jsonschema = { workspace = true }
tiktoken-rs = { workspace = true }
zip = { workspace = true }
fs2 = { workspace = true }
sys-info = "0.9"
dirs = { workspace = true }
etcetera = { workspace = true }
ignore = { workspace = true }
rayon = { workspace = true }
webbrowser = { workspace = true }
nanoid = { workspace = true }
shell-words = { workspace = true }
which = { workspace = true }
clap = { workspace = true }
once_cell = { workspace = true }
arboard = { workspace = true }
strum = { workspace = true }
indoc = { workspace = true }
http-body-util = "0.1"
tower-http = { workspace = true }
agent-client-protocol = { workspace = true }
agent-client-protocol-schema = { workspace = true }
# goose-acp-macros = { path = "../goose-acp-macros" }  # Keep if present
goose-sdk = { path = "../goose-sdk" }

# --- TLS ---
rustls = { workspace = true, optional = true }

# --- OPTIONAL ---
keyring = { version = "3.6", features = ["vendored"], optional = true }
nostr = { version = "0.44", features = ["nip44"], optional = true }
nostr-sdk = { version = "0.44", features = ["nip44"], optional = true }

# --- REMOVED ---
# aws-config = ...            # REMOVED
# aws-smithy-types = ...      # REMOVED
# aws-sdk-bedrockruntime = ... # REMOVED
# aws-sdk-sagemakerruntime = ... # REMOVED
# candle-core = ...           # REMOVED
# candle-nn = ...             # REMOVED
# candle-transformers = ...   # REMOVED
# llama-cpp-2 = ...           # REMOVED
# tokenizers = ...            # REMOVED
# symphonia = ...             # REMOVED
# rubato = ...                # REMOVED
# byteorder = ...             # REMOVED
# tracing-opentelemetry = ... # REMOVED
# opentelemetry = ...         # REMOVED
# opentelemetry_sdk = ...     # REMOVED
# opentelemetry-appender-tracing = ... # REMOVED
# opentelemetry-otlp = ...    # REMOVED
# opentelemetry-stdout = ...  # REMOVED
# pctx_code_mode = ...        # REMOVED (code-mode feature)

[dev-dependencies]
serial_test = "3.2"
mockall = "0.14"
tokio = { workspace = true }
dotenvy = { workspace = true }
wiremock = { workspace = true }
```

### Server Crate: `crates/goose-server/Cargo.toml` (Lean)

```toml
[package]
name = "goose-server"
version.workspace = true

[[bin]]
name = "goosed"
path = "src/main.rs"

[features]
default = ["rustls-tls"]
rustls-tls = [
    "reqwest/rustls",
    "axum-server/tls-rustls",
    "dep:rustls",
    "goose/rustls-tls",
]
native-tls = [
    "reqwest/native-tls",
    "axum-server/tls-openssl",
    "goose/native-tls",
]
builtin-developer = ["goose/builtin-developer"]
builtin-computer = ["goose/builtin-computer"]
builtin-memory = ["goose/builtin-memory"]
recipes = ["goose/recipes"]
nostr = ["goose/nostr"]

[dependencies]
goose = { path = "../goose", default-features = false }
rmcp = { workspace = true }
axum = { workspace = true, features = ["ws", "macros"] }
axum-server = "0.8"
tokio = { workspace = true }
chrono = { workspace = true }
tower-http = { workspace = true, features = ["cors"] }
serde = { workspace = true }
serde_json = { workspace = true, features = ["preserve_order"] }
futures = { workspace = true }
tracing = { workspace = true }
tracing-subscriber = { workspace = true }
tokio-stream = { workspace = true }
anyhow = { workspace = true }
bytes = { workspace = true }
http = { workspace = true }
base64 = { workspace = true }
thiserror = { workspace = true }
clap = { workspace = true }
serde_yaml = { workspace = true }
reqwest = { workspace = true, features = ["json"] }
tokio-util = { workspace = true }
url = { workspace = true }
rand = { workspace = true }
hex = "0.4"
subtle = "2.6"
rcgen = "0.14"
pem = "3.0"
rustls = { workspace = true, optional = true }

# --- REMOVED ---
# tokio-tungstenite = ...     # REMOVED (WebSocket not needed for lean)
# tokio-cron-scheduler = ...  # REMOVED (scheduler removed)
# config = ...                # REMOVED (use goose config directly)
# OpenTelemetry deps ...      # REMOVED
# Telemetry deps ...          # REMOVED
# AWS deps ...                # REMOVED
# Local inference deps ...    # REMOVED
```

### MCP Crate: `crates/goose-mcp/Cargo.toml` (Lean)

```toml
[package]
name = "goose-mcp"
version.workspace = true

[features]
rustls-tls = ["reqwest/rustls"]
native-tls = ["reqwest/native-tls"]

[dependencies]
rmcp = { workspace = true, features = ["server", "client", "macros"] }
anyhow = { workspace = true }
tokio = { workspace = true }
tracing = { workspace = true }
tracing-subscriber = { workspace = true }
url = { workspace = true }
base64 = { workspace = true }
serde = { workspace = true }
serde_json = { workspace = true }
schemars = { workspace = true }
indoc = { workspace = true }
reqwest = { workspace = true, features = ["json"] }
chrono = { workspace = true }
etcetera = { workspace = true }
tempfile = { workspace = true }
include_dir = { workspace = true }
once_cell = { workspace = true }
shell-words = { workspace = true }
process-wrap = { version = "9.1", features = ["std"] }

# --- REMOVED (computer controller deps) ---
# lopdf = "0.40"              # REMOVED
# docx-rs = "0.4"             # REMOVED
# image = { version = "0.25", features = ["jpeg"] }  # REMOVED
# umya-spreadsheet = "2.2"    # REMOVED
```

### SDK Crate: `crates/goose-sdk/Cargo.toml` (Unchanged -- Already Minimal)

```toml
[package]
name = "goose-sdk"
version.workspace = true

description = "Rust SDK for talking to Goose over the Agent Client Protocol (ACP)"

[dependencies]
agent-client-protocol = { workspace = true }
agent-client-protocol-schema = { workspace = true }
serde = { workspace = true, features = ["derive"] }
serde_json = { workspace = true }
schemars = { workspace = true, features = ["derive"] }
```

---

## Feature Flag Strategy

### Default Features

```toml
default = ["rustls-tls", "builtin-developer"]
```

### Build Profiles

| Profile | Features | Use Case |
|---------|----------|----------|
| **Minimal** | `rustls-tls` | Library-only, no built-ins; all tools via external MCP |
| **Standard** | `rustls-tls, builtin-developer` | Coding harness with developer tools |
| **Full** | `rustls-tls, builtin-developer, builtin-computer, builtin-memory, recipes` | Rich feature set, still lean |

### Per-Profile Compile Estimates

| Profile | Est. Direct Deps | Est. Compile Time | Binary Size |
|---------|-----------------|-------------------|-------------|
| **Minimal** | ~35 | ~2 min | ~15 MB |
| **Standard** | ~40 | ~2.5 min | ~18 MB |
| **Full** | ~50 | ~3.5 min | ~25 MB |
| **Original** | ~80+ | ~8-12 min | ~50+ MB |

---

## How the Agent Aspect Works

### For Someone Building on Top

The **Agent** is the core intelligence. Here's how to use it:

#### 1. Creating an Agent

```rust
use goose::agents::{Agent, AgentConfig, ExtensionConfig};
use goose::providers;
use goose::config::Config;
use std::sync::Arc;

// Create a provider
let provider = providers::create(
    "openai",           // provider name
    model_config,       // ModelConfig with model name, context limits
    extensions,         // Vec<ExtensionConfig>
).await?;

// Create agent config
let agent_config = AgentConfig {
    session_manager: Arc::new(session_manager),
    permission_manager: Arc::new(permission_manager),
    scheduler_service: None,     // No scheduler
    goose_mode: GooseMode::Auto, // Auto-approve tools
    goose_platform: GoosePlatform::GooseCli,
    // ... other fields
};

// Create the agent
let agent = Agent::new(provider, agent_config);
```

#### 2. Loading Extensions

```rust
// Load the developer extension (core coding tools)
let ext = ExtensionConfig::Builtin {
    name: "developer".to_string(),
    display_name: Some("Developer".to_string()),
    builtin: "developer".to_string(),
};
agent.add_extension(ext).await?;

// Load an external MCP server via stdio
let mcp_ext = ExtensionConfig::Stdio {
    name: "filesystem".to_string(),
    cmd: "mcp-filesystem-server".to_string(),
    args: vec![],
    envs: Envs::default(),
    timeout: 30,
};
agent.add_extension(mcp_ext).await?;
```

#### 3. Sending a Message (Streaming)

```rust
use goose::agents::AgentEvent;
use goose::conversation::message::Message;
use goose::session::SessionConfig;

let user_message = Message::user().with_text("Write a Rust function to parse JSON");
let session_config = SessionConfig::new(session_id.clone());

// Get a streaming response
let mut stream = agent.reply(user_message, session_config, None).await?;

// Process events
while let Some(event) = stream.next().await {
    match event {
        Ok(AgentEvent::Message(message)) => {
            // Extract text content
            for content in &message.content {
                if let Some(text) = content.as_text() {
                    println!("{}", text);
                }
                if content.is_tool_request() {
                    // Tool will be executed automatically in Auto mode
                    println!("[Tool requested]");
                }
            }
        }
        Ok(AgentEvent::McpNotification((id, notif))) => {
            // MCP server sent a notification
        }
        Ok(AgentEvent::HistoryReplaced(conv)) => {
            // Conversation was compacted/summarized
        }
        Err(e) => eprintln!("Error: {}", e),
    }
}
```

#### 4. Key Agent Behaviors

| Behavior | Description | Control |
|----------|-------------|---------|
| Multi-turn loop | Agent continues calling tools until done | `max_turns` config (default 1000) |
| Auto-compact | Summarizes conversation at 80% context | Automatic |
| Tool inspection | Security, egress, permission, repetition checks | Always on |
| SmartApprove | LLM-based tool approval | `GooseMode::SmartApprove` |
| MOIM injection | Multi-objective intent management | Automatic |
| Slash commands | `/compact`, `/clear`, etc. | Pre-message check |

---

## How the Harness Aspect Works

### The MCP Harness

The MCP Harness (`evals/open-model-gym/mcp-harness/`) is a **separate Node.js project** that provides mock tools for testing. It's not part of the lean build.

**Connection to goose:**
```
Goose CLI
  --> Loads MCP harness as stdio extension via --with-extension
  --> Harness provides fake tools (gdrive, slack, jira, etc.)
  --> Agent calls tools, gets realistic mock responses
  --> Tool calls logged to tool-calls.log
```

**For a lean harness**: Use the MCP harness only in test/CI contexts. Production harness connects to real MCP servers.

### The Evaluation Harness

The evaluation harness (`evals/open-model-gym/`) runs test matrices:

```
Config (models x runners x scenarios)
  --> Runner executes each combination
  --> Validates results (file_exists, tool_called, etc.)
  --> Generates report.html
```

**For a lean harness**: Keep evals external. They invoke the goose binary, not the library.

### The LEAN Server Harness

The lean server (`goosed` binary) provides:

```
POST /agent/start     -- Create session + start agent
POST /reply           -- SSE stream of agent responses
GET  /agent/tools     -- List available tools
POST /agent/call_tool -- Direct tool invocation
GET  /sessions        -- List sessions
```

**Minimal server startup:**
```bash
# Set provider
echo 'GOOSE_PROVIDER: openai' >> ~/.config/goose/config.yaml
echo 'OPENAI_API_KEY: sk-...' >> ~/.config/goose/secrets.yaml

# Start server
cargo run -p goose-server --bin goosed

# Server listens on https://127.0.0.1:3000 with self-signed cert
```

---

## Connection Points for External Agents

### 1. ACP HTTP Server (Recommended)

The **Agent Client Protocol** is the cleanest integration point.

```bash
# Start the ACP server
cargo run -p goose-cli -- serve --host 127.0.0.1 --port 8080
```

**External agent (OpenClaw / Hermes) connects via:**
```
HTTP POST http://127.0.0.1:8080/acp/v1/methods
  Headers: x-secret-key: <generated-key>
  Body: JSON-RPC 2.0 requests
```

**ACP Methods Available:**
```
ap.initialize          -- Initialize session with extensions
ap.methods/list        -- List available MCP methods (tools)
ap.methods/call        -- Call a tool
ap.prompts/list        -- List available prompts
ap.prompts/get         -- Get a prompt
ap.resources/list      -- List available resources
ap.resources/read      -- Read a resource
ap.context/get         -- Get current context
ap.context/update      -- Update context
```

### 2. SSE Streaming (Real-time)

For streaming responses, connect to the main server:

```typescript
// TypeScript example
const eventSource = new EventSource('https://127.0.0.1:3000/reply', {
  headers: { 'x-secret-key': secretKey }
});

eventSource.onmessage = (event) => {
  const msg = JSON.parse(event.data);
  switch (msg.type) {
    case 'Message':
      console.log(msg.message);      // Assistant response chunk
      break;
    case 'Finish':
      console.log('Done:', msg.reason);
      eventSource.close();
      break;
    case 'Error':
      console.error(msg.error);
      break;
  }
};
```

### 3. Direct Library Embedding (Rust Only)

```rust
use goose::agents::{Agent, AgentConfig};
use goose::providers;

#[tokio::main]
async fn main() -> anyhow::Result<()> {
    // Create agent
    let agent = create_agent_with_provider("anthropic").await?;

    // Use agent directly
    let stream = agent.reply(message, config, None).await?;

    // Process stream...
}
```

### 4. MCP Server Integration

Any MCP-compatible client can connect:

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

---

## Minimal Runtime Architecture

```
+-------------------+        HTTP/SSE        +------------------+
|   External Agent  | <------------------->  |  goosed (lean)   |
| (OpenClaw/Hermes) |    x-secret-key auth   |                  |
|                   |                        |  +------------+  |
|   ui/sdk (TS)     |                        |  | Axum Router|  |
|   or              |                        |  +------------+  |
|   Direct Rust lib |                        |       |          |
+-------------------+                        |  +----v-----+    |
                                             |  | Agent    |    |
                                             |  | Manager  |    |
                                             |  +----|-----+    |
                                             |       |          |
                                             |  +----v------+   |
                                             |  |  Agent    |   |
                                             |  |  (core)   |   |
                                             |  +----+------+   |
                                             |       |          |
                        +--------------------+       |          |
                        |                            |          |
              +---------v----------+      +----------v------+  |
              | LLM Provider       |      | MCP Extensions  |  |
              | (OpenAI/Anthropic/ |      | (developer +    |  |
              |  OpenRouter/Ollama)|      |  user-defined)  |  |
              +--------------------+      +-----------------+  |
                                                              |
              +--------------------+      +------------------+ |
              | Config             |      | SessionManager   | |
              | (~/.config/goose/) |      | (SQLite)         | |
              +--------------------+      +------------------+ |
                                                               |
              +--------------------+                           |
              | PermissionManager  |                           |
              | (tool approvals)   |                           |
              +--------------------+                           |
                                                               |
              +--------------------+                           |
              | Token Counter      |                           |
              | (context mgmt)     |                           |
              +--------------------+                           |
+--------------------------------------------------------------+
```

---

## Implementation Roadmap

### Phase 1: Core Deletion (Week 1)

1. Remove AWS provider modules and `aws-providers` feature
2. Remove local inference modules and `local-inference` feature
3. Remove telemetry (`posthog`) module and `telemetry` feature
4. Remove OpenTelemetry modules and `otel` feature
5. Remove 22+ non-essential provider modules
6. Remove gateway module (Telegram)
7. Remove tutorial built-in MCP server
8. Remove autovisualiser (or gate behind `builtin-viz`)
9. Remove computer controller document tools (xlsx, docx, pdf)
10. Remove Nostr SDK dependency
11. Remove `tokio-cron-scheduler` dependency

### Phase 2: Refactoring (Week 2)

1. Make `HookManager` in `Agent` optional (`Option<HookManager>`)
2. Make `scheduler_service` fully optional with `#[cfg]`
3. Gate `recipe` support in `AppState`
4. Gate `gateway_manager` in `AppState`
5. Remove provider-specific OAuth modules for removed providers
6. Consolidate format converters (keep only openai + anthropic)
7. Update provider initialization to only register kept providers
8. Update `routes/mod.rs` to only register available routes

### Phase 3: Server Minimization (Week 3)

1. Strip server to essential routes only:
   - `agent` (start, stop, tools, call_tool)
   - `reply` (SSE streaming)
   - `session` (CRUD)
   - `status` (health check)
2. Remove WebSocket dependencies if MCP proxy not needed
3. Remove `tokio-tungstenite` dependency
4. Simplify auth to secret-key only
5. Remove API key auth system

### Phase 4: Validation (Week 4)

1. Run existing tests with lean features
2. Build and test the server binary
3. Test ACP protocol integration
4. Test SSE streaming with external client
5. Benchmark compile time and binary size
6. Document the lean build process

---

## Quick Start: Lean Build Commands

```bash
# 1. Clone repository
git clone https://github.com/tripp-reason/goose.git
cd goose

# 2. Build minimal library (no built-ins)
cargo build -p goose --no-default-features --features rustls-tls

# 3. Build standard server (with developer tools)
cargo build -p goose-server --features builtin-developer

# 4. Build full server (all optional features)
cargo build -p goose-server --features "builtin-developer,builtin-computer,builtin-memory,recipes"

# 5. Run tests for lean build
cargo test -p goose --no-default-features --features rustls-tls
cargo test -p goose-server --features builtin-developer

# 6. Run the server
cargo run -p goose-server --bin goosed

# 7. Connect via curl
curl -k -H "x-secret-key: <key>" \
  -H "Content-Type: application/json" \
  -d '{"working_dir":"/tmp/test"}' \
  https://127.0.0.1:3000/agent/start
```

---

## Expected Outcomes

| Metric | Original | Lean | Improvement |
|--------|----------|------|-------------|
| Direct dependencies | ~80+ | ~35-40 | **50-56% reduction** |
| Compile time (clean) | 8-12 min | 2-3.5 min | **60-70% faster** |
| Binary size | ~50+ MB | ~15-25 MB | **50-70% smaller** |
| Provider count | 30+ | 5 | **83% reduction** |
| Feature flags | 11 | 6 | **45% reduction** |
| MCP built-ins | 4 | 1-2 | **50-75% reduction** |
| Lines of code | ~15,000+ | ~5,000-7,000 | **50-65% reduction** |

---

## Risk Assessment

| Risk | Likelihood | Impact | Mitigation |
|------|-----------|--------|------------|
| Missing routes needed by desktop | Medium | High | Test desktop against lean server; add back if needed |
| Provider removal breaks users | Low | Medium | OpenRouter covers most removed providers |
| Recipe system removal breaks workflows | Low | Medium | Gate behind feature flag, don't fully delete |
| Session format incompatibility | Low | High | Keep SQLite schema unchanged |
| MCP tool compatibility | Low | Medium | Developer tools remain unchanged |
| ACP protocol changes | Low | High | SDK crate is separate, version independently |

---

*This design enables a force-multiplying harness: OpenClaw or Hermes can connect via ACP, stream via SSE, and leverage goose's developer tools while the core remains lean and fast.*
