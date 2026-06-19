# No-Cloud Local Auth Pattern for Next.js

When you need auth but don't want Supabase/Firebase/Auth0 — just a simple password gate that's offline-first and needs no accounts.

## Architecture

- **Storage**: localStorage only (no server, no DB, no API)
- **Auth**: Simple hash function (not crypto-grade — just a gate)
- **User**: Single-user implicit ("Eddie" / "boss" / no name at all)
- **Recovery**: Date-based reset code (`sidequest-YYYY-MM-DD`) + backup code
- **Key insight**: Same auth state across all components via React Context

## Implementation

### Auth Context (`lib/auth.tsx`)

```tsx
"use client";

import { createContext, useContext, useEffect, useState } from 'react'

type User = { name: string }

type AuthContext = {
  user: User | null
  loading: boolean
  signIn: (password: string) => Promise<string | null>
  signOut: () => Promise<void>
  isLocked: boolean
  setPassword: (pw: string) => void
}

const AUTH_KEY = 'sidequest:auth'
const HASH_KEY = 'sidequest:pw'
const DEFAULT_PASSWORD = 'sidequest'  // shared default

function hash(str: string): string {
  let h = 0
  for (let i = 0; i < str.length; i++) {
    h = ((h << 5) - h) + str.charCodeAt(i)
    h |= 0
  }
  return 'h' + Math.abs(h).toString(36)
}

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null)
  const [loading, setLoading] = useState(true)
  const [isLocked, setIsLocked] = useState(false)

  useEffect(() => {
    const auth = localStorage.getItem(AUTH_KEY)
    const pw = localStorage.getItem(HASH_KEY)
    if (!pw) {
      // First visit ever — seed the default password
      localStorage.setItem(HASH_KEY, hash(DEFAULT_PASSWORD))
      setIsLocked(true)
      setLoading(false)
    } else if (auth) {
      setUser({ name: 'Eddie' })
      setLoading(false)
    } else {
      setLoading(false)
    }
  }, [])

  async function signIn(password) {
    const stored = localStorage.getItem(HASH_KEY)
    if (!stored) {
      setPassword(password)
      return null
    }
    if (hash(password) !== stored) return 'Wrong password'
    localStorage.setItem(AUTH_KEY, 'true')
    setUser({ name: 'Eddie' })
    return null
  }

  async function signOut() {
    localStorage.removeItem(AUTH_KEY)
    setUser(null)
  }

  return (
    <AuthContext.Provider value={{ user, loading, signIn, signOut }}>
      {children}
    </AuthContext.Provider>
  )
}

export const useAuth = () => useContext(AuthContext)
```

### Password Reset

Recovery uses a **date-based code** + a backup code:

```tsx
const today = new Date()
const expectedCode = `sidequest-${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, "0")}-${String(today.getDate()).padStart(2, "0")}`
// Example: sidequest-2026-06-17
const backupCode = "sidequest-reset"  // always works
```

Reset flow:
1. Click "Forgot password?"
2. Enter today's date-based code (or backup)
3. Enter new password
4. localStorage clears old hash, sets new one, reloads

### Key Design Decisions

| Decision | Why |
|---|---|
| Simple hash, not bcrypt | This is a local gate, not a server auth system. If someone has localStorage access, they have all your data anyway. |
| Default password `sidequest` | Easy to type on phone, memorable, shared with team. User can change with reset flow. |
| Date-based reset code | No email needed. The code changes daily so an old screenshot can't be reused indefinitely. |
| `isLocked` flag | Shows "Set a password" on first visit vs "Enter password" on return visits. |
| localStorage only | Works fully offline. No network requests. No server needed. |

### Pitfalls

- **Clearing browser data wipes auth** — User loses password and saved password. Recovery code still works.
- **Not synced across devices** — Each device/browser has its own auth state. This is by design for offline-first apps.
- **Different browser = different auth** — Chrome and Safari on the same phone have separate localStorage. User needs to set password on each.
- **hash() is NOT cryptographically secure** — It's a mild obfuscation, not encryption. Don't use this for banking apps or sensitive data.
- **Reset code requires knowing the scheme** — It's "security through obscurity" but appropriate for a personal tool.
