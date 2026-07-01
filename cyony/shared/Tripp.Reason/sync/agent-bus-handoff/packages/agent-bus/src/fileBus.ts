/**
 * @tripp-os/agent-bus — File Bus Helpers
 *
 * Safe file-system operations for the Agent Bus protocol.
 * All operations validate schemas, respect path boundaries, and fail closed.
 */
import * as fs from "node:fs/promises";
import * as path from "node:path";
import * as crypto from "node:crypto";
import {
  AGENT_BUS_ROOT,
  AGENT_BUS_INBOX,
  AGENT_BUS_OUTBOX,
  AGENT_BUS_REPORTS,
  AGENT_BUS_ARCHIVE,
  AGENT_BUS_REJECTED,
  UNSAFE_FILENAME_CHARS,
  SCHEMA_VERSION,
} from "./constants.js";
import {
  ValidatedTaskPacketSchema,
  ExternalAgentResultPacketSchema,
  ValidatedReviewPacketSchema,
  type ExternalAgentTaskPacket,
  type ExternalAgentResultPacket,
  type ExternalAgentReviewPacket,
} from "./schemas.js";

// ── Path Helpers ──────────────────────────────────────────────────────

export interface AgentBusPaths {
  root: string;
  inbox: string;
  outbox: string;
  reports: string;
  archive: string;
  rejected: string;
}

/**
 * Resolve Agent Bus folder paths relative to a root directory.
 * Defaults to process.cwd().
 */
export function getAgentBusPaths(root?: string): AgentBusPaths {
  const base = path.resolve(root ?? process.cwd());
  return {
    root: path.join(base, AGENT_BUS_ROOT),
    inbox: path.join(base, AGENT_BUS_INBOX),
    outbox: path.join(base, AGENT_BUS_OUTBOX),
    reports: path.join(base, AGENT_BUS_REPORTS),
    archive: path.join(base, AGENT_BUS_ARCHIVE),
    rejected: path.join(base, AGENT_BUS_REJECTED),
  };
}

/**
 * Ensure that all Agent Bus folders exist. Creates them if missing.
 * Idempotent — safe to call multiple times.
 */
export async function ensureAgentBus(root?: string): Promise<AgentBusPaths> {
  const paths = getAgentBusPaths(root);
  await fs.mkdir(paths.root, { recursive: true });
  await fs.mkdir(paths.inbox, { recursive: true });
  await fs.mkdir(paths.outbox, { recursive: true });
  await fs.mkdir(paths.reports, { recursive: true });
  await fs.mkdir(paths.archive, { recursive: true });
  await fs.mkdir(paths.rejected, { recursive: true });
  return paths;
}

/**
 * Validate that a target path is within the Agent Bus root.
 * Prevents path traversal attacks.
 */
function validateBusPath(targetPath: string, busRoot: string): void {
  const normalized = path.resolve(targetPath);
  const rootNormalized = path.resolve(busRoot) + path.sep;
  if (!normalized.startsWith(rootNormalized)) {
    throw new Error(`Path traversal rejected: ${targetPath} is outside Agent Bus root`);
  }
}

// ── Filename Helpers ───────────────────────────────────────────────────

function sanitizeSlug(input: string): string {
  return input
    .replace(UNSAFE_FILENAME_CHARS, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "")
    .toLowerCase()
    .slice(0, 60);
}

