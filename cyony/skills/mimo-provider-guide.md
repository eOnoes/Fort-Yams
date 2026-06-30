# MiMo Token Plan — Provider Reference

> Hard-won knowledge from actually using it. Everything the docs don't tell you.
> Last updated: 2026-06-18 — Full multi-endpoint, multi-model, multi-capability test.

## Overview

- **Type:** Token Plan (flat $169/yr subscription)
- **Key prefix:** `tp-`
- **Status:** ⚠️ **TTS-only value.** Text works but limited. Vision completely dead.

## The Real Endpoints

| Endpoint | Works For | Auth | Key Type |
|----------|-----------|------|----------|
| `api.xiaomimimo.com/v1` | ❌ **Nothing** — 401 Invalid API Key | Bearer | TP keys rejected |
| `token-plan-sgp.xiaomimimo.com/v1` | ✅ Text, TTS | Bearer | TP keys accepted |
| `token-plan-sgp.xiaomimimo.com/v1` | ❌ **Vision** — "No endpoints found that support image input" | Bearer | TP keys accepted but endpoint can't do vision |

**The `tp-` key is endpoint-scoped.** It works on the SGP endpoint but NOT the main API endpoint. This is NOT documented anywhere. The docs say to use `api.xiaomimimo.com` — that is wrong for Token Plan subscribers.

## Auth

```
Authorization: Bearer tp-<rest_of_key>
```

Standard Bearer format. The earlier `api-key` header note was wrong — Bearer works fine on SGP.

## Available Models (SGP Endpoint, Token Plan)

| Model | Text | Vision | TTS | Notes |
|-------|------|--------|-----|-------|
| `mimo-v2.5-pro` | ✅ | ❌ | ❌ | Only text model that works. Disable thinking or it eats output budget. |
| `mimo-v2.5-tts` | ❌ | ❌ | ✅ | Chloe voice. Works consistently (~2.3s, 150KB+ WAV). |
| `mimo-v2-flash` | ❌ | ❌ | ❌ | "Not supported model" on SGP endpoint |
| `mimo-v2.5-flash` | ❌ | ❌ | ❌ | "Param Incorrect" on SGP endpoint |

**No flash model exists on the Token Plan.** Only the pro model works for text. This makes it unsuitable for rapid-fire agent work.

## THE Critical Fix: Disable Thinking

Pro models default to **uncontrollable reasoning** — they eat your entire output budget on chain-of-thought you never see. Even for trivial requests ("say hello") they burn thinking tokens.

**MUST include in EVERY request:**
```json
{
  "thinking": {"type": "disabled"}
}
```

Without this, `mimo-v2.5-pro` wastes output tokens on invisible reasoning. With it disabled, the model behaves like a normal chat model. Test confirmed: with thinking disabled, "write palindrome function" returned correct code in 50 output tokens, 0 reasoning tokens. Without, even "print hello world" burned 11 thinking tokens.

## Capability Scorecard (Actual Tests, 2026-06-18)

### Text/Coding — ⚠️ Works But Limited
- ✅ `mimo-v2.5-pro` on SGP endpoint generates valid code
- ✅ With thinking disabled, produces clean output (no reasoning waste)
- ❌ Only ONE model available on Token Plan (no flash, no fast options)
- ❌ Cannot do rapid-fire agent calls (pro model is too heavy)
- ❌ No streaming tested but pro model suggests slow response

**Real test result:**
```
Prompt: "Write a Python function that checks if a string is a palindrome,
         ignoring spaces and case. Include a test case."
Output: Valid Python with test case. 48 input tokens, 50 output tokens.
        0 reasoning tokens (thinking disabled).
```

### TTS — ✅ Reliable
- ✅ 3/3 consecutive tests returned valid audio
- ✅ Consistent ~2.3 second response time
- ✅ 150KB+ WAV output per request
- ✅ Chloe voice works with `mimo-v2.5-tts` model
- ✅ Works with `token-plan-sgp.xiaomimimo.com/v1` endpoint
- ✅ Same API key as text (Bearer auth)

**Real test result:**
```
3 tests, all HTTP 200, all returned audio.
Fastest: 2.2s, Slowest: 2.3s
Audio size: 153-164 KB per request
```

### Vision — ❌ COMPLETELY DEAD
- ❌ `api.xiaomimimo.com/v1` → 401 Invalid API Key
- ❌ `token-plan-sgp.xiaomimimo.com/v1` → 404 "No endpoints found"
- ❌ Tried both `mimo-v2-flash` and `mimo-v2.5-pro` on both endpoints
- ❌ **Zero vision capability with this key/endpoint setup**

**This is the single biggest failure.** The $169/yr was chosen for "visual, audio, coding" and visual is entirely unreachable. There is no workaround — the SGP endpoint simply does not support image input regardless of model.

## Function Calling

Not tested this session. Previous testing suggested standard OpenAI format works.

## Recommended Architecture

Given the actual capabilities:

```
┌─────────────────────────────────────────────────────────┐
│                    Your App/Agent                        │
├─────────────────────────────────────────────────────────┤
│                                                         │
│  Text/Coding ──► xAI Grok                 (reliable)    │
│  Vision       ──► Ollama Gemini 3 Flash    (free)       │
│  TTS (Chloe)  ──► MiMo mimo-v2.5-tts      ($169/yr)    │
│                                                         │
└─────────────────────────────────────────────────────────┘
```

MiMo retains exactly one job: **TTS voice** for Chloe. Everything else should route elsewhere.

## Contract Traps (Re-verified)

| Trap | Reality |
|------|---------|
| Auto-renew opt-out | On by default — must manually disable |
| No refunds | Confirmed non-refundable |
| Endpoint docs | Wrong — told us `api.xiaomimimo.com` when SGP is correct |
| Price changes | Can change with notice |
| Flash models available | ❌ NOT on Token Plan despite docs implying otherwise |

## What We Should Have Tested Before Buying (Updated)

The original `provider-vetting-checklist.md` was missing one critical test: **test ALL three advertised capabilities (text, vision, audio) independently on the actual endpoints with the actual key type before buying.** MiMo looked like a full stack on paper. In reality:

1. Vision required the main API endpoint which rejects Token Plan keys entirely
2. Flash models (needed for agent work) weren't available on Token Plan at all
3. Only the pro model worked — which needs thinking disabled or it's unusable
4. Text generation was functional but overkill for what we actually needed it for

The checklist now includes this as Phase 3: "Verify every advertised modality works with YOUR key type on YOUR endpoint."
