# 🔧 Cyony — Switch to DeepSeek API (NOT OpenRouter)

**Problem:** OpenRouter is out of credits. Cyony keeps falling back to OpenRouter for DeepSeek.

**Solution:** Switch her to use DeepSeek API directly.

---

## ✅ Step 1: Update Cyony's .env File

File location (on host):
```
/var/lib/docker/volumes/e29d427e7c8ad445d170d4190327e7f911408294292f9b6f5b99209a3b85a297/_data/.env
```

**Current .env:**
```bash
OPENROUTER_API_KEY=sk-or-v1-REDACTED
OPENROUTER_DEFAULT_MODEL=qwen/qwen3.7-max
OPENROUTER_FALLBACK_MODEL=deepseek/deepseek-v4-pro
OPENROUTER_ALLOWED_MODELS=nvidia/nemotron-3-super-120b-a12b,deepseek/deepseek-v4-pro,qwen/qwen3.6-plus,x-ai/grok-build-0.1,moonshotai/kimi-k2.6,qwen/qwen3.7-max
DEEPSEEK_API_KEY=sk-REDACTED
```

**What needs to change:**
Cyony's Hermes config needs to use DeepSeek provider directly, not OpenRouter.

---

## ✅ Step 2: The Issue

Looking at her auth.json, she only has:
- `kimi-coding` provider
- `openrouter` provider (status: **exhausted**)

**No DeepSeek provider configured!**

---

## ✅ Step 3: How to Fix

### Option A: Restart Cyony with DeepSeek Config

```bash
# 1. Stop Cyony
docker stop hermes-agent-8eep-hermes-agent-1

# 2. Edit her config to add DeepSeek provider
# (Need to access her Hermes config store)

# 3. Restart
docker start hermes-agent-8eep-hermes-agent-1
```

### Option B: Send Config via Telegram

Since Cyony responds to Telegram, send her:
```
/config provider add deepseek \
  --api-key sk-REDACTED \
  --base-url https://api.deepseek.com/v1 \
  --model deepseek/deepseek-v4-pro
```

### Option C: Patch Her Config Database

```bash
# Access her state.db and add DeepSeek provider
# (Requires sqlite3 knowledge)
```

---

## 🚨 The Real Problem

Cyony is a **Hermes agent**, not OpenClaw. She uses a different config system.

**Her config is stored in:**
- `.env` file (API keys)
- `state.db` (provider config)
- `auth.json` (credentials)

**She needs to be told via Telegram to switch providers.**

---

## 🎯 What You Should Do

1. **Message Cyony on Telegram:**
   ```
   @Cyony109_bot Switch to DeepSeek API. 
   Provider: deepseek
   Model: deepseek/deepseek-v4-pro
   API Key: sk-REDACTED
   Base URL: https://api.deepseek.com/v1
   ```

2. **Or restart her container with updated env:**
   ```bash
   docker stop hermes-agent-8eep-hermes-agent-1
   # Edit .env to set DEFAULT_MODEL=deepseek/deepseek-v4-pro
   docker start hermes-agent-8eep-hermes-agent-1
   ```

---

## 📊 Current Status

| Provider | Status | Credits |
|----------|--------|---------|
| OpenRouter | ❌ Exhausted | $0 |
| DeepSeek API | ✅ Available | Unknown |
| Kimi/Moonshot | ✅ Available | Unknown |

---

**Want me to message Cyony directly to switch?** 🔺
