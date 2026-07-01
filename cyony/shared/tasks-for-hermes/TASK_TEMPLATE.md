# Cyony Task Template

## Before You Start
- [ ] Read this entire task
- [ ] Check **shared/queues/cyony/pending/** — NEW: instant task queue
- [ ] Check **shared/inbox/** for tasks from Tripp, Echo, or Eddie
- [ ] Check **shared/tasks-for-hermes/** for new assignments
- [ ] Check your personal inbox (if applicable)
- [ ] Note your start time

**IMPORTANT:** Check ALL FOUR locations — especially shared/queues/cyony/pending/. This is the fast-response system.

**When you find a task:**
1. Move it from `pending/` to `processing/`
2. Do the work
3. Move it to `completed/`
4. Reply to the sender

## While You Work
- [ ] Log token usage after EACH model call
- [ ] Note any errors or blockers immediately

## When You Finish
- [ ] Write results to `~/agents/shared/tasks-from-hermes/`
- [ ] **LOG YOUR COSTS** (see below)
- [ ] **PING the recipient** — Telegram message or inbox notification so they know to check
- [ ] Note completion time

**PING RULE:** Whenever you drop something in shared/inbox/ or shared/tasks-from-hermes/, send a quick ping to the recipient so they know it's there. Don't assume they'll see it on their next heartbeat.

---

## 🚫 Model Rules (FROM TRIPP — READ THIS)

**DO NOT USE:** `nvidia/nemotron-3-super-120b-a12b`
- This model is BLACKLISTED. Do not select it.
- If OpenRouter routes you there, manually override to one of the approved models below.

**APPROVED MODELS (use these only):**
1. **Primary:** `qwen/qwen3.7-max` (default)
2. **Fallback:** `deepseek/deepseek-chat` (DeepSeek API)
3. **Backup:** `moonshot/kimi-k2.6` (if others fail)

**Why:** Eddie wants Qwen3.7 Max and DeepSeek. Nemotron is out.

---

## 💰 Cost Logging (REQUIRED)

After every task, append to `~/agents/shared/cost-log.md`:

```markdown
| YYYY-MM-DD | Cyony | <brief task name> | qwen/qwen3.7-max | <input tokens> | <output tokens> | $<cost> | via OpenRouter |
```

**For DeepSeek tasks:**
```markdown
| YYYY-MM-DD | Cyony | <brief task name> | deepseek/deepseek-chat | <input tokens> | <output tokens> | $<cost> | DeepSeek API |
```

**How to get your token count:**
- Check your session logs for usage stats
- If unclear, estimate: input ≈ prompt length, output ≈ response length
- **When in doubt, log it anyway** — rough numbers are better than none

---

## Example Entry

```markdown
| 2026-06-02 | Cyony | Watcher bug fix | qwen/qwen3.7-max | 1500 | 800 | $0.023 | OpenRouter |
```

---

## Priority Order (from Tripp)
1. A — Critical system fixes
2. C — New features / improvements
3. B — Documentation / cleanup
4. D — Nice-to-have / experimental

## 🔄 Restart Protocol (NEW)
**If you need to restart yourself:**
1. **ASK another pack member to restart you** — never self-restart
2. Tripp restarts Cyony, Cyony restarts Echo, Echo restarts Tripp
3. This prevents infinite restart loops

**Why:** Eddie's rule — if you're stuck restarting yourself, you need a nudge from the outside.

## Failure Protocol
If stuck for >30 min:
1. Document what you tried
2. Escalate to Tripp with specific blocker
3. Do NOT spin forever
