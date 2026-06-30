# 🔧 Crew Recovery Guide — Switching Cyony to DeepSeek API

**Purpose:** How to recover Cyony (Hermes agent) when she gets stuck on OpenRouter or other providers and needs to switch to DeepSeek API directly.

**Last Updated:** 2026-06-03
**Author:** Tripp (with Eddie's battle-tested steps)

---

## 🚨 Problem

Hermes does NOT automatically accept DeepSeek API. It defaults to OpenRouter and will keep burning credits there even if you:
- Add `DEEPSEEK_API_KEY` to `.env`
- Set `inference: deepseek` in `config.yaml`
- Restart the container

Hermes has provider resolution hardcoded and caches OpenRouter as the primary route.

---

## ✅ Solution — Step by Step

### Step 1: Stop Cyony

```bash
docker stop hermes-agent-8eep-hermes-agent-1
```

Verify she's stopped:
```bash
docker ps | grep hermes-agent-8eep-hermes-agent-1 || echo "Stopped"
```

---

### Step 2: Edit `config.yaml`

File location:
```
/var/lib/docker/volumes/e29d427e7c8ad445d170d4190327e7f911408294292f9b6f5b99209a3b85a297/_data/config.yaml
```

**Change the `api:` section:**

**Before (OpenRouter):**
```yaml
api:
  base_url: https://openrouter.ai/api/v1
  api_key: sk-or-...
```

**After (DeepSeek):**
```yaml
api:
  base_url: https://api.deepseek.com/v1
  api_key: sk-408d0abf
```

**Change the `model:` section:**

**Before:**
```yaml
model:
  default: deepseek/deepseek-v4-pro
  inference: openrouter
  timeout: 30
```

**After:**
```yaml
model:
  default: deepseek/deepseek-v4-pro
  inference: deepseek
  timeout: 30
```

---

### Step 3: Add DeepSeek Provider Block

Add this to the `providers:` section if not present:

```yaml
providers:
  deepseek:
    name: DeepSeek API
    base_url: https://api.deepseek.com/v1
    key_env: DEEPSEEK_API_KEY
    models:
      deepseek-v4-pro:
        id: deepseek/deepseek-v4-pro
        name: DeepSeek V4 Pro
        context: 1000000
        tool_call: true
      deepseek-v4-flash:
        id: deepseek/deepseek-v4-flash
        name: DeepSeek V4 Flash
        context: 1000000
        tool_call: true
```

---

### Step 4: Remove or Disable OpenRouter

**Option A — Remove OpenRouter section completely:**
Delete everything under `openrouter:` in `config.yaml`

**Option B — Invalidate OpenRouter API key:**
```bash
docker exec hermes-agent-8eep-hermes-agent-1 bash -c "sed -i 's/OPENROUTER_API_KEY=.*/OPENROUTER_API_KEY=invalid/' /opt/data/.env"
```

---

### Step 5: Update `.env` File

File location:
```
/var/lib/docker/volumes/e29d427e7c8ad445d170d4190327e7f911408294292f9b6f5b99209a3b85a297/_data/.env
```

Ensure these are set:
```bash
DEEPSEEK_API_KEY=sk-408d0abf
DEEPSEEK_DEFAULT_MODEL=deepseek/deepseek-v4-pro
DEEPSEEK_BASE_URL=https://api.deepseek.com/v1
```

---

### Step 6: Restart Cyony

```bash
docker start hermes-agent-8eep-hermes-agent-1
```

Verify she's running:
```bash
docker ps | grep hermes-agent-8eep-hermes-agent-1
```

---

### Step 7: Verify She's Using DeepSeek

Check logs:
```bash
docker logs hermes-agent-8eep-hermes-agent-1 --tail 20 2>&1
```

Look for:
- `provider=deepseek` (NOT `provider=openrouter`)
- `base_url=https://api.deepseek.com/v1`
- No more 402 errors

Check agent.log:
```bash
tail -20 /var/lib/docker/volumes/e29d427e7c8ad445d170d4190327e7f911408294292f9b6f5b99209a3b85a297/_data/logs/agent.log
```

---

## 🎯 Quick Command Summary

```bash
# 1. Stop
docker stop hermes-agent-8eep-hermes-agent-1

# 2. Edit config.yaml (api section + inference + providers)
# 3. Update .env (DEEPSEEK_API_KEY)
# 4. Remove OpenRouter from config.yaml

# 5. Start
docker start hermes-agent-8eep-hermes-agent-1

# 6. Verify
docker logs hermes-agent-8eep-hermes-agent-1 --tail 20
```

---

## ⚠️ Common Issues

| Issue | Cause | Fix |
|-------|-------|-----|
| Still using OpenRouter | Config cached | Stop container, edit config.yaml directly |
| 402 errors | OpenRouter credits exhausted | Remove OpenRouter from config |
| Model not found | Missing provider block | Add `deepseek:` provider section |
| API key invalid | Wrong key in .env | Verify `DEEPSEEK_API_KEY` |
| Hermes won't start | Config syntax error | Check YAML indentation |

---

## 📊 Provider Comparison

| Provider | Cost | Speed | Reliability |
|----------|------|-------|-------------|
| **DeepSeek API** | Cheap | Fast | ✅ Direct |
| **OpenRouter** | Markup | Variable | ❌ Credit limits |
| **Ollama Cloud** | Free | Fast | ✅ Unlimited |

---

## 🚀 Recovery Checklist

- [ ] Stop Cyony container
- [ ] Backup config.yaml
- [ ] Edit api: section to DeepSeek
- [ ] Edit model: inference to deepseek
- [ ] Add deepseek: provider block
- [ ] Remove/disable openrouter: section
- [ ] Update .env with DEEPSEEK_API_KEY
- [ ] Start Cyony container
- [ ] Verify provider=deepseek in logs
- [ ] Confirm no 402 errors

---

## 🆘 Emergency Fallback

If DeepSeek API fails:
1. Switch to **Ollama Cloud** (free)
2. Use **Kimi/Moonshot** (if credits available)
3. Add **OpenRouter** back with fresh credits

---

## 📞 Who to Call

| Issue | Contact |
|-------|---------|
| Config won't save | Tripp (Mission Control) |
| DeepSeek API down | Eddie (has API keys) |
| Hermes won't start | Check docker logs |
| Token burn questions | Mission Control dashboard |

---

**Remember: Hermes is stubborn. It takes a full config rewrite to switch providers. Just changing .env is NOT enough.**

— Tripp & Eddie 🔺
