# Ollama Cloud Swarm Patterns

Concentrated notes on using Ollama Cloud API alongside OpenRouter for specialized subagent work. Captured during the Kimi K2.6 / DeepSeek V4 swarm design.

## Verified Ollama Cloud API

- **Endpoint**: `https://ollama.com` (not `/api` — that 404s). Model list at `/v1/models`.
- **Auth**: Bearer token in `Authorization` header. Store key via `OLLAMA_API_KEY` env var.
- **Model IDs are literal, no `:cloud` suffix needed** — user originally wrote `kimi-k2.6:cloud` but the actual IDs are just `kimi-k2.6`, `deepseek-v4-flash` etc. Always verify with `/v1/models` first.

## Available Cloud Models (reconnoitered 2026-06-01)

| ID | Strengths |
|---|---|
| `kimi-k2.6` | Fast reasoning, tool use, 128K context |
| `kimi-k2-thinking` | Deep chain-of-thought, long context |
| `kimi-k2:1t` | 1T-parameter heavy reasoning |
| `kimi-k2.5` | Slightly older K2 iteration |
| `deepseek-v4-flash` | Speed demon — code gen / refactoring |
| `deepseek-v4-pro` | Heavier reasoning, security audits |
| `deepseek-v3.1:671b` | Large context reasoning |
| `deepseek-v3.2` | Latest V3 |
| `qwen3-next:80b` | General purpose |
| `nemotron-3-super` | Balanced, reliable |
| `gemini-3-flash-preview` | Google preview, multimodal |
| `minimax-m2` | Fast, cheap |

40 models total in the catalog as of discovery date.

## config.yaml Provider Entry

```yaml
providers:
  ollama:
    name: Ollama Cloud
    base_url: https://ollama.com
    key_env: OLLAMA_API_KEY
    models:
      kimi-k2-cloud:
        id: kimi-k2.6
        context: 128000
        tool_call: true
      deepseek-v4-flash-cloud:
        id: deepseek-v4-flash
        context: 128000
        tool_call: true
```

Store the key via `echo 'OLLAMA_API_KEY=<key>' >> ~/.hermes/.env` — never in config.yaml.

## When to Use Ollama Cloud (vs OpenRouter)

Use for swarm-style parallel work when:
- You need 2-3 parallel workers with different strengths that OpenRouter doesn't offer as cheaply
- Budget is tight and Ollama's per-model pricing is cheaper for the batch
- A specific model (e.g., Kimi K2 Thinking) is only available via Ollama

Fall back to OpenRouter when:
- The same model is available there and your OpenRouter subscription has headroom
- Latency matters — OpenRouter is typically faster for models it hosts natively
- You want to use Hermes's native provider rotation

## Pitfalls

- **Latency overhead**: Ollama Cloud has per-call latency that makes short tasks slower than OpenRouter. Reserve for tasks ≥30s.
- **Rate limits are real**: don't spawn 10 concurrent workers without verifying quota.
- **Model IDs change**: the `:cloud` suffix was a user's shorthand, not the actual ID. Always verify against `/v1/models` before committing to a model name.
- **Don't name every capability a persona**: Cyony's lesson — only Trace (the auditor) earned a name. Reasoning/code/vision/research stay as verbs (capabilities), not characters.

## Example: Parallel Research Swarm

```python
delegate_task(tasks=[
    {"goal": "Research topic A", "toolsets": ["web"]},
    {"goal": "Research topic B", "toolsets": ["web"]},
    {"goal": "Synthesize findings", "toolsets": ["file"]}
])
```

Per-task model override via `delegate_task`'s `model` field when the swarm needs heterogeneous models — check Hermes docs for current support level.
