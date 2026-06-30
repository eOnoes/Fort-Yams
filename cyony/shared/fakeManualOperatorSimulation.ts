/**
 * Stage 6S — Static Operator Packet Simulation
 *
 * Simulates how an operator (Eddie) receives, validates, classifies,
 * and accepts or rejects a static fake/manual handoff bundle.
 *
 * NEVER: polls, watches, syncs, activates agents, mutates shared-bus,
 *        writes cross-project, calls Echo/Codex/Kimi/Tripp, or
 *        implies live behavior.
 */
import type { HandoffMetadata } from "./fakeManualHandoffBundle.js";
import * as fs from "node:fs/promises";
import * as path from "node:path";

// ── Types ─────────────────────────────────────────────────────────────

export interface OperatorPacketSummary {
  packet_status: "accepted" | "rejected";
  decision: string;
  confidence_level: "high" | "medium" | "low" | "rejected";
  confidence_reason: string;
  recommended_next_marker: string;
  warnings: string[];
  unknowns: string[];
  redaction_status: {
    applied: boolean;
    secrets_stripped: number;
    safe_for_review: boolean;
  };
  consumer_forbidden_actions: string[];
  operator_notes: string;
}

export interface OperatorPacketResult {
  accepted: boolean;
  summary: OperatorPacketSummary;
  rejection_reason: string | null;
  metadata: HandoffMetadata | null;
  bundleDir: string;
}

// ── Constants ─────────────────────────────────────────────────────────

const REQUIRED_FILES = [
  "manifest.json",
  "manifest.md",
  "handoff-summary.md",
  "handoff-metadata.json",
  "README-OPERATOR-HANDOFF.md",
];

const FORBIDDEN_SOURCE_MODES = ["live", "experimental_live", "cloud", "remote"];
const SECRET_PATTERN = /sk-[a-zA-Z0-9]{20,}|Bearer\s+[a-zA-Z0-9_-]{20,}|ghp_[a-zA-Z0-9]{20,}/;

// ── Simulation ────────────────────────────────────────────────────────

/**
 * Simulate operator receiving and evaluating a static handoff bundle.
 *
 * Reads all five bundle files, validates metadata safeties,
 * classifies confidence, and produces an accept/reject decision
 * with a human-readable operator summary.
 */
