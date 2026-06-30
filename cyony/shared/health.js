export function healthRoute(app) {
    const startTime = Date.now();
    app.get("/health", async (_req, reply) => {
        return {
            status: "ok",
            uptimeMs: Date.now() - startTime,
            phase: "3B",
            mode: "readonly-http-sse",
        };
    });
}
//# sourceMappingURL=health.js.map