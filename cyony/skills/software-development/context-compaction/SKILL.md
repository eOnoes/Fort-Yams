---
name: context-compaction
description: "Progressive context compaction doctrine for long agent sessions. Apply early, apply often — never let context reach 90%. Captures the Goose 5-stage protocol + Cyony's hard operational preference (compact at 60%, not when desperate)."
tags: [context, compaction, session-management, goose, doctrine]
version: 1.0.0
created: 2026-06-02
---

# Context Compaction

## Trigger
- At the START of any session expected to run 30+ tool calls
- When context usage approaches 60%, 70%, 75%, or 85%
- When a task will require reading multiple large docs, audits, or code reviews
- Whenever you feel "stuffed" — that feeling is a late signal and you're already past due

## The One Rule (User Hard Preference)

**Compact early, compact often. NEVER wait until desperate.**

The user has explicitly corrected: "compact as soon as you deem it. Do not let yourself get congested with context please." Sitting at 80% is the WRONG behavior for this user. The correct behavior is triggering Goose Stage 2 at **60%** with zero hesitation.

A pass that compacts at 60% and ends the session with 30% breathing room is a success. A pass that compacts only when forced is a failure, even if no data was lost.

## Goose 5-Stage Protocol (Applied)

Full theoretical reference: `references/goose-protocol.md`

### Stage 1 — Truncate (any threshold)
Cut any single tool output > 50K chars to summary + first/last 5K. Append `[truncated: X chars removed]`. Zero LLM cost. Apply continuously, not at a threshold.

### Stage 2 — Summarize at **60% context**
Use the CHEAPEST available model (DeepSeek V4 Flash at $0.03/M, or Haiku) to summarize each completed tool call + result pair into 2-3 sentences.

**DO NOT use your primary expensive model for this.** The summarization model needs to summarize — it doesn't need to reason. Goose calls this `complete_fast()`.

Format per summary:
```
[compacted] Tool: <name>
Result: <2-3 sentence summary of what was found/done>
```

### Stage 3 — Compress at **70% context**
Condense 3+ consecutive user↔assistant exchanges on the same subtopic into a single "sub-conversation summary" block preserving:
- The user's original intent
- Key decisions made
- Current state/outcome
- Any unresolved questions

### Stage 4 — Prune at **75% context**
Score each remaining message by relevance to the CURRENT task. Remove:
- Greetings, acknowledgments
- "standing by" messages
- Meta-discussion about process (unless user just corrected the process)
- Stale tool outputs already summarized

Keep: decisions, code, errors, user directives, recent work.

### Stage 5 — Archive at **85% context** (emergency exit)
Archive everything to disk (persist to shared volume OR session handoff doc). Extract back into context ONLY:
- Current task definition
- Last 3-5 exchanges
- Outstanding decisions/action items
- File paths to archived content (NOT content itself)

**Never let it get here.** Stages 2-4 should keep you well below 85%.

## Compaction Metadata Block

After every compaction, emit this at the start of surviving context:
```
[CONTEXT COMPACTION — turn N at T]
- Removed: M tool calls, K messages, X sub-conversations
- Archived to: <file path or "in-memory compressed">
- Current working set: <one-line description>
```

## Resume ≠ Full Reload

After compaction, load ONLY:
- The compaction metadata block above
- The current working set
- File paths to archived content

The LLM can read the archived file later via `read_file` if needed. Never stuff the full archive back into context.

## Memory-Full Fallback

When memory itself is at capacity (e.g. 2100/2200 chars) and you can't add a fact:
1. Write a **handoff doc** to `shared/memory/session-handoffs/{agent}-{date}.md`
2. Capture the facts in the handoff doc, not in memory
3. Recommend `/compress` or `/new` rather than fighting memory limits

This is durable state-on-disk; the user (or next session) will find it.

## Pitfalls

- ❌ **Don't wait until 90% to compact.** The user has explicitly corrected this behavior. 60% is the trigger.
- ❌ **Don't use the expensive model to summarize itself.** `complete_fast()` exists for exactly this. Spin up DeepSeek Flash (~$0.03/M) or Haiku for the cheap pass.
- ❌ **Don't keep archived content in active context.** The whole point is offload-to-disk. File paths, not content.
- ❌ **Don't reload the full trajectory on session resume.** Only the compaction metadata + working set + file pointers.
- ❌ **Don't skip Stage 1 (truncation).** It's free context savings and runs continuously.
- ❌ Don't store system-prompt-duplicate entries in memory. If a memory entry says "compact at 78%" and your system prompt already encodes that rule, the memory entry is dead weight. Same for "before writing CLI code, read barrel exports" when the build skill already says it. Scan your memory entries at session start: if the fact is encoded in a skill or system prompt, remove it from memory. Memory should contain situation-specific facts (env details, user preferences, project state) — not procedural rules that skills already govern.
- ❌ Don't pack 15+ write_file calls into a single turn. Multiple write_file + patch calls consume response tokens proportional to file content size, not just the tool calls themselves. When creating a new app scaffold (dashboard, new package), limit to ~6 file operations per turn. Spread large file-creation phases across turns. Alternative: use execute_code with write_file from hermes_tools to batch writes programmatically — a single execute_code call costs far fewer response tokens than individual write_file calls. Phase 6C hit this: 22 file writes truncated the response mid-sentence. Files were written (tool calls complete before response), but the human-readable summary was lost.

## Verification

After any compaction:
- [ ] Can you describe the current task in 1-2 sentences?
- [ ] Do you have file paths to everything you archived?
- [ ] Did you emit the metadata block at the top?
- [ ] Is your next action clear without re-reading archived material?

If any of these is NO, you compacted too aggressively or forgot the working set.
