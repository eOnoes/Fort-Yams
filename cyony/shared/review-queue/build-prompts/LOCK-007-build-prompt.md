# LOCK 007 — Build Prompt
# Forge Candidate Detector + Routing Lesson Detector

## PROJECT CONTEXT

**Project:** Tripp.Control
**Repo path:** D:\Echos.House\builds\apps\Tripp.Control
**Current state:** 6 locks complete (LOCK 001-006), all PASS
**Stack:** Node.js + JavaScript + YAML config + Node built-in test runner
**Dependencies:** `yaml` package only

---

## WHAT THIS LOCK BUILDS

Two detection modules that identify patterns from task execution and produce consumable artifacts:

### 1. Forge Candidate Detector
Detects when a task pattern recurs frequently enough to warrant extraction as a reusable module.

### 2. Routing Lesson Detector  
Detects when model routing decisions led to failure or success, capturing the lesson for future routing improvement.

These two modules may be implemented in ONE lock or SPLIT into LOCK 007 + LOCK 008. Builder's choice — whichever produces cleaner code and tests.

---

## PROJECT PURPOSE (DO NOT LOSE THIS)

Tripp.Control is a governance and model-routing control layer. **It is NOT:**
- A dashboard
- A model provider wrapper
- A Hermes fork
- An OpenRouter runtime
- An API server
- A database app
- An autonomous agent runner

**It IS:**
- Config validation, task classification, model routing metadata, attempt tracking, escalation decision logic, structured report generation, and NOW candidate detection.

---

## EXISTING LOCKS (DO NOT MODIFY)

All of these are PASS and must remain untouched:

- **LOCK 001** — Foundation scaffold (README, package.json, .gitignore, .env.example, docs/, configs/, governance/, src/, reports/, forge/, tests/, scripts/)
- **LOCK 002** — Config loading + policy validation (YAML parser, validate-config.js)
- **LOCK 003** — Multi-axis task classifier (`src/core/taskClassifier/index.js`, exports `classifyTask(input)`)
- **LOCK 004** — Model router (`src/core/modelRouter/index.js`, exports `routeTask(classification, options)`)
- **LOCK 005** — Escalation guard + attempt ledger (`src/core/attemptLedger/index.js`, `src/core/escalationGuard/index.js` — exports `createAttemptLedger()`, `evaluateEscalation(input)`)
- **LOCK 006** — Report engine (`src/core/reportEngine/index.js` — 4 report generators)

---

## HARD FORBIDDEN SYSTEMS

**MUST NOT add any of these (unless explicitly approved by a future lock):**
- Live model calls (no API calls to any LLM provider, ever)
- OpenRouter integration
- Hermes integration
- Dashboard/UI
- API server
- Database/SQLite
- Phone/cloud access
- Autonomous agent execution
- Provider SDK integration
- Persistent storage layer (beyond in-memory attempt ledger)
- Forge auto-promotion
- Routing doctrine auto-update
- Report review automation

**These modules are deterministic metadata/control components. They propose. They do not execute.**

---

## LOCK 007 REQUIREMENTS

### A. Forge Candidate Detector

**Location:** `src/core/forgeCandidateDetector/index.js`

**Export:** `detectForgeCandidate(input)` → returns a candidate report object

**Input object shape:**
```javascript
{
  task: {                          // from LOCK 003 classifier
    type: "code-generation|bugfix|refactor|research|deployment|...",
    task_class: "narrow|moderate|broad",
    risk_class: "low|medium|high",
    cost_class: "low|medium|high",
    budget_class: "fixed|flexible",
    scope_class: "single-file|multi-file|repo-wide",
    reusability_class: "once|occasional|frequent"
  },
  routing: {                       // from LOCK 004 router
    selected_model: "model-id",
    selected_agent: "agent-id",
    routing_chain: ["model-a", "model-b", "model-c"],
    premium_justification_required: false,
    approval_flags: []
  },
  escalation: {                    // from LOCK 005 guard
    total_attempts: 3,
    attempts_by_model: { "model-a": 2, "model-b": 1 },
    escalated: true,
    reasons: []
  },
  history: {                       // provided by caller (Tripp.Control runtime, when it exists)
    recurrence_count: 5,           // how many times this task pattern appeared
    pattern_signature: "code-generation|low-risk|single-file",  // unique task fingerprint
    previous_outcomes: ["success", "success", "escalated", "success"]
  },
  config: {                        // policy config (from governance/ YAML)
    forge_recurrence_threshold: 3, // tasks appearing 3+ times flagged as candidate
    forge_scope_filter: ["single-file", "multi-file"],  // only flag these scopes
    forge_reusability_filter: ["occasional", "frequent"]  // only flag these reusability classes
  }
}
```

