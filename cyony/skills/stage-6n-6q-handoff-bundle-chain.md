# Stage 6N→6O→6P→6Q: Static Handoff Bundle Chain

Four-gate chain: design → implementation → audit → fixture export.

## Stage 6N: Operator Handoff Design (Design Gate)

Zero code. Design the complete operator handoff protocol:

1. **Define producers/consumers**: who generates (Tripp.Reason CLI), who reads (Operator/Echo/Tripp/Codex/Kimi)
2. **Define bundle shape**: 5 files — manifest.json, manifest.md, handoff-summary.md, handoff-metadata.json, README-OPERATOR-HANDOFF.md
3. **Define metadata schema**: 17 fields (handoff_version, generated_at, producer, producer_project, contract_classification, source paths, mutation_capability, consumer_permissions, consumer_forbidden_actions, redaction_status, confidence_summary, stale_state_summary, warnings_count, unknowns_count, recommended_next_marker, evidence_files, notes)
4. **Define consumer permissions**: Operator (full read), Echo (read-only evidence), Codex/Kimi/Tripp (summary only)
5. **Define 7 forbidden actions**: live-dispatch, bus-mutation, agent-activation, cross-project-write, auto-polling, public-api-promotion, source-of-truth-inference
6. **Define 6 invalid bundle conditions**: missing manifest, wrong mutation_capability, raw secrets, wrong contract_classification, live source_mode, cross-project paths
7. **Preserve internal contract**: `contract_classification: "internal-fake-manual-only"` hardcoded

Decision: `TRIPP_REASON_STAGE_6N_PASS_OPERATOR_HANDOFF_DESIGN`

## Stage 6O: Static Handoff Bundle Implementation

New module: `packages/cli/src/fakeManualHandoffBundle.ts`

```typescript
export async function packageHandoffBundle(
  snapshot: ManifestSnapshot,
  workdir?: string,
): Promise<HandoffBundleResult>
```

### Validation (fail-closed before any write)
- `validateManifest()`: rejects mutation_capability ≠ "none"
- `FORBIDDEN_SOURCE_MODES = ["live", "experimental_live", "cloud", "remote"]`
- `validateNoSecrets()`: regex check for `sk-...` and `Bearer ...` patterns
- `validateOutputPath()`: rejects output paths outside workdir

### Output
```
.tripp/agents/handoff/handoff-bundle-<timestamp>/
├── manifest.json          # exact copy of input, secret-validated
├── manifest.md            # Markdown with safety warnings
├── handoff-summary.md     # operator-facing: packets, confidence, warnings
├── handoff-metadata.json  # 17-field JSON
└── README-OPERATOR-HANDOFF.md  # consumer boundaries
```

### Test structure: 5 sections, 32 tests
- 6O-1 Generator: 7 tests — all 5 files, correct filenames, content checks
- 6O-2 Schema: 8 tests — all 17 metadata fields, contract_classification, mutation_capability
- 6O-3 Safety: 5 tests — mutation_capability rejection, live source_mode rejection, secret rejection
- 6O-4 Invalid: 6 tests — all 6 invalid conditions
- 6O-5 Boundary: 6 tests — no shared-agent-bus, no Control/OS, no child_process, no polling, path bounded, no Echo

### Test-path pitfall (6O boundary tests)
When vitest runs from a package subdirectory (e.g., `packages/cli/`), `process.cwd()` already resolves there. Using `path.resolve(process.cwd(), "packages/cli/src/...")` produces a doubled path: `packages/cli/packages/cli/src/...`.

**Fix**: `path.resolve(process.cwd(), "src/fakeManualHandoffBundle.ts")` — just the relative path from the package root.

Decision: `TRIPP_REASON_STAGE_6O_PASS_STATIC_HANDOFF_BUNDLE_IMPLEMENTED`

## Stage 6P: Static Handoff Bundle Audit (Read-Only)

Comprehensive audit against Stage 6N design:

1. **Design alignment**: all 17 metadata fields match, bundle shape matches, contract_classification hardcoded, mutation_capability="none", FORBIDDEN_SOURCE_MODES enforced, consumer rules match, 6 invalid conditions covered
2. **Output safety**: path-bounded, explicit-only writes, no cross-project paths
3. **Redaction safety**: SECRET_VALUE_PATTERN catches sk-... and Bearer patterns, applied before writes
4. **Consumer boundaries**: README communicates all 5 roles + 7 forbidden actions
5. **Boundary tests**: all use cwd-relative paths (confirmed after 6O patch)
6. **Forbidden behavior search**: 26 terms searched across all source/test/fixture files, zero violations

Decision: `TRIPP_REASON_STAGE_6P_PASS_STATIC_HANDOFF_BUNDLE_AUDIT`

## Stage 6Q: Static Operator Export Fixture

Fixture test file: `packages/cli/src/__tests__/fakeManualHandoffFixture.test.ts`

### Fixture scenarios (9 packets)
- A: Success (complete lifecycle: created→gate→claimed→mutation→result)
- B: Denied (created→gate→human_decision deny)
- C: Task Timeout (created→spawned→task_timeout)
- D: Partial Trace (created with non-existent parentEventId)
- E: Duplicate EventId
- F: Unknown Event Type
- G: Redaction Evidence (apiKey + token + long prompt)
- H: Tool Timeout
- I: Empty manifest

### Test structure: 6 sections, 26 tests
- 6Q-1 Export Generation: 4 tests — generate from fixture, from empty manifest, path check, scenario coverage
- 6Q-2 File Integrity: 5 tests — manifest.json content, manifest.md safety, handoff-summary.md, metadata completeness, README consumer boundaries
- 6Q-3 JSON Validity: 2 tests — metadata types (17 fields), manifest shape
- 6Q-4 Content Safety: 5 tests — no secrets in files, redaction evidence, fake/manual disclaimers, mutation_capability everywhere, contract_classification everywhere
- 6Q-5 Boundary Verification: 5 tests — no live source_mode, no Echo integration, no shared-bus paths, output bounded, reproducible
- 6Q-6 Read-Back Validation: 5 tests — all files non-empty, confidence matches, recommended marker present, stale state coherent, evidence_files correct

### Key pitfall: manifest shape vs metadata shape
The manifest snapshot has `confidence_level` (string), not `confidence_summary` (object). The handoff metadata DERIVES `confidence_summary` from the manifest's packets. Don't assert `typeof parsed.confidence_summary === "object"` on the manifest JSON — assert `typeof parsed.confidence_level === "string"`.

Decision: `TRIPP_REASON_STAGE_6Q_PASS_FIXTURE_ONLY`

## Decision Option Naming (6N-6Q)

```
TRIPP_REASON_STAGE_6N_PASS_OPERATOR_HANDOFF_DESIGN
TRIPP_REASON_STAGE_6O_PASS_STATIC_HANDOFF_BUNDLE_IMPLEMENTED
TRIPP_REASON_STAGE_6P_PASS_STATIC_HANDOFF_BUNDLE_AUDIT
TRIPP_REASON_STAGE_6Q_PASS_FIXTURE_ONLY
```

All chain through without stopping — these are all Cyony-owned, Tripp.Reason-only, fake/manual, read-only/fixture gates.
