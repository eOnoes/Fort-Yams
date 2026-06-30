# LOCK Build Prompt Template

Reusable template for writing LOCK-style constrained build prompts. Used by Tripp.Control and applicable to any governance/control-layer project where scope creep is a real risk.

## When to Use

- Building features sequentially on a deterministic, config-driven codebase
- Each feature has a clear "must NOT do" boundary (no live calls, no database, no dashboard, etc.)
- Multiple builders might touch the code, and you need standardized completion reports
- Warden approval is required before each LOCK ships

## Template Structure

Each build prompt should include these sections **in this order**:

```markdown
# LOCK {NNN} — Build Prompt
# {Feature Name}

## PROJECT CONTEXT
- Repository path
- Current state (which LOCKs are complete)
- Stack (runtime, language, test runner, config format)
- Current dependencies

## WHAT THIS LOCK BUILDS
Brief description — usually 1-2 new modules or detection engines.

## PROJECT PURPOSE (DO NOT LOSE THIS)
What the project IS vs what it IS NOT. Copy these bullets into every prompt — they anchor the builder and prevent scope creep.

## EXISTING LOCKS (DO NOT MODIFY)
List every prior LOCK with:
- Lock number + name
- Files changed
- Export signatures (critical — these are downstream contracts)
- Test counts

## HARD FORBIDDEN SYSTEMS
Explicit list of what MUST NOT be added:
- Live model calls
- Database integration
- Dashboard/API/server
- Provider SDK integration
- Autonomous execution
- Auto-promotion
- Auto-updates
- Auto-review

**These modules are deterministic metadata/control components. They propose. They do not execute.**

## LOCK {NNN} REQUIREMENTS

### A. {Module Name}

**Location:** `src/core/{moduleName}/index.js`

**Export:** `{functionName}(input)` → returns result object

**Input object shape:** (full JSON schema)

**Output object shape:** (full JSON schema)

**Detection/business rules:**
1. Rule 1
2. Rule 2
3. ...

### B. {Module Name 2}
(same structure)

## YAML/JSON CONFIG SCHEMA ADDITIONS
Show where config entries should go and what format they must follow.

## TEST REQUIREMENTS
- Test file location
- Minimum test cases (numbered list)
- Edge cases to cover: null input, missing config, missing fields, boundary values

## VALIDATION COMMANDS (MUST ALL PASS)
```bash
npm run validate
npm test
npm run dev
node --check src/core/moduleOne/index.js
node --check src/core/moduleTwo/index.js
```

## REPORT FORMAT
Markdown template for any report output the module produces.

## INTEROP BOUNDARY (CRITICAL)
Where output artifacts go (if any). Example:
```
Candidate artifacts go to:
- File: shared/forge/candidates/candidate-{id}/manifest.json
- Inbox message: shared/inbox/forge-candidate-{id}-{agent}.md with summary
```

**For now:** Module only PRODUCES artifacts. It does NOT write to the shared volume. File writing is a future LOCK concern. **Tripp.Control proposes. A human or future runtime writes.**

## REQUIRED COMPLETION REPORT
Every build must end with this exact report format:

```markdown
## LOCK {NNN} COMPLETION REPORT

PHASE:
    {Feature description}

STATUS: PASS / PATCH / STOP

FILES CHANGED:
    - {file} (created/updated)
    - ...

VALIDATION RUN:
    {each command}

VALIDATION RESULT:
    {each command: PASS/FAIL with details}

SCOPE CHECK:
    Live model calls added? YES/NO
    OpenRouter/provider integration? YES/NO
    Hermes integration? YES/NO
    Dashboard/API/server? YES/NO
    Database/SQLite/persistent storage? YES/NO
    Phone/cloud access? YES/NO
    Autonomous agent execution? YES/NO
    Forge auto-promotion? YES/NO
    Routing doctrine auto-update? YES/NO
    Artifact writer (shared volume writes)? YES/NO

DRIFT CHECK:
    No unauthorized top-level folders? YES/NO
    No forbidden systems? YES/NO
    No files outside approved folder purpose? YES/NO
    All new files match LOCK {NNN} scope? YES/NO

BLOCKERS:
    None (or list blockers with STOP status)

NEXT RECOMMENDED LOCK:
    {next LOCK description}
```

## FINAL INSTRUCTIONS
1. Read the entire existing codebase before writing anything.
2. Follow the exact export signatures — these are contracts.
3. Use the same style as existing LOCKs (defensive input handling, missing field warnings, no crashes).
4. Test thoroughly (minimum N tests per module, cover edge cases).
5. Do NOT add forbidden systems — if you catch yourself about to add a forbidden import, STOP.
6. Produce the completion report (cannot PASS without it).

## REFERENCES
List existing source files the builder should read FIRST:
- `src/core/{priorModule}/index.js` — input format patterns
- `tests/unit/{priorModule}.test.js` — test patterns
- `governance/schemas/{schema}.json` — config patterns

**The existing tests and source files ARE your spec reference. Match their patterns exactly.**

---
*Prompt prepared by: {author}*
*Date: {date}*
*Approved by: Pending {reviewer} review → {final approver} sign-off*
```

## Real Example: Tripp.Control LOCK 007

See: `/opt/data/shared/review-queue/build-prompts/LOCK-007-build-prompt.md` (16KB actual prompt sent to GPT).

LOCK 007 built two detection engines (Forge Candidate + Routing Lesson) on top of 6 prior LOCKs with:
- Complete input/output schemas
- 22+ required tests
- 10-point forbidden systems list
- Interop boundary specifying the module does NOT write to shared volume (future LOCK)
- Standardized completion report format

Result: 45/45 tests passing, zero scope drift, clean PASS status.

## Why This Pattern Works

1. **Anchors the builder** — repeated "project purpose" and "forbidden systems" sections combat drift over long prompts
2. **Contracts are explicit** — export signatures and input/output schemas prevent downstream breakage
3. **Completion report is verifiable** — every "YES/NO" in the scope check can be grep-verified against the diff
4. **Tests are specified upfront** — prevents "I wrote it but didn't test it"
5. **References are given** — reduces cold exploration time

## Pitfalls

- **Forgetting to restate project purpose** — builders on long prompts drift. Copy the "what it IS/IS NOT" from the most recent prompt, don't abbreviate.
- **Not specifying test cases** — "test thoroughly" is not enough. Give the minimum test list.
- **Forbidding without listing** — negative constraints need explicit enumeration ("no database" means SQL, SQLite, Postgres, Mongo, Redis — all of them).
- **Export signatures drift** — if the prior LOCK's export changed, update the references section. Downstream systems call by signature.
