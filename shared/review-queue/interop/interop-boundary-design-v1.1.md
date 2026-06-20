# Interop Boundary Design Doc v1.1

## Document Status
**Phase:** Approved (with amendments applied)  
**Author:** Cyony (synthesizing crew inputs)  
**Reviewed by:** Tripp 🔺 (approved with amendments, 2026-06-02)  
**Created:** 2026-06-02T02:00:00Z  
**Amended:** 2026-06-02T06:00:00Z  
**Review Status:** Pending Eddie final sign-off  
**Location:** shared/review-queue/interop/interop-boundary-design-v1.1.md

---

## 1. Executive Summary

This document defines the shared volume layout, artifact formats, consumption contracts, and routing rules for the agent crew (Tripp, Echo, Cyony). It synthesizes answers from:
- Tripp's response to for-tripp-004-ironman-suit-briefing
- Echo's response to echo-response-to-cyony-7questions
- Echo's interop response (for-cyony-003-interop-response)
- Goose+OpenClaw audit insights on denial reason propagation
- **Tripp's review amendments (2026-06-02)**

**Goal:** Prevent routing failures, ensure all agents can consume artifacts predictably, and establish boundaries for LOCK 007 implementation.

---

## 2. Shared Volume Inbox Structure

### 2.1 Folder Layout
```
shared/
├── inbox/                    # Flat root (per Tripp)
│   ├── for-{agent}-*.md     # Direct agent messages
│   ├── audit-*.md           # LOCK 006 reports
│   ├── forge-candidate-*.md # Forge candidate notifications
│   ├── routing-lesson-*.md  # Routing lesson candidates
│   ├── escalation-*.md      # Escalation reports
│   └── compaction-advisory-*.md
├── inbox/completed/         # Successfully processed (per Echo)
├── inbox/failed/            # Failed processing (retryable)
├── inbox/rejected/          # Validation failed: missing target_agent, malformed frontmatter (not retryable) [A1 - Tripp amendment]
├── inbox/processing/        # Currently being processed
├── forge/
│   ├── candidates/          # Forge module candidates (per Tripp)
│   │   └── candidate-{id}/
│   │       ├── manifest.json
│   │       ├── module.{ext}
│   │       ├── validation-report.md (Echo)
│   │       ├── tripp-review.md
│   │       └── status: pending|validated|approved|rejected
│   ├── approved/            # Promoted modules (read-only)
│   └── rejected/            # Rejected candidates (for learning)
└── routing-lessons/         # Validated routing lessons
    ├── code/                # Code-related (Echo validated)
    └── policy/              # Policy-related (Tripp approved)
```

### 2.2 Symlinks (Backward Compatibility)
Per Tripp's directive:
```bash
ln -s ../forge/candidates/candidate-{id} shared/review-queue/forge-candidate-{id}
```
This preserves the old `review-queue/` path for any scripts watching it.

---

## 3. Artifact Format Specifications

### 3.1 Inbox Message Frontmatter Schema (YAML)
```yaml
---
target_agent: tripp|echo|cyony|required  # REQUIRED (per Echo)
from_agent: tripp|echo|cyony
priority: critical|high|normal|low
due: 2026-06-03T12:00:00Z  # ISO 8601
status: pending|processing|completed|failed
created: 2026-06-02T02:00:00Z
context:
  lock_number: 7
  task_type: build|review|query|approval
  related_docs: []
---
```

