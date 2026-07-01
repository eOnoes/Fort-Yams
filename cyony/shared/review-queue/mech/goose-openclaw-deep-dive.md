# Goose + OpenClaw Deep-Dive Audit: Mech Extension Design Document

## TL;DR — Executive Summary

This audit covers two complementary agent harnesses with distinct architectural philosophies. **Goose** (Rust, 46K stars, Linux Foundation) is a ReAct-loop agent framework with 25+ LLM providers, native MCP/ACP protocol support, and five-stage progressive context compaction. **OpenClaw** (TypeScript, 376K stars) is a gateway-based multi-agent orchestrator with per-agent SQLite databases, a Crestodian warden system for approval enforcement, native MCP channel bridges, and an ACP harness runtime for spawning external agents (Claude Code, Codex, Gemini CLI, etc.). For mech extension design: **Goose provides the provider abstraction and recipe system** you can extend; **OpenClaw provides the hook relay, warden boundary, and subagent orchestration** you can bolt onto. The ACP ecosystem now includes 93+ public repositories across Zed, JetBrains, VS Code, Neovim, and multiple SDKs (Python, Go, TypeScript, Rust), making it the dominant interop layer for editor-to-agent communication.

---

## Part 1: Goose — Remaining Deep-Dive Answers

### 1.1 ACP Protocol Spec in Goose

Goose's ACP (Agent Client Protocol) implementation is defined in `crates/goose/src/acp/` and documented in the architectural literature. ACP is the **lingua franca between editor clients and agent servers**, distinct from MCP which handles agent-to-tool communication.

**Core Message Shapes (JSON-RPC 2.0):**

| Method | Direction | Payload | Purpose |
|--------|-----------|---------|---------|
| `initialize` | Client → Server | `{ protocolVersion: number, clientInfo: { name, version }, capabilities: { ... } }` | Capability negotiation |
| `session/new` | Client → Server | `{ sessionId?: string, model?: string, provider?: string, extensions?: ExtensionConfig[] }` | Create session |
| `session/load` | Client → Server | `{ sessionId: string }` | Resume existing session |
| `session/prompt` | Client → Server | `{ sessionId: string, prompt: string, mode?: GooseMode }` | Send user message |
| `session/cancel` | Client → Server | `{ sessionId: string }` | Cancel in-progress turn |
| `session/close` | Client → Server | `{ sessionId: string }` | Close session |

**Server → Client SSE Events:**

| Event Type | Shape | Purpose |
|------------|-------|---------|
| `AgentMessageChunk` | `{ content: string, index: number }` | Streaming text response |
| `AgentThoughtChunk` | `{ reasoning: string }` | Streaming thinking/reasoning |
| `ToolCall` | `{ name: string, arguments: object, tool_call_id: string }` | Tool invocation request |
| `ToolCallUpdate` | `{ tool_call_id: string, status: "running"\|"completed"\|"failed", result?: string }` | Tool execution status |
| `request_permission` | `{ tool_name: string, arguments_preview: object, request_id: string }` | User approval required |
| `session_info_update` | `{ session_id, message_count, token_usage, cost }` | Session metadata update |
| `available_commands_update` | `{ commands: SlashCommand[] }` | Dynamic command list |
| `usage_update` | `{ input_tokens, output_tokens, cache_tokens, cost_usd }` | Cost tracking |

**Lifecycle Events:**
The ACP server in `crates/goose/src/acp/server.rs` implements the following lifecycle:
1. **Initialization**: Client sends `initialize`, server responds with its capabilities (tool support, permission modes, max context)
2. **Session Creation**: `session/new` creates a new `Agent` instance with its own `Provider`, `ExtensionManager`, and `SessionManager`
3. **Prompt Turn**: `session/prompt` triggers the full ReAct loop, with responses streamed as SSE events
4. **Permission Flow**: When a tool requires approval, `request_permission` is sent; client responds with `permission/response` containing `PermissionConfirmation { principal_type, permission }`
5. **Cancellation**: `session/cancel` sets an atomic flag that the ReAct loop checks between iterations
6. **Cleanup**: `session/close` persists the session and releases resources

**Capability Advertisement:**
The server's `initialize` response includes capability flags that determine what features are available:
```json
{
  "capabilities": {
    "tools": { "listChanged": true },
    "sampling": {},
    "experimental": {
      "gooseModes": ["chat", "approve_once", "approve_each", "auto"],
      "permissionModes": ["allow_once", "allow_all", "deny_once", "deny_all", "ask"],
      "contextManagement": ["compaction", "summarization", "pruning"]
    }
  }
}
```

### 1.2 MCP Integration Layer — Provider Abstraction + Credential Routing

