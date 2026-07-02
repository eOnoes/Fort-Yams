# Patch 005 — Biometric / Passkey Authentication

## Overview
Added WebAuthn (Passkeys) support for biometric login. Applied 2026-07-01.

## How It Works
1. **Registration**: After first password login, prompt "Save passkey for faster login?" → browser triggers biometric → stores credential on device
2. **Authentication**: On login screen, "Use passkey" button → browser triggers biometric → verifies → logs in

## Dependencies
- `@simplewebauthn/server` — server-side WebAuthn verification
- `@simplewebauthn/browser` — client-side WebAuthn prompts

## Database
New table `passkeys` in `db.ts` initSchema:
```sql
CREATE TABLE IF NOT EXISTS passkeys (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  public_key TEXT NOT NULL,
  counter INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  FOREIGN KEY (user_id) REFERENCES users(id)
);
```

## Session Changes
Added `currentChallenge?: string` to `SessionData` in `src/lib/session.ts`.

## API Routes
- `POST /api/auth/passkey/register/options` — generate registration challenge
- `POST /api/auth/passkey/register/verify` — verify registration, store credential
- `POST /api/auth/passkey/login/options` — generate authentication challenge
- `POST /api/auth/passkey/login/verify` — verify authentication, set session
- `GET /api/auth/passkey/list` — list registered passkeys
- `DELETE /api/auth/passkey/[id]` — delete a passkey

## WebAuthn Config (`src/lib/passkey.ts`)
```typescript
const rpName = "SideQuest HQ";
const rpID = process.env.WEBAUTHN_RP_ID || "localhost";
const origin = process.env.WEBAUTHN_ORIGIN || "http://localhost:3456";
```

## Environment Variables
- `WEBAUTHN_RP_ID` — Set to IP or domain for passkey auth
- `WEBAUTHN_ORIGIN` — Full origin URL

## Platform Behavior
- **Android Chrome**: If phone is unlocked and passkey synced to Google, Chrome may auto-select without biometric prompt. Normal — device is already authenticated.
- **iOS Safari**: Face ID / Touch ID prompt appears.
- **Desktop**: Uses platform authenticator (Windows Hello, etc.)

## Files Modified
- `src/lib/passkey.ts` — NEW
- `src/lib/db.ts` — passkeys table
- `src/lib/session.ts` — currentChallenge
- `src/app/api/auth/passkey/` — NEW: all routes
- `src/app/login/page.tsx` — passkey UI
- `package.json` — @simplewebauthn deps