export async function simulateOperatorHandoff(
  bundleDir: string,
): Promise<OperatorPacketResult> {
  const warnings: string[] = [];
  const unknowns: string[] = [];

  // ── Step 1: Validate bundle shape ──────────────────────────────────
  const missingFiles: string[] = [];
  for (const f of REQUIRED_FILES) {
    try {
      await fs.access(path.join(bundleDir, f));
    } catch {
      missingFiles.push(f);
    }
  }
  if (missingFiles.length > 0) {
    return reject(
      bundleDir,
      `Missing required files: ${missingFiles.join(", ")}`,
      null,
    );
  }

  // ── Step 2: Read metadata ──────────────────────────────────────────
  let metadata: HandoffMetadata;
  try {
    const metaRaw = await fs.readFile(
      path.join(bundleDir, "handoff-metadata.json"),
      "utf-8",
    );
    metadata = JSON.parse(metaRaw);
  } catch {
    return reject(bundleDir, "handoff-metadata.json is not valid JSON", null);
  }

  // ── Step 3: Validate contract classification ───────────────────────
  if (metadata.contract_classification !== "internal-fake-manual-only") {
    return reject(
      bundleDir,
      `Invalid contract_classification: "${metadata.contract_classification}" — must be "internal-fake-manual-only"`,
      metadata,
    );
  }

  // ── Step 4: Validate mutation capability ───────────────────────────
  if (metadata.mutation_capability !== "none") {
    return reject(
      bundleDir,
      `Invalid mutation_capability: "${metadata.mutation_capability}" — must be "none"`,
      metadata,
    );
  }

  // ── Step 5: Read manifest for source_mode ──────────────────────────
  let sourceMode: string;
  try {
    const manifestRaw = await fs.readFile(
      path.join(bundleDir, "manifest.json"),
      "utf-8",
    );
    const manifest = JSON.parse(manifestRaw);
    sourceMode = manifest.source_mode ?? "unknown";
  } catch {
    return reject(bundleDir, "manifest.json is not valid JSON", metadata);
  }

  if (FORBIDDEN_SOURCE_MODES.includes(sourceMode)) {
    return reject(
      bundleDir,
      `Invalid source_mode: "${sourceMode}" — implies live behavior`,
      metadata,
    );
  }

  // ── Step 6: Scan for secrets in all files ──────────────────────────
  for (const f of REQUIRED_FILES) {
    const content = await fs.readFile(path.join(bundleDir, f), "utf-8");
    if (SECRET_PATTERN.test(content)) {
      return reject(
        bundleDir,
        `Secret-like content found in ${f} — bundle rejected`,
        metadata,
      );
    }
  }

  // ── Step 7: Validate recommended_next_marker ───────────────────────
  if (!metadata.recommended_next_marker || metadata.recommended_next_marker.length === 0) {
    warnings.push("recommended_next_marker is empty — operator should request updated bundle");
  }

  // ── Step 8: Validate redaction status ──────────────────────────────
  const redaction = metadata.redaction_status;
  if (!redaction || redaction.safe_for_operator_review === false) {
    return reject(
      bundleDir,
      "Redaction status indicates bundle is not safe for operator review",
      metadata,
    );
  }

  if (redaction.secrets_stripped > 0) {
    warnings.push(
      `${redaction.secrets_stripped} secret(s) were redacted — verify no leakage in summary before sharing`,
    );
  }

  // ── Step 9: Classify confidence ────────────────────────────────────
  let confidenceLevel: "high" | "medium" | "low" | "rejected";
  let confidenceReason: string;

  const cs = metadata.confidence_summary;
  const ss = metadata.stale_state_summary;

  // Check for warnings/unknowns
  if (metadata.warnings_count > 0) {
    warnings.push(
      `${metadata.warnings_count} warning(s) in manifest — degraded confidence`,
    );
  }
  if (metadata.unknowns_count > 0) {
    unknowns.push(
      `${metadata.unknowns_count} unknown(s) in manifest — operator caution required`,
    );
  }

  // Check for stale state
  if (ss?.is_stale) {
    warnings.push(
      `Bundle state is stale — ${ss.stale_reason ?? "reason unknown"}. ${ss.recommended_refresh ?? ""}`,
    );
  }

  // Confidence classification
  if (cs.overall_level === "confirmed" && metadata.warnings_count === 0 && !ss?.is_stale) {
    confidenceLevel = "high";
    confidenceReason = `All ${cs.packets_confirmed} packets confirmed with full trace coverage`;
  } else if (cs.overall_level === "confirmed" && (metadata.warnings_count > 0 || ss?.is_stale)) {
    confidenceLevel = "medium";
    confidenceReason = `Packets confirmed but ${metadata.warnings_count} warning(s) present`;
  } else if (cs.overall_level === "partial-trace") {
    confidenceLevel = "low";
    confidenceReason = `${cs.packets_partial} packet(s) have partial trace — operator should verify`;
  } else if (metadata.unknowns_count > 0) {
    confidenceLevel = "low";
    confidenceReason = `${metadata.unknowns_count} unknown(s) present — operator caution required`;
  } else {
    confidenceLevel = "medium";
    confidenceReason = cs.confidence_reason ?? "Confidence level not fully confirmed";
  }

  // ── Step 10: Build operator summary ────────────────────────────────
  const summary: OperatorPacketSummary = {
    packet_status: "accepted",
    decision: `Accepted — ${confidenceLevel} confidence`,
    confidence_level: confidenceLevel,
    confidence_reason: confidenceReason,
    recommended_next_marker: metadata.recommended_next_marker,
    warnings,
    unknowns,
    redaction_status: {
      applied: redaction.redaction_applied,
      secrets_stripped: redaction.secrets_stripped,
      safe_for_review: redaction.safe_for_operator_review,
    },
    consumer_forbidden_actions: metadata.consumer_forbidden_actions ?? [],
    operator_notes:
      "Static fake/manual handoff packet. No live execution. Internal contract only. Do not use for authorization.",
  };

  return {
    accepted: true,
    summary,
    rejection_reason: null,
    metadata,
    bundleDir,
  };
}

// ── Helpers ───────────────────────────────────────────────────────────

const DEFAULT_FORBIDDEN = [
  "live-dispatch",
  "bus-mutation",
  "agent-activation",
  "cross-project-write",
  "auto-polling",
  "public-api-promotion",
  "source-of-truth-inference",
];

function reject(
  bundleDir: string,
  reason: string,
  metadata: HandoffMetadata | null,
): OperatorPacketResult {
  return {
    accepted: false,
    summary: {
      packet_status: "rejected",
      decision: `Rejected — ${reason}`,
      confidence_level: "rejected",
      confidence_reason: reason,
      recommended_next_marker: "BLOCKED_OPERATOR_REVIEW_REQUIRED",
      warnings: [reason],
      unknowns: [],
      redaction_status: {
        applied: metadata?.redaction_status?.redaction_applied ?? false,
        secrets_stripped: metadata?.redaction_status?.secrets_stripped ?? 0,
        safe_for_review: metadata?.redaction_status?.safe_for_operator_review ?? false,
      },
      consumer_forbidden_actions:
        metadata?.consumer_forbidden_actions ?? DEFAULT_FORBIDDEN,
      operator_notes: `Bundle rejected. Reason: ${reason}. Static fake/manual only. Internal contract.`,
    },
    rejection_reason: reason,
    metadata,
    bundleDir,
  };
}
