import { type ExternalAgentTaskPacket, type ExternalAgentResultPacket, type ExternalAgentReviewPacket } from "./schemas.js";
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
export declare function getAgentBusPaths(root?: string): AgentBusPaths;
/**
 * Ensure that all Agent Bus folders exist. Creates them if missing.
 * Idempotent — safe to call multiple times.
 */
export declare function ensureAgentBus(root?: string): Promise<AgentBusPaths>;
/**
 * Generate a deterministic filename for a task packet.
 */
export declare function createTaskPacketFilename(packet: ExternalAgentTaskPacket): string;
/**
 * Generate a deterministic filename for a result packet.
 */
export declare function createResultPacketFilename(packet: ExternalAgentResultPacket): string;
/**
 * Generate a deterministic filename for a review packet.
 */
export declare function createReviewPacketFilename(packet: ExternalAgentReviewPacket): string;
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
export declare function writeTaskPacket(packet: ExternalAgentTaskPacket, options?: WriteOptions): Promise<string>;
/**
 * Write a validated result packet to the outbox.
 * Returns the absolute path of the written file.
 */
export declare function writeResultPacket(packet: ExternalAgentResultPacket, options?: WriteOptions): Promise<string>;
/**
 * Read and validate a task packet from a file.
 * Fails closed on malformed JSON or schema validation errors.
 */
export declare function readTaskPacket(filePath: string): Promise<ExternalAgentTaskPacket>;
/**
 * Read and validate a result packet from a file.
 * Fails closed on malformed JSON or schema validation errors.
 */
export declare function readResultPacket(filePath: string): Promise<ExternalAgentResultPacket>;
export interface ListOptions {
    workdir?: string;
}
/**
 * List task packet files in the inbox.
 * Returns absolute file paths, sorted by name.
 */
export declare function listInboxPackets(options?: ListOptions): Promise<string[]>;
/**
 * List result packet files in the outbox.
 * Returns absolute file paths, sorted by name.
 */
export declare function listOutboxPackets(options?: ListOptions): Promise<string[]>;
/**
 * Move a packet file to the archive folder.
 * Returns the new absolute path.
 */
export declare function movePacketToArchive(filePath: string, options?: ListOptions): Promise<string>;
/**
 * Move a packet file to the rejected folder, preserving traceability.
 * Writes a companion `.rejection.md` file with the reason.
 * Returns the new absolute path of the rejected packet.
 */
export declare function movePacketToRejected(filePath: string, reason: string, options?: ListOptions): Promise<string>;
/**
 * Write a validated review packet and its Markdown report to the reports folder.
 * Returns { jsonPath, mdPath, reviewId }.
 */
export declare function writeReviewPacket(packet: ExternalAgentReviewPacket, options?: WriteOptions): Promise<{
    jsonPath: string;
    mdPath: string;
    reviewId: string;
}>;
/**
 * Read and validate a review packet from a file.
 */
export declare function readReviewPacket(filePath: string): Promise<ExternalAgentReviewPacket>;
/**
 * List review JSON packet files in the reports folder.
 */
export declare function listReviewPackets(options?: ListOptions): Promise<string[]>;
/**
 * List review Markdown report files in the reports folder.
 */
export declare function listReportFiles(options?: ListOptions): Promise<string[]>;
//# sourceMappingURL=fileBus.d.ts.map