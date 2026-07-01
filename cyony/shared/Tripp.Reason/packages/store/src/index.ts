/**
 * @tripp-reason/store — barrel export
 *
 * Public API surface for the Tripp.Reason persistence layer:
 * - initDb — opens/creates SQLite, applies schema, returns Drizzle db
 * - createRepositories — factory binding repos to a db instance
 * - reportPath / reportDir / reportsRoot — filesystem path helpers
 * - schema — exposed for advanced Drizzle queries (Phase 2+)
 * - Repositories — type alias for the bound repo API
 *
 * Dependencies:
 * - better-sqlite3 (SQLite driver)
 * - drizzle-orm (query builder)
 * - @tripp-reason/shared (all data shapes and interface types)
 *
 * Not importing from any other internal package.
 */
export { initDb, type TrippDb } from "./db.js";
export { createRepositories, type Repositories } from "./repositories.js";
export {
  reportPath,
  reportDir,
  reportsRoot,
} from "./reportPaths.js";

// Re-export schema for advanced callers (e.g. tests, migrations).
// Most consumers will not need this — use the repositories instead.
export * as schema from "./schema.js";
