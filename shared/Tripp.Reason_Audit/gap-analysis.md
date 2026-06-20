# Gap Analysis: Tripp.reason (goose) AI Coding Agent Framework

## Executive Summary

This document identifies all disconnected, loosely-coupled, partially-implemented, or questionably-integrated components in the goose codebase based on deep audits of three primary crates (`goose`, `goose-server`, `goose-cli`/`goose-mcp`) and examination of peripheral directories.

**Overall Finding**: The codebase exhibits a "broad surface, shallow depth" pattern. There are 30+ providers, 17+ route modules, 4 UI layers, 2 eval systems, and numerous feature-flagged subsystems -- but many exist as declarations without full implementations in the checked-out source, or as entirely disconnected tools that happen to live in the same repository.

---

## Table of Contents

1. [Missing Route Modules](#1-missing-route-modules)
2. [UI Layer Disconnections](#2-ui-layer-disconnections)
3. [MCP Harness Disconnection](#3-mcp-harness-disconnection)
4. [Evaluation Systems](#4-evaluation-systems)
5. [Documentation](#5-documentation)
6. [Vendor / V8](#6-vendor--v8)
7. [OIDC Proxy](#7-oidc-proxy)
8. [Hooks and Plugins](#8-hooks-and-plugins)
9. [Skills Marketplace](#9-skills-marketplace)
10. [Gateway](#10-gateway)
11. [Scheduler](#11-scheduler)
12. [Subagent Execution](#12-subagent-execution)
13. [ACP Protocol](#13-acp-protocol)
14. [Desktop-Specific Code](#14-desktop-specific-code)
15. [Local Inference](#15-local-inference)
16. [OAuth / Device Flow](#16-oauth--device-flow)
17. [Summary Matrix](#17-summary-matrix)

---

## 1. Missing Route Modules

### The Problem

The server's `routes/mod.rs` declares 20 route modules. Only **4** have source files present in the checkout:

| Module | File Present | Lines | Status |
|--------|-------------|-------|--------|
| `agent` | routes/agent.rs | 1,449 | AVAILABLE |
| `reply` | routes/reply.rs | 509 | AVAILABLE |
| `session` | routes/session.rs | 703 | AVAILABLE |
| `mod` | routes/mod.rs | 57 | AVAILABLE |

### The Missing 16

| Module | Inferred Purpose | Integration Risk |
|--------|-----------------|------------------|
| `action_required` | Pending user action/confirmation management (tool confirmations, elicitations) | **HIGH** - Core to agent interactivity |
| `config_management` | Provider configuration, API keys, settings CRUD | **HIGH** - Desktop app needs this |
| `dictation` | Speech-to-text / voice input endpoints | LOW - Nice-to-have |
| `errors` | Common error response types/utilities | MEDIUM - Likely imported elsewhere |
| `features` | Feature flag management endpoints | LOW - Admin/debug only |
| `gateway` | External messaging gateway config (Telegram bot setup) | LOW - Only if gateway used |
| `local_inference` | Local LLM inference endpoints (CUDA/Vulkan) | MEDIUM - Behind feature flag |
| `mcp_app_proxy` | MCP app WebSocket proxy (for MCP Apps/SEP-1865) | **HIGH** - Desktop app uses this |
| `mcp_ui_proxy` | MCP UI WebSocket proxy | **HIGH** - Desktop app uses this |
| `prompts` | Prompt management / template CRUD | MEDIUM - Recipe system dependency |
| `recipe` | Recipe CRUD and execution | **HIGH** - Desktop app uses recipes |
| `recipe_utils` | Recipe utility functions | MEDIUM - Recipe dependency |
| `sampling` | LLM sampling / model interaction proxy | MEDIUM - ACP protocol uses this |
| `schedule` | Scheduled agent runs (cron jobs) | LOW - Background feature |
| `session_events` | Session event streaming / WebSocket upgrade | **HIGH** - Real-time updates |
| `setup` | First-time setup / onboarding flow | LOW - One-time use |
| `status` | Health check / server status | LOW - Ops only |
| `telemetry` | Telemetry event submission | LOW - Non-essential |
| `tunnel` | Tunnel management for external access | LOW - Niche use case |
| `utils` | Common route utilities | LOW - Shared code |

### Impact Assessment

**Critical gap**: `action_required`, `config_management`, `mcp_app_proxy`, `mcp_ui_proxy`, `recipe`, and `session_events` are referenced in the working route registration but their implementations are absent. This means:

- The **desktop app** (Electron) likely cannot fully function against this server build
- **Tool confirmations** require the `action_required` route to push confirmations to the client
- **MCP Apps** (interactive visualizations) need the proxy routes to bridge WebSocket
- **Recipes** cannot be managed via API

**Verdict**: These missing routes suggest either (a) this is a partial checkout and routes live elsewhere in the full repo, or (b) the server build is intentionally stripped and the missing routes are compiled in via other means (e.g., generated code, separate crates).

---

## 2. UI Layer Disconnections

### Four UI Layers Identified

| UI Layer | Technology | Connection to Server | Status |
|----------|-----------|---------------------|--------|
| `ui/desktop/` | Electron + React | HTTP API to `goosed` on localhost:3000 | **Primary UI** |
| `ui/goose-binary/` | npm packages | Distributes `goose` CLI as platform packages | Distribution |
| `ui/sdk/` | TypeScript (ACP client) | Talks to ACP server over HTTP/WebSocket | SDK library |
| `ui/text/` | (referenced, details unknown) | Likely TUI or text-mode client | Unknown |

### Desktop App (ui/desktop/)

**Connection method**: The Electron app spawns `goosed` as a subprocess and communicates via:
- HTTP REST API (`http://localhost:3000` or similar)
- Server-Sent Events via `/reply` endpoint for streaming
- WebSocket via `mcp_ui_proxy` / `mcp_app_proxy` for MCP tool UIs
- Secret key auth via `x-secret-key` header

**Disconnection analysis**:
- The desktop is a **completely separate build** (Node.js/Electron vs Rust)
- It expects `goosed` binary at a specific path (`src/bin/goosed`)
- No shared code between desktop UI and Rust backend -- pure API contract
- The desktop is branded "Tripp" but uses internal goose API names

### SDK (ui/sdk/)

**Connection method**: TypeScript client for the Agent Client Protocol (ACP):
- Generates TypeScript types from Rust schema via `generate-acp-schema` binary
- Provides `GooseClient` class for ACP method calls
- Zod validators for runtime type checking

**Disconnection analysis**:
- The SDK is **versioned independently** from the Rust crates
- Native binaries are distributed as optional npm dependencies
- Schema generation requires a full Rust build step
- The SDK references `agent-client-protocol` crate types

### Connection Verdict

The UI layer is **architecturally sound but loosely coupled**. The disconnection is by design (client-server separation), but the missing route modules (Section 1) break the contract. If `mcp_ui_proxy` and `mcp_app_proxy` routes are missing, MCP Apps (interactive charts, etc.) will not render in the desktop.

---

## 3. MCP Harness Disconnection

### What It Is

`evals/open-model-gym/mcp-harness/` is a **standalone Node.js MCP server** providing 35 mock tools (Google Drive, Sheets, Salesforce, Slack, Calendar, Gmail, Jira, GitHub). It simulates real SaaS APIs without requiring credentials.

### How It Connects

```
Open Model Gym test runner
  --> Spawns agent binary (goose / opencode / pi)
  --> Agent binary loads MCP harness as stdio extension
  --> Harness provides mock tools to the agent
  --> Agent calls mock tools during test scenarios
  --> Harness logs tool calls to tool-calls.log
  --> Test runner validates tool calls against expected patterns
```

### Disconnection Analysis

| Aspect | Status |
|--------|--------|
| Build-time connection | **NONE** - Separate npm project, not in Cargo workspace |
| Runtime connection | Via stdio MCP transport only when explicitly configured |
| Code sharing | **NONE** - No shared source with goose Rust codebase |
| Dependency | Only in eval scenarios, not in production |

**Verdict**: The MCP harness is **intentionally disconnected** -- it's a test fixture, not part of the production system. It lives in `evals/` for organizational convenience.

---

## 4. Evaluation Systems

### Two Independent Eval Systems

| System | Location | Language | Purpose |
|--------|----------|----------|---------|
| **Open Model Gym** | `evals/open-model-gym/` | TypeScript/Node | Multi-agent test matrix (models x runners x scenarios) |
| **Harbor** | `evals/harbor/` | Python | Harbor benchmark datasets with goose adapter |

### Open Model Gym Architecture

```
config.yaml defines matrix:
  models: [opus, qwen3-coder, gpt4]
  runners: [goose-full, opencode, pi]
  scenarios: [file-editing, git-operations]

Runner (TypeScript):
  1. For each combination:
     a. Set up isolated workdir
     b. Write runner-specific config (goose config.yaml, opencode.json, .pi-mcp.json)
     c. Spawn MCP harness as stdio extension
     d. Run agent with scenario prompt
     e. Validate results (file_exists, file_matches, tool_called)
  2. Generate report.html with pass/fail matrix
  3. Keep WORST result across 3 repetitions
```

### Harbor Architecture

```
Harbor benchmark:
  --> Requires pre-built goose binary
  --> Writes Harbor job config
  --> Runs Harbor with goose_harbor adapter
  --> Agent executes inside Docker task containers
  --> Supports Terminal-Bench 2.0 dataset
```

### Disconnection Analysis

| Aspect | Open Model Gym | Harbor |
|--------|---------------|--------|
| Build-time | Not in workspace | Not in workspace |
| Invokes goose | Via CLI binary | Via CLI binary |
| Needs MCP harness | Yes | No |
| Needs Docker | No | Yes |
| Produces artifacts | report.html, logs | Harbor native output |
| CI integration | Likely manual | Likely manual |

**Verdict**: Both eval systems are **completely disconnected** from the Rust build. They are external tools that invoke the goose CLI as a black-box binary. This is appropriate for benchmark tooling but means:

- Evals can drift from the codebase unless run regularly
- No compile-time validation that goose binary works with evals
- Eval configuration is duplicated across YAML files

---

## 5. Documentation

### What It Is

`documentation/` contains a **Docusaurus** static website for user-facing documentation.

### Disconnection Analysis

| Aspect | Status |
|--------|--------|
| Build-time | Independent npm project |
| Runtime | **No runtime connection** - Pure static docs |
| Code references | May reference API endpoints, but no automated sync |
| Deployment | GitHub Pages or similar static hosting |

**Verdict**: Documentation is **fully disconnected by design**. No concerns here beyond the standard docs-drift problem (docs may not match current API).

---

## 6. Vendor / V8

### What It Is

`vendor/v8/` would contain a **patched V8 JavaScript engine**. This was referenced in some provider implementations (notably `gcpvertexai.rs` uses `jsonwebtoken` for GCP auth, not V8 directly).

### Disconnection Analysis

| Aspect | Status |
|--------|--------|
| Present in checkout | **NOT FOUND** |
| Referenced in code | Indirectly via `gcpvertexai` provider |
| Purpose | Likely for executing JS in the `computercontroller` or for provider auth flows |

**Verdict**: V8 integration is **not present in this checkout**. If it exists in the full repo, it's likely used for:
- JavaScript execution within the `computercontroller` automation tool
- Provider-specific auth flows that require JS evaluation
- This should be **removed for a lean build** unless specifically needed.

---

## 7. OIDC Proxy

### What It Is

`oidc-proxy/` would provide an **OpenID Connect proxy** for enterprise authentication.

### Disconnection Analysis

| Aspect | Status |
|--------|--------|
| Present in checkout | **NOT FOUND** |
| Referenced in code | Not directly; OAuth2 crate is used in providers |
| Purpose | Likely for enterprise SSO / identity-aware proxy in front of `goosed` |

**Verdict**: OIDC proxy is **not present in this checkout**. If it exists, it's a deployment add-on, not part of the core agent. The existing `oauth2` crate dependency handles provider OAuth flows (Databricks, Azure, etc.), which is different from OIDC proxying.

---

## 8. Hooks and Plugins

### What Exists

The **hooks system** in `goose/src/hooks/` is **fully implemented**:
- 12 hook event types (PreToolUse, PostToolUse, SessionStart, UserPromptSubmit, etc.)
- Hook manager with blocking and non-blocking emission
- JSON-based configuration (`hooks.json`)
- Deny mechanism via exit code 2 or JSON response
- File-matching hooks (BeforeReadFile, AfterFileEdit, BeforeShellExecution)

### What Doesn't Exist

| Expected Component | Status | Notes |
|-------------------|--------|-------|
| Plugin marketplace | **MISSING** | No central repository for plugins |
| Plugin installer (server-side) | **MISSING** | CLI has `plugin install {url}` but implementation not in checkout |
| Plugin registry API | **MISSING** | No API to discover/list plugins |
| Open Plugins spec compliance | Partial | Hook types match spec but plugin packaging is ad-hoc |

### Plugin Discovery

Plugins are discovered from filesystem only:
```
~/.config/goose/plugins/
<project>/.goose/plugins/
```

Each plugin is a directory with `hooks.json` + scripts. There is **no network-based discovery**.

### The Hooks-Plugin Gap

The hooks system implements the **Open Plugins hooks specification** for lifecycle events, but:
- Plugins are **not the same as extensions** (MCP servers)
- Extensions provide tools; plugins provide hooks
- There is no unified marketplace for either

**Verdict**: The hooks system is **well-implemented but isolated**. Without a plugin marketplace or discovery mechanism, it's a power-user feature. The `plugin` CLI command exists but its implementation is not in the checkout.

---

## 9. Skills Marketplace

### What Exists

The **skills system** in `goose/src/skills/` is **fully implemented**:
- SKILL.md discovery from 8 filesystem locations
- YAML frontmatter parsing
- Argument substitution
- MCP client for skill execution

### What Doesn't Exist

| Expected Component | Status |
|-------------------|--------|
| Skills marketplace | **MISSING** |
| Skills repository | **MISSING** |
| Skills publishing | **MISSING** |
| Skills search/discovery (network) | **MISSING** |

### Discovery Paths (Filesystem Only)

```
1. <working_dir>/.agents/skills
2. <working_dir>/.goose/skills
3. <working_dir>/.claude/skills (Claude compatibility)
4. ~/.agents/skills
5. ~/.config/goose/skills
6. ~/.claude/skills
7. ~/.config/agents/skills
8. Installed plugin skill directories
```

**Verdict**: Skills are **purely local**. The `.claude/skills` compatibility path suggests the format is shared with Claude Code, but there's no mechanism to download or share skills. Skills are essentially local prompt templates.

---

## 10. Gateway

### What Exists

The **gateway system** in `goose/src/gateway/` is **partially implemented**:
- Gateway trait with full async interface
- Pairing state machine (Unpaired -> PendingCode -> Paired)
- Telegram gateway implementation
- Gateway manager for lifecycle
- Server routes (declared but not in checkout)
- CLI commands (`gateway status`, `start`, `stop`, `pair`)

### What's Missing

| Component | Status |
|-----------|--------|
| Telegram gateway | IMPLEMENTED |
| Discord gateway | **MISSING** |
| Slack gateway | **MISSING** |
| WebSocket gateway | **MISSING** |
| SMS gateway | **MISSING** |
| Email gateway | **MISSING** |

### Factory Pattern

```rust
pub fn create_gateway(config: &mut GatewayConfig) -> Result<Arc<dyn Gateway>> {
    match config.gateway_type.as_str() {
        "telegram" => Ok(Arc::new(TelegramGateway::new(config)?)),
        other => bail!("Unknown gateway type: {}", other),
    }
}
```

The trait is ready for multiple implementations but only Telegram exists.

**Verdict**: Gateway is a **single-implementation abstraction**. The Telegram gateway is functional but niche. The pairing system is over-engineered for a single gateway type. The server-side routes for gateway management are missing from the checkout.

---

## 11. Scheduler

### What Exists

- **Dependency**: `tokio-cron-scheduler` in Cargo.toml
- **Agent module**: `agents/schedule_tool.rs` (schedule management tool)
- **CLI commands**: `schedule add`, `list`, `remove`, `sessions`, `run-now`, `cron-help`
- **Config**: `scheduler` and `scheduler_trait` modules declared in `lib.rs`
- **Agent config**: `scheduler_service: Option<Arc<dyn SchedulerTrait>>` in `AgentConfig`

### What's Unclear

| Question | Analysis |
|----------|----------|
| Is there an actual cron daemon? | `tokio-cron-scheduler` provides scheduling, but the persistence layer is unclear |
| How are scheduled jobs persisted? | Likely via SQLite session storage, but job queue implementation not in checkout |
| Is the scheduler fully wired? | The trait exists in AgentConfig but the default initialization path is unclear |
| Server-side schedule routes? | Declared in routes but implementation not in checkout |

**Verdict**: The scheduler is **declared but not fully visible**. The tool exists, the CLI commands exist, the trait exists -- but the actual scheduling backend (job queue, persistence, execution loop) is not in the checked-out source. This is either a **partial checkout issue** or the scheduler is a **stub awaiting implementation**.

---

## 12. Subagent Execution

### What Exists

**Full type infrastructure**:
- `agents/subagent_execution_tool.rs` - Subagent tool definition
- `agents/subagent_handler.rs` - Subagent request handler
- `agents/subagent_task_config.rs` - Task configuration types
- `agents/moim.rs` - Multi-Objective Intent Management
- `AgentCapabilityConfig` with flags: `swarm_enabled`, `map_reduce_enabled`, `consensus_enabled`, `pipeline_enabled`
- `GOOSE_MAX_ACTIVE_AGENTS` config value

### The MOIM System

```rust
// Multi-Objective Intent Management
// Injected into the agent's reply loop to handle parallel objectives
```

MOIM is referenced in the agent's reply flow but its full implementation is not detailed in the checkout.

### What's Unclear

| Question | Analysis |
|----------|----------|
| Are subagents actually spawned? | Agent has `dispatch_tool_call` that handles subagent tools |
| Is swarm mode working? | Capability flag exists but defaults to false |
| How do subagents share context? | `SessionExecutionMode::SubTask { parent_session }` suggests parent-child linking |
| Is the Kimi K2.6 swarm connected? | Tripp README mentions it as a Tripp-specific addition |

**Verdict**: Subagent execution has **complete type infrastructure** but the runtime behavior is **feature-gated and defaults off**. The Kimi swarm extension (mentioned in Tripp README) is a Tripp-specific addition not present in the audited core. This is **safely ignorable for a lean build** since all capabilities default to `false`.

---

## 13. ACP Protocol

### What Exists

The **Agent Client Protocol** is **fully implemented**:

| Component | Status |
|-----------|--------|
| `goose-sdk` crate | IMPLEMENTED - Rust SDK for ACP |
| `goose/src/acp/` module | IMPLEMENTED - ACP server, transport, tools |
| `goose-acp-macros` crate | Referenced - Procedural macros |
| `agent-client-protocol` crate | Workspace dependency |
| `agent-client-protocol-schema` | Workspace dependency |
| CLI `acp` command | IMPLEMENTED - `goose acp {builtins}` runs ACP on stdio |
| CLI `serve` command | IMPLEMENTED - `goose serve {host} {port}` runs ACP HTTP server |
| TypeScript SDK (`ui/sdk/`) | IMPLEMENTED - Generated from Rust schema |
| Schema generation binary | IMPLEMENTED - `generate-acp-schema` |

### ACP Server Factory

```rust
pub struct AcpServerFactoryConfig {
    pub builtins: Vec<String>,
    pub data_dir: PathBuf,
    pub config_dir: PathBuf,
    pub goose_platform: GoosePlatform,
    pub additional_source_roots: Vec<PathBuf>,
}
```

### Connection Points

```
External Agent (OpenClaw, Hermes)
  --> ACP HTTP/WebSocket server (goose serve)
  --> ACP stdio server (goose acp)
  --> Uses agent-client-protocol types
  --> Can load any MCP extensions
  --> Full access to goose agent capabilities
```

**Verdict**: ACP is the **cleanest, most complete integration point** in the entire codebase. It provides a well-defined protocol for external agents to leverage goose's capabilities. This is the **primary connection point** for the LEAN harness.

---

## 14. Desktop-Specific Code

### macOS Peekaboo

| Aspect | Details |
|--------|---------|
| Location | `goose-mcp/src/peekaboo/` |
| Platform | macOS only (`#[cfg(target_os = "macos")]`) |
| Purpose | GUI automation via Accessibility API |
| Auto-install | `brew install steipete/tap/peekaboo` |
| Requirements | macOS 15+ (Sequoia), Screen Recording + Accessibility permissions |
| Integration | Used by `ComputerControllerServer` on macOS only |

### Platform Extensions

| Platform | Tool Variants |
|----------|--------------|
| macOS | Shell, Ruby, AppleScript + Peekaboo GUI |
| Windows | PowerShell, Batch |
| Linux | Shell (bash), headless-aware |

### Windows VT Processing

```rust
#[cfg(windows)]
fn enable_windows_vt_processing() { ... }
```

Enables ANSI colors in Windows console for CLI spinners/progress bars.

### Integration Assessment

All platform-specific code is **properly feature-gated** with `#[cfg(target_os = ...)]`. No concerns about unwanted code being compiled. Peekaboo is an **optional runtime dependency** (auto-installed if missing).

**Verdict**: Desktop-specific code is **well-isolated**. Peekaboo is the only external binary dependency and it's macOS-only. For a lean build, platform-specific code can stay as it doesn't add compile-time cost.

---

## 15. Local Inference

### What Exists

| Component | Feature Flag | Description |
|-----------|-------------|-------------|
| Candle core | `local-inference` | ML framework for Whisper + local LLMs |
| llama.cpp | `local-inference` | GGUF model inference |
| tokenizers | `local-inference` | Text tokenization |
| symphonia | `local-inference` | Audio decoding (Whisper) |
| CUDA | `cuda` | GPU acceleration (NVIDIA) |
| Vulkan | `vulkan` | GPU acceleration (cross-platform) |
| Metal | macOS target | Apple GPU acceleration |

### Dependencies Added by `local-inference`

```
candle-core (0.10.2)
candle-nn (0.10.2)
candle-transformers (0.10.2)
llama-cpp-2 (0.1.145)
tokenizers (0.21.0)
symphonia (0.5)
rubato (0.16)
byteorder (1.5)
```

### Server Integration

```rust
#[cfg(feature = "local-inference")]
inference_runtime: Arc<OnceLock<Arc<InferenceRuntime>>>,

#[cfg(feature = "local-inference")]
let router = router.merge(local_inference::routes(state));
```

### Impact Assessment

The `local-inference` feature pulls in **significant compile-time and runtime dependencies**:
- Candle + llama.cpp: ~30+ transitive crates, large C++ dependencies
- Tokenizers: Oniguruma regex engine (C library)
- Symphonia: Full audio codec suite
- GPU libraries: CUDA toolkit or Vulkan SDK required for acceleration

**Verdict**: Local inference is **properly feature-gated** and can be completely disabled. For a lean build, it should be **disabled by default** since the harness will use API-based providers. The only loss is Whisper transcription (voice input).

---

## 16. OAuth / Device Flow

### Multiple OAuth Implementations

| Module | Purpose | Provider |
|--------|---------|----------|
| `providers/oauth.rs` | Generic OAuth2 flow | Multiple |
| `providers/oauth_device_flow.rs` | Device code flow | TV/headless devices |
| `providers/gemini_oauth.rs` | Gemini-specific OAuth | Google |
| `providers/azureauth.rs` | Azure AD authentication | Microsoft |
| `providers/gcpauth.rs` | GCP service account auth | Google Cloud |

### How They Connect

```
Provider::authenticate()
  --> oauth.rs: OAuth2 authorization code flow
  --> oauth_device_flow.rs: Device code flow
  --> gemini_oauth.rs: Google-specific OAuth
  --> azureauth.rs: Azure AD token acquisition
  --> gcpauth.rs: Service account JWT signing
```

### Integration Assessment

| Aspect | Status |
|--------|--------|
| Databricks OAuth | Uses generic OAuth + device flow |
| Azure OpenAI | Uses `azureauth.rs` |
| Google/Gemini | Uses `gemini_oauth.rs` + `gcpauth.rs` |
| GitHub Copilot | Separate auth flow |
| Generic providers | API key only, no OAuth |

**Verdict**: OAuth is **well-modularized** with provider-specific implementations. For a lean build:
- Keep `oauth.rs` and `oauth_device_flow.rs` (generic, small)
- Keep `gcpauth.rs` if using GCP Vertex AI provider
- `azureauth.rs`, `gemini_oauth.rs` can be removed if those providers are not needed
- The `oauth2` crate dependency is lightweight (~5 deps)

---

## 17. Summary Matrix

### Component Connectivity Score

| Component | Integration Status | Lean Build Action | Notes |
|-----------|-------------------|-------------------|-------|
| Core Agent Loop | **FULL** | KEEP | Essential |
| Provider Abstraction (30+) | **FULL** | Trim to 4-6 | Keep OpenAI, Anthropic, Ollama, OpenRouter, LiteLLM |
| SSE Streaming | **FULL** | KEEP | Essential for real-time |
| Session Management (SQLite) | **FULL** | KEEP-OPTIONAL | Could use in-memory for harness |
| MCP Tool Execution | **FULL** | KEEP | Essential |
| ACP Protocol | **FULL** | KEEP | Primary external integration point |
| Permission System | **FULL** | KEEP | Safety-critical |
| Config System | **FULL** | KEEP | Essential |
| Recipe System | **FULL** | REMOVE-CAREFUL | Complex, not essential for harness |
| Skills System | **FULL** | REMOVE | Local-only, not essential |
| Hooks System | **FULL** | REMOVE | Power-user feature |
| Gateway (Telegram) | Partial | REMOVE | Single implementation, niche |
| Scheduler | Partial/Stub | REMOVE-CAREFUL | Not fully visible |
| Subagent Execution | Types only | REMOVE | Defaults off |
| Local Inference | Feature-gated | REMOVE | Huge deps, use API instead |
| AWS Providers | Feature-gated | REMOVE | Large AWS SDK |
| Telemetry | Feature-gated | REMOVE | Non-essential |
| OpenTelemetry | Feature-gated | REMOVE | Non-essential |
| Keyring | Feature-gated | KEEP-OPTIONAL | Can use file fallback |
| Desktop UI | Separate project | N/A | External client |
| TypeScript SDK | Separate project | N/A | External client |
| MCP Harness | Separate project | N/A | Test fixture only |
| Eval Systems | Separate projects | N/A | Benchmark tooling |
| Documentation | Separate project | N/A | Static docs |
| V8 Engine | Not in checkout | N/A | Likely removed |
| OIDC Proxy | Not in checkout | N/A | Deployment add-on |
| Missing Routes | **NOT IN CHECKOUT** | Investigate | May be in full repo |
| Peekaboo (macOS) | Platform-gated | KEEP | No compile cost |
| OAuth (generic) | Modular | KEEP | Small, needed |
| OAuth (provider-specific) | Modular | Trim per provider | Remove unused |
| Nostr Sharing | In session | REMOVE | Niche social feature |
| Autovisualiser | Built-in MCP | KEEP-OPTIONAL | Charts, nice-to-have |
| Memory System | Built-in MCP | KEEP-OPTIONAL | Persistent memory |
| Computer Controller | Built-in MCP | KEEP-OPTIONAL | Web scraping, UI auto |
| Tutorial System | Built-in MCP | REMOVE | Onboarding only |

---

## Key Findings

1. **The core agent loop is solid and complete** -- this is the most valuable part of the codebase
2. **ACP protocol is the best integration point** -- well-designed, fully implemented, language-agnostic
3. **Feature flags work well** -- most heavy components are properly gated
4. **The main risk is the missing route modules** -- if this is a partial checkout, the full repo may have everything; if not, the server is incomplete
5. **Evals and MCP harness are properly external** -- they should remain disconnected
6. **30+ providers is overkill** -- 4-6 cover 95% of use cases
7. **The hooks/skills/marketplace story is incomplete** -- local filesystem only, no network discovery
8. **Subagent/swarm features are "demo-ready" not "production-ready"** -- types exist, defaults off, unclear runtime behavior
9. **Local inference adds massive weight** -- disable it for lean builds
10. **The goose-server is heavier than needed** -- Axum + TLS + WebSocket + rcgen + many deps for what could be a simpler HTTP server

---

*Generated from comprehensive audits of: `crates/goose/`, `crates/goose-server/`, `crates/goose-cli/`, `crates/goose-mcp/`, `ui/`, `evals/`, `documentation/`*