function timestamp(): string {
  const now = new Date();
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${now.getFullYear()}${pad(now.getMonth() + 1)}${pad(now.getDate())}-${pad(now.getHours())}${pad(now.getMinutes())}${pad(now.getSeconds())}`;
}

/**
 * Generate a deterministic filename for a task packet.
 */
export function createTaskPacketFilename(packet: ExternalAgentTaskPacket): string {
  const slug = sanitizeSlug(packet.title || packet.objective || "task");
  const suffix = crypto.randomBytes(4).toString("hex");
  return `task-${timestamp()}-${packet.agentRole}-${slug}-${suffix}.json`;
}

/**
 * Generate a deterministic filename for a result packet.
 */
export function createResultPacketFilename(packet: ExternalAgentResultPacket): string {
  const slug = sanitizeSlug(packet.summary || "result");
  return `result-${timestamp()}-${packet.agentRole}-${slug}.json`;
}

/**
 * Generate a deterministic filename for a review packet.
 */
export function createReviewPacketFilename(packet: ExternalAgentReviewPacket): string {
  const slug = sanitizeSlug(packet.summary || "review");
  return `review-${timestamp()}-${packet.reviewerRole}-${slug}.json`;
}

// ── Write Helpers ─────────────────────────────────────────────────────

export interface WriteOptions {
  /** Override Agent Bus root directory. Defaults to process.cwd(). */
  workdir?: string;
  /** Custom filename. If omitted, generated from packet content. */
  filename?: string;
}

/**
 * Write a validated task packet to the inbox.
 * Returns the absolute path of the written file.
 */
export async function writeTaskPacket(
  packet: ExternalAgentTaskPacket,
  options: WriteOptions = {}
): Promise<string> {
  // Validate
  const parsed = ValidatedTaskPacketSchema.parse({
    ...packet,
    schemaVersion: packet.schemaVersion ?? SCHEMA_VERSION,
    createdAt: packet.createdAt ?? new Date().toISOString(),
  });

  const paths = await ensureAgentBus(options.workdir);
  const filename = options.filename ?? createTaskPacketFilename(parsed);
  const filePath = path.join(paths.inbox, filename);

  validateBusPath(filePath, paths.root);

  const json = JSON.stringify(parsed, null, 2);
  await fs.writeFile(filePath, json, "utf-8");
  return filePath;
}

/**
 * Write a validated result packet to the outbox.
 * Returns the absolute path of the written file.
 */
export async function writeResultPacket(
  packet: ExternalAgentResultPacket,
  options: WriteOptions = {}
): Promise<string> {
  const parsed = ExternalAgentResultPacketSchema.parse({
    ...packet,
    schemaVersion: packet.schemaVersion ?? SCHEMA_VERSION,
    createdAt: packet.createdAt ?? new Date().toISOString(),
  });

  const paths = await ensureAgentBus(options.workdir);
  const filename = options.filename ?? createResultPacketFilename(parsed);
  const filePath = path.join(paths.outbox, filename);

  validateBusPath(filePath, paths.root);

  const json = JSON.stringify(parsed, null, 2);
  await fs.writeFile(filePath, json, "utf-8");
  return filePath;
}

// ── Read Helpers ──────────────────────────────────────────────────────

/**
 * Read and validate a task packet from a file.
 * Fails closed on malformed JSON or schema validation errors.
 */
export async function readTaskPacket(filePath: string): Promise<ExternalAgentTaskPacket> {
  const raw = await fs.readFile(filePath, "utf-8");
  let json: unknown;
  try {
    json = JSON.parse(raw);
  } catch {
    throw new Error(`Malformed JSON in task packet: ${filePath}`);
  }
  return ValidatedTaskPacketSchema.parse(json);
}

/**
 * Read and validate a result packet from a file.
 * Fails closed on malformed JSON or schema validation errors.
 */
export async function readResultPacket(filePath: string): Promise<ExternalAgentResultPacket> {
  const raw = await fs.readFile(filePath, "utf-8");
  let json: unknown;
  try {
    json = JSON.parse(raw);
  } catch {
    throw new Error(`Malformed JSON in result packet: ${filePath}`);
  }
  return ExternalAgentResultPacketSchema.parse(json);
}

// ── List Helpers ──────────────────────────────────────────────────────

export interface ListOptions {
  workdir?: string;
}

/**
 * List task packet files in the inbox.
 * Returns absolute file paths, sorted by name.
 */
export async function listInboxPackets(options: ListOptions = {}): Promise<string[]> {
  const paths = await ensureAgentBus(options.workdir);
  const entries = await fs.readdir(paths.inbox);
  return entries
    .filter((f: string) => f.endsWith(".json"))
    .map((f: string) => path.join(paths.inbox, f))
    .sort();
}

/**
 * List result packet files in the outbox.
 * Returns absolute file paths, sorted by name.
 */
export async function listOutboxPackets(options: ListOptions = {}): Promise<string[]> {
  const paths = await ensureAgentBus(options.workdir);
  const entries = await fs.readdir(paths.outbox);
  return entries
    .filter((f) => f.endsWith(".json"))
    .map((f) => path.join(paths.outbox, f))
    .sort();
}

// ── Move Helpers ──────────────────────────────────────────────────────

/**
 * Move a packet file to the archive folder.
 * Returns the new absolute path.
 */
export async function movePacketToArchive(
  filePath: string,
  options: ListOptions = {}
): Promise<string> {
  const paths = await ensureAgentBus(options.workdir);
  const filename = path.basename(filePath);
  const dest = path.join(paths.archive, filename);
  validateBusPath(dest, paths.root);
  await fs.rename(filePath, dest);
  return dest;
}

/**
 * Move a packet file to the rejected folder, preserving traceability.
 * Writes a companion `.rejection.md` file with the reason.
 * Returns the new absolute path of the rejected packet.
 */
export async function movePacketToRejected(
  filePath: string,
  reason: string,
  options: ListOptions = {}
): Promise<string> {
  const paths = await ensureAgentBus(options.workdir);
  const filename = path.basename(filePath);
  const dest = path.join(paths.rejected, filename);
  validateBusPath(dest, paths.root);

  await fs.rename(filePath, dest);

  // Write companion rejection reason file
  const reasonFile = dest.replace(/\.json$/, ".rejection.md");
  const reasonContent = [
    `# Rejection: ${filename}`,
    "",
    `**Time:** ${new Date().toISOString()}`,
    `**Reason:** ${reason}`,
    "",
    "---",
    "",
    "This file was automatically generated for audit traceability.",
  ].join("\n");
  await fs.writeFile(reasonFile, reasonContent, "utf-8");

  return dest;
}

