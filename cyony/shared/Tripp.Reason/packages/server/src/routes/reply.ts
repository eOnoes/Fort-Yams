/**
 * POST /reply — Start a ReasonLoop run and stream events over SSE.
 *
 * Phase 3B-Patch: True real-time SSE via EventStream subscription.
 * Events are forwarded to the client as they are emitted during the run,
 * not fetched post-hoc from the store.
 *
 * Phase 3B: read-only tools only.
 */
import type { FastifyInstance } from "fastify";
import type { StreamEvent } from "@tripp-reason/shared";
import type { ServerRuntime } from "../runtime.js";
import { badRequest, tooLarge } from "../errors.js";
import { createSseWriter, startHeartbeat } from "../sse.js";

const MAX_BODY = 1_048_576;

interface ReplyBody {
  prompt: string;
  sessionId?: string;
  title?: string;
  model?: string;
  provider?: string;
  workdir?: string;
}

export function replyRoute(app: FastifyInstance, runtime: ServerRuntime): void {
  app.post("/reply", async (req, reply) => {
    // Body size cap
    const contentLength = parseInt(req.headers["content-length"] ?? "0", 10);
    if (contentLength > MAX_BODY) {
      return tooLarge(reply, "Request body exceeds 1MB limit");
    }

    let body: ReplyBody;
    try {
      body = typeof req.body === "string" ? JSON.parse(req.body) : req.body as ReplyBody;
    } catch {
      return badRequest(reply, "Invalid JSON body");
    }

    const { prompt, sessionId, title, model, provider } = body;
    if (!prompt || typeof prompt !== "string" || prompt.trim().length === 0) {
      return badRequest(reply, "Missing or empty 'prompt' field");
    }

    // Placeholder IDs — updated when the run starts
    let meta = { sessionId: "pending", runId: "pending" };

    // Set up SSE writer and heartbeat
    const sse = createSseWriter(reply, meta);
    const hb = startHeartbeat(sse);

    // Subscribe to live EventStream — forward events immediately
    const unsub = runtime.eventStream.subscribe((event: StreamEvent) => {
      if (sse.closed) return;

      // Capture sessionId/runId from the first tool_result or finish event
      if (event.type === "finish" && (event as any).runId) {
        meta.runId = (event as any).runId;
      }

      sse.writeEvent(event);
    });

    try {
      // Start ReasonLoop — this blocks until completion,
      // but events are emitted synchronously through EventStream
      const result = await runtime.reasonLoop.run({
        prompt,
        sessionId,
        title,
        model,
        provider,
        workdir: runtime.config.workdir,
      });

      // Update metadata from the result
      meta.sessionId = result.sessionId;
      meta.runId = result.runId;

      // If the ReasonLoop didn't emit a finish event (edge case),
      // send one now with report path
      if (!sse.closed) {
        const reportRecord = await runtime.repos.getReportByRun(result.runId);
        if (reportRecord && !sse.closed) {
          sse.writeEvent({
            type: "finish",
            reason: "complete",
            runId: result.runId,
            ...(reportRecord ? { reportPath: reportRecord.path } as any : {}),
          } as any);
        }
      }
    } catch (err) {
      if (!sse.closed) {
        sse.writeEvent({
          type: "error",
          message: `ReasonLoop failed: ${err instanceof Error ? err.message : String(err)}`,
          recoverable: false,
        });
      }
    } finally {
      // Clean up: unsubscribe, stop heartbeat, close SSE
      unsub();
      clearInterval(hb);
      sse.end();
    }
  });
}
