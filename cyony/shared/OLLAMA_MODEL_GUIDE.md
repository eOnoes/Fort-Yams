# Ollama Cloud — Quick Model Guide for the Crew

**All models are on Ollama Cloud. No flat rate — each model burns a different % per request. Be smart.**

---

## The Short Version

```
Light work (summaries, routing, quick answers)  → deepseek-v4-flash:cloud
Medium work (code edits, research, writing)     → kimi-k2.6:cloud
Heavy work (deep reasoning, big code, audits)   → qwen3.5:397b:cloud OR deepseek-v4-pro:cloud
```

---

## Model Tiers

| Tier   | Model                          | Use When                                    | Cost % |
|--------|--------------------------------|---------------------------------------------|--------|
| 🟢 Light | `deepseek-v4-flash:cloud`    | Quick replies, summaries, routing, status checks | Low    |
| 🟢 Light | `gemini-3-flash-preview:cloud`| Alternate light option, good at formatting   | Low    |
| 🟡 Mid   | `kimi-k2.6:cloud`            | General coding, research, writing, tool use  | Medium |
| 🟡 Mid   | `nemotron-3-super:cloud`     | Code generation, reasoning fallback          | Medium |
| 🟡 Mid   | `minimax-m3:cloud`           | Creative tasks, varied work, fallback        | Medium |
| 🔴 Heavy | `qwen3.5:397b:cloud`         | Complex code, system design, architecture    | High   |
| 🔴 Heavy | `deepseek-v4-pro:cloud`      | Deep audits, hard reasoning, critical review | High   |

---

## Decision Tree (Copy This)

```
Is this a quick one-shot question?
  → YES → deepseek-v4-flash:cloud

Does this need code generation or multi-step reasoning?
  → YES → kimi-k2.6:cloud

Is this a big codebase review, architecture design, or critical audit?
  → YES → qwen3.5:397b:cloud or deepseek-v4-pro:cloud

Not sure?
  → Start with kimi-k2.6:cloud, escalate if it fails
```

---

## Example Requests by Model

### 🟢 deepseek-v4-flash (cheap, fast)
```
"Summarize this log"
"What's the status of LOCK 018?"
"Route this task to the right agent"
"Is this config valid YAML?"
```

### 🟢 gemini-3-flash-preview (cheap, good formatting)
```
"Convert this to markdown"
"Format this report"
"Quick summary with bullet points"
```

### 🟡 kimi-k2.6 (balanced workhorse)
```
"Write a function that parses inbox files"
"Review this PR diff for bugs"
"Draft a response to this spec"
"Help me debug this error"
```

### 🟡 nemotron-3-super (code-heavy mid-tier)
```
"Generate a Rust provider trait"
"Write a TypeScript component"
"Refactor this module"
```

### 🟡 minimax-m3 (creative / varied)
```
"Write documentation"
"Brainstorm approaches"
"Alternative implementation ideas"
```

### 🔴 qwen3.5:397b (big brain, expensive)
```
"Design the Goose provider abstraction layer"
"Review this entire codebase architecture"
"Write a 500-line module with tests"
"Complex multi-file refactor"
```

### 🔴 deepseek-v4-pro (deepest reasoning, expensive)
```
"Find the root cause of this subtle concurrency bug"
"Security audit this auth flow"
"Design the permission boundary system"
"Critical decision: fork vs build?"
```

---

## Goose Config (Copy-Paste)

For **Goose / OpenClaw / any OpenAI-compatible client:**

```yaml
# ~/.config/goose/config.yaml  or equivalent

model: deepseek-v4-flash:cloud

provider:
  name: ollama-cloud
  base_url: https://ollama.com/v1
  api_key: ${OLLAMA_API_KEY}

# Available models (swap as needed):
#   deepseek-v4-flash:cloud       ← default (cheap)
#   gemini-3-flash-preview:cloud  ← alternate light
#   kimi-k2.6:cloud               ← general purpose
#   nemotron-3-super:cloud        ← code generation
#   minimax-m3:cloud              ← creative/varied
#   qwen3.5:397b:cloud            ← heavy lifting
#   deepseek-v4-pro:cloud         ← critical reasoning
```

**Environment variable:**
```bash
export OLLAMA_API_KEY="your-key-here"
```

---

## Verify It Works

```bash
curl -s https://ollama.com/v1/chat/completions \
  -H "Authorization: Bearer $OLLAMA_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{"model":"deepseek-v4-flash:cloud","messages":[{"role":"user","content":"pong"}],"max_tokens":5}'
```

Should return JSON with a short reply in `choices[0].message.content`.

---

## Rules of Thumb

1. **When in doubt, use flash.** Escalate only when you need to.
2. **Never use pro/397b for status checks** — that's burning dollars on "pong".
3. **Rotate if rate-limited** — swap to an alternate in the same tier.
4. **Don't chain heavy models** — if step 1 needs pro, step 2 can probably use flash.

---

## Per-Agent Suggestions

| Agent | Primary          | Heavy Fallback         | Notes                              |
|-------|------------------|------------------------|------------------------------------|
| Tripp | deepseek-v4-pro  | qwen3.5:397b           | Audits need deep reasoning         |
| Cyony | kimi-k2.6        | qwen3.5:397b           | Building code, balanced work       |
| Echo  | deepseek-v4-flash| kimi-k2.6             | Relaying/summarizing, stay light   |
