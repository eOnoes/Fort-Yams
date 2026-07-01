# SQHQ Patch Workflow

## Pattern
Patches are numbered spec files in `PATCHES/` that Codex builds against. Cyony writes the spec, Codex executes, Cyony audits and deploys.

## Directory Structure
```
PATCHES/
  001-chat-tighten.md
  002-chat-swipe-actions.md
  003-rebrand-scout-to-cyony.md
  ...
```

## Workflow (6 steps)
1. **Eddie requests** → feature, fix, or change
2. **Cyony writes spec** → `PATCHES/NNN-name.md` with: summary, why, changes (code blocks), verification steps
3. **Codex builds** → `codex exec --dangerously-bypass-approvals-and-sandbox "Apply PATCH NNN: ..."`
4. **Cyony audits** → search_files for old patterns, verify new patterns exist, check zero leftover references
5. **Git push** → `git add -A && git commit && git push origin main`
6. **Deploy** → `rm -rf .next && npm run build` → kill old server/tunnel → start fresh

## Codex Prompt Template
```
Apply PATCH NNN: [title].

Read PATCHES/NNN-name.md for full details.

Summary of changes to [file]:
1. [change 1]
2. [change 2]
...

Do NOT modify [files to leave alone].
Run TypeScript check after changes.
```

## Audit Checklist
After Codex completes:
- `search_files` for old patterns (e.g., old class names, old role types) → expect 0 matches
- `search_files` for new patterns → expect matches
- Verify `npm run typecheck` passed in Codex output
- Verify `npm run build` passed in Codex output

## Pitfalls
- **Codex flags**: Only `--dangerously-bypass-approvals-and-sandbox` works for non-interactive. `--full-auto`, `-q`, `--yolo` are NOT valid flags.
- **Stale .next**: ALWAYS `rm -rf .next` before rebuilding after Codex changes. Old chunks cause `Cannot find module` runtime errors.
- **Port conflicts**: Kill old next-server processes before starting new ones. `ps aux | grep next-server | grep -v defunct` to find live processes.
- **Tunnel restart**: Kill old cloudflared process before starting new tunnel. Old tunnel serves stale cached HTML.
- **File renames**: Codex handles `git mv` for file renames (e.g., ScoutPanel.tsx → CyonyPanel.tsx). Verify the rename happened with `search_files`.
- **Unicode in patch tool**: The `patch` tool cannot match unicode characters (e.g., `←`, `«`, emoji). When replacing unicode in files, fall back to `sed` in terminal: `sed -i 's/old_unicode/new_unicode/g' file.tsx`. The `patch` tool works fine for ASCII-only replacements.

## Completed Patches (as of 2026-06-30)
- **001**: Chat tighten (new chat button, archive/delete, auto-delete empty, remove icons, thicker back arrow, slide toggle)
- **002**: Swipe-to-archive/delete on session cards (SwipeableCard wrapper, gold/red reveals)
- **003**: Rebrand Scout/Chloe → Cyony (system prompt, role types, component names, CSS, display names)
