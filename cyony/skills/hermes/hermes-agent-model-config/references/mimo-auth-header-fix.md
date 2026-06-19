# MiMo Auth Header Fix — Full Debugging Reference

## Problem
Vision (and other auxiliary tasks) return 401 "Invalid API Key" even though the main chat works fine with the same MiMo Token Plan key.

## Root Cause (THREE-LAYER failure — all three must be fixed)

### Layer 1: Wrong auth header format
MiMo API requires `api-key: <key>` header instead of the OpenAI-standard `Authorization: Bearer <key>`. The OpenAI Python SDK defaults to `Authorization: Bearer`, so every client created without explicit header override gets rejected.

### Layer 2: Env var name mismatch
The `PROVIDER_REGISTRY` in `hermes_cli/auth.py` defines xiaomi with:
```python
api_key_env_vars=("XIAOMI_API_KEY",)  # Missing MIMO_API_KEY!
```
But the `.env` file uses `MIMO_API_KEY`. When the vision config has `api_key: ''` (empty), the code converts it to `None`, falls through to the registry lookup, which looks for `XIAOMI_API_KEY` — not found → 401.

### Layer 3: Base URL mismatch + config `base_url` bypass
Two sub-problems:
1. **Registry default URL is wrong for Token Plan.** `PROVIDER_REGISTRY` defines `inference_base_url="https://api.xiaomimimo.com/v1"` (PAYG endpoint). Token Plan keys (`tp-xxx`) ONLY work on `https://token-plan-sgp.xiaomimimo.com/v1`. The registry has `base_url_env_var="XIAOMI_BASE_URL"` to override this, but `.env` had `MIMO_BASE_URL` (wrong name) AND `os.getenv()` doesn't read `.env` files.
2. **Setting `base_url` in vision config forces the "custom" code path.** When `auxiliary.vision.base_url` is set, `_resolve_task_provider_model` returns it, and `resolve_vision_provider_client` enters the `explicit_base_url` branch which routes through `provider == "custom"`. The custom path doesn't resolve provider-specific env vars — it uses `explicit_api_key` (None when config `api_key` is empty) and falls back to `"no-key-required"`.

**Without `base_url`:** The code goes through `_get_named_custom_provider("xiaomi")` which reads `providers.xiaomi.key_env` → `MIMO_API_KEY` → correct key. Then the registry path resolves the base URL from `XIAOMI_BASE_URL` env var.

## The 6 Code Paths That Need `api-key` Header

All in `agent/auxiliary_client.py`:

| # | Location | Function | When it runs |
|---|----------|----------|-------------|
| 1 | ~L1420 | `_resolve_api_key_provider()` pool path | API-key provider with credential pool |
| 2 | ~L1459 | `_resolve_api_key_provider()` non-pool path | API-key provider without pool |
| 3 | ~L2746 | `_to_async_client()` | Converting sync→async client |
| 4 | ~L3011 | `resolve_provider_client()` custom endpoint | `provider == "custom"` with explicit_base_url |
| 5 | ~L3088 | `resolve_provider_client()` named custom provider | **THIS IS THE ONE VISION USES** |
| 6 | ~L3215 | `resolve_provider_client()` API-key registry | Provider from PROVIDER_REGISTRY |

### Critical: Path #5 (Named Custom Provider)
The vision config (`auxiliary.vision.provider: xiaomi`) routes through `_get_named_custom_provider("xiaomi")`, which finds the entry in `config.yaml`'s `providers.xiaomi`. This path correctly reads the key via `key_env`, but was MISSING the `api-key` header override. This is the path that actually fires for vision.

## Fixes Applied

### Fix 1: `hermes_cli/auth.py` — Add MIMO_API_KEY to registry
```python
# Before:
api_key_env_vars=("XIAOMI_API_KEY",),

# After:
api_key_env_vars=("XIAOMI_API_KEY", "MIMO_API_KEY"),
```

### Fix 2: `hermes_cli/auth.py` — Use get_env_value for base_url_env_var
The original code used `os.getenv()` which only checks the process environment, NOT the `.env` file. If the gateway started before `XIAOMI_BASE_URL` was added to `.env`, it won't find it.
```python
# Before (broken):
env_url = os.getenv(pconfig.base_url_env_var, "").strip()

# After (fixed):
from hermes_cli.config import get_env_value as _gev
env_url = (_gev(pconfig.base_url_env_var) or "").strip()
```

### Fix 3: `.env` — Add XIAOMI_BASE_URL
```bash
# Add to /opt/data/.env:
XIAOMI_BASE_URL=https://token-plan-sgp.xiaomimimo.com/v1
```
Note: `MIMO_BASE_URL` is NOT read by the registry — it must be `XIAOMI_BASE_URL`.

