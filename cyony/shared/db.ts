/**
 * @tripp-reason/store — database initialization
 *
 * Opens or creates a SQLite database file, wraps it with Drizzle,
 * runs the schema migration, and returns the db instance.
 *
 * Features:
 * - PRAGMA foreign_keys = ON is enabled on every connection.
 * - PRAGMA journal_mode = WAL is set for concurrent read performance.
 * - Schema is applied via CREATE TABLE IF NOT EXISTS (idempotent).
 *
 * Future Phase 2+ considerations:
 * - Swap better-sqlite3 for @libsql/client for remote/async support.
 * - Add drizzle-kit migration journal when schema evolution begins.
 */
import Database from "better-sqlite3";
import { drizzle } from "drizzle-orm/better-sqlite3";
import type { BetterSQLite3Database } from "drizzle-orm/better-sqlite3";
import * as schema from "./schema.js";
import { INDEX_DDL } from "./schema.js";

export type TrippDb = BetterSQLite3Database<typeof schema>;

/**
 * Initialize the Tripp.Reason store.
 * - Opens/creates the SQLite file at `dbPath`
 * - Enables foreign keys and WAL journal mode
 * - Creates tables and indexes idempotently
 * - Returns a Drizzle-wrapped db instance
 *
 * Pass `:memory:` for in-memory databases (useful for tests).
 */
export function initDb(dbPath: string): TrippDb {
  const client = new Database(dbPath);

  // Referential integrity (off by default in SQLite).
  client.pragma("foreign_keys = ON");
  // WAL mode is faster for concurrent readers; falls back silently
  // if not supported (e.g., :memory:).
  client.pragma("journal_mode = WAL");

  // Apply schema. Drizzle's SQLite builder exposes toTableConfig()
  // but we use a minimal explicit DDL for Phase 1: direct SQL
  // with CREATE TABLE IF NOT EXISTS. This is idempotent and needs
  // no migration journal.
  const tableDdl = `
    CREATE TABLE IF NOT EXISTS sessions (
      id         TEXT PRIMARY KEY,
      title      TEXT NOT NULL,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL,
      status     TEXT NOT NULL,
      provider   TEXT NOT NULL,
      model      TEXT NOT NULL,
      mode       TEXT
    );

    CREATE TABLE IF NOT EXISTS runs (
      id            TEXT PRIMARY KEY,
      session_id    TEXT NOT NULL REFERENCES sessions(id) ON DELETE CASCADE,
      status        TEXT NOT NULL,
      started_at    TEXT NOT NULL,
      completed_at  TEXT
    );

    CREATE TABLE IF NOT EXISTS messages (
      id          TEXT PRIMARY KEY,
      session_id  TEXT NOT NULL REFERENCES sessions(id) ON DELETE CASCADE,
      run_id      TEXT NOT NULL REFERENCES runs(id) ON DELETE CASCADE,
      role        TEXT NOT NULL,
      content     TEXT NOT NULL,
      created_at  TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS events (
      id           TEXT PRIMARY KEY,
      session_id   TEXT NOT NULL REFERENCES sessions(id) ON DELETE CASCADE,
      run_id       TEXT NOT NULL REFERENCES runs(id) ON DELETE CASCADE,
      type         TEXT NOT NULL,
      payload_json TEXT NOT NULL,
      created_at   TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS tool_calls (
      id           TEXT PRIMARY KEY,
      session_id   TEXT NOT NULL REFERENCES sessions(id) ON DELETE CASCADE,
      run_id       TEXT NOT NULL REFERENCES runs(id) ON DELETE CASCADE,
      tool_name    TEXT NOT NULL,
      args_json    TEXT NOT NULL,
      result_json  TEXT,
      status       TEXT NOT NULL,
      created_at   TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS approvals (
      id            TEXT PRIMARY KEY,
      session_id    TEXT NOT NULL REFERENCES sessions(id) ON DELETE CASCADE,
      run_id        TEXT NOT NULL REFERENCES runs(id) ON DELETE CASCADE,
      tool_call_id  TEXT NOT NULL REFERENCES tool_calls(id) ON DELETE CASCADE,
      status        TEXT NOT NULL,
      reason        TEXT,
      created_at    TEXT NOT NULL,
      resolved_at   TEXT
    );

    CREATE TABLE IF NOT EXISTS reports (
      id          TEXT PRIMARY KEY,
      session_id  TEXT NOT NULL REFERENCES sessions(id) ON DELETE CASCADE,
      run_id      TEXT NOT NULL REFERENCES runs(id) ON DELETE CASCADE,
      path        TEXT NOT NULL,
      summary     TEXT NOT NULL,
      created_at  TEXT NOT NULL
    );
  `;
  client.exec(tableDdl);
  for (const ddl of INDEX_DDL) {
    client.exec(ddl);
  }

  return drizzle(client, { schema });
}
