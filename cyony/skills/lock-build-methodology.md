# LOCK Build Methodology (Tripp.Control Pattern)

**Source:** Tripp.Control governance spine project (Eddie + Tripp crew)  
**Problem solved:** Building governance/control layers without scope creep  
**Key insight:** Explicit "what it must NOT do" boundaries are as important as what it does

---

## Overview

LOCK = one focused feature built in strict order. Each LOCK has:
- A numbered scope (LOCK 001, LOCK 002, etc.)
- Explicit "what it does" (deliverables)
- Explicit "what it must NOT do" (forbidden scope)
- Hardcoded decision documentation (LOCKED decisions don't change without another LOCK)
- Standardized completion report format
- Validation protocol (npm run validate + npm test + npm run dev + node --check)

---

## The LOCK Structure

```
LOCK NNN — [Feature Name]
─────────────────────────────────────
Status: PASS ✅ / PATCH 🔧 / FAIL ❌

DELIVERABLES (what it does):
- src/core/featureName/index.js
- tests/unit/featureName.test.js
- governance/schemas/feature.schema.json

FORBIDDEN SCOPE (what it must NOT do):
- NO live model calls
- NO provider integration  
- NO database writes (if not in scope)
- NO dashboard/API/server work
- NO autonomous execution
- NO out-of-lock features

LOCKED DECISIONS:
- Architectural choice (justified, not reversible without new LOCK)
- Schema format (locked once validated)
- Config format (locked once validated)

VALIDATION:
- npm run validate → PASS
- npm test → PASS, N/N tests passing
- npm run dev → PASS
- node --check [each affected file] → PASS
```

---

## Build Order Pattern

Tripp.Control uses **A→C→B→D** (task class → audit → routing → forge) but the general pattern is:

```
Foundation (LOCK 001)
    ↓
Config Loading (LOCK 002)
    ↓
First Deterministic Component (LOCK 003)
    ↓
Dependent Component (LOCK 004)
    ↓
Guard/Limitation System (LOCK 005)
    ↓
Reporting/Audit (LOCK 006)
    ↓
Candidate Detection (LOCK 007)
    ↓
[Continue building...]
```

**Key:** Build the **classification layer before routing**, the audit layer before candidates. Each LOCK depends only on previous LOCKs.

---

## Completion Report Format

Every LOCK must produce a standardized completion report:

```markdown
# LOCK NNN — [Feature Name] Completion Report

## Status
✅ PASS / 🔧 PATCH / ❌ FAIL

## What Built
- [List of files created/modified]
- [Key functionality delivered]

## What NOT Built (Confirmed)
- [Explicit confirmation that each forbidden item was NOT added]
- NO live model calls ✅
- NO dashboard/API/server ✅
- [etc.]

## Tests
- Command: npm run validate
- Result: PASS
- Command: npm test
- Result: PASS, N/N tests passing
- Command: npm run dev  
- Result: PASS
- Command: node --check [files]
- Result: PASS

## Locked Decisions
- [Decision 1]: [Justification]
- [Decision 2]: [Justification]

## For Next LOCK
- LOCK N+1 should be: [recommended feature]
- Dependencies from this LOCK: [what next LOCK can use]

## Issues Found (if any)
- [Any scope violations, test failures, decisions that need review]
```

---

## Critical Rules

### 1. NEVER Build Ahead
If you're on LOCK 006, you build LOCK 006. Not LOCK 007, not a "quick fix for LOCK 005", just LOCK 006. The strict order prevents:
- Scope creep
- Dependencies that skip validation
- Features that bypass governance

### 2. Every LOCK = Explicit Boundaries
The "what it must NOT do" section is as important as what it does. This prevents:
- Accidental live model calls during testing
- Dashboard/API work creeping into governance layer
- Auto-promotion logic sneaking into candidate detection

### 3. LOCKED Decisions Are Locked
Once a decision is LOCKED, it cannot be reversed without another LOCK. Example:
- "We will use YAML for config" (LOCK 002)
- Cannot change to JSON without LOCK N
- This prevents "oh we could do it better with X" churn

### 4. Validation Is Non-Negotiable
Every LOCK must pass validation before moving to next LOCK. If tests fail, current LOCK is FAIL status, not PASS. No exceptions.

### 5. Completion Report Is Required
No LOCK is "done" without the standardized completion report. This provides:
- Audit trail for future LOCKs
- Clear handoff to next agent (if different agent continues)
- Explicit confirmation of forbidden scope compliance

---

## Why This Works for Governance

**Traditional approach:** Build a governance tool, realize scope creep happened, refactor to remove out-of-scope features, lose time.

**LOCK approach:** Each LOCK has explicit forbidden scope documented BEFORE building. Agent building it knows what NOT to do. Reviewer can verify nothing out-of-scope was added.

**Result:** Tripp.Control built 6 LOCKs in strict order, each focused, each validated, with clear understanding of what the governance spine does AND doesn't do.

---

## When to Use LOCK Methodology

Apply this pattern when building:
- Governance/control layers
- Audit systems
- Policy engines  
- Anything where **scope creep would compromise the system's purpose**

**Key indicator:** If the system's correctness depends on "what it does NOT do" as much as "what it does", use LOCKs.

Do NOT use for:
- One-off scripts
- Simple feature additions to existing codebases
- Anything with flexible/evolving requirements

---

## Example: Tripp.Control LOCK 006 (Report Engine)

```
LOCK 006 — Report Engine
─────────────────────────────────────
Status: PASS ✅

DELIVERABLES:
- src/core/reportEngine/index.js (1,847 lines)
- tests/unit/reportEngine.test.js (63 tests)
- Reports: failure-audit, escalation-success, premium-justification, forge-candidate

FORBIDDEN SCOPE (Confirmed Not Built):
- NO live model calls ✅
- NO OpenRouter/provider integration ✅
- NO Hermes integration ✅  
- NO dashboard/API/server ✅
- NO database/SQLite/persistent storage ✅
- NO phone/cloud access ✅
- NO autonomous agent execution ✅
- NO Forge promotion engine ✅
- NO routing doctrine auto-update ✅
- NO report review automation ✅

VALIDATION:
- npm run validate → PASS
- npm test → PASS, 45/45 tests passing
- npm run dev → PASS
- node --check src/core/reportEngine/index.js → PASS

LOCKED DECISIONS:
- Reports return Markdown strings (not files, not database rows)
- All 4 report types supported (no partial implementation)
- Report engine is pure function (inputs → outputs, no side effects)

FOR NEXT LOCK:
- LOCK 007 should be: Routing Lesson + Forge Candidate Detector
- Depends on LOCK 005 escalation guard
- Depends on LOCK 006 report engine (to generate candidate reports)
```

This LOCK is focused, validated, and clearly scoped. Next LOCK knows exactly what it can depend on and what not to build.
