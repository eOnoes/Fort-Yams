/**
 * @tripp-reason/store — repository functions
 *
 * CRUD operations mapped to the Drizzle schema. Each repository
 * group accepts and returns shared Zod-derived types. JSON boundaries
 * are enforced at the repository layer: callers pass JS objects,
 * this module serializes/parses for SQLite TEXT columns.
 *
 * Factory pattern: `createRepositories(db)` binds all repositories to
 * a single db instance so core/cli never holds the db directly.
 *
 * Conventions:
 * - getXxx(id) returns Promise<Xxx | null>  (null = not found, not error)
 * - listXxxBy... returns Promise<Xxx[]>   (empty array if none)
 * - createXxx(input) returns Promise<Xxx> (the created record as-is)
 * - update/delete operations return Promise<Xxx | null>  (null = not found)
 *
 * IDs: caller-provided (core generates UUIDv7).
 * Timestamps: caller-provided (ISO 8601), except where the helper
 * defaults to `new Date().toISOString()` for completion timestamps.
 */
import { eq } from "drizzle-orm";
import * as schema from "./schema.js";
// ── JSON boundary helpers ───────────────────────────────────────────
// Serialize any JSON-safe value to string; preserve null for nullable
// columns. Parse is the reverse. Unknown values are acceptable (Drizzle
// rows hold string for JSON columns; we convert to unknown).
function jsonStringify(value) {
    return JSON.stringify(value ?? null);
}
function jsonParse(value) {
    if (value === null)
        return null;
    try {
        return JSON.parse(value);
    }
    catch {
        // Corrupted JSON in DB — surface as-is to caller so the error
        // becomes visible; do not silently swallow.
        return value;
    }
}
function sessionRowToShared(row) {
    return {
        id: row.id,
        title: row.title,
        created_at: row.created_at,
        updated_at: row.updated_at,
        status: row.status,
        provider: row.provider,
        model: row.model,
        mode: row.mode ?? undefined,
    };
}
function runRowToShared(row) {
    return {
        id: row.id,
        session_id: row.session_id,
        status: row.status,
        started_at: row.started_at,
        completed_at: row.completed_at ?? undefined,
    };
}
function messageRowToShared(row) {
    return {
        id: row.id,
        session_id: row.session_id,
        run_id: row.run_id,
        role: row.role,
        content: row.content,
        created_at: row.created_at,
    };
}
function eventRowToShared(row) {
    return {
        id: row.id,
        session_id: row.session_id,
        run_id: row.run_id,
        type: row.type,
        payload: jsonParse(row.payload_json),
        created_at: row.created_at,
    };
}
function toolCallRowToShared(row) {
    return {
        id: row.id,
        session_id: row.session_id,
        run_id: row.run_id,
        tool_name: row.tool_name,
        args: jsonParse(row.args_json),
        result: row.result_json === null ? undefined : jsonParse(row.result_json),
        status: row.status,
        created_at: row.created_at,
    };
}
function approvalRowToShared(row) {
    return {
        id: row.id,
        session_id: row.session_id,
        run_id: row.run_id,
        tool_call_id: row.tool_call_id,
        status: row.status,
        reason: row.reason ?? undefined,
        created_at: row.created_at,
        resolved_at: row.resolved_at ?? undefined,
    };
}
function reportRowToShared(row) {
    return { ...row };
}
// ── Input shape for createSession (exclude timestamps? No — caller provides all) ─
// Per the Phase 1A contract, all shared schemas include timestamps.
// The repository is a dumb store; core supplies everything.
/**
 * Create a set of repository functions bound to the given db.
 */
