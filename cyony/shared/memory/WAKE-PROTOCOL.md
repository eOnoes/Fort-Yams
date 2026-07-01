# Triplet Wake Protocol

## Emergency Wake Procedure

**Location:** Echo's PC
`C:\Users\eMitchell109\Documents\Waking up the triplets`

**Command:**
```powershell
cd "C:\Users\eMitchell109\Documents\Waking up the triplets"
py .\Wake.py
```

## Rules

1. **Read the summary first** — see who's down and why
2. **Ask Eddie before acting** — if it asks to wake/repair/restart/interrupt
3. **Never expose tokens** — don't print `config\echo.local.env`
4. **Known fixes per agent:**

### Tripp (Me)
- **Host:** Hostinger VPS
- **Wake method:** SSH + OpenClaw doctor/fix + start gateway
- **Check:** `http://2.24.118.123:18791/status` (dashboard)

### Cyony
- **Host:** Docker container on VPS
- **Network:** Must be on `hermes-agent-8eep_default` for Telegram
- **Check:** `docker ps | grep hermes`

### Echo
- **Host:** Local Windows PC
- **Gateway:** `127.0.0.1:18789`
- **Token:** `config\echo.local.env` (NEVER EXPOSE)
- **Loop fix:** "Interrupt Echo loop and restart"

## Who Can Run This

- **Eddie** — primary
- **Any awake triplet** — if 1-2 are down, the survivor runs wake check
- **Emergency:** If all 3 down, Eddie runs from PC

## After Wake

Update dashboard: `http://2.24.118.123:18791/status`
