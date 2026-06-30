/**
 * CLI approval implementation
 *
 * Prompts the user in the terminal for tool approval.
 * Implements the shared Approver interface.
 * Default to deny on empty/invalid input or timeout.
 */
import { createInterface } from "node:readline";
export class CliApprover {
    async requestApproval(operation) {
        const rl = createInterface({
            input: process.stdin,
            output: process.stdout,
        });
        const prompt = `\n⚠️  Tool requires approval: ${operation.toolName} (risk: ${operation.riskLevel})\nArguments: ${JSON.stringify(operation.args, null, 2)}\n\nApprove? (y/N): `;
        return new Promise((resolve) => {
            rl.question(prompt, (answer) => {
                rl.close();
                const approved = answer.trim().toLowerCase() === "y";
                if (approved) {
                    resolve({ approved: true, reason: "CLI approved" });
                }
                else {
                    resolve({ approved: false, reason: "Denied by operator" });
                }
            });
            // Default to deny after 30 second timeout
            setTimeout(() => {
                rl.close();
                resolve({ approved: false, reason: "Timed out (default deny)" });
            }, 30000);
        });
    }
}
//# sourceMappingURL=approver.js.map