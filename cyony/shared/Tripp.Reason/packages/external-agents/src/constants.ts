/**
 * @tripp-reason/external-agents — Constants
 *
 * Agent Bus folder paths, default denied paths, and shared configuration.
 */

/** Root directory for the Agent Bus */
export const AGENT_BUS_ROOT = ".tripp/agents";

/** Task packets waiting for external agents */
export const AGENT_BUS_INBOX = ".tripp/agents/inbox";

/** Result packets returned by external agents */
export const AGENT_BUS_OUTBOX = ".tripp/agents/outbox";

/** Agent-generated or Tripp.Reason-generated review reports */
export const AGENT_BUS_REPORTS = ".tripp/agents/reports";

/** Completed accepted packet/result cycles (audit trail) */
export const AGENT_BUS_ARCHIVE = ".tripp/agents/archive";

/** Failed, blocked, unsafe, malformed, or rejected packets */
export const AGENT_BUS_REJECTED = ".tripp/agents/rejected";

/** Default paths denied to external agents */
export const DEFAULT_DENIED_PATHS: readonly string[] = [
  ".env",
  ".env.*",
  "**/.env",
  "**/.env.*",
  ".git",
  "node_modules",
  "**/secrets/**",
  "**/credentials/**",
  "**/tokens/**",
  "**/*.key",
  "**/*.pem",
  "**/.ssh/**",
];

/** Schema version for all packets */
export const SCHEMA_VERSION = "1.0.0";

/** Maximum packet file size (1 MB) */
export const MAX_PACKET_SIZE_BYTES = 1_048_576;

/** Characters to strip when generating filename slugs */
export const UNSAFE_FILENAME_CHARS = /[^a-z0-9._-]/gi;
