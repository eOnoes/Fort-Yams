# Tripp.Control LOCK Pattern

## What Is a LOCK?

A LOCK is a **deterministic, scoped build phase** for Tripp.Control. Each LOCK:
- Has a specific objective
- Produces specific deliverables
- Validates with specific commands
- Documents what was NOT added (scope discipline)
- Passes/fails based on test results and scope checks

## Current LOCK Status

**Completed (6 locks):**
- LOCK 001: Foundation scaffold ✅
- LOCK 002: Config loading + policy validation ✅
- LOCK 003: Multi-axis task classifier ✅ (12/12 tests)
- LOCK 004: Model router ✅ (21/21 tests)
- LOCK 005: Escalation guard + attempt ledger ✅ (35/35 tests)
- LOCK 006: Report engine ✅ (45/45 tests)

**On hold:** LOCK 007 awaits interop boundary design

## LOCK Structure

Each LOCK follows this template:

```
## LOCK {NNN} — {Title}

**Status:** PASS | PATCH | STOP

**Implemented:**
- file1.js
- file2.test.js

**Exports:**
- functionName() — what it does

**It does NOT:**
- call models
- persist data
- execute agents
- add dashboard/API

**Validation:**
- npm run validate → PASS
- npm test → PASS, X/Y tests passing
- npm run dev → PASS
- node --check file.js → PASS

**Scope check:**
- Live model calls added? NO
- OpenRouter integration? NO
- Hermes integration? NO
- Dashboard/API/server? NO
- Database/SQLite? NO
- Autonomous execution? NO
- Forge promotion? NO
- Routing doctrine auto-update? NO

**Drift check:**
- No unauthorized top-level folders
- No forbidden systems
- No misplaced files
- All new files match LOCK scope
```

## Required Completion Report

Every LOCK must end with:

```
PHASE: LOCK {NNN} — {Title}
STATUS: PASS / PATCH / STOP
FILES CHANGED: {list}
VALIDATION RUN: {commands}
VALIDATION RESULT: {pass/fail + test counts}
SCOPE CHECK: {all NOs for forbidden systems}
DRIFT CHECK: {no scope drift occurred}
BLOCKERS: {none | list}
NEXT RECOMMENDED LOCK: LOCK {NNN+1}
```

## Hard Boundaries (Forbidden Until Explicitly Approved)

These systems must NOT be added to any LOCK unless Eddie explicitly approves:
- Live model calls
- OpenRouter integration
- Hermes integration
- Dashboard/frontend
- API server
- Database/SQLite
- Phone/cloud access
- Autonomous agent execution
- Provider SDK integration
- Persistent storage layer
- Forge auto-promotion
- Routing doctrine auto-update

## Repo Structure Lock

Approved top-level structure (no unauthorized folders):

```
Tripp.Control/
├─ README.md
├─ package.json
├─ .gitignore
├─ .env.example
├─ docs/
├─ configs/
├─ governance/
├─ src/
├─ reports/
├─ forge/
├─ tests/
└─ scripts/
```

## Agent Team Concept

**Tripp** (leader/planner/auditor):
- DeepSeek V4 Pro
- Reviews all LOCK outputs
- Approves Forge candidates
- Validates routing lessons

**Echo** (local verifier/final patch checker):
- Qwen3 Coder 480B A35B
- Validates code-grounded routing lessons
- Checks Forge module implementations
- Final patch verification

**Cyony** (creative cloud builder/sandboxed):
- Kimi K2.6
- Proposes designs and experiments
- May NOT approve doctrine
- May NOT self-promote work
- May NOT close tasks without verification
- May NOT bypass Tripp/Echo review

**Workflow:**
Cyony proposes → Tripp audits → Echo validates → Eddie approves

## Multi-Axis Classification (LOCK 003)

Every task classified across:
- `type` — what kind of work
- `task_class` — complexity/severity
- `risk_class` — failure impact
- `cost_class` — resource requirements
- `budget_class` — spending limits
- `scope_class` — breadth of change
- `reusability_class` — one-off vs pattern

## Model Router (LOCK 004)

Deterministic routing metadata:
- Selected model (from approved starter set)
- Selected agent (Tripp/Echo/Cyony)
- Routing chain (escalation path)
- Budget/risk/task echo fields
- Allowed/disallowed models
- Approval flags
- Premium justification flags
- Reasons
- Warnings

**Starter model set:**
- DeepSeek V4 Flash
- Qwen3 Coder 480B A35B
- DeepSeek V4 Pro
- Kimi K2.6
- Claude Sonnet 4.6

Premium models require justification.

## Report Engine (LOCK 006)

Four report types:
1. `generateFailureAuditReport(input)` — what went wrong, why, what was tried
2. `generateEscalationSuccessAuditReport(input)` — escalation worked, here's the path
3. `generatePremiumModelJustificationReport(input)` — why expensive model was needed
4. `generateForgeModuleCandidateReport(input)` — recurring pattern detected, propose extraction

All reports are **Markdown strings only** — no file writing, no auto-promotion, no review automation.