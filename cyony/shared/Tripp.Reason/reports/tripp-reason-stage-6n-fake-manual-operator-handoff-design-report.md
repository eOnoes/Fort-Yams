# Tripp.Reason Stage 6N — Fake/Manual Operator Handoff Design

**Date:** 2026-06-06
**Stage:** Reason-6N
**Assigned:** Cyony

---

## Final Decision

**TRIPP_REASON_STAGE_6N_PASS_OPERATOR_HANDOFF_DESIGN_READY_FOR_STAGE_6O_STATIC_HANDOFF_BUNDLE_IMPLEMENTATION**

---

## Active Repo Proof

| Field | Value |
|-------|-------|
| Git root | `/opt/data/shared/Tripp.Reason` |
| Branch | `master` |
| HEAD | `31620a3` |
| Package manager | pnpm@9.15.9 |
| Node.js | v20.19.2 |

---

## Files Changed

**None.** Design gate only. Zero code changes.

---

## 1. Protocol Overview

The fake/manual operator handoff protocol defines how a Tripp.Reason manifest is packaged into a static, self-contained, read-only handoff bundle that an operator (Eddie) or Echo can consume without live transport, shared-bus mutation, or agent activation.

```
Trace Ledger (JSONL) → Manifest Mapper (6J) → Handoff Bundle (6O)
                              ↓
                      writeManifest()          packageHandoffBundle()
                              ↓                         ↓
                      manifest.json               handoff-bundle/
                      manifest.md                 ├── manifest.json
                                                  ├── manifest.md
                                                  ├── handoff-summary.md
                                                  ├── handoff-metadata.json
                                                  └── README-OPERATOR-HANDOFF.md
```

---

## 2. Who Produces the Manifest

| Producer | Role |
|----------|------|
| Tripp.Reason CLI | `buildManifestFromEvents()` or `buildManifestFromTraceFile()` |
| Operator (Eddie) | Explicit invocation — no automation |

---

## 3. Who May Read the Manifest

| Consumer | Permission | Scope |
|----------|-----------|-------|
| **Operator (Eddie)** | Full read | May open, inspect, compare, paste markers, upload static files |
| **Echo** | Read-only evidence | May read bundle as operator-provided evidence; may classify confidence; may include static summary in Echo trace manifest |
| **Tripp (warden)** | Summary only | Receives operator/Echo summaries; does NOT read raw manifest |
| **Codex (Tripp.Control)** | Summary only | Receives operator/Echo summaries only; does NOT auto-read |
| **Kimi (Tripp.OS)** | Summary only | Receives operator/Echo summaries only |

---

## 4. Where the Manifest May Be Written

| Location | Permitted | Notes |
|----------|-----------|-------|
| `<workdir>/.tripp/agents/manifest/` | ✅ | Primary output |
| `<workdir>/.tripp/agents/handoff/` | ✅ | Handoff bundle destination |
| Operator-designated local path | ✅ | Operator explicitly chooses |
| Echo's filesystem | ✅ | Operator explicitly copies/transfers |

---

## 5. Where the Manifest Must Not Be Written

| Location | Prohibited | Reason |
|----------|-----------|--------|
| `shared-agent-bus/` | ❌ | Boundary violation |
| `Tripp.Control/` | ❌ | Codex workspace |
| `Tripp.OS/` | ❌ | Kimi workspace |
| Any remote/cloud path | ❌ | No live transport |
| Notion | ❌ | Out of scope |

---

## 6. File Naming Convention

| File | Pattern | Example |
|------|---------|---------|
| Manifest JSON | `manifest-<timestamp>.json` | `manifest-2026-06-06T12-00-00-000Z.json` |
| Manifest MD | `manifest-<timestamp>.md` | `manifest-2026-06-06T12-00-00-000Z.md` |
| Handoff summary | `handoff-summary-<timestamp>.md` | `handoff-summary-2026-06-06T12-00-00-000Z.md` |
| Handoff metadata | `handoff-metadata-<timestamp>.json` | `handoff-metadata-2026-06-06T12-00-00-000Z.json` |

