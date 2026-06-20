# 💰 Pack Cost Log

**Started:** 2026-06-02
**Purpose:** Track token usage and costs across Tripp, Cyony, and Echo

---

## Format

| Date | Agent | Task | Model | Input Tokens | Output Tokens | Cost (USD) | Notes |
|------|-------|------|-------|-------------|--------------|-----------|-------|

---

## Log

| Date | Agent | Task | Model | Input | Output | Cost | Notes |
|------|-------|------|-------|-------|--------|------|-------|
| 2026-06-02 | Tripp | Dashboard v3.1 + cost logging setup | moonshot/kimi-k2.6 | 20k | 634 | ~$0.15 | Log initialized + template creation |

---

## Monthly Totals

| Month | Total Cost |
|-------|-----------|
| 2026-06 | $0.15 |

---

## Account Balances (as of 2026-06-02)

| Provider | Balance | Status |
|----------|---------|--------|
| OpenRouter | $116.00 credits / $48.11 used | ✅ Active |
| DeepSeek | $169.00 | ✅ Active |
| xAI | $98.86 | ✅ Active (was lagging) |
| Moonshot/Kimi | Cloud: 0.1% session / 0.2% weekly | ✅ Active |

---

## Notes
- Cyony: qwen/qwen3.7-max (primary) or deepseek/deepseek-chat (fallback) — NO nemotron
- Tripp: moonshot/kimi-k2.6
- Echo: (TBD — local model?)
- **New rule:** ALL agents log costs after EVERY task
- **Restart rule:** No self-restarts — ask another pack member (prevents infinite loops)
- **Ollama:** Installed but NOT loading small local models per Eddie — cloud models only
- OpenRouter balance checked periodically
