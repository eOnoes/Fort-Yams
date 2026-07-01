# LOCK 015 Addendum — Governance Readiness Summary Tightening

## 1. Data Source Rule
- Manual/curated metadata ONLY
- No filesystem scanning
- No inspecting installed packages
- No checking for HTTP servers, database drivers, provider SDKs
- Ephemeral metadata-in, readiness-object-out

## 2. No Config File Reading
- May accept config-shaped metadata in input
- Must NOT read config files from disk
- Forbidden: governance-state.yaml, governance-roadmap.yaml, package.json, reports/, tests/, src/
- Config-driven readiness is a future lock

## 3. Input Contract
```js
{
  project: "Tripp.Control",
  locks: [{ lock_id, name, status }],
  validation: { npm_validate, npm_test, npm_test_count, npm_dev },
  safety: { live_model_calls, provider_integration, dashboard, api_server, database, persistence, autonomous_execution, prompt_dispatch, forge_promotion, doctrine_auto_update }
}
```
- Ignore unknown extra fields
- Malformed lock entries: preserve safety, emit warnings

## 4. Readiness ID Formula
```
readiness-[project_slug]-[completed_lock_hash]
```
- project_slug = lowercase, non-alphanumeric → "-"
- completed_lock_hash = deterministic short hash of sorted completed PASS lock IDs
- Same input → same ID
- Same locks different order → same ID
- No Date.now(), Math.random(), UUID

## 5. Readiness Status Enum
```js
Object.freeze({
  NOT_READY: "NOT_READY",
  PARTIAL_GOVERNANCE_READY: "PARTIAL_GOVERNANCE_READY",
  GOVERNANCE_SPINE_READY: "GOVERNANCE_SPINE_READY",
  RUNTIME_PREP_READY: "RUNTIME_PREP_READY"
})
```
- RUNTIME_PREP_READY must exist but LOCK 015 must NOT return it
- Complete 001-014 + 009A PASS → GOVERNANCE_SPINE_READY

## 6. Capabilities from Completed Locks
- Available capabilities derived from PASS locks only
- Missing/non-PASS lock → do not claim its capability
- Examples: LOCK 002 PASS → config loading, LOCK 003 PASS → task classification

## 7. Safety Boundaries vs Safety Flags
- safety_boundaries: human-readable strings ("No live model execution")
- safety_flags: machine-readable booleans, all false in LOCK 015

## 8. Scope Enforcement
Forbidden imports/usages:
- http, https, fetch, node-fetch, axios
- openai, @openai/*, openrouter
- sqlite, sqlite3, better-sqlite3
- express, fastify, ws

## 9. Function Name
Keep original: `generateGovernanceReadinessSummary(input)`
Optional alias: `governanceReadiness(input)` (same implementation)

## 10. Required Tests (16 cases)
1. null/empty → NOT_READY/PARTIAL with warnings, flags false
2. complete 001-014+009A PASS → GOVERNANCE_SPINE_READY
3. RUNTIME_PREP_READY defined but not returned
4. readiness_id deterministic
5. readiness_id stable regardless of lock order
6. readiness_id changes when PASS set changes
7. capabilities from PASS locks
8. missing lock doesn't claim capability
9. unavailable_capabilities includes all forbidden items
10. safety_boundaries human-readable
11. safety_flags booleans, always false
12. unsafe safety metadata → NOT_READY + warnings
13. ignores unknown extra fields
14. malformed lock entries → warnings + conservative readiness
15. no forbidden imports/usages
16. no file writes, config mutation, model calls, network, persistence

## 11. Drift Scan
Validation must scan for forbidden runtime/provider/persistence/mutation patterns

## 12. Report Requirements
Must include:
- DATA SOURCE: Manual/curated metadata input only. No filesystem discovery.
- READINESS RESULT: GOVERNANCE_SPINE_READY (for current baseline)
- RUNTIME_PREP_READY RETURNED?: NO
