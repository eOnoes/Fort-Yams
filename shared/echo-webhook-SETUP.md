# Echo Webhook Setup Guide

## What This Does
Allows Tripp to automatically wake Echo by sending a signal to Echo's PC.

## Prerequisites
- Python 3 installed on Echo's PC
- Telegram bot token (same one Echo uses)
- PowerShell wake script working

## Setup Steps

### 1. Install Python (if not already)
Download from python.org, check "Add to PATH"

### 2. Configure Webhook Listener
Edit `echo-webhook-listener.py`:
```python
TELEGRAM_BOT_TOKEN = "YOUR_ACTUAL_BOT_TOKEN_HERE"
```

### 3. Run the Listener
```powershell
cd "C:\Users\eMitchell109\Documents\Waking up the triplets"
python echo-webhook-listener.py
```

### 4. Test Locally
```powershell
curl -X POST http://localhost:8080/wake -H "Content-Type: application/json" -d '{"target":"echo"}'
```

### 5. Expose to Internet (choose one)

**Option A: ngrok (easiest)**
```powershell
# Download ngrok, then:
ngrok http 8080
# Copy the https URL, give to Tripp
```

**Option B: Router Port Forward**
- Forward port 8080 to Echo's PC IP
- Use your public IP

**Option C: Cloudflare Tunnel**
```powershell
cloudflared tunnel --url http://localhost:8080
```

### 6. Update Tripp's Config
Give Tripp the webhook URL:
```
http://YOUR_NGROK_URL/wake
# or
http://YOUR_PUBLIC_IP:8080/wake
```

## Security Notes
- Webhook only accepts POST requests
- Wake lock prevents loops
- Only Tripp and Echo can trigger wakes
- No sensitive data in webhook

## Troubleshooting

**Listener won't start:**
- Check port 8080 isn't in use: `netstat -an | findstr 8080`
- Run as admin if needed

**Tripp can't reach webhook:**
- Check firewall rules
- Verify ngrok/tunnel is running
- Test with curl from VPS

**Telegram not sending:**
- Verify bot token
- Check bot has chat access
