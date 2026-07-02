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

### 5. Check for active service dependencies BEFORE classifying

Before marking anything for deletion, verify it's not backing a running service:

```bash
# Systemd services — check if target is a service source or working directory
systemctl list-units --type=service --state=running
systemctl cat <service-name>.service  # shows WorkingDirectory and ExecStart
# If target backs a service: stop + disable before deleting:
systemctl stop <service>.service && systemctl disable <service>.service
rm /etc/systemd/system/<service>.service && systemctl daemon-reload

# Docker containers — check if target is mounted into any container
docker ps -a --format '{{.Names}} {{.Mounts}}'
docker ps -a --format '{{.Names}} {{.Image}} {{.Status}}'  # running status

# Process references — check if any running process references the target
grep -r '<target-dir>' /etc/systemd/ /root/.hermes/ /root/Fort-Yams/ 2>/dev/null | head -5
```

**Real case:** Tripp.Reason was running as a systemd service (`node serve -s . -l 4320`) serving from `/opt/tripp-reason-v2/`. The source directory at `/root/Tripp.reason/` (5.7GB) was safe to delete, but the service had to be stopped first, and the served directory (448KB) and service file also needed cleanup.

**Real case:** CosyVoice (12GB) had no Docker containers, no systemd service, and no process references — only pip package metadata mentions. Safe to delete without stopping anything.

### 6. Classify every target

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

## SSH Access Debugging (Remote VPS)

When SSH access fails on a remote VPS:

```bash
# 1. Check which keys exist on this machine
find /opt/data /root /home -name "id_*" -not -name "*.pub" -not -path "*/node_modules/*" -not -path "*/cache/*" -not -path "*/site-packages/*" 2>/dev/null

# 2. Try each key with verbose output
ssh -v -i /path/to/key root@HOSTNAME "echo OK" 2>&1 | grep -E "Offering|accepted|denied|identity"

# 3. If key is accepted but still denied — check authorized_keys for forced commands or bad formatting
ssh -v -i /path/to/key root@HOSTNAME "echo OK" 2>&1 | tail -20

# 4. Generate a fresh key and have the human add it
ssh-keygen -t ed25519 -f /tmp/hermes_vps_key -N "" -q
cat /tmp/hermes_vps_key.pub
# Human runs on VPS: echo "<pubkey>" >> ~/.ssh/authorized_keys
```

**Common failures:**
- Key offered but rejected → wrong key on VPS, or bad formatting in authorized_keys
- Key accepted but "Permission denied" → check if authorized_keys has `no-pty` or `command=` restrictions
- Multiple keys on machine → try each with `-v` to see which the server accepts

**Key locations on Cyony's VPS host:**
- `/opt/data/home/.ssh/id_ed25519` — primary key
- `~/.ssh/id_ed25519` — generated during sessions
- `/opt/data/home/.ollama/id_ed25519` — ollama-specific key

## Real Cleanup Results (2026-07-01)

**Target:** VPS at 2.24.118.123 — 77% disk (74GB/96GB)
**Result:** 57% disk (55GB/96GB) — **19GB freed**

| Item | Size | Dependency Check | Action |
|---|---|---|---|
| CosyVoice `/root/agents/cyony/CosyVoice/` | 12GB | No Docker refs, no systemd, only pip metadata mentions | Deleted |
| Tripp.Reason `/root/Tripp.reason/` | 5.7GB | Systemd service ran from `/opt/tripp-reason-v2/` (448KB), not this dir | Stopped service, deleted |
| Tripp.Reason served `/opt/tripp-reason-v2/` | 448KB | Active systemd service on port 4320 | Disabled service, deleted |
| Rust toolchain `/root/.rustup/` + `/root/.cargo/` | 3.8GB | Only used by Tripp.Reason (now removed) | Deleted |
| bgutil-ytdlp-pot-provider | 212MB | No Docker refs, no service | Deleted |
| Loose audio files `*.mp3` `*.wav` | ~8MB | Checked voice_library/ for copies | Deleted |
| Docker anonymous volumes | 152MB | `docker volume prune -f` | Pruned |

**Services confirmed healthy after cleanup:**
- Tripp.Mind (gateway, SiYuan, Redis) — all up
- Hermes Agent — up
- Traefik + Cyony Beacon — up

## Presentation Style

Eddie prefers the audit presented as:
- Emoji-labeled categories (🧹 safe, 🔧 ask first, ⛔ don't touch)
- Size per item with location path
- One-line plain-English description of what each thing is
- Risk level: "zero" for caches, specific questions for tools
- Separate section for "ask the other agent/user" decisions
- Summary total at the bottom of each category

Keep it scannable. The user should be able to say "yes to 1-7, ask Tripp about 8-10" without re-reading.
