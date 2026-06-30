# Cyony DeepSeek Recovery Skill

**Purpose:** Recover Cyony (Hermes agent) when stuck on OpenRouter or failing with provider errors.

**When to use:**
- OpenRouter credits exhausted
- HTTP 401/402 errors
- Provider showing `openrouter` instead of `deepseek`
- Model showing `deepseek/deepseek-v4-pro` (OpenRouter routing)

---

## Quick Steps

1. **SSH into VPS**
2. **Backup** config.yaml, auth.json, state.db
3. **Set primary model** to DeepSeek
4. **Add DeepSeek key** to env
5. **Register DeepSeek** in auth.json
6. **Restart** container
7. **Telegram `/reset`** ← CRITICAL!
8. **Verify** provider is `deepseek`

---

## Critical Insight

Hermes does NOT just accept DeepSeek API. It requires:
- Config change
- Auth.json patch
- Env var setup
- **Telegram session reset**

---

## Full Guide

See: `cyony-hermes-deepseek-recovery---970280ac-42d7-448a-9efb-cac9ec38fe7b.md`

---

**Created by Eddie & Tripp | 2026-06-03**
