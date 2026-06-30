# Holographic Memory Provider Setup

## What It Is
Holographic is a local memory provider for Hermes Agent. No API key needed, no data leakage. Auto-extracts facts at session end. Structured storage that doesn't eat the context window.

## Setup (2026-06-19)

### Step 1: Set provider
```bash
hermes config set memory.provider holographic
```

### Step 2: Verify
```bash
hermes memory status
```
Should show:
```
Provider:  holographic
Plugin:    installed ✓
Status:    available ✓
```

### Step 3: Restart gateway
```bash
hermes gateway restart
```

## Configuration in config.yaml
```yaml
memory:
  memory_enabled: true
  user_profile_enabled: true
  memory_char_limit: 2200
  user_char_limit: 1375
  provider: holographic
  flush_min_turns: 6
  nudge_interval: 10
```

## Available Providers
```bash
hermes memory status
```
Shows all installed plugins:
- **holographic** (local) — no API key, recommended
- byterover (requires API key)
- hindsight (API key / local)
- honcho (API key / local)
- mem0 (API key / local)
- openviking (API key / local)
- retaindb (API key / local)
- supermemory (requires API key)

## Why Holographic Over Built-in
- Built-in memory = 2,200 character limit in MEMORY.md + 1,375 in USER.md
- Context window gets eaten by compressed memory entries
- Holographic = structured fact store, auto-extraction, no character limit pressure
- Local = no data sent to cloud, no API key needed

## PITFALL: Interactive Setup
`hermes memory setup` may not show interactive options in all environments. If it defaults to "built-in only", use the config command directly:
```bash
hermes config set memory.provider holographic
```

## PITFALL: Gateway Restart
`hermes gateway restart` may timeout if an agent session is active. Check status after:
```bash
hermes gateway status
```
If gateway shows "draining", wait for active sessions to complete, then restart again.
