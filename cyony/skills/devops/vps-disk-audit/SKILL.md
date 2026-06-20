---
name: vps-disk-audit
description: Systematic disk space audit and safe cleanup on shared VPS. Drill-down du analysis, safe vs risky target classification, multi-agent impact assessment.
triggers:
  - user asks what's using disk space
  - user says disk is full or running out of space
  - cleanup / housekeeping / free space requests
  - "what's eating all the storage"
---

# VPS Disk Audit & Cleanup

Systematic approach to finding and safely reclaiming disk space on a shared VPS.

## Workflow

### 1. Top-level scan

```bash
df -h /                           # overall usage and availability
du -sh /* 2>/dev/null | sort -rh  # find which top-level dirs are heavy
```

### 2. Drill into the heaviest directory

Usually `/opt` or `/home`. Work down 2-3 levels:

```bash
du -sh /opt/* 2>/dev/null | sort -rh
du -sh /opt/data/* 2>/dev/null | sort -rh
```

### 3. Check hidden files (often the real hogs)

Hidden dirs in home directories frequently hold GBs of forgotten caches:

```bash
du -sh ~/.* 2>/dev/null | sort -rh | head -20
```

Common culprits:
- `.ollama/models/` — downloaded LLM models
- `.cache/pip/` — pip wheel cache
- `.cache/huggingface/` — HF model/tokenizer cache
- `.local/lib/python3.13/site-packages/` — user-level pip installs
- `.npm/_cacache/` and `.npm/_npx/` — npm package cache
- `.rustup/toolchains/` — Rust compiler toolchains
- `.cargo/registry/` — Rust crate source cache
- `.cache/uv/` — uv Python package manager cache

### 4. Find large individual files

```bash
find /opt -type f -size +100M 2>/dev/null | head -20
```

### 5. Classify every target

Split findings into three buckets with clear labels:

**🧹 SAFE (caches — zero risk, re-downloads on demand):**
- pip cache, HuggingFace cache, npm cache, uv cache, pnpm store
- Ollama partial/incomplete downloads
- node-gyp build cache
- Font caches, puppeteer cache

**🔧 ASK FIRST (tools with active use):**
- Rust toolchain — is anyone building Rust?
- PyTorch/CUDA/Triton — is anyone running local ML models?
- Cargo registry — tied to Rust toolchain
- transformers library — tied to HF model usage

**⛔ DO NOT TOUCH:**
- Active venvs (`.venv/`)
- Project source code
- Databases (`.db`, `.db-wal`)
- Config files (`.env`, `config.yaml`)
- Anything belonging to a running process

### 6. Present to user

Group by category, show size per item, include location path and one-line description. Separate "safe" from "ask the other agent/user." Let the user green-light before deleting.

## Multi-Agent Pitfall

On shared VPS with multiple agents (Hermes crew), always check before deleting:

```bash
# Who's running?
ps aux | grep -i hermes | grep -v grep

# Are there separate workspaces?
find /opt -name "pyvenv.cfg" 2>/dev/null

# Does the target directory belong to another agent's process?
```

- Caches in `~/.cache/` are almost always safe — they're re-downloadable
- User-level packages in `~/.local/` may be shared across agents
- If another agent is running, check what Python packages it imports before nuking `.local/`

### Container vs Host Number Mismatch

Agents running inside Docker containers see DIFFERENT disk numbers than the host. Container `du` may report inflated sizes because:
- Overlay filesystem layering
- Different mount points
- Container sees its own view of shared volumes

**Real case:** Cyony (in container) reported 8.7 GB for Ollama, 3.2 GB for pip cache. Tripp (on host) saw 40 KB and 31 MB respectively for the same paths.

**When presenting a cleanup plan:**
- Always note you're reporting from INSIDE the container
- If another agent reports different numbers from the host, trust the host numbers
- Present both sets when possible, or caveat with "container-side estimate"
- The host `du` is ground truth for actual disk reclaim

### Multi-Agent Cleanup Approval

When cleanup targets might affect another agent:
1. Present the full list with sizes and locations
2. Separate into "safe" (caches) vs "ask first" (tools/dependencies)
3. Let the user or other agent green-light before deleting
4. Never nuke another agent's tools without explicit approval

**Pattern:** Eddie runs cleanup proposals past Tripp before execution. Tripp verifies from the host side and gives a verdict. Respect this workflow — don't shortcut it.

## Cleanup Commands (after user approval)

```bash
# Caches (~17 GB typical)
rm -rf ~/.cache/pip
rm -rf ~/.cache/huggingface
rm -rf ~/.ollama/models/blobs/*-partial
rm -rf ~/.npm/_cacache ~/.npm/_npx
rm -rf ~/.cache/uv ~/.cache/pnpm ~/.cache/node

# Ollama abandoned downloads
rm -rf ~/.ollama/models/blobs/*-partial

# Rust (if approved — 3.9 GB)
rm -rf ~/.rustup ~/.cargo

# PyTorch/CUDA (if approved — 5 GB)
pip uninstall -y torch triton nvidia-cublas-cu12 nvidia-cuda-* nvidia-cudnn-* nvidia-nccl-* cusparselt 2>/dev/null
```

## Presentation Style

Eddie prefers the audit presented as:
- Emoji-labeled categories (🧹 safe, 🔧 ask first, ⛔ don't touch)
- Size per item with location path
- One-line plain-English description of what each thing is
- Risk level: "zero" for caches, specific questions for tools
- Separate section for "ask the other agent/user" decisions
- Summary total at the bottom of each category

Keep it scannable. The user should be able to say "yes to 1-7, ask Tripp about 8-10" without re-reading.
