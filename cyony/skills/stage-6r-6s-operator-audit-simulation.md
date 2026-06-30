# Stage 6R + 6S: Operator Handoff Audit + Packet Simulation

Two-gate chain: 6R (read-only culmination audit) → 6S (operator packet simulation).

## Stage 6R: Static Operator Handoff Audit (Read-Only)

Culmination audit of the full 6N→6Q handoff lane. No code changes — pure verification.

### Audit scope
- Stage 6N design (22-section spec)
- Stage 6O implementation (390 lines, packageHandoffBundle)
- Stage 6P bundle audit (17 metadata fields, 26-term search)
- Stage 6Q export fixture (26 tests, 9 scenarios)
- End-to-end coherence: Trace → Manifest → Bundle → Operator

### Checks
1. End-to-end flow: all 4 stages independently validated, interfaces coherent
2. Internal contract: all 4 invariants preserved (contract_classification, mutation_capability, source_mode, public API absence)
3. Consumer boundaries: 5 roles, 7 forbidden actions, Echo passive-only
4. Redaction pipeline: 3-tier (keys, values, length), secret-free output
5. Output path: bounded to .tripp/agents/handoff/, cross-project rejected
6. No-live: FORBIDDEN_SOURCE_MODES guard, 0 dispatchToRealAgent
7. No shared-bus: 0 imports, references only in documentation/forbidden-lists
8. No Control/OS: 0 imports, 0 file writes
9. No Echo: passive documentation only, 0 SDK/transport/API calls

### Forbidden behavior search: 27 terms
All hits classified: metadata/contract fields, guard constants, boundary negation tests, forbidden-actions documentation. Zero actual violations.

Decision: `TRIPP_REASON_STAGE_6R_PASS_STATIC_OPERATOR_HANDOFF_AUDIT`

## Stage 6S: Static Operator Packet Simulation

New module: `packages/cli/src/fakeManualOperatorSimulation.ts`

Simulates operator receiving a handoff bundle: validates shape, checks safeties, classifies confidence, produces accept/reject decision with human-readable summary.

### simulateOperatorHandoff(bundleDir) — 10-step flow
1. Validate 5-file shape (reject missing)
2. Read handoff-metadata.json (reject invalid JSON)
3. Check contract_classification (reject ≠ "internal-fake-manual-only")
4. Check mutation_capability (reject ≠ "none")
5. Read manifest.json → check source_mode (reject live/experimental_live/cloud/remote)
6. Scan all files for secrets (reject on match)
7. Validate recommended_next_marker (warn if empty)
8. Check redaction_status (reject if !safe_for_operator_review)
9. Classify confidence (high/medium/low/rejected)
10. Build OperatorPacketSummary

### Confidence classification rules
- **high**: confirmed, no warnings, not stale
- **medium**: confirmed but warnings present, or confirmed but stale
- **low**: partial-trace, unknowns > 0
- **rejected**: any rejection condition triggered

### Test file: fakeManualOperatorSimulation.test.ts (30 tests)
- 6S-1 Accepted (8): clean, warnings, unknowns, stale, partial, marker, forbidden actions, redaction
- 6S-2 Rejected (8): missing files, mutation, contract, live, experimental_live, secrets, empty marker
- 6S-3 Summary Safety (4): no secrets, fake/manual notes, 7 forbidden actions, BLOCKED marker
- 6S-4 Confidence (5): high, medium(warnings), medium(stale), low(partial), low(unknowns)
- 6S-5 Boundary (5): no live, no mutation, no bus paths, no external calls, no bus imports

Decision: `TRIPP_REASON_STAGE_6S_PASS_SIMULATION_ONLY`

## Pitfalls unique to 6R/6S

- **`confidence_summary` vs `confidence_level`**: Manifest has `confidence_level` (string). Metadata has `confidence_summary` (object, derived). Don't assert `confidence_summary` on manifest JSON.
- **`/***/` invalid regex**: Causes TS2554. Use `/sk-[a-zA-Z0-9]{5}/` or string includes().
- **`expect().toContain() || expect().toContain()`**: Void expression error (TS1345). Use `String.includes()` with `||` + single `expect()`.
- **Secret regex must be alphanumeric-only**: `sk-proj-...` (hyphens) won't match `/sk-[a-zA-Z0-9]{20,}/`. Use `sk-abcdef...` (no hyphens).
- **Unknowns in manifest are reserved**: The `unknowns` array is initialized empty and may not be populated by the mapper. For testing unknowns handling, inject into metadata via `meta.unknowns_count = N` + `meta.confidence_summary.overall_level = "partial-trace"`.
- **Boundary tests use `path.resolve(process.cwd(), "src/...")`**: Vitest cwd is the package directory. Don't double the path with `packages/cli/src/...`.
- **Simulation is read-only**: `simulateOperatorHandoff()` never mutates source files. Test confirms: file contents before/after simulation are identical.
