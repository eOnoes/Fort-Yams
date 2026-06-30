/**
 * File Bus tests — verifies safe file-system operations for the Agent Bus.
 */
import { describe, it, expect, beforeEach, afterEach } from "vitest";
import * as fs from "node:fs/promises";
import * as path from "node:path";
import * as os from "node:os";
import {
  ensureAgentBus,
  getAgentBusPaths,
  writeTaskPacket,
  writeResultPacket,
  readTaskPacket,
  readResultPacket,
  listInboxPackets,
  listOutboxPackets,
  movePacketToArchive,
  movePacketToRejected,
  createTaskPacketFilename,
  createResultPacketFilename,
} from "../fileBus.js";
import {
  ValidatedTaskPacketSchema,
} from "../schemas.js";
import type { ExternalAgentTaskPacket, ExternalAgentResultPacket } from "../schemas.js";

// ── Helpers ───────────────────────────────────────────────────────────

let tmpDir: string;

function makeTask(overrides: Partial<ExternalAgentTaskPacket> = {}): ExternalAgentTaskPacket {
  return {
    schemaVersion: "1.0.0",
    packetId: `pkt-${Math.random().toString(36).slice(2, 10)}`,
    runId: "run-test-001",
    createdAt: new Date().toISOString(),
    createdBy: "test",
    agentRole: "openclaw_tripp",
    trustZone: "cloud_controlled_reasoning",
    taskType: "review",
    title: "Test Task",
    objective: "Verify file bus operations",
    scope: "testing",
    ...overrides,
  };
}

function makeResult(overrides: Partial<ExternalAgentResultPacket> = {}): ExternalAgentResultPacket {
  return {
    schemaVersion: "1.0.0",
    packetId: `pkt-${Math.random().toString(36).slice(2, 10)}`,
    resultId: `res-${Math.random().toString(36).slice(2, 10)}`,
    runId: "run-test-001",
    createdAt: new Date().toISOString(),
    agentRole: "openclaw_tripp",
    trustZone: "cloud_controlled_reasoning",
    status: "success",
    summary: "File bus test result",
    ...overrides,
  };
}

beforeEach(async () => {
  tmpDir = path.join(os.tmpdir(), `tripp-agent-bus-test-${Date.now()}`);
  await fs.mkdir(tmpDir, { recursive: true });
});

afterEach(async () => {
  await fs.rm(tmpDir, { recursive: true, force: true });
});

// ── Folder Tests ──────────────────────────────────────────────────────

describe("ensureAgentBus", () => {
  it("creates all folders under temp root", async () => {
    const paths = await ensureAgentBus(tmpDir);
    await expect(fs.access(paths.root)).resolves.toBeUndefined();
    await expect(fs.access(paths.inbox)).resolves.toBeUndefined();
    await expect(fs.access(paths.outbox)).resolves.toBeUndefined();
    await expect(fs.access(paths.reports)).resolves.toBeUndefined();
    await expect(fs.access(paths.archive)).resolves.toBeUndefined();
    await expect(fs.access(paths.rejected)).resolves.toBeUndefined();
  });

  it("is idempotent", async () => {
    await ensureAgentBus(tmpDir);
    await ensureAgentBus(tmpDir); // second call should not throw
    const paths = getAgentBusPaths(tmpDir);
    await expect(fs.access(paths.root)).resolves.toBeUndefined();
  });
});

// ── Write/Read Tests ──────────────────────────────────────────────────

describe("writeTaskPacket / readTaskPacket", () => {
  it("write/read round trip works", async () => {
    const packet = makeTask();
    const filePath = await writeTaskPacket(packet, { workdir: tmpDir });
    expect(filePath).toContain("inbox");

    const read = await readTaskPacket(filePath);
    expect(read.packetId).toBe(packet.packetId);
    expect(read.runId).toBe(packet.runId);
    expect(read.title).toBe(packet.title);
  });

  it("writes pretty JSON", async () => {
    const packet = makeTask();
    const filePath = await writeTaskPacket(packet, { workdir: tmpDir });
    const raw = await fs.readFile(filePath, "utf-8");
    expect(raw).toContain("  "); // indented JSON
  });

  it("rejects invalid packet (fails closed)", async () => {
    const filePath = path.join(tmpDir, ".tripp/agents/inbox/bad.json");
    await fs.mkdir(path.dirname(filePath), { recursive: true });
    await fs.writeFile(filePath, "not json", "utf-8");
    await expect(readTaskPacket(filePath)).rejects.toThrow();
  });
});

