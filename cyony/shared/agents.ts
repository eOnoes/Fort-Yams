/**
 * Phase 7G — Agent Bus API routes.
 *
 * Read-only access to inbox, outbox, reviews, and trace ledger.
 * All paths are validated against .tripp/agents boundary.
 */
import type { FastifyInstance } from "fastify";
import * as path from "node:path";
import * as fs from "node:fs/promises";
import {
  ensureAgentBus,
  listInboxPackets,
  listOutboxPackets,
  listReviewPackets,
  listReportFiles,
  readTaskPacket,
  readResultPacket,
  readReviewPacket,
  readTraceEvents,
  validateTraceLedger,
  findRootCauseChain,
  movePacketToArchive,
  movePacketToRejected,
  createTraceEvent,
  appendTraceEvent,
  AGENT_BUS_ROOT,
} from "@tripp-reason/external-agents";

function agentBusDir(workdir: string): string {
  return path.resolve(workdir, AGENT_BUS_ROOT);
}

function safeAgentPath(filePath: string, workdir: string): string {
  const base = agentBusDir(workdir) + path.sep;
  const resolved = path.resolve(workdir, filePath);
  if (!resolved.startsWith(base)) {
    throw Object.assign(new Error("Path outside Agent Bus"), {
      statusCode: 403,
    });
  }
  return resolved;
}

// ── Status ───────────────────────────────────────────────────────────

export function agentsStatusRoute(app: FastifyInstance, workdir: string): void {
  app.get("/agents/status", async (_req, reply) => {
    const base = agentBusDir(workdir);
    const dirs = ["inbox", "outbox", "reports", "archive", "rejected"];
    const counts: Record<string, number> = {};
    const missing: string[] = [];

    for (const d of dirs) {
      try {
        const entries = await fs.readdir(path.join(base, d));
        counts[d] = entries.length;
      } catch {
        counts[d] = 0;
        missing.push(d);
      }
    }

    const traceResult = await validateTraceLedger(workdir);

    return {
      busRoot: base,
      folders: dirs.map((d) => ({ name: d, present: !missing.includes(d) })),
      inboxCount: counts.inbox ?? 0,
      outboxCount: counts.outbox ?? 0,
      reportsCount: counts.reports ?? 0,
      archiveCount: counts.archive ?? 0,
      rejectedCount: counts.rejected ?? 0,
      traceEventCount: traceResult.totalLines,
      traceMalformedCount: traceResult.malformedLines,
      traceValidCount: traceResult.validEvents,
      traceLedgerPath: traceResult.ledgerPath,
    };
  });
}

// ── Inbox ────────────────────────────────────────────────────────────

export function agentsInboxRoute(app: FastifyInstance, workdir: string): void {
  app.get("/agents/inbox", async (_req, reply) => {
    const files = await listInboxPackets({ workdir });
    const packets: unknown[] = [];

    for (const f of files) {
      try {
        const p = await readTaskPacket(f);
        packets.push({
          fileName: path.basename(f),
          relativePath: path.relative(agentBusDir(workdir), f),
          packetId: p.packetId,
          runId: p.runId,
          agentRole: p.agentRole,
          taskType: p.taskType,
          title: p.title,
          status: p.status,
          createdAt: p.createdAt,
          malformed: false,
        });
      } catch (e) {
        packets.push({
          fileName: path.basename(f),
          relativePath: path.relative(agentBusDir(workdir), f),
          malformed: true,
          error: (e as Error).message,
        });
      }
    }

    return { packets };
  });
}

// ── Outbox ───────────────────────────────────────────────────────────

