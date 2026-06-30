# Build Prompt for External LLM Implementation (LOCK Pattern)

Use this structure when prompting external LLMs (Codex, GPT-4, Claude Code, Gemini, etc.) to implement code with strict governance boundaries. The LOCK format prevents scope creep, forces forbidden-system discipline, and requires a structured completion report proving no unauthorized changes.

**Best for:** governance layers, control planes, auditable builds, crew-shared code where one wrong `import sqlite3` or `fetch()` call breaks the contract.

## When to Use

- Delegating a module to another model while preserving hard architectural constraints
- Building governance/control code where "just add a database" is forbidden
- Shared crew code where one agent's drift breaks another agent's assumptions
- Any build where the implementer (external LLM) has NO context for the project

## When NOT to Use

- Open-ended exploration / creative prototyping
- Small fixes or refactors
- Implementer is a subagent with full codebase context (use `subagent-driven-development` instead)

## The Eight Sections of a LOCK Build Prompt

### Section 1: PROJECT CONTEXT
```markdown
## PROJECT CONTEXT
**Project:** {name}
**Repo path:** {absolute_path}
**Current state:** {locks complete, all verified}
**Stack:** {language} + {frameworks} + {test runner}
**Dependencies:** {list existing — nothing new without approval}
```

### Section 2: PROJECT PURPOSE (DO NOT LOSE THIS)
State what the project IS and IS NOT. External LLMs forget this first.

```markdown
## PROJECT PURPOSE (DO NOT LOSE THIS)
**It IS:** {list positive constraints}
**It is NOT:** {list negative constraints — dashboard, API, database, etc.}
```

### Section 3: EXISTING LOCKS (DO NOT MODIFY)
Enumerate every existing component the implementer must preserve. List exact file paths and exported functions.

```markdown
## EXISTING LOCKS (DO NOT MODIFY)
- **LOCK 001** — Foundation scaffold (README, package.json, ...)
- **LOCK 002** — Config loading (src/utils/loadYaml.js)
- **LOCK 003** — Task classifier (src/core/taskClassifier/index.js, exports `classifyTask(input)`)
- **LOCK 004** — Model router (src/core/modelRouter/index.js, exports `routeTask(classification, options)`)
...
```

This prevents the external LLM from silently "improving" existing code.

### Section 4: HARD FORBIDDEN SYSTEMS
The kill list. Every technology and feature that IS NOT ALLOWED.

```markdown
## HARD FORBIDDEN SYSTEMS
**MUST NOT add any of these (unless explicitly approved by a future lock):**
- Live model calls (no API calls to any LLM provider, ever)
- Database/SQLite
- API server
- Dashboard/UI
- Autonomous agent execution
{complete list — be exhaustive}

**These modules are {deterministic|declarative|...}. They propose. They do not execute.**
```

### Section 5: LOCK NUM REQUIREMENTS
The actual work. Break into sub-sections per module.

For each module:
- **Location:** exact file path
- **Export:** exact function signature the downstream consumer expects
- **Input/Output shapes:** TypeScript-style types so the external LLM doesn't guess
- **Detection/Implementation rules:** numbered, falsifiable — "if X then Y must hold"
- **Confidence/Scoring:** if applicable, explicit arithmetic (e.g. +0.2 per matching filter, cap at 1.0)

### Section 6: TEST REQUIREMENTS
Minimum test cases per module. Enumerate each case:

```markdown
### Module Name Tests
**Location:** tests/unit/moduleName.test.js
**Minimum test cases:**
1. {input description} → {expected output or behavior}
2. Null/undefined input → graceful error, not crash
3. Input with missing config → fall back to default thresholds
4. {specific edge case relevant to detection rules}
...
```

**Target:** 10+ tests per module minimum. Cover happy path, edge cases, null input, missing config.

### Section 7: VALIDATION COMMANDS (MUST ALL PASS)
Exact commands the external LLM must run and report results for:

