/**
 * @tripp-reason/mcp — tool risk mapping
 *
 * Maps MCP risk classifications to approval decisions.
 * Safety-first: unknown/unclassified tools default to requiresApproval=true.
 */
import type { RiskLevel } from "@tripp-reason/shared";
/**
 * Determine whether a tool requires approval based on its risk level.
 *
 * Rules:
 * - safe → no approval
 * - mutating → approval required
 * - destructive → approval required
 * - anything else (unknown) → approval required (safety-first default)
 */
export declare function riskToRequiresApproval(riskLevel: RiskLevel | undefined): boolean;
/**
 * Map risk level to a human-readable label for display in prompts/logs.
 */
export declare function riskLabel(riskLevel: RiskLevel | undefined): string;
//# sourceMappingURL=toolRisk.d.ts.map