# Permanent Domain Deployment — Traefik + Let's Encrypt

When a real domain is available, Traefik provides auto-provisioned HTTPS — no tunnel needed.

## Setup Pattern

### 1. DNS (User does this)
Add A record in domain registrar DNS panel:
- **Type:** A
- **Name:** subdomain (e.g., `sqhq`)
- **Value:** VPS public IP (e.g., `2.24.118.123`)
- **TTL:** 3600

### 2. Traefik File Provider Config
Create dynamic config at `/docker/traefik/dynamic/<name>.yml`:

```yaml
http:
  routers:
    appname:
      rule: "Host(`subdomain.domain.com`)"
      entrypoints:
        - websecure
      service: appname
      tls:
        certresolver: letsencrypt
  services:
    appname:
      loadBalancer:
        servers:
          - url: "http://localhost:PORT"
```

**Note:** SQHQ is a systemd service (not Docker), so Traefik routes to `localhost:PORT` via file provider — no Docker labels needed.

### 3. Enable File Provider in Traefik docker-compose.yml

Add to the `command:` section:
```yaml
- --providers.file.watch=true
- --providers.file.directory=/docker/traefik/dynamic
```

Add volume mount:
```yaml
volumes:
  - /docker/traefik/dynamic:/docker/traefik/dynamic:ro
```

### 4. Restart Traefik
```bash
cd /docker/traefik && docker compose down && docker compose up -d
```

Check logs for errors:
```bash
docker logs traefik-traefik-1 --tail 20
```

### 5. Verify
```bash
curl -sL -o /dev/null -w "%{http_code}" https://subdomain.domain.com/app
curl -s https://subdomain.domain.com/manifest.json | head -5
```

## Pitfalls

### 🔴 YAML Backtick Escaping
Traefik Host rules use backticks: `` Host(`example.com`) ``. Shell heredocs can corrupt backtick characters.

**Symptom:** `yaml: line N: found unknown escape character` on Traefik startup.

**Fix:** Use double-quoted heredoc (`<< "EOF"`) to prevent shell expansion. Verify with:
```bash
cat /docker/traefik/dynamic/<name>.yml | od -c | grep '`'
```
Backtick = byte 0x60. If you see something else, the file was corrupted.

### 🔴 WebAuthn Origin Must Match Domain
WebAuthn passkeys are bound to origin (protocol + domain + port). After changing domains:

1. Set `WEBAUTHN_RP_ID=subdom...com` (no protocol, no port) in app `.env`
2. Set `WEBAUTHN_ORIGIN=https:...com` in app `.env`
3. **Existing passkeys won't work** — user must re-register on new domain
4. Restart app service: `systemctl restart sqhq`

### 🔴 Traefik Needs Time for Let's Encrypt
First HTTPS request may take 10-30 seconds while Let's Encrypt provisions the cert. Subsequent requests are instant. If you get a cert error on first load, just refresh.

## Current SQHQ Setup
- **URL:** `https://sqhq.tripp109.cloud`
- **VPS:** 2.24.118.123, Tailscale: 100.85.111.32, Port: 3456
- **Traefik config:** `/docker/traefik/dynamic/sqh.yml`
- **DNS:** A record `sqhq` → `2.24.118.123` on `tripp109.cloud` (Hostinger)
- **systemd service:** `sqhq.service`
