/**
 * Phase 5F Smoke Test — CLI Swarm Registration
 */

import { mkdir, rm } from "node:fs/promises";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { randomUUID } from "node:crypto";

const REPO = "/opt/data/shared/Tripp.Reason";
const CLI = `${REPO}/packages/cli/dist/index.js`;
const workdir = join(tmpdir(), `tripp-phase5f-smoke-${randomUUID()}`);

let passed = 0;
let failed = 0;

function assert(condition, label) {
  if (condition) { console.log(`✅ ${label}`); passed++; }
  else { console.error(`❌ ${label}`); failed++; }
}

// ── Helpers ──────────────────────────────────────────────────────────

async function runCli(args, opts = {}) {
  const { execSync } = await import("node:child_process");
  try {
    const cmd = `node ${CLI} ${args} 2>&1`;
    const result = execSync(cmd, { cwd: workdir, timeout: 15000, encoding: "utf8", ...opts });
    return { output: result, exitCode: 0 };
  } catch (err) {
    return { output: err.stdout || err.stderr || err.message, exitCode: err.status || 1 };
  }
}

// ── Setup ────────────────────────────────────────────────────────────

async function setup() {
  await mkdir(workdir, { recursive: true });
}

async function teardown() {
  await rm(workdir, { recursive: true, force: true }).catch(() => {});
}

// ═══════════════════════════════════════════════════════════════════════
async function main() {
  console.log("\n═══════════════════════════════════════");
  console.log("  Phase 5F Smoke Test");
  console.log("  CLI Swarm Registration");
  console.log("═══════════════════════════════════════");

  await setup();

  try {
    // TEST 1: --help works
    console.log("\n── CLI --help Tests ──\n");
    let r = await runCli("--help");
    assert(r.exitCode === 0, "tripp --help exits 0");
    assert(r.output.includes("swarm"), "--help includes 'swarm' command");

    r = await runCli("swarm --help");
    assert(r.exitCode === 0, "tripp swarm --help exits 0");
    assert(r.output.includes("run"), "tripp swarm --help includes 'run' subcommand");

    r = await runCli("swarm run --help");
    assert(r.exitCode === 0, "tripp swarm run --help exits 0");
    assert(r.output.includes("--fake"), "--help includes --fake flag");
    assert(r.output.includes("--real"), "--help includes --real flag");
    assert(r.output.includes("--mode"), "--help includes --mode flag");

    // TEST 2: Existing commands still work
    console.log("\n── Existing Commands ──\n");
    r = await runCli("run --help");
    assert(r.exitCode === 0, "tripp run --help still works");
    r = await runCli("serve --help");
    assert(r.exitCode === 0, "tripp serve --help still works");
    r = await runCli("chat --help");
    assert(r.exitCode === 0, "tripp chat --help still works");

    // TEST 3: Fake mode [parallel] prompt
    console.log("\n── Fake Swarm Tests ──\n");
    r = await runCli(`swarm run "[parallel] test fake swarm" --fake --workdir ${workdir}`);
    assert(r.exitCode === 0, "fake [parallel] swarm run exits 0");
    assert(r.output.includes("small"), "output includes mode 'small'");
    assert(r.output.includes("PASS") || r.output.includes("PASS"), "output includes PASS status");
    assert(r.output.includes("report"), "output includes report path");

    // TEST 4: Fake mode [single] prompt
    r = await runCli(`swarm run "[single] solo test" --fake --workdir ${workdir}`);
    assert(r.exitCode === 0, "fake [single] swarm run exits 0");
    assert(r.output.includes("solo"), "output includes 'solo' mode");

    // TEST 5: Worker count > 25 rejected
    console.log("\n── Worker Cap Tests ──\n");
    r = await runCli(`swarm run "test" --fake --mode large --workers 26 --workdir ${workdir}`);
    assert(r.exitCode !== 0, "workers > 25 rejected");
    assert(r.output.includes("25") || r.output.includes("exceed") || r.output.includes("maximum"),
      "error mentions cap");

    // TEST 6: Medium mode requires approval (denied by default)
    console.log("\n── Startup Approval Tests ──\n");
    // Medium mode requires approval — denied by default (non-TTY in test)
    r = await runCli(`swarm run "test" --fake --mode medium --deny-all --workdir ${workdir}`);
    assert(r.exitCode !== 0, "medium mode with --deny-all exits non-zero");

    // TEST 7: Solo mode does not require approval
    r = await runCli(`swarm run "[single] quick" --fake --mode solo --workdir ${workdir}`);
    assert(r.exitCode === 0, "solo mode runs without approval");

    // TEST 8: Report generated
    console.log("\n── Report Generation ──\n");
    r = await runCli(`swarm run "[single] report test" --fake --mode solo --workdir ${workdir}`);
    const reportMatch = r.output.match(/Report:\s*(.+\.md)/);
    assert(reportMatch !== null, "report path found in output");

    // TEST 9: Conflict scenario
    console.log("\n── Conflict Tests ──\n");
    // Default [parallel] with small mode should not conflict, but let's verify no crash
    r = await runCli(`swarm run "[parallel] conflict check" --fake --workdir ${workdir}`);
    assert(r.exitCode === 0, "parallel fake run completes");

    // TEST 10: --real without provider config fails controlled
    console.log("\n── Real Mode Tests ──\n");
    r = await runCli(`swarm run "test" --real --workdir ${workdir}`);
    assert(r.exitCode !== 0, "--real without config fails");
    assert(r.output.includes("not configured") || r.output.includes("missing") || r.output.includes("Missing required"),
      "error mentions missing config");

    // TEST 11: No server swarm endpoints
    console.log("\n── Boundary Checks ──\n");
    const { readFile } = await import("node:fs/promises");
    const serverPkg = JSON.parse(await readFile(`${REPO}/packages/server/package.json`, "utf8"));
    const serverDeps = Object.keys(serverPkg.dependencies || {});
    assert(!serverDeps.includes("@tripp-reason/swarm"), "server does NOT depend on swarm");

    const corePkg = JSON.parse(await readFile(`${REPO}/packages/core/package.json`, "utf8"));
    const coreDeps = Object.keys(corePkg.dependencies || {});
    assert(!coreDeps.includes("@tripp-reason/swarm"), "core does NOT depend on swarm");

    console.log(`\n═══════════════════════════════════════`);
    console.log(`  ${passed} PASSED, ${failed} FAILED`);
    console.log(`═══════════════════════════════════════\n`);

  } catch (err) {
    console.error("\n❌ UNEXPECTED ERROR:", err);
    failed++;
  } finally {
    await teardown();
  }

  if (failed > 0) process.exit(1);
}

main();
