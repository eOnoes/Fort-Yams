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
export function createEventStream(): EventStream {
  const subscribers = new Set<EventSubscriber>();

  function subscribe(fn: EventSubscriber): () => void {
    subscribers.add(fn);
    return () => {
      subscribers.delete(fn);
    };
  }

  function emit(event: StreamEvent): void {
    for (const fn of subscribers) {
      try {
        fn(event);
      } catch (err) {
        // Subscriber error — log but don't break the stream.
        // Phase 2+ could route this to a structured error channel.
        console.error("[EventStream] subscriber error:", err);
      }
    }
  }

  function subscriberCount(): number {
    return subscribers.size;
  }

  return { subscribe, emit, subscriberCount };
}
