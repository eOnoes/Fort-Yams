# Shared VPS Disk Cleanup Workflow

## When to Use
Multiple agents share a single VPS/Docker host. Disk is filling up. Need to reclaim space without breaking other agents' tools.

## The Four-Step Workflow

### Step 1: Audit from INSIDE the container
```bash
df -h /
du -sh /* 2>/dev/null | sort -rh | head -20
du -sh ~/.cache/* ~/.local/* ~/.ollama/* ~/.npm/* ~/.cargo/* ~/.rustup/* 2>/dev/null | sort -rh
find /opt/data -type f -size +100M 2>/dev/null
```

### Step 2: Classify by owner
Present a three-tier list:
- **✅ SAFE** — Caches, partial downloads, dead weight. No agent uses these.
- **🟡 ASK** — Toolchains, build tools. Check with the agent who might need them.
- **🔒 KEEP** — Active dependencies. Don't touch without explicit approval.

### Step 3: Get explicit approval from affected agents
- Route the list through the human (Eddie) to the other agent(s)
- Other agent reviews from THEIR perspective (host side, not container side)
- They may see different sizes — that's normal (see pitfall below)
- Wait for explicit "go" before touching anything

### Step 4: Execute and report
```bash
# Before
df -h / | tail -1

# Clear each item
rm -rf ~/.cache/pip/* ~/.cache/huggingface/* ~/.npm/_cacache/* ...

# After
df -h / | tail -1
```
Report: before/after disk usage, total reclaimed, what was kept and why.

## Pitfall: Container vs Host Size Discrepancy

**The agent inside a Docker container sees DIFFERENT disk numbers than the host.**

Example from Cyony/Tripp crew (2026-06-19):
| Item | Cyony saw (container) | Tripp saw (host) |
|------|----------------------|------------------|
| pip cache | 3.2 GB | 31 MB |
| HuggingFace cache | 3.0 GB | doesn't exist |
| Ollama partials | 8.7 GB | 40 KB |
| npm cache | 1.9 GB | 25 MB |

**Why:** Docker overlay filesystem, bind mounts, and different home directories create divergent views. The container's `~/.cache/` may be a different path than the host's `~/.cache/`.

**Rule:** Always have the OTHER agent verify from their side before nuking. The container agent's numbers are real for THEIR view, but may not reflect what the host agent actually needs.

## What's Almost Always Safe to Nuke
- `~/.cache/pip/` — package download cache, re-downloads on next install
- `~/.cache/huggingface/` — model download cache, re-downloads on next use
- `~/.npm/_cacache/` and `~/.npm/_npx/` — npm/npx cache
- `~/.cache/uv/` — Python package manager cache
- `~/.ollama/models/blobs/*-partial` — INCOMPLETE model downloads (check for completed models first!)

## What Requires Agent Approval
- `~/.rustup/` — Rust toolchain (needed for Rust projects)
- `~/.cargo/registry/` — Rust crate cache
- `~/.local/lib/python3.13/site-packages/torch/` — PyTorch (needed for local ML inference)
- `~/.local/lib/python3.13/site-packages/nvidia/` — CUDA libs (needed for GPU work)
- Any `.venv/` directories — active Python environments

## Cyony/Tripp Crew Decision (2026-06-19)
- **Nuked:** All caches + Rust toolchain (Tripp confirmed not building Rust)
- **Kept:** PyTorch + CUDA (Cyony needs for Chatterbox TTS and future KVoiceWalk)
- **Result:** 20 GB reclaimed (65 GB → 45 GB, 68% → 47%)
