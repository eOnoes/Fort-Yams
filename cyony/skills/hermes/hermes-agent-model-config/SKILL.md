---
name: hermes-agent-model-config
description: Procedures for selecting and configuring models in Hermes Agent for agentic-style work.
version: 1.0.0
author: Hermes Agent
---

# Hermes Agent Model Configuration and Selection

## Overview
This skill documents how to choose and set the appropriate model for Hermes Agent based on task requirements, especially for agentic workflows involving tool use, delegation, and multi-step reasoning.

## When to Use
- You need to change the default model for better agentic performance.
- You want to configure fallback models for resilience.
- You are optimizing for tool usage, long-context reasoning, or code generation.

## Model Selection Guidelines

### Agentic Workflow Preferences
For tasks involving:
- Tool chaining (web, terminal, file operations)
- Delegation/subagent spawning
- Complex reasoning loops
- Code generation and editing

**Preferred models** (in order of suitability):
1. `qwen/qwen3.7-max` – Strong tool use, 32K context, excellent for agentic loops (OpenRouter).
2. `qwen3.5:397b:cloud` – Ollama Cloud, S-Tier coding, deep code understanding.
3. `minimax-m3:cloud` – Ollama Cloud, A-Tier daily driver, balanced cost/quality.
4. `moonshotai/kimi-k2.6` – Very long context, useful for large file analysis (OpenRouter).

### DeepSeek Models — Direct API ONLY

**HARD RULE:** DeepSeek models (`deepseek-chat`, `deepseek-reasoner`, `deepseek-v4-flash`, `deepseek-v4-pro`) must ALWAYS use the **direct DeepSeek API** — NEVER OpenRouter and NEVER Ollama Cloud.

- **Direct API endpoint:** `https://api.deepseek.com`
- **API key env var:** `DEEPSEEK_API_KEY`
- **Provider type:** OpenAI-compatible (use standard OpenAI adapter, base URL points to deepseek.com)
- **Do not** add DeepSeek to `OPENROUTER_ALLOWED_MODELS`
- **Do not** register DeepSeek with Ollama Cloud
- **Do not** route DeepSeek through any proxy — always direct

This rule was set by Eddie (2026-06-02) to prevent provider routing confusion. If you find yourself about to call DeepSeek through OpenRouter or Ollama, STOP — switch to the direct API.

## Provider Exhaustion Recovery

When the agent goes dark because a provider ran out of credits or hit rate limits:

**Golden rule:** Never route all models through one provider. Diversify so exhaustion of one doesn't kill every path.

**Immediate recovery:** Pick a fallback model from a DIFFERENT provider, switch config, restart container.

Full routing table and recovery procedure → **`references/provider-recovery.md`**

Common causes:
- OpenRouter API dry → fallback to Ollama Cloud or DeepSeek direct
- DeepSeek quota exceeded → fallback to Ollama Cloud
- Ollama Cloud down → fallback to DeepSeek direct

**Prevention:** Keep at least one backup provider configured and tested. DeepSeek models should NEVER be routed through OpenRouter — they have their own direct API that stays independent.

### Configuration Steps
1. Open `/opt/data/config.yaml`.
2. Under the `model:` section, set `default:` to your chosen model ID.
3. Optionally, configure fallback providers in `fallback_providers:` if desired.
4. Save the file.
5. Restart the Hermes Agent container to apply changes:
   ```bash
   docker restart hermes-agent-8eep-hermes-agent-1
   ```
   (Adjust container name as needed.)
6. Verify the change by checking the agent's response or logs.

## Pitfalls
- **Do not set `default:` to a model not in Tripp's approved list** without explicit approval.
- **Changing models mid-session** requires a restart; hot-swapping is not supported.
- **Some models may have different tool-calling formats**; ensure the agent's tool use enforcement is set to `auto` (default).
- **Context window size varies**; verify that your chosen model supports the needed context length for your task.

## Adding a New OpenAI-Compatible Provider

Pattern for adding any OpenAI-compatible API provider (MiMo, local vLLM, Ollama Cloud, etc.):

