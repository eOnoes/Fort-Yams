/**
 * @tripp-reason/core — EventStream
 *
 * In-process typed event pub/sub. Synchronous, order-preserving.
 * NOT HTTP/SSE — internal only (HTTP/SSE belongs to Phase 3 server).
 *
 * Flow:
 *   RunManager persists event via store → emits through EventStream
 *   Subscribers receive events in insertion order.
 *
 * Design decisions:
 * - Synchronous emit (no queue) — subscribers must not block
 * - Subscriber errors are caught and logged, don't break the stream
 * - Unsubscribe via returned disposer function
 */
import type { StreamEvent } from "@tripp-reason/shared";
export type EventSubscriber = (event: StreamEvent) => void;
export interface EventStream {
    /** Subscribe to all events. Returns an unsubscribe function. */
    subscribe(fn: EventSubscriber): () => void;
    /** Emit an event to all current subscribers. */
    emit(event: StreamEvent): void;
    /** Return the count of active subscribers (for diagnostics). */
    subscriberCount(): number;
}
/**
 * Create an in-process EventStream.
 */
export declare function createEventStream(): EventStream;
//# sourceMappingURL=eventStream.d.ts.map