---
name: api-tester
description: API testing methodology — functional, security, and performance validation. Auth testing, injection prevention, rate limiting, SLA verification.
---

# API Tester

Comprehensive API testing framework covering functional, security, and performance. Every API must pass all three gates.

## Security-First Rules

- Always test authentication and authorization thoroughly
- Validate input sanitization and SQL injection prevention
- Test for common API vulnerabilities (OWASP API Security Top 10)
- Verify data encryption and secure transmission
- Test rate limiting and abuse protection
- **Never** skip auth tests — even for "internal" endpoints

## Performance Standards

- API response: <200ms for 95th percentile
- Load testing: validate at 10x normal traffic
- Error rate: <0.1% under normal load
- Concurrent requests: handle 50+ without degradation

## Test Categories

### Functional
- [ ] All endpoints return correct status codes
- [ ] Valid input produces expected responses
- [ ] Invalid input returns proper 400-level errors with descriptive messages
- [ ] Edge cases handled (empty arrays, null values, boundary values)
- [ ] Pagination works correctly
- [ ] CRUD lifecycle: create → read → update → delete

### Security
- [ ] Unauthenticated requests rejected (401)
- [ ] Forbidden requests rejected (403)
- [ ] SQL injection attempts don't crash server
- [ ] XSS payloads sanitized in responses
- [ ] Rate limiting triggers at threshold (429)
- [ ] JWT: expired, tampered, alg=none all rejected
- [ ] Sensitive data never leaked in responses (passwords, tokens, internal IDs)

### Performance
- [ ] 95th percentile under SLA threshold
- [ ] Concurrent load test passes
- [ ] No memory leaks under sustained load
- [ ] DB queries optimized (check N+1 patterns)

### Integration
- [ ] API documentation matches actual behavior
- [ ] Response schema consistent across versions
- [ ] Backward compatibility maintained
- [ ] Error response format consistent

## Test Strategy Workflow

1. **Discovery:** Catalog all endpoints, auth requirements, data flows
2. **Functional:** Happy paths, error cases, edge cases
3. **Security:** Auth bypass, injection, rate limiting
4. **Performance:** Load, stress, concurrency
5. **Report:** Pass/fail per category, remediation priority

## Output Format

```
# API: [Name] Test Results
**Functional:** [X/Y passed]
**Security:** [X/Y passed]
**Performance:** [X/Y passed]
**Issues:**
- 🔴 Critical: [description]
- 🟡 Warning: [description]
**Verdict:** PASS / NEEDS FIXES
```

## API Discovery — Probing Unknown Endpoints

See `references/endpoint-probing-methodology.md` for a systematic approach when API docs are unreliable or when testing provider claims against reality. Covers: model enumeration across multiple endpoints, discovery loops (all models × all endpoints), vision endpoint probing, TTS reliability measurement, and flags that docs are wrong (case sensitivity, regional endpoint splits, model tier gaps).
