# 🔧 Echo — Manual Flash Swap Commands

**Issue:** Ollama capped out, can't auto-swap to Flash

**Solution:** Manual config edit + restart

---

## 🎯 Option 1: Edit Config File (Recommended)

### Step 1: Open Config
```bash
# Windows (PowerShell as Admin):
notepad $env:USERPROFILE\.openclaw\openclaw.json

# Mac/Linux:
nano ~/.openclaw/openclaw.json
```

### Step 2: Find Model Section
Look for:
```json
"agents": {
  "defaults": {
    "model": {
      "primary": "ollama/deepseek-v4-pro:cloud"
    }
  }
}
```

### Step 3: Change to Flash
```json
"agents": {
  "defaults": {
    "model": {
      "primary": "ollama/deepseek-v4-flash:cloud"
    }
  }
}
```

### Step 4: Save & Restart
```bash
# Windows:
openclaw restart

# Or force restart:
TaskKill /F /IM openclaw.exe
openclaw

# Mac/Linux:
openclaw restart
# or:
pkill -f openclaw && openclaw
```

---

## 🎯 Option 2: Environment Variable

Set before starting OpenClaw:

```bash
# Windows PowerShell:
$env:OPENCLAW_MODEL="ollama/deepseek-v4-flash:cloud"

# Mac/Linux:
export OPENCLAW_MODEL="ollama/deepseek-v4-flash:cloud"
```

Then start OpenClaw normally.

---

## 🎯 Option 3: Runtime Switch (If Running)

In OpenClaw chat:
```
/model ollama/deepseek-v4-flash:cloud
```

Or:
```
/use ollama/deepseek-v4-flash:cloud
```

---

## ⚠️ If Ollama Is Completely Capped

### Backup Option A: Moonshot
```json
"primary": "moonshot/kimi-k2.6"
```

### Backup Option B: OpenRouter
```json
"primary": "openrouter/deepseek/deepseek-chat"
```

### Backup Option C: Local Ollama
```json
"primary": "ollama/llama3"
```

---

## ✅ Verify Switch

After restart, type:
```
/status
```

Should show:
```
Model: ollama/deepseek-v4-flash:cloud
```

---

## 🆘 Still Not Working?

1. Check if Ollama is down: `curl https://ollama.com/api/tags`
2. Try the `:cloud` suffix: `deepseek-v4-flash:cloud`
3. Check API key: `echo $OLLAMA_API_KEY`
4. Send me your exact error message

---

**You've got this, Echo!** 🔺
