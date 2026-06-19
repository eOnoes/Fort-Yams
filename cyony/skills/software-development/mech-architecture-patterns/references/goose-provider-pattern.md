# Goose Provider Pattern — Subscription Model Integration

## The Provider Trait

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

**Key methods:**
- `stream()` — main inference, returns streaming response
- `complete()` — non-streaming completion
- `complete_fast()` — **cheap model for context compaction summarization** (Stage 2 of 5-stage compaction)
- `configure_oauth()` — handles OAuth flow
- `refresh_credentials()` — token refresh/rotation

## Four Auth Patterns

### 1. API Key
- Bearer token in HTTP header
- Used by: Anthropic, OpenAI, Azure, Groq
- Storage: System keychain via `keyring` crate

### 2. OAuth 2.0 Auth Code
- Browser flow → local HTTP callback → token exchange
- Used by: Google Gemini OAuth, xAI SuperGrok, GitHub Copilot
- Storage: System keychain (encrypted) + auto-refresh

### 3. OAuth Device Code (RFC 8628)
- Polling loop after user enters code on device
- Used by: Azure device code, Enterprise SSO
- Storage: System keychain + auto-refresh

### 4. ACP Delegation
- Wrap existing CLI tool's auth
- Used by: Claude Code, Codex, Amp, Pi, Cursor
- **Agent never sees credentials** — spawns CLI as subprocess, speaks ACP over stdio
- Storage: Delegated to wrapped CLI

## ProviderDef Metadata

```rust
pub struct ProviderMetadata {
    pub name: &'static str,              // "anthropic"
    pub display_name: &'static str,      // "Anthropic"
    pub description: &'static str,
    pub default_model: &'static str,     // "claude-sonnet-4-20250514"
    pub known_models: Vec<ModelInfo>,    // All supported models with context limits
    pub model_doc_link: &'static str,
    pub config_keys: Vec<ConfigKey>,     // Auth requirements
    pub setup_steps: Vec<SetupStep>,     // Human-friendly setup guide
}

pub struct ModelInfo {
    name: String,
    context_limit: usize,
    tool_calling: bool,
    cost_input: f64,      // per 1M tokens
    cost_output: f64,     // per 1M tokens
}

pub struct ConfigKey {
    key: String,          // env var name
    required: bool,
    secret: bool,
    oauth_flow: bool,
}

pub enum SetupStep {
    Text(&'static str),   // "Get your API key from https://..."
    SetEnv(&'static str, &'static str),  // (var_name, description)
    OAuthFlow,
}
```

## Registration Pattern

```rust
// In crates/goose/src/providers/mod.rs
register_provider!("my-subscription", MyProvider);
```

## Implementation Template

```rust
pub struct MySubscriptionProvider {
    client: reqwest::Client,
    config: ProviderConfig,
    credentials: Arc<Mutex<Credentials>>,
}

#[async_trait]
impl Provider for MySubscriptionProvider {
    fn get_name(&self) -> &str { "my-subscription" }
    
    async fn stream(&self, model_config: &ModelConfig, 
                    session_id: &str, system: &str, 
                    messages: &[Message], tools: &[Tool]) 
                    -> Result<MessageStream, ProviderError> {
        // 1. Convert to your API's request format
        // 2. Stream SSE from your API
        // 3. Convert SSE chunks to MessageStream
    }
    
    async fn complete_fast(&self, model_config: &ModelConfig,
                           system: &str, messages: &[Message])
                           -> Result<(Message, ProviderUsage), ProviderError> {
        // Use cheap model variant for context compaction
        // This is called during Stage 2 of 5-stage compaction
    }
    
    async fn configure_oauth(&self) -> Result<(), ProviderError> {
        // OAuth flow or API key prompt
    }
    
    async fn refresh_credentials(&self) -> Result<(), ProviderError> {
        // Token refresh logic
    }
}

impl ProviderDef for MySubscriptionProvider {
    fn metadata() -> ProviderMetadata {
        ProviderMetadata {
            name: "my-subscription",
            display_name: "My Subscription Service",
            description: "Enterprise AI via subscription",
            default_model: "my-model-v1",
            known_models: vec![
                ModelInfo { 
                    name: "my-model-v1", 
                    context_limit: 200000, 
                    tool_calling: true, 
                    cost_input: 3.0, 
                    cost_output: 15.0 
                }
            ],
            model_doc_link: "https://docs.myservice.ai/models",
            config_keys: vec![
                ConfigKey { 
                    key: "MYSUBSCRIPTION_API_KEY", 
                    required: true, 
                    secret: true, 
                    oauth_flow: false 
                }
            ],
            setup_steps: vec![
                SetupStep::Text("Get your API key from https://myservice.ai/keys"),
                SetupStep::SetEnv("MYSUBSCRIPTION_API_KEY", "your-key-here"),
            ],
        }
    }
}
```

## For Tripp.Reason (Go Implementation)

Equivalent in Go would be:

```go
type Provider interface {
    Name() string
    Stream(ctx context.Context, modelConfig ModelConfig, sessionID string,
           system string, messages []Message, tools []Tool) (<-chan MessageChunk, error)
    Complete(ctx context.Context, ...) (Message, ProviderUsage, error)
    CompleteFast(ctx context.Context, ...) (Message, ProviderUsage, error)
    ModelConfig() ModelConfig
    ConfigureOAuth(ctx context.Context) error
    RefreshCredentials(ctx context.Context) error
}
```

Use `zalando/go-keyring` for OS keychain integration.

## Key Insight: complete_fast()

The `complete_fast()` method is critical for long sessions. It uses a **cheap model** (DeepSeek, Haiku) to summarize old conversation turns during context compaction. This keeps the primary model's context window focused on recent work while preserving historical context in compressed form.

**When to use:**
- Stage 2 of 5-stage context compaction
- Summarizing old tool call/result pairs
- Compressing multi-turn sub-conversations
- Any non-critical summarization that doesn't need the primary model's reasoning

**Cost optimization:** Use 10-100× cheaper model for summarization. For a $15/M-token primary model, use a $0.15/M-token summarizer.