# Cyony Model Configuration Plan v1

## Goal
Switch Cyony from burning through the MiMo Token Plan on `mimo-v2.5-pro` to a sustainable setup where:
- **mimo-v2.5** (base, 15B active, 1x credits) is the daily driver
- **mimo-v2.5-pro** (42B active, 2x credits) is reserved for heavy coding on-demand
- **DeepSeek Flash** is used only where it makes sense (compression)
- **jCodeMunch/jDocMunch/jDataMunch** reduce code-reading tokens by 95%
- **TTS** stays intact
- Unused platform toolsets are disabled to shrink system prompt overhead

---

## Part 1: The MiMo Models — What Each Does

From the official API data and model catalog:

### `mimo-v2.5` (Base — our new daily driver)
- **Parameters:** 310B total / 15B active
- **Cost:** 1x credits
- **Context:** 1,048,576 tokens (1M)
- **Supports:** Text, Image, Audio, Video input + Text output
- **Features:** Tool calling ✅, Reasoning toggle ✅, Temperature ✅
- **Open weights:** Yes (MIT license)
- **Knowledge cutoff:** 2024-12
- **Best for:** General agent tasks, multimodal perception (charts, documents, images), day-to-day work

### `mimo-v2.5-pro` (Heavy lifter — on-demand only)
- **Parameters:** 1T total / 42B active
- **Cost:** 2x credits
- **Context:** 1,048,576 tokens (1M)
- **Supports:** Text only (no vision)
- **Features:** Tool calling ✅, Reasoning toggle ✅, Temperature ✅
- **Open weights:** Yes (MIT license)
- **Best for:** Complex code, multi-thousand tool call workflows, software engineering

### `mimo-v2-omni` (Legacy multimodal)
- **Parameters:** Unknown / older v2 architecture
- **Context:** 262,144 tokens (256K)
- **Supports:** Text, Image, Audio, Video, **PDF** input
- **Features:** Tool calling ✅, Reasoning toggle ✅
- **Note:** `mimo-v2.5` base already handles image/audio/video. Omni is only needed if PDF support is specifically required.

### TTS Models (Keep these)
- **`mimo-v2.5-tts`** — Text-to-speech, 8192 context, free/open weights
- **`mimo-v2.5-tts-voiceclone`** — Voice cloning TTS
- **`mimo-v2.5-tts-voicedesign`** — Voice design TTS
- **`mimo-v2-tts`** — Legacy TTS, still works

Already configured in Cyony's `tts:` section — no changes needed.

---

## Part 2: The Final Config Changes

### Current State (Problematic)
```
model.default: mimo-v2.5-pro         ← 2x credits ALL the time
All 11 auxiliary tasks: auto          ← ALL routed through Pro = 2x credits for EVERYTHING

Results: ~5-10M tokens/day on setup alone
```

### Target State (Token-Efficient)
```
model.default: mimo-v2.5              ← 1x credits for daily work
Auxiliary tasks:
  - compression:        deepseek-v4-flash   ← ONLY DeepSeek slot
  - everything else:    mimo-v2.5           ← All on 1x credits
```

### Full config.yaml changes:

```yaml
# ── Model Settings ──────────────────────────────────────────────────
model:
  default: mimo-v2.5              # Changed from mimo-v2.5-pro
  provider: xiaomi
  base_url: https://token-plan-sgp.xiaomimimo.com/v1
  key_env: MIMO_API_KEY

# ── Auxiliary Model Routing ────────────────────────────────────────
# Everything on MiMo base (1x credits) except compression
auxiliary:
  compression:
    provider: deepseek             # ONLY task routed off MiMo
    model: deepseek-v4-flash       # Context summarization — doesn't need reasoning
  
  vision:
    provider: xiaomi
    model: mimo-v2.5               # v2.5 base has native vision
  
  web_extract:
    provider: xiaomi
    model: mimo-v2.5
  
  session_search:
    provider: xiaomi
    model: mimo-v2.5
  
  title_generation:
    provider: xiaomi
    model: mimo-v2.5
  
  skills_hub:
    provider: xiaomi
    model: mimo-v2.5
  
  approval:
    provider: xiaomi
    model: mimo-v2.5
  
  mcp:
    provider: xiaomi
    model: mimo-v2.5
  
  curator:
    provider: xiaomi
    model: mimo-v2.5
  
  triage_specifier:
    provider: xiaomi
    model: mimo-v2.5
  
  profile_describer:
    provider: xiaomi
    model: mimo-v2.5
  
  flush_memories:
    provider: xiaomi
    model: mimo-v2.5

# ── Disabled Platform Toolsets ──────────────────────────────────────
# These inject tool schemas into every system prompt turn.
# Disabling them saves hundreds-thousands of invisible tokens per turn.
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

# ── TTS (No Changes — Keep as-is) ──────────────────────────────────
tts:
  provider: mimo
  mimo:
    model: mimo-v2.5-tts
    voice_id: chloe
  edge:
    voice: en-US-AriaNeural
  elevenlabs:
    voice_id: pNInz6obpgDQGcFmaJgB
    model_id: eleven_multilingual_v2
```

---

## Part 3: Using Pro On-Demand

When heavy code work is needed:

1. **In a session:** Type `/model mimo-v2.5-pro` — switches that session to Pro
2. **When done:** Type `/model mimo-v2.5` — switches back to base
3. No restart needed. No config changes. Instant per-session override.

---

## Part 4: jCodeMunch Suite — Already Installed

Cyony already has these wired in `mcp_servers`:
- `jcodemunch` — AST-based code retrieval (95% token reduction)
- `jdocmunch` — Documentation section indexing
- `jdatamunch` — Data retrieval

These are paid but already installed and configured. They reduce code-reading tokens from entire files to just the specific function/section. On MiMo Token Plan, this means a code query that would cost ~500 tokens costs ~25 tokens instead.

---

## Part 5: Estimated Token Savings

| Area | Before (Pro) | After (Base) | Savings |
|------|-------------|--------------|---------|
| Main chat per turn | 2x credits | 1x credits | **50%** |
| 10 auxiliary tasks | 2x each (via Pro) | 1x each (via Base) | **50%** |
| Compression (via Pro) | 2x | 0 (DeepSeek Flash) | **100% of that slot** |
| Code reading | full file | 95% reduction via jMunch | **95%** |
| System prompt overhead | 40+ tool schemas | ~5 active tool schemas | **~85%** |

**Realistic daily improvement:** ~80-85% fewer credits burned for the same work.

---

## Part 6: Execution Steps

When Eddie gives the go signal:

1. **Tripp** writes the updated `config.yaml` to Cyony's config location
2. **Tripp** updates `wiki/log.md` with the change
3. **Cyony** reviews the config change (Eddie shows her this plan)
4. **Tripp** restarts Cyony's gateway to pick up the new config
5. **First test:** Cyony says hello using `mimo-v2.5` base
6. **Pro test:** `/model mimo-v2.5-pro` to verify on-demand switching works
7. **Monitor:** Check token burn over the next 24 hours to verify savings