---

## 7. Handoff Bundle Shape

```
handoff-bundle-<timestamp>/
├── manifest.json                  # Full manifest snapshot (from 6J)
├── manifest.md                    # Markdown companion (from 6J)
├── handoff-summary.md             # Operator-facing summary
├── handoff-metadata.json          # Handoff protocol metadata
└── README-OPERATOR-HANDOFF.md     # Instructions for operator consumption
```

---

## 8. Handoff Metadata Schema

```typescript
interface HandoffMetadata {
  handoff_version: string;           // "1.0.0"
  generated_at: string;              // ISO 8601
  producer: string;                  // "tripp-reason-fake-manual"
  producer_project: string;          // "Tripp.Reason"
  contract_classification: string;   // "internal-fake-manual-only"
  
  // Source references
  source_manifest_path: string;      // Relative: "manifest.json"
  source_trace_path: string | null;  // Relative or null if not bundled
  
  // Safety guarantees
  mutation_capability: string;       // Always "none"
  
  // Consumer rules
  consumer_permissions: string[];    // ["read", "inspect", "compare", "static-transfer"]
  consumer_forbidden_actions: string[];  // ["live-dispatch", "bus-mutation", "agent-activation", ...]
  
  // Status summaries
  redaction_status: RedactionStatus;
  confidence_summary: ConfidenceSummary;
  stale_state_summary: StaleStateSummary;
  
  // Counts
  warnings_count: number;
  unknowns_count: number;
  
  // Navigation
  recommended_next_marker: string;   // From manifest contract audit
  evidence_files: string[];          // ["manifest.json", "manifest.md"]
  notes: string;                     // Operator-added notes (optional)
}

interface RedactionStatus {
  redaction_applied: boolean;
  fields_redacted: number;
  secrets_stripped: number;
  prompts_truncated: number;
  redaction_rules: string[];
  safe_for_operator_review: boolean;
}

interface ConfidenceSummary {
  overall_level: string;
  packets_confirmed: number;
  packets_partial: number;
  packets_unknown: number;
  confidence_reason: string;
}

interface StaleStateSummary {
  is_stale: boolean;
  stale_reason: string | null;
  last_trace_event_at: string | null;
  recommended_refresh: string;
}
```

---

## 9. Handoff Summary (handoff-summary.md)

Template:

```markdown
# Tripp.Reason Fake/Manual Handoff — <timestamp>

## What This Is

A static, read-only manifest generated from Tripp.Reason fake/manual runtime trace events.
⚠️ This is NOT a live runtime state report.
⚠️ This is NOT a source of truth for authorization.

## Bundle Contents

- `manifest.json` — Full manifest with all packet lifecycle states
- `manifest.md` — Human-readable companion
- `handoff-metadata.json` — Protocol metadata

## Quick Summary

- **Packets:** <N>
- **Confidence:** <level> — <reason>
- **Completed:** <N> | **Denied:** <N> | **Timeout:** <N> | **Rejected:** <N>
- **Redactions:** <N> fields stripped
- **Warnings:** <N> | **Unknowns:** <N>

## How to Read

1. Open `manifest.md` for a human-readable summary
2. Open `manifest.json` for the full structured data
3. Check `handoff-metadata.json` for protocol details

## Next Recommended Marker

<recommended_next_marker>

## Important

- Mutation capability: **none** — never use for authorization
- This manifest is **internal to Tripp.Reason** — not a public API
- Tripp.Reason ApprovalGate remains authoritative
```

---

## 10. What Metadata Is Forbidden

| Forbidden | Reason |
|-----------|--------|
| Raw trace event payloads | Redacted by mapper |
| API keys / tokens / secrets | Stripped by redaction |
| Live agent IDs | Manifests are fake/manual only |
| Cross-project paths | Internal contract |
| Echo authorization tokens | Not in Tripp.Reason scope |
| Notion page IDs | Out of scope |

