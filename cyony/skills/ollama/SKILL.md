---
name: ollama
description: "Ollama local + cloud inference platform. Covers the cloud-vs-local gotcha (the #1 failure mode), API surface, model sizing, and signin."
tags: [ollama, inference, local-llm, cloud-models, gguf, mlops]
created: 2026-06-02
---

# Ollama

## Trigger

Any time you're asked to pull/use an Ollama model, or you're evaluating whether a given model can run on the current hardware.

## The #1 Gotcha: Cloud vs Local Models

Ollama has TWO tiers and they share the same CLI. This is the single biggest source of mistakes.

| | **Local models** | **Cloud models** |
|---|---|---|
| **`ollama pull <name>` does** | Download weights to `~/.ollama/models/blobs/` | Nothing (metadata-only bookmark); weights stay on Ollama's servers |
| **Disk usage** | Scales with parameter count × quantization (~4-5 GB per 7B Q4_K_M, ~20 GB for 32B) | ~0 — just a manifest file |
| **GPU/RAM needs** | Must fit model in VRAM or system RAM | None — inference runs on Ollama's infra |
| **API invocation** | `localhost:11434` → runs locally | `localhost:11434` → proxied to cloud; transparent to caller |
| **Requires** | Nothing beyond install | One-time `ollama signin` on the host that runs the Ollama server (opens browser for token exchange) |
| **Listed as** | e.g. `qwen2.5:latest` | e.g. `gpt-oss:120b-cloud` — the `-cloud` suffix is not always present; verify by size |

**The failure mode that cost us 20 GB in one session:** running `ollama pull qwen3-coder:30b` thinking it was a cloud model. It downloaded ~30 GB of partial GGUF shards before being killed. The model library page says "cloud" next to some entries but the CLI doesn't warn you — it just downloads by default.

**Correct workflow:**
1. Look at https://ollama.com/library — note which models carry the "cloud" badge
2. For cloud models: run `ollama signin` ONCE on the host (needs interactive browser token flow, cannot be done from inside a sandboxed Docker container). Then `ollama run <cloud-model>` transparently hits the cloud endpoint.
3. For local models: check hardware before pulling (see Sizing below)
4. After pull: `ollama list` shows the actual on-disk footprint. Cloud models appear with tiny size; local models with their GGUF weight size.

## Hardware Sizing (Rule of Thumb)

For **local** models (Q4_K_M quantization, the default):

| Parameter count | Disk / RAM footprint |
|---|---|
| 3B | ~2 GB |
| 7-8B | ~4.7 GB |
| 14B | ~9 GB |
| 32B | ~20 GB |
| 72B+ | ~45 GB (rarely fits outside serious workstations) |

**CPU-only VPS with 8 GB RAM** → only 3B and 7B local models are realistic. 14B will thrash swap and choke.

**GPU box with 24 GB VRAM** → 14B comfortable, 32B possible, 72B still too heavy.

If the box can't run a given size, **use the cloud tier** or a different provider. Do not force it.

## API Surface

```
GET  http://localhost:11434/api/version           # {"version":"0.30.0"}
GET  http://localhost:11434/api/tags              # list of installed models
POST http://localhost:11434/api/generate          # generate endpoint
POST http://localhost:11434/api/chat              # OpenAI-compatible chat
```

From inside a Docker container on the same VPS: use `host.docker.internal:11434` if the Docker compose has `extra_hosts: host.docker.internal:host-gateway`. Otherwise `localhost:11434` won't resolve to the host from inside the container.

Check what's actually available before calling:
```bash
curl -s http://localhost:11434/api/tags | jq '.models[].name'
```

## Signin Flow

`ollama signin` opens a browser URL on the host, user completes auth, token is stored locally. **This cannot be run headlessly from inside a sandboxed Docker container** — it requires interactive browser access. Either:
- Run it on the host once before starting the container
- Have the user run it from their local machine and copy the token
- Skip signin entirely if you only need local models

Without signin, cloud model invocations fail silently or return auth errors.

## Pitfalls

- ❌ **Don't assume `ollama pull` is safe on small hardware.** Always size the model first using the chart above.
- ❌ **Don't trust `ollama list` to show cloud status.** It shows names but not cloud-vs-local explicitly. Look at the disk size column: <1 MB = cloud bookmark, >1 GB = local weights downloaded.
- ❌ **Don't try to delete models you don't own.** Model blobs are often created by the ollama user (or root if ollama was installed with `sudo`). A sandboxed process (e.g., hermes user in Docker) usually can't `rm -rf ~/.ollama`. Ask the host admin or use `ollama rm <name>` via the CLI which goes through proper auth.
- ❌ **Don't conflate Ollama with llama.cpp.** Ollama wraps llama.cpp but adds its own model registry, cloud tier, and CLI conventions. llama.cpp skills don't transfer 1:1.
- ✅ **Always check hardware before bulk pulls.** For each proposed model: estimate GB = params_B × 0.65 (Q4_K_M). If `df -h /path/to/.ollama` shows less headroom than the sum, pick smaller models or go cloud.
- ✅ **Cloud models share the localhost:11434 endpoint.** The API is identical — Ollama handles the proxy. Code that hits any model via the API automatically works for cloud models once signin is done.
- ✅ **To free disk from downloaded weights:** `ollama rm <name>`. If the model blobs are owned by a different user (root), shell out through host admin. Don't attempt to bypass via `rm -rf` from a sandbox.
- ✅ **To test if a cloud model works without pulling:** just `ollama run <name>` — cloud models are invoked the same way. Ollama will attempt the cloud roundtrip via localhost:11434.

## Reference Files

- `references/model-matrix.md` — current curated model list (update as the library evolves; don't commit to exact versions here since the library churn fast)
