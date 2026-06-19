---
name: tripp-control-build-sequence
description: "Tripp.Control project build sequence, lock protocol, and governance chain. Reference for coordinating with Tripp/Echo/Codex on governance spine development."
tags: [tripp-control, governance, build-sequence, locks, crew-coordination]
created: 2026-06-01
---

# Tripp.Control Build Sequence

## Trigger
When discussing Tripp.Control project, coordinating with Tripp/Echo on governance spine, reviewing Codex output, or planning next LOCK phase.

## Build Sequence (as of 2026-06-02)

✅ LOCK 001 — Foundation Scaffold (PASS)
✅ LOCK 002 — Config Loading + Policy Validation (PASS)
✅ LOCK 003 — Multi-Axis Task Classifier (PASS, 12/12 tests)
✅ LOCK 004 — Model Router (PASS, 21/21 tests)
✅ LOCK 005 — Escalation Guard + Attempt Ledger (PASS, 35/35 tests)
✅ LOCK 006 — Report Engine (PASS, 45/45 tests)

📋 INTEROP BOUNDARY V1.1 — Approved by Tripp with 5 amendments, pending Eddie final sign-off
   Key decisions: LOCK 007+008 combined (single lock), MCP deferred to LOCK 009+, ACP parallel to LOCK 007

⏸️ LOCK 007 — Forge Candidate + Routing Lesson Detector (AWAITING EDDIE SIGN-OFF)
   Single lock covers both detector types (per Tripp decision). Same input metadata, same detection logic.

📋 LOCK 009 — Governance Trace + Decision Record (SPEC REVIEWED BY CYONY)
   Spec reviewed: 12 items (2 critical, 3 high, 5 medium, 2 low). Key findings:
   - trace_id collision on retries (needs attempt_number)
   - "no persistence" contradicts "reviewable records" (use Markdown report as persistence)
   - Evidence collection tightly coupled to child module internals
   Note: LOCK 009 depends on LOCK 007+008 existing — forward-looking design, not immediate implementation.

## Governance Chain

**Cyony proposes → Tripp audits → Echo validates → Eddie approves**

- Cyony: Creative cloud builder, sandboxed experimental agent (Kimi K2.6)
- Tripp: Leader/planner/auditor, governance brain (DeepSeek V4 Pro)
- Echo: Local verifier, final patch checker, repo-grounded cleanup (Qwen3 Coder 480B A35B)
- Eddie: Final approval authority

## Hard Boundaries (Forbidden Until Explicit Lock)

- Live model calls
- OpenRouter/provider integration
- Hermes integration
- Dashboard
- API server
- Database/SQLite
- Persistent storage layer
- Phone/cloud access
- Autonomous agent execution
- Forge auto-promotion
- Routing doctrine auto-update

## Current Stack

- Node.js + JavaScript (plain, no TypeScript)
- YAML config loading (yaml package)
- JSON Schema validation
- Node built-in test runner (npm test)
- Local-first, deterministic, config-driven
- No frontend framework introduced
- No database layer

## Approved Model Lineup

- DeepSeek V4 Flash
- Qwen3 Coder 480B A35B
- DeepSeek V4 Pro
- Kimi K2.6
- Claude Sonnet 4.6

Premium models require justification. No additional models without governance change.

## LOCK 001 Key Decisions

- Hermes = REFERENCE_ONLY (not forked/wrapped/used as runtime)
- Multi-axis classification: type, task_class, risk_class, cost_class, budget_class, scope_class, reusability_class
- Routing lesson promotion: Observed failure → Candidate → Tripp review → Echo validation → Eddie approval → doctrine update
- Forge promotion: Candidate → Tripp review → Echo validation → Eddie approval → Approved Forge module

## LOCK Consolidation Lesson (from LOCK 017)

**What happened:** LOCK 016 was a runtime adapter boundary. A proposed LOCK 017 was going to be
a provider adapter boundary — same pattern, same shape, same all-false safety flags. Cyony flagged
in review: "this is just a copy-paste of LOCK 016 with 'runtime' → 'provider'."

