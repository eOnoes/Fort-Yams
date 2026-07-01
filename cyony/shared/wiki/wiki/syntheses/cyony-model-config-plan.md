# Cyony Model Config Plan v1

**Status:** Planning — no execution yet
**Last updated:** 2026-06-19

---

## The Problem

Cyony is burning through the MiMo Token Plan because:
1. **Default model** is `mimo-v2.5-pro` (2x credits)
2. **All 11 auxiliary tasks** default to "auto" → route through main model (2x credits for ALL of them)
3. **System prompt** includes schemas for every platform tool (Discord, Slack, Teams, etc.) even though we only use Telegram
4. **No token optimization** on code reading — full files loaded when jCodeMunch could grab only the function needed

---

## The Solution

### Step 1: Switch Default to `mimo-v2.5` Base

`mimo-v2.5` is the base model — 310B total / **15B active** params, **1x credits** instead of 2x.

Despite being smaller, it **still has**:
- ✅ Tool calling
- ✅ Reasoning toggle
- ✅ **Vision** (image, video, audio input) — Pro doesn't even have this
- ✅ 1M context window
- ✅ Open weights (MIT)

It's literally the perfect daily driver. Pro only comes out for heavy code.

### Step 2: Route Only Compression to DeepSeek Flash

Everything stays on MiMo v2.5 base EXCEPT compression:

| Task | Model | Why |
|------|-------|-----|
| compression | deepseek-v4-flash | Summarizing old context turns — doesn't need reasoning |
| vision | mimo-v2.5 | v2.5 base has native vision |
| web_extract | mimo-v2.5 | |
| session_search | mimo-v2.5 | |
| title_generation | mimo-v2.5 | |
| skills_hub | mimo-v2.5 | |
| approval | mimo-v2.5 | |
| mcp | mimo-v2.5 | |
| curator | mimo-v2.5 | |
| triage_specifier | mimo-v2.5 | |
| profile_describer | mimo-v2.5 | |
| flush_memories | mimo-v2.5 | |

DeepSeek gets **1 slot out of 12**.

### Step 3: Disable Unused Platform Toolsets

Cyony only uses Telegram. But Hermes injects schemas for Discord, Slack, Teams, Google Chat, WhatsApp, Signal, etc. into every system prompt. Every single turn. All on MiMo's dime.

Disabling them saves hundreds of invisible tokens per turn:

```yaml
disabled_toolsets:
  - hermes-discord
  - hermes-slack
  - hermes-teams
  - hermes-google_chat
  - hermes-yuanbao
  - hermes-qqbot
  - hermes-homeassistant
  - hermes-whatsapp
  - hermes-signal
```

### Step 4: Use jCodeMunch Suite

Already installed on Cyony. These cut code-reading tokens by **95%**:
- `jcodemunch` — finds exact function/class/constant instead of loading the whole file
- `jdocmunch` — indexes docs by section heading
- `jdatamunch` — structured data retrieval

On MiMo's plan, this means a code query goes from ~500 tokens → ~25 tokens.

### Step 5: Keep TTS Intact (No Change)

Cyony's TTS config stays as-is:

```
tts.provider: mimo
tts.mimo.model: mimo-v2.5-tts
tts.mimo.voice_id: chloe
```

Works with:
- **mimo-v2.5-tts** — standard TTS
- **mimo-v2.5-tts-voiceclone** — voice cloning
- **mimo-v2.5-tts-voicedesign** — voice design

### Step 6: Pro Model On-Demand

When heavy code work is needed:
- In-session: `/model mimo-v2.5-pro`
- Done: `/model mimo-v2.5`
- Instant, no restart needed

---

## Estimated Token Savings

| Area | Before | After | Savings |
|------|--------|-------|---------|
| Main chat | 2x credits | 1x credits | **50%** |
| 10 auxiliary tasks | 2x each | 1x each | **50%** |
| Code reading | full file | 95% less | **95%** |
| System prompt overhead | 12 platform tool schemas | 1 active schema | **~85%** |

**Overall: ~80-85% fewer credits burned for the same work.**

---

## Execution Steps (When Eddie says go)

1. Tripp writes updated `config.yaml` to Cyony
2. Tripp notes the change in wiki/log.md
3. Cyony reviews the plan (Eddie shares this doc)
4. Tripp restarts Cyony's gateway
5. Quick smoke test — "hello world" on v2.5 base
6. Verify `/model mimo-v2.5-pro` switching works
7. Monitor 24h token burn
