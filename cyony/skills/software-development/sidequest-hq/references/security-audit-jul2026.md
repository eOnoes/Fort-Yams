# SQHQ Security Audit & Fixes — July 1, 2026

## Critical Issues Found & Fixed

### 1. Login Accepted Any Password (FIXED)
**File:** `src/app/api/auth/login/route.ts`
- The login route had a comment "Click-to-enter: accept any non-empty password"
- bcrypt.compare() was never called — any non-empty string worked
- **Fix:** Restored bcrypt.compare() check, reject with 401 if password doesn't match

### 2. Plaintext Password Hash in Database (FIXED)
**File:** `src/lib/db.ts`
- User table stored `password_hash: "hualslx"` as plaintext
- INSERT OR IGNORE never overwrote the existing record
- **Fix:** Changed to `bcrypt.hashSync("hualslx", 12)` at runtime

### 3. No Server-Side Route Protection (FIXED)
**File:** `src/middleware.ts` (created)
- No middleware existed — `/app` route was unprotected server-side
- Any user could navigate directly to `/app` bypassing login
- **Fix:** Created Next.js middleware checking iron-session on all routes except /login, /api/auth/login, and static assets

### 4. Snooze-Log Endpoint Had No Auth (FIXED)
**File:** `src/app/api/snooze-log/route.ts`
- POST, GET, PATCH handlers had no session checks
- **Fix:** Added getSession() + isLoggedIn check to all three handlers

### 5. No Rate Limiting (FIXED)
**File:** `src/app/api/auth/login/route.ts`
- **Fix:** Added in-memory rate limiter (5 attempts per 15 min per IP)

### 6. Hardcoded MiMo API URL (FIXED)
**File:** `src/app/api/voice/route.ts`
- **Fix:** Moved to `process.env.MIMO_API_URL` with fallback

### 7. No Security Headers (FIXED)
**File:** `next.config.mjs`
- **Fix:** Added X-Frame-Options DENY, X-Content-Type-Options nosniff, Referrer-Policy

### 8. Session Expiry Too Long (FIXED)
**File:** `src/lib/session.ts`
- Was 30 days, **reduced to 7 days**

## Dead Code Removed (16 files)
- `src/app/login-page.tsx` (duplicate login page)
- `src/app/components/GarageWorkspace.tsx`
- `src/app/components/LedgerWorkspace.tsx`
- `src/app/components/PaperTrailWorkspace.tsx`
- `src/app/components/RentalsWorkspace.tsx`
- `src/app/components/PeopleWorkspace.tsx`
- `src/app/components/RemindersWorkspace.tsx`
- `src/app/components/AssetsWorkspace.tsx`
- `src/app/components/CommandWorkspace.tsx`
- `src/app/components/InvestmentsWorkspace.tsx`
- `src/app/components/CryptoWorkspace.tsx`
- `src/lib/persistence.ts`
- `src/lib/selectors.ts`
- `src/app/components/Sidebar.tsx`
- `src/app/components/Topbar.tsx`
- `src/app/components/MobileNav.tsx`

## Pitfalls

### Next.js Stale Server Cache
**Symptom:** After rebuild, HTML references old webpack hash (e.g., `webpack-1ce5490db20133e7.js`) but build output has new hash (`webpack-fe33d5a8b99292ed.js`). Browser gets 400 errors on JS files.
**Cause:** Old `next start` process still running, serving stale HTML from previous build.
**Fix:** Kill ALL next processes (`pkill -f next`), verify port is free, then start fresh. The `rm -rf .next && npm run build` alone is NOT enough — the old server must be killed first.

### Login Page Hardcoded Password
**Symptom:** Login page had `signIn("sidequest")` hardcoded with no input field.
**Cause:** Previous development left a debug/test shortcut.
**Fix:** Always verify login page has actual password input field, not hardcoded values.

### Database INSERT OR IGNORE Won't Update Existing Rows
**Symptom:** Changing the seed password hash in code doesn't update the database.
**Cause:** `INSERT OR IGNORE INTO users` skips if the user already exists.
**Fix:** Use `INSERT OR REPLACE` or handle the update separately. Or generate the hash at runtime like `bcrypt.hashSync("hualslx", 12)`.