### 1. Save the API key
```bash
echo "sk-xxxxxxxxxxxxxxxx" > /opt/data/.provider-key
chmod 600 /opt/data/.provider-key
```

### 2. Add to environment
Add to `/opt/data/.env`:
```bash
PROVIDER_API_KEY=sk-xxxxxxxxxxxxxxxx
```

### 3. Register in config.yaml
Add under the providers section in `/opt/data/config.yaml` (same indentation as existing providers):
```yaml
  provider-name:
    name: Provider Display Name
    base_url: https://api.provider.com/v1
    key_env: PROVIDER_API_KEY
    models:
      model-variant:
        id: provider/model-variant
        name: Model Display Name
        context: 1000000
        tool_call: true
```

### 4. Thinking mode configuration
For models that support reasoning/thinking tokens (MiMo, DeepSeek, Qwen), create TWO model entries:
- **Non-thinking variant**: Fast, for agentic tool use. Omit thinking params or set `thinking: { type: "disabled" }`.
- **Thinking variant**: For complex reasoning. Model autonomously uses thinking tokens.

Thinking models consume output tokens for reasoning BEFORE producing visible content. With low `max_tokens`, all tokens get eaten by reasoning and the response is empty — always budget extra tokens for thinking-enabled calls.

### 5. Layered migration pattern
When adding a new provider as a potential daily driver:
1. Add the provider WITHOUT changing the default model
2. Test TTS/vision/tool-calling one at a time
3. Only promote to default after all capabilities verified
4. Keep the previous default as fallback — never remove it

## Provider Evaluation Checklist (from MiMo lessons learned)

When evaluating a new provider, run through these gates before promoting to daily driver:

1. **Doc accuracy test** — Verify the documented endpoint and auth format against real API behavior. Run a test curl with the exact key format they specify. If the docs are wrong about basics, expect more problems.
2. **Thinking/reasoning control** — Can you disable reasoning tokens? Test both `thinking: {"type": "disabled"}` and the default (no thinking param). For agentic work, reasoning-token bleed is a budget killer.
3. **Agentic soak test** — Make 20 rapid sequential completions with tool call schemas. Check for: rate limit errors, latency degradation, dropped tool calls, malformed JSON args. Batch tests hide these.
4. **Function calling depth** — Test with nested object schemas, optional params, and array returns. Some providers pass simple tool calls but fail on complex schemas.
5. **Vision: base64 vs URL** — Test both. Many providers (especially Chinese-based) can't fetch external URLs due to network restrictions. If vision matters, require base64 support.
6. **Fallback must stay wired** — Never remove the old default until the new provider has passed ALL capability gates. A half-tested provider is worse than none.
7. **Cost-per-useful-task** — Flat-rate subs can look cheap but cost more if the model underperforms. Test actual throughput for your use pattern before committing.
8. **Health check behavior** — Some providers return 401 on `/v1/models` even with valid keys (MiMo does this). Don't treat health-check failure as auth failure unless confirmed.

### MiMo-Specific Configuration

**⚠️ Critical: Two separate systems, two separate endpoints, two separate key formats.**

| System | Key Format | Endpoint | Health Check |
|--------|-----------|----------|:---:|
| Pay-as-you-go | `sk-xxxxx` | `https://api.xiaomimimo.com/v1` | `/v1/models` returns 401 even with valid keys — by design |
| Token Plan (subscription) | `tp-xxxxx` | `https://token-plan-sgp.xiaomimimo.com/v1` | Same — health check always fails |

Provider name: `xiaomi` (aliases: `mimo`, `xiaomi-mimo`). Env var: `XIAOMI_API_KEY`.

**Thinking control is MANDATORY.** Pro models default to thinking ON, which consumes ALL output tokens on reasoning and produces empty responses. Always send for agent work:
```json
"thinking": {"type": "disabled"}
```

**Vision model ranking (from Eddie, 2026-06-16):** `mimo-v2.5` and `mimo-v2-omni` are the purpose-built vision models for multimodal agent workflows. They handle images, video, and text natively. The non-Pro variants don't waste output on uncontrollable thinking — use those for vision tasks.

