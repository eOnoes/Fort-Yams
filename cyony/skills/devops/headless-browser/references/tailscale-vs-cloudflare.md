# Tailscale vs Cloudflare Tunnels — When to Use Which

## Cloudflare Tunnels (trycloudflare.com)
- **Use for:** Public-facing apps, temporary demos, sharing with anyone
- **Pros:** Free, no install on client, public URL
- **Cons:** URL changes on restart, no WebSocket HMR in dev mode, can be blocked by corporate firewalls
- **Setup:** `npx cloudflared tunnel --url http://localhost:PORT`

## Tailscale
- **Use for:** Private apps, work WiFi bypass, always-on access for specific people
- **Pros:** Encrypted tunnel bypasses firewalls, stable IP, works on any network, no exposed ports
- **Cons:** Requires Tailscale app on every client device, not public
- **Setup:** Install Tailscale on VPS + client devices, use Tailscale IP (100.x.x.x)

## Decision Matrix
| Need | Use |
|---|---|
| Eddie accessing SQHQ from work WiFi | Tailscale |
| Public demo for someone without Tailscale | Cloudflare tunnel |
| Always-on app with stable address | Tailscale |
| Quick temporary share | Cloudflare tunnel |
| Bypass corporate firewall/content filter | Tailscale |
| Multiple non-technical users | Cloudflare tunnel |
| **Production app with own domain** | **Traefik + Let's Encrypt** |

## Traefik + Let's Encrypt (Production HTTPS)
When you have a domain pointed at the VPS, Traefik auto-provisions free HTTPS certs via Let's Encrypt. No tunnel, no random URLs.

**Prerequisites:**
- Domain with DNS A record pointing to VPS public IP
- Traefik running in Docker on the VPS with Docker socket mounted

**Setup:** Add a file provider config at `/docker/traefik/dynamic/<name>.yml` with Host rule + TLS certresolver. Enable file provider in Traefik's docker-compose command args. See `sidequest-hq` skill `references/traefik-permanent-domain.md` for full setup pattern and YAML pitfalls.

**Key advantage:** Stable URL, auto-renewing certs, no dependency on tunnel process staying alive.

## Tailscale Install (Linux VPS)
```bash
curl -fsSL https://tailscale.com/install.sh | sh
tailscale up --auth-key=tskey-auth-...
# Note the Tailscale IP: tailscale ip -4
```

## Tailscale Install (Client)
- iOS/Android: App Store → Tailscale → log in
- macOS/Windows: https://tailscale.com/download
- Access app at `http://<tailscale-ip>:PORT`