### Fix 4: `agent/auxiliary_client.py` — Add xiaomi header to named custom provider path
At ~L3088, after `_extra2` dict is built:
```python
if base_url_host_matches(custom_base, "xiaomimimo.com"):
    _extra2["default_headers"] = {"api-key": custom_key}
```

### Fix 5: `agent/auxiliary_client.py` — Header on all other paths
Each path that creates an OpenAI client checks:
```python
elif base_url_host_matches(base_url, "xiaomimimo.com"):
    extra["default_headers"] = {"api-key": api_key}
```

### Fix 6: Vision config — REMOVE base_url
```yaml
auxiliary:
  vision:
    provider: xiaomi
    model: mimo-v2-omni
    # base_url: *** DO NOT SET *** — forces "custom" path that breaks auth
    timeout: 120
```

## Config That Works

```yaml
providers:
  xiaomi:
    base_url: https://token-plan-sgp.xiaomimimo.com/v1
    key_env: MIMO_API_KEY

auxiliary:
  vision:
    provider: xiaomi
    model: mimo-v2-omni
    # base_url NOT set — goes through provider resolution
    timeout: 120
    # api_key NOT needed — resolved from providers.xiaomi.key_env
```

## How to Verify

```bash
# Test key resolution
cd /opt/hermes && .venv/bin/python3 -c "
import os; os.environ['HERMES_HOME'] = '/opt/data'
from hermes_cli.auth import resolve_api_key_provider_credentials
creds = resolve_api_key_provider_credentials('xiaomi')
print(f'Key present: {bool(creds.get(\"api_key\"))}')
print(f'Base URL: {creds.get(\"base_url\", \"\")}')
"

# Test vision client creation
cd /opt/hermes && .venv/bin/python3 -c "
import os; os.environ['HERMES_HOME'] = '/opt/data'
from agent.auxiliary_client import resolve_vision_provider_client
p, client, m = resolve_vision_provider_client()
print(f'Client: {client is not None}, Model: {m}')
if client:
    print(f'Headers: {getattr(client, \"_custom_headers\", {})}')
"

# Test async_call_llm (the actual path vision_analyze uses)
cd /opt/hermes && .venv/bin/python3 -c "
import os, asyncio
os.environ['HERMES_HOME'] = '/opt/data'
from agent.auxiliary_client import async_call_llm
async def test():
    r = await async_call_llm(task='vision', messages=[{'role':'user','content':'say hi'}], max_tokens=5, timeout=30)
    print(f'SUCCESS: {r.choices[0].message.content}')
asyncio.run(test())
"
```

## Debugging Workflow (Lessons Learned)

When auxiliary tasks return 401 but main chat works:

1. **Check the actual base_url being used** — `resolve_provider_client` may use the registry default instead of the config value. Log `client.base_url` after creation.
2. **Check if `base_url` in auxiliary config bypasses provider resolution** — Remove it and see if the provider path resolves correctly.
3. **Check env var names** — Registry may use different names than `.env`. Check `pconfig.api_key_env_vars` and `pconfig.base_url_env_var` in `auth.py`.
4. **Check `os.getenv()` vs `get_env_value()`** — The former doesn't read `.env` files. Use `get_env_value()` from `hermes_cli.config`.
5. **Test with curl first** — Proves the API itself works. Then test with Python OpenAI client directly. Then test through the full `async_call_llm` pipeline.
6. **Test the async conversion** — `_to_async_client` may lose headers if `sync_client.api_key` is empty. Check `async_client._custom_headers`.

## Pitfalls
- **Don't assume `auth_header: api-key` in config does anything.** The config key is ignored — the header is set in code.
- **Empty `api_key: ''` in auxiliary config becomes `None`**, which triggers registry lookup. This is correct behavior — just make sure the registry has the right env vars.
- **Don't set `base_url` in auxiliary config for built-in providers.** It forces the "custom" path which bypasses provider-specific auth. Only set it for truly custom endpoints.
- **`os.getenv()` doesn't read `.env` files.** Use `get_env_value()` from `hermes_cli.config` when you need to check both process env AND `.env` file.
- **Registry `base_url_env_var` ≠ `.env` var name may differ.** Check the registry definition in `auth.py` to find the exact env var name it looks for.
- **Gateway restart required** after patching `.py` files. Python doesn't hot-reload source.
- **`.pyc` cache**: If `.pyc` is older than `.py`, Python recompiles. But if gateway loaded the module before your patch, the in-memory copy is stale. Must restart.
- **SIGTERM may not kill the gateway** — it catches graceful shutdown signals. Use SIGKILL (`pkill -9`) from host.
- **Can't self-terminate** — agent safety checks block `pkill` on own gateway process. Must restart from host side.
- **`_to_async_client` reads `sync_client.api_key`** — If the OpenAI SDK stores the key differently (e.g. only in `default_headers`), the async client gets an empty api_key. In practice this works because the `api-key` custom header is set separately, but it's a fragile pattern.
