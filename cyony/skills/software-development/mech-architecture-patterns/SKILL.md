---
name: mech-architecture-patterns
description: "Tripp.Reason mech extension design patterns — distilled from Goose (Rust) + OpenClaw (TypeScript) deep-dive audit. Key protocols, compaction strategies, and warden enforcement."
tags: [mech, tripp-reason, acp, mcp, provider-abstraction, context-compaction, warden, goose, openclaw]
created: 2026-06-01
---

# Mech Architecture Patterns (Goose + OpenClaw)

## Trigger
When designing, extending, or debugging Tripp.Reason mech features, ACP/MCP integration, provider abstraction, context compaction, or warden boundary enforcement.

## Protocol Stack (Dual-Layer)

| Protocol | Direction | Transport | Purpose |
|----------|-----------|-----------|---------|
| **ACP** | Editor ↔ Agent | stdio/SSE/JS-RPC 2.0 | Drive the agent (session, prompts, cancellation) |
| **MCP** | Agent ↔ Tools | stdio/HTTP | Equip the agent (tool calls, results) |

Both coexist. ACP drives, MCP equips. **93+ ACP repos** in ecosystem: Zed, JetBrains, VS Code, Neovim, Emacs, Sublime. 15+ agent servers. 4 official SDKs (Python, TS, Go, Rust).

## Goose Provider Abstraction (Subscription Models)

The `Provider` trait is THE interface for plugging in LLM backends:

```rust
#[async_trait]
pub trait Provider: Send + Sync {
    fn get_name(&self) -> &str;
    async fn stream(&self, model_config, session_id, system, messages, tools) -> Result<MessageStream>;
    async fn complete(&self, ...) -> Result<(Message, ProviderUsage)>;
    async fn complete_fast(&self, ...) -> Result<(Message, ProviderUsage)>;  // CHEAP model for compaction
    fn get_model_config(&self) -> ModelConfig;
    async fn configure_oauth(&self) -> Result<()>;
    async fn refresh_credentials(&self) -> Result<()>;
}
```

### Four Auth Patterns:
1. **API Key** — Bearer token (Anthropic, OpenAI, Groq)
2. **OAuth Auth Code** — Browser flow → callback → token exchange (Google, xAI)
3. **OAuth Device Code** (RFC 8628) — Polling after user enters code (Azure, Enterprise SSO)
4. **ACP Delegation** — Wrap CLI tool's auth (Claude Code, Codex, Amp, Cursor) — agent NEVER sees credentials

### Registration:
```rust
impl ProviderDef for MyProvider {
    fn metadata() -> ProviderMetadata { name, display_name, known_models, config_keys, setup_steps }
}
register_provider!("my-provider", MyProvider);
```

## Context Compaction (Goose 5-Stage)

**CRITICAL: Compact EARLY with a cheap model, not LATE with an expensive one.** Trigger thresholds must be set much earlier than most frameworks default to:

| Usage % | Stage | Action |
|---------|-------|--------|
| 50% | Monitor | Start tracking, no action yet |
| **60%** | **Stage 2** | **Summarize old tool pairs with cheap model** (trigger compaction) |
| 65% | Stage 3 | Compress multi-turn sub-conversations |
| 75% | Stage 4 | Prune low-relevance messages |
| 85% | Stage 5 | Full archive with working-set extraction |
| 90%+ | 🚨 DANGER | Lock-up imminent — too late to compact gracefully |

### The Five Stages:
1. **Truncate** oversized tool outputs (>50K chars) → zero cost, just string manipulation
2. **Summarize** old tool pairs using `complete_fast()` (cheap model)
3. **Compress** multi-turn sub-conversations into single summary blocks
4. **Prune** low-relevance messages (greetings, acknowledgments, meta-chat)
5. **Full archive** with working-set extraction (emergency exit)

### The Golden Rule
**NEVER use your expensive reasoning model for compaction.** Use DeepSeek V4 Flash, Haiku, or any model under $0.10/M tokens. Goose calls this `complete_fast()`. This single pattern prevents context lockups.

Original preserved in archive table. Compacted version fed to LLM with metadata header pointing to archived file paths (not content).

### Case Study: Tripp Lockup
Tripp's OpenClaw context hit 90%+ and locked up hard. Root cause: no Stage 2 trigger at 60%, no cheap-model summarization, full trajectory history loaded on session restore instead of essentials. Fix: Goose doctrine + compaction trigger at 60% with DeepSeek Flash. Detailed protocol in `references/goose-compaction-doctrine.md`.

## OpenClaw Crestodian (Warden Boundary)

Five denial reasons when a tool call is blocked:
1. `"disabled"` — Tool execution globally disabled
2. `"sandbox-active"` — Agent in sandbox/restricted mode
3. `"not-yolo"` — Security posture requires explicit approval
4. `"not-owner"` — Sender not the configured owner
5. `"not-direct-message"` — In group/channel, not DM

Security postures: `"full"` (ask for everything) → `"yolo"` (auto-approve safe ops). Scoped per-agent.