**Output object shape:**
```javascript
{
  is_candidate: true|false,
  confidence: 0.0-1.0,             // how confident the detector is
  reasons: ["string", "string"],    // human-readable reasoning
  manifest: {
    id: "candidate-{date}-{seq}",   // e.g. "candidate-20260602-001"
    task_pattern: {
      type: "...",
      task_class: "...",
      risk_class: "...",
      cost_class: "...",
      scope_class: "...",
      reusability_class: "..."
    },
    recurrence_count: 5,
    pattern_signature: "...",
    recommended_action: "extract|ignore",
    recommended_module_name: "autoGenerateTests",
    recommended_scope: "src/core/testing/",
    validation_required: {
      echo_validate: true|false,    // true if code-related
      tripp_approve: true
    }
  },
  report_content: "...",            // Markdown report (LOCK 006 style)
  warnings: ["string"]              // any issues
}
```

**Detection rules:**
1. `recurrence_count >= config.forge_recurrence_threshold`
2. `task.scope_class` is in `config.forge_scope_filter`
3. `task.reusability_class` is in `config.forge_reusability_filter`
4. `esculation.escalated === false` OR escalation has a clear `success` outcome in history
5. Confidence score:
   - +0.2 for each matching filter (max 0.8 for all 4)
   - +0.1 if `recurrence_count >= threshold × 2`
   - +0.1 if 75%+ of `previous_outcomes` are "success"
   - Cap at 1.0
6. If `is_candidate === true`, generate the manifest object
7. If `is_candidate === false`, reasons must explain why not (e.g. "only appeared 1 time", "repo-wide scope excluded")

---

### B. Routing Lesson Detector

**Location:** `src/core/routingLessonDetector/index.js`

**Export:** `detectRoutingLesson(input)` → returns a lesson report object

**Input object shape:**
```javascript
{
  task: { ... },                  // same as forge detector (LOCK 003 output)
  routing: { ... },               // same as forge detector (LOCK 004 output)
  escalation: { ... },            // same as forge detector (LOCK 005 output)
  execution: {                    // provided by caller
    initial_model: "model-a",
    succeeded_with_model: "model-c" | null,  // null if task never succeeded
    attempts: [
      { model: "model-a", result: "failure", reason: "timeout" },
      { model: "model-b", result: "failure", reason: "invalid_output" },
      { model: "model-c", result: "success", reason: "completed" }
    ]
  },
  config: {
    lesson_min_attempts: 2,        // require at least 2 model attempts to generate a lesson
    lesson_requires_model_switch: true  // only if model actually changed
  }
}
```

**Output object shape:**
```javascript
{
  is_lesson: true|false,
  confidence: 0.0-1.0,
  reasons: ["string", "string"],
  manifest: {
    id: "routing-lesson-{date}-{seq}",
    lesson_type: "code|policy",     // inferred from task.scope_class + task.type
    observation: "Model model-a failed twice (timeout, invalid_output). Model model-c succeeded.",
    failed_models: ["model-a", "model-b"],
    succeeded_model: "model-c",
    task_pattern: { ... },          // same task classification
    recommended_routing: {
      primary_model: "model-c",
      fallback_chain: ["model-a", "model-b"],  // kept as fallbacks
      avoid_for_task_type: [],       // models that should be skipped
      confidence_boost: "high"       // how much to trust this lesson
    },
    validation_status: {
      echo_validated: false,
      tripp_approved: false
    }
  },
  report_content: "...",           // Markdown report
  warnings: []
}
```

