# Stale Chunk Debug Workflow

## Symptom
The app loads (login or shell with "Loading...") but either:
- Shows "This page couldn't load" after auth
- Or console shows 404/500 on JS chunks
- Or a rebuild-seeming restart still shows the old UI

## Root Causes (in order of likelihood)

### 1. Wrong `.next/` directory — Multi-lockfile Twin Hell
When `package-lock.json` exists in **both** `/opt/data/` and `/opt/data/SideQuestHQ/`, Next.js picks `/opt/data/` as the workspace root. Build output goes to `/opt/data/.next/` instead of `/opt/data/SideQuestHQ/.next/`. The server (started from SideQuestHQ/) serves the empty or stale `.next/` in the project dir.

**Fix:** In `next.config.mjs`, set `turbopack.root`:
```js
turbopack: { root: import.meta.dirname }
```
`__dirname` is unavailable in ESM; `import.meta.dirname` is the correct alternative.

**Check:**
```bash
# Check where .next was actually written
ls /opt/data/.next/static/chunks/    # ← wrong location
ls /opt/data/SideQuestHQ/.next/static/chunks/  # ← correct location
```

### 2. Stale HTML from old build cache
Static `.html` files in `.next/server/app/` embed chunk names from the build that generated them. If you rebuild without `rm -rf .next`, the old HTML files persist and reference chunk names that no longer exist.

**Fix:**
```bash
rm -rf .next && npx next build   # Always clean before build
```

**Check:**
```bash
# Extract chunk names from served HTML
curl -s http://localhost:3000/app | grep -oE 'chunks/[^"]+\.js' | sort -u
# Verify every chunk returns 200
for c in $(curl -s http://localhost:3000/app | grep -oE 'chunks/[^"]+\.js'); do
  echo "$c → $(curl -s -o /dev/null -w '%{http_code}' http://localhost:3000/_next/static/$c)"
done
```

### 3. Zombie server process holding stale port
Old `next-server` processes show as `<defunct>` in `ps aux` and the kernel (inetd) still considers the port in use even after the process died. Starting a new server fails silently or the old zombie serves the old build.

**⚠️ ANTI-PATTERN: `pkill -f "next start"` from terminal() kills your own shell.** The `-f` flag matches the full command line including the bash process running your command. Always find specific PIDs first.

**Diagnosis — find stale processes:**
```bash
ps aux | grep -E "node|next" | grep -v grep
# Look at START column — a next-server from "Jun20" is stale
# Example output:
# hermes  3187  ...  Jun20  next-server (v16.2.9)   ← STALE (days old)
# root    31686 ...  02:51  next-server (v16.2.9)   ← recent but may have failed
```

**Fix — kill specific PIDs:**
```bash
kill -9 3187 31686 2>/dev/null   # kill the specific stale PIDs
sleep 3  # Wait for kernel to clean up TIME_WAIT sockets
# Verify port is free
curl -s -o /dev/null -w "%{http_code}" http://localhost:3000 || echo "port free"
```

