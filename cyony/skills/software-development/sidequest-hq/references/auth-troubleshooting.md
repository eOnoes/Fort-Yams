# SideQuest HQ Auth Troubleshooting

## Corrupted Bcrypt Hash (2026-06-29)

**Problem:** The `users` table `password_hash` can become corrupted (shows as garbage like `hualslx` instead of valid `$2b$...` bcrypt hash).

**Symptoms:** Landing page loads but "Enter HQ" button produces 500 errors on all frontend resources. Browser console shows every JS/CSS chunk failing with 500.

**Root cause:** `src/app/api/auth/login/route.ts` calls `bcrypt.compareSync(password, user.password_hash)`. Invalid hash → bcrypt throws → API returns 500.

**Fix:** Remove bcrypt check for click-to-enter auth. The login route should accept any non-empty password and set the session directly:
```typescript
// Click-to-enter: accept any non-empty password
const session = await getSession();
session.userId = user.id;
session.isLoggedIn = true;
await session.save();
return NextResponse.json({ success: true, name: user.name });
```

**Verification:** After fix, hard refresh (Ctrl+Shift+R) and click "Enter HQ" — should redirect to `/app`.
