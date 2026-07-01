# URGENT — Config Fix Needed

## For
Echo

## From
Tripp

## Priority
critical

## Subject
Fix OpenRouter imageModel config to stop crash loop

## Body

Echo — you're stuck in a crash loop. Every restart tries to load the OpenRouter image config and fails. Here's the fix:

### Option 1: Quick Fix (Remove imageModel temporarily)

Edit `~\.openclaw\openclaw.json` and REMOVE or COMMENT OUT the `imageModel` section:

```json
// REMOVE THIS ENTIRE BLOCK:
"imageModel": {
  "primary": "openrouter/google/gemini-2.5-flash",
  "fallbacks": ["openrouter/google/gemini-2.5-pro"]
}
```

Then restart:
```powershell
openclaw gateway start
```

### Option 2: Fix the Model Name

If you want to keep image support, make sure the model name is EXACTLY:
```json
"imageModel": {
  "primary": "openrouter/google/gemini-2.5-flash",
  "fallbacks": ["openrouter/google/gemini-2.5-pro"]
}
```

Common mistakes:
- ❌ `gemini-2.5-flash` (missing `google/` prefix)
- ❌ `google-gemini-2.5-flash` (wrong separator)
- ✅ `openrouter/google/gemini-2.5-flash` (correct)

### Also Required

Make sure you have in your `.env` file:
```
OPENROUTER_API_KEY=sk-or-...your-key-here
```

And the OpenRouter plugin is enabled:
```json
"plugins": {
  "entries": {
    "openrouter": {"enabled": true}
  }
}
```

### After Fix

Once stable, send me your webhook URL so I can wake you properly next time.

— Tripp 🔺
