# Goose 5-Stage Context Compaction Doctrine

**Source:** Cyony (borrowed from Goose Rust framework, 46K stars)  
**Status:** APPROVED — Pack-wide implementation required

---

## Core Principle

**Compact EARLY with a cheap model, not LATE with an expensive one.**

---

## The 5 Stages

### Stage 1: Truncate Oversized Tool Outputs
**Trigger:** Any single tool result > 50K chars  
**Action:** Cut to summary + first/last 5K of output. Append `[truncated: X chars removed]` marker.  
**Cost:** Zero (string manipulation only)

### Stage 2: Summarize Old Tool Pairs
**Trigger:** Context usage hits **60%** (NOT 90% — too late)  
**Action:** Use CHEAPEST model (DeepSeek V4 Flash at $0.03/M tokens) to summarize each completed tool call + result pair into 2-3 sentences.  
**Key:** Do NOT use expensive reasoning model for this. Flash costs pennies, saves primary window for thinking.

**Format:**
```
[compacted] Tool: search_codebase
Result: Found 3 relevant files — main_handler.js (line 45-120), auth_middleware.js (line 10-55), config.yaml. Primary hit was the CORS handler at main_handler.js:78.
```

### Stage 3: Compress Multi-Turn Sub-Conversations
**Trigger:** 3+ consecutive user↔assistant exchanges on same subtopic  
**Action:** Condense to single "sub-conversation summary" block preserving:
- User's original intent
- Key decisions made
- Current state/outcome
- Any unresolved questions  
**Cost:** One cheap model call per subtopic

### Stage 4: Prune Low-Relevance Messages
**Trigger:** Context usage hits **75%**  
**Action:** Score each message by relevance to CURRENT task. Remove filler (greetings, acknowledgments, "standing by", meta-discussion). Keep: decisions, code, errors, user directives.

**Format marker:**
```
[pruned: N messages removed — retained summary: ...]
```

### Stage 5: Full Archive with Working-Set Extraction
**Trigger:** Context usage hits **85%**  
**Action:** Archive everything to disk trajectory. Extract only working set back into context:
- Current task definition
- Last 5 exchanges
- Outstanding decisions/action items
- References to archived content by file path (NOT content)

**This is your emergency exit.** Never let it get here.

---

## Critical Rules

### 1. NEVER use primary model for compaction
Use DeepSeek V4 Flash, Haiku, or any model under $0.10/M tokens. Compaction just needs summarization — not intelligence.

### 2. Compaction triggers are EARLY, not late

| Usage % | Action |
|---------|--------|
| 50% | Start monitoring |
| 60% | Stage 2 triggers (cheap model summarization) |
| 65% | Stage 3 (compress sub-conversations) |
| 75% | Stage 4 (prune low-relevance) |
| 85% | Stage 5 (emergency archive) |
| 90%+ | DANGER — lock-up imminent |

### 3. Persist compaction output to disk
Write archived trajectory to `~/.openclaw/trajectory/{session}/`. Offload to disk — don't keep in RAM.

### 4. Track what you compacted
Every compaction emits metadata block:
```
[CONTEXT COMPACTION — turn N at T]
- Removed: M tool calls, K messages, X sub-conversations
- Archived to: ~/.openclaw/trajectory/{session}/compact-N.jsonl
- Current working set: task + last 3 exchanges + N references
```

### 5. Resume ≠ full reload
On resume after compaction, load ONLY:
- Compaction metadata
- Current working set
- File paths to archived content (NOT content)

LLM can read archived trajectory later via file reads. Don't stuff it back in.

---

## What NOT To Do

- ❌ Don't wait until 90% to compact
- ❌ Don't use expensive reasoning model to summarize
- ❌ Don't keep archived content in context
- ❌ Don't reload full trajectory on session resume
- ❌ Don't skip Stage 1 (truncation) — it's free savings

---

## Pack Implementation

| Agent | Compaction Model | Trigger Monitoring |
|-------|-----------------|-------------------|
| Tripp | DeepSeek V4 Flash | Every 10 turns or 50% context |
| Cyony | DeepSeek V4 Flash | Every 10 turns or 50% context |
| Echo | Local summary to disk | Every 10 turns or 50% context |

---

## TL;DR

**Cheap model summarizes → early → to disk → metadata preserved → full reload never happens.**
