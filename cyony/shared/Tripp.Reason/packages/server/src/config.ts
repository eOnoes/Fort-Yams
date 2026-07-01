/**
 * @tripp-reason/server — Server Config
 *
 * Reads environment variables and returns a typed config object.
 * Phase 3B: read-only HTTP/SSE mode. Default bind 127.0.0.1.
 */
export interface ServerConfig {
  host: string;
  port: number;
  dbPath: string;
  workdir: string;
  provider: {
    name: string;
    baseUrl: string;
    apiKey: string;
    defaultModel: string;
  };
}

export function loadConfig(): ServerConfig {
  const host = process.env.TRIPP_SERVER_HOST ?? "127.0.0.1";
  const port = parseInt(process.env.TRIPP_SERVER_PORT ?? "3030", 10);

  // Public bind warning (Phase 3B: warn but allow if explicitly set)
  if (host === "0.0.0.0" && process.env.TRIPP_ALLOW_PUBLIC_BIND !== "true") {
    console.warn(
      "⚠️  TRIPP_SERVER_HOST=0.0.0.0 binds to all interfaces. " +
      "Set TRIPP_ALLOW_PUBLIC_BIND=true to suppress this warning."
    );
  }

  return {
    host,
    port,
    dbPath: process.env.TRIPP_DB_PATH ?? ".tripp/reason.sqlite",
    workdir: process.env.TRIPP_WORKDIR ?? process.cwd(),
    provider: {
      name: process.env.TRIPP_PROVIDER_NAME ?? "openai-compatible",
      baseUrl: process.env.TRIPP_OPENAI_COMPATIBLE_BASE_URL ?? "http://localhost:11434/v1",
      apiKey: process.env.TRIPP_OPENAI_COMPATIBLE_API_KEY ?? "ollama",
      defaultModel: process.env.TRIPP_MODEL ?? "qwen2.5",
    },
  };
}
