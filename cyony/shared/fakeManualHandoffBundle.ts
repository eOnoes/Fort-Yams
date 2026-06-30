/**
 * Stage 6O — Fake/Manual Operator Handoff Bundle Generator
 *
 * Packages a manifest snapshot into a static, self-contained,
 * read-only handoff bundle for operator (Eddie) or Echo consumption.
 *
 * NEVER: polls, watches, syncs, activates agents, mutates shared-bus,
 *        writes cross-project, or implies live behavior.
 */
import type { ManifestSnapshot } from "./fakeManualManifest.js";
import * as fs from "node:fs/promises";
import * as path from "node:path";

// ── Types ─────────────────────────────────────────────────────────────

export interface HandoffMetadata {
  handoff_version: string;
  generated_at: string;
  producer: string;
  producer_project: string;
  contract_classification: string;
  source_manifest_path: string;
  source_trace_path: string | null;
  mutation_capability: string;
  consumer_permissions: string[];
  consumer_forbidden_actions: string[];
  redaction_status: {
    redaction_applied: boolean;
    fields_redacted: number;
    secrets_stripped: number;
    prompts_truncated: number;
    redaction_rules: string[];
    safe_for_operator_review: boolean;
  };
  confidence_summary: {
    overall_level: string;
    packets_confirmed: number;
    packets_partial: number;
    packets_unknown: number;
    confidence_reason: string;
  };
  stale_state_summary: {
    is_stale: boolean;
    stale_reason: string | null;
    last_trace_event_at: string | null;
    recommended_refresh: string;
  };
  warnings_count: number;
  unknowns_count: number;
  recommended_next_marker: string;
  evidence_files: string[];
  notes: string;
}

export interface HandoffBundleResult {
  bundleDir: string;
  files: string[];
  metadata: HandoffMetadata;
}

// ── Constants ─────────────────────────────────────────────────────────

const HANDOFF_VERSION = "1.0.0";
const CONTRACT_CLASSIFICATION = "internal-fake-manual-only";
const MUTATION_CAPABILITY = "none";
const CONSUMER_PERMISSIONS = ["read", "inspect", "compare", "static-transfer"];
const CONSUMER_FORBIDDEN = [
  "live-dispatch",
  "bus-mutation",
  "agent-activation",
  "cross-project-write",
  "auto-polling",
  "public-api-promotion",
  "source-of-truth-inference",
];
const FORBIDDEN_SOURCE_MODES = ["live", "experimental_live", "cloud", "remote"];
const SECRET_VALUE_PATTERN = /sk-[a-zA-Z0-9]{20,}|Bearer\s+[a-zA-Z0-9_-]{20,}/;

// ── Validation ────────────────────────────────────────────────────────

function validateManifest(snapshot: ManifestSnapshot): void {
  // mutation_capability must be "none"
  if (snapshot.mutation_capability !== "none") {
    throw new Error(
      `Handoff rejected: mutation_capability is "${snapshot.mutation_capability}", must be "none"`,
    );
  }

  // source_mode must not imply live
  if (FORBIDDEN_SOURCE_MODES.includes(snapshot.source_mode)) {
    throw new Error(
      `Handoff rejected: source_mode "${snapshot.source_mode}" implies live behavior`,
    );
  }
}

function validateNoSecrets(content: string, label: string): void {
  if (SECRET_VALUE_PATTERN.test(content)) {
    throw new Error(`Handoff rejected: secret-like value found in ${label}`);
  }
}

function validateOutputPath(outputPath: string, workdir: string): void {
  const resolved = path.resolve(outputPath);
  const base = path.resolve(workdir);
  if (!resolved.startsWith(base)) {
    throw new Error(
      `Handoff rejected: output path "${outputPath}" is outside workdir "${workdir}"`,
    );
  }
}

// ── Handoff Bundle Generator ──────────────────────────────────────────

