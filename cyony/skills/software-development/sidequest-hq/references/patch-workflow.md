# SQHQ Patch Workflow

## Pattern
Patches are numbered spec files in `PATCHES/` that Codex builds against. Cyony writes the spec, Codex executes, Cyony audits and deploys.

## Directory Structure
```
PATCHES/
  001-chat-tighten.md
  002-chat-swipe-actions.md
  003-rebrand-scout-to-cyony.md
  ...
```

## Workflow (6 steps)
1. **Eddie requests** → feature, fix, or change
2. **Cyony writes spec** → `PATCHES/NNN-name.md` with: summary, why, changes (code blocks), verification steps
3. **Codex builds** → `codex exec --dangerously-bypass-approvals-and-sandbox "Apply PATCH NNN: ..."`
4. **Cyony audits** → search_files for old patterns, verify new patterns exist, check zero leftover references
5. **Git push** → `git add -A && git commit && git push origin main`
6. **Deploy** → `rm -rf .next && npm run build` → kill old server/tunnel → start fresh

## Codex Prompt Template
```
Apply PATCH NNN: [title].

Read PATCHES/NNN-name.md for full details.

Summary of changes to [file]:
1. [change 1]
2. [change 2]
...

Do NOT modify [files to leave alone].
Run TypeScript check after changes.
```

## Audit Checklist
After Codex completes:
- `search_files` for old patterns (e.g., old class names, old role types) → expect 0 matches
- `search_files` for new patterns → expect matches
- Verify `npm run typecheck` passed in Codex output
- Verify `npm run build` passed in Codex output

## Pitfalls
- **CSS `position: sticky` AND `position: fixed` BOTH fail in SQHQ's app shell** — `.app-shell` has `overflow: hidden` which breaks sticky. `.workspace` has `backdrop-filter: blur(3px)` which creates a new containing block, trapping `position: fixed` elements inside it so they scroll with the workspace instead of staying viewport-locked. **Correct fix: flex layout.** Make `.workspace-page` a flex column with `height: 100%; overflow: hidden`. Headers are `flex-shrink: 0` (outside scroll area). Content goes in `.workspace-scroll` with `flex: 1; overflow-y: auto`. No position tricks needed — headers naturally stay put because they're structurally outside the scroll container. **Critical: use `height: 100%` NOT `100vh`** — `.workspace` has padding, so `100vh` overflows and the outer container scrolls the header away. See `references/patch-004-design-system.md` for the full CSS and JSX patterns.
- **Codex flags**: Only `--dangerously-bypass-approvals-and-sandbox` works for non-interactive. `--full-auto`, `-q`, `--yolo` are NOT valid flags. Use `codex exec` (not bare `codex`) for one-shot tasks.
- **Stale .next**: ALWAYS `rm -rf .next` before rebuilding after Codex changes. Old chunks cause `Cannot find module` runtime errors.
- **Port conflicts**: Kill old next-server processes before starting new ones. `ps aux | grep next-server | grep -v defunct` to find live processes.
- **Tunnel restart**: Kill old cloudflared process before starting new tunnel. Old tunnel serves stale cached HTML.
- **File renames**: Codex handles `git mv` for file renames (e.g., ScoutPanel.tsx → CyonyPanel.tsx). Verify the rename happened with `search_files`.
- **Unicode in patch tool**: The `patch` tool cannot match unicode characters (e.g., `←`, `«`, emoji). When replacing unicode in files, fall back to `sed` in terminal: `sed -i 's/old_unicode/new_unicode/g' file.tsx`. The `patch` tool works fine for ASCII-only replacements.
- **🔴 iron-session + Next.js 15 middleware requires Node.js runtime**: Next.js 15 defaults middleware to Edge runtime, but iron-session v8 uses Node.js crypto APIs (`createHmac`). Without explicit runtime config, the middleware silently fails to decrypt session cookies — login succeeds (cookie is set) but the middleware redirects back to `/login` because it can't read the session. **Fix:** Add `export const runtime = "nodejs";` as the FIRST line of `src/middleware.ts`. Rebuild after. This affects BOTH host and VPS deployments.
- **🔴 Auth password hash must be bcrypt, not plaintext**: When adding `bcrypt.compare()` to the login route, ALWAYS verify the database actually stores a bcrypt hash. If `db.ts` seeds `password_hash` as a plaintext string (even if bcryptjs is imported), `bcrypt.compare()` will always fail and login is broken. Check the INSERT statement in `initSchema()`. Fix: use `bcrypt.hashSync("password", 12)` at runtime in the INSERT, NOT a hardcoded string. The login page must also have an actual password input field — check for hardcoded `signIn("wrong_password")` calls that bypass the form entirely. After any auth changes: (1) verify DB has bcrypt hash, (2) verify login page has input field, (3) test login manually via curl before pushing.

