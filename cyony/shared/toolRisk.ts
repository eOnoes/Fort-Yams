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
export function riskToRequiresApproval(riskLevel: RiskLevel | undefined): boolean {
  if (riskLevel === "safe") return false;
  // mutating, destructive, undefined → requires approval
  return true;
}

/**
 * Map risk level to a human-readable label for display in prompts/logs.
 */
export function riskLabel(riskLevel: RiskLevel | undefined): string {
  switch (riskLevel) {
    case "safe":
      return "safe (no approval)";
    case "mutating":
      return "mutating (approval required)";
    case "destructive":
      return "destructive (approval required)";
    default:
      return "unknown (approval required)";
  }
}
