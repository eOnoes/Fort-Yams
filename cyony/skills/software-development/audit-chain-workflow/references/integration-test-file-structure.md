# Integration Test File Structure (Sections S1-S7)

Template for pnpm workspace integration test files under `packages/cli/src/__tests__/`.

## Standard Sections

```typescript
// ── S1: Full Fake Pipeline Trace Chain ────────────────────────────
//   Proves: packet_created → approvalgate_required → packet_claimed
//           → result_written → warden_review_started → warden_verdict_recorded
//   Uses: executeAgentsDryRun, readTraceEvents, validateTraceLedger

// ── S2: Timeout Event Validation ──────────────────────────────────
//   Proves: task_timeout, tool_timeout, approval_timeout validate + persist
//   Uses: createTraceEvent, appendTraceEvent, readTraceEvents
//   Note: Use 'as any' for eventType on new enum values

// ── S3: Dispatch Route Safety ─────────────────────────────────────
//   Proves: fake → succeeds, manual → manual_required,
//           disabled → blocked, experimental_live → blocked
//   Uses: dispatchRoute, createDefaultTransportConfig, createDispatchRequest

// ── S4: ApprovalGate Integration ──────────────────────────────────
//   Proves: approvalgate_required before packet_claimed in ledger
//           No mutation events in fake pipeline
//   Uses: executeAgentsDryRun, readTraceEvents

// ── S5: Result Read-Back ──────────────────────────────────────────
//   Proves: Fake result is readable, status "success", contains "FAKE"
//   Uses: listOutboxPackets, readResultPacket

// ── S6: Approval Flow Hardening ───────────────────────────────────
//   Proves: approvalgate_required ordering (all agents)
//           Block/revise verdicts → warden traces, no mutation
//           Multi-run safety (no state accumulation)
//   Uses: executeAgentsDryRun, readTraceEvents, validateTraceLedger

// ── S7: Approval Timeout + Trace Hardening ────────────────────────
//   Proves: approval_timeout persists with runId
//           All 3 timeout types coexist in ledger
//           No payload leakage (secrets, tokens, prompts)
//   Uses: createTraceEvent, appendTraceEvent, readTraceEvents

// ── S8: Result Success/Failure Path ───────────────────────────────
//   Proves: result status matches trace status, required lifecycle fields,
//           no raw payload leaks, safety warning in metadata
//   Uses: executeAgentsDryRun, listOutboxPackets, readResultPacket

// ── S9: Repeated Run Isolation ────────────────────────────────────
//   Proves: distinct result/trace IDs across runs, no cross-run
//           approval state leakage, ledger validates after multiple runs
//   Uses: executeAgentsDryRun, listOutboxPackets, readResultPacket,
//         readTraceEvents, validateTraceLedger

// ── S10: Packet Creation Edge Cases ───────────────────────────────
//   Proves: schema rejects missing packetId, invalid status, wrong trustZone
//   Uses: require("@tripp-reason/external-agents") for schema imports
//   Note: Use require() not import — workspace type resolution quirks block import

// ── S11: Read-Back Integrity ──────────────────────────────────────
//   Proves: round-trip identity, defaults preserved, read doesn't mutate,
//           malformed JSON throws "Malformed JSON"
//   Uses: (writeTaskPacket as any)(...), readTaskPacket, fs.writeFile
//   Note: Use (writeTaskPacket as any) to bypass Zod enum type narrowing

// ── S12: Dead-Letter / Rejection Coverage ─────────────────────────
//   Proves: movePacketToRejected moves to .tripp/agents/rejected/,
//           companion .rejection.md created with reason + timestamp
//   Uses: (writeTaskPacket as any)(...), movePacketToRejected

// ── S13: No-Live Guarantees ───────────────────────────────────────
//   Proves: default transport fake with gates, experimental_live throws,
//           dispatchRoute stays local (fake_completed/dry_run/manual_required/blocked)
//   Uses: (createDefaultTransportConfig as any)(...), (dispatchRoute as any)(...)
//   Note: ALL transport function calls need as any casts

// ── S14: Trace Ledger Lifecycle Completeness ───────────────────────
//   Proves: all events have eventId + createdAt, causal ordering,
//           no live transport events, no API key patterns
//   Uses: executeAgentsDryRun, readTraceEvents
//   PITFALL: Use function opts() not const opts — tmpDir only set in beforeEach
```

## Imports (all from existing deps)

```typescript
import { describe, it, expect, beforeEach, afterEach } from "vitest";
import * as fs from "node:fs/promises";
import * as path from "node:path";
import * as os from "node:os";
import { randomUUID } from "node:crypto";
import { executeAgentsDryRun } from "../agentsCommand.js";
import {
  listOutboxPackets,
  readResultPacket,
  readTraceEvents,
  validateTraceLedger,
  createTraceEvent,
  appendTraceEvent,
  dispatchRoute,
  createDefaultTransportConfig,
  createDispatchRequest,
  // Added in Stage 6G tests
  writeTaskPacket,
  readTaskPacket,
  movePacketToRejected,
} from "@tripp-reason/external-agents";
import type { ExternalAgentTaskPacket } from "@tripp-reason/external-agents";
```

## Fixture Setup

```typescript
let tmpDir: string;

beforeEach(async () => {
  tmpDir = path.join(os.tmpdir(), `tripp-<test-name>-${Date.now()}`);
  await fs.mkdir(tmpDir, { recursive: true });
});

afterEach(async () => {
  await fs.rm(tmpDir, { recursive: true, force: true });
});
```

## Dry Run Options Template

```typescript
const dryRunOpts = {
  agent: "hermes_cyony" as const,
  taskType: "audit" as const,
  title: "<descriptive test name>",
  objective: "<what this proves>",
  scope: "test",
  verdict: "pass" as const,  // or "revise", "block" (needs issues), "pass_with_notes"
};
```

## Pitfalls

- **Block verdict requires issues/safety findings payload** — `executeAgentsDryRun` with `verdict: "block"` validates that at least one issue exists. Tests without issues will fail with Zod validation error. Document as architecturally valid — don't force-feed fake issues.
- **`as any` everywhere for timeout eventTypes** — the test package's compiled types won't have new enum values until schema packages are rebuilt. Even after rebuild, the CLI package may see stale types from its own compilation.
- **CLI imports through external-agents** — never import `@tripp-os/agent-bus` directly; CLI doesn't have it as a dep.