export function agentsOutboxRoute(app: FastifyInstance, workdir: string): void {
  app.get("/agents/outbox", async (_req, reply) => {
    const files = await listOutboxPackets({ workdir });
    const packets: unknown[] = [];

    for (const f of files) {
      try {
        const p = await readResultPacket(f);
        const highRiskCount = p.proposedChanges.filter(
          (c) => c.risk === "high"
        ).length;
        packets.push({
          fileName: path.basename(f),
          relativePath: path.relative(agentBusDir(workdir), f),
          packetId: p.packetId,
          resultId: p.resultId,
          runId: p.runId,
          agentRole: p.agentRole,
          trustZone: p.trustZone,
          status: p.status,
          summary: p.summary,
          createdAt: p.createdAt,
          proposedChangesCount: p.proposedChanges.length,
          highRiskChangesCount: highRiskCount,
          malformed: false,
        });
      } catch (e) {
        packets.push({
          fileName: path.basename(f),
          relativePath: path.relative(agentBusDir(workdir), f),
          malformed: true,
          error: (e as Error).message,
        });
      }
    }

    return { results: packets };
  });
}

// ── Reviews ──────────────────────────────────────────────────────────

export function agentsReviewsRoute(
  app: FastifyInstance,
  workdir: string
): void {
  app.get("/agents/reviews", async (_req, reply) => {
    const jsonFiles = await listReviewPackets({ workdir });
    const mdFiles = await listReportFiles({ workdir });
    const reviews: unknown[] = [];

    for (const f of jsonFiles) {
      try {
        const r = await readReviewPacket(f);
        reviews.push({
          fileName: path.basename(f),
          relativePath: path.relative(agentBusDir(workdir), f),
          reviewId: r.reviewId,
          packetId: r.packetId,
          resultId: r.resultId,
          runId: r.runId,
          reviewerRole: r.reviewerRole,
          verdict: r.verdict,
          createdAt: r.createdAt,
          issueCount: r.issues.length,
          malformed: false,
        });
      } catch (e) {
        reviews.push({
          fileName: path.basename(f),
          relativePath: path.relative(agentBusDir(workdir), f),
          malformed: true,
          error: (e as Error).message,
        });
      }
    }

    const mdReports = mdFiles.map((f) => ({
      fileName: path.basename(f),
      relativePath: path.relative(agentBusDir(workdir), f),
      type: "markdown_report",
    }));

    return { reviews, mdReports };
  });
}

// ── Trace ────────────────────────────────────────────────────────────

export function agentsTraceRoute(app: FastifyInstance, workdir: string): void {
  app.get("/agents/trace", async (req, reply) => {
    const q = req.query as Record<string, string>;
    let events = await readTraceEvents({
      workdir,
      limit: q.limit ? parseInt(q.limit, 10) : undefined,
    });

    if (q.eventType)
      events = events.filter((e) => e.eventType === q.eventType);
    if (q.severity)
      events = events.filter((e) => e.severity === q.severity);
    if (q.packetId)
      events = events.filter((e) => e.packetId === q.packetId);
    if (q.resultId)
      events = events.filter((e) => e.resultId === q.resultId);
    if (q.reviewId)
      events = events.filter((e) => e.reviewId === q.reviewId);
    if (q.runId)
      events = events.filter((e) => e.runId === q.runId);

    const validation = await validateTraceLedger(workdir);

    return {
      events,
      totalEvents: validation.totalLines,
      malformedLines: validation.malformedLines,
    };
  });
}

// ── Trace Chain ──────────────────────────────────────────────────────

export function agentsTraceChainRoute(
  app: FastifyInstance,
  workdir: string
): void {
  app.get("/agents/trace/chain/:eventId", async (req, reply) => {
    const { eventId } = req.params as { eventId: string };
    const chain = await findRootCauseChain(eventId, workdir);

    // Find the selected event
    const allEvents = await readTraceEvents({ workdir });
    const selected = allEvents.find((e) => e.eventId === eventId);

    return {
      eventId,
      selectedEvent: selected ?? null,
      chain,
      chainLength: chain.length,
      missingLinks: selected && chain.length === 0 ? true : false,
    };
  });
}

// ── Read ─────────────────────────────────────────────────────────────

