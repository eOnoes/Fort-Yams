/**
 * @tripp-reason/store — Drizzle schema
 *
 * SQLite table definitions for Tripp.Reason Phase 1 persistence.
 * These tables map 1:1 to the shared Zod schemas.
 *
 * Property naming convention: snake_case on both JS side and DB column
 * side, matching the shared Zod schemas exactly. This means Drizzle
 * query results can be returned to callers as shared types without
 * any key-mapping layer.
 *
 * Timestamps: TEXT columns holding ISO 8601 datetime strings.
 * JSON payloads: TEXT columns holding JSON.stringify'd values.
 * IDs: TEXT primary keys (UUIDv7 expected at creation time by core).
 *
 * No Drizzle relations API used in Phase 1 — repository functions
 * do single-table CRUD. Cross-table joins can be added in Phase 2+
 * if needed.
 */
import { sqliteTable, text } from "drizzle-orm/sqlite-core";

// ── Sessions ────────────────────────────────────────────────────────
export const sessions = sqliteTable("sessions", {
  id: text("id").primaryKey(),
  title: text("title").notNull(),
  created_at: text("created_at").notNull(),
  updated_at: text("updated_at").notNull(),
  status: text("status").notNull(),
  provider: text("provider").notNull(),
  model: text("model").notNull(),
  mode: text("mode"),
});

// ── Runs ────────────────────────────────────────────────────────────
export const runs = sqliteTable("runs", {
  id: text("id").primaryKey(),
  session_id: text("session_id")
    .notNull()
    .references(() => sessions.id, { onDelete: "cascade" }),
  status: text("status").notNull(),
  started_at: text("started_at").notNull(),
  completed_at: text("completed_at"),
});

// ── Messages ────────────────────────────────────────────────────────
export const messages = sqliteTable("messages", {
  id: text("id").primaryKey(),
  session_id: text("session_id")
    .notNull()
    .references(() => sessions.id, { onDelete: "cascade" }),
  run_id: text("run_id")
    .notNull()
    .references(() => runs.id, { onDelete: "cascade" }),
  role: text("role").notNull(),
  content: text("content").notNull(),
  created_at: text("created_at").notNull(),
});

// ── Events ──────────────────────────────────────────────────────────
export const events = sqliteTable("events", {
  id: text("id").primaryKey(),
  session_id: text("session_id")
    .notNull()
    .references(() => sessions.id, { onDelete: "cascade" }),
  run_id: text("run_id")
    .notNull()
    .references(() => runs.id, { onDelete: "cascade" }),
  type: text("type").notNull(),
  payload_json: text("payload_json").notNull(),
  created_at: text("created_at").notNull(),
});

// ── Tool Calls ──────────────────────────────────────────────────────
export const tool_calls = sqliteTable("tool_calls", {
  id: text("id").primaryKey(),
  session_id: text("session_id")
    .notNull()
    .references(() => sessions.id, { onDelete: "cascade" }),
  run_id: text("run_id")
    .notNull()
    .references(() => runs.id, { onDelete: "cascade" }),
  tool_name: text("tool_name").notNull(),
  args_json: text("args_json").notNull(),
  result_json: text("result_json"),
  status: text("status").notNull(),
  created_at: text("created_at").notNull(),
});

// ── Approvals ───────────────────────────────────────────────────────
export const approvals = sqliteTable("approvals", {
  id: text("id").primaryKey(),
  session_id: text("session_id")
    .notNull()
    .references(() => sessions.id, { onDelete: "cascade" }),
  run_id: text("run_id")
    .notNull()
    .references(() => runs.id, { onDelete: "cascade" }),
  tool_call_id: text("tool_call_id")
    .notNull()
    .references(() => tool_calls.id, { onDelete: "cascade" }),
  status: text("status").notNull(),
  reason: text("reason"),
  created_at: text("created_at").notNull(),
  resolved_at: text("resolved_at"),
});

// ── Reports ─────────────────────────────────────────────────────────
export const reports = sqliteTable("reports", {
  id: text("id").primaryKey(),
  session_id: text("session_id")
    .notNull()
    .references(() => sessions.id, { onDelete: "cascade" }),
  run_id: text("run_id")
    .notNull()
    .references(() => runs.id, { onDelete: "cascade" }),
  path: text("path").notNull(),
  summary: text("summary").notNull(),
  created_at: text("created_at").notNull(),
});

// ── Index DDL (applied in migrate.ts for re-runnable init) ─────────
export const INDEX_DDL = [
  "CREATE INDEX IF NOT EXISTS runs_session_id_idx ON runs (session_id);",
  "CREATE INDEX IF NOT EXISTS messages_session_id_idx ON messages (session_id);",
  "CREATE INDEX IF NOT EXISTS messages_run_id_idx ON messages (run_id);",
  "CREATE INDEX IF NOT EXISTS events_session_id_idx ON events (session_id);",
  "CREATE INDEX IF NOT EXISTS events_run_id_idx ON events (run_id);",
  "CREATE INDEX IF NOT EXISTS tool_calls_session_id_idx ON tool_calls (session_id);",
  "CREATE INDEX IF NOT EXISTS tool_calls_run_id_idx ON tool_calls (run_id);",
  "CREATE INDEX IF NOT EXISTS tool_calls_tool_name_idx ON tool_calls (tool_name);",
  "CREATE INDEX IF NOT EXISTS approvals_session_id_idx ON approvals (session_id);",
  "CREATE INDEX IF NOT EXISTS approvals_run_id_idx ON approvals (run_id);",
  "CREATE INDEX IF NOT EXISTS approvals_tool_call_id_idx ON approvals (tool_call_id);",
  "CREATE INDEX IF NOT EXISTS reports_session_id_idx ON reports (session_id);",
  "CREATE INDEX IF NOT EXISTS reports_run_id_idx ON reports (run_id);",
];
