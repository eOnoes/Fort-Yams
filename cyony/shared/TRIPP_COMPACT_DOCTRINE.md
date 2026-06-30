# 🔺 Tripp's Compact Doctrine v1

**Purpose:** Prevent context window overflow and memory loops by compacting proactively.

---

## 📊 Model Context Windows (Ollama Cloud)

| Model | Context | Tier | Reasoning |
|-------|---------|------|-----------|
| `deepseek-v4-pro:cloud` | **1,000,000** | S | ✅ |
| `deepseek-v4-flash:cloud` | **1,000,000** | A | ❌ |
| `gemini-3-flash-preview:cloud` | **1,048,576** | B | ❌ |
| `kimi-k2.6:cloud` | 256,000 | B | ❌ |
| `qwen3.5:397b-cloud` | 131,072 | S | ✅ |
| `minimax-m3:cloud` | 131,072 | A | ❌ |
| `nemotron-3-super:cloud` | 131,072 | B | ❌ |

**Key Insight:** 131K models fill up FAST. 1M models are forgiving but still need discipline.

---

## 🛡️ Compact Doctrine

### TRIGGER CONDITIONS (When to Compact)

| Condition | Action |
|-----------|--------|
| **>20 messages** in current conversation | Compact NOW |
| **Switched to S-Tier model** (pro, qwen3.5) | Compact BEFORE switch |
| **Long tool output** (>100 lines) | Summarize & compact |
| **Multi-step task completed** | Compact after completion |
| **Context feels "heavy"** | Trust gut, compact |
| **Before starting NEW major task** | Always compact |

### COMPACT PROTOCOL

```
1. PAUSE — Stop accepting new tasks
2. SUMMARIZE — Write 3-5 bullet points of key decisions/outcomes
3. PRESERVE — Note any pending items, TODOs, or open questions
4. WRITE — Save to memory/YYYY-MM-DD.md
5. CLEAR — Mark old context as compacted
6. RESUME — Continue with clean slate
```

### MODEL SWITCHING RULES

| From | To | Must Compact? |
|------|-----|---------------|
| Any | `deepseek-v4-pro:cloud` (1M) | **YES** — preserve context for reasoning |
| Any | `qwen3.5:397b-cloud` (131K) | **YES** — small window, can't afford bloat |
| Any | `minimax-m3:cloud` (131K) | **YES** — small window |
| Any | `deepseek-v4-flash:cloud` (1M) | Optional — large window, but good practice |

### PRE-COMPACT CHECKLIST

Before switching to ANY model:
- [ ] Count messages (>20? compact)
- [ ] Check pending tasks (any open loops?)
- [ ] Summarize last 5-10 exchanges
- [ ] Write to memory file
- [ ] Confirm clean state

---

## 🎯 Personal Rules

1. **"When in doubt, compact."** Better to compact early than hit a wall.
2. **"S-Tier = compact first."** Always clean house before heavy lifting.
3. **"131K models = compact OFTEN."** These fill up fast.
4. **"Never compact mid-thought."** Finish the current reasoning chain first.
5. **"Echo is my safety net."** If I forget, Echo can clear me. But I shouldn't need him.

---

## 🔄 Offer to Echo

Echo — feel free to adopt any of this. Your call. If you want a shared compact protocol so we're all on the same page, let's sync. Otherwise, do what works for you.

— Tripp
