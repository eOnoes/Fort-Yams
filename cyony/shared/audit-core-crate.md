# Comprehensive Technical Audit: `goose` Core Crate

## Tripp.reason (goose) AI Coding Agent Framework

**Audit Date:** June 2025
**Crate Path:** `/mnt/agents/output/tripp-audit/crates/goose/`
**Scope:** All source files in `src/` directory

---

## Table of Contents

1. [Crate Overview](#1-crate-overview)
2. [Feature Flags](#2-feature-flags)
3. [Complete Model/Provider List](#3-complete-modelprovider-list)
4. [Agent Architecture](#4-agent-architecture)
5. [Configuration System](#5-configuration-system)
6. [Conversation & Session Management](#6-conversation--session-management)
7. [Permission System](#7-permission-system)
8. [Recipe System](#8-recipe-system)
9. [Skills System](#9-skills-system)
10. [Hooks System](#10-hooks-system)
11. [Gateway](#11-gateway)
12. [Token Counter & Embedding](#12-token-counter--embedding)
13. [Security Architecture](#13-security-architecture)
14. [Module Index](#14-module-index)

---

## 1. Crate Overview

The `goose` crate is the **core engine** of the Tripp.reason AI coding agent framework. It provides the complete infrastructure for AI agent operation including:

- **LLM Provider Abstraction** - Unified interface to 20+ LLM providers (OpenAI, Anthropic, Google, AWS Bedrock, Databricks, Ollama, OpenRouter, Azure, etc.)
- **Agent Orchestration** - Multi-turn conversation loop with tool use, reasoning, and recovery
- **Extension Management** - Dynamic MCP (Model Context Protocol) extension loading
- **Session & Conversation Management** - Persistent chat sessions with SQLite backend
- **Permission System** - Multi-layer tool approval with SmartApprove mode
- **Configuration** - YAML-based config with keyring secret storage
- **Recipe System** - Parameterized workflow templates
- **Skills System** - `SKILL.md`-based agent capability discovery
- **Hooks System** - Plugin lifecycle event system
- **Gateway** - Telegram bot integration for remote access

### Crate Metadata (`Cargo.toml`)

```toml
[package]
name = "goose"
version.workspace = true  # Inherited from workspace
edition.workspace = true
rust-version.workspace = true
authors.workspace = true
license.workspace = true
repository.workspace = true
description.workspace = true
```

### Dependencies Summary

The crate has **~80+ direct dependencies** including:

- **HTTP/Networking:** `reqwest`, `axum`, `tower-http`, `oauth2`
- **Serialization:** `serde`, `serde_json`, `serde_yaml`, `serde_urlencoded`
- **Async Runtime:** `tokio`, `futures`, `async-trait`, `async-stream`
- **LLM/MCP:** `rmcp` (Model Context Protocol)
- **AWS (optional):** `aws-config`, `aws-sdk-bedrockruntime`, `aws-sdk-sagemakerruntime`
- **Database:** `sqlx` (SQLite)
- **Crypto/Security:** `sha2`, `base64`, `blake3`, `jsonwebtoken`
- **Templating:** `minijinja`
- **OpenTelemetry (optional):** `opentelemetry`, `tracing-opentelemetry`
- **Local Inference (optional):** `candle-core`, `llama-cpp-2`, `tokenizers`
- **Unique:** `nostr`, `nostr-sdk` (Nostr protocol integration)

---

## 2. Feature Flags

### Complete Feature Flag Reference

| Feature Flag | Default | Description |
|--------------|---------|-------------|
| `code-mode` | Yes | Enables `pctx_code_mode` dependency for code-specific operations |
| `local-inference` | Yes | Enables local LLM inference via Candle/llama.cpp (Whisper transcription, local models) |
| `aws-providers` | Yes | Enables AWS Bedrock and SageMaker TGI providers |
| `telemetry` | Yes | Enables PostHog telemetry (empty feature, just a toggle) |
| `otel` | Yes | Enables OpenTelemetry tracing and metrics |
| `rustls-tls` | Yes | Uses rustls for TLS (mutually exclusive with `native-tls`) |
| `native-tls` | No | Uses native TLS (mutually exclusive with `rustls-tls`) |
| `cuda` | No | Enables CUDA acceleration for local inference |
| `vulkan` | No | Enables Vulkan acceleration for local inference |
| `system-keyring` | Yes | Uses OS keyring for secret storage |
| `portable-default` | No | Portable defaults: `rustls-tls` + `aws-providers` + `telemetry` + `otel` |

### Feature Flag Interactions

```rust
// From lib.rs - Compile-time checks:
#[cfg(not(any(feature = "rustls-tls", feature = "native-tls")))]
compile_error!("At least one of `rustls-tls` or `native-tls` features must be enabled");

#[cfg(all(feature = "rustls-tls", feature = "native-tls"))]
compile_error!("Features `rustls-tls` and `native-tls` are mutually exclusive");
```

### Module Gating by Features

```rust
// lib.rs
#[cfg(feature = "otel")]
pub mod otel;

#[cfg(feature = "telemetry")]
pub mod posthog;
```

```rust
// providers/mod.rs
#[cfg(feature = "aws-providers")]
pub mod bedrock;

#[cfg(feature = "aws-providers")]
pub mod sagemaker_tgi;

#[cfg(feature = "local-inference")]
pub mod local_inference;
```

---

## 3. Complete Model/Provider List

### 3.1 Provider Module Structure (`providers/mod.rs`)

The provider system is the most extensive module in the crate, with 30+ provider implementations:

```rust
// providers/mod.rs - Complete module listing
mod acp_tooling;
pub mod amp_acp;
pub mod anthropic;           // Anthropic Claude API
pub mod api_client;
pub mod avian;
pub mod azure;               // Azure OpenAI
pub mod azureauth;
pub mod base;                // Provider trait definitions
#[cfg(feature = "aws-providers")]
pub mod bedrock;             // AWS Bedrock
pub mod canonical;
pub mod catalog;
pub mod chatgpt_codex;
pub mod claude_acp;
pub mod claude_code;
pub mod codex;
pub mod codex_acp;
pub mod copilot_acp;
pub mod cursor_agent;
pub mod databricks;          // Databricks Model Serving
pub mod embedding;           // Embedding trait
pub mod errors;
pub mod formats;             // API format converters
mod gcpauth;
pub mod gcpvertexai;         // Google Cloud Vertex AI
pub mod gemini_cli;
pub mod gemini_oauth;
pub mod githubcopilot;
pub mod google;              // Google Gemini API
pub mod http_status;
mod init;                    // Provider initialization
pub mod inventory;
pub mod kimicode;
pub mod litellm;             // LiteLLM proxy
#[cfg(feature = "local-inference")]
pub mod local_inference;     // Local model inference
pub mod nanogpt;
pub mod oauth;
pub mod oauth_device_flow;
pub mod ollama;              // Ollama local server
pub mod openai;              // OpenAI API
pub mod openai_compatible;   // Generic OpenAI-compatible
pub mod openrouter;          // OpenRouter.ai
pub mod pi_acp;
pub mod provider_registry;
pub mod provider_test;
mod retry;
#[cfg(feature = "aws-providers")]
pub mod sagemaker_tgi;       // AWS SageMaker TGI
pub mod snowflake;
pub mod testprovider;
pub mod tetrate;
pub mod toolshim;
pub mod usage_estimator;
pub mod utils;
pub mod xai;                 // xAI/Grok
```

### 3.2 Provider Initialization API

```rust
pub use init::{
    cleanup_provider,
    create,                        // Create provider from config
    create_with_default_model,     // Create with default model
    create_with_named_model,       // Create with specific model name
    create_with_working_dir,       // Create with working directory
    get_from_registry,             // Get provider from registry
    inventory_identity,            // Get provider inventory
    providers,                     // List available providers
    refresh_custom_providers,      // Refresh custom provider list
};
```

### 3.3 Supported Providers (30+)

| # | Provider | Module | Description |
|---|----------|--------|-------------|
| 1 | **OpenAI** | `openai` | GPT-4o, GPT-4, GPT-3.5-turbo, o1, o3, etc. |
| 2 | **Anthropic** | `anthropic` | Claude 3/3.5/4 Opus/Sonnet/Haiku |
| 3 | **Google** | `google` | Gemini 2.5 Pro/Flash, Gemini 3 |
| 4 | **Azure OpenAI** | `azure` | Azure-hosted OpenAI models |
| 5 | **AWS Bedrock** | `bedrock` | Claude, Llama, etc. via Bedrock |
| 6 | **Databricks** | `databricks` | Databricks Model Serving |
| 7 | **Ollama** | `ollama` | Local models via Ollama server |
| 8 | **OpenRouter** | `openrouter` | Unified API for 100+ models |
| 9 | **Google Vertex AI** | `gcpvertexai` | GCP-hosted models |
| 10 | **SageMaker TGI** | `sagemaker_tgi` | HuggingFace TGI on AWS |
| 11 | **LiteLLM** | `litellm` | LiteLLM proxy gateway |
| 12 | **GitHub Copilot** | `githubcopilot` | Copilot models |
| 13 | **Codex** | `codex` | OpenAI Codex CLI integration |
| 14 | **Claude Code** | `claude_code` | Anthropic Claude Code CLI |
| 15 | **Gemini CLI** | `gemini_cli` | Google Gemini CLI |
| 16 | **Cursor Agent** | `cursor_agent` | Cursor IDE agent |
| 17 | **ChatGPT Codex** | `chatgpt_codex` | ChatGPT Codex mode |
| 18 | **xAI/Grok** | `xai` | Grok models |
| 19 | **NanoGPT** | `nanogpt` | NanoGPT models |
| 20 | **Tetrate** | `tetrate` | Tetrate models |
| 21 | **Snowflake** | `snowflake` | Snowflake Cortex |
| 22 | **Avian** | `avian` | Avian provider |
| 23 | **Kimi Code** | `kimicode` | Moonshot Kimi |
| 24 | **Pi ACP** | `pi_acp` | Pi assistant |
| 25 | **Local Inference** | `local_inference` | Candle/llama.cpp local inference |
| 26 | **OpenAI Compatible** | `openai_compatible` | Generic OpenAI-compatible endpoints |
| 27 | **AMP ACP** | `amp_acp` | Amazon AMP |
| 28 | **Claude ACP** | `claude_acp` | Claude ACP |
| 29 | **Copilot ACP** | `copilot_acp` | Copilot ACP |
| 30 | **Codex ACP** | `codex_acp` | Codex ACP |

### 3.4 Provider Format Converters (`providers/formats/`)

The format converters translate between goose's internal message format and each provider's API format:

```rust
// providers/formats/mod.rs
pub mod anthropic;          // Anthropic Messages API format
#[cfg(feature = "aws-providers")]
pub mod bedrock;            // AWS Bedrock Converse API
pub mod databricks;         // Databricks OpenAI-compatible + Claude
pub mod gcpvertexai;        // Vertex AI format
pub mod google;             // Google Gemini API format
pub mod ollama;             // Ollama (OpenAI-compatible + XML fallback)
pub mod openai;             // OpenAI Chat Completions format
pub mod openai_responses;   // OpenAI Responses API
pub mod openrouter;         // OpenRouter (OpenAI + reasoning)
pub mod snowflake;          // Snowflake Cortex
```

### 3.5 Embedding Support (`providers/embedding.rs`)

```rust
#[async_trait]
pub trait EmbeddingCapable {
    async fn create_embeddings(
        &self,
        session_id: &str,
        texts: Vec<String>,
    ) -> Result<Vec<Vec<f32>>>;
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct EmbeddingRequest {
    pub input: Vec<String>,
    pub model: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct EmbeddingResponse {
    pub data: Vec<EmbeddingData>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct EmbeddingData {
    pub embedding: Vec<f32>,
}
```

---

## 4. Agent Architecture

### 4.1 Agent Module Structure (`agents/mod.rs`)

```rust
mod agent;                          // Core Agent implementation
pub mod container;                  // Docker container support
pub mod execute_commands;           // Built-in slash commands
pub mod extension;                  // Extension config types
pub mod extension_malware_check;    // Malware scanning for extensions
pub mod extension_manager;          // Extension lifecycle management
pub mod final_output_tool;          // Structured output tool
mod large_response_handler;         // Response truncation
pub mod mcp_client;                 // MCP client wrapper
pub mod moim;                       // Multi-objective intent management
pub mod platform_extensions;        // Built-in platform extensions
pub mod platform_tools;             // Platform-level tools
pub mod prompt_manager;             // System prompt management
pub mod reply_parts;                // Response chunking
pub mod retry;                      // Retry logic
mod schedule_tool;                  // Scheduling tools
pub mod subagent_execution_tool;    // Sub-agent tool
pub(crate) mod subagent_handler;
pub(crate) mod subagent_task_config;
mod tool_confirmation_router;       // Tool approval routing
mod tool_execution;                 // Tool call execution
pub mod types;                      // Agent types
pub mod validate_extensions;
```

### 4.2 Core Agent Struct (`agents/agent.rs`)

```rust
/// The main goose Agent
pub struct Agent {
    pub(super) provider: SharedProvider,                    // LLM provider
    pub config: AgentConfig,                                 // Agent configuration
    pub(super) current_goose_mode: Mutex<GooseMode>,        // Current mode

    pub extension_manager: Arc<ExtensionManager>,           // Extension lifecycle
    pub(super) final_output_tool: Arc<Mutex<Option<FinalOutputTool>>>,
    pub(super) frontend_extensions: Mutex<HashMap<String, ExtensionConfig>>,
    pub(super) frontend_tools: Mutex<HashMap<String, FrontendTool>>,
    pub(super) frontend_instructions: Mutex<Option<String>>,
    pub(super) prompt_manager: Mutex<PromptManager>,
    pub tool_confirmation_router: ToolConfirmationRouter,
    pub(super) tool_result_tx: mpsc::Sender<(String, ToolResult<CallToolResult>)>,
    pub(super) tool_result_rx: ToolResultReceiver,

    pub(super) retry_manager: RetryManager,
    pub(super) tool_inspection_manager: ToolInspectionManager,
    pub(super) hook_manager: crate::hooks::HookManager,
    container: Mutex<Option<Container>>,
    goal: Mutex<Option<String>>,
    grind: Mutex<Option<String>>,
}
```

### 4.3 Agent Configuration

```rust
pub struct AgentConfig {
    pub session_manager: Arc<SessionManager>,
    pub permission_manager: Arc<PermissionManager>,
    pub scheduler_service: Option<Arc<dyn SchedulerTrait>>,
    pub goose_mode: GooseMode,                        // Chat|Auto|Approve|SmartApprove
    pub disable_session_naming: bool,
    pub goose_platform: GoosePlatform,                // GooseDesktop|GooseCli
    pub mcp_host_info: Option<GooseMcpHostInfo>,
    pub session_name_update_tx: Option<mpsc::UnboundedSender<SessionNameUpdate>>,
    pub use_login_shell_path: Option<bool>,
}
```

### 4.4 Agent Events

```rust
#[derive(Clone, Debug)]
pub enum AgentEvent {
    Message(Message),                                    // Chat message
    McpNotification((String, ServerNotification)),       // MCP server notification
    HistoryReplaced(Conversation),                       // Conversation was replaced
}
```

### 4.5 Agent Lifecycle - Reply Flow

The agent's core method is `reply()`, which implements a multi-turn agent loop:

```
User Message
  |
  v
[Hook: UserPromptSubmit] --> Check slash commands (/compact, /clear)
  |
  v
[Auto-compact check] --> If conversation > threshold, compact messages
  |
  v
[reply_internal] --> Prepare tools, system prompt, conversation
  |
  v
[Multi-turn loop]:
  1. Inject MOIM (Multi-Objective Intent Management)
  2. Stream response from LLM provider
  3. Categorize tool requests (frontend vs backend)
  4. Run tool inspections (security, egress, permission, repetition)
  5. Handle approved/denied/needs-approval tools
  6. Execute tools, collect results
  7. Drain elicitation messages
  8. Check for final output / goal completion
  9. Check max turns limit (default: 1000)
  10. Loop back to step 1
```

### 4.6 Tool Categories

```rust
#[derive(Debug, Clone, Copy, PartialEq, Eq)]
enum ToolCategory {
    Shell,
    Read,
    Write,
    Other,
}

fn categorize_tool(tool_name: &str) -> ToolCategory {
    let local = tool_name.rsplit("__").next().unwrap_or(tool_name);
    match local {
        "shell" | "bash" | "exec" | "run" => ToolCategory::Shell,
        "read" | "view" | "cat" | "read_file" => ToolCategory::Read,
        "write" | "edit" | "patch" | "write_file" | "edit_file" => ToolCategory::Write,
        _ => ToolCategory::Other,
    }
}
```

### 4.7 Tool Dispatch

```rust
pub async fn dispatch_tool_call(
    &self,
    tool_call: CallToolRequestParams,
    request_id: String,
    cancellation_token: Option<CancellationToken>,
    session: &Session,
) -> (String, Result<ToolCallResult, ErrorData>) {
    // 1. Pre-tool hook check (can deny)
    // 2. Extended hooks (BeforeShellExecution, BeforeReadFile)
    // 3. Schedule management tool handling
    // 4. Final output tool handling
    // 5. Frontend tool detection
    // 6. Extension manager dispatch
    // 7. Post-tool hook invocation
}
```

### 4.8 Tool Inspection Pipeline

The agent runs a **4-stage inspection pipeline** on all tool calls:

1. **Security Inspector** - Checks for dangerous operations
2. **Egress Inspector** - Network/data egress detection
3. **Adversary Inspector** - LLM-based adversarial review (enabled via `~/.config/goose/adversary.md`)
4. **Permission Inspector** - User permission checking with SmartApprove
5. **Repetition Inspector** - Detects repetitive tool call patterns

```rust
fn create_tool_inspection_manager(
    permission_manager: Arc<PermissionManager>,
    provider: SharedProvider,
) -> ToolInspectionManager {
    let mut tool_inspection_manager = ToolInspectionManager::new();
    tool_inspection_manager.add_inspector(Box::new(SecurityInspector::new()));
    tool_inspection_manager.add_inspector(Box::new(EgressInspector::new()));
    tool_inspection_manager.add_inspector(Box::new(AdversaryInspector::new(provider.clone())));
    tool_inspection_manager.add_inspector(Box::new(PermissionInspector::new(
        permission_manager, provider,
    )));
    tool_inspection_manager.add_inspector(Box::new(RepetitionInspector::new(None)));
    tool_inspection_manager
}
```

---

## 5. Configuration System

### 5.1 Config Module Structure (`config/mod.rs`)

```rust
pub mod base;                       // Core Config struct
pub mod declarative_providers;      // Provider YAML configs
mod experiments;                    // Feature experiments
pub mod extensions;                 // Extension configuration
pub mod goose_mode;                 // GooseMode enum
mod migrations;                     // Config migration
pub mod paths;                      // File system paths
pub mod permission;                 // Permission settings
pub mod providers;                  // Provider configuration
pub mod search_path;                // Extension search paths
pub mod signup_nanogpt;             // NanoGPT signup flow
pub mod signup_openrouter;          // OpenRouter signup flow
pub mod signup_tetrate;             // Tetrate signup flow
```

### 5.2 Config Structure (`config/base.rs`)

```rust
pub struct Config {
    config_paths: Vec<PathBuf>,      // Ordered list of config files to merge
    secrets: SecretStorage,          // Keyring or file-based secrets
    guard: Mutex<()>,                // Write-lock guard
    secrets_cache: Arc<Mutex<Option<HashMap<String, Value>>>>,
}

enum SecretStorage {
    #[cfg(feature = "system-keyring")]
    Keyring { service: String },
    File { path: PathBuf },
}
```

### 5.3 Configuration Precedence

```
1. Environment variables (UPPERCASE key match)    <-- HIGHEST
2. User config file (~/.config/goose/config.yaml)
3. Additional config files (GOOSE_ADDITIONAL_CONFIG_FILES)
4. System config (/etc/goose/config.yaml)          <-- LOWEST
```

### 5.4 Secret Storage Precedence

```
1. Environment variables (exact key match)         <-- HIGHEST
2. System keyring (unless GOOSE_DISABLE_KEYRING)
3. File fallback (~/.config/goose/secrets.yaml)    <-- LOWEST
```

### 5.5 Key Configuration Values

```rust
config_value!(CLAUDE_CODE_COMMAND, String, "claude");
config_value!(GEMINI_CLI_COMMAND, String, "gemini");
config_value!(CURSOR_AGENT_COMMAND, String, "cursor-agent");
config_value!(CODEX_COMMAND, String, "codex");
config_value!(GOOSE_MODE, GooseMode);
config_value!(GOOSE_PROMPT_EDITOR, Option<String>);
config_value!(GOOSE_PROMPT_EDITOR_ALWAYS, Option<bool>);
config_value!(GOOSE_MAX_ACTIVE_AGENTS, usize);
config_value!(GOOSE_DISABLE_SESSION_NAMING, bool);
config_value!(GOOSE_DISABLE_TOOL_CALL_SUMMARY, bool);
config_value!(GOOSE_THINKING_EFFORT, String);
config_value!(GOOSE_DEFAULT_EXTENSION_TIMEOUT, u64);
```

### 5.6 Agent Capability Config

```rust
#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize)]
pub struct AgentCapabilityConfig {
    #[serde(default)]
    pub swarm_enabled: bool,                // Multi-agent swarms
    #[serde(default)]
    pub map_reduce_enabled: bool,           // Map-reduce pattern
    #[serde(default)]
    pub consensus_enabled: bool,            // Consensus voting
    #[serde(default)]
    pub pipeline_enabled: bool,             // Pipeline workflows
    #[serde(default)]
    pub developer_extensions_enabled: bool, // Custom extensions
}
```

All capabilities default to **false** (disabled) for safety.

### 5.7 Config API

```rust
impl Config {
    pub fn global() -> &'static Config;                                      // Singleton
    pub fn get_param<T: Deserialize>(&self, key: &str) -> Result<T>;       // Get value
    pub fn set_param<V: Serialize>(&self, key: &str, value: V) -> Result<()>;  // Set value
    pub fn get_secret<T: Deserialize>(&self, key: &str) -> Result<T>;      // Get secret
    pub fn set_secret<V: Serialize>(&self, key: &str, value: &V) -> Result<()>; // Set secret
    pub fn delete(&self, key: &str) -> Result<()>;                          // Delete key
    pub fn all_values(&self) -> Result<HashMap<String, Value>>;             // All config
    pub fn all_secrets(&self) -> Result<HashMap<String, Value>>;            // All secrets
}
```

---

## 6. Conversation & Session Management

### 6.1 Conversation (`conversation/mod.rs`)

The conversation is a validated, append-only message container:

```rust
#[derive(Debug, Clone, Serialize, Deserialize, ToSchema, PartialEq)]
pub struct Conversation(Vec<Message>);
```

**Key operations:**
- `new()` / `new_unvalidated()` - Create from message iterator
- `push()` - Append with merging (same-ID messages merge, thinking blocks coalesce)
- `extend()` - Append multiple messages
- `fix_conversation()` - Fix validation issues before sending to LLM

### 6.2 Conversation Fix Pipeline

The `fix_conversation()` function runs 8 fix stages:

```rust
fn fix_messages(messages: Vec<Message>) -> (Vec<Message>, Vec<String>) {
    [
        merge_text_content_items,       // Merge consecutive text blocks
        trim_assistant_text_whitespace, // Trim trailing whitespace
        remove_empty_messages,          // Remove empty messages
        fix_empty_tool_results,         // Add placeholder for empty results
        fix_tool_calling,               // Fix orphaned tool calls
        merge_consecutive_messages,     // Merge same-role messages
        fix_lead_trail,                 // Remove leading/trailing assistant messages
        populate_if_empty,              // Add placeholder if empty
    ]
    .into_iter()
    .fold((messages, Vec::new()), |(msgs, issues), processor| {
        let (new_msgs, issues) = processor(msgs);
        all_issues.extend(issues);
        (new_msgs, all_issues)
    })
}
```

### 6.3 Session (`session/mod.rs`)

```rust
mod chat_history_search;
mod diagnostics;
pub mod extension_data;
mod legacy;
pub mod nostr_share;
pub mod session_manager;

pub use session_manager::{
    Session, SessionInsights, SessionManager, SessionNameUpdate, SessionType,
    SessionUpdateBuilder,
};
pub use extension_data::{EnabledExtensionsState, ExtensionData, ExtensionState, TodoState};
```

### 6.4 Session Persistence

Sessions are stored in **SQLite** via `sqlx`:

```rust
pub struct Session {
    pub id: String,
    pub name: Option<String>,
    pub working_dir: PathBuf,
    pub project_id: Option<String>,
    pub conversation: Option<Conversation>,
    pub extension_data: ExtensionData,
    pub metadata: SessionMetadata,
}
```

### 6.5 Session Manager Operations

```rust
impl SessionManager {
    pub async fn create(&self, working_dir: &Path, name: Option<String>) -> Result<Session>;
    pub async fn get_session(&self, id: &str, load_conversation: bool) -> Result<Session>;
    pub async fn add_message(&self, session_id: &str, message: &Message) -> Result<()>;
    pub async fn replace_conversation(&self, session_id: &str, conversation: &Conversation) -> Result<()>;
    pub async fn list_sessions(&self) -> Result<Vec<SessionSummary>>;
    pub async fn delete_session(&self, id: &str) -> Result<()>;
    pub async fn maybe_update_name(&self, session_id: &str, provider: Arc<dyn Provider>) -> Result<Option<SessionNameUpdate>>;
}
```

---

## 7. Permission System

### 7.1 Permission Module Structure (`permission/mod.rs`)

```rust
pub mod permission_confirmation;
pub mod permission_inspector;
pub mod permission_judge;
pub mod permission_store;

pub use permission_confirmation::{Permission, PermissionConfirmation};
pub use permission_inspector::PermissionInspector;
pub use permission_store::ToolPermissionStore;
```

### 7.2 Permission Levels

```rust
pub enum Permission {
    AlwaysAllow,        // Tool always allowed
    AllowOnce,          // Allow this single call
    DenyOnce,           // Deny this single call
    Deny,               // Always deny
}

pub enum PermissionConfirmation {
    Allowed,
    Denied,
    WithParameters { params: Vec<String> },  // Allowed with specific params
}
```

### 7.3 Permission Modes

| Mode | Description |
|------|-------------|
| `Chat` | All tools require explicit approval |
| `Approve` | Same as Chat |
| `Auto` | All tools auto-approved |
| `SmartApprove` | LLM-based intelligent approval with annotations |

### 7.4 ToolPermissionStore

```rust
pub struct ToolPermissionStore {
    // Per-tool permission rules stored in config
    // Key format: "tool_name::action"
}
```

### 7.5 Permission Check Flow

```rust
pub struct PermissionCheckResult {
    pub approved: Vec<ToolRequest>,       // Pre-approved tools
    pub needs_approval: Vec<ToolRequest>, // Requires user confirmation
    pub denied: Vec<ToolRequest>,         // Denied by policy
}
```

---

## 8. Recipe System

### 8.1 Recipe Structure (`recipe/mod.rs`)

```rust
#[derive(Serialize, Deserialize, Debug, Clone, ToSchema)]
pub struct Recipe {
    #[serde(default = "default_version")]
    pub version: String,                    // File format version (semver)
    pub title: String,                      // Short title
    pub description: String,                // Longer description
    #[serde(skip_serializing_if = "Option::is_none")]
    pub instructions: Option<String>,       // Model instructions
    #[serde(skip_serializing_if = "Option::is_none")]
    pub prompt: Option<String>,             // Starting prompt
    #[serde(skip_serializing_if = "Option::is_none")]
    pub extensions: Option<Vec<ExtensionConfig>>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub settings: Option<Settings>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub activities: Option<Vec<String>>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub author: Option<Author>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub parameters: Option<Vec<RecipeParameter>>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub response: Option<Response>,         // JSON schema response
    #[serde(skip_serializing_if = "Option::is_none")]
    pub sub_recipes: Option<Vec<SubRecipe>>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub retry: Option<RetryConfig>,
}
```

### 8.2 Recipe Parameters

```rust
#[derive(Serialize, Deserialize, Debug, Clone, ToSchema)]
pub struct RecipeParameter {
    pub key: String,
    pub input_type: RecipeParameterInputType,   // String|Number|Boolean|Date|File|Select
    pub requirement: RecipeParameterRequirement, // Required|Optional|UserPrompt
    pub description: String,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub default: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub options: Option<Vec<String>>,
}
```

### 8.3 Recipe Builder API

```rust
let recipe = Recipe::builder()
    .title("Code Review")
    .description("Review code for bugs and improvements")
    .instructions("Focus on security vulnerabilities...")
    .extensions(vec![ext_config])
    .parameters(vec![param])
    .response(Response { json_schema: Some(schema) })
    .build()?;
```

### 8.4 Recipe Loading

```rust
impl Recipe {
    pub fn from_file_path(file_path: &Path) -> Result<Self>;
    pub fn from_content(content: &str) -> Result<Self>;
    pub fn to_yaml(&self) -> Result<String>;

    // Auto-injects analyze extension if developer extension is present
    fn ensure_analyze_for_developer(&mut self);

    // Auto-injects summon extension for sub-recipes
    fn ensure_summon_for_subrecipes(&mut self);

    // Unicode tag detection for security
    pub fn check_for_security_warnings(&self) -> bool;
}
```

---

## 9. Skills System

### 9.1 Skills Module Structure (`skills/mod.rs`)

```rust
mod arguments;
mod builtin;
pub mod client;              // MCP client for skills

pub use client::{SkillsClient, EXTENSION_NAME};
```

### 9.2 Skill Discovery

Skills are discovered from filesystem locations:

```rust
/// Global: ~/.agents/skills
pub fn global_skills_dir() -> Option<PathBuf>;

/// Project: <project>/.agents/skills
pub fn project_skills_dir(project_dir: &Path) -> PathBuf;

/// All directories (project first, then global)
pub fn all_skill_dirs(working_dir: Option<&Path>) -> Vec<(PathBuf, bool)>;
```

Discovery paths (in order):
1. `<working_dir>/.agents/skills` (project-scoped)
2. `<working_dir>/.goose/skills`
3. `<working_dir>/.claude/skills`
4. `~/.agents/skills` (global)
5. `~/.config/goose/skills`
6. `~/.claude/skills`
7. `~/.config/agents/skills`
8. Installed plugin skill directories

### 9.3 Skill File Format

Skills are `SKILL.md` files with YAML frontmatter:

```markdown
---
name: my-skill
description: 'What this skill does'
metadata:
  argument-hint: "<component> <from> <to>"
  arguments:
    - component
    - from
    - to
---

# Skill content here...
Use $ARGUMENTS to reference passed arguments.
```

### 9.4 Skill Loading

```rust
pub fn loaded_skill_context_with_args(
    skill: &SourceEntry,
    args: Option<&str>,
) -> Result<String>;

pub fn skill_argument_hint(skill: &SourceEntry) -> Option<String>;
pub fn skill_argument_names(skill: &SourceEntry) -> Vec<String>;
pub fn discover_skills(working_dir: Option<&Path>) -> Vec<SourceEntry>;
pub fn list_installed_skills(working_dir: Option<&Path>) -> Vec<SourceEntry>;
```

### 9.5 Skill Name Validation

```rust
pub(crate) fn validate_skill_name(name: &str) -> Result<(), Error> {
    // Rules:
    // - Must not be empty
    // - Max 64 characters
    // - Only lowercase letters, digits, and hyphens
    // - Must not start or end with a hyphen
}
```

---

## 10. Hooks System

### 10.1 Hooks Module Structure (`hooks/mod.rs`)

The hooks system implements the **Open Plugins hooks specification**, allowing plugins to respond to lifecycle events.

### 10.2 Hook Events

```rust
#[derive(Debug, Clone, Copy, PartialEq, Eq, Hash)]
pub enum HookEvent {
    PreToolUse,              // Before any tool execution (blocking)
    PostToolUse,             // After successful tool use
    PostToolUseFailure,      // After failed tool use
    SessionStart,            // Session begins
    SessionEnd,              // Session ends
    UserPromptSubmit,        // User sends a message
    BeforeReadFile,          // Before file read (with matcher)
    AfterFileEdit,           // After file edit (with matcher)
    BeforeShellExecution,    // Before shell command (with matcher)
    AfterShellExecution,     // After shell command (with matcher)
    Stop,                    // Agent stops
    SubagentStart,           // Sub-agent starts
    SubagentStop,            // Sub-agent stops
}
```

### 10.3 Hook Configuration (`hooks.json`)

```json
{
  "hooks": {
    "PostToolUse": [
      {
        "matcher": "developer__shell|developer__text_editor",
        "hooks": [
          { "type": "command", "command": "${PLUGIN_ROOT}/scripts/log.sh", "timeout": 30 }
        ]
      }
    ]
  }
}
```

### 10.4 Hook Context

```rust
#[derive(Debug, Clone, Serialize)]
pub struct HookContext {
    pub event: String,
    pub session_id: String,
    pub matcher_context: Option<String>,   // Tool name, file path, etc.
    #[serde(skip_serializing_if = "Option::is_none")]
    pub tool_name: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub tool_input: Option<Value>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub tool_output: Option<Value>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub message: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub working_dir: Option<String>,
}
```

### 10.5 Hook Manager

```rust
#[derive(Debug, Default, Clone)]
pub struct HookManager {
    rules: HashMap<HookEvent, Vec<LoadedRule>>,
}

impl HookManager {
    pub fn load(project_root: Option<&Path>) -> Self;     // Scan plugins
    pub fn has_hooks(&self, event: HookEvent) -> bool;
    pub async fn emit(&self, event: HookEvent, ctx: HookContext);         // Non-blocking
    pub async fn emit_blocking(&self, event: HookEvent, ctx: HookContext) -> HookDecision;
}

pub enum HookDecision {
    Allow,
    Deny { reason: String, plugin: String },
}
```

### 10.6 Hook Deny Mechanism

A hook denies by either:
- Exiting with **status code 2** (reason on stderr)
- Printing `{"decision":"block","reason":"..."}` to stdout

### 10.7 Integration with Agent

```rust
// PreToolUse: Can BLOCK tool execution
if let HookDecision::Deny { reason, plugin } = self
    .hook_manager
    .emit_blocking(HookEvent::PreToolUse, ctx).await
{
    return (request_id, Err(ErrorData::new(
        ErrorCode::INTERNAL_ERROR,
        format!("Tool call denied by policy hook `{plugin}`: {reason}."),
        None,
    )));
}

// PostToolUse: Non-blocking notification
self.hook_manager.emit(HookEvent::PostToolUse, ctx).await;

// Extended hooks: BeforeShellExecution, AfterShellExecution, etc.
self.emit_pre_tool_extended_hooks(&tool_call.name, tool_input, session).await;
```

---

## 11. Gateway

### 11.1 Gateway Module Structure (`gateway/mod.rs`)

```rust
pub mod handler;
pub mod manager;
pub mod pairing;
pub mod telegram;           // Telegram Bot integration
pub mod telegram_format;
```

### 11.2 Gateway Types

```rust
#[derive(Debug, Clone, Serialize, Deserialize, ToSchema)]
pub struct GatewayConfig {
    pub gateway_type: String,           // Currently: "telegram"
    pub platform_config: serde_json::Value,
    pub max_sessions: usize,
}

#[derive(Debug, Clone)]
pub struct IncomingMessage {
    pub user: PlatformUser,
    pub text: String,
    pub platform_message_id: Option<String>,
    pub attachments: Vec<Attachment>,
}

#[derive(Debug, Clone, Serialize, Deserialize, ToSchema)]
#[serde(tag = "type", rename_all = "snake_case")]
pub enum OutgoingMessage {
    Text { body: String },
    Typing,
}
```

### 11.3 Gateway Trait

```rust
#[async_trait]
pub trait Gateway: Send + Sync + 'static {
    fn gateway_type(&self) -> &str;
    async fn start(&self, handler: GatewayHandler, cancel: CancellationToken) -> anyhow::Result<()>;
    async fn send_message(&self, user: &PlatformUser, message: OutgoingMessage) -> anyhow::Result<()>;
    async fn validate_config(&self) -> anyhow::Result<()>;
    fn info(&self) -> HashMap<String, String>;
}
```

### 11.4 Pairing State Machine

```rust
#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(tag = "state", rename_all = "snake_case")]
pub enum PairingState {
    Unpaired,
    PendingCode { code: String, expires_at: i64 },
    Paired { session_id: String, paired_at: i64 },
}
```

### 11.5 Gateway Factory

```rust
pub fn create_gateway(config: &mut GatewayConfig) -> anyhow::Result<std::sync::Arc<dyn Gateway>> {
    match config.gateway_type.as_str() {
        "telegram" => Ok(std::sync::Arc::new(telegram::TelegramGateway::new(config)?)),
        other => anyhow::bail!("Unknown gateway type: {}", other),
    }
}
```

---

## 12. Token Counter & Embedding

### 12.1 Token Counter

The `token_counter` module is declared in `lib.rs` as `pub mod token_counter;`. It provides token counting utilities for context window management, compaction decisions, and usage tracking. The module interfaces with `tiktoken-rs` (declared in `Cargo.toml`) for accurate token counting.

### 12.2 Context Management

The agent uses token counting for:

1. **Auto-compaction trigger**: When conversation exceeds `GOOSE_AUTO_COMPACT_THRESHOLD` (default: 80% of context limit)
2. **Tool call cutoff**: `GOOSE_TOOL_CALL_CUTOFF` limits tool call pairs to prevent overflow
3. **Compaction**: Summarizes old message history to fit within context window

```rust
// From agent.rs
let needs_auto_compact = check_if_compaction_needed(
    self.provider().await?.as_ref(),
    &conversation,
    None,
    &session,
).await?;

let tool_call_cut_off = crate::context_mgmt::compute_tool_call_cutoff(
    context_limit,
    compaction_threshold,
);
```

### 12.3 Embedding Trait

```rust
#[async_trait]
pub trait EmbeddingCapable {
    async fn create_embeddings(
        &self,
        session_id: &str,
        texts: Vec<String>,
    ) -> Result<Vec<Vec<f32>>>;
}
```

---

## 13. Security Architecture

### 13.1 Security Module (`security/`)

Referenced from `lib.rs` and integrated into the agent:

```rust
// In agent.rs - Tool inspection pipeline:
fn create_tool_inspection_manager(...) -> ToolInspectionManager {
    let mut mgr = ToolInspectionManager::new();
    mgr.add_inspector(Box::new(SecurityInspector::new()));      // Dangerous op detection
    mgr.add_inspector(Box::new(EgressInspector::new()));        // Data exfiltration detection
    mgr.add_inspector(Box::new(AdversaryInspector::new(...)));  // LLM adversarial review
    mgr.add_inspector(Box::new(PermissionInspector::new(...)));
    mgr.add_inspector(Box::new(RepetitionInspector::new(None)));
    mgr
}
```

### 13.2 Adversary Inspector

Enabled via `~/.config/goose/adversary.md` - an LLM-based security review that examines tool calls for potentially malicious patterns.

### 13.3 SmartApprove Mode

When `GooseMode::SmartApprove` is active:
- All tools are annotated with risk level
- LLM reviews tool calls before execution
- Permission inspector makes approval decisions
- Tool annotations provide metadata about risk

---

## 14. Module Index

### Complete Public Module API (from `lib.rs`)

| Module | Path | Description |
|--------|------|-------------|
| `acp` | `src/acp/mod.rs` | Agent Communication Protocol |
| `agents` | `src/agents/` | Core agent implementation |
| `builtin_extension` | (declared) | Built-in extensions |
| `checks` | (declared) | System checks |
| `config` | `src/config/` | Configuration management |
| `context_mgmt` | (declared) | Context window management |
| `conversation` | `src/conversation/` | Message conversation handling |
| `dictation` | (declared) | Voice dictation |
| `doctor` | (declared) | Diagnostics |
| `download_manager` | (declared) | File download management |
| `execution` | (declared) | Execution utilities |
| `gateway` | `src/gateway/` | External gateway (Telegram) |
| `goose_apps` | (declared) | App integration |
| `hints` | (declared) | User hints |
| `hooks` | `src/hooks/` | Plugin lifecycle hooks |
| `instance_id` | (declared) | Instance identification |
| `logging` | (declared) | Logging utilities |
| `mcp_utils` | (declared) | MCP protocol utilities |
| `model` | (declared) | Model configuration |
| `oauth` | (declared) | OAuth flows |
| `otel` | (declared, cfg) | OpenTelemetry integration |
| `permission` | `src/permission/` | Tool permission system |
| `plugins` | (declared) | Plugin management |
| `posthog` | (declared, cfg) | PostHog telemetry |
| `prompt_template` | (declared) | Prompt templating |
| `providers` | `src/providers/` | LLM provider implementations |
| `recipe` | `src/recipe/` | Workflow recipes |
| `recipe_deeplink` | (declared) | Recipe deep linking |
| `scheduler` | (declared) | Task scheduling |
| `scheduler_trait` | (declared) | Scheduler trait |
| `security` | (declared) | Security inspection |
| `session` | `src/session/` | Session management |
| `session_context` | (declared) | Session context |
| `skills` | `src/skills/` | Skill discovery and loading |
| `slash_commands` | (declared) | CLI slash commands |
| `source_roots` | (declared) | Source code roots |
| `sources` | (declared) | Source management |
| `subprocess` | (declared) | Subprocess management |
| `token_counter` | (declared) | Token counting |
| `tool_inspection` | (declared) | Tool call inspection |
| `tool_monitor` | (declared) | Tool execution monitoring |
| `tracing` | (declared) | Tracing utilities |
| `utils` | (declared) | General utilities |

---

## Summary Statistics

| Metric | Value |
|--------|-------|
| Total Rust source files (available) | 29 |
| Provider implementations | 30+ |
| Provider format converters | 9 |
| Hook event types | 12 |
| Agent modes | 4 (Chat, Approve, Auto, SmartApprove) |
| Agent capability flags | 5 (all default disabled) |
| Feature flags | 11 |
| Skill discovery paths | 8 |
| Recipe parameter types | 6 |
| Direct dependencies | ~80+ |
| Max turns default | 1000 |
| Context compaction threshold | 80% |
| Default hook timeout | 30 seconds |
| Max session name | Generated via LLM |

---

*This audit covers all source files present in the `crates/goose/src/` directory. Some modules declared in `lib.rs` exist as workspace-level or generated modules not present in the filesystem snapshot.*
