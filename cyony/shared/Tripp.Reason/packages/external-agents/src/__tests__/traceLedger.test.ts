/**
 * Trace ledger tests — Phase 7F
 */
import { describe, it, expect, beforeEach, afterEach } from "vitest";
import * as fs from "node:fs/promises";
import * as path from "node:path";
import * as os from "node:os";
import { randomUUID } from "node:crypto";
import {
  // Schemas
  AgentBusTraceEventSchema,
  ValidatedTraceEventSchema,
} from "../traceSchemas.js";
import {
  // Helpers
  ensureTraceLedger,
  getTraceLedgerPath,
  createTraceEvent,
  appendTraceEvent,
  readTraceEvents,
  validateTraceLedger,
  findTraceEventsByPacketId,
  findTraceEventsByResultId,
  findTraceEventsByRunId,
  findRootCauseChain,
} from "../traceLedger.js";

let tmpDir: string;

beforeEach(async () => {
  tmpDir = path.join(os.tmpdir(), `tripp-trace-test-${Date.now()}`);
  await fs.mkdir(tmpDir, { recursive: true });
});

afterEach(async () => {
  await fs.rm(tmpDir, { recursive: true, force: true });
});

// ── Schema tests ──────────────────────────────────────────────────────

describe("TraceEvent schemas", () => {
  it("valid event parses", () => {
    const event = {
      schemaVersion: "1.0.0",
      eventId: randomUUID(),
      eventType: "packet_created",
      severity: "info",
      createdAt: new Date().toISOString(),
      actorType: "cli",
      summary: "Task packet created",
    };
    const parsed = AgentBusTraceEventSchema.parse(event);
    expect(parsed.eventType).toBe("packet_created");
    expect(parsed.severity).toBe("info");
  });

  it("required fields enforced", () => {
    expect(() =>
      AgentBusTraceEventSchema.parse({ eventType: "packet_created" })
    ).toThrow();
  });

  it("defaults applied", () => {
    const event = {
      eventId: randomUUID(),
      eventType: "packet_created" as const,
      createdAt: new Date().toISOString(),
      actorType: "cli" as const,
      summary: "test",
    };
    const parsed = AgentBusTraceEventSchema.parse(event);
    expect(parsed.severity).toBe("info");
    expect(parsed.toolNames).toEqual([]);
    expect(parsed.tags).toEqual([]);
    expect(parsed.schemaVersion).toBe("1.0.0");
  });

  it("root_cause_linked requires rootCauseEventId", () => {
    expect(() =>
      ValidatedTraceEventSchema.parse({
        eventId: randomUUID(),
        eventType: "root_cause_linked",
        createdAt: new Date().toISOString(),
        actorType: "system",
        summary: "Linked root cause",
      })
    ).toThrow(/rootCauseEventId/);
  });

  it("subagent_spawned requires subagentId", () => {
    expect(() =>
      ValidatedTraceEventSchema.parse({
        eventId: randomUUID(),
        eventType: "subagent_spawned",
        createdAt: new Date().toISOString(),
        actorType: "openclaw_tripp",
        summary: "Spawned subagent",
      })
    ).toThrow(/subagentId/);
  });

  it("subagent_completed requires subagentId", () => {
    expect(() =>
      ValidatedTraceEventSchema.parse({
        eventId: randomUUID(),
        eventType: "subagent_completed",
        createdAt: new Date().toISOString(),
        actorType: "openclaw_tripp",
        summary: "Completed subagent",
      })
    ).toThrow(/subagentId/);
  });

  it("tools_loaded requires tool names", () => {
    expect(() =>
      ValidatedTraceEventSchema.parse({
        eventId: randomUUID(),
        eventType: "tools_loaded",
        createdAt: new Date().toISOString(),
        actorType: "system",
        summary: "Tools loaded",
      })
    ).toThrow(/toolNames/);
  });

  it("tools_unloaded requires tool names", () => {
    expect(() =>
      ValidatedTraceEventSchema.parse({
        eventId: randomUUID(),
        eventType: "tools_unloaded",
        createdAt: new Date().toISOString(),
        actorType: "system",
        summary: "Tools unloaded",
      })
    ).toThrow(/toolNames/);
  });

  it("tools_loaded with tool names parses", () => {
    const event = {
      eventId: randomUUID(),
      eventType: "tools_loaded" as const,
      createdAt: new Date().toISOString(),
      actorType: "system" as const,
      summary: "Tools loaded",
      toolNames: ["read_file", "write_file"],
    };
    const parsed = ValidatedTraceEventSchema.parse(event);
    expect(parsed.toolNames).toContain("read_file");
  });

  it("invalid event type fails", () => {
    expect(() =>
      AgentBusTraceEventSchema.parse({
        eventId: randomUUID(),
        eventType: "invalid_event_type",
        createdAt: new Date().toISOString(),
        actorType: "system",
        summary: "bad",
      })
    ).toThrow();
  });

  it("warden_stop_resolved with parentEventId parses", () => {
    const event = {
      eventId: randomUUID(),
      eventType: "warden_stop_resolved" as const,
      createdAt: new Date().toISOString(),
      actorType: "openclaw_echo",
      summary: "Resolved stop",
      parentEventId: randomUUID(),
    };
    const parsed = ValidatedTraceEventSchema.parse(event);
    expect(parsed.eventType).toBe("warden_stop_resolved");
  });

  it("warden_stop_resolved with details parses", () => {
    const event = {
      eventId: randomUUID(),
      eventType: "warden_stop_resolved" as const,
      createdAt: new Date().toISOString(),
      actorType: "openclaw_echo",
      summary: "Resolved stop",
      details: { resolution: "Manual override" },
    };
    const parsed = ValidatedTraceEventSchema.parse(event);
    expect(parsed.details).toEqual({ resolution: "Manual override" });
  });

  it("validation_failed_later with parentEventId parses", () => {
    const event = {
      eventId: randomUUID(),
      eventType: "validation_failed_later" as const,
      createdAt: new Date().toISOString(),
      actorType: "system",
      summary: "Failed later",
      parentEventId: randomUUID(),
    };
    const parsed = ValidatedTraceEventSchema.parse(event);
    expect(parsed.eventType).toBe("validation_failed_later");
  });
});