**Token Plan model availability (tested 2026-06-18):**
- ✅ `mimo-v2.5-pro` — 1M ctx, function calling, thinking controllable
- ✅ `mimo-v2-pro` — 1M ctx, function calling, thinking controllable
- ✅ `mimo-v2.5` (omni) — 1M ctx, vision, thinking controllable
  - ⚠️ `mimo-v2.5-omni` was rejected with "Not supported model" on Token Plan. Use `mimo-v2.5` (without -omni suffix) or `mimo-v2-omni` for vision.
- ✅ `mimo-v2-omni` — 256K ctx, vision
- ❌ `mimo-v2-flash` — **NOT on Token Plan** (PAYG only)
- ✅ TTS/ASR models — free with sub

**Function calling:** Verified working with thinking disabled. Clean tool_calls output.
**Vision:** Verified working with base64 inline images AND URLs (URL fetch works from Token Plan SG endpoint). Model can fetch external URLs if the server can reach them.

**⚠️ PITFALL: Vision 401 — TWO bugs, not one.**
1. **Auth header format**: MiMo requires `api-key` header, not `Authorization: Bearer`. Six code paths in `auxiliary_client.py` need patching. The critical one for vision is the "named custom provider" path (~L3088).
2. **Env var name mismatch**: `PROVIDER_REGISTRY` in `hermes_cli/auth.py` looked for `XIAOMI_API_KEY` but `.env` had `MIMO_API_KEY`. When auxiliary config has `api_key: ''` (empty → `None`), the code falls through to registry lookup, which fails silently. Fix: add `"MIMO_API_KEY"` to `api_key_env_vars` tuple.

Full debugging walkthrough, all 6 code paths, and verification commands → **`references/mimo-auth-header-fix.md`**

```yaml
model:
  key_env: MIMO_API_KEY        # ← main chat reads from env
auxiliary:
  vision:
    provider: xiaomi            # ← routes through named custom provider path
    model: mimo-v2-omni
    # base_url: *** DO NOT SET *** — forces "custom" path that breaks auth
    timeout: 120
    # api_key NOT needed — reads from providers.xiaomi.key_env automatically
```

The false "vision is completely dead on Token Plan" evaluation (2026-06-18) was caused by THREE叠加 bugs, not by the API itself:
1. Wrong auth header format (`Authorization: Bearer` vs `api-key`)
2. Env var name mismatch (`XIAOMI_API_KEY` in registry vs `MIMO_API_KEY` in `.env`)
3. Config `base_url` bypassing provider resolution + wrong default URL

Vision confirmed working 2026-06-19 with base64 images via `mimo-v2.5` and `mimo-v2-omni`.

**⚠️ PITFALL: Don't set `base_url` in auxiliary config for built-in providers.** Setting it forces the "custom" code path which doesn't resolve provider-specific env vars or auth patterns. Only set `base_url` for truly custom endpoints not in the provider registry.

**⚠️ PITFALL: Registry env var names may differ from `.env` var names.** The xiaomi registry uses `XIAOMI_BASE_URL` for the base URL override, but `.env` had `MIMO_BASE_URL`. Always check `pconfig.base_url_env_var` in `auth.py` for the exact name. Also, `os.getenv()` doesn't read `.env` files — use `get_env_value()` from `hermes_cli.config`.

**Token Plan model availability — corrected (2026-06-19):**
- ✅ `mimo-v2.5` base — 1x credits, vision, tool calling. **Best daily driver.**
- ✅ `mimo-v2.5-pro` — 2x credits, thinking, NO vision. Heavy lifting only.
- ✅ `mimo-v2-omni` — 256K ctx, vision. Older but works.
- ✅ `mimo-v2-pro` — 1M ctx, thinking. Older pro model.
- ✅ TTS models: `mimo-v2.5-tts`, `mimo-v2.5-tts-voiceclone`, `mimo-v2.5-tts-voicedesign` — free with sub
- ✅ ASR: `mimo-v2.5-asr` — speech recognition
- ❌ `mimo-v2-flash` — NOT on Token Plan (PAYG only)