**Detection rules:**
1. `execution.attempts.length >= config.lesson_min_attempts`
2. At least one model in attempts changed AND at least one succeeded
3. If `config.lesson_requires_model_switch === true`, require different models before extracting a lesson
4. `lesson_type = "code"` if task has `code-generation|refactor|bugfix|deployment`; else `"policy"`
5. Confidence score:
   - +0.2 per failed model attempt (clear failure signal)
   - +0.3 if a single model succeeded after 2+ failures
   - +0.2 if `history.recurrence_count >= 2` (same routing failure observed twice)
   - Cap at 1.0
6. If `is_lesson === false`, reasons must explain why (e.g. "only 1 attempt, no model switch", "no clear success")

---

## YAML CONFIG SCHEMA ADDITIONS

Add to `governance/schemas/policy.schema.json` (or extend existing validation):

```yaml
forge_candidate_detector:
  recurrence_threshold: 3
  scope_filter:
    - single-file
    - multi-file
  reusability_filter:
    - occasional
    - frequent

routing_lesson_detector:
  min_attempts: 2
  requires_model_switch: true
```

---

## TEST REQUIREMENTS

### Forge Candidate Detector Tests
**Location:** `tests/unit/forgeCandidateDetector.test.js`

**Minimum test cases:**
1. Task with `recurrence_count >= threshold` AND matching scope AND matching reusability → `is_candidate: true`
2. Task with `recurrence_count < threshold` → `is_candidate: false` with reason
3. Task with `recurrence_count >= threshold` BUT `scope_class` not in filter → `is_candidate: false`
4. Task with `recurrence_count >= threshold` BUT `reusability_class` not in filter → `is_candidate: false`
5. Task with `escalated: true` and no success history → still `is_candidate: false` (don't promote failure)
6. Task with `recurrence_count >= threshold` AND 75% success history → `is_candidate: true`, `confidence >= 0.9`
7. Task with `recurrence_count >= threshold × 2` → `confidence >= 0.9`
8. Null/undefined input → graceful error, not crash
9. Input with missing config → fall back to default thresholds
10. Code-related task (e.g. "code-generation") → `manifest.validation_required.echo_validate = true`
11. Non-code task (policy) → `manifest.validation_required.echo_validate = false`
12. Manifest ID format matches regex: `candidate-\d{8}-\d{3}`

### Routing Lesson Detector Tests
**Location:** `tests/unit/routingLessonDetector.test.js`

**Minimum test cases:**
1. Task with 3 attempts, different models, 2 failures + 1 success → `is_lesson: true`
2. Task with only 1 attempt → `is_lesson: false` with reason
3. Task with 3 attempts but same model all 3 times → `is_lesson: false` (no model switch)
4. `lesson_requires_model_switch: false` → lesson generated even without switch
5. Task with 2 failed models → `manifest.recommended_routing.fallback_chain` contains both
6. `lesson_type = "code"` for code-generation task
7. `lesson_type = "policy"` for research/analysis task
8. Null/undefined input → graceful error
9. Input with missing config → fall back to default thresholds
10. Manifest ID format matches regex: `routing-lesson-\d{8}-\d{3}`

---

## VALIDATION COMMANDS (MUST ALL PASS)

```bash
npm run validate
npm test
npm run dev
node --check src/core/forgeCandidateDetector/index.js
node --check src/core/routingLessonDetector/index.js
```

---

## REPORT FORMAT (Markdown)

Both modules must produce `report_content: string` (Markdown) following LOCK 006 style:

```markdown
## Forge Candidate Report — candidate-20260602-001

**Pattern:** code-generation | low-risk | single-file | frequent
**Recurrence:** 5 occurrences
**Confidence:** 0.9
**Recommended action:** Extract module to src/core/testing/

### Observations
- Observed in sessions: 2026-05-30, 2026-05-31 (×2), 2026-06-01 (×2)
- Success rate: 4/5 (80%)
- Previous implementations: similar

### Proposed Module
- Recommended name: autoGenerateTests
- Scope: single-file code generation
- Reusability: frequent

### Validation Required
- Echo code validation: YES
- Tripp approval: YES

**Status:** Pending
```

---

## INTEROP BOUNDARY (CRITICAL)

**Candidate artifacts go to:**
- File: `shared/forge/candidates/candidate-{id}/manifest.json` (not implemented yet — Tripp.Control produces manifest, external system writes to disk)
- Inbox message: `shared/inbox/forge-candidate-{id}-{agent}.md` with summary

**Routing lesson artifacts go to:**
- File: `shared/routing-lessons/{code|policy}/lesson-{id}.json` (not implemented yet — Tripp.Control produces manifest, external system writes to disk)
- Inbox message: `shared/inbox/routing-lesson-{id}-{agent}.md` with summary

**For now:** Tripp.Control only PRODUCES the manifest objects. It does NOT write to the shared volume. File writing is a future LOCK concern (LOCK 008 or 009 — artifact writer module).

**Tripp.Control proposes. A human or future runtime writes.**

---

## REQUIRED COMPLETION REPORT

Every build prompt must end with a completion report using this exact format:

```markdown
## LOCK 007 COMPLETION REPORT

PHASE:
    Forge Candidate Detector + Routing Lesson Detector
    
STATUS: PASS / PATCH / STOP

FILES CHANGED:
    - src/core/forgeCandidateDetector/index.js (created)
    - src/core/routingLessonDetector/index.js (created)
    - tests/unit/forgeCandidateDetector.test.js (created)
    - tests/unit/routingLessonDetector.test.js (created)
    - governance/schemas/policy.schema.json (updated)

VALIDATION RUN:
    npm run validate
    npm test
    npm run dev
    node --check src/core/forgeCandidateDetector/index.js
    node --check src/core/routingLessonDetector/index.js

VALIDATION RESULT:
    npm run validate: PASS
    npm test: PASS, X/X tests passing
    npm run dev: PASS, placeholder runs cleanly
    node --check: PASS for all new files

SCOPE CHECK:
    Live model calls added? NO
    OpenRouter/provider integration added? NO
    Hermes integration added? NO
    Dashboard/API/server added? NO
    Database/SQLite/persistent storage added? NO
    Phone/cloud access added? NO
    Autonomous agent execution added? NO
    Forge auto-promotion added? NO
    Routing doctrine auto-update added? NO
    Artifact writer (shared volume writes) added? NO

DRIFT CHECK:
    No unauthorized top-level folders were added.
    No forbidden systems were introduced.
    No files placed outside approved folder purpose.
    No dashboard/server/database/model-runtime work added early.
    All new files match LOCK 007 scope.

BLOCKERS:
    None (or list blockers with STOP status)

NEXT RECOMMENDED LOCK:
    LOCK 008: Artifact Writer (writes manifests to shared volume)
    OR
    LOCK 008: Interop CLI Tool (tripp-control status/report/queue/approve)
```

---

## FINAL INSTRUCTIONS

1. **Read the entire existing Tripp.Control codebase before writing anything.** Know what's there.
2. **Follow the exact export signatures above.** These are contracts — downstream systems will call them.
3. **Use the same style as LOCK 003-006.** Defensive input handling, missing field warnings, no crashes.
4. **Test thoroughly.** Minimum 10 tests per module. Cover edge cases, null input, missing config.
5. **Do NOT add forbidden systems.** If you catch yourself about to add `fetch()`, `sqlite3`, `express`, or any provider SDK — STOP.
6. **Produce the completion report** at the end. If it can't reach PASS, output PATCH with diffs, or STOP with reasons.

---

## REFERENCES (READ THESE BEFORE STARTING)

- `src/core/taskClassifier/index.js` — your input format (LOCK 003)
- `src/core/modelRouter/index.js` — how routing decisions are made (LOCK 004)
- `src/core/escalationGuard/index.js` — escalation logic (LOCK 005)
- `src/core/reportEngine/index.js` — report format style (LOCK 006)
- `governance/schemas/policy.schema.json` — config validation patterns
- `tests/unit/` directory — existing test patterns

**The existing tests and source files ARE your spec reference.** Match their patterns exactly.

---

*Prompt prepared by: Cyony (crew architect/creative builder)*
*Date: 2026-06-02*
*Approved by: Pending Tripp review → Eddie final sign-off*