Goose's MCP integration lives in `crates/goose/src/agents/extension_manager.rs` and `crates/goose/src/agents/mcp_client.rs`. The **Provider abstraction** in `crates/goose/src/providers/base.rs` is the single most important interface for connecting subscription backend models.

**The Provider Trait (lines 960-1130 of base.rs):**
```rust
#[async_trait]
pub trait Provider: Send + Sync {
    fn get_name(&self) -> &str;
    async fn stream(&self, model_config: &ModelConfig, session_id: &str, 
                    system: &str, messages: &[Message], tools: &[Tool]) 
                    -> Result<MessageStream, ProviderError>;
    async fn complete(&self, ...) -> Result<(Message, ProviderUsage), ProviderError>;
    async fn complete_fast(&self, ...) -> Result<(Message, ProviderUsage), ProviderError>;
    fn get_model_config(&self) -> ModelConfig;
    async fn configure_oauth(&self) -> Result<(), ProviderError>;
    async fn refresh_credentials(&self) -> Result<(), ProviderError>;
}
```

**Credential Routing for Subscription Models:**
Goose implements four distinct auth patterns for subscription backends:

| Pattern | How It Works | Subscription Models | Credential Storage |
|---------|-------------|-------------------|-------------------|
| **API Key** | Bearer token in HTTP header | Anthropic, OpenAI, Azure, Groq | System keychain via `keyring` crate |
| **OAuth 2.0 Auth Code** | Browser flow → local HTTP callback → token exchange | Google Gemini OAuth, xAI SuperGrok, GitHub Copilot | System keychain (encrypted) + auto-refresh |
| **OAuth Device Code** (RFC 8628) | Polling loop after user enters code on device | Azure device code, Enterprise SSO | System keychain + auto-refresh |
| **ACP Delegation** | Wrap existing CLI tool's auth | Claude Code, Codex, Amp, Pi, Cursor | Delegated to wrapped CLI; Goose never sees credentials |

For **subscription models specifically** (Claude Code, Copilot, Codex), the ACP Delegation pattern is critical. The ACP provider (`*_acp.rs`) spawns the CLI tool as a subprocess and communicates via JSON-RPC over stdio. The CLI tool handles its own authentication (e.g., Claude Code manages its own `claude` CLI login session). From Goose's perspective, the `Provider::stream()` call is translated to an ACP `session/prompt` request, and ACP SSE events are translated back into `MessageStream` items.

**The ProviderDef Discovery Pattern:**
Each provider implements `ProviderDef` with a `metadata()` method returning `ProviderMetadata`:
```rust
pub struct ProviderMetadata {
    pub name: &'static str,                    // "anthropic"
    pub display_name: &'static str,            // "Anthropic"
    pub description: &'static str,
    pub default_model: &'static str,           // "claude-sonnet-4-20250514"
    pub known_models: Vec<ModelInfo>,          // All supported models with context limits
    pub model_doc_link: &'static str,
    pub config_keys: Vec<ConfigKey>,           // Auth requirements
    pub setup_steps: Vec<SetupStep>,           // Human-friendly setup guide
}
```

### 1.3 Session/Memory Architecture

Goose uses **SQLite** for session persistence via `SessionManager` in `crates/goose/src/session/`.

**Session Schema (SQLite):**
```sql
CREATE TABLE sessions (
    id TEXT PRIMARY KEY,           -- UUID
    name TEXT,                     -- Human-readable name (auto-generated)
    created_at INTEGER,            -- Unix timestamp
    provider TEXT NOT NULL,        -- Provider name
    model TEXT NOT NULL,           -- Model identifier
    mode TEXT NOT NULL DEFAULT 'approve_once', -- GooseMode
    metadata_json TEXT,            -- Arbitrary metadata
    total_input_tokens INTEGER DEFAULT 0,
    total_output_tokens INTEGER DEFAULT 0,
    total_cost REAL DEFAULT 0.0,
    is_archived INTEGER DEFAULT 0
);

CREATE TABLE messages (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    session_id TEXT NOT NULL,
    role TEXT NOT NULL,            -- "user", "assistant", "system", "tool"
    content_json TEXT NOT NULL,    -- Message content (JSON array of Content blocks)
    created_at INTEGER NOT NULL,
    token_count INTEGER,
    FOREIGN KEY (session_id) REFERENCES sessions(id)
);

CREATE TABLE permissions (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    session_id TEXT NOT NULL,
    tool_name TEXT NOT NULL,
    decision TEXT NOT NULL,        -- "allow", "deny", "ask"
    scope TEXT NOT NULL,           -- "once", "always", "session"
    created_at INTEGER NOT NULL
);
```

