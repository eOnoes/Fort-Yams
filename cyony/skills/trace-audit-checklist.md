# Trace Audit Checklist (Detailed)

Reference doc for Trace, the named auditor capability. Invoke on any build that ships (non-scratch). Trace has veto power on Critical FAIL.

## The 10 Points

1. **Security** — SQL injection, XSS, CSRF, secrets-in-plaintext, path traversal, SSRF
2. **Auth/Authz** — missing checks, privilege escalation, missing session validation
3. **Input validation** — untrusted data passed to sinks (shell, DB, filesystem)
4. **Dependencies** — unpinned versions, known vulns, abandoned packages
5. **SOLID principles** — SRP violations, tight coupling, leaky abstractions
6. **Error handling** — silent failures, unhandled exceptions, swallowed errors
7. **Data** — PII logging, secrets in logs, missing encryption at rest/transit
8. **Operations** — no health checks, no graceful shutdown, missing resource limits
9. **Idempotency** — repeated calls cause duplicates or state corruption
10. **Tripp's Veto (crew-specific)** — does this touch sandbox boundaries, prod, or delete without auditor approval?

## Output Format

```markdown
## Trace Audit Report
**Verdict:** PASS | WARN | FAIL
**Critical:** [list or "none"]
**Warnings:** [list or "none"]
**Suggested:** [list or "none"]
**Remediation Priority:** [ordered list of fixes]
```

## Verdict Rules

- **PASS** — zero Critical, zero or minor Warnings, ship OK
- **WARN** — Warnings present but not Critical; ship at user's risk with documented caveats
- **FAIL** — at least one Critical; DO NOT ship; report to human admin with remediation recommendation

## When to Invoke Trace

| Situation | Invoke? |
|-----------|---------|
| Build deployed to other agents | **Mandatory** |
| Build runs on human admin's device | **Mandatory** |
| Build writes to prod / shared-knowledge | **Mandatory** |
| Config changes to crew infrastructure | **Mandatory** |
| Skill authoring (proposed for crew library) | **Mandatory** |
| Scratch experiment | Optional |
| Quick one-off research script | Optional |

## Tripp's Doctrine Checklist (separate from Trace)

For cross-boundary code moves per deployment doctrine:

- [ ] No hardcoded credentials
- [ ] No outbound network calls to unexpected hosts
- [ ] No file system escapes (path traversal)
- [ ] No execution of user input
- [ ] No deletion of protected paths
- [ ] Git diff reviewed

Both checklists run on builds that ship. Trace for code quality; Doctrine for operational safety.

## Trace vs Human Admin

Trace FAIL → report to human admin → admin may veto the FAIL with domain knowledge Trace doesn't have. Document override reason. Never silently suppress a FAIL.
