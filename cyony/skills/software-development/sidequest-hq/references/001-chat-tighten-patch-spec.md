# SQHQ Chat Patch — v1

**Date:** June 30, 2026
**Author:** Cyony
**Target:** SideQuestHQ — VoiceAgent chat module
**Status:** Ready for Codex

---

## Overview

Six targeted changes to the chat/agent interface. All changes are scoped to:
- `src/app/components/VoiceAgent.tsx`
- `src/app/styles/voice-agent.css`
- `src/app/styles/workspaces.css`
- `src/app/api/chat/sessions/route.ts`
- `src/lib/store.ts` (if new functions needed)

**DO NOT rebuild what exists. PATCH only what's listed below.**

---

## Change 1: New Chat Button — Color Accent

**Goal:** Make the "Start New Chat" button visually distinct from the session list below.

**Current:** `background: #111`, `border: 1px dashed #333`, `color: #888`

**Target:** Subtle gold accent tint.

**CSS (voice-agent.css):**
```css
.va-new-chat-btn {
  background: linear-gradient(135deg, rgba(255, 211, 61, 0.08) 0%, rgba(255, 211, 61, 0.03) 100%);
  border: 1px solid rgba(255, 211, 61, 0.25);
  color: #ffd33d;
}
.va-new-chat-btn:hover {
  background: linear-gradient(135deg, rgba(255, 211, 61, 0.14) 0%, rgba(255, 211, 61, 0.06) 100%);
  border-color: rgba(255, 211, 61, 0.4);
  color: #ffe066;
}
.va-new-chat-icon {
  background: rgba(255, 211, 61, 0.12);
  border: 1px solid rgba(255, 211, 61, 0.3);
  color: #ffd33d;
}
```

---

## Change 2: Archive & Delete on Chat Sessions

**Goal:** Let users archive or delete old conversations.

### Backend — New API route

**New file:** `src/app/api/chat/sessions/[id]/route.ts`

```typescript
import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/lib/db";
import { getSession } from "@/lib/session";

export async function PUT(req: NextRequest, { params }: { params: { id: string } }) {
  const session = await getSession();
  if (!session.isLoggedIn) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { archived } = await req.json();
  const db = getDb();
  db.prepare("UPDATE chat_sessions SET archived = ? WHERE id = ?").run(archived ? 1 : 0, params.id);
  return NextResponse.json({ ok: true });
}

export async function DELETE(_req: NextRequest, { params }: { params: { id: string } }) {
  const session = await getSession();
  if (!session.isLoggedIn) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const db = getDb();
  db.prepare("DELETE FROM chat_messages WHERE session_id = ?").run(params.id);
  db.prepare("DELETE FROM chat_sessions WHERE id = ?").run(params.id);
  return NextResponse.json({ ok: true });
}
```

### Frontend — Store + API functions

Add `archiveChatSession` and `deleteChatSession` to `src/lib/api.ts` and `src/lib/store.ts`.

### Frontend — UI on session items

On each `.va-history-item`, add action buttons visible on hover:

**CSS:**
```css
.va-history-actions {
  display: none; gap: 8px; margin-top: 8px;
}
.va-history-item:hover .va-history-actions { display: flex; }
.va-history-action-btn {
  background: none; border: 1px solid #2a2a2a; color: #555;
  font-size: 11px; padding: 4px 10px; border-radius: 6px;
  cursor: pointer; font-family: var(--font-mono, inherit);
  transition: all 0.15s;
}
.va-history-action-btn:hover { border-color: #555; color: #aaa; }
.va-history-action-btn.delete:hover { border-color: #b53333; color: #b53333; }
```

**Behavior:** Archive removes from list (sets archived=1). Delete shows confirmation, then removes permanently.

---

## Change 3: Auto-Delete Empty Sessions

**Goal:** No orphaned empty sessions.

In `goToLanding()` and `startNewChat()`, check if current session is empty and delete it:

```typescript
const isEmptySession = messages.length === 0 ||
  (messages.length === 1 && messages[0].role === 'user')
```

Delete before navigating away.

---

## Change 4: Remove Quick-Action Icons from Chat View

Remove the key/card/pin utility icon row from the chat view JSX. Pin may be useful elsewhere — relocate later.

---

## Change 5: Back Arrow Visibility

**CSS (workspaces.css):**
```css
.workspace-back {
  color: #888; font-size: 20px; font-weight: 700; letter-spacing: -1px;
}
.workspace-back:hover { color: #ccc; }
```

**JSX:** Change `←` to `«` in all back buttons.

---

## Change 6: Text/Voice Mode Toggle — Slide Redesign

Replace two-button toggle with a sliding toggle. Default to voice mode.

**JSX:** Replace `.va-mode-toggle` with a slider component.

**CSS:** New `.va-mode-slider` with `.voice` and `.text` states, knob animation.

**Default:** Change `useState<'text' | 'voice'>('text')` to `useState<'text' | 'voice'>('voice')`.

---

## Testing Checklist

- [ ] New Chat button — gold tint visible
- [ ] Hover session card — archive/delete buttons appear
- [ ] Archive — session disappears, data preserved
- [ ] Delete — confirmation prompt, permanent removal
- [ ] Empty session — create, leave without typing, verify gone
- [ ] Back arrow — `«` visible and bold on all screens
- [ ] Mode toggle — slides smoothly, defaults to voice
- [ ] Voice mode — purple accent; Text mode — gold accent
- [ ] No regressions in existing features

## Files Modified

| File | Changes |
|------|---------|
| `VoiceAgent.tsx` | Back arrow, mode toggle, empty session cleanup, icons removal, archive/delete UI |
| `voice-agent.css` | New chat accent, mode slider, session actions |
| `workspaces.css` | Back arrow visibility |
| `api/chat/sessions/[id]/route.ts` | NEW — archive + delete endpoints |
| `store.ts` | archive/delete functions |
| `api.ts` | fetch calls for archive/delete |