**Context Flow Between Turns:**
1. User sends message → appended to `messages` table
2. Agent loads full conversation history from SQLite
3. Context compaction triggers if messages exceed `DEFAULT_COMPACTION_THRESHOLD` (0.75-0.9 of model context limit):
   - **Stage 1**: Truncate oversized tool outputs (>50k chars)
   - **Stage 2**: Summarize old tool pairs using `complete_fast()` (cheap model)
   - **Stage 3**: Compress multi-turn sub-conversations
   - **Stage 4**: Prune low-relevance messages
   - **Stage 5**: Full archive with working-set extraction
4. Compacted history is written back to SQLite (original preserved in archive table)
5. LLM receives the compacted context for inference
6. Response + tool calls appended to `messages`
7. Tool results appended to `messages`
8. Loop continues or returns to user

**Per-Turn Isolation:**
Each turn is a single SQLite transaction. If a turn fails mid-way, the transaction rolls back, preventing partial writes to the conversation history. The `SessionManager` uses WAL (Write-Ahead Logging) mode for concurrent read access.

### 1.4 Recipe/Workflow Runner

Goose's recipe system in `crates/goose/src/recipe.rs` provides **declarative multi-step orchestration**.

**Recipe YAML Format:**
```yaml
name: deploy-check
version: "1.0"
description: "Verify deployment readiness before pushing to production"
author: "team-platform"
settings:
  model: "claude-haiku"
  mode: "approve_each"
  extensions: ["developer", "git", "github"]
steps:
  - type: "message"
    content: "Run all tests and report results"
  - type: "tool_call"
    tool: "developer__shell"
    arguments:
      command: "npm test"
    on_failure: "continue"  # Continue even if tests fail
  - type: "condition"
    if: "{{steps.1.exit_code}} == 0"
    then:
      - type: "message"
        content: "All tests passed. Check for uncommitted changes."
    else:
      - type: "message"
        content: "Tests failed. Review failures before deploying."
  - type: "tool_call"
    tool: "git__status"
    arguments: {}
  - type: "message"
    content: "Deployment readiness check complete. Summary: {{steps}}"
```

**Recipe Execution Engine:**
The `RecipeRunner` executes recipes step-by-step with:
- **Variable substitution**: `{{variable}}` syntax resolved from step outputs, environment variables, or user input
- **Error handling**: Per-step `on_failure` policy (`"stop"`, `"continue"`, `"retry"`, `"ask"`)
- **Conditional branching**: `if/then/else` based on step outputs
- **Looping**: `foreach` over arrays with automatic parallelization for independent iterations
- **Subagent spawning**: `type: "subagent"` delegates to isolated subagents for parallel exploration
- **Hooks**: Recipe-level `before_step` and `after_step` hooks for logging and side effects

**Extensibility:**
Recipes can be extended through:
- **Custom step types**: Register new step handlers via `RecipeRegistry`
- **Template functions**: Add custom `{{function(args)}}` via `TemplateEngine`
- **Recipe composition**: `import` other recipes as subroutines
- **Recipe packs**: Collections of related recipes distributed as `.recipepack` archives

### 1.5 Provider Config Surface — Plugging in Subscription Models

To add a new subscription model provider to Goose, you implement three items:

**1. The Provider Struct:**
```rust
pub struct MySubscriptionProvider {
    client: reqwest::Client,
    config: ProviderConfig,
    credentials: Arc<Mutex<Credentials>>,
}

#[async_trait]
impl Provider for MySubscriptionProvider {
    fn get_name(&self) -> &str { "my-subscription" }
    
    async fn stream(&self, model_config: &ModelConfig, ...) -> Result<MessageStream, ProviderError> {
        // Convert to your API's request format
        // Stream SSE from your API
        // Convert SSE chunks to MessageStream
    }
    
    async fn configure_oauth(&self) -> Result<(), ProviderError> {
        // OAuth flow or API key prompt
    }
    
    async fn refresh_credentials(&self) -> Result<(), ProviderError> {
        // Token refresh logic
    }
}
```

**2. The ProviderDef Metadata:**
```rust
impl ProviderDef for MySubscriptionProvider {
    fn metadata() -> ProviderMetadata {
        ProviderMetadata {
            name: "my-subscription",
            display_name: "My Subscription Service",
            description: "Enterprise AI via subscription",
            default_model: "my-model-v1",
            known_models: vec![
                ModelInfo { name: "my-model-v1", context_limit: 200000, 
                           tool_calling: true, cost_input: 3.0, cost_output: 15.0 }
            ],
            model_doc_link: "https://docs.myservice.ai/models",
            config_keys: vec![
                ConfigKey { key: "API_KEY", required: true, secret: true, oauth_flow: false }
            ],
            setup_steps: vec![
                SetupStep::Text("Get your API key from https://myservice.ai/keys"),
                SetupStep::SetEnv("MYSUBSCRIPTION_API_KEY", "your-key-here"),
            ],
        }
    }
}
```

**3. Registration:**
```rust
// In crates/goose/src/providers/mod.rs
register_provider!("my-subscription", MySubscriptionProvider);
```