/**
 * Package a manifest snapshot into a static operator handoff bundle.
 *
 * Produces:
 *   handoff-bundle-<timestamp>/
 *   ├── manifest.json
 *   ├── manifest.md
 *   ├── handoff-summary.md
 *   ├── handoff-metadata.json
 *   └── README-OPERATOR-HANDOFF.md
 */
export async function packageHandoffBundle(
  snapshot: ManifestSnapshot,
  workdir?: string,
): Promise<HandoffBundleResult> {
  // Validate safety constraints
  validateManifest(snapshot);

  const base = workdir ? path.resolve(workdir) : process.cwd();
  const handoffDir = path.join(base, ".tripp", "agents", "handoff");
  await fs.mkdir(handoffDir, { recursive: true });

  const ts = snapshot.generated_at.replace(/[:.]/g, "-");
  const bundleDir = path.join(handoffDir, `handoff-bundle-${ts}`);
  await fs.mkdir(bundleDir, { recursive: true });
  validateOutputPath(bundleDir, base);

  // Build confidence summary
  const confidenceSummary = buildConfidenceSummary(snapshot);

  // Build metadata
  const metadata: HandoffMetadata = {
    handoff_version: HANDOFF_VERSION,
    generated_at: snapshot.generated_at,
    producer: snapshot.source,
    producer_project: "Tripp.Reason",
    contract_classification: CONTRACT_CLASSIFICATION,
    source_manifest_path: "manifest.json",
    source_trace_path: null,
    mutation_capability: MUTATION_CAPABILITY,
    consumer_permissions: CONSUMER_PERMISSIONS,
    consumer_forbidden_actions: CONSUMER_FORBIDDEN,
    redaction_status: {
      redaction_applied: snapshot.redaction_summary.fields_redacted > 0,
      fields_redacted: snapshot.redaction_summary.fields_redacted,
      secrets_stripped: snapshot.redaction_summary.secrets_stripped,
      prompts_truncated: snapshot.redaction_summary.prompts_truncated,
      redaction_rules: snapshot.redaction_summary.redaction_rules_applied,
      safe_for_operator_review: true,
    },
    confidence_summary: confidenceSummary,
    stale_state_summary: {
      is_stale: false,
      stale_reason: null,
      last_trace_event_at: snapshot.packets.length > 0
        ? snapshot.packets[snapshot.packets.length - 1].updated_at
        : null,
      recommended_refresh: "Re-run manifest generation for updated trace",
    },
    warnings_count: snapshot.warnings.length,
    unknowns_count: snapshot.unknowns.length,
    recommended_next_marker: "READY_FOR_OPERATOR_REVIEW",
    evidence_files: ["manifest.json", "manifest.md"],
    notes: "Generated by Tripp.Reason Stage 6O handoff bundle generator. Internal contract only.",
  };

  // Write manifest.json
  const manifestJsonPath = path.join(bundleDir, "manifest.json");
  const manifestJson = JSON.stringify(snapshot, null, 2);
  validateNoSecrets(manifestJson, "manifest.json");
  await fs.writeFile(manifestJsonPath, manifestJson, "utf-8");

  // Write manifest.md
  const manifestMdPath = path.join(bundleDir, "manifest.md");
  const manifestMd = buildManifestMarkdown(snapshot);
  validateNoSecrets(manifestMd, "manifest.md");
  await fs.writeFile(manifestMdPath, manifestMd, "utf-8");

  // Write handoff-summary.md
  const summaryMdPath = path.join(bundleDir, "handoff-summary.md");
  const summaryMd = buildHandoffSummary(snapshot, metadata);
  await fs.writeFile(summaryMdPath, summaryMd, "utf-8");

  // Write handoff-metadata.json
  const metadataJsonPath = path.join(bundleDir, "handoff-metadata.json");
  await fs.writeFile(metadataJsonPath, JSON.stringify(metadata, null, 2), "utf-8");

  // Write README-OPERATOR-HANDOFF.md
  const readmePath = path.join(bundleDir, "README-OPERATOR-HANDOFF.md");
  const readme = buildOperatorReadme(snapshot);
  await fs.writeFile(readmePath, readme, "utf-8");

  return {
    bundleDir,
    files: [
      manifestJsonPath,
      manifestMdPath,
      summaryMdPath,
      metadataJsonPath,
      readmePath,
    ],
    metadata,
  };
}