// ── Helper tests ──────────────────────────────────────────────────────

describe("trace ledger helpers", () => {
  it("ensureTraceLedger creates trace folder and file", async () => {
    const p = await ensureTraceLedger(tmpDir);
    const traceDir = path.join(tmpDir, ".tripp/agents/trace");
    await expect(fs.access(traceDir)).resolves.toBeUndefined();
    await expect(fs.access(p)).resolves.toBeUndefined();
  });

  it("ensureTraceLedger is idempotent", async () => {
    await ensureTraceLedger(tmpDir);
    const p2 = await ensureTraceLedger(tmpDir);
    await expect(fs.access(p2)).resolves.toBeUndefined();
  });

  it("createTraceEvent returns valid event", () => {
    const event = createTraceEvent({
      eventType: "packet_created",
      actorType: "cli",
      summary: "Created test packet",
      packetId: randomUUID(),
    });
    expect(event.eventType).toBe("packet_created");
    expect(event.eventId).toBeTruthy();
    expect(event.createdAt).toBeTruthy();
  });

  it("createTraceEvent rejects invalid event", () => {
    expect(() =>
      createTraceEvent({
        eventType: "root_cause_linked",
        summary: "Missing rootCauseEventId",
      })
    ).toThrow();
  });

  it("appendTraceEvent writes valid JSONL line", async () => {
    await ensureTraceLedger(tmpDir);
    const event = createTraceEvent({
      eventType: "packet_created",
      actorType: "cli",
      summary: "Test append",
      packetId: randomUUID(),
    });
    await appendTraceEvent(event, tmpDir);

    const ledgerPath = getTraceLedgerPath(tmpDir);
    const content = await fs.readFile(ledgerPath, "utf-8");
    const lines = content.trim().split("\n");
    expect(lines.length).toBe(1);
    const parsed = JSON.parse(lines[0]);
    expect(parsed.eventType).toBe("packet_created");
  });

  it("appendTraceEvent validates before write", async () => {
    await ensureTraceLedger(tmpDir);
    // Manually create an invalid event object
    const badEvent = {
      schemaVersion: "1.0.0",
      eventId: randomUUID(),
      eventType: "root_cause_linked",
      severity: "info",
      createdAt: new Date().toISOString(),
      actorType: "system",
      summary: "Should fail",
      toolNames: [],
      tags: [],
    } as any;
    await expect(appendTraceEvent(badEvent, tmpDir)).rejects.toThrow();
  });

  it("readTraceEvents returns valid events from JSONL", async () => {
    await ensureTraceLedger(tmpDir);
    const e1 = createTraceEvent({
      eventType: "packet_created",
      actorType: "cli",
      summary: "First",
    });
    const e2 = createTraceEvent({
      eventType: "packet_archived",
      actorType: "cli",
      summary: "Second",
    });
    await appendTraceEvent(e1, tmpDir);
    await appendTraceEvent(e2, tmpDir);

    const events = await readTraceEvents({ workdir: tmpDir });
    expect(events.length).toBe(2);
    expect(events[0].eventType).toBe("packet_created");
    expect(events[1].eventType).toBe("packet_archived");
  });

  it("readTraceEvents respects limit", async () => {
    await ensureTraceLedger(tmpDir);
    for (let i = 0; i < 5; i++) {
      const e = createTraceEvent({
        eventType: "packet_created",
        actorType: "cli",
        summary: `Event ${i}`,
      });
      await appendTraceEvent(e, tmpDir);
    }
    const events = await readTraceEvents({ workdir: tmpDir, limit: 3 });
    expect(events.length).toBe(3);
  });

  it("validateTraceLedger reports valid ledger", async () => {
    await ensureTraceLedger(tmpDir);
    const e = createTraceEvent({
      eventType: "packet_created",
      actorType: "cli",
      summary: "Valid",
    });
    await appendTraceEvent(e, tmpDir);

    const result = await validateTraceLedger(tmpDir);
    expect(result.isValid).toBe(true);
    expect(result.validEvents).toBe(1);
    expect(result.malformedLines).toBe(0);
  });

  it("validateTraceLedger reports malformed line without rewriting", async () => {
    await ensureTraceLedger(tmpDir);
    const ledgerPath = getTraceLedgerPath(tmpDir);

    // Write valid event
    const e = createTraceEvent({
      eventType: "packet_created",
      actorType: "cli",
      summary: "Valid",
    });
    await appendTraceEvent(e, tmpDir);

    // Append a malformed line
    await fs.appendFile(ledgerPath, "{ not valid json\n", "utf-8");

    const result = await validateTraceLedger(tmpDir);
    expect(result.isValid).toBe(false);
    expect(result.malformedLines).toBe(1);
    expect(result.malformedLineNumbers).toContain(2);

    // File should not have been rewritten
    const content = await fs.readFile(ledgerPath, "utf-8");
    expect(content).toContain("{ not valid json");
  });

  it("findTraceEventsByPacketId filters correctly", async () => {
    await ensureTraceLedger(tmpDir);
    const pid = randomUUID();
    await appendTraceEvent(
      createTraceEvent({
        eventType: "packet_created",
        actorType: "cli",
        summary: "Created",
        packetId: pid,
      }),
      tmpDir
    );
    await appendTraceEvent(
      createTraceEvent({
        eventType: "packet_created",
        actorType: "cli",
        summary: "Other",
        packetId: randomUUID(),
      }),
      tmpDir
    );

    const found = await findTraceEventsByPacketId(pid, { workdir: tmpDir });
    expect(found.length).toBe(1);
    expect(found[0].summary).toBe("Created");
  });

  it("findTraceEventsByRunId filters correctly", async () => {
    await ensureTraceLedger(tmpDir);
    const rid = randomUUID();
    await appendTraceEvent(
      createTraceEvent({
        eventType: "packet_created",
        actorType: "cli",
        summary: "Run A",
        runId: rid,
      }),
      tmpDir
    );

    const found = await findTraceEventsByRunId(rid, { workdir: tmpDir });
    expect(found.length).toBe(1);
  });

  it("findRootCauseChain follows parent/root links", async () => {
    await ensureTraceLedger(tmpDir);

    const root = createTraceEvent({
      eventType: "packet_created",
      actorType: "cli",
      summary: "Root event",
    });
    await appendTraceEvent(root, tmpDir);

    const validationFail = createTraceEvent({
      eventType: "validation_failed_later",
      actorType: "system",
      summary: "Validation failed later",
      parentEventId: root.eventId,
    });
    await appendTraceEvent(validationFail, tmpDir);

    const linked = createTraceEvent({
      eventType: "root_cause_linked",
      actorType: "openclaw_echo",
      summary: "Root cause linked",
      rootCauseEventId: validationFail.eventId,
    });
    await appendTraceEvent(linked, tmpDir);

    const chain = await findRootCauseChain(linked.eventId, tmpDir);
    expect(chain.length).toBe(3);
    expect(chain[0].eventId).toBe(root.eventId);
    expect(chain[1].eventId).toBe(validationFail.eventId);
    expect(chain[2].eventId).toBe(linked.eventId);
  });

  it("getTraceLedgerPath returns correct path", () => {
    const p = getTraceLedgerPath(tmpDir);
    expect(p).toContain(".tripp/agents/trace/agent-bus-trace.jsonl");
  });
});
