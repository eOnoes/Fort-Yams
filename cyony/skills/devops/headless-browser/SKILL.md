---
name: headless-browser
description: "Working in constrained Linux VPS/containers without root/sudo or package managers. Covers headless Chromium install, Cloudflare tunnels for exposing services, user-space tools (npx/pip/Rust), and deployment workarounds on Docker containers with no daemon access."
tags: [browser, chromium, devops, container, vps, tunnel, cloudflare, hosting, no-sudo]
created: 2026-06-04
---

# Working on Constrained Linux VPS / Containers

When you're in a Docker container or stripped-down VPS with **no root/sudo**, no package manager, and no daemon — but you still need to run browsers, expose web apps, or do things a normal server would do.

## Signal Detection

- `sudo: command not found` or `Permission denied` on apt/apt-get
- Can't install Docker Engine (no daemon socket)
- Services bind to 0.0.0.0 locally but are unreachable from the public IP
- Need a browser for screenshots or headless automation
- Need to expose a dev server to external users

---

## Part 1: Headless Chromium

Install and configure a headless Chromium browser when package managers are unavailable.

### Quick Install (Direct Chromium Snapshot)

```bash
SNAPSHOT=$(curl -s https://storage.googleapis.com/chromium-browser-snapshots/Linux_x64/LAST_CHANGE)
curl -L -o /tmp/chrome-linux.zip \
  "https://storage.googleapis.com/chromium-browser-snapshots/Linux_x64/${SNAPSHOT}/chrome-linux.zip"
python3 -c "
import zipfile
with zipfile.ZipFile('/tmp/chrome-linux.zip', 'r') as z:
    z.extractall('/tmp/chrome-linux')
"
chmod +x /tmp/chrome-linux/chrome-linux/chrome
```

### Container Headless Flags

```bash
--headless=new
--no-sandbox
--disable-crashpad-for-testing
--disable-gpu
```

Without `--disable-crashpad-for-testing`, Chromium crashes with "FD ownership violation" due to missing D-Bus in containers. The crash noise in stderr is cosmetic — screenshots and DOM dumps still work.

### Chromium Crash in No-Root Container

Chromium 151+ (2026) crashes with `posix_spawn chrome_crashpad_handler: Permission denied` when run in containers without crashpad handler permissions.

**Fix:** Use `--disable-breakpad` or ensure the binary has execute permissions. The crash is cosmetic — Chromium still works for screenshots and DOM dumps. The crash trace is stderr noise.

---

## Part 2: Exposing Services via Cloudflare Tunnel

When your app binds to 0.0.0.0 but is unreachable on the public IP (cloud firewall or NAT blocking), use a **Cloudflare quick tunnel**:

```bash
npx cloudflared tunnel --url http://localhost:PORT
```

Creates a public HTTPS URL like `https://random-words.trycloudflare.com` proxied through Cloudflare's edge.

### Pitfalls

- **No uptime guarantee** — quick tunnels are for testing, not production
- **Random URL each time** — restart = new hostname. For stable URLs, use a named tunnel with a Cloudflare account
- **Buffer warning is safe** — `failed to sufficiently increase receive buffer size` is harmless
- **Kill old tunnel before starting new one** — if the old cloudflared stays alive, it keeps serving stale backend content. Kill both `next` and `cloudflared` processes before restarting. A fresh tunnel gets a fresh hostname and fresh connection.
- **Cloudflare edge caching** — the tunnel may serve cached HTML for a short time after the backend restarts. This manifests as old chunk names in the HTML even after a clean build. Full process restart (server + tunnel) is the only reliable fix.
- **Next.js dev mode blocks cross-origin tunnel requests** — `next dev` rejects requests from `*.trycloudflare.com` with "Blocked cross-origin request to Next.js dev resource." The page may load initially but HMR/WebSocket and subsequent navigations fail with "Unauthorized" in cloudflared logs. The symptom is confusing: the first page load works (200) but clicking links or hot-reloading fails silently. **Fix in `next.config.mjs`:** add `allowedDevOrigins: ['*.trycloudflare.com']`. Required for dev mode; production builds (`next start`) don't have this restriction. The tunnel logs will show `malformed HTTP response "Unauthorized"` errors until this is set. Next.js auto-detects the config change and restarts the dev server — no manual restart needed.
- **localtunnel via npx is unreliable** — on this VPS, `npx localtunnel --port 3000` produces no output at all (no URL, no error, no stderr). The process starts but never prints the URL. Use cloudflared instead.
- **cloudflared binary not in PATH** — on containers without package managers, download the binary directly: `curl -sL https://github.com/cloudflare/cloudflared/releases/latest/download/cloudflared-linux-amd64 -o /tmp/cloudflared && chmod +x /tmp/cloudflared`. The `npx cloudflared` approach also works but is slower to start. Direct binary download is ~30MB and takes 5-10 seconds on a fast connection.

---

## Part 3: User-Space Tool Installation

| What you need | How to get it |
|---|---|
| Node.js tools | `npx --yes <package>` |
| Python packages | `pip3 install --user <pkg>` |
| Rust/Cargo binaries | `cargo install <crate>` |
| Prebuilt binaries | `curl -L` → `python3 -m zipfile` or `tar -xzf` → `chmod +x` |

---

## Part 4: Deploying Next.js on a Rootless VPS

### Full Workflow

```bash
cd /opt/data/MyApp
rm -rf .next        # Always clean before production build
npx next build
npx next start -p 3000 -H 0.0.0.0 &

# Separate terminal / process:
npx cloudflared tunnel --url http://localhost:3000
```

