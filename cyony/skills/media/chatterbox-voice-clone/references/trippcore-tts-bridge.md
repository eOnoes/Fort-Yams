# Trippcore TTS Bridge — Reverse Tunnel Architecture

## What It Is
A reverse SSH tunnel that bridges a local GPU-powered TTS worker (Pocket TTS on Eddie's RTX 4070) to the Hermes VPS, enabling near-instant uncensored voice generation accessible from the cloud agent.

## Architecture
```
[Eddie's PC]                          [Hermes VPS]
Pocket TTS worker (port N)  ←SSH tunnel→  127.0.0.1:8788
     GPU (RTX 4070)                        hermes user
```

Eddie's PC initiates an SSH reverse tunnel:
```bash
ssh -R 8788:localhost:<worker-port> hermes@<vps-ip>
```

This makes `http://127.0.0.1:8788` on the VPS point to the Pocket TTS worker on Eddie's PC.

## API Contract

### Health Check
```
GET http://127.0.0.1:8788/health
```

### Generate Speech
```
POST http://127.0.0.1:8788/v1/tts
Content-Type: application/json
Authorization: Bearer ${TRIPP_TTS_SHARED_SECRET}

{
  "text": "Text to speak here.",
  "voice": "chloe",
  "return_audio_base64": false
}
```

Response includes `audio_url` — fetch it with the same Authorization header.

### Save Artifact
Fetch the `audio_url`, save as `.wav`, convert to `.ogg` (opus 64k) for Telegram delivery:
```bash
ffmpeg -y -i input.wav -c:a libopus -b:a 64k output.ogg
```

## VPS-Side Setup

### Env File
Location: `/opt/data/.tripp-tts-worker.env`
Contains: `TRIPP_TTS_SHARED_SECRET=<token>`

**CRITICAL:** Hermes home is `/opt/data`, NOT `/home/hermes`. All files must be under `/opt/data/`.

### Helper Scripts
- `/opt/data/tripp-tts-smoke.sh` — Health check + basic test
- `/opt/data/tripp-tts-generate.sh "Text"` — Generate + save + print path

### Security Rules
- NEVER print, log, commit, or reveal `TRIPP_TTS_SHARED_SECRET`
- NEVER send local file paths or shell commands to the TTS worker
- Use only voice alias `chloe`
- Source env file before authenticated calls

## VPS Environment Facts
- User: `hermes` (uid 10000), NOT root
- Home: `/opt/data` (NOT `/home/hermes`)
- Cannot create `/home/hermes` (permission denied)
- Cannot write to `/root/` (permission denied)
- SSH client available (OpenSSH 10.0p2)
- Python3, ffmpeg, curl available
- No reverse tunnel tools installed (no autossh, chisel, frp, ngrok, cloudflared)
- Container: Docker overlay filesystem, 96GB total

## Why This Matters
- **Speed:** Near-instant generation (GPU) vs 43s (VPS CPU) vs 4s (MiMo cloud)
- **Uncensored:** No content filters, no "high risk" rejections
- **Free:** No API costs, no token limits
- **Private:** Tunnel is encrypted, endpoint is localhost-only

## Status (2026-06-19)
- Pocket TTS confirmed working on Eddie's RTX 4070
- Voice clone from 30s reference: successful
- Tunnel: NOT YET ESTABLISHED — needs Eddie to initiate from his PC
- Env file: NOT YET CREATED — needs shared secret
- Helper scripts: NOT YET DEPLOYED — needs Codex to create and place at `/opt/data/`
