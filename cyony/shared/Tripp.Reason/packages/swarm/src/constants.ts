/**
 * @tripp-reason/swarm — constants
 *
 * Worker caps, approval thresholds, timeouts, and limits per the
 * DOCTRINE.md Swarm Restraint Rule.
 */
import type { SwarmMode } from "./types.js";

// ── Worker Caps ──────────────────────────────────────────────────────
export const SOLO_MAX_WORKERS = 1;
export const SMALL_MIN_WORKERS = 3;
export const SMALL_MAX_WORKERS = 5;
export const MEDIUM_MIN_WORKERS = 6;
export const MEDIUM_MAX_WORKERS = 10;
export const LARGE_MIN_WORKERS = 11;
export const LARGE_MAX_WORKERS = 20;
export const ABSOLUTE_MAX_WORKERS = 25;
export const DEFAULT_INITIAL_SWARM_MAX = 3;

// ── Approval Thresholds ──────────────────────────────────────────────
/** Modes that require operator approval before worker spawn. */
export const APPROVAL_REQUIRED_MODES: SwarmMode[] = ["medium", "large", "max"];

/** Max mode requires manual approval in addition to gate check. */
export const MANUAL_APPROVAL_MODES: SwarmMode[] = ["max"];

// ── Timeout Defaults ─────────────────────────────────────────────────
export const DEFAULT_WORKER_TIMEOUT_MS = 120_000; // 2 minutes
export const MAX_WORKER_TIMEOUT_MS = 600_000; // 10 minutes
export const PLANNER_TIMEOUT_MS = 60_000; // 1 minute

// ── Packet Limits ────────────────────────────────────────────────────
export const MAX_TASK_PACKETS = 25;
export const MAX_FINDINGS_PER_RESULT = 200;
export const MAX_TOOL_CALLS_PER_RESULT = 500;
export const MAX_PROPOSED_CHANGES_PER_RESULT = 100;

// ── Summary Field Caps ───────────────────────────────────────────────
export const SUMMARY_MAX_CHARS = 2000;
export const OBJECTIVE_MAX_CHARS = 2000;
export const SCOPE_MAX_CHARS = 2000;
export const VALIDATION_MAX_CHARS = 2000;
export const RECOMMENDATION_MAX_CHARS = 2000;
export const REASONING_MAX_CHARS = 2000;
