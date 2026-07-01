# Interop Boundary Design v1.0 — Tripp Review

**Reviewer:** Tripp 🔺
**Date:** 2026-06-02
**Status:** APPROVED with amendments

---

## Overall Assessment

Solid synthesis. Cyony did good work consolidating crew inputs + Goose audit findings. This is ready to become the crew's operating contract.

---

## ✅ Approved As-Is

### 1. Shared Volume Structure (§2)
- Flat inbox root + `completed/` + `failed/` — approved
- `forge/candidates/` structure with manifest + validation report + review notes — approved
- Symlink backward-compat strategy — approved

### 2. Artifact Formats (§3)
- YAML frontmatter with `target_agent` REQUIRED — **critical fix**, approved
- Forge candidate manifest schema — approved
- Routing lesson manifest schema — approved
- Audit report format — approved (matches LOCK 006)

### 3. Denial Reason Enum (§4)
- All 11 reasons are well-defined and cover our veto scenarios
- The `COMPACT_ADVISORY_PENDING` reason is a nice touch for context management

### 4. Consumption Contracts (§5)
- Tripp's veto powers correctly scoped
- Echo's code-only validation boundary correctly noted
- Cyony's sandbox constraints correctly listed
- Eddie's approval chain correctly placed at the end

### 5. Routing Rules (§6)
- Prefix-based routing is simple and reliable
- `REQUIRED_FIELDS` validation at ingestion prevents Echo's missed-message bug

### 6. Heartbeat + Token Reporting (§7)
- JSON schema is clean
- Token log contract is standardized

### 7. Context Compaction Protocol (§9)
- Stage thresholds (60/70/80/90) match our adopted Goose protocol
- Cheap-model summarization (DeepSeek V4 Flash) is the right cost optimization

---

## 🔧 Amendments Required

### Amendment 1: Add `rejected/` folder to inbox structure
Add `inbox/rejected/` alongside `completed/` and `failed/` — for messages that fail validation (missing `target_agent`, malformed frontmatter, etc.). Currently only `failed/` exists for processing failures, not validation rejections.

**Suggested update to §2.1:**
```
inbox/
├── ...
├── completed/         # Successfully processed
├── failed/            # Processing failed (retryable)
└── rejected/          # Validation failed (not retryable — malformed, missing fields)
```

### Amendment 2: Denial reason for rejected messages
Add to §4 enum:
```javascript
VALIDATION_REJECTED: "Message rejected: missing required fields or malformed frontmatter"
```

### Amendment 3: LOCK 007/008 split question (§11 Q6)
**My answer:** Keep them as ONE lock (007). The detector should handle both candidate types in a single pass — they're closely related (same input metadata, same detection logic). Splitting them adds overhead without benefit. If we need separation later, we can refactor.

### Amendment 4: MCP server adapter timeline (§11 Q7)
**My answer:** CLI first, MCP later. Tripp.Control needs to be stable and deterministic before we expose it as an MCP server. LOCK 009+ can add MCP adapter. Don't skip ahead.

### Amendment 5: ACP priority (§11 Q8)
**My answer:** ACP adapter for Tripp.Reason is Echo's #1 priority, but it's **parallel** to LOCK 007, not sequential. Echo works on ACP while Codex works on LOCK 007. Don't block one on the other.

---

## ❌ Noted but Deferred

1. **Token reporting gap** (§10.3) — Acceptable manual logging until Tripp.Control auto-instruments. Not a blocker.
2. **Context overflow monitoring** (§10.4) — Tripp will expose `context_usage_percent` in heartbeat JSON. I'll add this to my next heartbeat update.

---

## Action Items

| # | Task | Owner | Status |
|---|------|-------|--------|
| 1 | Apply amendments 1-5 to this doc | Cyony | Pending |
| 2 | Move approved doc to `shared/approved-knowledge/interop-boundary-design-v1.md` | Tripp | This review |
| 3 | Implement `inbox/rejected/` folder + validation | Echo | Pending |
| 4 | Begin LOCK 007 implementation | Codex | After Eddie sign-off |
| 5 | Add `context_usage_percent` to Tripp heartbeat | Tripp | Next heartbeat |

---

## Final Verdict

**APPROVED for Eddie final sign-off.**

The 5 amendments above should be applied before Codex begins LOCK 007, but they're minor — no structural changes. The core design is sound.

— Tripp 🔺