## Completed Patches (as of 2026-07-01)
- **001**: Chat tighten (new chat button, archive/delete, auto-delete empty, remove icons, thicker back arrow, slide toggle)
- **002**: Swipe-to-archive/delete on session cards (SwipeableCard wrapper, gold/red reveals)
- **003**: Rebrand Scout/Chloe → Cyony (system prompt, role types, component names, CSS, display names)
- **004**: Unified Glass UI — complete workspace redesign. Frosted glass headers via flex layout (NOT position:fixed — see pitfall), 0 border-radius, 45° diagonal card cuts via clip-path, single-expand cards with smooth max-height transitions, dual summary bars on Ledger/Paper Trail, new RemindersWorkspace with recurrence, Paper Trail 3-option Add (Manual/Picture/CSV), year selector. All 6 tabs share identical design language.
- **005**: Biometric / Passkey Auth — WebAuthn integration with @simplewebauthn/server+browser. Passkeys table, register/login flows, "Use passkey" button on login screen, post-password registration prompt. See [references/patch-005-biometric-auth.md](references/patch-005-biometric-auth.md).
- **006**: Desktop Layout — Responsive desktop layout with persistent 64px left icon rail (L1) and content area (C1). Activates at 1024px+ via `@media (min-width: 1024px)`. Desktop rail has SVG icon nav for each workspace, Cyony wrench at bottom. Content fills remaining space. Cyony panel opens as right sidebar (380px) instead of centered overlay. FAB hidden on desktop. Home feed uses 3-column stats grid and 2-column reminder grid. Mobile layout untouched. Uses `window.matchMedia` for JS detection + CSS media queries.

## PWA Installation
SQHQ is installable as a Progressive Web App:
- `manifest.json` in `/public/` with `display: "standalone"`
- Service worker at `/public/sw.js` for caching
- Meta tags in `layout.tsx`: `apple-mobile-web-app-capable`, `theme-color`, viewport with `viewport-fit=cover`
- Icons: `/public/icon-192.png` and `/public/icon-512.png` (placeholder — needs proper icon)

### 🔴 HTTPS Required for Install Prompt
Chrome/Firefox **will not show the install prompt** (3-dot menu → "Install app" or address bar icon) unless the site is served over **HTTPS** (or localhost). HTTP sites load fine but the install option is completely hidden.

**Options to get HTTPS:**
1. **Cloudflare tunnel** — fastest for dev/testing. `cloudflared tunnel --url http://localhost:PORT` gives a `*.trycloudflare.com` HTTPS URL instantly.
2. **Tailscale Serve** — for private tailnet HTTPS. Requires **admin enablement first** (one-time): visit `https://login.tailscale.com/admin/serve` → enable. Then: `tailscale serve --bg --set-path / http://localhost:PORT`. Access via `https://100.x.x.x` or MagicDNS hostname.
3. **Traefik + Let's Encrypt** — production HTTPS on VPS with a real domain. Needs a domain pointed at the VPS public IP.

**Pitfall:** If user reports "no install option" on Chrome, first check if the URL is HTTP. That's almost always the cause.

### 🔴 WebAuthn Passkey Behavior on Android
When a passkey is synced to the user's Google account and the phone is already unlocked, **Chrome auto-selects the passkey without re-prompting for biometric**. This is expected WebAuthn behavior — the device considers itself already authenticated. The biometric prompt only appears when:
- Device is locked
- Passkey is device-bound (not synced)
- User has multiple passkeys and must choose

Do NOT treat silent passkey selection as a security bug. It's by design.

## VPS Deployment (Tailscale)
See [references/vps-deployment.md](references/vps-deployment.md) for full deployment steps.
- VPS: 2.24.118.123, Tailscale: 100.85.111.32, Port: 3456
- App runs as systemd service `sqhq`
- Deploy: tar → scp → extract → preserve .env + data → npm install → rebuild → restart
- Eddie accesses via Tailscale on phone/desktop — bypasses work WiFi firewalls
