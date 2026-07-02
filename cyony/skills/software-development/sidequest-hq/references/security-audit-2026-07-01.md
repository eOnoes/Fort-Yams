# SideQuestHQ Security Audit — July 1, 2026

## Kimi→Codex Audit Workflow

For production readiness audits, use this two-agent pattern:
1. **Kimi for security/audit** — dispatch via `delegate_task` with `toolsets: ["terminal", "file"]`. Kimi reads all source files, checks for vulnerabilities, produces prioritized findings.
2. **Codex for fixes** — dispatch via `delegate_task` with `acp_command: "codex"` and `acp_args: ["--acp", "--stdio"]`. Codex executes the fixes, runs `npx tsc --noEmit` after each, commits when done.
3. **Cyony rebuilds** — `rm -rf .next && npm run build`, restart server, verify.

## Security Fixes Applied (2026-07-01)

### Critical (Fixed)
- **Login was broken** — accepted ANY password (plaintext check, no bcrypt.compare)
- **Snooze-log had no auth** — all three handlers (POST/GET/PATCH) unprotected
- **Hardcoded MiMo URL** — moved to env variable

### High (Fixed)
- **No rate limiting** — added 5 attempts / 15 min per IP on login
- **No security headers** — added X-Frame-Options DENY, X-Content-Type-Options nosniff, Referrer-Policy
- **30-day session expiry** — reduced to 7 days
- **No server-side route protection** — created `src/middleware.ts`
- **Plaintext password in DB** — now bcrypt-hashed at runtime

### Medium (Fixed)
- **16 dead files deleted** — ~3,000 lines of unused code removed
- **Duplicate login page removed** — `login-page.tsx` deleted
- **Password: `hualslx`** — Eddie's known password, bcrypt cost 12

## Remaining Items (Not Yet Done)
- WebAuthn/biometric login (Eddie requested fingerprint/PIN)
- CSP headers
- Input validation (Zod schemas)
- CSRF protection
- Property tracker module

## Files Changed
- `src/app/api/auth/login/route.ts` — bcrypt check + rate limiter
- `src/app/api/snooze-log/route.ts` — auth on all handlers
- `src/app/api/voice/route.ts` — env variable for MiMo URL
- `src/lib/session.ts` — 7-day expiry
- `next.config.mjs` — security headers
- `src/middleware.ts` — NEW: server-side auth
- `src/lib/db.ts` — bcrypt hash at runtime
- `src/app/login/page.tsx` — password input field

## Codex Command Reference
```bash
codex exec --dangerously-bypass-approvals-and-sandbox 'your prompt here'
```
- Must be in a git repo
- Use `pty=true` for interactive
- Use `background=true` for long tasks
- After Codex modifies code: `rm -rf .next && npm run build`