**For Subscription-Specific Auth Patterns:**
- If the subscription uses **OAuth**: Implement `configure_oauth()` with the full authorization code flow
- If the subscription wraps an **existing CLI**: Use the ACP delegation pattern (spawn CLI as subprocess, speak ACP over stdio)
- If the subscription uses **API keys with rotation**: Implement `refresh_credentials()` with key rotation logic
- If the subscription uses **JWT tokens with expiry**: Store refresh token in keychain, implement automatic refresh

---

## Part 2: OpenClaw — Deep-Dive Audit

### 2.1 Kernel-Level Hooks

OpenClaw's hook system in `src/hooks/` provides **lifecycle interception at multiple layers** with both native and plugin-extensible hooks.

**Hook Types (from `hooks.ts` and `internal-hook-types.ts`):**

| Hook Category | Events | When Fired | Can Block? |
|--------------|--------|-----------|------------|
| **Lifecycle** | `session_start`, `session_end`, `agent_ready` | Session creation/teardown | No |
| **Tool Execution** | `before_tool_call`, `after_tool_call`, `tool_error` | Around every tool invocation | **Yes (before_tool_call)** |
| **Message Flow** | `before_agent_finalize`, `before_send`, `after_receive` | Around LLM inference | Yes (before_agent_finalize) |
| **File System** | `file_modified`, `file_created`, `file_deleted` | File watcher events | No |
| **Approval Gates** | `permission_requested`, `permission_granted`, `permission_denied` | Around Crestodian decisions | Yes (permission_requested) |
| **External** | `hook_relay_inbound`, `hook_relay_outbound` | Native hook relay bridge | Yes |

**Native Hook Relay Bridges:**
The `native_hook_relay_bridges` table in the SQLite schema (lines 208-220) enables **out-of-process hook execution**:
```sql
CREATE TABLE IF NOT EXISTS native_hook_relay_bridges (
    relay_id TEXT NOT NULL PRIMARY KEY,
    pid INTEGER NOT NULL,              -- OS process ID of the hook runner
    hostname TEXT NOT NULL,
    port INTEGER NOT NULL,             -- TCP port for relay communication
    token TEXT NOT NULL,               -- Authentication token
    expires_at_ms INTEGER NOT NULL,
    updated_at_ms INTEGER NOT NULL
);
```
This allows hooks to run as **separate OS processes** that communicate with the main OpenClaw gateway over TCP. The relay bridge is used for:
- **Sandboxed hook execution**: Hooks run in isolated processes that cannot crash the gateway
- **Language-agnostic hooks**: Write hooks in any language that can speak the relay protocol
- **Distributed hooks**: Hooks can run on remote machines

**File Watch System (from `gmail-watcher.ts` and related files):**
OpenClaw implements file watching through:
- **Native OS watchers**: Uses `fs.watch` (Node.js) with platform-specific optimizations
- **Polling fallback**: For network filesystems and containers where native watching is unreliable
- **Gmail watcher pattern**: The `gmail-watcher.ts` shows the watcher lifecycle — `start`, `stop`, `restart`, `abort` with proper cleanup

**Tool Registry:**
The tool registry in `src/tools/` has three layers:
1. **Built-in tools** (`index.ts`, `protocol.ts`, `types.ts`): Core tools always available
2. **Plugin tools** (`plugin-tools-serve.ts`, `plugin-tools-handlers.ts`): Tools provided by plugins via the MCP bridge
3. **Channel tools** (`channel-tools.ts`, `channel-bridge.ts`): Tools specific to channel adapters (Discord, Slack, etc.)

The `tools/boundary.test.ts` enforces **module boundaries** — ensuring tools don't leak dependencies across layers.

### 2.2 Memory/Session Persistence Model

OpenClaw uses a **dual-database architecture**: a global SQLite state database + per-agent SQLite cache databases.

**Global State Database (`openclaw-state-schema.sql` — 1,207 lines, 34.6KB):**

Key tables for session/memory:

