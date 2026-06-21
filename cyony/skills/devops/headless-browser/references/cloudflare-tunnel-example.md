# Cloudflare Tunnel on No-Sudo Container — Real Session Transcript

## Context
VPS running on Hostinger, 96GB disk, Debian 13 (trixie). User `hermes` (UID 10000), no root/sudo, in a Docker container (hostname `a3064f5032b3`, IP `172.16.0.2`). Public floating IP `2.24.118.123` but inbound ports are blocked by cloud firewall.

## The Symptoms (matching against this transcript)

**"App works on localhost but not on public IP":**
```bash
$ curl -s -o /dev/null -w "%{http_code}" http://localhost:3000/
200
$ curl -s -o /dev/null -w "%{http_code}" http://0.0.0.0:3000/
200
$ curl -s -o /dev/null -w "%{http_code}" http://2.24.118.123:3000/
# (hangs / times out)
```

**No listening services on ports 80/443 locally despite answering externally:**
```bash
$ fuser 80/tcp
# (silent — nothing locally)
$ curl -sI http://2.24.118.123:80/
HTTP/1.1 308 Permanent Redirect
Location: https://2.24.118.123/
# Cloud-level proxy handles 80/443, not the container
```

## The Fix

```bash
# In one terminal — production mode (WebSocket HMR doesn't work through tunnels):
cd /opt/data/SideQuestHQ
npx next build
NODE_ENV=production npx next start -p 3000 -H 0.0.0.0

# In another:
npx cloudflared tunnel --url http://localhost:3000
```

**IMPORTANT: Use production mode, not dev mode.** Dev mode (`next dev`) uses WebSockets for hot module reloading. Cloudflare quick tunnels do NOT proxy WebSocket connections correctly, resulting in repeated connection failures in the browser console that can prevent the page from loading fully.

**If you MUST use dev mode through a tunnel** (e.g. for hot reload during testing), add this to `next.config.mjs`:
```mjs
const nextConfig = {
  allowedDevOrigins: ['*.trycloudflare.com'],
};
```
Without this, Next.js blocks cross-origin requests from the tunnel hostname. Tunnel logs will show `Unauthorized` or `malformed HTTP response "Unauthorized"`. With it, dev mode works through the tunnel — HMR WebSocket still fails silently but the page loads and functions correctly.

Also note: Next.js 16 in production mode with `"use client"` components will crash with **React hydration error #310** unless you use the `dynamic(() => import(...), { ssr: false })` pattern. See `references/react-hydration-error-310.md` for the fix.

**Successful tunnel output:**
```
Your quick Tunnel has been created! Visit it at (it may take some time to be reachable):
https://spare-accessing-enrolled-locally.trycloudflare.com
```

**Session URLs (sequential):**
- `https://spare-accessing-enrolled-locally.trycloudflare.com` (first tunnel)
- `https://appointed-angel-sponsor-accepting.trycloudflare.com` (second tunnel, after restart)
- Each restart gets a new random hostname.

## What to Check When It Fails

1. Can the app start at all? → `curl localhost:PORT`
2. Is it binding to all interfaces? → `curl 0.0.0.0:PORT`
3. Can cloudflared reach the app BEFORE starting the tunnel? → yes, it connects to localhost
4. Is cloudflared connecting to Cloudflare? → look for `UDP Connectivity...PASS` and `TCP Connectivity...PASS` in tunnel logs
5. Is the URL responding? → `curl -sI https://XXXX.trycloudflare.com` — expect 200, not 502