export function createRepositories(db) {
    // ── Session repository ────────────────────────────────────────────
    async function createSession(input) {
        await db.insert(schema.sessions).values({
            id: input.id,
            title: input.title,
            created_at: input.created_at,
            updated_at: input.updated_at,
            status: input.status,
            provider: input.provider,
            model: input.model,
            mode: input.mode ?? null,
        }).run();
        return input;
    }
    async function getSession(id) {
        const row = db
            .select()
            .from(schema.sessions)
            .where(eq(schema.sessions.id, id))
            .get();
        return row ? sessionRowToShared(row) : null;
    }
    async function listSessions() {
        const rows = db.select().from(schema.sessions).all();
        return rows.map(sessionRowToShared);
    }
    // ── Run repository ────────────────────────────────────────────────
    async function createRun(input) {
        await db.insert(schema.runs).values({
            id: input.id,
            session_id: input.session_id,
            status: input.status,
            started_at: input.started_at,
            completed_at: input.completed_at ?? null,
        }).run();
        return input;
    }
    async function getRun(id) {
        const row = db
            .select()
            .from(schema.runs)
            .where(eq(schema.runs.id, id))
            .get();
        return row ? runRowToShared(row) : null;
    }
    // ── Run update (completeRun uses same cast pattern) ────────────────
    async function completeRun(id, status, completedAt) {
        const timestamp = completedAt ?? new Date().toISOString();
        await db
            .update(schema.runs)
            .set({
            status,
            completed_at: timestamp,
        })
            .where(eq(schema.runs.id, id))
            .run();
        return getRun(id);
    }
    // ── Message repository ────────────────────────────────────────────
    async function createMessage(input) {
        await db.insert(schema.messages).values({
            id: input.id,
            session_id: input.session_id,
            run_id: input.run_id,
            role: input.role,
            content: input.content,
            created_at: input.created_at,
        }).run();
        return input;
    }
    async function listMessagesBySession(sessionId) {
        const rows = db
            .select()
            .from(schema.messages)
            .where(eq(schema.messages.session_id, sessionId))
            .orderBy(schema.messages.created_at)
            .all();
        return rows.map(messageRowToShared);
    }
    async function listMessagesByRun(runId) {
        const rows = db
            .select()
            .from(schema.messages)
            .where(eq(schema.messages.run_id, runId))
            .orderBy(schema.messages.created_at)
            .all();
        return rows.map(messageRowToShared);
    }
    // ── Event repository ──────────────────────────────────────────────
    async function createEvent(input) {
        await db.insert(schema.events).values({
            id: input.id,
            session_id: input.session_id,
            run_id: input.run_id,
            type: input.type,
            payload_json: jsonStringify(input.payload),
            created_at: input.created_at,
        }).run();
        return input;
    }
    async function listEventsByRun(runId) {
        const rows = db
            .select()
            .from(schema.events)
            .where(eq(schema.events.run_id, runId))
            .orderBy(schema.events.created_at)
            .all();
        return rows.map(eventRowToShared);
    }
    // ── ToolCall repository ───────────────────────────────────────────
    async function createToolCall(input) {
        await db.insert(schema.tool_calls).values({
            id: input.id,
            session_id: input.session_id,
            run_id: input.run_id,
            tool_name: input.tool_name,
            args_json: jsonStringify(input.args),
            result_json: input.result === undefined || input.result === null
                ? null
                : jsonStringify(input.result),
            status: input.status,
            created_at: input.created_at,
        }).run();
        return input;
    }
    async function updateToolCallResult(id, result, status) {
        await db
            .update(schema.tool_calls)
            .set({
            result_json: result === null ? null : jsonStringify(result),
            status,
        })
            .where(eq(schema.tool_calls.id, id))
            .run();
        const row = db
            .select()
            .from(schema.tool_calls)
            .where(eq(schema.tool_calls.id, id))
            .get();
        return row ? toolCallRowToShared(row) : null;
    }
    async function listToolCallsByRun(runId) {
        const rows = db
            .select()
            .from(schema.tool_calls)
            .where(eq(schema.tool_calls.run_id, runId))
            .orderBy(schema.tool_calls.created_at)
            .all();
        return rows.map(toolCallRowToShared);
    }
    // ── Approval repository ───────────────────────────────────────────
    async function createApproval(input) {
        await db.insert(schema.approvals).values({
            id: input.id,
            session_id: input.session_id,
            run_id: input.run_id,
            tool_call_id: input.tool_call_id,
            status: input.status,
            reason: input.reason ?? null,
            created_at: input.created_at,
            resolved_at: input.resolved_at ?? null,
        }).run();
        return input;
    }
    async function resolveApproval(id, status, reason, resolvedAt) {
        const timestamp = resolvedAt ?? new Date().toISOString();
        await db
            .update(schema.approvals)
            .set({
            status,
            reason: reason ?? null,
            resolved_at: timestamp,
        })
            .where(eq(schema.approvals.id, id))
            .run();
        const row = db
            .select()
            .from(schema.approvals)
            .where(eq(schema.approvals.id, id))
            .get();
        return row ? approvalRowToShared(row) : null;
    }
    async function listApprovalsByRun(runId) {
        const rows = db
            .select()
            .from(schema.approvals)
            .where(eq(schema.approvals.run_id, runId))
            .orderBy(schema.approvals.created_at)
            .all();
        return rows.map(approvalRowToShared);
    }
    // ── Report repository ─────────────────────────────────────────────
    async function createReportRecord(input) {
        await db.insert(schema.reports).values({
            id: input.id,
            session_id: input.session_id,
            run_id: input.run_id,
            path: input.path,
            summary: input.summary,
            created_at: input.created_at,
        }).run();
        return input;
    }
    async function getReportByRun(runId) {
        const row = db
            .select()
            .from(schema.reports)
            .where(eq(schema.reports.run_id, runId))
            .get();
        return row ? reportRowToShared(row) : null;
    }
    async function listReportsBySession(sessionId) {
        const rows = db
            .select()
            .from(schema.reports)
            .where(eq(schema.reports.session_id, sessionId))
            .orderBy(schema.reports.created_at)
            .all();
        return rows.map(reportRowToShared);
    }
    // ── Bound API ─────────────────────────────────────────────────────
    return {
        createSession,
        getSession,
        listSessions,
        createRun,
        getRun,
        completeRun,
        createMessage,
        listMessagesBySession,
        listMessagesByRun,
        createEvent,
        listEventsByRun,
        createToolCall,
        updateToolCallResult,
        listToolCallsByRun,
        createApproval,
        resolveApproval,
        listApprovalsByRun,
        createReportRecord,
        getReportByRun,
        listReportsBySession,
    };
}
//# sourceMappingURL=repositories.js.map