### Workspace Root Fix

If Next.js shows the warning about multiple lockfiles and infers the wrong workspace root, the build output goes to the wrong directory (e.g. `/opt/data/.next/` instead of `/opt/data/MyApp/.next/`).

**Fix in `next.config.mjs`:**
```mjs
const nextConfig = {
  turbopack: {
    root: import.meta.dirname,
  },
};
```

**CRITICAL:** Use `import.meta.dirname`, NOT `__dirname`. ESM modules (`.mjs` extension) don't have `__dirname`.

### Stale Build Detection

**Symptom:** Page loads HTML but immediately shows "This page couldn't load." Browser console shows 500 on `.js` chunks or `.css` chunks.

**Cause:** Next.js generates static `.html` files with hardcoded chunk names. Rebuilding without cleaning `.next` leaves old HTML referencing nonexistent chunks. The CSS file can also have a double-dot name like `0c3qzfn1vlpn..css` (a Next.js Turbopack artifact).

**Diagnosis:**
```bash
curl -s http://localhost:PORT/app | grep -oE 'chunks/[^\"]+\\.js'
curl -s http://localhost:PORT/app | grep -oE 'chunks/[^\"]+\\.css'
ls .next/static/chunks/
# Cross-reference — mismatched names = stale build
```

**Fix:** `rm -rf .next && npx next build` — always.

### Client-Only Component Pattern (Fix React #310)

When `"use client"` components read `localStorage` or browser APIs at render time, Next.js production crashes with **React error #310** (hydration mismatch).

**Fix:** Split into two files:

**`page.tsx`** (route — thin wrapper):
```tsx
"use client";
import dynamic from "next/dynamic";
const AppShell = dynamic(() => import("./app-shell"), { ssr: false });
export default function AppPage() { return <AppShell />; }
```

**`app-shell.tsx`** (actual component):
```tsx
"use client";
export default function AppShell() {
  // Use useState, useEffect, localStorage freely here
  // Never ran on server → zero hydration mismatch
}
```

Add `suppressHydrationWarning` to root `<html>` and `<body>` in `layout.tsx`.

### Port Already in Use (EADDRINUSE)

**Symptom:** `Error: listen EADDRINUSE: address already in use 0.0.0.0:PORT` after killing processes.

**Fix sequence (escalating):**
```bash
# Level 1
kill $(ps aux | grep "next start" | grep -v grep | awk '{print $2}') 2>/dev/null

# Level 2: Nuclear — also kills cloudflared
kill -9 $(ps aux | grep -E "next|node|npm|cloudflared" | grep -v grep | awk '{print $2}') 2>/dev/null

# Level 3: Verify
python3 -c "
import socket
s = socket.socket()
try:
    s.bind(('0.0.0.0', PORT)); print('free'); s.close()
except: print('blocked')
"
```

If still blocked: socket is in `TIME_WAIT`. Use a different port:
```bash
npx next start -p $((PORT+1)) -H 0.0.0.0
```
Then restart Cloudflare tunnel on the new port.

**Zombie processes** (`<defunct>`) are harmless — they hold no resources.

### Chunk Verification Script

After deploying, run this BEFORE the user hits a stale chunk error:

```python
import requests, re
url = 'http://localhost:3000'
html = requests.get(f'{url}/app', timeout=10).text
chunks = re.findall(r'chunks/([^\"]+\.(?:js|css))', html)
bad = 0
for c in set(chunks):
    r = requests.get(f'{url}/_next/static/{c}', timeout=5)
    status = '✅' if r.status_code == 200 else f'❌ {r.status_code}'
    if r.status_code != 200: bad += 1
    print(f'{status} {c}')
print(f'\n{len(set(chunks))} assets, {bad} bad')
```

---

## Part 5: Styling Patterns (Welding Glass / Dark Overlay)

For apps on dark gradient backgrounds where you want content panels to feel like looking through tinted glass:

```css
.content-panel {
  background: rgba(10, 12, 8, 0.55);
  backdrop-filter: blur(3px);
}
```

The `rgba(10, 12, 8, ...)` gives a greenish-black welding lens tint. The 0.55 opacity lets the background gradient show through faintly. The 3px blur softens text edges against the gradient, mimicking how your eyes can't quite focus through tinted glass.

**Avoid** values lower than 0.4 (too transparent — text becomes unreadable against busy gradients) or higher than 0.75 (too opaque — you lose the "glass" effect).

---

## Pitfalls (General)

- **Treat `.next/` as ephemeral cache**, not build artifacts. Always `rm -rf .next` before production builds.
- **When the HTML serves but JS/CSS chunks 404/500**, it's stale build or wrong build directory. Nuke `.next/`, rebuild.
- **CSS chunks get stale too** — same root cause as JS chunk 404s. The CSS file name (often double-dotted like `..css`) 500s or 404s. The page loads but has no styling. Fix: `rm -rf .next && npx next build`.
- **Don't add `webpack:` config** when Next.js 16 defaults to Turbopack — causes build errors.
- **`output: 'export'` won't work** for apps with auth or dynamic routes — needs a running server.
- **`npx next build` from wrong directory** happens when Next.js infers workspace root from the wrong `package-lock.json`. Fix with `turbopack.root` in next config.
- **Always kill the tunnel** when restarting the backend. Old tunnel → stale cached HTML → user sees old chunk names.
