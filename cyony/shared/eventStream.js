/**
 * Create an in-process EventStream.
 */
export function createEventStream() {
    const subscribers = new Set();
    function subscribe(fn) {
        subscribers.add(fn);
        return () => {
            subscribers.delete(fn);
        };
    }
    function emit(event) {
        for (const fn of subscribers) {
            try {
                fn(event);
            }
            catch (err) {
                // Subscriber error — log but don't break the stream.
                // Phase 2+ could route this to a structured error channel.
                console.error("[EventStream] subscriber error:", err);
            }
        }
    }
    function subscriberCount() {
        return subscribers.size;
    }
    return { subscribe, emit, subscriberCount };
}
//# sourceMappingURL=eventStream.js.map