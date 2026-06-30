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
export declare function createSseWriter(reply: FastifyReply, metadata: {
    sessionId: string;
    runId: string;
}): SseWriter;
/** Start a heartbeat interval. Returns the interval handle. */
export declare function startHeartbeat(sse: SseWriter, intervalMs?: number): NodeJS.Timeout;
//# sourceMappingURL=sse.d.ts.map