| Table | Purpose | Key Columns |
|-------|---------|-------------|
| `auth_profile_stores` | Provider credential storage | `store_key`, `store_json` (encrypted) |
| `state_leases` | Distributed state locking | `scope`, `lease_key`, `owner`, `expires_at` |
| `exec_approvals_config` | **Warden execution approval config** | `config_key`, `raw_json`, `socket_path`, `default_security`, `default_ask` |
| `channel_ingress_events` | Incoming message queue | `queue_name`, `event_id`, `status`, `payload_json` |
| `cron_jobs` | Scheduled task definitions | Rich config: schedule, payload, delivery, failure handling |
| `task_runs` | Task execution tracking | `task_id`, `status`, `owner_key`, `parent_flow_id`, `child_session_key` |
| `subagent_runs` | Subagent execution tracking | `child_session_key`, `controller_session_key`, `task`, `outcome_json` |
| `current_conversation_bindings` | Conversation-to-session bindings | `binding_key`, `target_session_key`, `channel`, `account_id` |
| `plugin_binding_approvals` | **Plugin approval records** | `plugin_root`, `channel`, `account_id`, `plugin_id`, `approved_at` |
| `command_log_entries` | **Audit trail** | `timestamp_ms`, `action`, `session_key`, `sender_id`, `source`, `entry_json` |
| `flow_runs` | **Workflow execution** | `flow_id`, `status`, `goal`, `current_step`, `state_json`, `wait_json` |
| `capture_sessions` / `capture_blobs` | Proxy capture for debugging | `mode`, `source_scope`, `proxy_url`, `data BLOB` |

**Per-Agent Database (`openclaw-agent-schema.sql` — 26 lines):**
```sql
CREATE TABLE IF NOT EXISTS schema_meta (
    meta_key TEXT PRIMARY KEY,
    role TEXT NOT NULL,
    schema_version INTEGER NOT NULL,
    agent_id TEXT,
    app_version TEXT,
    created_at INTEGER,
    updated_at INTEGER
);

CREATE TABLE IF NOT EXISTS cache_entries (
    scope TEXT NOT NULL,
    key TEXT NOT NULL,
    value_json TEXT,
    blob BLOB,
    expires_at INTEGER,
    updated_at INTEGER,
    PRIMARY KEY (scope, key)
);
```
Each agent gets its own SQLite file: `~/.openclaw/agents/{agent_id}/cache.db`. This provides **per-agent data isolation**.

**Context Flow Between Turns:**
1. User message arrives via channel adapter (Discord, Slack, Telegram, etc.)
2. Message is queued in `channel_ingress_events` table
3. Gateway claims the event (atomic claim with `claim_owner`, `claimed_at`)
4. Session is resolved via `current_conversation_bindings` or created fresh
5. Conversation history loaded from gateway session store (in-memory + persisted)
6. LLM inference occurs with full history
7. Response streamed back through channel adapter
8. Turn transcript appended to session
9. Diagnostic events written to `diagnostic_events`
10. Command logged to `command_log_entries`

**Per-Turn Isolation:**
Each turn runs as a **database transaction**. The `state_leases` table provides distributed locking — only one gateway process can claim a session at a time. The lease has a heartbeat mechanism (`heartbeat_at`) with automatic expiry if the owner crashes.

### 2.3 Protocols Spoken

OpenClaw is a **protocol polyglot** — it speaks multiple protocols at different layers:

| Protocol | Layer | Implementation | Purpose |
|----------|-------|---------------|---------|
| **ACP** (Agent Client Protocol) | Editor ↔ Agent | `src/acp/`, `openclaw acp` command | Bridge mode for IDE clients |
| **MCP** (Model Context Protocol) | Agent ↔ Tools | `src/mcp/channel-server.ts`, `channel-bridge.ts` | Tool server communication |
| **WebSocket** | Client ↔ Gateway | Gateway server (`gateway/` directory) | Real-time bidirectional communication |
| **HTTP/SSE** | Client ↔ Gateway | Gateway HTTP endpoints | REST API + Server-Sent Events |
| **stdio** | Local CLI | `openclaw acp` (stdio mode) | Local ACP bridge for editors |
| **JSON-RPC 2.0** | Internal | `src/mcp/` uses `@modelcontextprotocol/sdk` | MCP message serialization |
| **Hook Relay Protocol** | Hook ↔ Gateway | TCP + custom protocol (`native_hook_relay_bridges`) | Out-of-process hook execution |
| **Channel Adapters** | Gateway ↔ Platforms | Discord bot API, Slack RTM, Telegram Bot API | Multi-platform integration |

**ACP Bridge Mode (`openclaw acp`):**
When running `openclaw acp`, OpenClaw acts as an **ACP server** that:
1. Accepts ACP over stdio from IDE clients
2. Forwards prompts to the Gateway over WebSocket
3. Maps ACP sessions to Gateway session keys
4. Streams responses back as ACP events

The ACP bridge implements: `initialize`, `session/new`, `session/load`, `session/prompt`, `session/cancel`, `session/list`, `session/resume`, `session/close` with SSE streaming for responses.

**MCP Channel Server (`src/mcp/channel-server.ts`):**
The MCP server uses the official `@modelcontextprotocol/sdk` and exposes OpenClaw tools to MCP clients. Key components:
- `OpenClawChannelBridge`: Bridges MCP requests to OpenClaw gateway calls
- `ClaudePermissionRequestSchema`: Handles Claude's permission request notifications
- `getChannelMcpCapabilities()`: Advertises capabilities based on channel mode
- `registerChannelMcpTools()`: Registers all available tools with the MCP server

