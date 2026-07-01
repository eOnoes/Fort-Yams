/**
 * @tripp-reason/core — timestamp helper
 *
 * Single point for "now" in ISO 8601 format.
 * All shared contracts expect z.string().datetime() — this delivers it.
 */

/** Current time as ISO 8601 datetime string. */
export function nowIso(): string {
  return new Date().toISOString();
}