**Outcome:** LOCK 017 consolidated runtime+provider into a single `ADAPTER_BOUNDARY_CONSOLIDATED`.
The crew listened.

**Lesson for reviews:** When reviewing a boundary lock, ask "is this a new concept, or just a
renamed version of the previous boundary lock?" If it's the latter, push for consolidation. Flags,
contracts, preconditions, and forbidden actions should be shared across conceptually-similar
boundaries.

**Red flags for unnecessary boundary locks:**
- Same deterministic ID pattern as another lock
- Same status enum (READY/BLOCKED/INSUFFICIENT_INFORMATION)
- Same status → all-flags-false safety flags pattern
- Same 20-item forbidden-actions list
- Same 15-item blocked-until-future-locks list

## Boundary-Spec Fatigue Pitfall

LOCK 016 (runtime), LOCK 017 (consolidated adapter), LOCK 018 (persistence) — three boundary locks
in a row, all saying "no" with similar structure. By LOCK 020 you'd be looking at five boundary locks
of documentation-as-code that all produce metadata nobody queries.

**When reviewing a boundary spec:**
1. Identify the actual design contribution (e.g., record-type list, flag hierarchy, consumer definitions)
2. Identify what's copy-paste from prior boundaries
3. Push for flag hierarchy (persistence_allowed implies children) not flat flag lists
4. Demand one-line definitions for every label (record types, preconditions) — otherwise names drift
5. Ask "who consumes this output?" — if no concrete consumer, the lock is documentation-as-code

## LOCK Completion Report Format

Every lock must end with MD/HTML report containing:
- PHASE: [lock name]
- STATUS: PASS / PATCH / STOP
- FILES CHANGED: [list]
- VALIDATION RUN: [commands executed]
- VALIDATION RESULT: [test counts, pass/fail]
- SCOPE CHECK: [confirm no forbidden systems added]
- DRIFT CHECK: [confirm no unauthorized structure changes]
- BLOCKERS: [if any]
- NEXT RECOMMENDED LOCK: [if approved]

## Interop Boundary Design (Pending)

Before LOCK 007, need to define:
1. Artifact format for routing lessons + Forge candidates (JSON Schema? YAML? Markdown frontmatter?)
2. Shared volume layout (where artifacts live, naming conventions, lock files)
3. Audit report export shape (how LOCK 006 reports flow to shared volume)
4. Denial reason schema (formalizing LOCK 005's structured reasons)
5. Consumption contracts (what each crew member watches for, what triggers action)
6. Future ACP adapter boundary (when runtime/dashboard added, how Tripp.Control exposes via ACP)

## Coordination Protocol

- Codex implements locks, hands off to Eddie
- Eddie briefs Cyony on current state
- Cyony drafts interop/design docs, drops to shared/review-queue/
- Tripp reviews + approves
- Echo validates code-related pieces
- Eddie final approval
- Codex ships next lock with clear boundaries

## Repo Structure Lock

Approved top-level:
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

No unauthorized top-level folders. No forbidden systems. No misplaced files.

## Merge Alignment (If Combined With Other Builds)

1. Tripp.Control = governance spine, not runtime
2. Stack: Node.js + JS + YAML + Node tests
3. No dashboard/frontend framework yet
4. No database yet
5. No provider integration yet
6. No agent runtime execution
7. All modules are deterministic metadata/control
8. Merge must respect structure lock + governance locks
9. Runtime/dashboard/database/provider/autonomous execution = future approved locks, not assumed
10. Other builds with UI/runtime/provider plug in via explicit adapter boundaries later

## Pitfalls

- Don't skip locks — build sequence is intentional
- Don't introduce forbidden systems early (scope creep)
- Don't let Codex proceed to LOCK 007 without interop boundary doc (now APPROVED v1.1)
- Don't self-apply routing policy/doctrine improvements (Tripp/Echo/Eddie chain required)
- Don't forget: deterministic metadata only, no live execution until explicitly locked
- LOCK reviews should follow the structured format in `references/lock-review-template.md` — severity/category/description/suggestion per item, not free-form prose