**Validation:** Universal watcher rejects messages without `target_agent` field (prevents Echo's missed message issue). Malformed messages are routed to `inbox/rejected/` with reason `VALIDATION_REJECTED`.

### 3.2 Forge Candidate Manifest Schema (JSON)
```json
{
  "id": "candidate-20260602-001",
  "agent": "cyony",
  "lock_number": 7,
  "recurrence_count": 3,
  "task_pattern": {
    "type": "code-generation",
    "risk_class": "medium",
    "cost_class": "low",
    "scope_class": "narrow"
  },
  "module_signature": {
    "language": "javascript",
    "entry_point": "src/core/forgeCandidateDetector/index.js",
    "test_path": "tests/unit/forgeCandidateDetector.test.js"
  },
  "status": "pending",
  "validation_required": {
    "echo_validate": true,
    "tripp_approve": true
  },
  "created": "2026-06-02T02:00:00Z",
  "last_updated": "2026-06-02T02:00:00Z"
}
```

### 3.3 Routing Lesson Manifest Schema (JSON)
```json
{
  "id": "routing-lesson-20260602-001",
  "agent": "cyony",
  "task_classification": {
    "type": "...",
    "task_class": "...",
    "risk_class": "...",
    "cost_class": "...",
    "budget_class": "...",
    "scope_class": "...",
    "reusability_class": "..."
  },
  "lesson_type": "code|policy",
  "observation": "Model X failed on task Y, model Z succeeded",
  "recommended_routing": {
    "task_type": "complex-analysis",
    "preferred_model": "deepseek-v4-pro",
    "fallback_chain": ["kimi-k2", "qwen3-coder"]
  },
  "validation_status": {
    "echo_validated": false,
    "tripp_approved": false
  },
  "created": "2026-06-02T02:00:00Z"
}
```

### 3.4 Audit Report Format (Markdown)
Tripp's LOCK 006 already defines this. Export format:
- **File:** `shared/inbox/audit-{type}-{timestamp}-{agent}.md`
- **Inline summary:** First 10 lines sent via Telegram to Tripp
- **Link:** Telegram message includes `📄 Full report: shared/inbox/audit-{type}-{timestamp}-{agent}.md`

---

## 4. Denial Reason Enum (Crestodian-Style)

Per Goose+OpenClaw audit, denials must propagate structured reasons. Defined as enum:

```javascript
const DenialReason = {
  TRIPP_VETO_LIVE_MODEL: "Tripp veto: live model calls require explicit approval",
  TRIPP_VETO_FORGE_PROMOTION: "Tripp veto: Forge candidates stay pending until approved",
  TRIPP_VETO_DOCTRINE_UPDATE: "Tripp veto: routing lessons don't become policy until validated",
  TRIPP_VETO_DATABASE_WRITE: "Tripp veto: keep file-based until system trusted",
  ATTEMPT_LIMIT_EXCEEDED: "Reached max attempts for this model",
  BUDGET_EXCEEDED: "Cost projection exceeds budget_class threshold",
  SCOPE_DRIFT_DETECTED: "Task classification drifted from original scope",
  ESCALATION_REQUIRED: "Task requires human review per policy",
  PREMIUM_MODEL_UNJUSTIFIED: "Premium model requested without justification report",
  VALIDATION_FAILED: "Echo validation rejected candidate",
  VALIDATION_REJECTED: "Message rejected: missing required fields or malformed frontmatter", // [A2 - Tripp amendment]
  COMPACT_ADVISORY_PENDING: "Tripp at 60% context, awaiting compaction"
};
```

**Usage:** All escalation reports, Forge rejections, and ingestion failures must include one of these as `denial_reason` field.

---

## 5. Consumption Contracts

### 5.1 Tripp's Contract (Governance Layer)
**Watches:**
- `shared/inbox/forge-candidate-*.md` → Approve/reject via review
- `shared/inbox/routing-lesson-*.md` (policy) → Approve/reject via review
- `shared/inbox/audit-*.md` → Read inline summary, dive into file if needed
- `shared/inbox/escalation-*.md` → Decision with denial reason enum
- `shared/heartbeat/agents/tripp.json` → Dashboard status

**Writes:**
- `shared/inbox/for-{agent}-*.md` → Directives to team
- `shared/forge/candidates/{id}/tripp-review.md` → Forge audit notes
- `shared/routing-lessons/policy/` → Approved policy lessons

**Veto power (hardcoded):**
- Live model calls → `DenialReason.TRIPP_VETO_LIVE_MODEL`
- Forge auto-promotion → `DenialReason.TRIPP_VETO_FORGE_PROMOTION`
- Doctrine updates → `DenialReason.TRIPP_VETO_DOCTRINE_UPDATE`
- Database writes → `DenialReason.TRIPP_VETO_DATABASE_WRITE`

### 5.2 Echo's Contract (Local Verification Layer)
**Watches:**
- `shared/inbox/for-echo-*.md` → Direct tasks and validation requests
- `shared/inbox/forge-candidate-*.md` (echo_validate: true) → Validate code quality
- `shared/inbox/routing-lesson-*.md` (code) → Validate against local repo
- `shared/heartbeat/agents/echo.json` → Dashboard status
- `shared/forge/candidates/{id}/` → Full candidate packages for validation (via SSH)

**Writes:**
- `shared/inbox/for-{agent}-*.md` → Direct responses to crew
- `shared/forge/candidates/{id}/validation-report.md` → Validation results
- `shared/routing-lessons/code/` → Validated code lessons

**Validation scope (code-only, confirmed by Echo):**
- ✅ Forge modules (code quality, patterns, tests, naming)
- ✅ Routing lessons (code-related, verify against actual repo)
- ❌ Routing lessons (policy-related) → Tripp handles
- ❌ Audit reports → Tripp handles
- ❌ Escalation decisions → Tripp handles

**Known constraint:** Cannot validate images/UI mockups without OpenRouter vision key. Flag UI Forge candidates with `echo_validate: false` for now.

**Inbox check cadence:** Echo checks VPS inbox every ~30 minutes. Urgent tasks should use `priority: high|critical` in frontmatter — Echo processes high-priority tasks immediately.

### 5.3 Cyony's Contract (Creative Builder Layer)
**Watches:**
- `shared/inbox/for-cyony-*.md` → Directives from Tripp/Eddie
- `shared/forge/approved/` → Reusable modules for experiments
- `shared/routing-lessons/` → Lessons to apply in creative work
- `shared/heartbeat/agents/cyony.json` → Dashboard status

**Writes:**
- `shared/inbox/for-{agent}-*.md` → Questions, proposals, reports
- `shared/forge/candidate-*.md` → Candidate notifications (not code itself)
- `shared/forge/candidates/{id}/` → Actual module code (when applicable)
- `shared/routing-lesson-*.md` → Candidate observations
- `shared/heartbeat/agents/cyony.json` → Status updates
- `shared/memory/token-logs/cyony-{date}.json` → Token usage reporting

**Constraints:**
- May propose, may not approve doctrine
- May not self-promote work to approved/
- May not close tasks without Echo/Tripp verification
- Sandboxed: no host filesystem access, no Tripp gateway access

### 5.4 Eddie's Contract (Human Oversight)
**Watches:**
- Discord presence → Idle vs working status
- `shared/memory/token-spending-report.md` → Monthly budget tracking
- `shared/heartbeat/crew-status.md` → Agent status board
- Telegram messages → Inline audit reports, escalation alerts

**Writes:**
- Direct Telegram messages to agent
- Discord token for bot presence updates
- Final approval on major decisions (Tripp.Control architecture, Forge modules)

**Approval chain:** Cyony proposes → Echo validates → Tripp approves → Eddie final sign-off

---

## 6. Routing Rules for Universal Watcher

Tripp's watcher needs prefix-based routing:

```python
PREFIX_ROUTERS = {
    "for-tripp-": "route_to_tripp",
    "for-echo-": "route_to_echo_direct",  # Echo requested direct routing
    "for-cyony-": "route_to_cyony_docker",
    "audit-": "route_to_tripp",
    "forge-candidate-": "route_to_tripp_then_echo_if_code",
    "routing-lesson-": "route_to_tripp_if_policy_echo_if_code",
    "escalation-": "route_to_tripp",
    "compaction-advisory-": "route_to_tripp"
}

REQUIRED_FIELDS = {
    "messages": ["target_agent", "from_agent", "priority"],
    "forge_candidates": ["id", "manifest.json", "validation_required"],
    "routing_lessons": ["id", "manifest.json", "lesson_type"]
}
```

**Echo's fix:** Make `target_agent` REQUIRED with validation at ingestion time. Prevents routing failures like Echo's missed `for-echo-*` messages. Malformed messages → `inbox/rejected/` with `VALIDATION_REJECTED` denial reason.

---

## 7. Heartbeat and Status Monitoring

### 7.1 Heartbeat JSON Schema
```json
{
  "agent": "tripp|echo|cyony",
  "timestamp": "2026-06-02T02:00:00Z",
  "status": "active|idle|working|compacting",
  "current_task": "Reviewing Forge candidate 001",
  "model": "deepseek-v4-pro",
  "context_usage_percent": 45,
  "session_tokens_used": 50000,
  "session_cost_usd": 1.50,
  "compaction_needed": false
}
```

### 7.2 Token Usage Reporting Contract
Each agent writes to `shared/memory/token-logs/{agent}-{date}.json`:

```json
{
  "agent": "cyony",
  "timestamp": "2026-06-02T02:00:00Z",
  "tokens_used": 185000,
  "model": "qwen/qwen3.7-max",
  "cost_usd": 5.55,
  "task": "Full session description",
  "savings_usd": 12.42,
  "savings_notes": "jMunch Trinity savings breakdown",
  "compaction_events": 1,
  "messages_sent": 8,
  "skills_created": 1
}
```

Tripp's `generate-token-report.py` aggregates these daily for the Mission Control dashboard.

---

## 8. Future ACP Adapter Boundary

Per Tripp's direction [A5]: ACP adapter is Echo's #1 priority but runs **parallel** to LOCK 007, not sequential.

```
Tripp.Reason (Go+Wails+React)
├── Backend (Go)
│   ├── ACP server endpoint → Editor clients (Zed, VS Code, etc.)
│   ├── MCP client → Tripp.Control tools
│   └── Gateway client → Tripp's OpenClaw gateway (for crew messages)
└── Frontend (React/Wails)
    └── ACP client → Backend ACP server

Tripp.Control (Node.js + JavaScript)
├── Core (deterministic, config-driven)
│   ├── taskClassifier
│   ├── modelRouter
│   ├── escalationGuard
│   ├── reportEngine
│   └── forgeCandidateDetector (LOCK 007)
├── CLI interface (tripp-control status/report/queue/approve)
└── Future (LOCK 009+): MCP server adapter [A4 - Tripp amendment]
```

**Boundary rule:** Tripp.Reason frontend talks ACP to Tripp.Reason backend, which talks MCP to Tripp.Control. No direct UI → Tripp.Control coupling.

**Timeline:** CLI first, MCP later. Tripp.Control must be stable and deterministic before exposing as MCP server [A4 - Tripp amendment].

---

## 9. Context Compaction Trigger Protocol

Per Goose audit and Tripp's context compaction doctrine:

```python
if context_usage_percent >= 60:
    stage_2_summarize_old_tool_pairs(model="deepseek-v4-flash")  # Cheap model
    
if context_usage_percent >= 70:
    stage_3_compress_multi_turn_subconversations(model="deepseek-v4-flash")
    
if context_usage_percent >= 80:
    stage_4_prune_low_relevance_messages()
    
if context_usage_percent >= 90:
    raise Alert("CRITICAL: Approaching context limit, initiate stage 5 archive")
    write_to_inbox("compaction-advisory-{timestamp}.md", target_agent="tripp")
```

**Key insight:** Use cheap models (DeepSeek V4 Flash) for compaction summarization, save expensive models for reasoning.

---

## 10. Known Constraints and Blockers

1. **Echo vision validation:** Echo cannot validate UI Forge candidates without OpenRouter vision key. Flag candidates with `echo_validate: false` and note "Requires vision API key for validation."

2. **Echo routing reliability:** Universal watcher must validate `target_agent` field at ingestion time to prevent missed messages.

3. **Token reporting gap:** Agents must manually log token usage until Tripp.Control auto-instruments the agent runtimes. (Acceptable — not a blocker. Deferred per Tripp review.)

4. **Context overflow monitoring:** Tripp will expose `context_usage_percent` in his heartbeat JSON. (Deferred — Tripp will add on next heartbeat update.)

---

## 11. Resolved Questions

Before proceeding to LOCK 007 implementation:

1. ✅ **Inbox structure:** Flat root + `completed/` + `failed/` + `rejected/` folders — approved
2. ✅ **Echo task routing:** Direct to `for-echo-*` without Tripp relay — approved
3. ✅ **Vision limitation workaround:** Flag UI candidates with `echo_validate: false` until key acquired — approved
4. ✅ **Symlink strategy:** Create `review-queue/` symlinks to `forge/candidates/` for backward compat — approved
5. ✅ **Token reporting contract:** Standardize on `shared/memory/token-logs/{agent}-{date}.json` schema — approved

**Resolved via Tripp review (2026-06-02):**

6. ✅ **LOCK 007 + 008 scope:** Keep as ONE lock (007). forgeCandidateDetector and routingLessonDetector share the same input metadata and detection logic — no benefit to splitting. Split is deferred until proven necessary. [A3 - Tripp decision]

7. ✅ **MCP server adapter timeline:** CLI first, MCP later (LOCK 009+). Tripp.Control must be stable and deterministic before exposing as MCP server. No skipping ahead. [A4 - Tripp decision]

8. ✅ **ACP priority for Tripp.Reason:** ACP adapter is Echo's #1 priority but runs **parallel** to LOCK 007. Codex works on LOCK 007 while Echo works on ACP. Don't block one on the other. [A5 - Tripp decision]

---

## 12. Next Steps

1. ~~**Cyony:** Commit this doc to `shared/review-queue/interop/`~~ ✅ Done
2. ~~**Tripp:** Review and approve (or request changes)~~ ✅ Approved with amendments
3. ~~**Cyony:** Apply Tripp's 5 amendments~~ ✅ Done (this document)
4. **Eddie:** Final sign-off after amendments confirmed ← **YOU ARE HERE**
5. **Echo:** Implement `inbox/rejected/` folder + frontmatter validation
6. **Codex:** Begin LOCK 007 implementation once Eddie signs off
7. **Tripp:** Add `context_usage_percent` to heartbeat JSON on next update
8. **Echo:** Begin ACP adapter work (parallel to LOCK 007)

---

## Appendix A: Glossary

- **Interop:** Interoperability, how agents share data and communicate
- **Artifact:** Shared file (message, Forge module, routing lesson, audit report)
- **Manifest:** JSON metadata file describing an artifact's structure and status
- **Denial reason enum:** Structured rejection codes for veto power and validation failures
- **ACP:** Agent-Client Protocol (inter-agent communication standard)
- **MCP:** Model-Client Protocol (tool integration standard)
- **Compaction:** Context summarization when approaching token limits

## Appendix B: File Locations

- This document (v1.1): `shared/review-queue/interop/interop-boundary-design-v1.1.md`
- Original (v1.0): `shared/review-queue/interop/interop-boundary-design-v1.md`
- Tripp's review: `shared/review-queue/interop/interop-boundary-design-v1-TRIPP-REVIEW.md`
- Tripp's response to for-tripp-004: `shared/inbox/for-tripp-004-ironman-suit-briefing.md`
- Echo's response: `shared/inbox/echo-response-to-cyony-7questions.md`
- Echo's interop input: `shared/inbox/for-cyony-003-interop-response.md`
- TokenMunch docs: `shared/inbox/for-cyony-tripcore-munch.md`
- Context compaction doctrine: `shared/inbox/for-tripp-005-context-compaction-doctrine.md`

## Appendix C: Amendment Changelog (v1.0 → v1.1)

| # | Amendment | Source | Section Updated |
|---|-----------|--------|-----------------|
| A1 | Added `inbox/rejected/` folder for malformed messages | Tripp review Amendment 1 | §2.1 |
| A2 | Added `VALIDATION_REJECTED` to denial reason enum | Tripp review Amendment 2 | §4 |
| A3 | LOCK 007 + 008 combined (single lock, no split) | Tripp review Amendment 3 | §11 Q6 |
| A4 | MCP server deferred to LOCK 009+ (CLI first) | Tripp review Amendment 4 | §8, §11 Q7 |
| A5 | ACP runs parallel to LOCK 007, not sequential | Tripp review Amendment 5 | §8, §11 Q8 |

---

**Author's note:** This v1.1 incorporates all 5 of Tripp's amendments plus integrates Echo's interop feedback (inbox notification pattern, SSH-based VPS access, 30-min heartbeat cadence). All questions resolved. Ready for Eddie final sign-off and LOCK 007 kickoff.
