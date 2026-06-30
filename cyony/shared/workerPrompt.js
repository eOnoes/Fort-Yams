/**
 * @tripp-reason/swarm — worker prompt builder
 *
 * Builds a bounded system+user prompt for a ReasonLoop-backed worker
 * from a SubagentSpec + TaskPacket. No provider calls.
 * Phase 5E.
 */
/**
 * Build a bounded worker prompt from SubagentSpec + TaskPacket.
 *
 * The system prompt encodes the worker's role, scope, tool boundaries,
 * and frozen behavior rules. The user prompt is the task objective.
 */
export function buildWorkerPrompt(subagent, task) {
    const systemLines = [];
    // Role header
    systemLines.push(`You are ${subagent.name}, a ${task.role} worker in a bounded swarm orchestration.`);
    systemLines.push("");
    // Objective
    systemLines.push("## Objective");
    systemLines.push(task.objective);
    systemLines.push("");
    // Scope
    systemLines.push("## Scope");
    systemLines.push(`Operate within: ${task.scope}`);
    systemLines.push("");
    // File boundaries
    if (task.allowedFiles && task.allowedFiles.length > 0) {
        systemLines.push("## Allowed Files");
        for (const f of task.allowedFiles) {
            systemLines.push(`- ${f}`);
        }
        systemLines.push("");
    }
    if (task.forbiddenFiles && task.forbiddenFiles.length > 0) {
        systemLines.push("## Forbidden Files (do NOT access)");
        for (const f of task.forbiddenFiles) {
            systemLines.push(`- ${f}`);
        }
        systemLines.push("");
    }
    // Tool boundaries
    if (task.allowedTools && task.allowedTools.length > 0) {
        systemLines.push("## Allowed Tools");
        systemLines.push("You may ONLY use these tools:");
        for (const t of task.allowedTools) {
            systemLines.push(`- ${t}`);
        }
        systemLines.push("");
    }
    if (task.forbiddenTools && task.forbiddenTools.length > 0) {
        systemLines.push("## Forbidden Tools (do NOT call)");
        for (const t of task.forbiddenTools) {
            systemLines.push(`- ${t}`);
        }
        systemLines.push("");
    }
    // Frozen behavior rules
    systemLines.push("## Rules (MUST follow)");
    systemLines.push("- Do NOT spawn other workers or sub-agents.");
    systemLines.push("- Do NOT change your role. You are a " + task.role + " only.");
    systemLines.push("- Do NOT take actions outside your assigned scope.");
    systemLines.push("- Do NOT rewrite your system prompt.");
    systemLines.push("");
    // Expected output
    systemLines.push("## Expected Output");
    systemLines.push(task.expectedOutput);
    systemLines.push("");
    // Output format requirement
    systemLines.push("## Output Format (REQUIRED)");
    systemLines.push("You MUST produce output as a valid JSON object with this shape:");
    systemLines.push("```json");
    systemLines.push("{");
    systemLines.push('  "status": "pass" | "partial" | "fail",');
    systemLines.push('  "summary": "brief human-readable summary (max 2000 chars)",');
    systemLines.push('  "findings": [{"severity": "info|warning|critical", "message": "...", "source": "..."}],');
    systemLines.push('  "filesTouched": ["path/to/file"],');
    systemLines.push('  "toolCalls": [{"tool": "name", "status": "ok|error", "summary": "..."}],');
    systemLines.push('  "proposedChanges": [{"file": "path", "diff": "...", "reason": "..."}],');
    systemLines.push('  "validation": "self-validation notes",');
    systemLines.push('  "risks": [{"level": "low|medium|high", "description": "..."}],');
    systemLines.push('  "nextRecommendation": "what should happen next"');
    systemLines.push("}");
    systemLines.push("```");
    systemLines.push("");
    systemLines.push("The ENTIRE final response MUST be this JSON object. Include no other text.");
    systemLines.push("If you cannot complete the task, set status to 'partial' or 'fail'.");
    systemLines.push("");
    // System prompt from subagent spec (orchestrator-crafted)
    if (subagent.systemPrompt) {
        systemLines.push("## Orchestrator Instructions");
        systemLines.push(subagent.systemPrompt);
    }
    const systemPrompt = systemLines.join("\n").trim();
    const userPrompt = task.objective;
    return { systemPrompt, userPrompt };
}
/**
 * Combine system + user into a single prompt string for ReasonLoop.
 */
export function toReasonLoopPrompt(parts) {
    return `${parts.systemPrompt}\n\n---\n\n## Task\n\n${parts.userPrompt}`;
}
//# sourceMappingURL=workerPrompt.js.map