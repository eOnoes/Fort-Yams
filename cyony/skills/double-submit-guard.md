# Double-Submit Guard Pattern (Mobile Web)

## The Problem

On mobile (especially through Cloudflare tunnels with latency), tapping a "Send" button that doesn't instantly show feedback causes the user to tap again... and again... and again. Each tap fires a separate request. Result: 3-5 identical server calls, AI army responses, duplicate database writes, confusion.

**The root cause in Next.js/React forms:** The button disables based on `input.trim()` only — once the form fires, if `handleSubmit` doesn't clear the input and show a disabled state *synchronously*, the button stays active long enough for multiple taps to queue.

## The Fix (Two-Layer Guard)

### Layer 1: `useRef` Boolean Guard (The Bouncer)

```tsx
const pendingRef = useRef(false);

function handleSubmit(event: FormEvent) {
  event.preventDefault();
  const text = input.trim();
  if (!text || pendingRef.current) return;       // ← IMMEDIATE reject
  setInput("");                                   // ← clear input now
  setSending(true);                               // ← show disabled state
  pendingRef.current = true;                      // ← lock the gate
  sendToScout(text);
}
```

**Why `useRef` not `useState`:** `useState` updates are async (batched in React). Between `setSending(true)` and the next render, `pendingRef.current` is already `true` — synchronous, happens in the same tick. The ref beats the next tap every time.

### Layer 2: Button Visual Feedback

```tsx
<button type="submit" disabled={!input.trim() || sending}>
  {sending ? <span className="scout-sending">✎ Sending...</span> : "Send"}
</button>
```

CSS:
```css
.scout-compose-send:disabled {
  opacity: .4;
  cursor: default;
  transition: opacity .15s;
}
```

The button visually dims + text changes to "Sending..." *on the same tick* as the guard fires. The user sees the change and doesn't tap again.

### Cleanup Both Paths

Both the success path and the error path must clear the guard:

```tsx
async function sendToScout(text: string) {
  try {
    // ... API call ...
  } catch {
    // ... handle error ...
  }
  pendingRef.current = false;   // ← ALWAYS run
  setSending(false);            // ← ALWAYS run
  onRequestSent(voiceMode);
}
```

## Why This Works on Mobile

| Problem | Ref Guard Fix |
|---|---|
| Tap sends 3 requests | 2nd/3rd tap hits `pendingRef.current === true` → rejected |
| Button looks active | `disabled={sending}` → opacity drops to 0.4 immediately |
| Input still shows text | `setInput("")` clears on first tap → nothing left to send |
| User doesn't know it worked | "Sending..." text with pulse animation → visual confirmation |

## Variations

- **API retry case:** Remove `pendingRef.current = false` from `catch` so a failed submission still blocks retries until the user explicitly re-opens the panel
- **Race condition with fast completes:** The ref is in the same tick — even if the API returns in 50ms, the 2nd tap arrives in the same event loop tick and sees `true`
- **Form submission (not API):** Same pattern — ref prevents double-submit even on fast local operations like `setState` calls