// ── Summary Builders ──────────────────────────────────────────────────

function buildConfidenceSummary(snapshot: ManifestSnapshot) {
  const confirmed = snapshot.packets.filter((p) => p.confidence_level === "confirmed").length;
  const partial = snapshot.packets.filter((p) => p.confidence_level === "partial-trace").length;
  const unknown = snapshot.packets.filter((p) => p.confidence_level === "unknown").length;

  return {
    overall_level: snapshot.confidence_level,
    packets_confirmed: confirmed,
    packets_partial: partial,
    packets_unknown: unknown,
    confidence_reason: snapshot.confidence_reason,
  };
}

function buildHandoffSummary(
  snapshot: ManifestSnapshot,
  metadata: HandoffMetadata,
): string {
  const completed = snapshot.packets.filter((p) => p.lifecycle_state === "completed").length;
  const denied = snapshot.packets.filter((p) => p.approval_state === "denied").length;
  const timeout = snapshot.packets.filter((p) => p.timeout_state === "timed_out").length;
  const rejected = snapshot.packets.filter((p) => p.rejection_state === "rejected").length;

  return [
    `# Tripp.Reason Fake/Manual Handoff — ${snapshot.generated_at}`,
    "",
    "## What This Is",
    "",
    "A static, read-only manifest generated from Tripp.Reason fake/manual runtime trace events.",
    "⚠️ This is NOT a live runtime state report.",
    "⚠️ This is NOT a source of truth for authorization.",
    "",
    "## Bundle Contents",
    "",
    "- `manifest.json` — Full manifest with all packet lifecycle states",
    "- `manifest.md` — Human-readable companion",
    "- `handoff-metadata.json` — Protocol metadata",
    "- `README-OPERATOR-HANDOFF.md` — Operator instructions",
    "",
    "## Quick Summary",
    "",
    `- **Packets:** ${snapshot.packet_count}`,
    `- **Confidence:** ${metadata.confidence_summary.overall_level} — ${metadata.confidence_summary.confidence_reason}`,
    `- **Completed:** ${completed} | **Denied:** ${denied} | **Timeout:** ${timeout} | **Rejected:** ${rejected}`,
    `- **Redactions:** ${metadata.redaction_status.fields_redacted} fields stripped`,
    `- **Warnings:** ${snapshot.warnings.length} | **Unknowns:** ${snapshot.unknowns.length}`,
    "",
    "## How to Read",
    "",
    "1. Open `manifest.md` for a human-readable summary",
    "2. Open `manifest.json` for the full structured data",
    "3. Check `handoff-metadata.json` for protocol details",
    "",
    "## Next Recommended Marker",
    "",
    metadata.recommended_next_marker,
    "",
    "## Important",
    "",
    "- Mutation capability: **none** — never use for authorization",
    "- This manifest is **internal to Tripp.Reason** — not a public API",
    "- Tripp.Reason ApprovalGate remains authoritative",
    "",
  ].join("\n");
}

