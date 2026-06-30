import { McpClient } from "./client.js";
import { McpServerRegistry } from "./registry.js";
import { McpStartupError, } from "./errors.js";
let passed = 0;
let failed = 0;
const failures = [];
function assert(condition, label) {
    if (condition) {
        passed++;
    }
    else {
        failed++;
        failures.push(`FAIL: ${label}`);
    }
}
// ── Test 1: Mock server starts standalone ────────────────────────────
console.log("--- Test 1: Mock server starts over stdio ---");
const mockConfig = {
    id: "mock-echo",
    displayName: "Mock Echo MCP",
    command: "node",
    args: ["packages/mcp/dist/mockServer.js"],
    enabled: true,
};
const client = new McpClient({ config: mockConfig });
try {
    await client.connect(mockConfig);
    assert(client.isConnected, "1.1 Client connected successfully");
    console.log("  ✅ Client connected");
}
catch (err) {
    assert(false, "1.2 Client connect failed");
    console.error("  ❌ Connect failed:", err);
}
// ── Test 2: Tool discovery ───────────────────────────────────────────
console.log("\n--- Test 2: Tool discovery ---");
try {
    const tools = await client.discoverTools();
    assert(tools.length >= 2, `2.1 At least 2 tools found (got ${tools.length})`);
    console.log(`  Tools discovered: ${tools.length}`);
    for (const tool of tools) {
        console.log(`    - ${tool.namespacedName} (${tool.riskLevel}, approval=${tool.requiresApproval})`);
    }
    // ── Test 3: Namespaced names ──────────────────────────────────────
    const echo = tools.find((t) => t.toolName === "mock_echo");
    const mutate = tools.find((t) => t.toolName === "mock_mutate");
    assert(echo != null, "3.1 mock_echo tool found");
    if (echo) {
        assert(echo.namespacedName === "mcp.mock-echo.mock_echo", `3.2 Echo namespaced correctly: ${echo.namespacedName}`);
    }
    assert(mutate != null, "3.3 mock_mutate tool found");
    if (mutate) {
        assert(mutate.namespacedName === "mcp.mock-echo.mock_mutate", `3.4 Mutate namespaced correctly: ${mutate.namespacedName}`);
    }
    // ── Test 4: Risk classification ──────────────────────────────────
    if (echo) {
        assert(echo.requiresApproval === false, `4.1 Echo tool requiresApproval=false (got ${echo.requiresApproval})`);
        assert(echo.riskLevel === "safe", `4.2 Echo tool riskLevel=safe (got ${echo.riskLevel})`);
    }
    if (mutate) {
        assert(mutate.requiresApproval === true, `4.3 Mutate tool requiresApproval=true (got ${mutate.requiresApproval})`);
        assert(mutate.riskLevel === "destructive", `4.4 Mutate tool riskLevel=destructive (got ${mutate.riskLevel})`);
    }
}
catch (err) {
    assert(false, `2.x Tool discovery failed: ${err}`);
    console.error("  ❌ Discovery failed:", err);
}
// ── Test 5: Clean shutdown ───────────────────────────────────────────
console.log("\n--- Test 5: Client shutdown ---");
try {
    await client.disconnect();
    assert(!client.isConnected, "5.1 Client disconnected");
    console.log("  ✅ Client shut down cleanly");
}
catch (err) {
    assert(false, `5.2 Shutdown failed: ${err}`);
}
// ── Test 6: Disabled server blocks ───────────────────────────────────
console.log("\n--- Test 6: Disabled server blocks ---");
const disabledConfig = {
    id: "disabled-mock",
    displayName: "Disabled Mock",
    command: "node",
    args: ["packages/mcp/dist/mockServer.js"],
    enabled: false,
};
try {
    const disabledClient = new McpClient({ config: disabledConfig });
    await disabledClient.connect(disabledConfig);
    assert(false, "6.1 Disabled server should have thrown");
}
catch (err) {
    assert(err instanceof McpStartupError, `6.2 Disabled server throws McpStartupError: ${err}`);
    console.log("  ✅ Disabled server blocked correctly");
}
// ── Test 7: Registry disabled check ──────────────────────────────────
console.log("\n--- Test 7: Registry disabled check ---");
const registry = new McpServerRegistry();
registry.register(mockConfig);
registry.register(disabledConfig);
assert(registry.isEnabled("mock-echo"), "7.1 Enabled server returns true");
assert(!registry.isEnabled("disabled-mock"), "7.2 Disabled server returns false");
assert(registry.listEnabled().length === 1, "7.3 listEnabled() returns 1 server");
assert(registry.list().length === 2, "7.4 list() returns 2 servers");
// ── Test 8: Startup failure returns controlled error ─────────────────
console.log("\n--- Test 8: Startup failure returns controlled error ---");
const badConfig = {
    id: "bad-startup",
    displayName: "Bad Startup Mock",
    command: "node",
    args: ["nonexistent-script.js"],
    enabled: true,
    startupTimeoutMs: 2000,
};
try {
    const badClient = new McpClient({ config: badConfig });
    await badClient.connect(badConfig);
    assert(false, "8.1 Bad startup should have thrown");
}
catch (err) {
    assert(err instanceof Error, `8.2 Bad startup throws controlled error: ${err}`);
    console.log("  ✅ Startup failure handled");
}
// ── Summary ──────────────────────────────────────────────────────────
console.log(`\n===== RESULTS =====`);
console.log(`  PASS: ${passed}`);
console.log(`  FAIL: ${failed}`);
for (const f of failures) {
    console.log(`  ${f}`);
}
if (failed > 0) {
    process.exit(1);
}
//# sourceMappingURL=smokeTest.js.map