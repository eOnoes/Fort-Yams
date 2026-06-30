export function createSseWriter(reply, metadata) {
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
    if (typeof reply.raw.flushHeaders === "function") {
        reply.raw.flushHeaders();
    }
    function writeEvent(event) {
        if (closed)
            return;
        const etype = event.type;
        const data = JSON.stringify({
            ...event,
            sessionId: metadata.sessionId,
            runId: metadata.runId,
        });
        reply.raw.write(`event: ${etype}\ndata: ${data}\n\n`);
    }
    function heartbeat() {
        if (closed)
            return;
        reply.raw.write(": heartbeat\n\n");
    }
    function end() {
        if (closed)
            return;
        try {
            reply.raw.end();
        }
        catch { /* already closed */ }
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
export function startHeartbeat(sse, intervalMs = 15000) {
    return setInterval(() => sse.heartbeat(), intervalMs);
}
//# sourceMappingURL=sse.js.map