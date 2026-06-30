# React Hydration Error #310 — Next.js Production Client-Only Fix

## Error

```
Uncaught Error: Minified React error #310
visit https://react.dev/errors/310 for the full message
```

## Root Cause

Next.js server-renders `"use client"` components during the build, generating static HTML. When the client hydrates, it re-runs the component and produces different HTML (e.g. because `localStorage` returns a different value on the client). React sees the mismatch and **refuses to hydrate the entire tree** — throwing #310 in production (dev mode shows warnings but doesn't crash).

This specifically happens with:
- Components that read `localStorage` or `sessionStorage` during render
- Components that access `window` or `document` during render
- Auth state that differs between server (no auth) and client (already logged in)
- Any conditional rendering based on browser-only state

## Fix: `dynamic(() => import(...), { ssr: false })`

Create a **two-file pattern** for every client-only route:

### File 1: Route file (`page.tsx`)

```tsx
"use client";

import dynamic from "next/dynamic";

const MyComponent = dynamic(() => import("./my-component"), { ssr: false });

export default function Page() {
  return <MyComponent />;
}
```

### File 2: Actual component (`my-component.tsx`)

```tsx
"use client";

import { useState, useEffect } from "react";

export default function MyComponent() {
  const [data, setData] = useState("");

  useEffect(() => {
    setData(localStorage.getItem("my-key") || "default");
  }, []);

  return <div>{data}</div>;
}
```

## Why This Works

| Approach | Server Renders | Client Hydrates | Result |
|---|---|---|---|
| `"use client"` only | ✅ Static HTML | 🔄 Re-runs, finds mismatch | 💥 #310 |
| `mounted` guard | ✅ Loading skeleton | 🔄 Hydrates skeleton, then re-renders | 💥 Second render = new mismatch |
| `dynamic(... { ssr: false })` | ❌ Nothing rendered | ✅ Fresh mount, no comparison | ✅ Works |

The key: `ssr: false` tells Next.js to **skip server rendering entirely**. The server emits an empty slot for that component. On the client, React mounts it fresh with no server HTML to compare against — so there's nothing to mismatch.

## Additional: Layout SuppressHydrationWarning

Even with the dynamic import, add these to the root layout to suppress warnings from the top-level HTML tags:

```tsx
// app/layout.tsx
export default function RootLayout({ children }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body suppressHydrationWarning>
        {children}
      </body>
    </html>
  );
}
```

## What DOESN'T Work

- **`mounted` state guard** (`if (!mounted) return <Loading />`) — The server renders the loading skeleton, client hydrates it fine, but then `useEffect` fires, `mounted` flips to `true`, and React re-renders with different HTML. Second render = #310.
- **`suppressHydrationWarning` alone** — Only suppresses warnings, not the actual crash for structural mismatches.
- **Using `useEffect` to set all state** — Only works if the initial server render and first client render produce IDENTICAL output.
- **`typeof window === 'undefined'` guards** — The server runs but doesn't crash; the mismatch still happens on hydration.
