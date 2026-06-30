/**
 * Phase 6B Smoke Test — Server Swarm + Reports APIs
 */

const http = await import("node:http");

const REPO = "/opt/data/shared/Tripp.Reason";

// Set env vars for test config
process.env.TRIPP_SERVER_HOST = "127.0.0.1";
process.env.TRIPP_SERVER_PORT = "13031";
process.env.TRIPP_DB_PATH = ":memory:";
process.env.TRIPP_OPENAI_COMPATIBLE_BASE_URL = "http://localhost:9999";
process.env.TRIPP_OPENAI_COMPATIBLE_API_KEY = "test-key";
process.env.TRIPP_MODEL = "test";
process.env.TRIPP_PROVIDER_NAME = "test";
process.env.TRIPP_WORKDIR = REPO;

// ── Dynamic imports ──────────────────────────────────────────────
const serverMod = await import(`${REPO}/packages/server/dist/server.js`);
const configMod = await import(`${REPO}/packages/server/dist/config.js`);

const config = configMod.loadConfig();

let passed = 0;
let failed = 0;

function assert(condition, label) {
  if (condition) { console.log(`✅ ${label}`); passed++; }
  else { console.error(`❌ ${label}`); failed++; }
}

async function fetchAPI(path, opts = {}) {
  return new Promise((resolve, reject) => {
    const url = `http://127.0.0.1:13031${path}`;
    const req = http.request(url, { method: opts.method || "GET", timeout: 5000, ...opts }, (res) => {
      let data = "";
      res.on("data", (chunk) => data += chunk);
      res.on("end", () => {
        try { resolve({ status: res.statusCode, body: JSON.parse(data) }); }
        catch { resolve({ status: res.statusCode, body: data }); }
      });
    });
    req.on("error", (err) => reject(err));
    if (opts.body) req.write(JSON.stringify(opts.body));
    req.end();
  });
}

async function main() {
  console.log("\n═══════════════════════════════════════");
  console.log("  Phase 6B Smoke Test — Swarm + Reports APIs");
  console.log("═══════════════════════════════════════");

  let app;
  try {
    console.log("\n⏳ Starting test server...");
    // startServer blocks, so just create and listen manually
    const created = await serverMod.createServer(config);
    app = created.app;
    await app.listen({ host: "127.0.0.1", port: 13031 });
    console.log("✅ Server started\n");
  } catch (err) {
    console.error("❌ Server startup failed:", err.message);
    process.exit(1);
  }

  try {
    // TEST 1: GET /health still works
    let r = await fetchAPI("/health");
    assert(r.status === 200, "/health returns 200");
    assert(r.body.status === "ok", "/health shows status ok");

    // TEST 2: GET /swarms returns empty array
    r = await fetchAPI("/swarms");
    assert(r.status === 200, "GET /swarms returns 200");
    assert(Array.isArray(r.body.swarms), "GET /swarms returns array");
    assert(r.body.swarms.length === 0, "initial swarms list is empty");

    // TEST 3: GET /swarms/unknown returns 404
    r = await fetchAPI("/swarms/nonexistent");
    assert(r.status === 404, "GET /swarms/unknown returns 404");

    // TEST 4: POST /swarms/run with [single] prompt
    r = await fetchAPI("/swarms/run", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: { prompt: "[single] solo smoke test", mode: "solo" },
    });
    assert(r.status === 201, "POST /swarms/run [single] returns 201");
    assert(r.body.id, "response includes swarm id");
    assert(r.body.mode === "solo", "mode is solo");
    assert(r.body.status === "pass", "status is pass");
    const swarmId = r.body.id;

    // TEST 5: GET /swarms/:id returns detail
    r = await fetchAPI(`/swarms/${swarmId}`);
    assert(r.status === 200, "GET /swarms/:id returns 200");
    assert(r.body.id === swarmId, "detail has correct id");
    assert(r.body.operatorPrompt, "detail includes operatorPrompt");
    assert(r.body.taskPackets, "detail includes taskPackets");
    assert(r.body.wardenVerdict, "detail includes wardenVerdict");

    // TEST 6: GET /swarms now has 1 entry
    r = await fetchAPI("/swarms");
    assert(r.body.swarms.length >= 1, "swarms list now has entries");

    // TEST 7: POST /swarms/run [parallel] small
    r = await fetchAPI("/swarms/run", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: { prompt: "[parallel] small smoke test", mode: "small" },
    });
    assert(r.status === 201, "POST /swarms/run [parallel] returns 201");
    assert(r.body.mode === "small", "mode is small");
    assert(r.body.workerCount >= 1, "has worker count");

    // TEST 8: workers > 25 rejected
    r = await fetchAPI("/swarms/run", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: { prompt: "test", workers: 26 },
    });
    assert(r.status === 400, "workers > 25 returns 400");

    // TEST 9: medium mode rejected
    r = await fetchAPI("/swarms/run", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: { prompt: "test", mode: "medium" },
    });
    assert(r.status === 400, "medium mode returns 400 (requires approval)");

    // TEST 10: real mode rejected
    r = await fetchAPI("/swarms/run", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: { prompt: "test", real: true },
    });
    assert(r.status === 400, "real mode returns 400 (unsupported)");

    // TEST 11: Missing prompt rejected
    r = await fetchAPI("/swarms/run", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: {},
    });
    assert(r.status === 400, "missing prompt returns 400");

    // TEST 12: GET /reports returns array
    r = await fetchAPI("/reports");
    assert(r.status === 200, "GET /reports returns 200");
    assert(Array.isArray(r.body.reports), "reports is array");

    // TEST 13: GET /status includes swarm info
    r = await fetchAPI("/status");
    assert(r.status === 200, "GET /status returns 200");
    assert(r.body.swarmApiEnabled === true, "status shows swarmApiEnabled");
    assert(r.body.dashboardApiGapsClosed.includes("swarms"), "dashboardApiGapsClosed includes swarms");

    // TEST 14: Existing routes still work
    r = await fetchAPI("/tools");
    assert(r.status === 200, "GET /tools returns 200");
    assert(Array.isArray(r.body) || (r.body.tools && Array.isArray(r.body.tools)), "/tools returns tools");

    r = await fetchAPI("/sessions");
    assert(r.status === 200, "GET /sessions returns 200");

    console.log(`\n═══════════════════════════════════════`);
    console.log(`  ${passed} PASSED, ${failed} FAILED`);
    console.log(`═══════════════════════════════════════\n`);

  } finally {
    await app.close();
  }

  if (failed > 0) process.exit(1);
}

main().catch(err => { console.error(err); process.exit(1); });
