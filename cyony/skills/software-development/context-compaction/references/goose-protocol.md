# Goose 5-Stage Compaction Protocol (Reference)

Source: `goose` (Rust agent framework, 46K stars, Linux Foundation). Audit captured 2026-06-02 — see `shared/review-queue/mech/goose-openclaw-deep-dive.md` for the full audit this was pulled from.

## Architectural Location in Goose

- `crates/goose/src/session/` — `SessionManager` implements the pipeline
- `DEFAULT_COMPACTION_THRESHOLD`: 0.75–0.9 of model context limit (we use conservative 0.60 in applied doctrine)
- SQLite `messages` table is the source of truth; originals archived, summarized version stays active

## The Core Insight: `complete_fast()`

Goose's provider trait (`crates/goose/src/providers/base.rs`) exposes TWO completion methods:

```rust
async fn complete(&self, ...) -> Result<(Message, ProviderUsage)>;
async fn complete_fast(&self, ...) -> Result<(Message, ProviderUsage)>;
```

- `complete` — the main (expensive) model used for reasoning
- `complete_fast` — a CHEAP model used specifically for Stage 2 summarization

This is the single most important architectural lesson from Goose: **the compaction model is not the reasoning model**. A DeepSeek V4 Pro session can summon DeepSeek V4 Flash (or any $0.03/M-tier model) purely to summarize old tool pairs, and then return to the expensive model for the next reasoning turn.

Cost implication: a compaction pass that might otherwise cost $0.30 using your primary model costs $0.003 using `complete_fast()`. A 100× savings on something you should be doing continuously.

## Stage Details

### Stage 1 — Truncate (>50K char single outputs)
```
trigger: any tool result > 50_000 chars
action:  keep first 5K + last 5K + "[truncated: X chars removed]" marker
cost:    zero
when:    continuously, not at a threshold
```

### Stage 2 — Summarize (60% context — our trigger, not Goose's default)
```
trigger: context_usage >= 0.60
action:  for each completed tool-call-and-result pair older than the last N turns:
           call complete_fast(poor_model, "summarize this in 2-3 sentences: ...")
           replace the pair with one system message containing the summary
model:   complete_fast (cheap: DeepSeek V4 Flash, Haiku, etc.)
cost:    ~$0.03 per 1M tokens of compaction
when:    at 60% threshold, then on every new complete pair until context drops
```

### Stage 3 — Compress Sub-Conversations (70%)
```
trigger: context_usage >= 0.70
action:  detect 3+ consecutive user↔assistant turns on the same subtopic
           condense into one "sub-conversation summary" block
           preserve: user intent, key decisions, current outcome, open questions
model:   complete_fast for the condensation pass
when:    at 70% threshold
```

### Stage 4 — Prune (75%)
```
trigger: context_usage >= 0.75
action:  score each remaining message by relevance to CURRENT task
         remove: greetings, "standing by", meta-process chatter, already-summarized tool output
         keep:   decisions, code, errors, user directives, last 3-5 exchanges
when:    at 75% threshold
```

### Stage 5 — Archive (85% — emergency exit)
```
trigger: context_usage >= 0.85
action:  write everything to a trajectory file:
           ~/.openclaw/trajectory/{session-id}/ or equivalent per-platform
         extract ONLY:
           - current task definition
           - last 5 exchanges
           - outstanding decisions/action items
           - file paths to archived content (NOT the content itself)
cost:    zero (just I/O)
when:    emergency only — if you're here, you failed to compact earlier
```

## Per-Compaction Metadata

Every compaction emits a marker at the top of surviving context:
```
[CONTEXT COMPACTION — turn N at T]
- Removed: M tool calls, K messages, X sub-conversations
- Archived to: <filepath or "in-memory">
- Current working set: <description of what's still active>
```

## Resume Semantics

When a session resumes after compaction, load ONLY:
1. The compaction metadata (above)
2. The current working set
3. File paths to archived content, not the content itself

The LLM can `read_file(archive_path)` later if a specific archived item is needed. Never bulk-reload the archive.

## Per-Turn Isolation

Each turn is a single SQLite transaction. If a turn fails mid-compaction, the transaction rolls back — the context is unchanged. This prevents partial compaction states that could lose data.

## Why This Protocol Matters for Tripp.Control

Goose's approach directly informed the Context Compaction Trigger Protocol in the Interop Boundary Design (`shared/review-queue/interop/interop-boundary-design-v1.md`). Tripp's OpenClaw session had a hard context overflow mid-session (2026-06-02 ~02:30 UTC) which motivated this doctrine being formalized across the crew.

When Tripp.Control eventually ships runtime support (LOCK 010+), its `evaluateEscalation` could detect approaching-compaction signals and emit a `COMPACT_ADVISORY_PENDING` denial reason — pausing new proposals to Tripp until he compacts.

## Further Reading

- Goose source: `crates/goose/src/session/`
- Full crew audit: `shared/review-queue/mech/goose-openclaw-deep-dive.md` (16KB, saved in this mega-session)
- Applied version of this protocol: the parent SKILL.md in this skill directory
