/**
 * @tripp-reason/server — SSE Helper
 *
 * Sets up SSE headers and provides a streaming writer.
 * Uses existing StreamEvent types from shared.
 */
import type { FastifyReply } from "fastify";
import type { StreamEvent } from "@tripp-reason/shared";

export interface SseWriter {
  /** Write a StreamEvent as an SSE frame. */
  writeEvent(event: StreamEvent): void;
  /** Send a heartbeat comment to keep the connection alive. */
  heartbeat(): void;
  /** Close the SSE stream. */
  end(): void;
  /** Whether the connection has been closed by the client. */
  readonly closed: boolean;
}

export function createSseWriter(
  reply: FastifyReply,
  metadata: { sessionId: string; runId: string }
): SseWriter {
  let closed = false;

  reply.raw.on("close", () => {
    closed = true;
  });

  reply.raw.writeHead(200, {
    "content-type": "text/event-stream",
    "cache-control": "no-cache",
    "connection": "keep-alive",
  });

  // Flush headers immediately
  if (typeof (reply.raw as any).flushHeaders === "function") {
    (reply.raw as any).flushHeaders();
  }

  function writeEvent(event: StreamEvent): void {
    if (closed) return;
    const etype = event.type;
    const data = JSON.stringify({
      ...event,
      sessionId: metadata.sessionId,
      runId: metadata.runId,
    });
    reply.raw.write(`event: ${etype}\ndata: ${data}\n\n`);
  }

  function heartbeat(): void {
    if (closed) return;
    reply.raw.write(": heartbeat\n\n");
  }

  function end(): void {
    if (closed) return;
    try { reply.raw.end(); } catch { /* already closed */ }
    closed = true;
  }

  return {
    writeEvent,
    heartbeat,
    end,
    get closed() { return closed; },
  };
}

/** Start a heartbeat interval. Returns the interval handle. */
export function startHeartbeat(sse: SseWriter, intervalMs = 15000): NodeJS.Timeout {
  return setInterval(() => sse.heartbeat(), intervalMs);
}