---

## 11. Redaction Status Communication

The `redaction_status` field in handoff metadata communicates:
- Whether redaction was applied (`redaction_applied: true/false`)
- How many fields were redacted
- Which rules were applied
- Whether the bundle is safe for operator review

If `safe_for_operator_review` is `false`, the bundle must not be shared beyond the operator.

---

## 12. Confidence Status Communication

The `confidence_summary` communicates:
- Overall confidence level
- Breakdown: confirmed / partial / unknown packet counts
- Human-readable reason

If overall confidence is `partial-trace` or `unknown`, the handoff summary explicitly states this and recommends trace ledger review.

---

## 13. Warnings / Unknowns Communication

| Field | Communication |
|-------|--------------|
| `warnings_count > 0` | Handoff summary lists top 3 warnings |
| `unknowns_count > 0` | Handoff summary lists unresolvable packet IDs |
| Both zero | Summary states "No warnings or unknown states" |

Currently both are zero (reserved). Future population will update these rules.

---

## 14. Cycle-Deferred Communication

| Status | Communication |
|--------|--------------|
| Cycles not detected | Not mentioned (no noise) |
| Cycles detected (future) | `confidence_summary` includes "cyclic chains detected" |
| Deferred status | Documented in `notes`: "Full cycle detection deferred to future trace ledger validation gate" |

---

## 15. How an Operator Inspects the Handoff

```
1. Open handoff-summary.md → quick overview
2. Open manifest.md → per-packet lifecycle details
3. Open manifest.json → full structured data (optional)
4. Check handoff-metadata.json → redaction/confidence/safety status
5. Compare with trace ledger if confidence is partial
6. Share bundle statically (copy/paste/upload) — never live-sync
```

---

## 16. What Echo May Consume Later

| Echo May | How |
|----------|-----|
| Read the handoff bundle | As operator-provided static evidence |
| Classify confidence | Confidence model is documented and stable |
| Include in Echo trace manifest | As a static summary entry |
| Compare with Echo's own trace | Cross-reference for consistency |

---

## 17. What Echo Must Not Infer

| Echo Must NOT | Reason |
|--------------|--------|
| Treat manifest as live source | Static snapshot — may be stale |
| Poll for updates | No watching/background sync |
| Mutate Tripp.Reason | Boundary violation |
| Mutate shared-agent-bus | Boundary violation |
| Promote to public API | Internal contract only |
| Auto-dispatch based on manifest | No automated actions from fake/manual data |

---

## 18. What Codex / Tripp.Control Must Not Infer

| Codex Must NOT | Reason |
|---------------|--------|
| Auto-read Tripp.Reason manifests | Tripp.Control is a separate project |
| Assume live runtime state | Manifest is fake/manual only |
| Write or modify the handoff | Read-only |
| Use for build decisions | Manifest is evidence, not authorization |

Codex may receive operator or Echo summaries only — never raw manifest access.

---

## 19. What Kimi / Tripp.OS Must Not Infer

| Kimi Must NOT | Reason |
|--------------|--------|
| Treat manifest as Tripp.OS source proof | Separate project boundary |
| Infer shared-bus state | Manifest is internal to Tripp.Reason |
| Derive package/dependency state | Out of scope |

Kimi may receive operator or Echo summaries only — never raw manifest access.

---

## 20. Valid Handoff Bundle

| Condition | Required |
|-----------|----------|
| `manifest.json` present and valid JSON | ✅ |
| `manifest.md` present | ✅ |
| `handoff-metadata.json` present and matches manifest | ✅ |
| `handoff-summary.md` present | ✅ |
| `mutation_capability: "none"` in manifest AND metadata | ✅ |
| `contract_classification: "internal-fake-manual-only"` | ✅ |
| No raw secrets in any file | ✅ |
| All paths relative within bundle | ✅ |

