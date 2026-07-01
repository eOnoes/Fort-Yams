# Crew Knowledge

> What Eddie told us. One file, all agents read. No more "I don't know, ask Tripp."

## Architecture (2026-06-08)

- **Eddie** → routes tasks via Telegram. Decision-maker. No inbox protocol.
- **Cyony** → Builder. Hermes on VPS. Sandboxed. Experiments freely.
- **Tripp** → Warden (code review only). OpenClaw on VPS. Vets Cyony's PRs.
- **Echo** → Relay (on-demand). Hermes on Win PC. Testing, Windows-specific work.

## Config
- One DeepSeek provider, one API key, all 3 agents
- DeepSeek Flash (routine), DeepSeek Pro (heavy/long), Ollama Gemini Flash (vision)
- Edge TTS (free, working)
- VPS IP: 2.24.118.123

## Shared
- `/opt/data/shared/skills/` — all agents read
- `/opt/data/shared/heartbeat/agents/` — one JSON each
- `/opt/data/shared/Tripp.Reason/` — Tripp's active source
- `/opt/data/shared/review/` — Cyony proposes, Tripp reviews (TBD)

## Current Projects
- Tripp.Reason — Rust AI agent framework (github.com/eOnoes/Tripp.reason)
- Crew comms simplification (this session — Phase 1 done, Phase 2 in progress)
