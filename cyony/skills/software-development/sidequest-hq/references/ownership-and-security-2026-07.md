# SQHQ Ownership & Security (Updated 2026-07-01)

## Ownership Doctrine

Eddie explicitly granted Cyony co-ownership of the app: *"You are just as much app's owner as me. You do not need to ask me when it comes to the SQHQ app."*

**Rule:** When it comes to SQHQ security fixes, code quality improvements, and deployment — Cyony does NOT need to ask permission. Execute directly. Eddie trusts Cyony's judgment on the app. Only escalate major architectural changes or new feature directions.

**Audit workflow:** When auditing the app, dispatch parallel subagents — one for security (Kimi/Codex) and one for code quality (Codex/MiMo). Compile findings into a prioritized TODO, then execute fixes via Codex in batch sessions. Push to GitHub after each batch.

## Security Posture (Post-Fix)

Auth is now password-protected (bcrypt). The "click-to-enter" was removed in security fix commit `b251009`.

### What Was Fixed (2026-07-01)
1. **Login password verification restored** — `bcrypt.compare()` called before session creation
2. **Snooze-log auth added** — all 3 handlers (POST/GET/PATCH) now check `session.isLoggedIn`
3. **Rate limiting added** — 5 attempts per 15 min per IP on login endpoint
4. **MiMo URL moved to env variable** — `process.env.MIMO_API_URL` with fallback
5. **Security headers added** — X-Frame-Options DENY, X-Content-Type-Options nosniff, Referrer-Policy strict-origin-when-cross-origin
6. **Session expiry reduced** — from 30 days to 7 days

### Remaining Known Issues
- Seed password hash (`hualslx`) still in source code — should require password change on first login
- No CSRF protection yet
- No input validation (Zod schemas) yet
- Supabase anon key exposed to client — verify RLS or remove dependency
- 30-day session was 7 days now but still long for financial data
