/** Poll /approvals and optionally prompt the terminal operator. */
import readline from "node:readline";
export async function watchApprovals(client, opts, signal) {
    const seen = new Set();
    const rl = opts.approve ? readline.createInterface({ input: process.stdin, output: process.stdout }) : undefined;
    while (!signal?.aborted) {
        try {
            const { approvals } = await client.getApprovals();
            for (const a of approvals) {
                if (a.status !== "pending" || seen.has(a.id))
                    continue;
                seen.add(a.id);
                console.log(`\n🔒 Approval needed: ${a.toolName} (${a.riskLevel})`);
                console.log(`   Args: ${a.argsSummary}`);
                console.log(`   ID: ${a.id}`);
                if (opts.denyAll) {
                    await client.resolveApproval(a.id, false, "Denied by CLI --deny-all");
                    console.log("   ❌ Auto-denied (--deny-all)\n");
                    continue;
                }
                if (opts.approve && rl) {
                    const answer = await new Promise((resolve) => {
                        rl.question("   Approve? [y/N]: ", resolve);
                    });
                    const approved = answer.trim().toLowerCase() === "y";
                    const reason = approved ? "Approved by operator" : "Denied by operator";
                    await client.resolveApproval(a.id, approved, reason);
                    console.log(`   ${approved ? "✅ Approved" : "❌ Denied"}\n`);
                }
                else {
                    console.log(`   ⏳ Waiting for approval via HTTP. Use:\n   curl -X POST ${client.serverUrl}/approvals/${a.id}/resolve -d '{"approved":true}'\n`);
                }
            }
        }
        catch {
            // Server may not have /approvals yet — skip
        }
        await new Promise(r => setTimeout(r, 500));
    }
    if (rl)
        rl.close();
}
//# sourceMappingURL=httpApprovalPrompt.js.map