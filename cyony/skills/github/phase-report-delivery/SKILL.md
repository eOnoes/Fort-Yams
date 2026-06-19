---
name: phase-report-delivery
description: Always dual-deliver build/phase reports — write to repo for persistence AND send as downloadable MEDIA attachment to Telegram. Never just "wrote it to disk."
trigger: Completing a build phase, milestone deliverable, audit report, design doc, doctrine docs, or any markdown report from a build process
tags: [report, delivery, telegram, media, workflow, tripp-reason, tripp-control]
---

# Phase Report Delivery

## The Rule
Every build-phase report gets TWO destinations **unless Eddie says otherwise**:
1. 📁 **Written to repo** — persistent, version-controlled, discoverable
2. 💬 **Delivered as compact code block in chat** — collapsed copy-paste style

Writing to disk alone is not done. The full report always exists on disk as the canonical version. The chat delivery is a compressed summary in a code block — key sections only, condensed tables, short verdict.

### Compact Code Block Mode (DEFAULT — updated 2026-06-08)

Eddie explicitly prefers compact code blocks over MEDIA file attachments for reports: "I love that copy paste there. Please. Use this going forward fam." and "please put them in the 'Code Copy' format that is ez to copy paste."

The DEFAULT behavior at phase completion is:
1. Write full report to disk (canonical version)
2. Deliver compressed version as a code block in chat
3. Optionally include a 1-2 line status line before the code block

```
# <Report Title>
STATUS: <PASS/BLOCKED>

KEY FINDING 1
KEY FINDING 2

TABLE: condensed, key columns only

NEXT: <recommendation>
```

**Format rules:**
- Keep to ~30-40 lines max in chat
- Condense tables to key columns only
- Drop verbose sections (FILES REVIEWED, detailed methodology)
- Preserve: STATUS, BLOCKERS, VALIDATION RESULT, NEXT STAGE
- Skip: full file lists, step-by-step procedures, historical context

### Mobile HTML Mode (🆕 2026-06-07)
When Eddie is on mobile (Telegram) and asks for an audit or report, generate a **dark-themed HTML file** and deliver as MEDIA attachment + a compact chat summary:

```
1. Generate HTML file at reports/<name>.html
2. Deliver MEDIA:<path> via send_message to Telegram
3. Include 3-5 line text summary below the MEDIA line
```

**HTML spec:**
- Dark theme (GitHub-style): `--bg:#0d1117`, `--surface:#161b22`, `--accent:#79c0ff`
- Mobile-friendly: `max-width:800px`, `font-size:15px`, no horizontal scroll
- Card-based layout: `.card` with border-radius, subtle border
- Decision boxes: green background + border for PASS/BLOCKED markers
- Tables condensed, badges for status (✅ ❌ ⚠️)
- No JavaScript, no external CSS, single self-contained file

This is distinct from the Compact Code Block mode (default for desktop) and MEDIA mode (for handoffs to other agents). Mobile HTML is triggered by Eddie saying he's on his phone, or by context indicating mobile delivery.

### When to Use MEDIA Attachments
MEDIA file delivery is the exception for desktop. Use when:
- Eddie explicitly asks for a downloadable file on desktop
- The report is being handed off to Kimi/Tripp/Echo for review
- The file is a non-report artifact (source pack, archive, config)
- **Mobile HTML mode** (above) — always MEDIA for HTML reports on mobile

## Procedure (Default)
```
1. Write full report to /opt/data/shared/<Project>/reports/<filename>.md
2. Deliver compact code block in chat (~30 lines max)
3. Include 1-2 line verdict before the block
```

When a genuine finding needs immediate attention (blocker, failure, safety concern), flag it in the verdict line. Otherwise the code block speaks for itself.

## Procedure (MEDIA Mode — only when explicitly asked)
```
1. Write report to /opt/data/shared/<Project>/reports/<filename>.md
2. send_message(target="telegram", message="MEDIA:<absolute-path>")
3. Brief 1-2 line summary only
```

## Multi-File Handoffs
When delivering 3+ related documents (doctrine bundles, multi-phase reports):
- Combine into single `.txt` with section dividers (use `combine-deliverable.sh` if available)
- Send ONE FILE, not a barrage of attachments

## Report Quality Standards
- GPT-style structure: executive summary, status badges, tables
- Include validation results (commands run + outcomes)
- Include scope compliance matrix (every forbidden item confirmed absent)
- Include design decisions with rationale and trade-offs

## Order of Operations (important)
Report delivery happens AFTER the phase is actually DONE — i.e., after:
1. All source files written
2. `pnpm typecheck` + `pnpm build` pass clean
3. Smoke tests pass
4. Smoke test files removed
5. Scope compliance verified (`ls -d packages/*/` confirms only allowed dirs)

Do NOT write-and-send the report mid-phase. The report claims PASS status — if scope verification later finds a problem, you'd need to re-send a corrected report. Better to send once and be right.

## Pitfalls
- **Default is code block, not MEDIA** — the old "Just MD" mode (MEDIA file + silence) is retired. Compact code block in chat is the new default (2026-06-04).
- **Code blocks should be ~30-40 lines max** — condense aggressively. The full report on disk is canonical; the chat block is a summary. Drop verbose sections, keep verdict + blockers + next step.
- **Full report always written to disk** — the code block is a summary, not a replacement. The canonical version lives in `reports/`.
- Absolute paths only for MEDIA: when used (relative paths silently fail)
- Don't send the same report twice (check before re-sending)
- No routine cron pings about reports (Eddie finds them noisy)
- **The \"big ole break down\" trap:** When Eddie says \"I go over the MD file with the planner, so I will get the gist of it all,\" he is NOT asking for a bullet-point summary. The code block IS the summary — deliver it and stop. Don't add extra commentary below the block.
- Report's "FILES CREATED" list must be accurate — verify against actual `packages/<pkg>/src/` contents, don't trust memory of what you wrote.

## Support Files
- `references/monorepo-smoke-tests.md` — Quick smoke test patterns for pnpm workspace monorepos (relative dist imports, inline node -e, pitfalls with .mjs + type imports)
