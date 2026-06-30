# Click-to-Enter Auth Bug (2026-06-28)

## Symptom
Landing page loads but "Enter HQ" button returns 500 errors on all resources (JS, CSS, API routes).

## Root Cause
The bcrypt password hash in the `users` table can become corrupted (e.g., `hualslx` instead of a valid `$2a$...` hash). The login route (`src/app/api/auth/login/route.ts`) calls `bcrypt.compareSync()` against this corrupt hash, which throws an error and returns a 500 response.

## Fix
Remove bcrypt check in `src/app/api/auth/login/route.ts`:

```typescript
// DELETE these lines:
// const valid = bcrypt.compareSync(password, user.password_hash);
// if (!valid) {
//   return NextResponse.json({ error: "Wrong password" }, { status: 401 });
// }

// KEEP the session creation block (session.userId = user.id, etc.)
```

## Verification
```bash
curl -X POST http://localhost:3000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"password":"any"}'
# Should return: {"success":true,"name":"Eddie"}
```

## Why This Happens
Original setup used bcrypt for password auth. When auth changed to click-to-enter, the login route was updated to accept any non-empty password but the bcrypt check was left in. If the hash gets corrupted (DB migration, manual edit, backup restore), the check fails silently with 500s.

## Debugging Steps
1. Check browser console: all resources return 500
2. Check server logs for bcrypt errors or EADDRINUSE
3. Test the login API directly with curl
4. If bcrypt error: remove the check (fix above)
5. If EADDRINUSE: kill zombie next-server processes (`fuser -k 3000/tcp`)