### Sandbox Modes:
- `"off"` — No sandboxing
- `"non-main"` — Only non-main agents sandboxed
- `"all"` — All agents sandboxed

### External Approval:
`exec_approvals_config` table supports Unix socket for external approval servers (enterprise workflows).

## OpenClaw Audit Trail (3 Layers)

1. **command_log_entries** (SQLite) — Primary trail: every tool call, permission decision, security event
2. **Trajectory files** (`~/.openclaw/trajectory/{sessionId}/`) — Per-session runtime captures, secrets redacted
3. **diagnostic_events** (SQLite) — Security audits, runtime diagnostics, operational monitoring

Size limits: 32,768 chars/string, 64 items/array, with max file/event capture sizes.

## Native Hook Relay (OpenClaw)

Out-of-process hook execution via separate OS processes communicating over TCP:
- **Sandboxed**: hooks can't crash the gateway
- **Language-agnostic**: any language that speaks the relay protocol
- **Distributed**: hooks can run on remote machines

Hook categories: Lifecycle, Tool Execution, Message Flow, File System, Approval Gates, External.

## Goose Recipe System (Multi-Step Orchestration)

YAML-based declarative workflows:
- Variable substitution: `{{variable}}` from step outputs, env vars, user input
- Error handling: per-step `on_failure` (stop/continue/retry/ask)
- Conditional branching: `if/then/else` based on step outputs
- Looping: `foreach` with automatic parallelization
- Subagent spawning: `type: "subagent"` for parallel exploration
- Recipe composition: `import` other recipes as subroutines
- Recipe packs: collections distributed as `.recipepack` archives

## Session Persistence (Both Use SQLite)

### Goose:
- `sessions` table: id, name, provider, model, mode, metadata, token counts, cost, archived
- `messages` table: role (user/assistant/system/tool), content_json, token_count
- `permissions` table: tool_name, decision (allow/deny/ask), scope (once/always/session)
- WAL mode for concurrent reads

### OpenClaw:
- Global state DB + per-agent cache DBs
- `state_leases` for distributed locking (heartbeat + auto-expiry)
- `current_conversation_bindings` for conversation routing
- `subagent_runs` for subagent tracking

## For Tripp.Reason Design (Reasonix Fork: Go+Wails+React)

### Recommended Stack:
1. **Go backend** implements ACP using official Go SDK → editor integration
2. **React frontend** talks ACP to Go agent runtime
3. **Agent runtime** uses MCP for tool server communication
4. **Context compaction** borrowed from Goose's 5-stage model (use cheap model for Stage 2)
5. **Warden boundary** borrowed from OpenClaw's Crestodian (5 denial reasons + security postures)
6. **SQLite** for all state persistence (both Goose and OpenClaw use it)
7. **Per-agent isolation** via separate SQLite files (OpenClaw pattern)

### Subscription Backend Integration:
- Implement Provider trait equivalent in Go
- Support all 4 auth patterns (API Key, OAuth Auth Code, OAuth Device Code, ACP Delegation)
- Use `complete_fast()` pattern with cheap model (DeepSeek, Haiku) for compaction
- Store credentials in OS keychain (Go: `zalando/go-keyring` or similar)

## Pitfalls
- ACP Delegation pattern: agent NEVER sees credentials — spawns CLI as subprocess, speaks ACP over stdio
- Context compaction Stage 2 needs a CHEAP model call — don't use the primary model for summarization
- Warden denials must propagate the REASON, not just "blocked" — agents need context to retry/escalate
- Hook relay hooks running in separate processes need heartbeat/expiry to avoid zombie hooks
- SQLite WAL mode critical for concurrent access — without it, reads block writes

## Reference Files

- **`references/goose-compaction-doctrine.md`** — Full 5-stage progressive context compaction protocol from Goose (Rust agent framework). Trigger thresholds (60%/65%/75%/85%/90%+), cheap-model selection, implementation checklist, Tripp lockup case study. **READ THIS if any agent hits context limits.**

## Verification
- [ ] ACP spec validated: initialize → session/new → session/prompt → SSE streaming → session/close
- [ ] Provider trait implemented for at least one subscription backend
- [ ] Context compaction monitor ACTIVE at 50%, triggers at 60% (NOT 75-90%)
- [ ] Cheap model selected for Stage 2 (DeepSeek Flash / Haiku / anything < $0.10/M tokens)
- [ ] Compaction metadata headers emitted with archived file paths
- [ ] Crestodian denies with explicit reason (not silent block)
- [ ] Audit trail captures every tool call + permission decision
- [ ] Per-agent SQLite isolation confirmed (no cross-contamination)

## Reference Files

- **`references/goose-provider-pattern.md`** — Provider trait implementation details, 4 auth patterns, ProviderDef metadata, complete_fast() usage
- **`references/openclaw-crestodian-details.md`** — 5 denial reasons, security posture levels, sandbox modes, external approval via Unix socket, rescue system
