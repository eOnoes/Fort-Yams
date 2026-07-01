# LOCKED BUILD PROMPT 007 — Routing Lesson + Forge Candidate Detector

## MERGED VERSION (Cyony additions marked with `§ CYONY ADDENDUM`)

Repo: `D:\Echos.House\builds\apps\Tripp.Control`

---

## Objective

Implement the deterministic candidate detection layer for Tripp.Control.

LOCK 007 must use existing metadata from the classifier, model router, attempt ledger, escalation guard, and report engine to detect when a task result should become:

- Routing Lesson Candidate
- Forge Module Candidate

This lock answers:

- Did this task reveal a reusable routing lesson?
- Did this task reveal a reusable Forge/module pattern?
- Did repeated failure or escalation expose a future prevention rule?
- Did premium model usage solve something that should be standardized?
- Did validation produce a reusable recipe?
- Should this be submitted for review instead of silently forgotten?

This pass must detect candidates only. It must not approve, promote, apply, auto-update, or mutate doctrine/routing policy/config.

---

## Current Baseline

- **LOCK 001**: Foundation scaffold ✅
- **LOCK 002**: YAML config loading + policy validation ✅
- **LOCK 003**: Multi-axis task classifier (`classifyTask(input)`) ✅
- **LOCK 004**: Model router (`routeTask(classification, options)`) ✅
- **LOCK 005**: Escalation guard + attempt ledger (`createAttemptLedger()`, `evaluateEscalation(input)`) ✅
- **LOCK 006**: Report engine (4 report generators + `generateReport(input)`) ✅ — reports are Markdown only

---

## Hard Scope Boundary

### Allowed work:
- `src/core/candidateDetector/`
- `tests/unit/candidateDetector.test.js`
- `governance/schemas/candidate.schema.json` (only if needed)
- `docs/candidate-detector-related` notes (only if needed)
- `package.json` only if absolutely required for test/script wiring
- `scripts/` only if a tiny local candidate detector demo/helper is clearly needed

### Forbidden work:
- No live model calls
- No OpenRouter integration
- No Hermes integration
- No dashboard / API server / database / SQLite
- No phone/cloud access
- No autonomous agent execution
- No persistent candidate storage layer
- No Forge promotion engine
- No routing doctrine auto-update
- No provider integration
- No attempt execution
- No report review automation
- No automatic config or governance mutation

Do not skip ahead into dashboard/runtime/provider/database work.

---

## Required Candidate Detector Behavior

Preferred file: `src/core/candidateDetector/index.js`

Export at least: `detectCandidates(input)`

Optional helpful exports (testing only):
- `detectRoutingLessonCandidate(input)`
- `detectForgeModuleCandidate(input)`
- `normalizeCandidateInput(input)`
- `CANDIDATE_DETECTOR_CONSTANTS`

### § CYONY ADDENDUM: Input Contract Reference
The input shape MUST use field names from:
- LOCK 003's `classifyTask()` output
- LOCK 004's `routeTask()` output
- LOCK 005's `evaluateEscalation()` output

Do not invent new field names. Read the source of those modules first and use the exact same keys. If a field doesn't exist on those contracts, don't use it. This keeps LOCK 007 composable without refactoring prior locks.

### Input example:
```js
{
  task: { task_id: "task-001", title: "Fix config validation mismatch" },
  classification: {
    task_class: "BUG_FIX",
    risk_class: "MEDIUM",
    budget_class: "NORMAL",
    scope_class: "SMALL",
    reusability_class: "FORGE_CANDIDATE"
  },
  routing: {
    selected_model: "qwen3-coder-480b-a35b",
    selected_agent: "Echo",
    routing_chain: ["qwen3-coder-480b-a35b", "deepseek-v4-pro", "claude-sonnet-4.6", "human"],
    requires_premium_justification: false,
    warnings: []
  },
  attempts: [],
  escalation: {
    decision: "ESCALATE",
    reason_codes: ["SAME_ERROR_REPEATED"],
    recommended_next_model: "deepseek-v4-pro",
    warnings: []
  },
  reports: []
}
```

### Output example:
```js
{
  status: "READY",
  candidates: [
    {
      candidate_type: "ROUTING_LESSON_CANDIDATE",
      candidate_id: "candidate-task-001-routing-lesson",
      task_id: "task-001",
      title: "Routing Lesson Candidate — Fix config validation mismatch",
      reason_codes: ["SAME_ERROR_REPEATED"],
      summary: "Repeated validation failure suggests future routing or prompt adjustment.",
      evidence: ["attempt 3 and attempt 4 both returned validation error 'field_mismatch'"],  // § CYONY: REQUIRED, never empty when candidate exists
      recommended_review_path: ["Tripp review", "Echo validation if code/workflow-related", "Eddie final approval", "routing doctrine/config update"],
      promotion_allowed: false,
      warnings: []
    }
  ],
  warnings: []
}
```

