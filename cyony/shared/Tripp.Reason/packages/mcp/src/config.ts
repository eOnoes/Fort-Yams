/**
 * @tripp-reason/mcp — MCP config loader
 *
 * Loads MCP server configurations from a JSON config file.
 * Supports default path, env override, and CLI/server flag override.
 *
 * Safety:
 * - No config file → MCP disabled (no error)
 * - Invalid config → controlled error, MCP disabled
 * - commands must be explicit strings (no shell evaluation)
 * - env is allowlist only (no process.env passthrough)
 */
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import type { McpServerConfig } from "./types.js";

export interface McpConfig {
  servers: McpServerConfig[];
}

const DEFAULT_CONFIG_PATH = ".tripp/mcp.config.json";

/**
 * Load MCP configuration.
 *
 * Priority:
 * 1. explicitPath (from CLI --mcp-config or server flag)
 * 2. TRIPP_MCP_CONFIG env var
 * 3. .tripp/mcp.config.json in workdir
 *
 * Returns null if no config file exists (MCP disabled, not an error).
 * Throws only on invalid JSON or schema violations.
 */
export function loadMcpConfig(
  workdir: string,
  explicitPath?: string,
): McpConfig | null {
  const configPath = explicitPath
    ?? process.env["TRIPP_MCP_CONFIG"]
    ?? resolve(workdir, DEFAULT_CONFIG_PATH);

  let raw: string;
  try {
    raw = readFileSync(configPath, "utf-8");
  } catch {
    // File not found → MCP disabled, not an error
    return null;
  }

  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch (err) {
    throw new Error(
      `MCP config parse error in ${configPath}: ${err instanceof Error ? err.message : String(err)}`,
    );
  }

  if (!parsed || typeof parsed !== "object" || !("servers" in parsed)) {
    throw new Error(`MCP config invalid: expected { servers: [...] }`);
  }

  const obj = parsed as Record<string, unknown>;
  if (!Array.isArray(obj["servers"])) {
    throw new Error(`MCP config invalid: 'servers' must be an array`);
  }

  const servers: McpServerConfig[] = [];

  for (let i = 0; i < (obj["servers"] as unknown[]).length; i++) {
    const entry = (obj["servers"] as unknown[])[i];
    if (!entry || typeof entry !== "object") {
      throw new Error(`MCP config server[${i}] is not an object`);
    }
    const s = entry as Record<string, unknown>;

    const server: McpServerConfig = {
      id: String(s["id"] ?? `server-${i}`),
      displayName: String(s["displayName"] ?? s["id"] ?? `Server ${i}`),
      command: String(s["command"] ?? ""),
      args: Array.isArray(s["args"])
        ? s["args"].map(String)
        : undefined,
      cwd: typeof s["cwd"] === "string" ? resolve(workdir, s["cwd"]) : undefined,
      env: s["env"] && typeof s["env"] === "object"
        ? Object.fromEntries(
            Object.entries(s["env"] as Record<string, unknown>).map(([k, v]) => [k, String(v)]),
          )
        : undefined,
      enabled: s["enabled"] !== false, // default: enabled
      startupTimeoutMs: typeof s["timeoutMs"] === "number" ? s["timeoutMs"] : undefined,
      toolTimeoutMs: typeof s["timeoutMs"] === "number" ? s["timeoutMs"] : undefined,
      allowedTools: Array.isArray(s["allowedTools"])
        ? s["allowedTools"].map(String)
        : undefined,
      deniedTools: Array.isArray(s["deniedTools"])
        ? s["deniedTools"].map(String)
        : undefined,
    };

    if (!server.command) {
      throw new Error(`MCP config server[${i}] ('${server.id}'): 'command' is required`);
    }

    servers.push(server);
  }

  return { servers };
}

/**
 * Resolve the config path for display in status (without reading the file).
 */
export function resolveMcpConfigPath(
  workdir: string,
  explicitPath?: string,
): string {
  return explicitPath
    ?? process.env["TRIPP_MCP_CONFIG"]
    ?? resolve(workdir, DEFAULT_CONFIG_PATH);
}
