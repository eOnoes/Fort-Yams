# Phase 8C Gap Closure Pattern

After Phase 8B proves the pipeline with fake E2E dry run, Phase 8C closes known gaps before real transport planning.

## Server Read-Back

Call the same functions server routes use — no server spin-up needed:

```typescript
// Same path as GET /agents/inbox
const inbox = await listInboxPackets({ workdir: tmpDir });
const p = await readTaskPacket(inbox[0]);

// Same path as GET /agents/outbox
const outbox = await listOutboxPackets({ workdir: tmpDir });
const r = await readResultPacket(outbox[0]);

// Same path as GET /agents/reviews
const reviews = await listReviewPackets({ workdir: tmpDir });
const rv = await readReviewPacket(reviews[0]);

// Same path as GET /agents/trace?packetId=...
const events = await findTraceEventsByPacketId(task.packetId, { workdir: tmpDir });

// Same path as GET /agents/trace?runId=...
const events = await findTraceEventsByRunId(task.runId, { workdir: tmpDir });

// Same path as GET /agents/status (calls validateTraceLedger)
const validation = await validateTraceLedger(tmpDir);
expect(validation.isValid).toBe(true);
expect(validation.malformedLines).toBe(0);
```

## Dashboard Read Visibility

Call the same read-model functions the dashboard API client calls:

```typescript
// Dashboard summary cards
const inbox = await listInboxPackets({ workdir: tmpDir });
const outbox = await listOutboxPackets({ workdir: tmpDir });
const reviews = await listReviewPackets({ workdir: tmpDir });
const trace = await readTraceEvents({ workdir: tmpDir });

// Dashboard review table fields
const r = await readReviewPacket(reviews[0]);
expect(r.verdict).toBeDefined();
expect(r.reviewerRole).toBe("openclaw_echo");
expect(r.issues.length).toBeGreaterThanOrEqual(0);

// Dashboard causal chain view
const chain = await findRootCauseChain(eventId, tmpDir);
```

## Block/Escalate Verdict Coverage

The `ValidatedReviewPacketSchema` has `superRefine(blockRequiresFinding)`:

```typescript
// blockRequiresFinding logic:
if (data.verdict === "block" || data.verdict === "escalate") &&
   data.issues.length === 0 &&
   data.safetyFindings.length === 0
  → reject with "must include at least one issue or safety finding"
```

Acceptance tests:
```typescript
const reviewPacket = {
  reviewerRole: "openclaw_echo" as const,
  verdict: "block" as const,
  safetyFindings: ["Unauthorized mutation path detected"], // satisfies requirement
  issues: [],
  // ...
};
await writeReviewPacket(reviewPacket, { workdir: tmpDir }); // succeeds
```

Rejection tests:
```typescript
const reviewPacket = {
  verdict: "block" as const,
  safetyFindings: [],  // empty
  issues: [],          // empty
};
await expect(writeReviewPacket(reviewPacket)).rejects.toThrow(); // ZodError
```

**Filename pitfall**: review filenames follow `review-{timestamp}-{reviewerRole}-{slug}.json` — they do NOT include reviewId. Find by content:
```typescript
let found: string | undefined;
for (const f of reviews) {
  const rv = await readReviewPacket(f);
  if (rv.reviewId === targetId) { found = f; break; }
}
```

## Root Cause Chain

Emit linked trace events with `parentEventId` threading:

```typescript
const ev1 = createTraceEvent({ eventType: "packet_created", ... });
const ev2 = createTraceEvent({ eventType: "approvalgate_required", parentEventId: ev1.eventId, ... });
const ev3 = createTraceEvent({ eventType: "packet_claimed", parentEventId: ev2.eventId, ... });
// ... 6 events total

const chain = await findRootCauseChain(ev6.eventId, tmpDir);
expect(chain.length).toBe(6); // walks ev6 → ev5 → ev4 → ev3 → ev2 → ev1
```

Edge cases:
- Middle event: chain returns ancestors only (ev2 → ev1)
- Unlinked event: returns self-only (length 1)
- Missing eventId: returns empty array
- `rootCauseEventId` takes priority over `parentEventId`

## Boundary Checks

```typescript
// No live transport tokens
for (const e of events) {
  const str = JSON.stringify(e);
  expect(str).not.toContain("HermesClient");
  expect(str).not.toContain("OpenClawClient");
}

// No mutation events
const mutationEvents = events.filter(
  e => e.eventType === "mutation_applied" || e.eventType === "mutation_requested"
);
expect(mutationEvents.length).toBe(0);

// Warden stays advisory
const r = await readReviewPacket(reviews[0]);
expect(r.reviewerRole).toBe("openclaw_echo");
expect(r.metadata?.dryRun).toBe(true);

// Read-only operations don't mutate
const inbox1 = await listInboxPackets({ workdir: tmpDir });
const inbox2 = await listInboxPackets({ workdir: tmpDir });
expect(inbox1.length).toBe(inbox2.length);
```
