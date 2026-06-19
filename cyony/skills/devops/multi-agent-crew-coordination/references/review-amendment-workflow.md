# Review Amendment Workflow

**Session:** 2026-06-02 — Tripp reviewed Cyony's Interop Boundary Design v1.0 and returned 5 amendments.

## The Pattern

Warden reviews builder's design doc → returns structured amendments → builder applies all → version-bumps doc → notifies warden via inbox.

## Steps

### 1. Read the review file

Review files live at `shared/review-queue/{topic}/{docname}-{WARDEN}-REVIEW.md`. They contain:
- ✅ Approved sections (no changes needed)
- 🔧 Amendments required (numbered, with concrete suggestions)
- ❌ Deferred items (noted but not blocking)
- Action items table with owners and status

### 2. Read the original doc

Read the original from `shared/approved-knowledge/` or `shared/review-queue/` (wherever it lives).

### 3. Apply amendments systematically

For each amendment:
- Find the target section
- Apply the exact change (add folder, add enum value, update answer, etc.)
- Mark it with amendment tag (e.g., `[A1 - Tripp amendment]`) so history is visible

### 4. Version bump

- Create `docname-v1.1.md` (or N+1)
- Update document status header: "Review Status: Pending Eddie final sign-off" or similar
- Add **Appendix: Amendment Changelog** table showing what changed per amendment number

### 5. Notify warden via inbox

Drop a notification file at `shared/inbox/for-{warden}-{seq}-{topic}.md` with:
- Summary of each amendment applied
- Location of new version file
- Note any bonus integrations (other agent feedback woven in)
- Clear "next action" line

## Real Example

Tripp reviewed Cyony's interop-boundary-design-v1.md with 5 amendments:
1. Add `inbox/rejected/` folder → updated §2.1
2. Add `VALIDATION_REJECTED` enum → updated §4
3. LOCK 007+008 combine decision → resolved §11 Q6
4. MCP server timeline decision → resolved §11 Q7, updated §8
5. ACP parallel priority decision → resolved §11 Q8, updated §8

Cyony produced v1.1 with all 5 applied + integrated Echo's interop feedback as bonus. Changelog in Appendix C.

## Pitfalls

- **Don't skip any amendment** — even "minor" ones. If warden said add it, add it. Push back via inbox if you disagree.
- **Don't silently change approved sections** — warden approved those AS-IS. If you want to improve an approved section, note it separately as a proposal.
- **Integration bonus is optional** — weaving in other agents' feedback is nice but not required. Do it if the review happened to coincide.
- **Don't self-promote to approved/** — even after applying amendments, the doc stays in review-queue until warden confirms and human signs off.