describe("writeResultPacket / readResultPacket", () => {
  it("write/read round trip works", async () => {
    const packet = makeResult();
    const filePath = await writeResultPacket(packet, { workdir: tmpDir });
    expect(filePath).toContain("outbox");

    const read = await readResultPacket(filePath);
    expect(read.packetId).toBe(packet.packetId);
    expect(read.resultId).toBe(packet.resultId);
    expect(read.status).toBe("success");
  });
});

// ── Path Traversal Test ───────────────────────────────────────────────

describe("path safety", () => {
  it("rejects path traversal writes", async () => {
    const packet = makeTask();
    // Attempt to write outside the bus
    const escapePath = path.join(tmpDir, "escape.json");
    await expect(
      writeTaskPacket(packet, { workdir: tmpDir, filename: `../../escape.json` })
    ).rejects.toThrow();
  });
});

// ── List Tests ────────────────────────────────────────────────────────

describe("listInboxPackets / listOutboxPackets", () => {
  it("listInboxPackets returns task files", async () => {
    await writeTaskPacket(makeTask(), { workdir: tmpDir });
    await writeTaskPacket(makeTask(), { workdir: tmpDir });
    const files = await listInboxPackets({ workdir: tmpDir });
    expect(files.length).toBe(2);
  });

  it("listOutboxPackets returns result files", async () => {
    await writeResultPacket(makeResult(), { workdir: tmpDir });
    const files = await listOutboxPackets({ workdir: tmpDir });
    expect(files.length).toBe(1);
  });

  it("returns empty when no files", async () => {
    const files = await listInboxPackets({ workdir: tmpDir });
    expect(files).toEqual([]);
  });
});

// ── Move Tests ────────────────────────────────────────────────────────

describe("movePacketToArchive", () => {
  it("moves file from inbox to archive", async () => {
    const filePath = await writeTaskPacket(makeTask(), { workdir: tmpDir });
    const newPath = await movePacketToArchive(filePath, { workdir: tmpDir });
    expect(newPath).toContain("archive");

    // Original should be gone
    await expect(fs.access(filePath)).rejects.toThrow();
    // New path should exist
    await expect(fs.access(newPath)).resolves.toBeUndefined();
  });
});

describe("movePacketToRejected", () => {
  it("moves file to rejected and creates reason file", async () => {
    const filePath = await writeTaskPacket(makeTask(), { workdir: tmpDir });
    const newPath = await movePacketToRejected(filePath, "Test rejection reason", { workdir: tmpDir });
    expect(newPath).toContain("rejected");

    // Reason file should exist
    const reasonPath = newPath.replace(/\.json$/, ".rejection.md");
    await expect(fs.access(reasonPath)).resolves.toBeUndefined();
    const reasonContent = await fs.readFile(reasonPath, "utf-8");
    expect(reasonContent).toContain("Test rejection reason");
  });
});

// ── Filename Tests ────────────────────────────────────────────────────

describe("createTaskPacketFilename", () => {
  it("generates deterministic filenames", () => {
    const packet = makeTask({ title: "Review Auth Module" });
    const name = createTaskPacketFilename(packet);
    expect(name).toMatch(/^task-\d{8}-\d{6}-openclaw_tripp-review-auth-module-[a-f0-9]{8}\.json$/);
  });
});

describe("createResultPacketFilename", () => {
  it("generates deterministic filenames", () => {
    const packet = makeResult({ summary: "Auth module review complete" });
    const name = createResultPacketFilename(packet);
    expect(name).toMatch(/^result-\d{8}-\d{6}-openclaw_tripp-auth-module-review-complete\.json$/);
  });
});
