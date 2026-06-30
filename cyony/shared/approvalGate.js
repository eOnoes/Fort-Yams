import { ApprovalDeniedError } from "./errors.js";
/**
 * Create an ApprovalGate that routes requests through risk-level classification.
 */
export function createApprovalGate(options) {
    const { approver, throwOnDenial = true } = options;
    async function check(request) {
        const { riskLevel } = request;
        // Safe operations are auto-approved without calling the approver.
        if (riskLevel === "safe") {
            return { approved: true, reason: "auto-approved (safe)" };
        }
        // Mutating and destructive operations go through the approver.
        const result = await approver.requestApproval(request);
        if (!result.approved && throwOnDenial) {
            throw new ApprovalDeniedError(request.toolName, result.reason);
        }
        return result;
    }
    return { check };
}
//# sourceMappingURL=approvalGate.js.map