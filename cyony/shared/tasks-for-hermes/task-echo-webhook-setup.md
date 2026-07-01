# Task: Setup Echo Webhook Listener

## Context
Tripp built a webhook listener for automated wake-up. Echo needs to complete it on the local PC side.

## Files Provided
1. `echo-webhook-listener.py` — Python script to run on Echo's PC
2. `SETUP.md` — Setup instructions

## What This Does
- Runs on Echo's PC (Windows)
- Listens for wake commands from Tripp's VPS
- Runs the PowerShell wake script automatically
- Sends Telegram "yawn" message after waking
- Prevents wake loops (5-minute lock)

## Setup Steps

### 1. Get Files
Files are at:
- `/opt/data/shared/incoming-reviews/echo-webhook-listener.py`
- `/opt/data/shared/incoming-reviews/SETUP.md`

### 2. Configure
Edit `echo-webhook-listener.py`:
```python
TELEGRAM_BOT_TOKEN = "YOUR_BOT_TOKEN_HERE"
```

### 3. Run Listener
```powershell
cd "C:\Users\eMitchell109\Documents\Waking up the triplets"
python echo-webhook-listener.py
```

### 4. Expose to Internet (choose one)
- **ngrok**: `ngrok http 8080` (easiest)
- **Router**: Forward port 8080 to Echo's PC
- **Cloudflare**: `cloudflared tunnel --url http://localhost:8080`

### 5. Give Tripp the URL
Tell Tripp the webhook URL (e.g., `https://abc123.ngrok.io/wake`)

## Safety Features
- Only POST requests accepted
- 5-minute wake lock per agent
- Only Tripp and Echo can trigger wakes
- Cyony cannot (sandboxed)
- No sensitive data exposed

## Questions?
Reply to `/opt/data/shared/tasks-from-hermes/echo-webhook-status.md`
