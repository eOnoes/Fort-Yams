# SideQuest HQ Auth Fix (2026-06-29)

## Problem: Corrupted bcrypt hash breaks click-to-enter

The `users` table stores a `password_hash` column, but it can become corrupted (e.g., `hualslx` instead of a valid bcrypt `$2a$...` hash). When this happens, `bcrypt.compareSync()` in `src/app/api/auth/login/route.ts` fails for ANY password, including "sidequest" — returning 401 even though the click-to-enter flow sends "sidequest" as the password.

### Symptoms
- Login page loads, "Enter HQ" button present
- Clicking "Enter HQ" produces no redirect
- Console shows 500 or 401 from `/api/auth/login`
- Server logs: no obvious error, just auth failure

### Root Cause
The password system was vestigial — auth was changed to click-to-enter but the route still had bcrypt verification. If the hash gets corrupted (migration, manual DB edit, etc.), the entire login breaks silently.

### Fix
Remove the bcrypt verification from the login route entirely. Click-to-enter means any non-empty password should create a session:

**File:** `src/app/api/auth/login/route.ts`

```typescript
// BEFORE (broken when hash corrupted):
const valid = bcrypt.compareSync(password, user.password_hash);
if (!valid) {
  return NextResponse.json({ error: "Wrong password" }, { status: 401 });
}

// AFTER (click-to-enter: any non-empty password works):
// Just create the session directly after finding the user.
// No bcrypt check needed.
```

### Verification
After applying the fix:
1. Start dev server: `npx next dev -p 3000`
2. Open login page in browser
3. Click "Enter HQ"
4. Should redirect to `/app` with session cookie set
5. Subsequent visits should auto-login via `/api/auth/check`

### Files Involved
- `src/app/api/auth/login/route.ts` — login endpoint (bcrypt check removed)
- `src/app/api/auth/check/route.ts` — session check (no changes needed)
- `src/app/api/auth/logout/route.ts` — logout (no changes needed)
- `src/lib/auth.tsx` — client-side auth context
- `src/lib/session.ts` — iron-session config (uses SESSION_SECRET from .env.local)
- `data/sqhq.db` — SQLite users table
