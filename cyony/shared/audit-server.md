# goose-server Crate - Deep Technical Audit

> **Audit Date:** 2025-06-05
> **Target:** `goose-server` crate of the Tripp.reason (goose) AI coding agent framework
> **Audit Scope:** Server architecture, API routes, WebSocket support, authentication, feature flags, and core goose integration

---

## Table of Contents

1. [Overview](#1-overview)
2. [Crate Manifest (Cargo.toml)](#2-crate-manifest-cargotoml)
3. [Server Architecture](#3-server-architecture)
4. [State Management](#4-state-management)
5. [Configuration System](#5-configuration-system)
6. [API Routes - Complete Reference](#6-api-routes---complete-reference)
7. [Agent Route Deep Dive](#7-agent-route-deep-dive)
8. [Reply Route / Streaming Mechanism](#8-reply-route--streaming-mechanism)
9. [Session Route Deep Dive](#9-session-route-deep-dive)
10. [WebSocket Support](#10-websocket-support)
11. [Authentication](#11-authentication)
12. [Feature Flags](#12-feature-flags)
13. [Integration with Core Goose](#13-integration-with-core-goose)
14. [Security Analysis](#14-security-analysis)
15. [Missing/Unavailable Modules](#15-missingunavailable-modules)

---

## 1. Overview

The `goose-server` crate is the HTTP server component of the Goose AI coding agent framework. It provides a REST API (built on Axum) for managing AI agents, sessions, tool execution, and real-time streaming communication. The binary is named `goosed`.

### Key Characteristics

- **Framework:** Axum (Tokio-based async web framework)
- **Protocol:** HTTP/1.1 and HTTP/2 with optional TLS (rustls or native-tls)
- **Real-time:** Server-Sent Events (SSE) for streaming agent responses
- **State:** In-memory with Arc-shared state across handlers
- **API Documentation:** OpenAPI/Swagger via `utoipa`
- **CORS:** Enabled via `tower-http`

---

## 2. Crate Manifest (Cargo.toml)

```toml
[package]
name = "goose-server"

[[bin]]
name = "goosed"
path = "src/main.rs"

[[bin]]
name = "generate_schema"
path = "src/bin/generate_schema.rs"
```

### Two Binaries

| Binary | Purpose |
|--------|---------|
| `goosed` | The main agent server daemon |
| `generate_schema` | Schema generation utility |

### Key Dependencies

| Crate | Version/Config | Purpose |
|-------|---------------|---------|
| `axum` | `"ws", "macros"` | Web framework + WebSocket support |
| `axum-server` | `0.8.0` | HTTP server with TLS |
| `tokio` | workspace | Async runtime |
| `tower-http` | `"cors"` | CORS middleware |
| `tokio-tungstenite` | `0.29.0` | WebSocket implementation |
| `serde_json` | `"preserve_order"` | JSON serialization |
| `utoipa` | `"axum_extras", "chrono"` | OpenAPI documentation |
| `reqwest` | `"json", "blocking", "multipart", "system-proxy"` | HTTP client |
| `config` | `0.15.23`, `"toml"` | Configuration management |
| `goose` | `path = "../goose"` | Core goose library |
| `goose-mcp` | `path = "../goose-mcp"` | MCP server implementations |
| `rcgen` | `0.14` | Certificate generation |
| `pem` | `3.0.6` | PEM encoding |

### Windows-Specific Dependency

```toml
[target.'cfg(windows)'.dependencies]
winreg = { version = "0.56.0" }
```

---

## 3. Server Architecture

### 3.1 Entry Point (`main.rs`)

```rust
mod commands;       // CLI command dispatch
mod configuration;  // Server config (host, port, TLS)
mod error;          // Error types
mod logging;        // Logging setup
mod openapi;        // OpenAPI schema generation
mod routes;         // All HTTP route handlers
mod session_event_bus; // Real-time session event pub/sub
mod state;          // Application state
mod tunnel;         // Tunnel/proxy management
```

The `main.rs` uses **clap** for CLI parsing with three subcommands:

```rust
#[derive(Subcommand)]
enum Commands {
    /// Run the agent server
    Agent,
    /// Run the MCP server (standalone MCP routers)
    Mcp { server: McpCommand },
    /// Validate a bundled-extensions JSON file
    ValidateExtensions { path: PathBuf },
}
```

**MCP Sub-commands:**
- `AutoVisualiser` - Auto visualizer router
- `ComputerController` - Computer controller server
- `Memory` - Memory server
- `Tutorial` - Tutorial server

### 3.2 Boot Sequence

The server uses a boot marker pattern for startup diagnostics:

```rust
fn boot_marker(message: &str) {
    eprintln!("GOOSED_BOOT: {message}");
}
```

Boot markers are emitted at:
1. `main entered`
2. `command parsed: {:?}`

### 3.3 Panic Hook

A custom panic hook captures backtraces and logs them with `GOOSED_BOOT` prefix:

```rust
fn install_panic_hook() {
    let default_hook = std::panic::take_hook();
    std::panic::set_hook(Box::new(move |panic_info: &PanicHookInfo<'_>| {
        let location = panic_info.location()
            .map(|l| format!("{}:{}", l.file(), l.line()))
            .unwrap_or_else(|| "unknown".to_string());
        let payload = panic_info.payload()  // downcast to &str/String
            .unwrap_or_else(|| "unknown panic payload".to_string());
        eprintln!("GOOSED_BOOT: panic at {location}: {payload}");
        eprintln!("GOOSED_BOOT: backtrace:\n{}", Backtrace::force_capture());
        default_hook(panic_info);
    }));
}
```

### 3.4 Server Startup (`commands::agent::run`)

> **Note:** The `commands::agent` module is NOT present in this checkout. The following is inferred from the state/configuration modules.

The server startup flow (inferred):
1. Parse CLI → `Commands::Agent`
2. Call `commands::agent::run().await`
3. Load `Settings` from environment variables (GOOSE_HOST, GOOSE_PORT, GOOSE_TLS, etc.)
4. Create `AppState` with TLS flag
5. Build Axum router with all routes
6. Start HTTP server (with optional TLS)

---

## 4. State Management

### 4.1 `AppState` (`state.rs`)

The central application state is a cloneable struct wrapped in `Arc<AppState>`:

```rust
#[derive(Clone)]
pub struct AppState {
    pub(crate) agent_manager: Arc<AgentManager>,
    pub recipe_file_hash_map: Arc<Mutex<HashMap<String, PathBuf>>>,
    recipe_session_tracker: Arc<Mutex<HashSet<String>>>,
    pub tunnel_manager: Arc<TunnelManager>,
    pub gateway_manager: Arc<GatewayManager>,
    pub extension_loading_tasks: ExtensionLoadingTasks,
    #[cfg(feature = "local-inference")]
    inference_runtime: Arc<OnceLock<Arc<InferenceRuntime>>>,
    session_buses: Arc<Mutex<HashMap<String, Arc<SessionEventBus>>>>,
}
```

### 4.2 State Construction

```rust
impl AppState {
    pub async fn new(tls: bool) -> anyhow::Result<Arc<AppState>> {
        register_builtin_extensions(goose_mcp::BUILTIN_EXTENSIONS.clone());

        let agent_manager = AgentManager::instance().await?;
        let tunnel_manager = Arc::new(TunnelManager::new(tls));
        let gateway_manager = Arc::new(GatewayManager::new(agent_manager.clone())?);

        Ok(Arc::new(Self {
            agent_manager,
            recipe_file_hash_map: Arc::new(Mutex::new(HashMap::new())),
            recipe_session_tracker: Arc::new(Mutex::new(HashSet::new())),
            tunnel_manager,
            gateway_manager,
            extension_loading_tasks: Arc::new(Mutex::new(HashMap::new())),
            #[cfg(feature = "local-inference")]
            inference_runtime: Arc::new(OnceLock::new()),
            session_buses: Arc::new(Mutex::new(HashMap::new())),
        }))
    }
}
```

### 4.3 Key State Components

| Field | Type | Purpose |
|-------|------|---------|
| `agent_manager` | `Arc<AgentManager>` | Singleton managing all agent instances per session |
| `recipe_file_hash_map` | `Arc<Mutex<HashMap<String, PathBuf>>>` | Maps recipe file hashes to paths |
| `recipe_session_tracker` | `Arc<Mutex<HashSet<String>>>` | Tracks which sessions have run recipes (for telemetry) |
| `tunnel_manager` | `Arc<TunnelManager>` | Manages network tunnels |
| `gateway_manager` | `Arc<GatewayManager>` | Manages external platform gateways (Telegram, etc.) |
| `extension_loading_tasks` | `ExtensionLoadingTasks` | Background extension loading per session |
| `inference_runtime` | `Arc<OnceLock<Arc<InferenceRuntime>>>` | Local LLM inference runtime (feature-gated) |
| `session_buses` | `Arc<Mutex<HashMap<String, Arc<SessionEventBus>>>>` | Per-session event buses for pub/sub |

### 4.4 Background Extension Loading

The server implements **background extension loading** to improve startup performance:

```rust
pub async fn set_extension_loading_task(
    &self,
    session_id: String,
    task: JoinHandle<Vec<ExtensionLoadResult>>,
) {
    let mut tasks = self.extension_loading_tasks.lock().await;
    tasks.insert(session_id, Arc::new(Mutex::new(Some(task))));
}

pub async fn take_extension_loading_task(
    &self,
    session_id: &str,
) -> Option<Vec<ExtensionLoadResult>> {
    // Takes the task, awaits it, returns results
}
```

When an agent starts, extensions are loaded in a spawned Tokio task. Subsequent requests can either:
- Wait for the background task to complete (`take_extension_loading_task`)
- Load extensions synchronously if the task is gone

### 4.5 Session Event Bus

Each session can have an associated `SessionEventBus`:

```rust
pub async fn get_or_create_event_bus(&self, session_id: &str) -> Arc<SessionEventBus> {
    let mut buses = self.session_buses.lock().await;
    buses
        .entry(session_id.to_string())
        .or_insert_with(|| Arc::new(SessionEventBus::new()))
        .clone()
}
```

This enables real-time event publishing/subscribing per session.

### 4.6 Agent Access

```rust
pub async fn get_agent(&self, session_id: String) -> anyhow::Result<Arc<goose::agents::Agent>> {
    self.agent_manager.get_or_create_agent(session_id).await
}

pub async fn get_agent_for_route(
    &self,
    session_id: String,
) -> Result<Arc<goose::agents::Agent>, StatusCode> {
    self.get_agent(session_id).await.map_err(|e| {
        tracing::error!("Failed to get agent: {}", e);
        StatusCode::INTERNAL_SERVER_ERROR
    })
}
```

`get_agent_for_route` wraps `get_agent` with HTTP status code conversion for route handlers.

---

## 5. Configuration System

### 5.1 `Settings` (`configuration.rs`)

```rust
#[derive(Debug, Default, Deserialize)]
pub struct Settings {
    #[serde(default = "default_host")]
    pub host: String,           // default: "127.0.0.1"
    #[serde(default = "default_port")]
    pub port: u16,              // default: 3000
    #[serde(default = "default_tls")]
    pub tls: bool,              // default: true
    pub tls_cert_path: Option<String>,
    pub tls_key_path: Option<String>,
}
```

### 5.2 Configuration Loading

Configuration is loaded from **environment variables** with the `GOOSE_` prefix:

```rust
let config = Config::builder()
    // Server defaults
    .set_default("host", default_host())?      // "127.0.0.1"
    .set_default("port", default_port())?      // 3000
    .set_default("tls", default_tls())?        // true
    // Layer on environment variables
    .add_source(
        Environment::with_prefix("GOOSE")
            .prefix_separator("_")
            .separator("__")    // Nested: GOOSE_FOO__BAR
            .try_parsing(true),
    )
    .build()?;
```

### 5.3 Environment Variable Mapping

| Variable | Type | Default | Description |
|----------|------|---------|-------------|
| `GOOSE_HOST` | string | `127.0.0.1` | Bind address |
| `GOOSE_PORT` | u16 | `3000` | Listening port |
| `GOOSE_TLS` | bool | `true` | Enable TLS |
| `GOOSE_TLS_CERT_PATH` | Option<string> | None | TLS certificate file |
| `GOOSE_TLS_KEY_PATH` | Option<string> | None | TLS private key file |

### 5.4 Missing Field Error Handling

The configuration system has special handling for missing fields:

```rust
match result {
    Ok(settings) => Ok(settings),
    Err(err) => {
        let error_str = err.to_string();
        if error_str.starts_with("missing field") {
            let field = error_str
                .trim_start_matches("missing field `")
                .trim_end_matches("`");
            let env_var = to_env_var(field);
            Err(ConfigError::MissingEnvVar { env_var })
        } else if let config::ConfigError::NotFound(field) = &err {
            let env_var = to_env_var(field);
            Err(ConfigError::MissingEnvVar { env_var })
        } else {
            Err(ConfigError::Other(err))
        }
    }
}
```

---

## 6. API Routes - Complete Reference

### 6.1 Route Registration (`routes/mod.rs`)

All routes are merged into a single Axum Router:

```rust
pub fn configure(state: Arc<AppState>, secret_key: String) -> Router {
    let router = Router::new()
        .merge(status::routes(state.clone()))
        .merge(reply::routes(state.clone()))
        .merge(action_required::routes(state.clone()))
        .merge(agent::routes(state.clone()))
        .merge(config_management::routes(state.clone()))
        .merge(prompts::routes())
        .merge(recipe::routes(state.clone()))
        .merge(session::routes(state.clone()))
        .merge(schedule::routes(state.clone()))
        .merge(setup::routes(state.clone()))
        .merge(telemetry::routes(state.clone()))
        .merge(tunnel::routes(state.clone()))
        .merge(gateway::routes(state.clone()))
        .merge(mcp_ui_proxy::routes(secret_key.clone()))
        .merge(mcp_app_proxy::routes(secret_key))
        .merge(session_events::routes(state.clone()))
        .merge(sampling::routes(state.clone()))
        .merge(dictation::routes(state.clone()))
        .merge(features::routes());

    #[cfg(feature = "local-inference")]
    let router = router.merge(local_inference::routes(state));

    router
}
```

### 6.2 Route Module Inventory

| Module | Source File | Status in Checkout |
|--------|------------|-------------------|
| `agent` | `routes/agent.rs` | **Available** |
| `reply` | `routes/reply.rs` | **Available** |
| `session` | `routes/session.rs` | **Available** |
| `mod` | `routes/mod.rs` | **Available** |
| `action_required` | - | **Missing** |
| `config_management` | - | **Missing** |
| `dictation` | - | **Missing** |
| `errors` | - | **Missing** |
| `features` | - | **Missing** |
| `gateway` | - | **Missing** |
| `local_inference` | - | **Missing** (feature-gated) |
| `mcp_app_proxy` | - | **Missing** |
| `mcp_ui_proxy` | - | **Missing** |
| `prompts` | - | **Missing** |
| `recipe` | - | **Missing** |
| `recipe_utils` | - | **Missing** |
| `sampling` | - | **Missing** |
| `schedule` | - | **Missing** |
| `session_events` | - | **Missing** |
| `setup` | - | **Missing** |
| `status` | - | **Missing** |
| `telemetry` | - | **Missing** |
| `tunnel` | - | **Missing** |
| `utils` | - | **Missing** |

### 6.3 Complete Endpoint Summary

Based on all available source files, here is every documented endpoint:

#### **Agent Routes** (`routes/agent.rs`)

| Method | Path | Handler | Auth |
|--------|------|---------|------|
| POST | `/agent/start` | `start_agent` | Secret key |
| POST | `/agent/resume` | `resume_agent` | Secret key |
| POST | `/agent/restart` | `restart_agent` | Secret key |
| POST | `/agent/stop` | `stop_agent` | Secret key |
| POST | `/agent/update_working_dir` | `update_working_dir` | Secret key |
| GET | `/agent/tools` | `get_tools` | Secret key |
| POST | `/agent/read_resource` | `read_resource` | Secret key |
| POST | `/agent/call_tool` | `call_tool` | Secret key |
| GET | `/agent/list_apps` | `list_apps` | Secret key |
| GET | `/agent/export_app/{name}` | `export_app` | Secret key |
| POST | `/agent/import_app` | `import_app` | Secret key |
| POST | `/agent/update_provider` | `update_agent_provider` | Secret key |
| POST | `/agent/update_session` | `update_session` | Secret key |
| POST | `/agent/update_from_session` | `update_from_session` | Secret key |
| POST | `/agent/add_extension` | `agent_add_extension` | Secret key |
| POST | `/agent/remove_extension` | `agent_remove_extension` | Secret key |
| POST | `/agent/set_container` | `set_container` | Secret key |

#### **Reply Route** (`routes/reply.rs`)

| Method | Path | Handler | Auth |
|--------|------|---------|------|
| POST | `/reply` | `reply` (SSE stream) | Secret key |

#### **Session Routes** (`routes/session.rs`)

| Method | Path | Handler | Auth |
|--------|------|---------|------|
| GET | `/sessions` | `list_sessions` | API key |
| GET | `/sessions/search` | `search_sessions` | API key |
| GET | `/sessions/{session_id}` | `get_session` | API key |
| DELETE | `/sessions/{session_id}` | `delete_session` | API key |
| PUT | `/sessions/{session_id}/name` | `update_session_name` | API key |
| PUT | `/sessions/{session_id}/user_recipe_values` | `update_session_user_recipe_values` | API key |
| GET | `/sessions/{session_id}/export` | `export_session` | API key |
| POST | `/sessions/import` | `import_session` | API key |
| POST | `/sessions/{session_id}/share/nostr` | `share_session_nostr` | API key |
| POST | `/sessions/import/nostr` | `import_session_nostr` | API key |
| POST | `/sessions/{session_id}/fork` | `fork_session` | API key |
| GET | `/sessions/insights` | `get_session_insights` | API key |
| GET | `/sessions/{session_id}/extensions` | `get_session_extensions` | API key |

#### **Other Routes** (from `routes/mod.rs` module list)

| Module | Inferred Purpose |
|--------|-----------------|
| `status` | Health check / server status |
| `action_required` | Pending user action/confirmation management |
| `config_management` | Provider configuration, API keys, settings |
| `prompts` | Prompt management / template CRUD |
| `recipe` | Recipe CRUD and execution |
| `schedule` | Scheduled agent runs |
| `setup` | First-time setup / onboarding |
| `telemetry` | Telemetry event submission |
| `tunnel` | Tunnel management for external access |
| `gateway` | External messaging gateway config (Telegram) |
| `mcp_ui_proxy` | MCP UI proxy with secret key auth |
| `mcp_app_proxy` | MCP app proxy with secret key auth |
| `session_events` | Session event streaming / WebSocket |
| `sampling` | LLM sampling / model interaction proxy |
| `dictation` | Speech-to-text / voice input |
| `features` | Feature flag management |
| `local_inference` | Local LLM inference endpoints (feature-gated) |

---

## 7. Agent Route Deep Dive

The agent route (`routes/agent.rs`, ~1449 lines including tests) is the core API for agent lifecycle management. It defines 16+ endpoints covering agent CRUD, tool execution, extension management, provider configuration, and app management.

### 7.1 Request/Response Types

#### `StartAgentRequest`
```rust
#[derive(Deserialize, utoipa::ToSchema)]
pub struct StartAgentRequest {
    working_dir: String,
    #[serde(default)]
    recipe: Option<Recipe>,
    #[serde(default)]
    recipe_id: Option<String>,
    #[serde(default)]
    recipe_deeplink: Option<String>,
    #[serde(default)]
    extension_overrides: Option<Vec<ExtensionConfig>>,
}
```

#### `ResumeAgentRequest`
```rust
#[derive(Deserialize, utoipa::ToSchema)]
pub struct ResumeAgentRequest {
    session_id: String,
    load_model_and_extensions: bool,
}
```

#### `RestartAgentRequest`
```rust
#[derive(Deserialize, utoipa::ToSchema)]
pub struct RestartAgentRequest {
    session_id: String,
}
```

#### `AddExtensionRequest`
```rust
#[derive(Deserialize, utoipa::ToSchema)]
pub struct AddExtensionRequest {
    session_id: String,
    config: ExtensionConfig,
}
```

#### `CallToolRequest`
```rust
#[derive(Deserialize, utoipa::ToSchema)]
pub struct CallToolRequest {
    session_id: String,
    name: String,
    arguments: Value,
}
```

#### `ReadResourceRequest`
```rust
#[derive(Deserialize, utoipa::ToSchema)]
pub struct ReadResourceRequest {
    session_id: String,
    extension_name: String,
    uri: String,
}
```

### 7.2 Endpoint: `POST /agent/start`

**Purpose:** Creates a new session and starts an agent with optional recipe/extensions.

**Flow:**
1. Set telemetry session context ("desktop", false)
2. Resolve recipe from: `recipe_deeplink` → `recipe_id` → inline `recipe`
3. Validate the recipe if present
4. Create a new session via `SessionManager::create_session()`
5. Resolve extensions from recipe + overrides
6. Initialize `EnabledExtensionsState` and save to session
7. If recipe has settings (provider/model), update session
8. **Start background extension loading** via `tokio::spawn`
9. Return the session

```rust
// Background extension loading spawn
let task = tokio::spawn(async move {
    match state_for_spawn.get_agent(session_for_spawn.id.clone()).await {
        Ok(agent) => {
            let results = agent.load_extensions_from_session(&session_for_spawn).await;
            results
        }
        Err(e) => vec![]
    }
});
state.set_extension_loading_task(session_id_for_task, task).await;
```

### 7.3 Endpoint: `POST /agent/resume`

**Purpose:** Resumes an existing session, optionally loading model and extensions.

**Flow:**
1. Fetch session by ID
2. If `load_model_and_extensions: true`:
   - Get or create agent
   - Restore provider from session
   - Check for background extension loading results
   - If no background task, load extensions synchronously
3. Return session + extension results

### 7.4 Endpoint: `POST /agent/restart`

**Purpose:** Fully restarts an agent for a session.

**Implementation** delegates to `restart_agent_internal`:
```rust
async fn restart_agent_internal(
    state: &Arc<AppState>,
    session_id: &str,
    session: &Session,
) -> Result<Vec<ExtensionLoadResult>, ErrorResponse> {
    // 1. Remove existing agent
    let _ = state.agent_manager.remove_session(session_id).await;

    // 2. Create new agent
    let agent = state.get_agent_for_route(session_id.to_string()).await?;

    // 3. Restore provider AND load extensions concurrently
    let (provider_result, extension_results) = tokio::join!(
        agent.restore_provider_from_session(session),
        agent.load_extensions_from_session(session)
    );

    // 4. Re-apply recipe if present
    if let Some(ref recipe) = session.recipe {
        // ... recipe application
    }

    Ok(extension_results)
}
```

### 7.5 Endpoint: `GET /agent/tools`

**Purpose:** Lists available tools for a session, with permission metadata.

```rust
async fn get_tools(
    State(state): State<Arc<AppState>>,
    Query(query): Query<GetToolsQuery>,
) -> Result<Json<Vec<ToolInfo>>, StatusCode> {
    let agent = state.get_agent_for_route(session_id.clone()).await?;
    let goose_mode = agent.goose_mode().await;
    let permission_manager = agent.config.permission_manager.clone();

    let mut tools: Vec<ToolInfo> = agent
        .list_tools(&session_id, query.extension_name)
        .await
        .into_iter()
        .map(|tool| {
            let permission = permission_manager
                .get_user_permission(&tool.name)
                .or_else(|| {
                    if goose_mode == GooseMode::SmartApprove {
                        permission_manager.get_smart_approve_permission(&tool.name)
                    } else if goose_mode == GooseMode::Approve {
                        Some(PermissionLevel::AskBefore)
                    } else {
                        None
                    }
                });

            ToolInfo::new(&tool.name, /* ... */, permission)
                .with_input_schema(serde_json::Value::Object(tool.input_schema.as_ref().clone()))
        })
        .collect();
    tools.sort_by(|a, b| a.name.cmp(&b.name));
    Ok(Json(tools))
}
```

### 7.6 Endpoint: `POST /agent/call_tool`

**Purpose:** Direct tool invocation by name.

**Security checks:**
1. **App visibility check:** Rejects tools not visible to apps (`is_tool_visible_to_app`)
2. **Frontend tool check:** Rejects tools provided by the frontend (must be executed client-side)

```rust
// Check app-side visibility
if !is_tool_visible_to_app(tool) {
    return Err(ErrorResponse {
        message: format!("Tool '{}' cannot be called by the app", payload.name),
        status: StatusCode::FORBIDDEN,
    });
}

// Frontend tools must be executed by frontend host
if agent.is_frontend_tool(&payload.name).await {
    return Err(ErrorResponse {
        message: format!("Tool '{}' is provided by the frontend...", payload.name),
        status: StatusCode::FAILED_DEPENDENCY,  // HTTP 424
    });
}
```

### 7.7 Endpoint: `POST /agent/read_resource`

**Purpose:** Read a resource URI from an extension.

**Flow:**
1. Ensure extensions are loaded (`ensure_extensions_loaded`)
2. Get agent
3. Call `extension_manager.read_resource()`
4. Handle both `TextResourceContents` and `BlobResourceContents` (with base64 decode)

```rust
let read_result = agent.extension_manager.read_resource(
    &payload.session_id, &payload.uri, &payload.extension_name,
    CancellationToken::default()
).await?;

let content = read_result.contents.into_iter().next().ok_or(StatusCode::NOT_FOUND)?;

let (uri, mime_type, text, meta) = match content {
    ResourceContents::TextResourceContents { uri, mime_type, text, meta } => (uri, mime_type, text, meta),
    ResourceContents::BlobResourceContents { uri, mime_type, blob, meta } => {
        let decoded = base64::engine::general_purpose::STANDARD.decode(&blob)?;
        let text = String::from_utf8(decoded)?;
        (uri, mime_type, text, meta)
    }
};
```

### 7.8 Endpoint: `POST /agent/update_provider`

**Purpose:** Change the LLM provider for an agent session.

**Flow:**
1. Get agent for session
2. Resolve model from payload or config
3. Build `ModelConfig` with context limits and request params
4. Resolve provider+model info (for reasoning support)
5. Get enabled extensions for the session
6. Create new provider via `goose::providers::create()`
7. Update agent's provider
8. Propagate goose mode to new provider

### 7.9 Endpoint: `POST /agent/update_session`

**Purpose:** Update session configuration (goose mode).

```rust
if let Some(mode_str) = payload.goose_mode {
    let mode: GooseMode = mode_str.parse()?;
    agent.update_goose_mode(mode, &payload.session_id).await?;
}
```

### 7.10 App Management Endpoints

| Endpoint | Method | Purpose |
|----------|--------|---------|
| `GET /agent/list_apps` | GET | List available MCP apps (with caching) |
| `GET /agent/export_app/{name}` | GET | Export an app as HTML |
| `POST /agent/import_app` | POST | Import an app from HTML (with name deduplication) |

App import does name deduplication:
```rust
while existing_names.contains(&app.resource.name) {
    app.resource.name = format!("{}_{}", original_name, counter);
    counter += 1;
}
```

---

## 8. Reply Route / Streaming Mechanism

The reply route (`routes/reply.rs`, ~509 lines) is the **most critical endpoint** - it handles streaming AI responses via Server-Sent Events (SSE).

### 8.1 Endpoint: `POST /reply`

**Request:**
```rust
#[derive(Debug, Deserialize, Serialize, utoipa::ToSchema)]
pub struct ChatRequest {
    user_message: Message,
    /// Override the server's conversation history. Only use this when you need absolute control
    /// over the conversation state (e.g., administrative tools).
    #[serde(default)]
    override_conversation: Option<Vec<Message>>,
    session_id: String,
    recipe_name: Option<String>,
    recipe_version: Option<String>,
}
```

**Response:** SSE stream (`text/event-stream`) of `MessageEvent` objects.

### 8.2 SSE Response Structure

Custom `SseResponse` wraps a `ReceiverStream<String>`:

```rust
pub struct SseResponse {
    rx: ReceiverStream<String>,
}

impl Stream for SseResponse {
    type Item = Result<Bytes, Infallible>;
    fn poll_next(mut self: Pin<&mut Self>, cx: &mut Context<'_>) -> Poll<Option<Self::Item>> {
        Pin::new(&mut self.rx)
            .poll_next(cx)
            .map(|opt| opt.map(|s| Ok(Bytes::from(s))))
    }
}

impl IntoResponse for SseResponse {
    fn into_response(self) -> axum::response::Response {
        let body = axum::body::Body::from_stream(self);
        http::Response::builder()
            .header("Content-Type", "text/event-stream")
            .header("Cache-Control", "no-cache")
            .header("Connection", "keep-alive")
            .body(body)
            .unwrap()
    }
}
```

### 8.3 Message Event Types

```rust
#[derive(Debug, Clone, Serialize, utoipa::ToSchema)]
#[serde(tag = "type")]
pub enum MessageEvent {
    Message {
        message: Message,
        token_state: TokenState,
    },
    Error {
        error: String,
    },
    Finish {
        reason: String,
        token_state: TokenState,
    },
    Notification {
        request_id: String,
        message: ServerNotification,
    },
    UpdateConversation {
        conversation: Conversation,
    },
    ActiveRequests {
        request_ids: Vec<String>,
    },
    Ping,
}
```

### 8.4 Streaming Implementation

The handler spawns a background Tokio task that:

1. **Gets the agent** for the session
2. **Gets the session** metadata
3. **Prepares conversation history** (with optional override)
4. **Calls `agent.reply()`** to get a message stream
5. **Runs an event loop** with `tokio::select!`:

```rust
tokio::select! {
    _ = task_cancel.cancelled() => {
        tracing::info!("Agent task cancelled");
        break;
    }
    _ = heartbeat_interval.tick() => {
        stream_event(MessageEvent::Ping, &tx, &cancel_token).await;
    }
    response = timeout(Duration::from_millis(500), stream.next()) => {
        match response {
            Ok(Some(Ok(AgentEvent::Message(message)))) => {
                // Track tool telemetry
                for content in &message.content {
                    track_tool_telemetry(content, all_messages.messages());
                }
                all_messages.push(message.clone());
                let token_state = get_token_state(...).await;
                stream_event(MessageEvent::Message { message, token_state }, ...).await;
            }
            Ok(Some(Ok(AgentEvent::HistoryReplaced(new_messages)))) => {
                all_messages = new_messages.clone();
                stream_event(MessageEvent::UpdateConversation { conversation: new_messages }, ...).await;
            }
            Ok(Some(Ok(AgentEvent::McpNotification((request_id, n))))) => {
                stream_event(MessageEvent::Notification { request_id, message: n }, ...).await;
            }
            Ok(Some(Err(e))) => { /* error event */ break; }
            Ok(None) => { break; }  // Stream ended
            Err(_) => { /* timeout - check if client closed */ continue; }
        }
    }
}
```

### 8.5 Key Design Patterns

- **Cancellation:** Uses `CancellationToken` for client disconnect
- **Heartbeat:** 500ms ping interval to keep connection alive
- **Timeout:** 500ms on stream reads to allow heartbeat/cancel checks
- **Telemetry:** Tracks tool calls, completions, session duration, token usage
- **Token state:** Fetched from session metadata after each message

### 8.6 Telemetry Events

```rust
// Session start
tracing::info!(monotonic_counter.goose.session_starts = 1, session_type = "app", interface = "ui", ...);

// Recipe tracking
if state.mark_recipe_run_if_absent(&session_id).await {
    tracing::info!(monotonic_counter.goose.recipe_runs = 1, recipe_name = %recipe_name, ...);
}

// Session completion
tracing::info!(monotonic_counter.goose.session_completions = 1, exit_type = "normal",
    duration_ms = ..., total_tokens = ..., message_count = ..., ...);
```

### 8.7 Tool Telemetry Tracking

```rust
pub fn track_tool_telemetry(content: &MessageContent, all_messages: &[Message]) {
    match content {
        MessageContent::ToolRequest(tool_request) => {
            if let Ok(tool_call) = &tool_request.tool_call {
                tracing::info!(monotonic_counter.goose.tool_calls = 1,
                    tool_name = %tool_call.name, "Tool call started");
            }
        }
        MessageContent::ToolResponse(tool_response) => {
            // Find matching request to get tool name
            let tool_name = all_messages.iter().rev().find_map(|msg| { ... });
            let success = tool_response.tool_result.is_ok();
            tracing::info!(monotonic_counter.goose.tool_completions = 1,
                tool_name = %tool_name, result = %result_status, "Tool call completed");
        }
        _ => {}
    }
}
```

### 8.8 Request Body Limit

```rust
pub fn routes(state: Arc<AppState>) -> Router {
    Router::new()
        .route("/reply", post(reply).layer(DefaultBodyLimit::max(50 * 1024 * 1024)))
        .with_state(state)
}
```

The reply endpoint accepts **50MB request bodies** (for large conversation overrides).

---

## 9. Session Route Deep Dive

The session route (`routes/session.rs`, ~703 lines) manages session CRUD, search, export/import, forking, and Nostr sharing.

### 9.1 Request/Response Types

```rust
#[derive(Serialize, ToSchema)]
#[serde(rename_all = "camelCase")]
pub struct SessionListResponse {
    sessions: Vec<Session>,
}

#[derive(Deserialize, ToSchema)]
pub struct UpdateSessionNameRequest {
    name: String,  // max 200 characters
}

#[derive(Deserialize, ToSchema)]
pub struct ForkRequest {
    timestamp: Option<i64>,
    truncate: bool,
    copy: bool,
}

#[derive(Deserialize, ToSchema)]
pub struct SearchSessionsQuery {
    query: String,
    #[serde(default = "default_limit")]
    limit: usize,  // default: 10, max: 50
    after_date: Option<String>,  // ISO 8601
    before_date: Option<String>,  // ISO 8601
}
```

### 9.2 Endpoint: `GET /sessions`

Lists all sessions via `SessionManager::list_sessions()`.

### 9.3 Endpoint: `GET /sessions/search`

Full-text search across chat sessions with date filtering.

```rust
async fn search_sessions(
    State(state): State<Arc<AppState>>,
    axum::extract::Query(params): axum::extract::Query<SearchSessionsQuery>,
) -> Result<Json<Vec<Session>>, StatusCode> {
    let query = params.query.trim();
    if query.is_empty() { return Err(StatusCode::BAD_REQUEST); }

    let limit = params.limit.min(50);  // Hard cap at 50

    let after_date = params.after_date
        .and_then(|s| chrono::DateTime::parse_from_rfc3339(&s).ok())
        .map(|dt| dt.with_timezone(&chrono::Utc));
    // ... same for before_date

    let sessions = state.session_manager().search_chat_sessions(
        query, Some(limit), after_date, before_date, None,
        vec![SessionType::User, SessionType::Scheduled],
    ).await?;

    Ok(Json(sessions))
}
```

### 9.4 Endpoint: `POST /sessions/{session_id}/fork`

Complex fork operation supporting copy, truncate, or both:

```rust
async fn fork_session(...) -> Result<Json<ForkResponse>, ErrorResponse> {
    if request.truncate && request.timestamp.is_none() {
        return Err(ErrorResponse {
            message: "truncate=true requires a timestamp".to_string(),
            status: StatusCode::BAD_REQUEST,
        });
    }

    let target_session_id = if request.copy {
        // Copy session first
        let original = session_manager.get_session(&session_id, false).await?;
        let copied = session_manager.copy_session(&session_id, original.name).await?;
        copied.id
    } else {
        session_id.clone()
    };

    if request.truncate {
        session_manager.truncate_conversation(&target_session_id, request.timestamp.unwrap_or(0)).await?;
    }

    Ok(Json(ForkResponse { session_id: target_session_id }))
}
```

### 9.5 Endpoint: `DELETE /sessions/{session_id}`

Session deletion also cleans up event buses:

```rust
async fn delete_session(...) -> Result<StatusCode, StatusCode> {
    state.session_manager().delete_session(&session_id).await?;

    // Cancel any in-flight replies before dropping the bus
    if let Some(bus) = state.get_event_bus(&session_id).await {
        bus.cancel_all_requests().await;
    }
    state.remove_event_bus(&session_id).await;

    Ok(StatusCode::OK)
}
```

### 9.6 Nostr Sharing

Sessions can be exported and shared via the Nostr protocol:

```rust
// Share
async fn share_session_nostr(...) -> Result<Json<ShareSessionNostrResponse>, StatusCode> {
    let exported = state.session_manager().export_session(&session_id).await?;
    let relays = nostr_share::resolve_relays(request.relays, Config::global());
    let share = nostr_share::publish_session_json(&exported, relays).await?;
    Ok(Json(ShareSessionNostrResponse { deeplink, nevent, event_id, relays }))
}

// Import
async fn import_session_nostr(...) -> Result<Json<Session>, StatusCode> {
    let json = nostr_share::import_session_json_from_deeplink(&request.deeplink).await?;
    let session = state.session_manager().import_session(&json, Some(SessionType::User)).await?;
    Ok(Json(session))
}
```

### 9.7 Session Extensions

```rust
async fn get_session_extensions(...) -> Result<Json<SessionExtensionsResponse>, StatusCode> {
    let session = state.session_manager().get_session(&session_id, false).await?;
    let extensions = EnabledExtensionsState::extensions_or_default(
        Some(&session.extension_data),
        goose::config::Config::global(),
    );
    Ok(Json(SessionExtensionsResponse { extensions }))
}
```

---

## 10. WebSocket Support

### 10.1 WebSocket Dependency

```toml
tokio-tungstenite = { version = "0.29.0" }
```

The `axum` dependency includes the `"ws"` feature for WebSocket support.

### 10.2 WebSocket Usage

While no WebSocket route handlers are present in the checked-out source files, WebSocket support is available through:

1. **Axum's built-in WebSocket extractor** (`axum::extract::ws::WebSocketUpgrade`)
2. **MCP proxy routes** (`mcp_ui_proxy`, `mcp_app_proxy`) - likely use WebSocket for real-time MCP communication
3. **Session event bus** (`session_event_bus`) - may use WebSocket for pushing session events

### 10.3 TLS Configuration for WebSocket

The WebSocket library has feature-gated TLS:

```toml
# rustls (default)
rustls-tls = ["tokio-tungstenite/rustls-tls-native-roots", ...]

# native-tls (alternative)
native-tls = ["tokio-tungstenite/native-tls", ...]
```

---

## 11. Authentication

### 11.1 Two Authentication Systems

The server uses **two different auth mechanisms** based on the route:

| Mechanism | Used By | Source |
|-----------|---------|--------|
| **Secret Key** (`x-secret-key` header) | Agent routes, Reply route | `secret_key` parameter passed to `routes::configure()` |
| **API Key** (`api_key`) | Session routes, Setup, etc. | External API key system |

### 11.2 Secret Key Auth

The secret key is passed during route configuration:

```rust
pub fn configure(state: Arc<AppState>, secret_key: String) -> Router {
    // ...
    .merge(mcp_ui_proxy::routes(secret_key.clone()))
    .merge(mcp_app_proxy::routes(secret_key))
    // ...
}
```

### 11.3 MCP Proxy Authentication

MCP proxy routes receive the secret key directly:

```rust
.merge(mcp_ui_proxy::routes(secret_key.clone()))
.merge(mcp_app_proxy::routes(secret_key))
```

These likely use the secret key for authenticating WebSocket/MCP connections between the UI and backend.

### 11.4 OpenAPI Security Schemes

Session routes document `api_key` security:

```rust
#[utoipa::path(
    get,
    path = "/sessions",
    security(("api_key" = [])),
    tag = "Session Management"
)]
```

---

## 12. Feature Flags

### 12.1 Default Features

```toml
default = [
    "code-mode",
    "local-inference",
    "aws-providers",
    "telemetry",
    "otel",
    "rustls-tls",
    "system-keyring",
]
```

### 12.2 Feature Reference

| Feature | Default | Description | Dependencies |
|---------|---------|-------------|-------------|
| `code-mode` | Yes | Code-focused agent mode | `goose/code-mode` |
| `local-inference` | Yes | Local LLM inference (Ollama, etc.) | `goose/local-inference` |
| `aws-providers` | Yes | AWS Bedrock provider support | `goose/aws-providers` |
| `telemetry` | Yes | PostHog telemetry collection | `goose/telemetry` |
| `otel` | Yes | OpenTelemetry tracing/metrics | `goose/otel` |
| `rustls-tls` | Yes | TLS via rustls | `reqwest/rustls`, `tokio-tungstenite/rustls-tls-native-roots`, `axum-server/tls-rustls` |
| `system-keyring` | Yes | OS keyring integration | `goose/system-keyring` |
| `cuda` | No | CUDA acceleration for local inference | `goose/cuda`, `local-inference` |
| `vulkan` | No | Vulkan acceleration for local inference | `goose/vulkan`, `local-inference` |
| `native-tls` | No | TLS via OpenSSL (mutually exclusive with rustls) | `reqwest/native-tls`, `tokio-tungstenite/native-tls`, `axum-server/tls-openssl` |
| `portable-default` | No | Minimal portable defaults | `rustls-tls`, `aws-providers`, `telemetry`, `otel` |

### 12.3 TLS Feature Mutual Exclusivity

```rust
// lib.rs
#[cfg(not(any(feature = "rustls-tls", feature = "native-tls")))]
compile_error!("At least one of `rustls-tls` or `native-tls` features must be enabled");

#[cfg(all(feature = "rustls-tls", feature = "native-tls"))]
compile_error!("Features `rustls-tls` and `native-tls` are mutually exclusive");
```

### 12.4 Feature-Gated Code

```rust
// state.rs - Local inference runtime
#[cfg(feature = "local-inference")]
inference_runtime: Arc<OnceLock<Arc<InferenceRuntime>>>,

// routes/mod.rs - Local inference routes
#[cfg(feature = "local-inference")]
let router = router.merge(local_inference::routes(state));

// agent.rs - Telemetry
#[cfg(feature = "telemetry")]
goose::posthog::set_session_context("desktop", false);

// session.rs - Telemetry error tracking
#[cfg(feature = "telemetry")]
goose::posthog::emit_error("session_create_failed", &err.to_string());
```

---

## 13. Integration with Core Goose

### 13.1 Crate Dependency Graph

```
goose-server
  ├── goose (core library)
  │     ├── agents::Agent
  │     ├── session::SessionManager
  │     ├── execution::manager::AgentManager
  │     ├── providers (LLM providers)
  │     ├── config (GooseConfig, GooseMode)
  │     ├── recipe (Recipe, Recipe deeplink)
  │     ├── gateway (GatewayManager)
  │     └── [many more modules]
  ├── goose-mcp (MCP server implementations)
  │     ├── BUILTIN_EXTENSIONS
  │     ├── AutoVisualiserRouter
  │     ├── ComputerControllerServer
  │     ├── MemoryServer
  │     └── TutorialServer
  └── rmcp (MCP protocol library)
```

### 13.2 Core Types Used

From `goose::agents`:
```rust
use goose::agents::{Agent, AgentEvent, ExtensionConfig, ExtensionLoadResult};
use goose::agents::extension::ToolInfo;
use goose::agents::extension_manager::get_parameter_names;
use goose::agents::reply_parts::is_tool_visible_to_app;
use goose::agents::Container;
use goose::agents::ToolCallContext;
```

From `goose::session`:
```rust
use goose::session::{Session, SessionManager};
use goose::session::session_manager::{SessionInsights, SessionType};
use goose::session::{EnabledExtensionsState, ExtensionState};
```

From `goose::execution`:
```rust
use goose::execution::manager::AgentManager;
```

From `goose::config`:
```rust
use goose::config::{Config, GooseMode};
use goose::config::permission::PermissionLevel;
use goose::config::resolve_extensions_for_new_session;
```

From `goose::model`:
```rust
use goose::model::ModelConfig;
```

From `goose::providers`:
```rust
use goose::providers::create;  // Provider factory
```

From `goose::gateway`:
```rust
use goose::gateway::manager::GatewayManager;
```

From `goose::conversation`:
```rust
use goose::conversation::Conversation;
use goose::conversation::message::{Message, MessageContent, TokenState};
```

### 13.3 AgentManager Singleton Pattern

The server uses a singleton `AgentManager` for agent lifecycle:

```rust
let agent_manager = AgentManager::instance().await?;
```

`AgentManager` provides:
- `get_or_create_agent(session_id)` - Lazy agent creation per session
- `remove_session(session_id)` - Agent cleanup
- `scheduler()` - Task scheduling
- `session_manager()` - Session persistence

### 13.4 Provider Creation Flow

```rust
// 1. Resolve model configuration
let mut model_config = ModelConfig::new(&model)?
    .with_canonical_limits(&provider)
    .with_context_limit(context_limit);

// 2. Add request parameters
if let Some(params) = request_params {
    model_config = model_config.with_merged_request_params(params);
}

// 3. Resolve provider model info (reasoning support)
let model_info = resolve_provider_model_info(&provider, &model).await?;
model_config.reasoning = Some(model_info.reasoning);

// 4. Get enabled extensions
let extensions = EnabledExtensionsState::for_session(session_manager, session_id, config).await;

// 5. Create provider
let new_provider = create(&provider, model_config, extensions).await?;

// 6. Update agent
agent.update_provider(new_provider, session_id).await?;
```

### 13.5 Session Manager Integration

The `SessionManager` handles:
- Session CRUD (`create_session`, `get_session`, `delete_session`)
- Session listing (`list_sessions`, `search_chat_sessions`)
- Session updates (`update().working_dir().apply()`, etc.)
- Conversation management (`replace_conversation`, `truncate_conversation`)
- Import/export (`export_session`, `import_session`)
- Token tracking (input/output/accumulated tokens, cost)
- Insights (`get_insights`)

### 13.6 Extension System Integration

Extensions are configured per-session via `EnabledExtensionsState`:

```rust
let extensions_state = EnabledExtensionsState::new(extensions_to_use);
extensions_state.to_extension_data(&mut extension_data)?;
session_manager.update(&session.id)
    .extension_data(extension_data.clone())
    .apply().await?;
```

Extensions are loaded lazily (background) or on-demand:
```rust
agent.load_extensions_from_session(&session).await;  // -> Vec<ExtensionLoadResult>
```

### 13.7 Gateway Integration

The `GatewayManager` enables external messaging platforms:

```rust
let gateway_manager = Arc::new(GatewayManager::new(agent_manager.clone())?);
```

Supported gateway types (from `goose::gateway`):
- `telegram` - Telegram bot integration

Gateway protocol:
```rust
#[async_trait]
pub trait Gateway: Send + Sync + 'static {
    fn gateway_type(&self) -> &str;
    async fn start(&self, handler: GatewayHandler, cancel: CancellationToken) -> anyhow::Result<()>;
    async fn send_message(&self, user: &PlatformUser, message: OutgoingMessage) -> anyhow::Result<()>;
    async fn validate_config(&self) -> anyhow::Result<()>;
}
```

---

## 14. Security Analysis

### 14.1 TLS

- TLS is **enabled by default** (`default_tls() -> true`)
- Supports both rustls and native-tls (mutually exclusive)
- Self-signed certificate generation via `rcgen` and `pem`
- Binds to `127.0.0.1:3000` by default (localhost only)

### 14.2 Authentication

- **Secret key** for internal routes (agent, reply)
- **API key** for session management routes
- No evidence of OAuth or JWT in the available code

### 14.3 Tool Execution Security

Multiple security layers for tool calls:

1. **App visibility filtering:** Tools can be marked as "model-only" and rejected from app calls
2. **Frontend tool isolation:** Frontend-provided tools must be executed by the frontend host (HTTP 424)
3. **Permission system:** `PermissionManager` with per-tool permission levels (Auto/SmartApprove/AskBefore)
4. **Tool inspection pipeline:** `ToolInspectionManager` runs:
   - `SecurityInspector` (highest priority)
   - `EgressInspector`
   - `AdversaryInspector` (LLM-based, requires `~/.config/goose/adversary.md`)
   - `PermissionInspector`
   - `RepetitionInspector` (lowest priority)

### 14.4 Request Limits

| Endpoint | Body Limit |
|----------|-----------|
| `/reply` | 50 MB |
| `/sessions/import` | 25 MB |
| `/sessions/import/nostr` | 25 MB |
| `/sessions/{session_id}/share/nostr` | 25 MB |

### 14.5 Session Name Validation

```rust
const MAX_NAME_LENGTH: usize = 200;
// Empty names rejected
// Names > 200 chars rejected
```

### 14.6 Recipe Validation

Recipes are validated before application:
```rust
if let Some(ref recipe) = original_recipe {
    if let Err(err) = validate_recipe(recipe) {
        return Err(ErrorResponse { message: err.message, status: err.status });
    }
}
```

---

## 15. Missing/Unavailable Modules

The following modules are referenced in `main.rs` and `routes/mod.rs` but were **not present** in this source checkout. They likely exist in the full repository.

### From `main.rs`:

| Module | Declared Path | Inferred Purpose |
|--------|--------------|-----------------|
| `commands` | `src/commands/` | CLI command implementations (agent, mcp, validate-extensions) |
| `error` | `src/error.rs` | Error types (ConfigError, etc.) |
| `logging` | `src/logging.rs` | Logging/tracing initialization |
| `openapi` | `src/openapi.rs` | OpenAPI schema generation/export |
| `session_event_bus` | `src/session_event_bus.rs` | Session-level event pub/sub |
| `tunnel` | `src/tunnel.rs` | Network tunnel management |

### From `routes/mod.rs`:

| Module | Inferred Purpose |
|--------|-----------------|
| `action_required` | User confirmation/action management |
| `config_management` | Provider config, API keys |
| `dictation` | Speech-to-text endpoints |
| `errors` | Common error response types |
| `features` | Feature flag endpoints |
| `gateway` | External gateway configuration |
| `local_inference` | Local LLM inference (feature-gated) |
| `mcp_app_proxy` | MCP app WebSocket proxy |
| `mcp_ui_proxy` | MCP UI WebSocket proxy |
| `prompts` | Prompt management |
| `recipe` | Recipe CRUD operations |
| `recipe_utils` | Recipe utility functions |
| `sampling` | LLM sampling endpoints |
| `schedule` | Scheduled runs |
| `session_events` | Session event streaming |
| `setup` | Onboarding/setup flow |
| `status` | Health check endpoints |
| `telemetry` | Telemetry submission |
| `tunnel` | Tunnel management API |
| `utils` | Common route utilities |

### From `lib.rs`:

| Module | Purpose |
|--------|---------|
| `auth` | Authentication middleware/strategies |
| `tls` | TLS certificate management (feature-gated) |

---

## Appendix A: File Inventory

### Available Source Files (8 files)

```
crates/goose-server/
├── Cargo.toml
└── src/
    ├── configuration.rs    (103 lines) - Server settings (host, port, TLS)
    ├── lib.rs               (21 lines)  - Library exports, TLS feature checks
    ├── main.rs             (109 lines)  - CLI entry point, panic hook
    ├── state.rs            (170 lines)  - AppState, agent lifecycle, event buses
    └── routes/
        ├── mod.rs           (57 lines)  - Route registration
        ├── agent.rs        (1449 lines) - Agent CRUD, tools, extensions, apps
        ├── reply.rs        (509 lines)  - SSE streaming, chat
        └── session.rs      (703 lines)  - Session CRUD, search, fork, Nostr
```

### Total Available Code

| File | Lines |
|------|-------|
| `configuration.rs` | 103 |
| `lib.rs` | 21 |
| `main.rs` | 109 |
| `state.rs` | 170 |
| `routes/mod.rs` | 57 |
| `routes/agent.rs` | 1,449 |
| `routes/reply.rs` | 509 |
| `routes/session.rs` | 703 |
| **Total** | **~3,121** |

---

## Appendix B: HTTP Status Codes Used

| Status | Meaning | Context |
|--------|---------|---------|
| 200 OK | Success | Standard success |
| 201 Created | Resource created | App import |
| 400 Bad Request | Invalid input | Validation failures |
| 401 Unauthorized | Auth failure | Invalid/missing secret key or API key |
| 403 Forbidden | Permission denied | App calling model-only tool |
| 404 Not Found | Resource missing | Session not found |
| 424 Failed Dependency | Missing dependency | Frontend tool needs frontend host |
| 500 Internal Server Error | Server error | Unexpected failures |

---

*End of Audit Document*