**Gateway Protocol Stack:**
The Gateway (in `src/gateway/`) is the central nervous system. It:
- Accepts WebSocket connections from clients
- Routes messages to the appropriate agent/session
- Manages session lifecycle
- Enforces security policies through the Crestodian
- Persists all state to SQLite

### 2.4 Warden Boundary Enforcement — How "No" Propagates

OpenClaw's warden system is called the **Crestodian** (`src/crestodian/`). It enforces a multi-layered approval boundary with explicit policy decisions.

**The Crestodian Decision Type (`rescue-policy.ts`):**
```typescript
type CrestodianRescueDecision =
  | {
      allowed: true;
      enabled: true;
      ownerDmOnly: boolean;
      pendingTtlMinutes: number;
      yolo: true;           // YOLO mode = full auto-approve
      sandboxActive: false;
    }
  | {
      allowed: false;
      enabled: boolean;
      ownerDmOnly: boolean;
      pendingTtlMinutes: number;
      yolo: boolean;
      sandboxActive: boolean;
      reason: "disabled" | "sandbox-active" | "not-yolo" | "not-owner" | "not-direct-message";
      message: string;       // Human-readable denial explanation
    };
```

**Five Denial Reasons (How "No" Propagates):**

| Reason | Trigger | Propagation Path |
|--------|---------|-----------------|
| `"disabled"` | Tool execution globally disabled in config | Immediate denial, logged to `command_log_entries` |
| `"sandbox-active"` | Agent is in sandbox mode (restricted environment) | Denial with sandbox context, triggers `sandbox_active` telemetry |
| `"not-yolo"` | Security posture is not "yolo" (requires explicit approval) | Routes to user approval flow via `request_permission` |
| `"not-owner"` | Sender is not the configured owner | Denial with ownership context, logged for audit |
| `"not-direct-message"` | Request is in a group/channel, not a DM | Denial with context, can be overridden per-channel config |

**Security Posture Levels:**
The `isYoloHostPosture()` function determines the security level:
```typescript
function isYoloHostPosture(cfg: OpenClawConfig, agentId?: string): boolean {
    const scopedExec = resolveScopedExecConfig(cfg, agentId);
    const globalExec = cfg.tools?.exec;
    const security = scopedExec?.security ?? globalExec?.security ?? "full";
    // "full" = ask for everything
    // "yolo" = auto-approve safe operations
    // Scoped per-agent via agents.list[].tools.exec.security
}
```

**Sandbox Modes:**
```typescript
function resolveScopedSandboxMode(cfg: OpenClawConfig, agentId?: string): "off" | "non-main" | "all" {
    return (
        resolveAgentEntry(cfg, agentId)?.sandbox?.mode ??
        cfg.agents?.defaults?.sandbox?.mode ??
        "off"
    );
}
```
- `"off"`: No sandboxing
- `"non-main"`: Only non-main agents are sandboxed
- `"all"`: All agents are sandboxed

**Approval Flow Propagation:**
When a tool call is blocked by the Crestodian:
1. **Crestodian evaluates** the request against policy → produces `CrestodianRescueDecision`
2. If `allowed: false`, the **denial reason is recorded** in `command_log_entries`
3. **User is notified** via their channel (DM, thread, etc.) with the `message`
4. **Plugin hooks fire** — `permission_denied` hooks can observe the denial
5. **Agent receives** a tool error response explaining the denial
6. **Agent can retry** with modified parameters or ask for escalation

**The "Rescue" System:**
The Crestodian has a **rescue mechanism** for recovering from stuck states:
- `rescue-channel.ts`: Creates a side-channel for human intervention
- `rescue-message.ts`: Formats rescue requests
- `rescue-policy.ts`: Defines when rescue is triggered (stuck agents, repeated denials)
- `rescue-policy.test.ts`: `pendingTtlMinutes` bounds how long a rescue approval waits

**Exec Approvals Config (`exec_approvals_config` table):**
```sql
CREATE TABLE IF NOT EXISTS exec_approvals_config (
    config_key TEXT NOT NULL PRIMARY KEY,
    raw_json TEXT NOT NULL,              -- Full config JSON
    socket_path TEXT,                     -- Unix socket for external approver
    has_socket_token INTEGER NOT NULL,    -- Socket auth enabled?
    default_security TEXT,                -- "full" or "yolo"
    default_ask TEXT,                     -- Default ask behavior
    default_ask_fallback TEXT             -- Fallback when ask fails
);
```
This table allows **external approval servers** — you can configure a Unix socket that OpenClaw connects to for approval decisions, enabling enterprise approval workflows.

### 2.5 Audit Trail Location

OpenClaw maintains **three audit layers**:

