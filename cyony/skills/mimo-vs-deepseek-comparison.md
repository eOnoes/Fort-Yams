# MiMo V2.5 Pro vs DeepSeek V4 — Full Comparison + Token Plan Salvage Report

> Initial: 2025-06-16 | Updated: 2026-06-18 | Source: Official docs + direct API testing

---

## Updated Verdict (2026-06-18)

MiMo was initially marked "TRASH" due to two confusions that got resolved:

1. **Wrong endpoint × wrong key**. Token Plan (`tp-xxxxx` keys) uses `token-plan-{region}.xiaomimimo.com/v1`, NOT `api.xiaomimimo.com/v1` (which is for PAYG `sk-xxxxx` keys). Using the wrong combo gives 401s and "Invalid API Key" errors.
2. **Default thinking enabled**. Pro models ship with thinking ON by default, which eats the entire output budget on reasoning tokens and leaves nothing for the actual response. The fix: `thinking: {"type": "disabled"}` for agent/chat work.

With both fixed, MiMo is **salvageable** — not top-tier, but functional for specific niches.

---

## Token Plan Verified Model Inventory (tested 2026-06-18)

| Model | Token Plan? | Thinking Ctrl? | Function Calls? | Vision? | Notes |
|-------|:---:|:---:|:---:|:---:|-------|
| `mimo-v2.5-pro` | ✅ | ✅ `disabled` works | ✅ | N/A (text) | 1M ctx, 128K out. Primary sub model. |
| `mimo-v2-pro` | ✅ | ✅ `disabled` works | ✅ | N/A (text) | 1M ctx, 128K out. Older gen. |
| `mimo-v2.5` (omni) | ✅ | ✅ `disabled` works | ✅ | ✅ (9 img tokens) | 1M ctx, vision/audio/video |
| `mimo-v2-omni` | ✅ | ✅ `disabled` works | — | ✅ | 256K ctx, omni |
| `mimo-v2-flash` | ❌ | N/A | N/A | N/A | **PAYG only.** Not on Token Plan. |
| `mimo-v2.5-tts` | ✅ | N/A | N/A | N/A | Free with sub. Voice synthesis. |
| `mimo-v2.5-asr` | ✅ | N/A | N/A | N/A | Free with sub. Speech-to-text. |

**Rate limits for all Token Plan models:** 100 RPM / 10M TPM.

**Key constraint:** `mimo-v2-flash` (the lightweight non-thinking model) is **not available** on the Token Plan subscription. Token Plan only includes the pro/omni series. Flash requires PAYG.

---

## The Thinking Problem (and Fix)

### The Bug
MiMo pro models default to thinking/reasoning mode. With thinking enabled:
- Every completion spends output tokens on `reasoning_content` BEFORE producing visible content
- With `max_completion_tokens: 50`, all 50 tokens go to reasoning → empty response
- This is what made MiMo feel "trash" for agent work

### The Fix
```json
"thinking": {"type": "disabled"}
```
Add this to every chat completion request when using MiMo for agentic/tool-use work. Tested and verified: 0 reasoning tokens, clean output.

Enable thinking only for tasks needing deep chain-of-thought reasoning:
```json
"thinking": {"type": "enabled"}
```

### Vision Note
Mimo-v2.5 (omni model) also defaults to thinking on. Send `thinking: {"type": "disabled"}` for vision tasks too or it'll describe the image in reasoning tokens instead of visible output.

---

## Function Calling (Tool Use) — Verified ✅

Tested with `mimo-v2.5-pro` and `thinking: {"type": "disabled"}`:
- Correctly parsed tool schema
- Returned `tool_calls` with proper `id`, `function.name`, and `function.arguments`
- Finish reason: `tool_calls`
- 0 reasoning tokens consumed

---

## Vision — Verified ✅

Tested with `mimo-v2.5` (omni) and `thinking: {"type": "disabled"}`:
- Accepted `data:image/png;base64,...` images
- Correctly described image content
- Image tokens: ~9 per image
- Model cannot fetch external URLs (fails with `failed to download url data`) — use base64 inline only
- 0 reasoning tokens when thinking disabled

---

## Hermes Integration

- **Provider name:** `xiaomi` (aliases: `mimo`, `xiaomi-mimo`)
- **PAYG endpoint:** `https://api.xiaomimimo.com/v1` (uses `sk-xxxxx` keys)
- **Token Plan endpoint:** `https://token-plan-sgp.xiaomimimo.com/v1` (uses `tp-xxxxx` keys)
- **Key env var:** `XIAOMI_API_KEY` in `~/.hermes/.env`
- **Health check:** `supports_health_check=False` — `/v1/models` returns 401 even with valid keys. This is by design, not a bug.
- **Thinking control:** Always pass `thinking: {"type": "disabled"}` for agent work
- **Model ID in Hermes:** `xiaomi/mimo-v2.5-pro`

### Config snippet for config.yaml
```yaml
  mimo-token-plan:
    name: Xiaomi MiMo (Token Plan)
    base_url: https://token-plan-sgp.xiaomimimo.com/v1
    key_env: XIAOMI_API_KEY
    models:
      mimo-v2.5-pro:
        id: xiaomi/mimo-v2.5-pro
        name: MiMo V2.5 Pro
        context: 1000000
        tool_call: true
        thinking: disabled
```

---

## Lessons Learned — Provider Evaluation Checklist

From the MiMo experience, when evaluating any new provider in the future:

1. **Verify docs against real API before committing.** MiMo's docs mentioned `token-plan-sgp.xiaomimimo.com` but the Hermes plugin used `api.xiaomimimo.com` — two separate systems with different key formats. Always test the handshake.
2. **Check if thinking/reasoning is controllable.** Some models force reasoning tokens. If you can't disable it, agent budgets bleed.
3. **Soak-test rate limits with agent patterns.** Batch tests don't reveal per-request latency under sustained sequential calls. Run 20 rapid completions before committing.
4. **Test function calling early.** Some providers support it on paper but fail on complex schemas or nested objects.
5. **Keep fallback wired before switching primary.** Never remove the old default until the new one has passed all capability gates.
6. **Flat-rate subs need quality-adjusted eval.** $169/yr looked cheap but was actually expensive per useful task until we found the thinking fix.
7. **Vision with base64, not URL.** MiMo can't fetch external URLs for vision from its servers (likely network restrictions). If this matters, test with base64 inline.

---

## Pricing (updated)

| | MiMo Token Plan | MiMo PAYG | DeepSeek V4 Pro |
|---|---|---|---|
| Upfront | $168.96/yr | $0 | $0 |
| Input /1M tokens | Included (132B credits/yr) | $0.435 | $0.435 |
| Output /1M tokens | Included | $0.87 | $0.87 |
| TTS/ASR | Included | Separate pricing | N/A |

The Token Plan is cheapest if you use ≤132B tokens/year AND need the TTS/ASR features. Otherwise PAYG or DeepSeek direct may win per-token.

---

## Benchmark Comparison (from 2025 specs — may be stale)

| Benchmark | MiMo V2.5 Pro (42B active) | DeepSeek V4 Pro (49B active) | Winner |
|-----------|:---:|:---:|:---:|
| BBH (3-shot) | 88.4 | 87.5 | MiMo |
| MMLU-Pro | 68.5 | **73.5** | DeepSeek |
| GSM8K | **99.6** | 92.6 | MiMo |
| MATH | **86.2** | 64.5 | MiMo |

MiMo leads on math/STEM; DeepSeek leads on broad knowledge. Both are competitive.
