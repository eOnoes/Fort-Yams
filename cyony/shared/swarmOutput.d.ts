/**
 * CLI swarm output formatting — Phase 5F
 */
import type { SwarmRunSummary } from "@tripp-reason/swarm";
export declare function printSwarmHeader(mode: string, workerCount: number): void;
export declare function printSwarmResult(summary: SwarmRunSummary): void;
export declare function printSwarmError(message: string): void;
export declare function printApprovalDenied(mode: string): void;
export declare function printWorkerCapRejected(count: number, max: number): void;
//# sourceMappingURL=swarmOutput.d.ts.map