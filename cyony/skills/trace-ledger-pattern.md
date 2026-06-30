# Append-Only Trace Ledger Pattern (Phase 7F)

## When to Use
- Causal debugging: "where did this issue first appear?"
- Packet lifecycle tracking: created → claimed → completed → reviewed → archived
- Warden/Echo intervention logging: review_started → verdict_recorded → stop_issued → stop_resolved
- Delayed-failure root-cause analysis: validation_failed_later → root_cause_linked
- Any append-only event log that must be evidence-only (never authorizes mutation)

## The Pattern: Schemas → Helpers → CLI → Auto-Emission

### Layer 1: Schemas (`traceSchemas.ts`)

```typescript
// Event type enum — define ALL types upfront
export const TraceEventTypeSchema = z.enum([
  "packet_created", "packet_archived", "packet_rejected",
  "warden_review_started", "warden_verdict_recorded",
  "subagent_spawned", "subagent_completed", "subagent_killed",
  "tools_loaded", "tools_unloaded",
  "validation_failed_later", "root_cause_linked",
  // ... 24 total
]);

// Runtime validation rules via superRefine
export const ValidatedTraceEventSchema = TraceEventSchema.superRefine((data, ctx) => {
  if (data.eventType === "root_cause_linked" && !data.rootCauseEventId) {
    ctx.addIssue({ message: "root_cause_linked must include rootCauseEventId" });
  }
  if (["subagent_spawned", "subagent_completed", ...].includes(data.eventType) && !data.subagentId) {
    ctx.addIssue({ message: `${data.eventType} must include subagentId` });
  }
  // ... more rules
});
```

**Key rule:** Every schema has a `ValidatedXxxSchema = XxxSchema.superRefine(...)` counterpart. Use the validated version at write boundaries. Unvalidated version is for structural reference only.

### Layer 2: Helpers (`traceLedger.ts`)

```typescript
// Create validated event (does NOT write to disk)
export function createTraceEvent(input: CreateTraceEventInput): TraceEvent {
  return ValidatedTraceEventSchema.parse({ ...input, defaults });
}

// Append to JSONL — validates BEFORE writing
export async function appendTraceEvent(event: TraceEvent): Promise<TraceEvent> {
  const validated = ValidatedTraceEventSchema.parse(event); // ← guard
  const line = JSON.stringify(validated);
  await fs.appendFile(ledgerPath, line + "\n");
  return validated;
}

// Read + validate each line, skip malformed silently
export async function readTraceEvents(options?): Promise<TraceEvent[]> {
  const lines = raw.split("\n").filter(Boolean);
  return lines.reduce((acc, line) => {
    try { acc.push(ValidatedTraceEventSchema.parse(JSON.parse(line))); }
    catch { /* skip malformed */ }
    return acc;
  }, []);
}

// Validate — reports malformed count + line numbers, NEVER rewrites
export async function validateTraceLedger(): Promise<ValidationResult> {
  // Returns { totalLines, validEvents, malformedLines, malformedLineNumbers, isValid }
  // Malformed lines are reported, not repaired
}

// Causal chain: walk parentEventId/rootCauseEventId backward
export async function findRootCauseChain(eventId: string): Promise<TraceEvent[]> {
  // Build eventMap, then BFS backward through parentEventId/rootCauseEventId
}
```

**Critical safety rules:**
- Validate before append (never trust compile-time types alone)
- Read: skip malformed lines, don't throw
- Validate: report malformed, never rewrite
- Chain: follow parentEventId + rootCauseEventId, cycle-protected with visited Set

### Layer 3: CLI Commands

```
tripp agents trace append --event-type <type> --summary "..." [17 optional flags]
tripp agents trace list [--limit N] [--packet-id ...] [--result-id ...] [--severity ...]
tripp agents trace validate
tripp agents trace chain <event-id>
tripp agents trace packet <packet-id>    # convenience — delegates to list --packet-id
tripp agents trace result <result-id>    # convenience — delegates to list --result-id
tripp agents trace review <review-id>    # convenience — delegates to list --review-id
```

**Commander registration:** `agents.command("trace")` creates the parent, then `trace.command("append")`, `trace.command("list")`, etc. nest underneath.

**Convenience commands** (packet/result/review) are thin wrappers that call `executeAgentsTraceList({ packetId, ... })` — they add zero new logic, just filter routing.

### Layer 4: Automatic Event Emission

```typescript
// Best-effort wrapper — never blocks the main operation
async function emitTrace(
  input: Parameters<typeof createTraceEvent>[0],
  workdir?: string
): Promise<void> {
  try {
    const event = createTraceEvent(input);
    await appendTraceEvent(event, workdir);
  } catch {
    // Trace emission is best-effort; never block the main operation
  }
}

// Wire into existing commands after their main work completes:
async function executeAgentsCreateTask(options) {
  const filePath = await writeTaskPacket(packet, { workdir });
  
  await emitTrace({
    eventType: "packet_created",
    actorType: "cli",
    packetId: packet.packetId,
    runId: packet.runId,
    agentRole: options.agent,
    summary: `Task packet created: ${packet.title}`,
  }, options.workdir);
  
  console.log("Task packet created.");
}
```

**Which commands emit what:**
| Command | Event(s) |
|---------|----------|
| `create-task` | `packet_created` |
| `archive` | `packet_archived` |
| `reject` | `packet_rejected` |
| `review` | `warden_review_started` + `warden_verdict_recorded` |

**Do NOT wire trace to:** read/list operations (too noisy), inbox/outbox polling, dashboard reads.

### Storage Model

```
.tripp/agents/trace/agent-bus-trace.jsonl
```

- One event per line, JSONL format
- Append-only — never rewrite, never delete
- Corrections are new events (root_cause_linked)
- README at `.tripp/agents/trace/README.md` explains purpose, design, and safety rules

## Pitfalls

1. **appendTraceEvent must validate, not just stringify.** TypeScript types are compile-time only. A caller can pass `{ eventType: "root_cause_linked" }` without `rootCauseEventId` — it matches the interface but fails runtime rules. Add `ValidatedTraceEventSchema.parse(event)` before `fs.appendFile`.

2. **Test imports: schemas from schema file, helpers from helper file.** Import `AgentBusTraceEventSchema` from `../traceSchemas.js`, not `../traceLedger.js`. If both modules cross-reference, the error is "Cannot read properties of undefined (reading 'parse')" which is misleading. Verify with `grep "export.*Schema" src/traceSchemas.ts`.

3. **Malformed lines are reported, NOT repaired.** `validateTraceLedger` returns line numbers — it never rewrites the file. Manual review of malformed lines is the operator's decision, not the tool's.

4. **Trace emission is best-effort.** If the trace ledger write fails, the main operation MUST continue. Never `throw` from an `emitTrace` call — wrap in try/catch and swallow errors.

5. **Every trace output warns** — "trace event is evidence only, does NOT approve mutation." This warning appears on append, validate, and list outputs.