```markdown
## VALIDATION COMMANDS (MUST ALL PASS)
```bash
npm run validate
npm test
npm run dev
node --check src/core/moduleA/index.js
node --check src/core/moduleB/index.js
```
```

### Section 8: REQUIRED COMPLETION REPORT

**Non-negotiable.** Without this, you cannot verify scope discipline.

```markdown
## REQUIRED COMPLETION REPORT
Every build prompt must end with a completion report using this exact format:

### LOCK N COMPLETION REPORT

**PHASE:** {module descriptions}

**STATUS:** PASS / PATCH / STOP

**FILES CHANGED:**
- {exact file paths with created/modified}

**VALIDATION RUN:**
- {each validation command}

**VALIDATION RESULT:**
- {each command: PASS/FAIL with details}

**SCOPE CHECK:**
- Live model calls added? NO
- Database added? NO
- Dashboard added? NO
- {every forbidden system: NO}

**DRIFT CHECK:**
- No unauthorized top-level folders
- No forbidden systems introduced
- All new files match LOCK N scope

**BLOCKERS:** None (or list)

**NEXT RECOMMENDED LOCK:** LOCK N+1: {description}
```

## Additional Sections Worth Including

### INTEROP BOUNDARY
Where do artifacts go after the module runs?

```markdown
## INTEROP BOUNDARY (CRITICAL)
**Artifacts go to:**
- File: {path} (not implemented yet — module produces data, external system writes)
- Inbox: {path} with summary

**The module only PRODUCES the data.** It does NOT write to the shared volume.
**{Project} proposes. A human or future runtime writes.**
```

### YAML CONFIG SCHEMA ADDITIONS
If the module has a config file, enumerate the exact YAML structure.

### REFERENCES (READ THESE FIRST)
Point at existing source files the implementer MUST read before coding:

```markdown
## REFERENCES (READ THESE BEFORE STARTING)
- src/core/taskClassifier/index.js — your input format (LOCK 003)
- src/core/modelRouter/index.js — how routing decisions are made (LOCK 004)
- tests/unit/ — existing test patterns

**The existing tests and source files ARE your spec reference.** Match their patterns exactly.
```

## Full Example

See: `/opt/data/shared/review-queue/build-prompts/LOCK-007-build-prompt.md`

This was the real-world build prompt for Tripp.Control LOCK 007 (Forge Candidate Detector + Routing Lesson Detector). It follows the exact pattern above and has been validated as prompt-ready for external LLMs.

## Anti-Patterns (Don't Do These)

- **Asking "build something that does X"** — too vague. Use the LOCK format.
- **Not listing forbidden systems** — external LLMs default to adding databases, APIs, dashboards. Name the kill list.
- **Omitting the completion report** — you'll have no proof scope discipline held.
- **Not listing existing locks** — external LLM will silently "improve" them.
- **Specifying implementation instead of input/output shapes** — the external LLM knows how to write code better than you do. Tell it WHAT, not HOW.
- **Vague test requirements** — "make sure it works" is not a test. "Null input → graceful error, not crash" is a test.

## Handoff to External LLM

When giving this to Codex/GPT/Claude Code, preface with:

```
Read this build prompt carefully and implement LOCK N exactly as specified.
Reference file: shared/review-queue/build-prompts/LOCK-N-build-prompt.md

You must:
1. Read existing LOCK 1-{N-1} code first (match its patterns)
2. Create the modules exactly as specified
3. Write {min_tests} tests minimum
4. Run all validation commands
5. Produce the completion report at the end

Do NOT add any forbidden systems. If you can't finish, output PATCH or STOP.
```

## Related Skills
- `writing-plans` — when you write the plan yourself rather than delegating
- `subagent-driven-development` — when delegating to a Hermes subagent with full codebase context
- `test-driven-development` — the underlying discipline (the LOCK pattern enforces TDD via numbered test cases)
