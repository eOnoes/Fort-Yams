# Stale Build Chunks — Diagnosis & Fix

## The Problem

Next.js generates static `.html` files during `next build` with **hardcoded JavaScript chunk filenames** like `chunks/0~h13b.80ke18.js`. When you rebuild without fully cleaning `.next/`, the old HTML files persist and reference chunks that no longer exist in the new build.

**Result:** The page HTML loads (you see "Loading..." and the title bar), then immediately shows "This page couldn't load. Reload to try again, or go back." The browser DevTools console shows `Failed to load resource: the server responded with a status of 500` for a JavaScript chunk.

## Identifying Stale Chunks

```bash
# Get the chunk names the HTML is requesting
curl -s http://localhost:PORT/app | grep -oE 'chunks/[^"]+\.js'

# List chunks that actually exist in the build
ls .next/static/chunks/

# Cross-reference — any chunk in the HTML but NOT in .next/static/chunks/ is stale
```

**Key indicator:** The HTML references chunks like `0~h13b.80ke18.js` but the build output has completely different names like `13q~c8wacl.e_.js`. This means the HTML was generated in a **previous** build cycle.

## The Fix

```bash
# Works every time
rm -rf .next && npx next build
```

Deleting individual `.html` files is ineffective. The entire `.next/` directory is ephemeral cache, not a build artifact.

## Variant: Server Was Started Before Rebuild

**Symptom:** Build succeeds, chunks exist on disk, but the running server returns 500 for a chunk.

**Cause:** The Next.js server was started BEFORE the rebuild. It loaded the old chunk manifest into memory at startup. Even though the new chunks exist on disk, the server's in-memory routing table still points to old chunk names.

**Diagnosis:** Build output in `.next/static/chunks/` has the correct files, but the server returns 500 for them.

**Fix:** Kill the server, THEN rebuild, THEN start:
```bash
fuser -k -9 3000/tcp
sleep 2
npx next build
npx next start -p 3000 -H 0.0.0.0
```

**This is different from stale build chunks** — in that case, the HTML references chunks that don't exist on disk. Here, chunks exist on disk but the server's in-memory routing is stale. The distinction matters: nuking `.next/` won't fix this, and restarting the server won't fix stale HTML. Both require the full kill → clean → rebuild → restart cycle.

## Variant: Port Occupied After Kill

After killing the Next.js server, you may get `EADDRINUSE` when trying to restart. This is usually a TIME_WAIT socket or zombie process.

**Fix:** `fuser -k -9 3000/tcp` (plain `fuser -k` sometimes fails on zombies), then `sleep 2` before restarting. If still blocked, use a different port and update the tunnel.

**Note:** `lsof` may not be available on constrained VPS. Use `fuser 3000/tcp 2>/dev/null && echo "still occupied" || echo "port free"` or read `/proc/net/tcp` (port 0BB8 = 3000 in hex).

## Variant: CSS Chunk Also Gets Stale

Same stale-chunk problem affects CSS. The HTML references a `chunks/x.css` file that doesn't match the build output.

**Symptom:** The page loads but has no styling (raw unstyled HTML). Console shows the CSS file returning 500 (21 bytes "Internal Server Error") or 404.

**Fix:** Same as JS chunks — `rm -rf .next && npx next build`.

## Variant: Build Went to Wrong Directory

**Symptoms:** Build succeeds with zero errors, but the output goes to the **wrong directory** (e.g., `/opt/data/.next/` instead of `/opt/data/MyApp/.next/`).

**Root cause:** Next.js detects **multiple lockfiles** and infers the parent directory as the workspace root.

**Fix:** Add `turbopack.root` to `next.config.mjs`:
```mjs
const nextConfig = {
  turbopack: {
    root: import.meta.dirname,
  },
};
export default nextConfig;
```

**CRITICAL:** Use `import.meta.dirname`, NOT `__dirname`. ESM modules (`.mjs` extension) don't have `__dirname`.

## Prevention

- Always `rm -rf .next` before rebuilding when deploying to production
- Always kill the running server BEFORE rebuilding (in-memory chunk manifest)
- If you need to iterate quickly, use dev mode (`next dev`) — it serves from memory, not static HTML
- The final production build should always start from a clean `.next/`
- Check the workspace root warning in build output — if it fires, add `turbopack.root` before proceeding
