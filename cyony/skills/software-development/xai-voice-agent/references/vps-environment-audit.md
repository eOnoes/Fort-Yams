# VPS Environment Audit (as of 2026-06-19)

## System
- Host: Hostinger VPS, overlay filesystem, 96GB (48GB used)
- OS: Debian 13 (trixie), kernel 6.8.0
- Container: Docker (cgroup `0::/`)
- User: `hermes` (uid 10000), NOT root

## Home Directory
- **`/opt/data`** — NOT `/home/hermes` (doesn't exist, can't create — no root)
- All files, scripts, env vars go under `/opt/data/`
- Env file: `/opt/data/.env`
- Audio cache: `/opt/data/audio_cache/`
- Reference audio: `/opt/data/shared/chloe-voice-clone/eddie_chill_reference.wav`

## Available Binaries
- `python3` ✅ (3.13)
- `ffmpeg` ✅
- `curl` ✅
- `ssh` (OpenSSH 10.0p2) ✅
- `git` ✅
- `wget` — not installed
- `node/npx` — available via npx

## Networking
- SSH client available for outbound connections
- Cannot bind to privileged ports (<1024) as non-root
- Can bind to any port ≥1024
- No reverse tunnel tools installed (no autossh, chisel, frp, ngrok, cloudflared)
- External IP: curl to ifconfig.me sometimes times out

## Permission Constraints
- hermes cannot write to `/root/` or `/home/hermes/`
- hermes cannot create `/home/hermes/` directory
- Everything must be under `/opt/data/`
- `/root/` is readable but not writable

## Python Environment
- PyTorch 2.6.0+cu124 (CPU only, no CUDA)
- Chatterbox TTS 0.1.7 installed (user-level packages)
- MiMo voiceclone via cloud API
- Kokoro TTS via kokoro-js

## Reverse Tunnel Setup
For bridging local PC (Pocket TTS) to VPS:
1. Eddie's PC initiates: `ssh -R 8788:localhost:<port> hermes@<vps-ip>`
2. VPS accesses via `http://127.0.0.1:8788`
3. Env file with shared secret at `/opt/data/.tripp-tts-worker.env`
4. Helper scripts at `/opt/data/tripp-tts-generate.sh`