**Fallback — nuclear option (only if specific PIDs don't work):**
```bash
kill -9 $(ps aux | grep -E "next|node|npm|cloudflared" | grep -v grep | awk '{print $2}') 2>/dev/null
sleep 3
# Use a different port as escape hatch
npx next start -p 3001 -H 0.0.0.0
```

**Check port state:**
```bash
python3 -c "
import socket
s = socket.socket()
try:
    s.bind(('0.0.0.0', 3000))
    print('free'); s.close()
except: print('in use')
"
```

### 4. Tunnel pointing at dead/old server
Cloudflare tunnel captures whatever is on the target port when it starts. If you restart the server on the same port but the tunnel was already running, it still hits the old process until the tunnel itself is restarted.

**Fix:** Always restart tunnel after restarting the server:
```bash
kill $(ps aux | grep cloudflared | grep -v grep | awk '{print $2}')
sleep 2
npx cloudflared tunnel --url http://localhost:3000
# Get new URL from output logs
```

### 5. `ssr: false` dynamic imports (not a bug)
Components loaded via `dynamic(() => import(...), { ssr: false })` don't render in static HTML. This means:
- Grepping the static `.html` for "mobile-nav" returns 0 hits — expected
- The component only appears after client JS loads
- Don't use HTML grep as a confidence check for these components
- **Do** check that the JS chunk containing the component loads correctly (200, not 500)

### 6. CSS-only rebuild produces same hash
When YOU change CSS files but no JS component changed, the CSS bundle hash may stay identical (Next.js Turbopack produces deterministic content-addressable hashes). This is NOT a bug — it means the CSS content didn't change from the build's perspective.

**When this fools you:**
- You patched `responsive.css` thinking you fixed the padding
- You rebuild
- The CSS file hash is identical
- The problem persists
- **Root cause:** The actual CSS fix was in a file that didn't get included, or the fix was in a different import path.

**Real scenario:** responsive.css had `padding: 20px` overriding base.css's safe-area padding. Fixing it in base.css didn't help because responsive.css (imported last) won. The CSS hash unchanged because the override was in responsive.css all along — the bug was the *cascade order*, not the individual rule.

**Lesson:** When CSS hash doesn't change despite source changes, the fix is in the wrong file or the cascade order is fighting you.

### 7. Two-level chunk loading (Turbopack code splitting)
Next.js Turbopack can split app-shell into one chunk that **dynamically references** another chunk containing the actual component code. The HTML only references the first-level chunk — the component code lives in a second chunk loaded at runtime.

**Example from this session:**
- HTML referenced `2n89gtwx8_opc.js` (app-shell entry)
- That chunk loaded `2vavoiiitlk0e.js` at runtime (MenuCards + other components)
- Grepping only the HTML-referenced chunks for component code returned 0 hits — false negative!

**Correct verification — check ALL chunks, not just HTML-referenced ones:**
```bash
# 1. Find which chunk has your component code (on disk)
grep -rl "YourComponent\|your-css-class" /opt/data/SideQuestHQ/.next/static/chunks/*.js 2>/dev/null | xargs -I{} basename {}

# 2. Check if that chunk is referenced from another chunk
grep -rl "CHUNK_NAME_FROM_STEP_1" /opt/data/SideQuestHQ/.next/static/chunks/*.js 2>/dev/null | xargs -I{} basename {}

# 3. Verify the first-level chunk is in the HTML
curl -s http://localhost:3000/app | grep -oE 'chunks/[^"]+\.js' | sort -u

# 4. Verify BOTH chunks are served (200, not 500)
curl -s -o /dev/null -w "%{http_code}" "http://localhost:3000/_next/static/chunks/FIRST_LEVEL.js"
curl -s -o /dev/null -w "%{http_code}" "http://localhost:3000/_next/static/chunks/SECOND_LEVEL.js"

# 5. Verify component content is ACTUALLY in the second chunk
curl -s "http://localhost:3000/_next/static/chunks/SECOND_LEVEL.js" | grep -o "YourComponent\|your-css-class"
```

**Rule: NEVER say "deployed" until step 5 passes.** The chunks being 200 means nothing if they're stale chunks from an old build.

## Quick Diagnostic Script
```python
import requests, re, sys

url = sys.argv[1] if len(sys.argv) > 1 else 'http://localhost:3000'
html = requests.get(f'{url}/app', timeout=10).text
chunks = re.findall(r'chunks/([^"]+\.js)', html)
print(f'App HTML has {len(chunks)} chunk references')
errors = 0
for c in set(chunks):
    r = requests.get(f'{url}/_next/static/chunks/{c}', timeout=5)
    if r.status_code != 200:
        print(f'  ERROR: {c} → {r.status_code}')
        errors += 1
if errors == 0: print('All chunks healthy!')
else: print(f'{errors} broken chunks')
```