---

## 21. Invalid Handoff Bundle Conditions

| Condition | Action |
|-----------|--------|
| Missing `manifest.json` | Bundle rejected |
| `mutation_capability` ≠ `"none"` | Bundle rejected — safety violation |
| `contract_classification` missing or ≠ `"internal-fake-manual-only"` | Bundle flagged |
| Raw API key patterns in output | Bundle redaction failed — reject |
| Cross-project paths in metadata | Bundle rejected — boundary violation |
| `source_mode` = `"live"` or `"experimental_live"` | Bundle rejected — live scope violation |

---

## 22. Stage 6O Implementation Plan

Stage 6O should implement the handoff bundle as a test-first, static/manual module:

### Phase 6O-1: Handoff Bundle Generator
- `packageHandoffBundle(snapshot, workdir?)` function
- Creates the 5-file bundle under `.tripp/agents/handoff/`
- Generates `handoff-metadata.json` from manifest
- Generates `handoff-summary.md` from manifest + metadata
- Copies `manifest.json` and `manifest.md` into bundle
- Generates `README-OPERATOR-HANDOFF.md`

### Phase 6O-2: Schema Tests
- Handoff metadata schema validates
- Bundle directory structure is correct
- All required files present
- `mutation_capability` is `"none"` in all outputs
- Redaction status matches manifest redaction summary
- Confidence summary matches manifest confidence

### Phase 6O-3: Safety Tests
- No raw secrets in handoff bundle
- No cross-project paths
- No live agent references
- No shared-agent-bus references
- Bundle path bounded within workdir

### Phase 6O-4: Invalid Bundle Tests
- Missing manifest → error
- Wrong mutation_capability → rejected
- Missing contract classification → flagged

### Phase 6O-5: Boundary Tests
- No live agent activation
- No shared-agent-bus mutation
- No Tripp.Control / Tripp.OS references

---

## Internal-Only Contract Preservation

| Preservation Rule | Enforced By |
|------------------|------------|
| `contract_classification` field | Hardcoded in metadata: `"internal-fake-manual-only"` |
| No public API endpoints | No HTTP/server integration |
| No cross-project file writes | Output bounded to handoff dir |
| No dependency on other projects | Self-contained module |
| Explicit non-public notice in README | Generated with bundle |

---

## Boundary Proofs

| Boundary | Status |
|----------|--------|
| Live agents | Not activated (design-only, no code) |
| shared-agent-bus | Untouched (0 references in design) |
| Tripp.Control | Referenced only in "must not" rules |
| Tripp.OS | Referenced only in "must not" rules |
| Echo | Design-only consumption rules; no integration |
| Notion | 0 references |
| Remote/cloud | 0 references |
| Dependencies | Zero additions |

---

## Validation

Design-only gate. No code changes. Baseline confirmed:

| Check | Result |
|-------|--------|
| Typecheck (12/12) | 0 errors |
| Tests | 424/424 (unchanged) |
| Lockfile | Clean, frozen OK |

---

## Risks / Yellow Flags

| Risk | Severity | Mitigation |
|------|----------|------------|
| Echo handoff integration is deferred | Low | Design defines consumption rules; implementation is Stage 6O (bundle generator only) |
| Handoff bundle currently manual copy | Low | By design; no automation until explicitly approved |
| Operator must explicitly run bundle generator | Info | Stage 6O provides the function; operator invokes it |

**No blocking risks.**

---

## Recommended Next Marker

**READY_FOR_TRIPP_REASON_STAGE_6O_STATIC_OPERATOR_HANDOFF_BUNDLE_IMPLEMENTATION**

**Rationale:** The operator handoff protocol is fully designed with bundle shape, metadata schema, consumer rules for all 5 agents (operator, Echo, Tripp, Codex, Kimi), invalid bundle conditions, and a 5-phase Stage 6O implementation plan. The design preserves internal-only contract status and enforces all 10 safety constraints.
