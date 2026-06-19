# Hermes v0.15.0 "Velocity" Features & Auxiliary Vision Config

Reference notes captured 2026-06-01 from https://the-agent-report.com/2026/05/hermes-agent-v0150-velocity-release-may28/

## Headline Changes (v0.15.0, May 28 2026)

### run_agent.py Refactor (-76%)
The monolithic `run_agent.py` dropped from 16,083 lines to 3,821 lines across 14 cohesive modules under `agent/`. Thin forwarders keep backward compatibility. Net effect: dramatically easier to navigate/test/contribute; tool dispatch now loads-on-demand and releases per turn, preserving reasoning depth in long sessions.

### Kanban: Feature → Multi-Agent Platform
Matured across 104 PRs. New capabilities:
- Orchestrator auto-decomposition (master breaks goals into sub-tasks)
- Swarm topology (workers self-organize into dependency-aware execution graphs)
- Scheduled tasks (cron-integrated board slots)
- Worktree-per-task (isolated working directory per board slot)
- Per-task model overrides (assign different LLMs to different slots)

### session_search: 4500× Faster, Free
Rebuilt using pure algorithmic optimization on the local SQLite conversation store. No vector DB, no embeddings API, no extra cost.

### Promptware Defense
Scans incoming content for Brainworm-class injection patterns; sandboxes suspicious content before it reaches the agent loop; reports attempted attacks without disrupting legitimate work.

### Bitwarden Secrets Manager Integration
Single bootstrap token retrieves all provider keys at runtime. Fewer plaintext secrets in config, easier portability, team-friendly.

### Ink TUI Multi-Session Orchestrator
Dashboard across multiple concurrent Hermes sessions from the TUI.

### Skill Bundles
Group many skills behind one slash command (`@deploy` → loads k8s + docker + monitoring + rollback together).

### Platform Additions
- ntfy as the 23rd messaging platform
- Krea 2 + FAL plugin for image_gen
- Nous-approved MCP catalog with interactive picker
- OpenHands orchestration skill
- Deep xAI integration (Web Search via Grok, xai-oauth proxy, retired-model migration)

## v0.15.1 Hotfix (May 29)

28 commits, 21 PRs, same-day release. Headline fix: dashboard 401 reload loop in loopback/docker mode. Also: `--insecure` becomes explicit env opt-in, Kanban worker SIGTERM handling, `/model` picker unification, `/yolo` session bypass, full skills.sh catalog loading, web-URL redaction passthrough, MCP bare-command PATH resolution, arm64 cache fixes.

---

## auxiliary.vision Config for Text-Only Models

When your **default** model is text-only (e.g. `nvidia/nemotron-3-super-120b-a12b`), image analysis fails with `No endpoints found that support image input` unless an auxiliary vision provider is configured.

### Fix (no new API key needed if using OpenRouter)

```yaml
auxiliary:
  vision:
    provider: openrouter
    model: google/gemini-2.5-flash   # cheap, fast, great vision
    timeout: 120
```

### Model recommendations (OpenRouter)

| Model | Cost/image | Notes |
|-------|------------|-------|
| `google/gemini-2.0-flash-exp:free` | $0 | Free tier, slightly lower quality |
| `google/gemini-2.5-flash` | ~$0.01-0.05 | Best value |
| `anthropic/claude-sonnet-4` | ~$0.10-0.30 | Premium quality |
| `openai/gpt-4o-mini` | ~$0.02 | Cheap, solid |
| `qwen/qwen2.5-vl-72b-instruct` | ~$0.05 | OSS vision specialist |

### Caveats
- `auxiliary.*` is snapshotted at session start — config changes require `/reset` or new session (not live-toggleable).
- The auxiliary provider is used for vision, compression, session_search, skills_hub, approval, mcp, and title generation — each can have its own model/provider override.
