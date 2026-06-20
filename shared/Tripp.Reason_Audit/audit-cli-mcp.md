# Comprehensive Technical Audit: goose-cli & goose-mcp Crates

**Audited Framework:** Tripp.reason (goose) AI Coding Agent  
**Audit Date:** 2025  
**Scope:** `goose-cli` and `goose-mcp` crates under `/mnt/agents/output/tripp-audit/crates/`

---

## Table of Contents

1. [CLI Analysis](#1-cli-analysis)
   - 1.1 [CLI Entry Point & Main Thread](#11-cli-entry-point--main-thread)
   - 1.2 [CLI Structure & Argument Parsing](#12-cli-structure--argument-parsing)
   - 1.3 [Command Modules](#13-command-modules)
   - 1.4 [Session Management](#14-session-management)
   - 1.5 [Recipe System](#15-recipe-system)
   - 1.6 [Feature Flags](#16-feature-flags)
2. [MCP Analysis](#2-mcp-analysis)
   - 2.1 [MCP Architecture & Server Runner](#21-mcp-architecture--server-runner)
   - 2.2 [Subprocess Management](#22-subprocess-management)
   - 2.3 [Computer Controller](#23-computer-controller)
   - 2.4 [Memory System](#24-memory-system)
   - 2.5 [Tutorial System](#25-tutorial-system)
   - 2.6 [Peekaboo (macOS GUI Automation)](#26-peekaboo-macos-gui-automation)
   - 2.7 [Autovisualiser](#27-autovisualiser)
   - 2.8 [Platform Support](#28-platform-support)

---

## 1. CLI Analysis

### 1.1 CLI Entry Point & Main Thread

**File:** `goose-cli/src/main.rs`

The entry point is intentionally designed with a custom thread and Tokio runtime to ensure sufficient stack space:

```rust
fn main() -> Result<()> {
    #[cfg(windows)]
    enable_windows_vt_processing();

    let handle = std::thread::Builder::new()
        .name("goose-cli-main".to_string())
        .stack_size(8 * 1024 * 1024)  // 8MB stack
        .spawn(|| {
            let runtime = tokio::runtime::Builder::new_multi_thread()
                .enable_all()
                .build()
                .expect("Failed to build Tokio runtime");
            runtime.block_on(run())
        })
        .map_err(|e| anyhow::anyhow!("Failed to spawn goose-cli main thread: {}", e))?;

    handle.join()
        .map_err(|_| anyhow::anyhow!("goose-cli main thread panicked"))?
}
```

**Key behaviors:**
- **Windows VT processing**: On Windows, `enable_windows_vt_processing()` calls `console::Term::stdout().features().colors_supported()` which has the side effect of enabling `ENABLE_VIRTUAL_TERMINAL_PROCESSING` on the console handle (required for spinners and progress bars from `cliclack`/`indicatif`).
- **8MB stack**: The custom thread with enlarged stack size prevents stack overflow during deep recursion in the agent.
- **Multi-threaded Tokio**: Uses `new_multi_thread()` runtime with all I/O drivers enabled.
- **Logging**: Sets up logging via `goose_cli::logging::setup_logging(None)` with a warning if it fails.
- **OTel cleanup**: With `otel` feature flag, shuts down OTLP if it was initialized.

---

### 1.2 CLI Structure & Argument Parsing

**File:** `goose-cli/src/cli.rs` (2,229 lines)

The CLI is built using **Clap** with derive macros. The top-level structure:

```rust
#[derive(Parser)]
#[command(name = "goose", author, version, display_name = "", about, long_about = None)]
pub struct Cli {
    #[command(subcommand)]
    command: Option<Command>,
}
```

#### Core Data Structures

**Identifier** (session targeting -- mutually exclusive group):
```rust
#[derive(Args, Debug, Clone)]
#[group(required = false, multiple = false)]
pub struct Identifier {
    #[arg(short = 'n', long, value_name = "NAME")]
    pub name: Option<String>,

    #[arg(long = "session-id", alias = "id", value_name = "SESSION_ID")]
    pub session_id: Option<String>,

    #[arg(long, value_name = "PATH")]
    pub path: Option<PathBuf>,  // Legacy: extracts session ID from file path
}
```

**SessionOptions** (shared between Session and Run):
```rust
#[derive(Args, Debug, Clone, Default)]
pub struct SessionOptions {
    #[arg(long, help = "Enable debug output mode")]
    pub debug: bool,
    #[arg(long = "max-tool-repetitions", value_name = "NUMBER")]
    pub max_tool_repetitions: Option<u32>,
    #[arg(long = "max-turns", value_name = "NUMBER")]
    pub max_turns: Option<u32>,
    #[arg(long = "container", value_name = "CONTAINER_ID")]
    pub container: Option<String>,  // Docker container for extensions
}
```

**ExtensionOptions**:
```rust
#[derive(Args, Debug, Clone, Default)]
pub struct ExtensionOptions {
    #[arg(long = "with-extension", value_name = "COMMAND", action = clap::ArgAction::Append)]
    pub extensions: Vec<String>,  // Stdio extensions
    #[arg(long = "with-streamable-http-extension", value_name = "URL", value_parser = parse_streamable_http_extension)]
    pub streamable_http_extensions: Vec<StreamableHttpOptions>,
    #[arg(long = "with-builtin", value_name = "NAME", value_delimiter = ',')]
    pub builtins: Vec<String>,
    #[arg(long = "no-profile", help = "Don't load default extensions")]
    pub no_profile: bool,
}
```

**InputOptions** (for Run command):
```rust
#[derive(Args, Debug, Clone, Default)]
pub struct InputOptions {
    #[arg(short, long, value_name = "FILE", conflicts_with = "input_text", conflicts_with = "recipe")]
    pub instructions: Option<String>,  // - for stdin
    #[arg(short = 't', long = "text", value_name = "TEXT")]
    pub input_text: Option<String>,
    #[arg(long = "recipe", value_name = "RECIPE_NAME or FULL_PATH_TO_RECIPE_FILE")]
    pub recipe: Option<String>,
    #[arg(long = "system", value_name = "TEXT")]
    pub system: Option<String>,
    #[arg(long, value_name = "KEY=VALUE", action = clap::ArgAction::Append, value_parser = parse_key_val)]
    pub params: Vec<(String, String)>,
    #[arg(long = "sub-recipe", action = clap::ArgAction::Append)]
    pub additional_sub_recipes: Vec<String>,
    #[arg(long = "explain")]
    pub explain: bool,
    #[arg(long = "render-recipe")]
    pub render_recipe: bool,
}
```

**OutputOptions**:
```rust
#[derive(Args, Debug, Clone)]
pub struct OutputOptions {
    #[arg(short = 'q', long = "quiet")]
    pub quiet: bool,
    #[arg(long = "output-format", value_name = "FORMAT", default_value = "text",
          value_parser = clap::builder::PossibleValuesParser::new(["text", "json", "stream-json"]))]
    pub output_format: String,
}
```

**RunBehavior**:
```rust
#[derive(Args, Debug, Clone, Default)]
pub struct RunBehavior {
    #[arg(short = 's', long = "interactive")]
    pub interactive: bool,
    #[arg(long = "no-session", conflicts_with_all = ["resume", "name", "path"])]
    pub no_session: bool,
    #[arg(short, long, action = clap::ArgAction::SetTrue)]
    pub resume: bool,
    #[arg(long = "scheduled-job-id", hide = true)]
    pub scheduled_job_id: Option<String>,
}
```

#### Complete Command Enum

```rust
#[derive(Subcommand)]
enum Command {
    Configure {},                    // Configure goose settings
    Info { verbose: bool, check: bool },  // Display information
    Doctor {},                       // Check setup
    Mcp { server: McpCommand },      // Run bundled MCP server
    Acp { builtins: Vec<String> },   // Run ACP agent on stdio
    Serve { host: String, port: u16, builtins: Vec<String> },  // ACP HTTP/WebSocket server
    Session { ... },                 // Interactive sessions (alias: s)
    Project {},                      // Open last project (alias: p)
    Projects,                        // List projects (alias: ps)
    Run { ... },                     // Execute from file/stdin
    Gateway { command: GatewayCommand },  // External platform integrations (alias: gw)
    Schedule { command: SchedulerCommand },  // Scheduled jobs (alias: sched)
    Update { canary: bool, reconfigure: bool },  // Self-update
    Recipe { command: RecipeCommand },  // Recipe utilities
    Plugin { command: PluginCommand },  // Plugin management
    Term { command: TermCommand },   // Terminal-integrated sessions
    Tui { args: Vec<String> },       // Launch TUI
    #[cfg(feature = "local-inference")]
    LocalModels { command: LocalModelsCommand },  // Local model management (alias: lm)
    Completion { shell: CompletionShell, bin_name: String },  // Shell completions
    Review { ... },                  // Code review
    ValidateExtensions { file: PathBuf },  // Hidden: validate bundled-extensions.json
}
```

#### Subcommand Enums

**SessionCommand:**
- `List { format, ascending, working_dir, limit }`
- `Remove { identifier, regex }`
- `Export { identifier, output, format, nostr, relays }`
- `Import { input, nostr }`
- `Diagnostics { identifier, output }`

**SchedulerCommand:**
- `Add { schedule_id, cron, recipe_source, params }`
- `List {}`
- `Remove { schedule_id }`
- `Sessions { schedule_id, limit }`
- `RunNow { schedule_id }`
- `ServicesStatus {}` (deprecated)
- `ServicesStop {}` (deprecated)
- `CronHelp {}`

**GatewayCommand:**
- `Status {}`
- `Start { gateway_type, bot_token }`
- `Stop { gateway_type }`
- `Pair { gateway_type }`

**PluginCommand:**
- `Install { url, auto_update }`
- `Update { name }`

**RecipeCommand:**
- `Validate { recipe_name }`
- `Deeplink { recipe_name, params }`
- `Open { recipe_name, params }`
- `List { format, verbose }`

**TermCommand:**
- `Init { shell, name, default }`
- `Log { command }` (hidden)
- `Run { prompt }`
- `Info`

**LocalModelsCommand** (gated behind `local-inference` feature):
- `Search { query, limit }`
- `Download { spec }`
- `List`
- `Delete { id }`

#### CLI Dispatch Logic (`cli()` function)

The `cli()` function (line 2018) is the central dispatcher:

```rust
pub async fn cli() -> anyhow::Result<()> {
    register_builtin_extensions(goose_mcp::BUILTIN_EXTENSIONS.clone());
    let cli = Cli::parse();
    // ... update project tracker ...
    // ... log command execution metric ...
    match cli.command {
        Some(Command::Completion { shell, bin_name }) => { /* generate shell completions */ }
        Some(Command::Configure {}) => handle_configure().await,
        Some(Command::Doctor {}) => crate::commands::doctor::handle_doctor().await,
        Some(Command::Info { verbose, check }) => handle_info(verbose, check).await,
        Some(Command::Mcp { server }) => handle_mcp_command(server).await,
        Some(Command::Acp { builtins }) => goose::acp::server::run(builtins).await,
        Some(Command::Serve { host, port, builtins }) => handle_serve_command(host, port, builtins).await,
        // Session: with subcommand vs interactive mode
        Some(Command::Session { command: Some(cmd), .. }) => handle_session_subcommand(cmd).await,
        Some(Command::Session { command: None, identifier, resume, fork, history, session_opts, extension_opts })
            => handle_interactive_session(identifier, resume, fork, history, session_opts, extension_opts).await,
        Some(Command::Project {}) => { handle_project_default()?; Ok(()) }
        Some(Command::Projects) => { handle_projects_interactive()?; Ok(()) }
        Some(Command::Run { ... }) => handle_run_command(...).await,
        Some(Command::Gateway { command }) => handle_gateway_command(command).await,
        Some(Command::Schedule { command }) => handle_schedule_command(command).await,
        Some(Command::Update { canary, reconfigure }) => crate::commands::update::update(canary, reconfigure).await,
        Some(Command::Recipe { command }) => handle_recipe_subcommand(command),
        Some(Command::Plugin { command }) => handle_plugin_subcommand(command),
        Some(Command::Term { command }) => handle_term_subcommand(command).await,
        Some(Command::Tui { args }) => crate::commands::tui::handle_tui(args),
        #[cfg(feature = "local-inference")]
        Some(Command::LocalModels { command }) => handle_local_models_command(command).await,
        Some(Command::Review { ... }) => handle_review(ReviewOptions { ... }).await,
        Some(Command::ValidateExtensions { file }) => { /* validate bundled extensions */ }
        None => handle_default_session().await,  // Default: start interactive session
    }
}
```

#### Serve Command (ACP HTTP Server)

```rust
async fn handle_serve_command(host: String, port: u16, builtins: Vec<String>) -> Result<()> {
    let builtins = if builtins.is_empty() { vec!["developer".to_string()] } else { builtins };
    let server = Arc::new(AcpServer::new(AcpServerFactoryConfig {
        builtins,
        data_dir: Paths::data_dir(),
        config_dir: Paths::config_dir(),
        goose_platform: GoosePlatform::GooseCli,
        additional_source_roots,
    }));
    let secret_key = std::env::var(GOOSE_SERVER_SECRET_KEY_ENV)
        .unwrap_or_else(generate_serve_secret_key);
    let router = create_router(server, secret_key);
    let addr: SocketAddr = format!("{}:{}", host, port).parse()?;
    let listener = tokio::net::TcpListener::bind(addr).await?;
    axum::serve(listener, router.into_make_service_with_connect_info::<SocketAddr>()).await?;
    Ok(())
}
```

The secret key is generated as: `goose-acp-<32 random alphanumeric chars>`.

---

### 1.3 Command Modules

**File:** `goose-cli/src/commands/mod.rs`

```rust
pub mod configure;
pub mod doctor;
pub mod gateway;
pub mod info;
pub mod plugin;
pub mod project;
pub mod recipe;
pub mod review;
pub mod schedule;
pub mod session;
pub mod term;
pub mod tui;
pub mod update;
```

Note: Only `recipe.rs` and `session.rs` exist in the source tree. Other modules are referenced from the `goose-cli` crate but their files may be elsewhere in the build (e.g., from a `lib.rs` that defines additional modules).

#### Session Commands (`commands/session.rs`)

**`handle_session_list()`** - Lists sessions with filtering and sorting:
```rust
pub async fn handle_session_list(
    format: String,
    ascending: bool,
    working_dir: Option<PathBuf>,
    limit: Option<usize>,
) -> Result<()> {
    let session_manager = SessionManager::instance();
    let mut sessions = session_manager.list_sessions().await?;
    // Filter by working_dir, sort (ascending/descending), limit results
    // Output: text or JSON
}
```

**`handle_session_remove()`** - Removes sessions by ID, name, regex, or interactively:
- If `session_id` provided: finds by ID
- If `name` provided: searches all sessions for matching name
- If `regex` provided: filters visible sessions by regex pattern
- If none provided: interactive multi-select via `cliclack::multiselect()`

```rust
pub async fn handle_session_remove(
    session_id: Option<String>,
    name: Option<String>,
    regex_string: Option<String>,
) -> Result<()> {
    // ... resolution logic ...
    remove_sessions(&session_manager, matched_sessions).await
}
```

**`handle_session_export()`** - Exports sessions in multiple formats:
- Formats: `markdown`, `json`, `yaml`
- Nostr sharing: Publishes JSON export as encrypted Nostr event
- Outputs to file or stdout

```rust
pub async fn handle_session_export(
    session_id: String,
    output_path: Option<PathBuf>,
    format: String,
    nostr: bool,
    relays: Vec<String>,
) -> Result<()> {
    let session = session_manager.get_session(&session_id, true).await?;
    let output = match format.as_str() {
        "json" => serde_json::to_string_pretty(&session)?,
        "yaml" => serde_yaml::to_string(&session)?,
        "markdown" => export_session_to_markdown(conversation.messages().to_vec(), &session.name),
        _ => return Err(...),
    };
    // ... output or nostr publish ...
}
```

**`handle_session_import()`** - Imports from JSON or Nostr share links:
```rust
pub async fn handle_session_import(input: String, nostr: bool) -> Result<()> {
    let json = if nostr || input.starts_with("goose://sessions/nostr") {
        nostr_share::import_session_json_from_deeplink(&input).await?
    } else {
        fs::read_to_string(&input)?
    };
    let session = session_manager.import_session(&json, Some(SessionType::User)).await?;
}
```

**`handle_diagnostics()`** - Generates diagnostics bundle as ZIP:
```rust
pub async fn handle_diagnostics(session_id: &str, output_path: Option<PathBuf>) -> Result<()> {
    let diagnostics_data = generate_diagnostics(&session_manager, session_id).await?;
    // Write to diagnostics_{session_id}.zip
}
```

**`prompt_interactive_session_selection()`** - Interactive session picker using `cliclack::select()`.

#### Recipe Commands (`commands/recipe.rs`)

**`handle_validate()`** - Validates a recipe file:
```rust
pub fn handle_validate(recipe_name: &str) -> Result<()> {
    let recipe_file = load_recipe_file(recipe_name)?;
    validate_recipe_template_from_file(&recipe_file)?;
    println!("{} recipe file is valid", style("✓").green().bold());
    Ok(())
}
```

**`handle_deeplink()`** - Generates a `goose://recipe?config=...` deeplink:
```rust
pub fn handle_deeplink(recipe_name: &str, params: &[String]) -> Result<String> {
    let params_map = parse_params(params)?;
    let (deeplink_url, recipe) = generate_deeplink(recipe_name, params_map)?;
    // URL format: goose://recipe?config=<encoded>&key=value...
    Ok(deeplink_url)
}
```

**`handle_open()`** - Opens a recipe in Goose Desktop via OS `open::that()`.

**`handle_list()`** - Lists available recipes from local and GitHub sources in text or JSON.

**`parse_params()`** - Parses `key=value` parameters (supports values containing `=`):
```rust
fn parse_params(params: &[String]) -> Result<HashMap<String, String>> {
    for param in params {
        let parts: Vec<&str> = param.splitn(2, '=').collect();
        if parts.len() != 2 { return Err(...); }
        params_map.insert(parts[0].to_string(), parts[1].to_string());
    }
}
```

**`generate_deeplink()`** - Encodes recipe via `recipe_deeplink::encode()`:
```rust
fn generate_deeplink(recipe_name: &str, params: HashMap<String, String>) 
    -> Result<(String, Recipe)> {
    let recipe_file = load_recipe_file(recipe_name)?;
    let recipe = validate_recipe_template_from_file(&recipe_file)?;
    let encoded = recipe_deeplink::encode(&recipe)?;
    let mut full_url = format!("goose://recipe?config={}", encoded);
    for (key, value) in params {
        full_url.push_str(&format!("&{}={}", urlencoding::encode(&key), urlencoding::encode(&value)));
    }
    Ok((full_url, recipe))
}
```

---

### 1.4 Session Management

**File:** `goose-cli/src/session/mod.rs` (2,294 lines)

The session module is the heart of the CLI. It declares submodules:

```rust
mod builder;
mod completion;
mod editor;
mod elicitation;
mod export;
mod input;
mod output;
pub mod streaming_buffer;
mod task_execution_display;
mod thinking;
```

#### CliSession Struct

```rust
pub struct CliSession {
    agent: Agent,
    messages: Conversation,
    session_id: String,
    completion_cache: Arc<std::sync::RwLock<CompletionCache>>,
    debug: bool,
    run_mode: RunMode,
    scheduled_job_id: Option<String>,
    max_turns: Option<u32>,
    edit_mode: Option<EditMode>,
    retry_config: Option<RetryConfig>,
    output_format: String,
}
```

**RunMode** enum controls between Normal and Plan modes:
```rust
pub enum RunMode {
    Normal,
    Plan,
}
```

#### Interactive Session Loop

```rust
async fn run_interactive(&mut self, prompt: Option<String>) -> Result<()> {
    if let Some(prompt) = prompt {
        let msg = Message::user().with_text(&prompt);
        self.process_message(msg, CancellationToken::default(), true).await?;
    }
    self.update_completion_cache().await?;
    let mut editor = self.create_editor()?;
    let history_manager = HistoryManager::new();
    history_manager.load(&mut editor);
    loop {
        self.display_context_usage().await?;
        let conversation_strings: Vec<String> = self.messages.iter()
            .map(|msg| format!("## {}: {}", role, msg.as_concat_text()))
            .collect();
        output::run_status_hook("waiting");
        let input = input::get_input(&mut editor, Some(&conversation_strings))?;
        if matches!(input, InputResult::Exit) { break; }
        self.handle_input(input, &history_manager, &mut editor, &conversation_strings).await?;
    }
    Ok(())
}
```

#### Input Handling (`handle_input()`)

The session handles these `InputResult` variants:

| Variant | Action |
|---------|--------|
| `Message(content)` | Process user message (Normal or Plan mode) |
| `Exit` | Break the loop |
| `AddExtension(cmd)` | Parse and add stdio extension |
| `AddBuiltin(names)` | Parse and add builtin extensions |
| `ToggleTheme` | Cycle Ansi -> Light -> Dark |
| `ToggleFullToolOutput` | Toggle tool output truncation |
| `SelectTheme(name)` | Set specific theme |
| `Retry` | No-op |
| `ListPrompts(extension)` | List MCP prompts from extensions |
| `GooseMode(mode)` | Change goose mode (Auto, Approve, etc.) |
| `Plan(options)` | Enter plan mode with reasoner model |
| `EndPlan` | Exit plan mode |
| `Clear` | Clear conversation history |
| `PromptCommand(opts)` | Execute a named prompt with arguments |
| `Recipe(filepath)` | Generate and save recipe from current session |
| `Compact` | Compact/summarize conversation |
| `Edit(prefill)` | Open external editor for input |
| `LoadSkills(names)` | Load skills via load_skill tool |
| `ListSkills` | Display installed skills table |

#### Agent Response Processing

The `process_agent_response()` method handles streaming responses:

```rust
async fn process_agent_response(&mut self, interactive: bool, cancel_token: CancellationToken) 
    -> Result<()> {
    let mut stream = self.agent.reply(user_message, session_config, Some(cancel_token)).await?;
    let mut progress_bars = output::McpSpinners::new();
    let mut markdown_buffer = streaming_buffer::MarkdownBuffer::new();
    loop {
        tokio::select! {
            result = stream.next() => {
                match result {
                    Some(Ok(AgentEvent::Message(message))) => {
                        // Handle tool confirmation, elicitation, or normal message
                    }
                    Some(Ok(AgentEvent::McpNotification((ext_id, notification)))) => {
                        // Handle progress/logging notifications
                    }
                    Some(Ok(AgentEvent::HistoryReplaced(updated))) => {
                        self.messages = updated;
                    }
                    Some(Err(e)) => { /* handle error */ }
                    None => break,
                }
            }
            _ = cancel_token.cancelled() => {
                drop(stream);
                self.handle_interrupted_messages(true).await?;
                break;
            }
        }
    }
}
```

#### Tool Confirmation Flow

When the agent requests tool confirmation:
1. `find_tool_confirmation()` extracts `(id, security_prompt)` from `ActionRequiredData::ToolConfirmation`
2. In interactive mode: prompts user via `cliclack::select()` with options:
   - Without security prompt: Allow Once / Always Allow / Deny / Cancel
   - With security prompt: Allow / Deny / Cancel
3. In headless mode with `Approve`/`SmartApprove` modes: errors out (invalid config)
4. In headless mode with `Auto`: auto-allows with warning

#### Elicitation Flow

When the agent needs additional input (`find_elicitation_request()`):
1. Extracts `(elicitation_id, message, schema)` from `ActionRequiredData::Elicitation`
2. In interactive mode: `elicitation::collect_elicitation_input()` collects user data via schema
3. In headless mode: errors out (no terminal available)

#### Plan Mode

```rust
async fn handle_plan_mode(&mut self, options: input::PlanCommandOptions) -> Result<()> {
    self.run_mode = RunMode::Plan;
    let reasoner = get_reasoner().await?;  // Uses GOOSE_PLANNER_PROVIDER/MODEL
    let plan_prompt = self.agent.get_plan_prompt(&self.session_id).await?;
    let (plan_response, _usage) = reasoner.complete(...).await?;
    let response_type = classify_planner_response(&self.session_id, plan_text, provider).await?;
    match response_type {
        PlannerResponseType::Plan => {
            // Ask user to act on plan -> clear history, set Auto mode, execute
        }
        PlannerResponseType::ClarifyingQuestions => {
            // Push plan as assistant message, let user answer
        }
    }
}
```

#### Session Lifecycle Functions

**`get_or_create_session_id()`** - Session ID resolution logic:

```rust
async fn get_or_create_session_id(identifier, resume, no_session, goose_mode) -> Result<Option<String>> {
    if no_session { return Ok(None); }
    if resume {
        // Resolve from identifier (name -> search, session_id -> direct, path -> extract stem)
        // Or default to most recent session
    } else {
        // Create new session with SessionManager
        // Optionally set user_provided_name
    }
}
```

**`handle_interactive_session()`** - Full interactive session setup:
- Telemetry consent check (if `telemetry` feature)
- Session ID resolution (new/resumed/forked)
- Fork: copies session history to new session
- Build session via `SessionBuilderConfig`
- Optional history display on resume/fork
- Run interactive loop + log completion metrics

**`handle_run_command()`** - Headless execution:
- Parses input (instructions file / text / recipe)
- Builds session with recipe support
- Either runs interactively or headlessly
- Logs session completion metrics (duration, tokens, message count)

#### Extension Parsing

**Stdio extensions:**
```rust
pub fn parse_stdio_extension(extension_command: &str) -> Result<ExtensionConfig> {
    // Format: "ENV1=val1 ENV2=val2 command args..."
    let mut parts = goose::utils::split_command_args(extension_command)?;
    let mut envs = HashMap::new();
    while let Some(part) = parts.first() {
        if !part.contains('=') { break; }
        let (key, value) = parts.remove(0).split_once('=').unwrap();
        envs.insert(key.to_string(), value.to_string());
    }
    let cmd = parts.remove(0);
    let name = Path::new(&cmd).file_name().unwrap_or("unnamed").to_string();
    Ok(ExtensionConfig::Stdio { name, cmd, args: parts, envs: Envs::new(envs), ... })
}
```

**Streamable HTTP extensions:**
```rust
pub fn parse_streamable_http_extension(extension_url: &str, timeout: u64) -> ExtensionConfig {
    let name = url::Url::parse(extension_url)
        .map(|u| { /* derive name from host_port_path */ })
        .unwrap_or_else(|| "unnamed".to_string());
    ExtensionConfig::StreamableHttp { name, uri: extension_url.to_string(), ... }
}
```

**Builtin extensions:**
```rust
pub fn parse_builtin_extensions(builtin_name: &str) -> Vec<ExtensionConfig> {
    builtin_name.split(',').map(|name| {
        if PLATFORM_EXTENSIONS.contains_key(name) {
            ExtensionConfig::Platform { name: name.to_string(), ... }
        } else {
            ExtensionConfig::Builtin { name: name.to_string(), ... }
        }
    }).collect()
}
```

---

### 1.5 Recipe System

The recipe system is integrated into both the CLI argument parsing and session management.

#### Recipe Parsing in Run Command (`parse_run_input()`)

```rust
fn parse_run_input(input_opts: &InputOptions, quiet: bool) -> Result<Option<(InputConfig, Option<Recipe>)>> {
    match (&input_opts.instructions, &input_opts.input_text, &input_opts.recipe) {
        (Some(file), _, _) if file == "-" => {
            // Read from stdin
            Ok(Some((InputConfig { contents: Some(contents), additional_system_prompt: input_opts.system.clone() }, None)))
        }
        (Some(file), _, _) => {
            // Read from file
            Ok(Some((InputConfig { contents: Some(contents), additional_system_prompt: None }, None)))
        }
        (_, Some(text), _) => {
            Ok(Some((InputConfig { contents: Some(text.clone()), additional_system_prompt: input_opts.system.clone() }, None)))
        }
        (_, _, Some(recipe_name)) => {
            // Handle --explain (print recipe details and exit)
            // Handle --render-recipe (print rendered YAML and exit)
            // Extract recipe info from CLI (resolves file, parses params, loads sub-recipes)
            let (input_config, recipe) = extract_recipe_info_from_cli(
                recipe_name.clone(),
                input_opts.params.clone(),
                input_opts.additional_sub_recipes.clone(),
                quiet,
            )?;
            Ok(Some((input_config, Some(recipe))))
        }
        (None, None, None) => {
            eprintln!("Error: Must provide --instructions (-i), --text (-t), or --recipe.");
            std::process::exit(1);
        }
    }
}
```

#### Recipe Generation (`handle_recipe()`)

```rust
async fn handle_recipe(&mut self, filepath_opt: Option<String>) {
    let recipe = self.agent.create_recipe(&self.session_id, self.messages.clone()).await;
    match recipe {
        Ok(recipe) => {
            let filepath_str = filepath_opt.as_deref().unwrap_or("recipe.yaml");
            match self.save_recipe(&recipe, filepath_str) {
                Ok(path) => println!("Saved recipe to {}", path.display()),
                Err(e) => println!("{}", console::style(e).red()),
            }
        }
        Err(e) => println!("Failed to generate recipe: {:?}", e),
    }
}
```

#### Recipe Save Logic

```rust
fn save_recipe(&self, recipe: &Recipe, filepath_str: &str) -> anyhow::Result<PathBuf> {
    let path_buf = PathBuf::from(filepath_str);
    let mut path = if path_buf.is_relative() {
        std::env::current_dir()?.join(&path_buf)
    } else { path_buf.clone() };
    // Verify parent directory exists
    // Create file and write YAML via serde_yaml::to_writer()
    Ok(path)
}
```

---

### 1.6 Feature Flags

**File:** `goose-cli/Cargo.toml`

#### Default Features
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

| Feature | Description | Forwards To |
|---------|-------------|-------------|
| `code-mode` | Enable code mode in goose core | `goose/code-mode` |
| `local-inference` | Local LLM inference via HuggingFace GGUF | `goose/local-inference` |
| `aws-providers` | AWS provider support | `goose/aws-providers` |
| `telemetry` | PostHog telemetry collection | `goose/telemetry` |
| `otel` | OpenTelemetry instrumentation | `goose/otel` |
| `rustls-tls` | Use rustls for TLS (default) | reqwest, sigstore-verify, goose |
| `system-keyring` | OS keyring integration | `goose/system-keyring` |
| `cuda` | CUDA acceleration for local inference | `goose/cuda`, `local-inference` |
| `vulkan` | Vulkan acceleration for local inference | `goose/vulkan`, `local-inference` |
| `portable-default` | Portable defaults without system-keyring | rustls-tls, aws-providers, telemetry, otel |
| `disable-update` | Disables the self-update command | (none) |
| `native-tls` | Alternative to rustls-tls | reqwest/native-tls, etc. |

#### goose-mcp Feature Flags
```toml
[features]
rustls-tls = ["reqwest/rustls"]
native-tls = ["reqwest/native-tls"]
```

---

## 2. MCP Analysis

### 2.1 MCP Architecture & Server Runner

**File:** `goose-mcp/src/lib.rs`

#### App Strategy (Directory Layout)

```rust
pub static APP_STRATEGY: Lazy<AppStrategyArgs> = Lazy::new(|| AppStrategyArgs {
    top_level_domain: "Block".to_string(),
    author: "Block".to_string(),
    app_name: "goose".to_string(),
});
```

Note: The comment warns that "Block" is kept for backwards compatibility with existing user config/data directories.

#### Module Exports

```rust
pub mod autovisualiser;
pub mod computercontroller;
pub mod mcp_server_runner;
mod memory;
#[cfg(target_os = "macos")]
pub mod peekaboo;
pub mod subprocess;
pub mod tutorial;

pub use autovisualiser::AutoVisualiserRouter;
pub use computercontroller::ComputerControllerServer;
pub use memory::MemoryServer;
pub use tutorial::TutorialServer;
```

#### Builtin Extension Registry

```rust
pub type SpawnServerFn = fn(tokio::io::DuplexStream, tokio::io::DuplexStream);

fn spawn_and_serve<S>(name: &'static str, server: S, transport: (DuplexStream, DuplexStream))
where S: ServerHandler + Send + 'static
{
    tokio::spawn(async move {
        match server.serve(transport).await {
            Ok(running) => { let _ = running.waiting().await; }
            Err(e) => tracing::error!(builtin = name, error = %e, "server error"),
        }
    });
}

macro_rules! builtin {
    ($name:ident, $server_ty:ty) => {{
        fn spawn(r: DuplexStream, w: DuplexStream) {
            spawn_and_serve(stringify!($name), <$server_ty>::new(), (r, w));
        }
        (stringify!($name), spawn as SpawnServerFn)
    }};
}

pub static BUILTIN_EXTENSIONS: Lazy<HashMap<&'static str, SpawnServerFn>> = Lazy::new(|| {
    HashMap::from([
        builtin!(autovisualiser, AutoVisualiserRouter),
        builtin!(computercontroller, ComputerControllerServer),
        builtin!(memory, MemoryServer),
        builtin!(tutorial, TutorialServer),
    ])
});
```

The four builtin extensions are:
| Name | Server Type | Purpose |
|------|-------------|---------|
| `autovisualiser` | `AutoVisualiserRouter` | Data visualization charts |
| `computercontroller` | `ComputerControllerServer` | Web scraping, scripting, file ops, UI automation |
| `memory` | `MemoryServer` | Persistent categorized memory storage |
| `tutorial` | `TutorialServer` | Embedded tutorial loading |

#### MCP Server Runner (`mcp_server_runner.rs`)

```rust
#[derive(Clone, Debug)]
pub enum McpCommand {
    AutoVisualiser,
    ComputerController,
    Memory,
    Tutorial,
}

impl FromStr for McpCommand {
    fn from_str(s: &str) -> Result<Self, Self::Err> {
        match s.to_lowercase().replace(' ', "").as_str() {
            "autovisualiser" => Ok(McpCommand::AutoVisualiser),
            "computercontroller" => Ok(McpCommand::ComputerController),
            "memory" => Ok(McpCommand::Memory),
            "tutorial" => Ok(McpCommand::Tutorial),
            _ => Err(format!("Invalid command: {}", s)),
        }
    }
}

pub async fn serve<S>(server: S) -> Result<()>
where S: rmcp::ServerHandler
{
    let service = server.serve(stdio()).await?;
    service.waiting().await?;
    Ok(())
}
```

Each server communicates over **stdio transport** using the `rmcp` crate.

---

### 2.2 Subprocess Management

**File:** `goose-mcp/src/subprocess.rs`

#### No-Window Trait

```rust
pub trait SubprocessExt {
    fn set_no_window(&mut self) -> &mut Self;
}

impl SubprocessExt for Command {
    fn set_no_window(&mut self) -> &mut Self {
        #[cfg(windows)]
        { self.creation_flags(0x08000000); }  // CREATE_NO_WINDOW
        self
    }
}
```

This prevents console windows from popping up on Windows when spawning child processes.

#### Login Shell PATH Resolution

When goose is launched from a desktop app (e.g., Electron), it may inherit a minimal PATH. This function recovers the full PATH:

```rust
#[cfg(not(windows))]
fn resolve_login_shell_path() -> Option<String> {
    let shell = std::env::var("SHELL")
        .filter(|s| PathBuf::from(s).is_file())
        .unwrap_or_else(|| {
            if PathBuf::from("/bin/bash").is_file() { "/bin/bash".to_string() } 
            else { "sh".to_string() }
        });
    let mut cmd = CommandWrap::from(std::process::Command::new(&shell));
    cmd.command_mut().args(["-l", "-i", "-c", "echo $PATH"])
        .stdin(Stdio::null()).stdout(Stdio::piped()).stderr(Stdio::null());
    cmd.wrap(ProcessSession);  // New session to avoid terminal foreground theft
    let child = cmd.spawn().ok()?;
    let output = child.wait_with_output().ok()?;
    String::from_utf8_lossy(&output.stdout).lines().rev()
        .find(|line| !line.trim().is_empty())
        .map(|line| line.trim().to_string())
}

#[cfg(not(windows))]
pub fn user_login_path() -> Option<&'static str> {
    static CACHED: OnceLock<Option<String>> = OnceLock::new();
    CACHED.get_or_init(resolve_login_shell_path).as_deref()
}
```

**`merged_path()`** combines login shell PATH (first, for user tools) with current process PATH (for runtime additions like direnv/nix):

```rust
#[cfg(not(windows))]
pub fn merged_path() -> Option<String> {
    let login = user_login_path()?;
    let current = std::env::var("PATH").unwrap_or_default();
    let login_entries: Vec<&str> = login.split(':').collect();
    let mut seen: HashSet<&str> = login_entries.iter().copied().collect();
    let mut merged = login_entries;
    for entry in current.split(':') {
        if seen.insert(entry) { merged.push(entry); }
    }
    Some(merged.join(":"))
}
```

---

### 2.3 Computer Controller

**File:** `goose-mcp/src/computercontroller/mod.rs` (1,669 lines)

The `ComputerControllerServer` is the most feature-rich MCP server. It provides:

#### Server Structure

```rust
#[derive(Clone)]
pub struct ComputerControllerServer {
    tool_router: ToolRouter<Self>,
    cache_dir: PathBuf,
    active_resources: Arc<Mutex<HashMap<String, ResourceContents>>>,
    http_client: Client,
    instructions: String,
    system_automation: Arc<Box<dyn SystemAutomation + Send + Sync>>,
    #[cfg(target_os = "macos")]
    peekaboo_installed: Arc<AtomicBool>,
}
```

#### Tools Provided

| Tool | Platforms | Description |
|------|-----------|-------------|
| `web_scrape` | All | HTTP fetch with text/JSON/binary save modes |
| `automation_script` | All | Create and run scripts (Shell/Batch/Ruby/PowerShell) |
| `computer_control` | Windows/Linux | System automation via platform scripts |
| `computer_control` | macOS | Peekaboo CLI passthrough for GUI automation |
| `xlsx_tool` | All | Excel file reading and manipulation (7 operations) |
| `docx_tool` | All | Word document text extraction and creation |
| `pdf_tool` | All | PDF text extraction and image extraction |
| `cache` | All | Cache file management (list/view/delete/clear) |

#### web_scrape Tool

```rust
#[tool(name = "web_scrape", description = "Fetch and save content from a web page")]
pub async fn web_scrape(&self, params: Parameters<WebScrapeParams>) 
    -> Result<CallToolResult, ErrorData> {
    let response = self.http_client.get(url)
        .header("Accept", "text/markdown, */*")
        .send().await?;
    // Save as text (.txt), JSON (.json), or binary (.bin) based on save_as parameter
    let cache_path = self.save_to_cache(&content, "web", extension).await?;
    self.register_as_resource(&cache_path, mime_type)?;
    Ok(CallToolResult::success(vec![Content::text(format!("Content saved to: {}", cache_path.display()))]))
}
```

#### automation_script Tool

Platform-specific implementations:

**Windows:** PowerShell/Batch scripts
**macOS:** Shell/Ruby/AppleScript (via osascript)
**Linux:** Shell scripts (bash)

All scripts:
- Written to temp files with appropriate extensions
- Set to executable (Unix: `0o755` permissions)
- Run with `GOOSE_TERMINAL=1` and `AGENT=goose` env vars
- On non-Windows: PATH is enriched via `merged_path()`
- Optionally save output to cache

#### computer_control Tool (Platform Variants)

**Windows/Linux:** Executes system automation scripts:
```rust
async fn computer_control_impl(&self, params) -> Result<CallToolResult, ErrorData> {
    let output = self.system_automation.execute_system_script(script)?;
    // Optionally save output to cache
    Ok(CallToolResult::success(vec![Content::text(result)]))
}
```

**macOS:** Peekaboo CLI passthrough:
```rust
async fn peekaboo_impl(&self, params) -> Result<CallToolResult, ErrorData> {
    self.ensure_peekaboo()?;  // Auto-install via Homebrew if needed
    let args = shell_words::split(&params.command)?;
    // Add --path for screenshot commands, --json for list commands
    let stdout = self.run_peekaboo_cmd(&arg_refs)?;
    // If screenshot: encode as base64 image, return with text
    // If capture_screenshot: capture after action
    Ok(CallToolResult::success(contents))
}
```

#### xlsx_tool (Excel)

Operations:
- `ListWorksheets` - List all worksheets
- `GetColumns` - Get column names from first row
- `GetRange` - Get values/formulas from a cell range (A1 notation)
- `FindText` - Search for text (case-sensitive option)
- `UpdateCell` - Update a single cell
- `GetCell` - Get value and formula from a cell
- `Save` - Persist changes

#### docx_tool (Word)

Operations:
- `ExtractText` - Extract text content and structure
- `UpdateDoc` - Create/update with modes: `append`, `replace`, `structured`, `add_image`
  - Supports text styling (bold, italic, underline, size, color, alignment)
  - Supports heading levels
  - Supports image insertion with optional caption

#### pdf_tool

Operations:
- `ExtractText` - Extract all text from PDF
- `ExtractImages` - Extract embedded images as PNG files

#### Cache Tool

Operations:
- `List` - List all cached files
- `View` - Read content of a cached file
- `Delete` - Remove a cached file
- `Clear` - Remove all cached files

Cache directory: `~/.cache/goose/computer_controller/` (macOS/Linux) or `~\AppData\Local\Block\goose\cache\computer_controller\` (Windows)

---

### 2.4 Memory System

**File:** `goose-mcp/src/memory/mod.rs` (669 lines)

The `MemoryServer` provides persistent categorized memory storage.

#### Storage Layout

```
Global:  ~/.config/goose/memory/<category>.txt
Local:   <working_dir>/.goose/memory/<category>.txt
```

#### Tools

| Tool | Description |
|------|-------------|
| `remember_memory` | Store data with optional tags in a category |
| `retrieve_memories` | Retrieve all memories from a category (`*` for all) |
| `remove_memory_category` | Remove all memories in a category (`*` for all global/local) |
| `remove_specific_memory` | Remove a specific memory by content match |

#### Memory File Format

```
# tag1 tag2
Memory data here

# important
Another memory

Untagged memory content
```

Memories are separated by blank lines (`\n\n`). Tags are prefixed with `#`.

#### Server Initialization

At startup, the server loads global memories and embeds them into its instructions:

```rust
pub fn new() -> Self {
    // ... build base instructions ...
    let retrieved_global_memories = memory_router.retrieve_all(true, None);
    if let Ok(global_memories) = retrieved_global_memories {
        if !global_memories.is_empty() {
            updated_instructions.push_str("\n\nGlobal Memories:\n");
            for (category, memories) in global_memories {
                updated_instructions.push_str(&format!("\nCategory: {}\n", category));
                for memory in memories {
                    updated_instructions.push_str(&format!("- {}\n", memory));
                }
            }
        }
    }
    memory_router.set_instructions(updated_instructions);
    memory_router
}
```

#### Working Directory Extraction

```rust
const WORKING_DIR_HEADER: &str = "agent-working-dir";

fn extract_working_dir_from_meta(meta: &Meta) -> Option<PathBuf> {
    meta.0.get(WORKING_DIR_HEADER)
        .and_then(|v| v.as_str())
        .filter(|s| !s.is_empty())
        .map(PathBuf::from)
}
```

The `agent-working-dir` header is passed in request metadata to determine local vs global scope.

---

### 2.5 Tutorial System

**File:** `goose-mcp/src/tutorial/mod.rs` (209 lines)

The `TutorialServer` provides embedded tutorial content.

#### Tutorial Embedding

```rust
static TUTORIALS_DIR: Dir = include_dir!("$CARGO_MANIFEST_DIR/src/tutorial/tutorials");
```

Tutorials are embedded at compile time using `include_dir!`. Each tutorial is a `.md` file in the `tutorials/` subdirectory.

#### Tools

| Tool | Description |
|------|-------------|
| `load_tutorial` | Load a tutorial by name, returns markdown content |

#### Server Info

```rust
impl ServerHandler for TutorialServer {
    fn get_info(&self) -> ServerInfo {
        InitializeResult::new(ServerCapabilities::builder().enable_tools().build())
            .with_server_info(Implementation::new("goose-tutorial", env!("CARGO_PKG_VERSION")))
            .with_instructions(self.instructions.clone())
    }
}
```

The instructions include the list of available tutorials and guidance to be interactive with users.

#### Example Tutorial Loading

```rust
#[tool(name = "load_tutorial", description = "Load a tutorial by name")]
pub async fn load_tutorial(&self, params: Parameters<LoadTutorialParams>) 
    -> Result<CallToolResult, ErrorData> {
    let file_name = format!("{}.md", params.name);
    let file = TUTORIALS_DIR.get_file(&file_name).ok_or(...)?;
    let content = String::from_utf8_lossy(file.contents()).into_owned();
    Ok(CallToolResult::success(vec![
        Content::text(content).with_audience(vec![Role::Assistant])
    ]))
}
```

Content is returned with `Role::Assistant` audience so only the assistant sees it.

---

### 2.6 Peekaboo (macOS GUI Automation)

**File:** `goose-mcp/src/peekaboo/mod.rs` (86 lines)

Peekaboo is a **macOS-only** module that wraps the `peekaboo` CLI tool for GUI automation. It is NOT a standalone MCP server -- it is used internally by `ComputerControllerServer` on macOS.

#### Functions

```rust
pub fn is_peekaboo_installed() -> bool;  // Checks `which peekaboo`
pub fn resolve_brew() -> Option<String>;  // Finds Homebrew binary
pub fn auto_install_peekaboo() -> Result<(), String>;  // brew install steipete/tap/peekaboo
```

#### Auto-Install Flow

```rust
pub fn auto_install_peekaboo() -> Result<(), String> {
    let brew = resolve_brew().ok_or("Homebrew is not installed...")?;
    let output = std::process::Command::new(&brew)
        .args(["install", "steipete/tap/peekaboo"])
        .output().map_err(...)?;
    if output.status.success() {
        // Verify binary is on PATH, if not try adding brew bin to PATH
        // Peekaboo requires macOS 15+ (Sequoia) with Screen Recording and Accessibility permissions
    }
}
```

#### ComputerControllerServer Integration

```rust
#[cfg(target_os = "macos")]
fn ensure_peekaboo(&self) -> Result<(), ErrorData> {
    if self.peekaboo_installed.load(Ordering::Relaxed) { return Ok(()); }
    if crate::peekaboo::is_peekaboo_installed() {
        self.peekaboo_installed.store(true, Ordering::Relaxed);
        return Ok(());
    }
    match crate::peekaboo::auto_install_peekaboo() {
        Ok(()) => { self.peekaboo_installed.store(true, Ordering::Relaxed); Ok(()) }
        Err(msg) => Err(ErrorData::new(...)),
    }
}
```

The server sends peekaboo subcommands as a single string parameter:
```yaml
computer_control:
  command: "see --app Safari --annotate"
  capture_screenshot: true
```

---

### 2.7 Autovisualiser

**File:** `goose-mcp/src/autovisualiser/mod.rs` (1,825+ lines)

The `AutoVisualiserRouter` provides interactive data visualization tools using embedded HTML templates with inlined JavaScript libraries.

#### MCP Apps Integration (SEP-1865)

Uses the `text/html;profile=mcp-app` MIME type for MCP Apps support:

```rust
const MCP_APPS_MIME_TYPE: &str = "text/html;profile=mcp-app";
```

UI resources are registered with `resourceUri` metadata:
```rust
fn ui_resource_meta(uri: &str) -> Meta {
    let mut meta = Meta::new();
    meta.0.insert("ui".to_string(), json!({ "resourceUri": uri }));
    meta
}
```

#### Available UI Resources

| URI | Type | JS Library |
|-----|------|------------|
| `ui://autovisualiser/chart` | Line/Bar/Scatter chart | Chart.js (inlined) |
| `ui://autovisualiser/sankey` | Sankey flow diagram | D3 + d3-sankey (inlined) |
| `ui://autovisualiser/radar` | Radar/spider chart | Chart.js (inlined) |
| `ui://autovisualiser/donut` | Donut/Pie chart | Chart.js (inlined) |
| `ui://autovisualiser/treemap` | Treemap visualization | D3 (inlined) |
| `ui://autovisualiser/chord` | Chord diagram | D3 (inlined) |
| `ui://autovisualiser/map` | Interactive map | Leaflet + MarkerCluster (inlined) |
| `ui://autovisualiser/mermaid` | Mermaid diagrams | Mermaid.js (inlined) |

#### HTML Templates

All templates are embedded at compile time using `include_str!()`:

```rust
fn get_template_html(&self, uri: &str) -> Result<String, ErrorData> {
    match uri {
        "ui://autovisualiser/chart" => {
            const TEMPLATE: &str = include_str!("templates/chart_template.html");
            const CHART_MIN: &str = include_str!("templates/assets/chart.min.js");
            const BASE_CSS: &str = include_str!("templates/assets/mcp-app-base.css");
            const BRIDGE_JS: &str = include_str!("templates/assets/mcp-app-bridge.js");
            Ok(TEMPLATE
                .replace("{{CHART_MIN}}", CHART_MIN)
                .replace("{{MCP_APP_BASE_CSS}}", BASE_CSS)
                .replace("{{MCP_APP_BRIDGE}}", BRIDGE_JS))
        }
        // ... 8 total templates ...
    }
}
```

Templates have JS/CSS libraries inlined but NO data -- data arrives via `postMessage` through the MCP Apps bridge.

#### Data Validation

```rust
fn validate_data_param(params: &Value, allow_array: bool) -> Result<Value, ErrorData> {
    let data_value = params.get("data").ok_or(...)?;
    if data_value.is_string() {
        return Err(ErrorData::new(ErrorCode::INVALID_PARAMS,
            "The 'data' parameter must be a JSON object, not a JSON string. 
             Please provide valid JSON without comments.", None));
    }
    // Validates object (or array if allow_array) type
}
```

This specifically guards against LLMs passing JSON as a string (which was a common error pattern).

#### Tools

| Tool | Data Structure | Validates |
|------|---------------|-----------|
| `render_sankey` | `SankeyData { nodes, links }` | Non-empty nodes/links, valid source/target references, positive values, no cycles documented |
| `render_radar` | `RadarData { labels, datasets }` | Non-empty, dataset values match label count |
| `render_donut` | `Vec<SingleDonutChart>` | Non-empty charts, values/labels length match |
| `render_treemap` | `TreemapNode { name, value?, children?, category? }` | Nodes have value or children |
| `render_chord` | `ChordData { labels, matrix }` | Square matrix, matches label count |
| `render_map` | `MapData { markers[], title?, center?, zoom? }` | Valid lat/lng ranges, non-empty markers |
| `render_mermaid` | `RenderMermaidParams { mermaid_code }` | (string content) |
| `show_chart` | `ChartData { type, datasets[], labels?, ... }` | Non-empty datasets, label/value count match |

Each tool returns a `CallToolResult` with:
1. `structured_content` - the raw JSON data
2. `content` - a text fallback description
3. `_meta.ui.resourceUri` - linking to the appropriate HTML template

#### Example: Sankey Validation

```rust
impl SankeyData {
    fn validate(&self) -> Result<(), ErrorData> {
        if self.nodes.is_empty() { return Err(validation_err("nodes array must not be empty")); }
        if self.links.is_empty() { return Err(validation_err("links array must not be empty")); }
        let names: HashSet<&str> = self.nodes.iter().map(|n| n.name.as_str()).collect();
        for link in &self.links {
            if !names.contains(link.source.as_str()) { 
                return Err(validation_err(format!("link source '{}' not found in nodes", link.source))); 
            }
            if !names.contains(link.target.as_str()) { 
                return Err(validation_err(format!("link target '{}' not found in nodes", link.target))); 
            }
            if link.value <= 0.0 { 
                return Err(validation_err("link value must be positive")); 
            }
        }
        Ok(())
    }
}
```

---

### 2.8 Platform Support

#### Platform-Specific Code Summary

| Feature | macOS | Windows | Linux | Other |
|---------|-------|---------|-------|-------|
| `computer_control` tool | Peekaboo CLI | PowerShell scripts | Shell scripts | Shell scripts (headless-aware) |
| `automation_script` | Shell/Ruby/AppleScript | PowerShell/Batch | Shell (bash) | Shell |
| Peekaboo module | `pub mod peekaboo;` | (not compiled) | (not compiled) | (not compiled) |
| Subprocess no-window | (no-op) | `creation_flags(0x08000000)` | (no-op) | (no-op) |
| PATH resolution | Login shell (`SHELL` env) | (not needed) | Login shell (`SHELL` env) | Login shell |
| Cache directory | `~/Library/Caches/goose/` | `~/AppData/Local/Block/goose/cache/` | `~/.cache/goose/` | `~/.cache/goose/` |
| Config directory | `~/Library/Application Support/goose/` | `~/AppData/Roaming/Block/goose/` | `~/.config/goose/` | `~/.config/goose/` |
| Computer control display check | Always available | Always available | Checks `has_display` | Headless only |
| Display-dependent instructions | Full Peekaboo docs | PowerShell docs | Full docs / headless | Headless only |

#### macOS-Specific ComputerController

On macOS, the `computer_control` tool accepts Peekaboo subcommand strings:

**Core workflow:** `see --annotate` → `click --on B3` → `type "text" --return`

Supported Peekaboo commands (documented in instructions):
- **Vision:** `see`, `image`, `capture`
- **Interaction:** `click`, `type`, `press`, `hotkey`, `paste`, `scroll`, `drag`, `swipe`, `move`
- **Apps & Windows:** `app`, `window`, `list`, `space`
- **Menus & System:** `menu`, `menubar`, `dock`, `dialog`, `clipboard`, `open`, `permissions`

The server auto-adds `--json` for list commands and handles screenshot capture/encoding.

#### Non-macOS ComputerController

On Windows/Linux, the tool accepts raw scripts:

```yaml
computer_control:
  script: "xdotool click 1"  # Linux
  save_output: false
```

```yaml
computer_control:
  script: "Get-Process | Select-Object -First 5"  # Windows
  save_output: true
```

The `system_automation` trait (`platform::{create_system_automation, SystemAutomation}`) abstracts platform-specific execution, though its definition wasn't present in the audited files.

#### Display Detection

```rust
let has_display = system_automation.has_display();
let mut tool_router = Self::tool_router();
if !has_display {
    tool_router.remove_route("computer_control");
}
```

On headless Linux systems, the `computer_control` tool is removed from the router entirely.

---

## Summary of Key Architecture Decisions

1. **Separate MCP crate**: `goose-mcp` is a standalone crate providing MCP servers over stdio, keeping the CLI and server logic decoupled.

2. **Builtin extension macro**: The `builtin!` macro generates consistent spawn functions for all MCP servers, reducing boilerplate.

3. **Login shell PATH resolution**: Desktop app launches get a minimal PATH; `subprocess.rs` solves this by spawning a login shell to recover the user's full PATH.

4. **Peekaboo auto-install**: On macOS, the computer controller attempts to auto-install `peekaboo` via Homebrew, making GUI automation seamless.

5. **Template-inlined visualizations**: The autovisualiser embeds all JS libraries (Chart.js, D3, Leaflet, Mermaid) at compile time, producing self-contained HTML that works offline.

6. **Session management through SessionManager**: The CLI delegates all session persistence to `SessionManager::instance()`, which handles listing, creating, deleting, importing, and forking sessions.

7. **Plan mode with separate reasoner**: Planning uses a potentially different model/provider (configured via `GOOSE_PLANNER_PROVIDER`/`GOOSE_PLANNER_MODEL`) to generate plans before the main model executes them.

8. **Output format flexibility**: The session supports three output modes: `text` (interactive with progress bars), `json` (single JSON blob at end), and `stream-json` (streaming JSON events).

9. **Tool confirmation safety**: In non-interactive mode with `Approve` or `SmartApprove` goose modes, tool confirmations are hard-errors rather than auto-allowed, preventing accidental headless bypass of safety checks.

---

*End of Audit Report*
