# Goose Context Compaction Doctrine

**Source:** Goose (Rust agent framework, 46K stars)  
**Problem solved:** Prevents agent lockups from context window exhaustion  
**Key insight:** Compact EARLY with cheap models, not LATE with expensive ones

---

## The Golden Rule

**NEVER wait until 90%+ context usage to compact.** By then it's too late for graceful compaction. Trigger at 60% with a cheap model.

---

## Trigger Thresholds

| Usage % | Stage | Action | Cost |
|---------|-------|--------|------|
| 50% | Monitor | Start tracking context usage, no action yet | $0 |
| **60%** | **Stage 2** | **Summarize old tool pairs with cheap model** | ~$0.01-0.03 |
| 65% | Stage 3 | Compress multi-turn sub-conversations | ~$0.02-0.05 |
| 75% | Stage 4 | Prune low-relevance messages | ~$0.01-0.03 |
| 85% | Stage 5 | Full archive with working-set extraction | ~$0.05-0.10 |
| 90%+ | 🚨 DANGER | Lock-up imminent — too late for graceful compaction | N/A |

**Most frameworks default to 75-90%. This is wrong.** Goose triggers at 60% to preserve reasoning quality.

---

## The Five Stages

### Stage 1: Truncate Oversized Tool Outputs
**Trigger:** Any tool result > 50K characters  
**Action:** Replace with summary + first 5K + last 5K of output  
**Cost:** Zero (pure string manipulation, no model call)  
**Example:**
```
[truncated: search_results from file_glob]
Summary: Found 847 files matching pattern, showing first 100
First 5K: [...file list...]
...
Last 5K: [...end of file list...]
```

### Stage 2: Summarize Old Tool Pairs (CRITICAL)
**Trigger:** Context usage hits 60%  
**Action:** Use CHEAPEST available model to summarize completed tool calls + results  
**Cost:** ~$0.01-0.03 per summary  
**Model selection:** DeepSeek V4 Flash ($0.03/M tokens), Haiku ($0.25/M), or anything < $0.10/M tokens

**Summarization template:**
```
[tool: search_codebase("authentication handler")]
[result: Found 3 relevant files — auth_middleware.js (line 45-120), 
 user_service.ts (line 10-88), config.yaml (line 23-45). 
 Primary hit: auth_middleware.js:67-95 contains JWT validation logic 
 with token extraction from Authorization header, signature verification 
 using jsonwebtoken library, and user object attachment to request.]
```

**Why cheap models:** Summarization is a low-complexity task. You don't need Claude Opus to compress old turns. Goose calls this pattern `complete_fast()` — a separate method that uses a cheaper/faster model specifically for compaction.

### Stage 3: Compress Multi-Turn Sub-Conversations
**Trigger:** Context usage hits 65%  
**Action:** Summarize 3+ consecutive exchanges on the same subtopic into one block  
**Cost:** ~$0.02-0.05 per compression

**Subtopic detection:** Look for conversation threads where:
- Same file/function is discussed repeatedly
- Debugging loop (error → fix attempt → error → fix attempt)
- Exploration without decision (reading multiple files without acting)

**Format:**
```
[compressed: debugging session on auth_middleware.js JWT validation]
Original: 8 exchanges over 12 messages
Summary: Agent identified JWT signature mismatch caused by incorrect 
secret key format (buffer vs string). Fixed by converting 
process.env.JWT_SECRET to Buffer.from() in line 72. 
Confirmed fix works with test token.
Current state: ✅ Fixed, ready to commit
```

### Stage 4: Prune Low-Relevance Messages
**Trigger:** Context usage hits 75%  
**Action:** Remove messages not directly relevant to current task  
**Cost:** ~$0.01-0.03

**Prune these:**
- Greetings ("Hi", "Hello", "Thanks")
- Acknowledgments ("Got it", "Understood", "I see")
- Meta-discussion ("Let me check that", "Looking into it now")
- Speculative paths not pursued
- Verbose explanations of simple concepts

**Keep these:**
- User requests and decisions
- Errors and stack traces
- Code changes and diffs
- Tool results with actionable information
- Agent reasoning and plans

**Emit marker:**
```
[pruned: 7 messages (4 acknowledgments, 2 meta-discussion, 1 speculative path)]
```

### Stage 5: Full Archive with Working-Set Extraction
**Trigger:** Context usage hits 85%  
**Action:** Archive everything to file, extract only working set back to context  
**Cost:** ~$0.05-0.10

