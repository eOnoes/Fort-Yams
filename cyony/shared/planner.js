/**
 * @tripp-reason/swarm — deterministic planner
 *
 * Converts an operator prompt into a SwarmRunPlan using keyword
 * detection. Phase 5D: no LLM, no provider calls. Keywords:
 * - "[single]" → solo plan (1 worker)
 * - "[parallel]" → small plan (3 workers)
 * - default → small 3-worker plan
 */
import { createId } from "./ids.js";
import { DEFAULT_WORKER_TIMEOUT_MS, SOLO_MAX_WORKERS, DEFAULT_INITIAL_SWARM_MAX, } from "./constants.js";
import { doesModeRequireApproval } from "./validation.js";
// ── Default role allocation for small plan ───────────────────────────
const SMALL_ROLES = ["researcher", "coder", "tester"];
/**
 * Create a deterministic SwarmRunPlan from an operator prompt.
 *
 * Keyword-driven for Phase 5D testing. Returns a plan with
 * dynamically-created SubagentSpecs, TaskPackets, and Assignments.
 */
export function createPlan(input) {
    const { operatorPrompt, workdir } = input;
    const lower = operatorPrompt.toLowerCase();
    const now = new Date().toISOString();
    const planId = createId("plan");
    // Determine mode and worker count
    let mode;
    let workerCount;
    let shouldParallelize;
    let roles;
    if (lower.includes("[single]")) {
        mode = "solo";
        workerCount = SOLO_MAX_WORKERS;
        shouldParallelize = false;
        roles = ["coder"];
    }
    else if (lower.includes("[parallel]")) {
        mode = "small";
        workerCount = DEFAULT_INITIAL_SWARM_MAX;
        shouldParallelize = true;
        roles = [...SMALL_ROLES];
    }
    else {
        mode = "small";
        workerCount = DEFAULT_INITIAL_SWARM_MAX;
        shouldParallelize = true;
        roles = [...SMALL_ROLES];
    }
    const approvalRequired = doesModeRequireApproval(mode);
    // Create subagents
    const subagents = roles.map((role, i) => ({
        id: createId(`sub-${role}`),
        name: `${capitalize(role)}_${i + 1}`,
        role,
        systemPrompt: buildSystemPrompt(role, operatorPrompt),
        modelTier: getDefaultTier(role),
        timeoutMs: DEFAULT_WORKER_TIMEOUT_MS,
        frozenBehavior: role !== "planner",
    }));
    // Create task packets
    const taskPackets = roles.map((role, i) => ({
        id: createId(`task-${role}`),
        role,
        title: `${capitalize(role)} task for: ${operatorPrompt.slice(0, 50)}`,
        objective: buildObjective(role, operatorPrompt),
        scope: workdir,
        modelTier: getDefaultTier(role),
        riskLevel: role === "coder" ? "mutating" : "safe",
        timeoutMs: DEFAULT_WORKER_TIMEOUT_MS,
        requiresApproval: role === "coder",
        expectedOutput: `Structured ResultPacket from ${role}`,
    }));
    // Create assignments (all in wave 0 for parallel, sequential for solo)
    const assignments = roles.map((_, i) => ({
        id: createId("asgn"),
        subagentId: subagents[i].id,
        taskPacketId: taskPackets[i].id,
        wave: shouldParallelize ? 0 : i,
        status: "pending",
    }));
    // Build dependency graph
    const dependencyGraph = {};
    for (const tp of taskPackets) {
        dependencyGraph[tp.id] = [];
    }
    // Orchestration decision
    const decision = {
        shouldParallelize,
        reason: shouldParallelize
            ? "Tasks are independent and can run concurrently"
            : "Single worker requested",
        workerCount,
        selectedMode: mode,
        assumptions: [
            `Deterministic planner — keyword-driven for Phase 5D`,
            `Roles: ${roles.join(", ")}`,
            `Mode: ${mode}, workers: ${workerCount}`,
        ],
    };
    // Detect risks
    const serialCollapseRisk = !shouldParallelize && roles.length > 1;
    const swarmSpamRisk = shouldParallelize && workerCount > taskPackets.length;
    return {
        id: planId,
        operatorPrompt,
        shouldParallelize,
        reasonForParallelism: decision.reason,
        selectedMode: mode,
        workerCount,
        subagents,
        taskPackets,
        assignments,
        dependencyGraph,
        approvalRequired,
        serialCollapseRisk,
        swarmSpamRisk,
        createdAt: now,
    };
}
// ── Helpers ──────────────────────────────────────────────────────────
function capitalize(s) {
    return s.charAt(0).toUpperCase() + s.slice(1);
}
function getDefaultTier(role) {
    switch (role) {
        case "planner":
        case "warden":
            return "Heavy Technical Thinking";
        case "coder":
        case "tester":
            return "Fast Technical Builder";
        case "reviewer":
            return "Code Review / Warden Pass";
        default:
            return "Budget Daily Driver";
    }
}
function buildSystemPrompt(role, prompt) {
    switch (role) {
        case "researcher":
            return `You are a research specialist. Search for information about: ${prompt.slice(0, 100)}. Return factual findings.`;
        case "coder":
            return `You are a coding specialist. Implement changes for: ${prompt.slice(0, 100)}. Write clean, tested code.`;
        case "tester":
            return `You are a testing specialist. Validate changes for: ${prompt.slice(0, 100)}. Report pass/fail and edge cases.`;
        case "reviewer":
            return `You are a code reviewer. Review changes for: ${prompt.slice(0, 100)}. Identify issues and suggest improvements.`;
        case "merger":
            return `You are a merge specialist. Consolidate results for: ${prompt.slice(0, 100)}. Detect and report conflicts.`;
        case "reporter":
            return `You are a report writer. Generate a summary for: ${prompt.slice(0, 100)}.`;
        case "warden":
            return `You are a safety warden. Review all changes for: ${prompt.slice(0, 100)}. Flag violations.`;
        default:
            return `Execute task: ${prompt.slice(0, 200)}`;
    }
}
function buildObjective(role, prompt) {
    const prefix = prompt.slice(0, 100);
    switch (role) {
        case "researcher":
            return `Research and gather information about: ${prefix}`;
        case "coder":
            return `Implement code changes for: ${prefix}`;
        case "tester":
            return `Test and validate changes for: ${prefix}`;
        default:
            return `${capitalize(role)} task: ${prefix}`;
    }
}
//# sourceMappingURL=planner.js.map