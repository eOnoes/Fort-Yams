# MiMo Auth Header Fix for Hermes

## Problem

MiMo Token Plan endpoint (`token-plan-sgp.xiaomimimo.com`) uses a non-standard auth header:
- **Required:** `api-key: tp-xxxxx`
- **Rejected:** `Authorization: Bearer tp-xxxxx` → 401 "Invalid API Key"

The OpenAI Python SDK (used by Hermes) defaults to `Authorization: Bearer`. This means:
- **Main chat works** because Hermes has a separate transport layer that handles auth
- **Vision, compression, session_search, and all auxiliary tasks FAIL** because they go through `auxiliary_client.py` which builds plain `OpenAI()` clients with default auth

## Root Cause

`agent/auxiliary_client.py` has **6 separate code paths** that build OpenAI clients with provider-specific headers. Each has special handling for Kimi (`User-Agent`), GitHub Copilot, and NVIDIA NIM — but NONE for Xiaomi.

## The Fix

Add `xiaomimimo.com` to each header chain. Pattern:

```python
elif base_url_host_matches(base_url, "xiaomimimo.com"):
    extra["default_headers"] = {"api-key": api_key}
```

### All 6 locations in `auxiliary_client.py`:

1. **`_resolve_api_key_provider()` — pool path** (~line 1420)
2. **`_resolve_api_key_provider()` — non-pool path** (~line 1459)
3. **`resolve_provider_client()` — API-key provider path** (~line 3215)
4. **`_to_async_client()` — async conversion path** (~line 2746)
5. **`resolve_provider_client()` — anonymous custom endpoint path** (~line 3011)
6. **`resolve_provider_client()` — named custom provider path** (~line 3088) ← **CRITICAL: this is the path vision ACTUALLY uses when config has `provider: xiaomi` + `base_url` set**

Path 6 is the one that was missed in the initial 2026-06-18 fix. Without it, vision returns 401 even though all other paths are patched, because the vision auxiliary config routes through `_get_named_custom_provider()` which builds the client at line ~3119.

### How vision config routing works

When `auxiliary.vision` has `provider: xiaomi` + `base_url` set (and `api_key: ''` is empty), the resolution chain is:

1. `_resolve_task_provider_model("vision")` reads config → `api_key` becomes `None` (empty string → None)
2. Since `cfg_base_url` is set AND `cfg_provider` is "xiaomi" (not "auto"), returns `("xiaomi", model, base_url, None, api_mode)`
3. `resolve_vision_provider_client` sees `resolved_base_url` is set → calls `resolve_provider_client("xiaomi", explicit_base_url=base_url, explicit_api_key=None)`
4. `resolve_provider_client` finds xiaomi via `_get_named_custom_provider()` (named custom providers path)
5. Gets key from `key_env: MIMO_API_KEY` via `os.getenv()`
6. Creates `OpenAI(api_key=custom_key, base_url=...)` — **WITHOUT xiaomi header** unless path 6 is patched

### Config changes needed

```yaml
# providers section
providers:
  xiaomi:
    base_url: https://token-plan-sgp.xiaomimimo.com/v1
    key_env: MIMO_API_KEY
    extra_body:
      thinking:
        type: disabled

# vision auxiliary — key_env NOT needed if main provider is xiaomi
# The named custom provider path reads key_env from the providers.xiaomi entry
auxiliary:
  vision:
    provider: xiaomi
    model: mimo-v2-omni
    base_url: https://token-plan-sgp.xiaomimimo.com/v1
    timeout: 120
```

## What does NOT work

- **`auth_header: api-key` in config.yaml** — this config key does NOT exist in Hermes. Silently ignored.
- **Setting `api_key: ''` in vision config** — sends empty key, causes 401
- **Setting `Authorization: Bearer` manually** — MiMo rejects this format entirely

## Verification

```bash
# Test auth directly:
MIMO_KEY=$(grep "^MIMO_API_KEY=" /opt/data/.env | sed 's/MIMO_API_KEY=//')
curl -s -w "\nHTTP:%{http_code}" https://token-plan-sgp.xiaomimimo.com/v1/chat/completions \
  -H "api-key: $MIMO_KEY" \
  -H "Content-Type: application/json" \
  -d '{"model":"mimo-v2.5","messages":[{"role":"user","content":"hi"}],"max_tokens":10}'
# Should return 200

# Count xiaomi patches in the file (should be 6):
grep -c "xiaomimimo.com" /opt/hermes/agent/auxiliary_client.py
```

## When this fix needs re-application

This is a **code-level patch** to `auxiliary_client.py`. It will be lost on:
- `hermes update` (git pull overwrites the file)
- Reinstalling Hermes
- Any pip upgrade that includes `hermes-agent`

After each update, verify the patches are still present:
```bash
grep -c "xiaomimimo.com" /opt/hermes/agent/auxiliary_client.py
# Should return 6 (one per code path)
```

## Debugging: "Vision works via curl but not via vision_analyze"

If `curl` with `api-key` header returns 200 but the `vision_analyze` tool returns 401:
1. Check which code path vision uses: add `logger.warning(...)` at each xiaomi branch
2. Most likely cause: the **named custom provider path** (path 6) is unpatched
3. The config `provider: xiaomi` + `base_url` combo routes through `_get_named_custom_provider()`, NOT through the custom endpoint path
4. Verify with: `grep -c "xiaomimimo.com" /opt/hermes/agent/auxiliary_client.py` — if it's 5, path 6 is missing

## Tested: 2026-06-19

Confirmed working on MiMo Token Plan (`tp-xxxxx` key) with endpoint `https://token-plan-sgp.xiaomimimo.com/v1`. All 6 paths patched. Vision confirmed working via direct API test.
