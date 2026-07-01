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

## Works for
- Next.js 15.x (Webpack and Turbopack)
- Any Next.js project where Codex or similar agent modifies source files
