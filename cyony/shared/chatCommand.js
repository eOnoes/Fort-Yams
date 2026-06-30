/**
 * tripp chat command — interact with the Phase 3 server via HTTP/SSE.
 */
import { createServerClient } from "./serverClient.js";
import { parseSse } from "./sseClient.js";
import { watchApprovals } from "./httpApprovalPrompt.js";
import readline from "node:readline";
export async function executeChat(options) {
    const serverUrl = options.server ?? "http://127.0.0.1:3030";
    const client = createServerClient(serverUrl);
    // Health check
    try {
        const h = await client.health();
        console.log(`✅ Connected to Tripp.Reason server (${h.phase}, uptime ${(h.uptimeMs / 1000).toFixed(0)}s)`);
    }
    catch {
        console.error(`❌ Cannot reach server at ${serverUrl}. Start it with: tripp serve`);
        process.exit(1);
    }
    const approvalOpts = {
        approve: options.approve ?? false,
        denyAll: options.denyAll ?? false,
    };
    // Once mode: send one prompt and exit
    if (options.once) {
        await sendPrompt(client, options.once, options, approvalOpts);
        return;
    }
    // Interactive mode
    const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
    console.log("Type a prompt (or 'exit'/'quit' to stop).\n");
    const ask = () => new Promise(resolve => rl.question("> ", resolve));
    while (true) {
        const prompt = await ask();
        const trimmed = prompt.trim();
        if (trimmed === "exit" || trimmed === "quit" || trimmed === "") {
            if (trimmed === "")
                continue;
            break;
        }
        await sendPrompt(client, trimmed, options, approvalOpts);
    }
    rl.close();
    console.log("👋 Goodbye!");
}
async function sendPrompt(client, prompt, options, approvalOpts) {
    console.log(`\n💬 ${prompt}\n${"─".repeat(50)}`);
    const res = await client.postReply({
        prompt,
        sessionId: options.session,
        title: options.title,
        model: options.model,
        provider: options.provider,
        workdir: options.workdir,
    });
    if (!res.ok) {
        const err = await res.json().catch(() => ({ error: `HTTP ${res.status}` }));
        console.error(`❌ Server error: ${err.message ?? err.error ?? "unknown"}`);
        return;
    }
    // Start approval watcher in background
    const ac = new AbortController();
    const approvalDone = watchApprovals(client, approvalOpts, ac.signal);
    // Parse SSE stream
    let hadError = false;
    for await (const evt of parseSse(res.body)) {
        try {
            const data = JSON.parse(evt.data);
            switch (evt.event) {
                case "message":
                    process.stdout.write(data.content ?? "");
                    break;
                case "tool_request":
                    console.log(`\n🔧 ${data.tool}${data.requiresApproval ? " (needs approval)" : ""}`);
                    break;
                case "tool_result":
                    console.log(`   ${data.status === "ok" ? "✅" : "❌"} ${data.tool}`);
                    break;
                case "finish":
                    console.log(`\n\n✅ Run complete${data.reportPath ? ` — report: ${data.reportPath}` : ""}`);
                    break;
                case "error":
                    console.error(`\n❌ ${data.message}`);
                    if (!data.recoverable)
                        hadError = true;
                    break;
            }
        }
        catch {
            // Skip malformed SSE frames
        }
    }
    // Stop approval watcher
    ac.abort();
    await approvalDone;
    if (hadError) {
        console.log("\n⚠️  Run encountered errors.");
    }
    console.log(`\n${"─".repeat(50)}\n`);
}
//# sourceMappingURL=chatCommand.js.map