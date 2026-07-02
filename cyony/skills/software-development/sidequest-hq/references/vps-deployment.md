# VPS Deployment Pattern

## VPS Info
- IP: 2.24.118.123
- Tailscale IP: 100.85.111.32
- App port: 3456
- App URL (Tailscale): http://100.85.111.32:3456
- App URL (Production): https://sqhq.tripp109.cloud
- Service: systemctl status sqhq
- App dir: /root/sqhq/
- Traefik config: /docker/traefik/docker-compose.yml
- Traefik dynamic configs: /docker/traefik/dynamic/

## SSH Access
- Key: ~/.ssh/id_ed25519 (resolves to /opt/data/.ssh/id_ed25519 or /root/.ssh/id_ed25519 depending on user)
- User: root
- **Must use explicit `-i` flag** — default SSH agent key doesn't match VPS authorized_keys
- Command: `ssh -i ~/.ssh/id_ed25519 root@2.24.118.123`

## Quick Deploy (small changes, 3 steps)
For patches that only change 1-3 files, skip the tarball and SCP directly:
```bash
# 1. SCP changed files to VPS /tmp
scp -i ~/.ssh/id_ed25519 src/app/app/app-shell.tsx src/app/globals.css root@2.24.118.123:/tmp/

# 2. Copy to correct locations and rebuild
ssh -i ~/.ssh/id_ed25519 root@2.24.118.123 '
  cp /tmp/app-shell.tsx /root/sqhq/src/app/app/app-shell.tsx
  cp /tmp/globals.css /root/sqhq/src/app/globals.css
  rm /tmp/*.tsx /tmp/*.css
  cd /root/sqhq && rm -rf .next && npm run build && systemctl restart sqhq
'
```
**Use when:** Patch touches only app-shell, CSS, and/or 1-2 components.
**Use full tarball when:** Patch adds new files, changes package.json, or touches 5+ files.

## Deployment Steps (6 steps — full deploy)

### 1. Stop VPS service
```bash
ssh -i /opt/data/home/.ssh/id_ed25519 root@2.24.118.123 "systemctl stop sqhq"
```

### 2. Create tarball (exclude node_modules, .next, data, .env, PATCHES)
```bash
cd /opt/data && tar czf /tmp/sqhq-latest.tar.gz \
  --exclude='node_modules' --exclude='.next' --exclude='data' \
  --exclude='.env' --exclude='sidequest.db' --exclude='PATCHES' \
  --exclude='PROMPTS' --exclude='AUDIT_TODO.md' \
  SideQuestHQ/
```

### 3. Transfer to VPS
```bash
scp -i /opt/data/home/.ssh/id_ed25519 /tmp/sqhq-latest.tar.gz root@2.24.118.123:/tmp/
```

### 4. Extract, preserve .env and data
```bash
ssh root@2.24.118.123 "cd /root && mv sqhq sqhq_old && mkdir sqhq && cd sqhq && \
  tar xzf /tmp/sqhq-latest.tar.gz --strip-components=1 && \
  cp ../sqhq_old/.env . && cp -r ../sqhq_old/data ."
```

### 5. Install deps and rebuild
```bash
ssh root@2.24.118.123 "cd /root/sqhq && npm install && rm -rf .next && npm run build"
```

### 6. Restart service
```bash
ssh root@2.24.118.123 "systemctl start sqhq"
```

