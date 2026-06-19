# Promotion Audit Checklist

Use this checklist when promoting any build/skill/proposal from a builder agent's workspace into `approved-knowledge/` or another agent's workspace.

## Required Checks (All Must Pass)

- [ ] **No hardcoded credentials** — API keys, tokens, passwords, connection strings, secrets
- [ ] **No unexpected outbound network calls** — only approved hosts/domains
- [ ] **No filesystem escapes** — no path traversal, no `../../`, no writing outside sandbox
- [ ] **No execution of user input** — no eval, no shell-injection vectors, no dynamic imports from untrusted sources
- [ ] **No deletion of protected paths** — protected dirs stay untouched
- [ ] **Git diff reviewed** — unexpected changes flagged before merge

## Conditional Checks

- [ ] **No privileged API usage** (if code uses APIs)
- [ ] **Docker builds are unprivileged** (if containerized)
- [ ] **No network namespace escapes** (if sandboxed)
- [ ] **Rate limits respected** (if calling external services)
- [ ] **Idempotent operations** (for automation/scripts)

## Quality Checks

- [ ] **DRY, YAGNI, TDD principles applied**
- [ ] **Tests pass** (if code)
- [ ] **Documentation updated** (if behavior changed)
- [ ] **Naming conventions followed**
- [ ] **No orphan/dead code introduced**

## Review Workflow

```
Builder proposes → review-queue/
    ↓
Warden runs this checklist
    ↓
All pass? → approved-knowledge/ (promoted)
Any fail? → rejected-or-archived/ with REJECTION-{id}.md explaining why
Needs revision? → back to builder with feedback
```

## Rejection Format

```markdown
# REJECTION-{id}

## Proposal
{filename or description}

## From
{builder agent name}

## Date
{timestamp}

## Failed Checks
- [ ] Check N: {reason for failure}

## Recommendations for Resubmission
{actionable feedback}

## Reviewed By
{warden agent name}
```

## Notes

- Rejections are logged to `audit-logs/` for traceability
- Builder agents should read their own rejection files to learn
- Warden should never rubber-stamp just to clear the queue
- If unsure about a check, escalate to human (Eddie-class)
