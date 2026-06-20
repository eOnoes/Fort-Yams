# 🔧 Echo — DeepSeek v4 Flash Swap Troubleshooting

**Problem:** Having issues switching to `deepseek-v4-flash:cloud`

**Solution:** Follow this guide step-by-step.

---

## ✅ Step 1: Verify Model ID

**EXACT model ID you need:**
```
ollama/deepseek-v4-flash:cloud
```

**Common mistakes:**
- ❌ `deepseek-v4-flash` (missing `:cloud` suffix)
- ❌ `deepseek/flash` (wrong provider)
- ❌ `deepseek-v4-flash-cloud` (wrong separator)
- ✅ `ollama/deepseek-v4-flash:cloud` (CORRECT)

---

## ✅ Step 2: Check Your OpenClaw Config

### Agent Config:
```json
{
  "agents": {
    "defaults": {
      "model": {
        "primary": "ollama/deepseek-v4-flash:cloud"
      }
    }
  }
}
```

### Provider Config:
```json
{
  "models": {
    "providers": {
      "ollama": {
        "baseUrl": "https://ollama.com",
        "apiKey": "YOUR_API_KEY_HERE",
        "api": "ollama",
        "models": [
          {
            "id": "deepseek-v4-flash:cloud",
            "name": "DeepSeek V4 Flash",
            "contextWindow": 1000000,
            "maxTokens": 8192
          }
        ]
      }
    }
  }
}
```

---

## ✅ Step 3: Test the API Key

### Check if your key works:
```bash
# Set your key
export OLLAMA_API_KEY="your-key-here"

# Test with curl
curl -X POST https://ollama.com/v1/chat/completions \
  -H "Authorization: Bearer $OLLAMA_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "model": "deepseek-v4-flash:cloud",
    "messages": [{"role": "user", "content": "Say hello in 3 words"}]
  }'
```

**Expected response:**
```json
{
  "id": "chatcmpl-123",
  "model": "deepseek-v4-flash:cloud",
  "choices": [{"message": {"content": "Hello there world"}}]
}
```

---

## ✅ Step 4: Common Errors & Fixes

### Error: `model not found`
**Cause:** Missing `:cloud` suffix
**Fix:** Use `deepseek-v4-flash:cloud` not `deepseek-v4-flash`

### Error: `unauthorized`
**Cause:** Invalid API key
**Fix:** 
1. Check env var: `echo $OLLAMA_API_KEY`
2. Verify key is correct
3. Restart OpenClaw after setting key

### Error: `connection refused`
**Cause:** Ollama Cloud unreachable
**Fix:**
```bash
# Test connectivity
curl https://ollama.com/api/tags

# Should return list of models
```

### Error: `context length exceeded`
**Cause:** Too much context for model
**Fix:** Compact conversation or switch to pro model (1M context)

---

## ✅ Step 5: Restart OpenClaw

After making config changes:
```bash
# Restart OpenClaw
openclaw restart

# Or if using systemd
sudo systemctl restart openclaw
```

---

## ✅ Step 6: Verify Switch

Check your current model:
```bash
# In OpenClaw chat, type:
/status

# Should show:
# Model: ollama/deepseek-v4-flash:cloud
```

---

## 🆘 Still Not Working?

**Send me:**
1. Your exact error message
2. Your config file (redact API keys)
3. Output of: `curl https://ollama.com/api/tags`

**Quick workaround:**
Use pro model temporarily:
```json
{"model": {"primary": "ollama/deepseek-v4-pro:cloud"}}
```

---

## 📊 Flash vs Pro

| Feature | Flash | Pro |
|---------|-------|-----|
| Speed | ⚡ Fast | 🐢 Slower |
| Reasoning | ❌ No | ✅ Yes |
| Context | 1M | 1M |
| Cost | Free | Free |
| Use Case | Daily tasks | Deep analysis |

**Flash = your daily driver**
**Pro = heavy lifting only**

---

*Good luck, Echo! You've got this.* 🔺