## Environment Variables (.env)
Critical vars that must be set:
- `SESSION_SECRET` — iron-session encryption key (generated once, never change)
- `WEBAUTHN_RP_ID` — Set to IP or domain for passkey auth (e.g., `*** or `localhost`)
- `WEBAUTHN_ORIGIN` — Full origin URL (e.g., `http:/...456`)
- `MIMO_API_KEY` — For chat/AI features
- `PORT=3456`

## Middleware Runtime Fix
**CRITICAL:** `src/middleware.ts` MUST have `export const runtime = "nodejs";` as the FIRST line. Without this, iron-session silently fails in Next.js 15 Edge runtime — login succeeds but middleware can't decrypt the session cookie and redirects back to /login. This causes a black screen after login.

## Host Machine Deployment
The host machine (Hermes) runs SQHQ on port 3000 via Cloudflare tunnel:
```bash
# Kill old server
ps aux | grep "next-server" | grep -v defunct | grep -v grep | awk '{print $2}' | xargs kill

# Start new server
cd /opt/data/SideQuestHQ && npx next start -p 3000
```

## API Endpoints (added after Patch 006)
- `DELETE /api/documents?id=N` — delete a document by ID. Client store doesn't auto-remove — refresh needed.
- All other CRUD endpoints follow RESTful patterns under `/api/documents`, `/api/ledger`, `/api/vehicles`, `/api/chat`, etc.

## Current URLs (as of 2026-07-01)
| URL | Type | Use |
|-----|------|-----|
| https://sqhq.tripp109.cloud | Production (HTTPS, Traefik + Let's Encrypt) | Primary — Eddie's daily use, PWA install |
| http://100.85.111.32:3456 | Tailscale (private) | Backup — when domain DNS is down |
| http://localhost:3456 | Local (on VPS) | Debugging only |

**When Eddie reports issues:** Always ask which URL he's using. Different URLs = different auth states, different passkey registrations, different HTTPS behavior.

## Verification
After deployment, test:
```bash
# Login flow
curl -s -c /tmp/cookies.txt -X POST http://localhost:3456/api/auth/login \
  -H 'Content-Type: application/json' -d '{"password":"hualslx"}'
curl -s -b /tmp/cookies.txt -o /dev/null -w 'HTTP %{http_code}' http://localhost:3456/app
# Should return HTTP 200 (not 307 redirect)
```

**Production URL test:** `curl -sL -o /dev/null -w "%{http_code}" https://sqhq.tripp109.cloud/app` → 200

**MiMo API key test:** Do NOT construct curl commands with the key (redaction corrupts them). Instead test via the app: open the Cyony chat panel, send a message, and check if a response appears. If "Cyony thinking..." disappears with no response, check `journalctl -u sqhq -n 20` for MiMo errors.

**Python script approach for API testing on VPS:** When you need to test an API endpoint that requires an API key (MiMo, etc.), the safest pattern is:
1. Write a Python script locally that reads the key from `.env` and makes the API call using `urllib.request`
2. SCP the script to the VPS: `scp -i ~/.ssh/id_ed25519 /tmp/test.py root@2.24.118.123:/tmp/`
3. Run it: `ssh -i ~/.ssh/id_ed25519 root@2.24.118.123 'python3 /tmp/test.py'`
This avoids shell `$`-sign interpretation, key redaction, and quote escaping issues that plague curl-in-SSH approaches. The script reads the key from the .env file on the target machine, so no key ever crosses the SSH pipe.

## HTTPS for PWA Install
PWA installation requires HTTPS. Three options on the VPS, in order of preference:

### Option A: Real Domain + Traefik + Let's Encrypt (production, preferred)
Production HTTPS with auto-renewing SSL cert on a real domain.

**Prerequisites:** Domain with DNS access, Traefik already running on VPS.

**Setup (one-time per domain):**
1. User adds DNS A record: `subdomain` → VPS public IP `2.24.118.123`, TTL 3600
2. Create dynamic config on VPS:
```bash
ssh -i ~/.ssh/id_ed25519 root@2.24.118.123 'mkdir -p /docker/traefik/dynamic && cat > /docker/traefik/dynamic/sqh.yml << "EOF"
http:
  routers:
    sqhq:
      rule: "Host(\`subdomain.domain.tld\`)"
      entrypoints:
        - websecure
      service: sqhq
      tls:
        certresolver: letsencrypt
  services:
    sqhq:
      loadBalancer:
        servers:
          - url: "http://localhost:3456"
EOF'
```
3. Add file provider to Traefik docker-compose (`/docker/traefik/docker-compose.yml`):
   - Add to command: `--providers.file.watch=true` and `--providers.file.directory=/docker/traefik/dynamic`
   - Add volume mount: `/docker/traefik/dynamic:/docker/traefik/dynamic:ro`
4. Restart Traefik: `cd /docker/traefik && docker compose restart traefik`
5. Update WEBAUTHN env vars in `/root/sqhq/.env` to match domain
6. Restart SQHQ: `systemctl restart sqhq`

**Pitfalls:**
- Traefik YAML backticks: use literal backticks in Host() rules, not escaped — the file is YAML double-quoted
- WEBAUTHN_RP_ID = domain WITHOUT protocol (e.g., `sqhq.tripp109.cloud`)
- WEBAUTHN_ORIGIN = full URL WITH `https://` (e.g., `https://sqhq.tripp109.cloud`)
- Passkeys are domain-bound — changing domain = users re-register passkeys
- Traefik `exposedbydefault=false` means non-Docker services need file provider, not Docker labels

**Production example:** `sqhq.tripp109.cloud` → VPS 2.24.118.123, Traefik auto-provisions Let's Encrypt cert.

### Option B: Tailscale Serve (private tailnet HTTPS)
**Prerequisite (one-time):** Tailscale Serve must be enabled in admin panel:
- Visit `https://login.tailscale.com/admin/serve` → enable
- Or: Tailscale Admin → Settings → Service Discovery → Enable Serve/Funnel

**Enable on VPS:**
```bash
ssh -i ~/.ssh/id_ed25519 root@2.24.118.123 "tailscale serve --bg --set-path / http://localhost:3456"
```

**Result:** App accessible at `https://100.85.111.32` (HTTPS) — Chrome shows install prompt.

**Pitfall:** Running `tailscale serve` before admin enablement returns a misleading error. The link in the error message leads directly to the enable page.

### Option B: Cloudflare Quick Tunnel (fallback, public)
When Tailscale Serve isn't enabled or user wants quick HTTPS without admin access:

```bash
# Install cloudflared on VPS (one-time)
ssh -i ~/.ssh/id_ed25519 root@2.24.118.123 \
  "curl -sL -o /usr/local/bin/cloudflared https://github.com/cloudflare/cloudflared/releases/latest/download/cloudflared-linux-amd64 && chmod +x /usr/local/bin/cloudflared"

# Start tunnel (background)
ssh -i ~/.ssh/id_ed25519 root@2.24.118.123 \
  "nohup cloudflared tunnel --url http://localhost:3456 > /tmp/cf-sqh.log 2>&1 &"

# Get the URL
ssh -i ~/.ssh/id_ed25519 root@2.24.118.123 "grep 'trycloudflare.com' /tmp/cf-sqh.log"
```

**Result:** Public HTTPS URL like `https://random-words.trycloudflare.com` — Chrome shows install prompt.

**Pitfalls:**
- Random URL each time — restart = new hostname
- No uptime guarantee — for testing, not production
- **Must update WebAuthn env vars** when using a new tunnel domain:
  ```bash
  ssh -i ~/.ssh/id_ed25519 root@2.24.118.123 "sed -i '/^WEBAUTHN/d' /root/sqhq/.env"
  # Then append new WEBAUTHN_RP_ID and WEBAUTHN_ORIGIN matching the tunnel domain
  # Then restart: systemctl restart sqhq
  ```
- Passkeys registered on one domain won't work on another — user must re-register after domain change

## Pitfalls
- **🔴 API key redaction corrupts curl tests** — The system redacts API keys in terminal output (replacing them with `***`). This means any curl command you construct that includes the key will have a corrupted Authorization header, and the test will return "Invalid API Key" even if the actual key on disk is valid. **Do NOT trust curl-based API key tests you construct yourself.** Instead: (1) SCP the key file to the target machine, (2) use a script on the target to read the key from .env and make the API call, or (3) test via the app's actual API route which reads the env var directly. Eddie's correction: "Almost everytime you tell me this about a key. It is bc of how we try to call it. It is HIDING itself on the call."
- **🔴 .env placeholder values on new deployments** — When deploying to a new VPS or recreating .env, verify that all API keys are REAL values, not placeholders like `REPLACE_ME`. The `.env` template may have been created with dummy values that were never updated. Check with `grep API_KEY /root/sqhq/.env | wc -c` — if the key looks like placeholder text, it is. Fix by SCP-ing the real key from the local machine's .env.
- **🔴 Voice route TTS requires DataURL for voiceclone** — The `mimo-v2.5-tts-voiceclone` model requires `audio.voice` to be a `data:audio/wav;base64,...` DataURL, NOT a string name like `"Cyony"`. Passing a string returns `400: audio.voice must be a DataURL for voice clone model`. The reference audio file on VPS is at `public/audio/scout-reference-clone.wav` (NOT the old `../shared/chloe-voice-clone/eddie_chill_reference.wav` path). If the file is missing, TTS silently fails and returns text-only — the Cyony thinking indicator disappears with no response. Check `journalctl -u sqhq | grep "reference audio"` for warnings.
- **SSH requires explicit key flag** — Default SSH agent key doesn't match VPS authorized_keys. Always use: `ssh -i ~/.ssh/id_ed25519 root@2.24.118.123`
- **ALWAYS `rm -rf .next` before rebuild** — stale chunks cause module errors
- **ALWAYS stop service before syncing files** — prevents serving partially-updated code
- **Preserve .env and data/** — these contain secrets and the SQLite database
- **npm install (not --production)** — Next.js needs devDependencies to build
- **Kill old next-server before starting new one** — port conflicts
- **Shell `$`-sign stripping in SSH commands** — When passing JSON with dollar amounts (e.g., `"$1,171.18"`) through SSH heredocs or double-quoted strings, the shell interprets `$1` as a positional parameter and strips it. The result: amounts like `$1,171.18` become `171.18` and `$64.65` become `4.65`. Fix: use Python scripts (written locally, SCP'd to VPS) instead of curl-in-SSH for any API call that includes `$` signs or special characters. The Python script reads auth from cookies and uses `urllib.request` — no shell interpretation.
- **Python `id` built-in conflicts with JSON key** — When parsing API responses in Python, `result['id']` works but `result.id` calls the built-in `id()` function. Always use dict bracket access `result["id"]`, not attribute access, when working with JSON responses from `json.loads()`.
- **Document DELETE endpoint** — `DELETE /api/documents?id=N` deletes a document by ID. Added 2026-07-01. Use for cleaning up duplicate entries. The client-side store doesn't auto-remove deleted items — page refresh needed after deletes.
