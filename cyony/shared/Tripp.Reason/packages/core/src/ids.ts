/**
 * @tripp-reason/core — ID generation
 *
 * Uses Node.js built-in crypto.randomUUID().
 * No external UUID dependency needed — Node 19+ has this globally.
 *
 * Optional prefix for human-readable IDs (e.g. "sess_abc123", "run_def456").
 */
import { randomUUID } from "node:crypto";

/**
 * Generate a unique ID string.
 * With prefix: `${prefix}_${uuid}` (e.g. "sess_550e8400-e29b-41d4-a716-446655440000")
 * Without prefix: bare UUID.
 */
export function createId(prefix?: string): string {
  const id = randomUUID();
  return prefix ? `${prefix}_${id}` : id;
}