---

## Required Candidate Types

At least:
- `ROUTING_LESSON_CANDIDATE`
- `FORGE_MODULE_CANDIDATE`

Optional future constants allowed but not implemented beyond naming.

---

## Routing Lesson Candidate Rules

Trigger when one or more of these are true:
- Same validation error repeated
- Same model failed twice
- Task escalated after lower-model failure
- Premium model required or requested
- Routing warnings indicate model mismatch
- Failure category suggests capability mismatch
- Classification/routing mismatch detected
- Task should have been split
- Prompt was too broad
- Missing context caused failure
- Task class repeatedly escalates

Suggested reason codes:
`SAME_ERROR_REPEATED`, `MODEL_RETRY_LIMIT_REACHED`, `ESCALATION_AFTER_FAILURE`, `PREMIUM_REQUIRED`, `MODEL_MISMATCH`, `PROMPT_TOO_BROAD`, `MISSING_CONTEXT`, `TASK_TOO_LARGE`, `CLASSIFICATION_ROUTING_MISMATCH`, `TASK_SPLIT_RECOMMENDED`

Every candidate must state:
- What routing lesson may have been learned
- What evidence triggered it
- What should be reviewed
- Whether routing config might need adjustment
- Why it cannot self-apply

Promotion path: **Observed failure → Routing Lesson Candidate → Tripp review → Echo validation (if code/workflow) → Eddie final approval → routing doctrine/config update**

The detector must not update routing config.

---

## Forge Module Candidate Rules

Trigger when one or more of these are true:
- `reusability_class` is `FORGE_CANDIDATE`
- LOCK 006 report type is `FORGE_MODULE_CANDIDATE`
- A reusable validation recipe is present
- Same problem pattern appears more than once
- Premium model solved something reusable
- Escalation success audit recommends Forge module creation
- Task result has clear inputs/outputs/allowed targets/forbidden targets
- Repeated fix pattern appears in attempts or reports

Suggested reason codes:
`REUSABILITY_FLAGGED`, `FORGE_REPORT_PRESENT`, `VALIDATION_RECIPE_PRESENT`, `REPEATED_PATTERN`, `PREMIUM_SOLVED_REUSABLE_PATTERN`, `ESCALATION_SUCCESS_RECOMMENDS_FORGE`, `CLEAR_MODULE_CONTRACT`

Every candidate must state:
- What pattern may be reusable
- Why it might belong in Forge
- What inputs/outputs are known
- What allowed/forbidden targets are known
- What validation recipe is known
- What review is required before promotion

Promotion path: **Candidate → Tripp review → Echo validation → Eddie approval (when needed) → Approved Forge module**

The detector must not promote Forge modules.

---

## Required Safety / Boundary Rules

§ CYONY ADDENDUM: Every candidate object must include ALL of the following:
- `promotion_allowed: false`
- `evidence: string[]` — non-empty array describing what triggered detection (e.g. `"attempt 3 and attempt 4 both returned 'TIMEOUT'"`)
- `candidate_id` — deterministic (same input → same ID, for future dedup in LOCK 008+)

Every detection result must include a warning or note equivalent to:
**"Candidate detection does not approve, promote, mutate config, or update doctrine."**

The detector must NOT:
- Write files
- Modify configs, governance docs, routing policy, Forge inventory
- Approve candidates
- Promote candidates
- Call models or providers
- Execute agents

---

## Report Engine Integration

LOCK 007 MAY use LOCK 006 report functions to generate candidate report content if simple and local:
- `generateForgeModuleCandidateReport(input)`
- `generateReport(input)`
- Returning generated Markdown as part of candidate metadata

Forbidden:
- Writing report files automatically
- Reviewing reports automatically
- Promoting candidates from reports automatically
- Updating routing doctrine from reports automatically

If report engine integration adds complexity, keep LOCK 007 detector-only and defer report composition.

---

## Input Handling

Must tolerate incomplete input without crashing:
- `detectCandidates(null)`
- `detectCandidates({})`
- `detectCandidates({ attempts: [] })`
- `detectCandidates({ classification: { reusability_class: "FORGE_CANDIDATE" } })`
- `detectCandidates({ escalation: { reason_codes: ["SAME_ERROR_REPEATED"] } })`

For empty/null input, return:
```js
{ status: "READY", candidates: [], warnings: ["<reason>"] }
```

---

## Test Requirements

Node built-in test runner (`npm test`).