// ── Review Helpers ────────────────────────────────────────────────────

/**
 * Write a validated review packet and its Markdown report to the reports folder.
 * Returns { jsonPath, mdPath, reviewId }.
 */
export async function writeReviewPacket(
  packet: ExternalAgentReviewPacket,
  options: WriteOptions = {}
): Promise<{ jsonPath: string; mdPath: string; reviewId: string }> {
  // Validate
  const parsed = ValidatedReviewPacketSchema.parse({
    ...packet,
    schemaVersion: packet.schemaVersion ?? SCHEMA_VERSION,
    createdAt: packet.createdAt ?? new Date().toISOString(),
  });

  const paths = await ensureAgentBus(options.workdir);
  const jsonFilename = createReviewPacketFilename(parsed);
  const jsonPath = path.join(paths.reports, jsonFilename);
  validateBusPath(jsonPath, paths.root);

  await fs.writeFile(jsonPath, JSON.stringify(parsed, null, 2), "utf-8");

  // Write companion Markdown report
  const mdFilename = jsonFilename.replace(/\.json$/, ".md");
  const mdPath = path.join(paths.reports, mdFilename);
  const reviewMd = buildReviewMarkdown(parsed, mdFilename);
  await fs.writeFile(mdPath, reviewMd, "utf-8");

  return { jsonPath, mdPath, reviewId: parsed.reviewId };
}

/**
 * Read and validate a review packet from a file.
 */
export async function readReviewPacket(
  filePath: string
): Promise<ExternalAgentReviewPacket> {
  const raw = await fs.readFile(filePath, "utf-8");
  let json: unknown;
  try {
    json = JSON.parse(raw);
  } catch {
    throw new Error(`Malformed JSON in review packet: ${filePath}`);
  }
  return ValidatedReviewPacketSchema.parse(json);
}

/**
 * List review JSON packet files in the reports folder.
 */
export async function listReviewPackets(
  options: ListOptions = {}
): Promise<string[]> {
  const paths = await ensureAgentBus(options.workdir);
  const entries = await fs.readdir(paths.reports);
  return entries
    .filter((f) => f.startsWith("review-") && f.endsWith(".json"))
    .map((f) => path.join(paths.reports, f))
    .sort();
}

/**
 * List review Markdown report files in the reports folder.
 */
export async function listReportFiles(
  options: ListOptions = {}
): Promise<string[]> {
  const paths = await ensureAgentBus(options.workdir);
  const entries = await fs.readdir(paths.reports);
  return entries
    .filter((f) => f.startsWith("review-") && f.endsWith(".md"))
    .map((f) => path.join(paths.reports, f))
    .sort();
}

/** Build the Markdown Echo Warden review report */
function buildReviewMarkdown(
  review: ExternalAgentReviewPacket,
  _filename: string
): string {
  const lines: string[] = [
    "# Echo Warden Review",
    "",
    "## Review Identity",
    "",
    `- **reviewId:** ${review.reviewId}`,
    `- **createdAt:** ${review.createdAt}`,
    `- **reviewerRole:** ${review.reviewerRole}`,
    `- **verdict:** ${review.verdict}`,
    "",
    "## Source Result",
    "",
    `- **packetId:** ${review.packetId}`,
    `- **resultId:** ${review.resultId ?? "(not linked)"}`,
    `- **runId:** ${review.runId}`,
    "",
    "## Summary",
    "",
    review.summary || "(no summary)",
    "",
    "## Issues",
    "",
    ...(review.issues.length > 0
      ? review.issues.map((i) => `- ${i}`)
      : ["(none)"]),
    "",
    "## Boundary Findings",
    "",
    ...(review.boundaryFindings.length > 0
      ? review.boundaryFindings.map((f) => `- ${f}`)
      : ["(none)"]),
    "",
    "## Doctrine Findings",
    "",
    ...(review.doctrineFindings.length > 0
      ? review.doctrineFindings.map((f) => `- ${f}`)
      : ["(none)"]),
    "",
    "## Safety Findings",
    "",
    ...(review.safetyFindings.length > 0
      ? review.safetyFindings.map((f) => `- ${f}`)
      : ["(none)"]),
    "",
    "## Approval Boundary",
    "",
    "- ⚠️ This Echo review is **advisory only**.",
    "- ⚠️ This review does **NOT** approve mutation.",
    "- ⚠️ **Tripp.Reason ApprovalGate remains authoritative.**",
    "- ⚠️ **Eddie remains the final approver.**",
    "",
    "## Recommended Next Action",
    "",
    review.recommendedNextAction || "(none)",
    "",
  ];
  return lines.join("\n");
}