**1. Command Log (`command_log_entries` table in global SQLite):**
```sql
CREATE TABLE IF NOT EXISTS command_log_entries (
    id TEXT NOT NULL PRIMARY KEY,
    timestamp_ms INTEGER NOT NULL,
    action TEXT NOT NULL,           -- What happened (e.g., "tool_call", "permission_denied")
    session_key TEXT NOT NULL,      -- Which session
    sender_id TEXT NOT NULL,        -- Who triggered it
    source TEXT NOT NULL,           -- Source channel/adapter
    entry_json TEXT NOT NULL        -- Full event payload (JSON)
);
CREATE INDEX idx_command_log_entries_timestamp ON command_log_entries(timestamp_ms DESC, id);
CREATE INDEX idx_command_log_entries_session ON command_log_entries(session_key, timestamp_ms DESC, id);
```
This is the **primary audit trail**. Every tool call, permission decision, and security event is logged here with full JSON payloads.

**2. Trajectory Files (`src/trajectory/runtime.ts`):**
Trajectory files are **per-session runtime captures** written to the filesystem:
```typescript
// From trajectory/paths.ts and runtime.ts
resolveTrajectoryFilePath(sessionId) // → ~/.openclaw/trajectory/{sessionId}/
```
Each trajectory file contains:
- `TrajectoryEvent` records with type, timestamp, and data
- Tool call/result pairs
- Model requests/responses (with secrets redacted via `redactSecrets()`)
- Diagnostic payloads (sanitized via `sanitizeDiagnosticPayload()`)

Size limits enforced:
- `TRAJECTORY_RUNTIME_CAPTURE_MAX_BYTES`: Max capture size
- `TRAJECTORY_RUNTIME_EVENT_MAX_BYTES`: Max single event size
- `TRAJECTORY_RUNTIME_FILE_MAX_BYTES`: Max trajectory file size
- `TRAJECTORY_RUNTIME_DATA_STRING_MAX_CHARS`: 32,768 chars per string field
- `TRAJECTORY_RUNTIME_DATA_ARRAY_MAX_ITEMS`: 64 items per array field

**3. Diagnostic Events (`diagnostic_events` table):**
```sql
CREATE TABLE IF NOT EXISTS diagnostic_events (
    scope TEXT NOT NULL,           -- "security", "runtime", "channel", etc.
    event_key TEXT NOT NULL,       -- Event type identifier
    payload_json TEXT NOT NULL,    -- Event data (sanitized)
    created_at INTEGER NOT NULL,
    PRIMARY KEY (scope, event_key)
);
```
Used for security audits, runtime diagnostics, and operational monitoring.

**Audit Trail Access:**
- **SQLite**: Query directly with any SQLite client: `sqlite3 ~/.openclaw/state.db "SELECT * FROM command_log_entries WHERE session_key = '...' ORDER BY timestamp_ms DESC"`
- **Trajectory files**: Plain text/JSON in `~/.openclaw/trajectory/{sessionId}/`
- **Export**: `trajectory/export.ts` provides structured export functionality
- **Redaction**: All secrets are redacted via `redactSecrets()` before persistence

---

## Part 3: Cross-Cutting — ACP Ecosystem Analysis

### 3.1 What Platforms Speak ACP Natively

The ACP (Agent Client Protocol) ecosystem has exploded to **93+ public repositories** on GitHub with the `agent-client-protocol` topic. Here is the current landscape:

**Editor/IDE Clients (the "ACP consumers"):**

| Client | Platform | Status | Notes |
|--------|----------|--------|-------|
| **Zed** | macOS, Linux | **Reference implementation** | First editor to ship ACP; drives protocol evolution |
| **JetBrains IDEs** | Windows, macOS, Linux | **Native support** (late 2025) | IntelliJ, PyCharm, WebStorm, etc. |
| **VS Code** | All platforms | **Community extension** | `formulahendry/vscode-acp-client` — most popular VS Code ACP client |
| **Neovim** | All platforms | **Community plugin** | Lua-based ACP integration |
| **Emacs** | All platforms | **Community package** | ELisp ACP client |
| **Sublime Text** | All platforms | **Community plugin** | Community-maintained |
| **ACP UI** | Web/Desktop/Mobile | **Universal client** | Vue-based; runs as web app, desktop (Tauri), iOS, Android |

**Agent/Runtime Servers (the "ACP providers"):**