**Working set = what you need RIGHT NOW:**
- Current task definition (from user's most recent message)
- Last 3 message exchanges
- Active file paths being edited
- Outstanding decisions/action items
- File paths to archived content (NOT the content itself)

**Archive format:**
```json
{
  "archived_at": "2026-06-02T03:45:00Z",
  "archived_to": "~/.cache/hermes/compaction/2026-06-02_03-45-00.json",
  "messages_archived": 84,
  "tool_pairs_archived": 23,
  "sub_conversations_compressed": 4,
  "working_set_messages": 6,
  "current_task": "Fix JWT validation in auth_middleware.js",
  "active_files": ["src/auth_middleware.js", "tests/auth.test.js"],
  "outstanding_decisions": ["Should we use RS256 or HS256 for JWT?"]
}
```

**Reinject as metadata header:**
```
[CONTEXT COMPACTION — Turn 47 at 2026-06-02T03:45:00Z]
- Removed: 84 messages, 23 tool pairs, compressed 4 sub-conversations
- Archived to: ~/.cache/hermes/compaction/2026-06-02_03-45-00.json
- Current working set: 6 messages (current task + last 3 exchanges)
- Active files: src/auth_middleware.js, tests/auth.test.js
- Outstanding: JWT algorithm choice (RS256 vs HS256)

[CONTINUE WITH WORKING SET BELOW]
```

The LLM can retrieve archived turns via file reads if needed, but should NOT reload full context.

---

## Cheap Model Selection Guide

| Model | Cost per 1M tokens | Speed | Quality | Recommended for |
|-------|-------------------|-------|---------|-----------------|
| **DeepSeek V4 Flash** | $0.03 | Fast | Good | ✅ Stage 2 summarization (best value) |
| **Claude Haiku** | $0.25 | Fast | Good | Stage 2 (if Anthropic preferred) |
| **GPT-3.5 Turbo** | $0.50 | Fast | Decent | Stage 2 (fallback if Flash unavailable) |
| Gemini Flash | FREE | Fast | OK | Budget option, watch rate limits |
| Claude Sonnet | $3.00 | Fast | Great | ❌ Too expensive for compaction |
| GPT-4 | $30.00 | Slow | Excellent | ❌ Way too expensive |

**Rule of thumb:** If it costs > $0.10 per 1M tokens, it's too expensive for compaction.

---

## Implementation Checklist

- [ ] Context usage monitor active (check every 5 turns or 2 minutes)
- [ ] Threshold alerts configured (50% monitor, 60% trigger, 90% panic)
- [ ] Cheap model selected and API key configured
- [ ] Stage 2 summarization template tested on sample tool pairs
- [ ] Archive file path configured (`~/.cache/hermes/compaction/`)
- [ ] Metadata header format defined (includes archived file paths)
- [ ] File read capability for archived content retrieval
- [ ] Working set extraction logic implemented (current task + last 3 + active files)

---

## Case Study: Tripp Context Lockup (2026-06-02)

**What happened:**  
Tripp's OpenClaw agent hit 90%+ context usage and locked up hard. Could not respond, had to be manually restarted.

**Root causes:**
1. No Stage 2 trigger at 60% — waited until 90%+ to even consider compaction
2. No cheap-model summarization — was using expensive primary model for all operations
3. Full trajectory/history loaded on session restore instead of essentials
4. No progressive stages — tried to compact everything at once when already in crisis

**The fix (Goose doctrine):**
1. Monitor at 50%, trigger Stage 2 at 60% with DeepSeek Flash
2. Progressive compaction (don't wait for crisis)
3. Archive to file with working-set extraction
4. Session restore loads only working set, not full history

**Result:**  
Tripp recovered and can now run long sessions without lockup. Context usage stays in 60-75% range with continuous compaction.

**Lesson learned:**  
Compaction is not a crisis response — it's continuous hygiene. Like brushing teeth: do it regularly with cheap tools, not once a year with expensive surgery.

---

## Anti-Patterns (What NOT to Do)

❌ **Wait until 90%+ to compact** — too late, graceful compaction impossible  
❌ **Use expensive model for summarization** — wastes money on low-complexity task  
❌ **Reload full archived context** — defeats the purpose of archiving  
❌ **Compact without metadata headers** — LLM loses track of where archived content lives  
❌ **Prune user requests** — never remove what the user explicitly asked for  
❌ **Skip Stage 1 (truncation)** — free wins, always do it  

---

## When to Apply This Doctrine

Apply to **any agent session** that:
- Runs for 30+ minutes
- Makes 50+ tool calls
- Processes large codebases or datasets
- Has complex multi-step workflows
- Could reasonably hit 60% context usage

**Especially critical for:**
- Warden agents (Tripp) auditing large PRs
- Builder agents (Cyony) doing long research sessions
- Relay agents (Echo) coordinating multi-agent tasks

---

## Goose's `complete_fast()` Pattern

Goose implements this as a separate API call:

```rust
// Main inference (expensive model for reasoning)
let response = provider.complete(&messages).await?;

// Compaction summarization (cheap model for compression)
let summary = provider.complete_fast(&old_tool_pairs, "Summarize these results").await?;
```

**Translation for Hermes/other agents:**
- Main model: Your primary reasoning model (e.g., Qwen 3.7 Max)
- Fast model: DeepSeek Flash, Haiku, or similar cheap model
- Use fast model ONLY for: Stage 2 summaries, Stage 3 compressions, Stage 4 pruning decisions

---

## Summary

**The Doctrine in One Sentence:**  
Compact early (60%), cheaply (Flash/Haiku), and progressively (5 stages) — never wait for crisis.

**The Mantra:**  
*"60% triggers, cheap models summarize, metadata points to archives."*
