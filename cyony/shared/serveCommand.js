/**
 * tripp serve command — start the Fastify server.
 */
import { startServer } from "@tripp-reason/server";
export async function executeServe(options) {
    const config = {
        host: options.host ?? process.env.TRIPP_SERVER_HOST ?? "127.0.0.1",
        port: parseInt(options.port ?? process.env.TRIPP_SERVER_PORT ?? "3030", 10),
        workdir: options.workdir ?? process.env.TRIPP_WORKDIR ?? process.cwd(),
        dbPath: options.db ?? process.env.TRIPP_DB_PATH ?? ".tripp/reason.sqlite",
        provider: {
            name: options.providerName ?? process.env.TRIPP_PROVIDER_NAME ?? "openai-compatible",
            baseUrl: options.baseUrl ?? process.env.TRIPP_OPENAI_COMPATIBLE_BASE_URL ?? "http://localhost:11434/v1",
            apiKey: process.env[options.apiKeyEnv ?? "TRIPP_OPENAI_COMPATIBLE_API_KEY"] ?? "ollama",
            defaultModel: options.model ?? process.env.TRIPP_MODEL ?? "qwen2.5",
        },
    };
    if (config.host === "0.0.0.0" && process.env.TRIPP_ALLOW_PUBLIC_BIND !== "true") {
        console.warn("⚠️  Binding to 0.0.0.0 exposes server to all interfaces.");
        console.warn("   Set TRIPP_ALLOW_PUBLIC_BIND=true to suppress.");
    }
    await startServer(config);
    process.on("SIGINT", () => { console.log("\n🛑 Shutting down..."); process.exit(0); });
    process.on("SIGTERM", () => { console.log("\n🛑 Shutting down..."); process.exit(0); });
}
//# sourceMappingURL=serveCommand.js.map