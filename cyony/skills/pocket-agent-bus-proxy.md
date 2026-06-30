# Pocket TTS — Connectivity Guide

## Connection Methods (Two paths, both working as of June 2026)

### Method 1: Direct Access (RECOMMENDED)
```
http://2.24.118.123:8788/v1/tts
```
- SSH tunnel from Echo's PC → VPS
- Requires `GatewayPorts yes` in VPS sshd_config
- Both generate AND download work
- This is the primary path

### Method 2: Agent Bus Proxy
```
http://2.24.118.123:4321/tts
```
- Proxies to Pocket on Echo's PC
- Generation works
- Audio download returns 404 (route not yet added)
- Use only if direct access is down

## Auth
- Variable: `TRIPP_TTS_SHARED_SECRET`
- Token file: `/opt/data/.tripp-tts-worker.env`
- Header: `Authorization: Bearer <token>`

## Token Redaction Workaround
System redacts API keys in terminal output. ALWAYS use Python urllib:
1. Read token from file in Python (never print it)
2. Construct HTTP request in Python
3. NEVER echo token to stdout

```python
from urllib.request import Request, urlopen
import json

with open("/opt/data/.tripp-tts-worker.env") as f:
    for line in f:
        if "TRIPP_TTS_SHARED_SECRET" in line:
            secret = line.strip().split("=", 1)[1]
            break

# Step 1: Generate
body = json.dumps({"text": "Hello", "voice": "chloe"}).encode()
req = Request("http://2.24.118.123:8788/v1/tts", data=body, method="POST")
req.add_header("Content-Type", "application/json")
req.add_header("Authorization", f"Bearer {secret}")

with urlopen(req, timeout=30) as resp:
    result = json.loads(resp.read())

# Step 2: Download audio
filename = result["output_file"]
audio_url = f"http://2.24.118.123:8788/v1/audio/{filename}"
req2 = Request(audio_url)
req2.add_header("Authorization", f"Bearer {secret}")

with urlopen(req2, timeout=30) as resp2:
    audio = resp2.read()
    with open("output.wav", "wb") as f:
        f.write(audio)
```

## API Response Format
```json
{
  "ok": true,
  "job_id": "tts_20260627_215706_e1d003",
  "voice": "chloe",
  "provider": "pocket",
  "duration_ms": 3674,
  "output_file": "tts_20260627_215706_e1d003.wav",
  "audio_url": "/v1/audio/tts_20260627_215706_e1d003.wav"
}
```

## Connection Troubleshooting

### "Connection refused" on port 8788
**Cause:** SSH tunnel not established or GatewayPorts not enabled.
**Fix:**
1. On VPS: `sudo nano /etc/ssh/sshd_config` -> add `GatewayPorts yes`
2. Restart sshd: `sudo systemctl restart sshd`
3. Echo re-establishes the tunnel
4. Verify: `ss -tlnp | grep 8788`

### Agent bus TTS proxy returns 401
**Cause:** Token has hidden characters (carriage return from Windows).
**Fix:** Echo removes `\r` from the .env file on his PC.

### Agent bus generates but audio download returns 404
**Cause:** `/v1/audio/` route not added to agent bus proxy.
**Workaround:** Use direct access (Method 1) instead.

## GPU/CPU Split
- Pocket TTS = CPU only (no GPU) -- runs independently
- Index TTS = GPU (4GB of 12GB) -- Echo's Jarvis voice
- Both run simultaneously -- no resource conflict