§ CYONY ADDENDUM: **Minimum 15 test cases** (the 10 below + 5 additional):

### Core tests:
1. null/empty input does not crash and returns no candidates with warnings
2. repeated validation error creates Routing Lesson Candidate
3. same model failed twice creates Routing Lesson Candidate
4. escalation after lower-model failure creates Routing Lesson Candidate
5. premium-required condition creates Routing Lesson Candidate and flags review
6. `reusability_class: "FORGE_CANDIDATE"` creates Forge Module Candidate
7. Forge report metadata creates Forge Module Candidate
8. validation recipe evidence creates Forge Module Candidate
9. detector sets `promotion_allowed: false` on all candidates
10. detector does not write files, mutate configs, call models, or import network/API/runtime code

### § CYONY ADDENDUM — Additional required tests:
11. **Combined signal**: `classification` + `escalation` + `attempts` together produce BOTH candidate types when applicable (a task can have routing AND forge signals simultaneously)
12. **Clean task**: task with no escalation and no reuse signals returns `candidates: []` with appropriate "no evidence" warning
13. **Non-empty evidence**: `evidence` field is ALWAYS populated when a candidate exists (empty array is invalid — candidate without a reason is noise)
14. **Review path order**: `recommended_review_path` array order matches doctrine (Tripp → Echo → Eddie)
15. **Deterministic ID**: `candidate_id` format is stable (same input → same ID, enabling future dedup in LOCK 008+)

---

## Validation Requirements

Run and record:
- `npm run validate`
- `npm test`
- `npm run dev`
- `node --check src/core/candidateDetector/index.js`
- Run `node --check` on any optional files added

---

## Acceptance Criteria

LOCK 007 passes only if:
- Candidate detector exists and exports `detectCandidates(input)`
- Detector can produce Routing Lesson Candidates
- Detector can produce Forge Module Candidates
- Detector separates detection from promotion
- Every candidate has `promotion_allowed: false`
- Every candidate has non-empty `evidence: string[]`  **§ CYONY ADDENDUM**
- Every candidate has deterministic `candidate_id`  **§ CYONY ADDENDUM**
- Detector includes review paths
- Detector tolerates missing/null input
- Detector does NOT call models, write files, or modify config/governance/routing/Forge inventory
- Detector does NOT implement provider/API/database/dashboard/runtime work
- Detector uses field names from LOCK 003/004/005 contracts without inventing new ones  **§ CYONY ADDENDUM**
- Tests cover the required 15 cases  **§ CYONY ADDENDUM**
- Validation passes
- Completion report confirms no scope drift

---

## Stop Conditions

Stop and report PATCH or STOP if:
- Detector auto-promotes Forge modules
- Detector updates routing doctrine or config
- Detector writes persistent records without approval
- Detector performs live model calls
- Detector adds OpenRouter/provider integration
- Detector starts autonomous execution
- Detector adds API/server/dashboard/database work
- Detector performs report review automation
- Detector cannot pass validation

---

## Required Completion Report

Generate **Markdown only** to: `reports/LOCK-007-routing-lesson-forge-candidate-detector-REPORT.md`

§ CYONY ADDENDUM: The report MUST explicitly confirm each field from LOCK 006's style PLUS:
- "Evidence field populated on all candidates: YES/NO"
- "Candidate IDs deterministic: YES/NO"
- "Test coverage: X/15 cases passing"
- "Field names match LOCK 003/004/005 contracts: YES/NO — list any drift"

Required sections:
```
PHASE:
STATUS: PASS / PATCH / STOP
FILES CHANGED:
VALIDATION RUN:
VALIDATION RESULT:
SCOPE CHECK:
DRIFT CHECK:
BLOCKERS:
NEXT RECOMMENDED LOCK:
```

The report must specifically confirm:
- No scope drift occurred
- No forbidden systems were added
- No out-of-lock features were implemented
- All changes stayed inside the current lock boundary
- Validation commands were run and results were recorded

Bring this Markdown report back for review before proceeding to the next lock.

---

## Final Instructions

1. **Read LOCK 003/004/005/006 source code before writing anything.** Use their exact field names.
2. Follow the export signatures above exactly — they are contracts.
3. Match LOCK 003-006 defensive input-handling style.
4. Write a minimum of 15 tests.
5. Do NOT add forbidden systems. If you catch yourself adding `fetch()`, `sqlite3`, `express`, or any provider SDK — STOP.
6. Produce the completion report at the end. If it can't reach PASS, output PATCH with diffs, or STOP with reasons.

---

*Merged by Cyony from GPT's original prompt + 3 governance-tightening additions.*
*Date: 2026-06-02*
*Approved by: Pending Tripp review → Eddie final sign-off*