**Token Plan cost rule (from Eddie, 2026-06-19):** `mimo-v2.5-pro` burns 2x tokens. Use regular `mimo-v2.5` for everything unless you genuinely need the extra reasoning. Default daily driver should be `mimo-v2.5`, not `mimo-v2.5-pro`. Vision works on both `mimo-v2.5` and `mimo-v2-omni` — prefer `mimo-v2.5` (newer, 1x cost).

### MiMo Model Deprecation Schedule (June 2026)

**⚠️ CRITICAL: Legacy models going offline June 30, 2026 (Beijing time).** System replacements already active — requests to old model names are auto-redirected to replacements NOW.

| Deprecated Model | Offline Date | System Replacement | Notes |
|-----------------|-------------|-------------------|-------|
| `mimo-v2-pro` | 2026-06-30 | `mimo-v2.5-pro` | API params fully adapted |
| `mimo-v2-omni` | 2026-06-30 | `mimo-v2.5` | API params fully adapted |
| `mimo-v2-flash` | 2026-06-30 | `mimo-v2.5` | Auto-redirected since 6/18. Default params changed (see below) |
| `mimo-v2-tts` | 2026-06-30 | `mimo-v2.5-tts` | Auto-redirected since 6/27. Voice remapping: `mimo_default` → `冰糖` (CN) / `mia` (other) |

**`mimo-v2-flash` → `mimo-v2.5` parameter changes (since 6/18):**
- `mimo-v2.5` does NOT support custom `temperature`/`top_p` in thinking mode — forced to `temperature: 1.0`, `top_p: 0.95`
- If you were setting custom params on `mimo-v2-flash`, they're inherited during auto-redirect
- If `thinking`, `temperature`, or `max_completion_tokens` not specified, system uses `mimo-v2.5` defaults

**Action required:** Config already set to `mimo-v2.5` (updated 2026-06-25). No code changes needed — all old model name requests auto-redirect. But update any hardcoded model names in scripts/code to avoid surprises when offline date hits.

### API Key Rotation Pattern (June 2026)

When rotating MiMo API keys:
1. Purchase new key (Token Plan subscription, `tp-xxxxx` format)
2. Update `/opt/data/.env` — change `MIMO_API_KEY=<new_key>` (use Python `re.sub` or `sed`; direct echo/heredoc gets masked by terminal security)
3. Verify: `python3 -c "with open('/opt/data/.env') as f: [print(f'Length: {len(line.strip().split(\"=\",1)[1])}') for line in f if 'MIMO_API_KEY' in line]"`
4. Old key → hand to crew agents (Tripp/Echo) for their independent use
5. Gateway auto-reads env on next request — no restart needed for key rotation (only model default changes need restart)

**⚠️ Gateway restart required after patching Hermes source files.** Python doesn't hot-reload. The gateway catches SIGTERM gracefully — use `pkill -9` from host. Agent cannot self-terminate (safety check blocks it). If you patch `auxiliary_client.py` or `auth.py`, the running gateway keeps the OLD code in memory until hard restart.

Full details, benchmarks, and provider evaluation checklist in `references/mimo-vs-deepseek-comparison.md`.

**Shareable setup guide:** `references/mimo-setup-guide-for-echo.md` — A ready-to-share copy-paste guide covering basic auth, vision, TTS, ASR, function calling, all 8 gotchas, and a verification checklist. Designed to be shared with crew members (Echo for example) without the agent plumbing context of the skill itself.

## Verification
After restart, you can confirm the model is active by:
- Asking the agent to report its model (if exposed via a skill).
- Checking the logs for model initialization messages.
- Observing improved performance on agentic tasks.

## Related Skills
- `hermes-agent` – General Hermes Agent configuration and troubleshooting.
- `model-switching` – For dynamic model selection per task (if implemented).

## References
- See `references/model-comparison.md` for detailed benchmark notes.
- See `templates/config-model.yaml` for a starter configuration snippet.