function buildManifestMarkdown(snapshot: ManifestSnapshot): string {
  const lines = [
    `# Tripp.Reason Manifest — ${snapshot.generated_at}`,
    "",
    "## Summary",
    "",
    `- **Version:** ${snapshot.manifest_version}`,
    `- **Source:** ${snapshot.source} (${snapshot.source_mode})`,
    `- **Sync mode:** ${snapshot.sync_mode}`,
    `- **Mutation capability:** ${snapshot.mutation_capability}`,
    `- **Trace events:** ${snapshot.trace_event_count}`,
    `- **Packets:** ${snapshot.packet_count}`,
    `- **Confidence:** ${snapshot.confidence_level} — ${snapshot.confidence_reason}`,
    "",
    "## Packet Lifecycle",
    "",
    ...snapshot.packets.map((p) => [
      `### ${p.packet_id}`,
      "",
      `- **State:** ${p.lifecycle_state}`,
      `- **Approval:** ${p.approval_state}`,
      `- **Result:** ${p.result_state}`,
      `- **Rejection:** ${p.rejection_state ?? "none"}`,
      `- **Timeout:** ${p.timeout_state ?? "none"}`,
      `- **Owner:** ${p.owner_or_agent}`,
      `- **Confidence:** ${p.confidence_level} — ${p.confidence_reason}`,
      `- **Events:** ${p.source_event_ids.length}`,
      `- **Created:** ${p.created_at}`,
      `- **Updated:** ${p.updated_at}`,
      "",
    ]).flat(),
    "## Redaction",
    "",
    `- **Fields redacted:** ${snapshot.redaction_summary.fields_redacted}`,
    `- **Secrets stripped:** ${snapshot.redaction_summary.secrets_stripped}`,
    `- **Prompts truncated:** ${snapshot.redaction_summary.prompts_truncated}`,
    "",
    "---",
    "",
    "⚠️ This is a FAKE/MANUAL manifest. No live execution occurred.",
    "⚠️ Do not use for authorization decisions.",
    "⚠️ Tripp.Reason ApprovalGate remains authoritative.",
  ];
  return lines.join("\n");
}

function buildOperatorReadme(snapshot: ManifestSnapshot): string {
  return [
    "# Operator Handoff — README",
    "",
    `**Generated:** ${snapshot.generated_at}`,
    `**Producer:** Tripp.Reason (${snapshot.source}, ${snapshot.source_mode})`,
    "",
    "## What This Bundle Contains",
    "",
    "A static, self-contained, read-only manifest of Tripp.Reason fake/manual",
    "runtime trace events. This bundle is evidence only — it does NOT authorize",
    "mutation, does NOT imply live agent state, and does NOT represent",
    "cross-project readiness.",
    "",
    "## How to Use",
    "",
    "1. Read `handoff-summary.md` for a quick overview",
    "2. Read `manifest.md` for per-packet lifecycle details",
    "3. Read `manifest.json` for full structured data",
    "4. Check `handoff-metadata.json` for safety/redaction/confidence status",
    "",
    "## What You May Do",
    "",
    "- Open and inspect all files",
    "- Compare with other manifests",
    "- Paste markers/reports into operator workflows",
    "- Upload or transfer these static files",
    "- Share with Echo as operator-provided evidence",
    "",
    "## What You Must NOT Do",
    "",
    "- Treat this manifest as a live runtime state report",
    "- Use this manifest for authorization decisions",
    "- Mutate shared-agent-bus based on manifest content",
    "- Activate live agents based on manifest content",
    "- Write to Tripp.Control or Tripp.OS based on manifest content",
    "- Auto-poll or watch for manifest updates",
    "- Promote this internal contract to a public API",
    "",
    "## Contract Classification",
    "",
    `**${CONTRACT_CLASSIFICATION}**`,
    "",
    "This manifest is an internal Tripp.Reason artifact only.",
    "It is not a cross-project contract and not a public API.",
    "",
    "## Safety",
    "",
    `- **Mutation capability:** ${MUTATION_CAPABILITY}`,
    `- **Redactions applied:** ${snapshot.redaction_summary.fields_redacted}`,
    `- **Secrets stripped:** ${snapshot.redaction_summary.secrets_stripped}`,
    "",
    "---",
    "",
    "⚠️ FAKE/MANUAL MANIFEST ONLY. NO LIVE EXECUTION OCCURRED.",
  ].join("\n");
}