export function agentsReadRoute(app: FastifyInstance, workdir: string): void {
  app.get("/agents/read", async (req, reply) => {
    const filePath = (req.query as Record<string, string>).path;
    if (!filePath) {
      return reply.status(400).send({ error: "path query param required" });
    }

    let resolved: string;
    try {
      resolved = safeAgentPath(filePath, workdir);
    } catch (e) {
      return reply.status(403).send({ error: (e as Error).message });
    }

    // Try reading as different packet types
    const name = path.basename(resolved);

    try {
      if (name.startsWith("task-")) {
        const p = await readTaskPacket(resolved);
        return { type: "task_packet", validated: true, data: p };
      }
    } catch { /* fall through */ }

    try {
      if (name.startsWith("result-")) {
        const p = await readResultPacket(resolved);
        return { type: "result_packet", validated: true, data: p };
      }
    } catch { /* fall through */ }

    try {
      if (name.startsWith("review-") && resolved.endsWith(".json")) {
        const p = await readReviewPacket(resolved);
        return { type: "review_packet", validated: true, data: p };
      }
    } catch { /* fall through */ }

    try {
      if (resolved.endsWith(".md")) {
        const text = await fs.readFile(resolved, "utf-8");
        return { type: "markdown", validated: false, text };
      }
    } catch {
      return reply.status(404).send({ error: "File not found" });
    }

    return { type: "unknown", validated: false, error: "Unrecognized format" };
  });
}

// ── Archive (safe write — approved pattern) ─────────────────────────

export function agentsArchiveRoute(
  app: FastifyInstance,
  workdir: string
): void {
  app.post("/agents/archive", async (req, reply) => {
    const { path: filePath } = (req.body ?? {}) as { path?: string };
    if (!filePath) {
      return reply.status(400).send({ error: "path required" });
    }

    let resolved: string;
    try {
      resolved = safeAgentPath(filePath, workdir);
    } catch (e) {
      return reply.status(403).send({ error: (e as Error).message });
    }

    const dest = await movePacketToArchive(resolved, { workdir });

    // Emit trace event
    try {
      const ev = createTraceEvent({
        eventType: "packet_archived",
        severity: "info",
        actorType: "approvalgate",
        sourcePath: resolved,
        targetPath: dest,
        summary: `Packet archived via dashboard: ${path.basename(resolved)}`,
      });
      await appendTraceEvent(ev, workdir);
    } catch { /* best-effort */ }

    return {
      archived: true,
      source: resolved,
      destination: dest,
      warning: "Archive is NOT approval — no mutation authority granted.",
    };
  });
}

// ── Reject (safe write — approved pattern) ──────────────────────────

export function agentsRejectRoute(
  app: FastifyInstance,
  workdir: string
): void {
  app.post("/agents/reject", async (req, reply) => {
    const { path: filePath, reason } = (req.body ?? {}) as {
      path?: string;
      reason?: string;
    };
    if (!filePath) {
      return reply.status(400).send({ error: "path required" });
    }
    if (!reason) {
      return reply.status(400).send({ error: "reason required" });
    }

    let resolved: string;
    try {
      resolved = safeAgentPath(filePath, workdir);
    } catch (e) {
      return reply.status(403).send({ error: (e as Error).message });
    }

    const dest = await movePacketToRejected(resolved, reason, { workdir });

    // Emit trace event
    try {
      const ev = createTraceEvent({
        eventType: "packet_rejected",
        severity: "warning",
        actorType: "approvalgate",
        sourcePath: resolved,
        targetPath: dest,
        summary: `Packet rejected via dashboard: ${path.basename(resolved)} — ${reason}`,
        details: { reason },
      });
      await appendTraceEvent(ev, workdir);
    } catch { /* best-effort */ }

    return {
      rejected: true,
      source: resolved,
      destination: dest,
      reason,
      warning: "Rejection is NOT approval — it is a lifecycle state change.",
    };
  });
}
