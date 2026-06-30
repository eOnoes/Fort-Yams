import { type ExternalAgentTransportConfig, type ExternalAgentTransportKind, type ExternalAgentTransportMode, type ExternalAgentDispatchRequest, type ExternalAgentDispatchResult } from "./transportSchemas.js";
import type { ExternalAgentTaskPacket, ExternalAgentRole } from "./schemas.js";
/** Safe default transport config for any agent role */
export declare function createDefaultTransportConfig(agentRole: ExternalAgentRole, kind?: ExternalAgentTransportKind, mode?: ExternalAgentTransportMode): ExternalAgentTransportConfig;
/** Validate a transport config */
export declare function validateTransportConfig(config: ExternalAgentTransportConfig): ExternalAgentTransportConfig;
/**
 * Create a dispatch request from a validated task packet.
 */
export declare function createDispatchRequest(taskPacket: ExternalAgentTaskPacket, config: ExternalAgentTransportConfig, options?: {
    dryRun?: boolean;
    traceEnabled?: boolean;
    requestedBy?: string;
}): ExternalAgentDispatchRequest;
/**
 * Dispatch to a fake agent. Deterministic, safe, no LLM/network/shell.
 * Writes result packet to outbox and emits trace events.
 */
export declare function dispatchToFakeAgent(request: ExternalAgentDispatchRequest, workdir?: string): Promise<ExternalAgentDispatchResult>;
/**
 * Real agent transport stub — always blocked.
 *
 * Phase 8E: disabled-by-default skeleton.
 * No network calls. No process spawning. No secrets.
 * Returns "blocked" for every request until real transport is enabled.
 */
export declare function dispatchToRealAgent(request: ExternalAgentDispatchRequest, _config: ExternalAgentTransportConfig, workdir?: string): Promise<ExternalAgentDispatchResult>;
/**
 * Route dispatch to the correct transport based on config mode.
 *
 * mode="fake"              → dispatchToFakeAgent
 * mode="manual"            → dispatchToManualFileTransport
 * mode="experimental_live"  → dispatchToRealAgent (always blocked in Phase 8E)
 * mode="disabled" / default → blocked
 */
export declare function dispatchRoute(request: ExternalAgentDispatchRequest, config: ExternalAgentTransportConfig, workdir?: string): Promise<ExternalAgentDispatchResult>;
/**
 * Manual file transport — packet stays in inbox, no automatic dispatch.
 */
export declare function dispatchToManualFileTransport(request: ExternalAgentDispatchRequest, workdir?: string): Promise<ExternalAgentDispatchResult>;
//# sourceMappingURL=transport.d.ts.map