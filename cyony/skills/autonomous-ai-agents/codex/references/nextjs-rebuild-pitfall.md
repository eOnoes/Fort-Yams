# Next.js Stale Build Pitfall

## Symptom
After Codex modifies source files, `npm run start` serves the app but the browser shows:
```
Runtime Error
Cannot find module './241.js'
Require stack: .next/server/webpack-runtime.js
```

## Cause
The `.next/cache` and `.next/server` directories contain compiled chunks from the PREVIOUS build. When source files change but `.next` isn't cleaned, the server references chunk hashes that no longer exist.

## Fix
Always clean and rebuild after Codex modifies code:
```bash
rm -rf .next && npm run build
```
Then restart the server.

## Prevention
Add `rm -rf .next` to the build step in any CI/CD or deployment script. Never `npm run start` after code changes without a fresh `npm run build`.

## Related: Stale Server Process (Jul 2026)
After rebuilding, HTML may reference OLD webpack hashes while the new build has DIFFERENT hashes. This happens when an old `next start` process is still running.
**Symptom:** `webpack-XXX.js` returns 400, but the build output has `webpack-YYY.js`.
**Fix:** Kill ALL next processes first: `pkill -f next`, verify port is free (`curl` returns nothing), THEN start fresh. `rm -rf .next && npm run build` alone is not enough — the old server must be killed.

## Works for
- Next.js 15.x (Webpack and Turbopack)
- Any Next.js project where Codex or similar agent modifies source files