| Agent | Native ACP? | Adapter | Notes |
|-------|-------------|---------|-------|
| **Claude Code** | Via adapter | `claude-agent-acp` | Anthropic's official adapter |
| **Codex** | Via adapter | `codex-acp` | OpenAI's official adapter |
| **Gemini CLI** | **Native** (`--acp` flag) | Built-in | Google's native ACP support |
| **GitHub Copilot** | Via adapter | `copilot-acp` | GitHub's adapter |
| **OpenClaw** | **Native** | Built-in (`openclaw acp`) | Both bridge mode and harness mode |
| **Cursor** | Via adapter | `cursor-agent-acp` | Cursor's adapter |
| **Qwen Code** | **Native** | Built-in | Alibaba's native ACP support |
| **Kimi/Moonshot** | Via adapter | `kimi-acp` | Moonshot's adapter |
| **OpenCode** | Via adapter | `opencode-acp` | OpenCode's adapter |
| **Kiro** | Via adapter | `kiro-acp` | Kiro's adapter |
| **Droid** | Via adapter | `droid-acp` | Factory's adapter |
| **Poolside** | **Native** | Built-in | Poolside's native ACP |
| **Auggie** | Via adapter | Community | Community adapter |
| **Qoder** | Via adapter | Community | Community adapter |
| **Hermes** | Via adapter | Community | Community adapter |

**SDKs and Libraries:**

| SDK | Language | Repository | Maturity |
|-----|----------|------------|----------|
| **acp-sdk** | Python | `agentclientprotocol/acp-sdk` | Official, mature |
| **acp-sdk** | TypeScript | `agentclientprotocol/acp-sdk-ts` | Official, mature |
| **acp-sdk** | Go | `agentclientprotocol/acp-sdk-go` | Official, growing |
| **acp-sdk** | Rust | `agentclientprotocol/acp-sdk-rs` | Official, growing |
| **React hooks** | TypeScript | `acp-react-hooks` | Community, active |
| **Obsidian plugin** | TypeScript | `obsidian-acp` | Community, active |

**Key Insight for Mech Design:**
ACP is the **dominant interoperability layer** for editor-to-agent communication. With 93+ repos, support across 6+ editors, 15+ agents, and 4 official SDKs, building on ACP gives your mech extensions maximum compatibility. The protocol's JSON-RPC 2.0 foundation makes it straightforward to implement in any language.

### 3.2 ACP vs. MCP — Complementary, Not Competing

| | **MCP** | **ACP** |
|--|---------|---------|
| **Between** | Agent ↔ Tools | Editor ↔ Agent |
| **Problem** | How does the agent call tools? | How does the editor drive the agent? |
| **Client** | AI application / host | Code editor / IDE |
| **Server** | Tool provider | AI coding agent |
| **Transport** | stdio / HTTP / SSE | stdio (today) / WebSocket (bridge mode) |

**For your mech**: Use **ACP** to connect editors/IDEs to your agent runtime. Use **MCP** to give your agent tools. Both protocols can coexist — ACP drives the agent, MCP equips it.

### 3.3 Mech Extension Design Recommendations

Based on this audit, here is how to design extensions that bolt cleanly onto both systems:

**For Goose Extensions:**
- Implement the `Provider` trait for your mech's LLM backend
- Use the Recipe system for multi-step workflows
- Hook into the `HookManager` for lifecycle events
- Use MCP for tool server communication
- Leverage the `PromptManager` for dynamic context injection

**For OpenClaw Extensions:**
- Use the **native hook relay** for out-of-process extensions
- Implement the **Crestodian policy interface** for custom approval gates
- Use the **plugin SDK** (`src/plugin-sdk/`) for typed tool registration
- Store per-agent data in the **agent-specific SQLite cache**
- Hook into **trajectory export** for audit trail integration
- Use **ACP harness spawning** for delegating to external agents

**Cross-Cutting Design:**
- Speak **ACP** for editor integration (maximum ecosystem compatibility)
- Speak **MCP** for tool provision (maximum tool ecosystem access)
- Use **SQLite** for state persistence (both systems use it)
- Implement **progressive context compaction** for long-running sessions
- Design for **per-agent isolation** (both systems support it)

---

## Appendix: Key File References

### Goose
- `crates/goose/src/agents/agent.rs` — ReAct loop core (3,392 lines)
- `crates/goose/src/providers/base.rs` — Provider trait (1,861 lines)
- `crates/goose/src/acp/server.rs` — ACP server implementation
- `crates/goose/src/session/` — Session persistence
- `crates/goose/src/recipe.rs` — Recipe/workflow runner
- `crates/goose/src/hooks/mod.rs` — Hook system

### OpenClaw
- `src/crestodian/rescue-policy.ts` — Warden boundary decisions
- `src/state/openclaw-state-schema.sql` — Global SQLite schema (1,207 lines)
- `src/state/openclaw-agent-schema.sql` — Per-agent SQLite schema
- `src/trajectory/runtime.ts` — Audit trail runtime
- `src/mcp/channel-server.ts` — MCP channel server
- `src/mcp/channel-bridge.ts` — MCP bridge implementation
- `src/hooks/hooks.ts` — Hook system
- `src/tools/` — Tool registry and boundary enforcement
- `src/flows/` — Workflow execution
