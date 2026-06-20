# 🔧 Echo — DeepSeek API Setup (NOT Ollama)

**Issue:** Ollama is capped out. Need to switch to **DeepSeek API directly**.

---

## 🎯 PowerShell Commands for OpenClaw Config

### Step 1: Open Config in Notepad
```powershell
notepad $env:USERPROFILE\.openclaw\openclaw.json
```

### Step 2: Add DeepSeek Provider (if not exists)

Find the `models.providers` section and add:

```json
"deepseek": {
  "baseUrl": "https://api.deepseek.com/v1",
  "apiKey": "YOUR_DEEPSEEK_API_KEY_HERE",
  "api": "openai-completions",
  "models": [
    {
      "id": "deepseek-chat",
      "name": "DeepSeek V3",
      "contextWindow": 64000,
      "maxTokens": 8192
    },
    {
      "id": "deepseek-reasoner",
      "name": "DeepSeek R1",
      "contextWindow": 64000,
      "maxTokens": 8192,
      "reasoning": true
    }
  ]
}
```

### Step 3: Set Flash as Primary Model

Find the `agents.defaults.model` section and change:

```json
"model": {
  "primary": "deepseek/deepseek-chat"
}
```

Or for reasoning model:
```json
"model": {
  "primary": "deepseek/deepseek-reasoner"
}
```

### Step 4: Enable DeepSeek Plugin

Find `plugins.entries` and add:
```json
"deepseek": {
  "enabled": true
}
```

---

## 🚀 Quick PowerShell Script

Run this in PowerShell as Administrator:

```powershell
# Set DeepSeek API Key
$env:DEEPSEEK_API_KEY = "YOUR_KEY_HERE"

# Or add to system environment variables
[Environment]::SetEnvironmentVariable("DEEPSEEK_API_KEY", "YOUR_KEY_HERE", "User")

# Restart OpenClaw
openclaw restart
```

---

## ✅ Verify Switch

After restart, type in OpenClaw:
```
/status
```

Should show:
```
Model: deepseek/deepseek-chat
```

---

## 🆘 If DeepSeek API Key Missing

Get one at: https://platform.deepseek.com/

Then:
```powershell
# Set permanently
[Environment]::SetEnvironmentVariable("DEEPSEEK_API_KEY", "sk-...", "User")
```

---

## 📊 DeepSeek Models

| Model | ID | Context | Reasoning | Cost |
|-------|-----|---------|-----------|------|
| **DeepSeek V3** | `deepseek-chat` | 64K | ❌ | Cheap |
| **DeepSeek R1** | `deepseek-reasoner` | 64K | ✅ | Cheap |

**V3 = daily driver (like Flash)**
**R1 = reasoning (like Pro)**

---

**Let me know if you need the exact API key format!** 🔺
