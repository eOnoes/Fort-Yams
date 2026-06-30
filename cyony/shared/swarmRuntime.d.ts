import type { SwarmMode, SwarmRunSummary } from "@tripp-reason/swarm";
export interface SwarmRunEntry {
    summary: SwarmRunSummary;
    operatorPrompt: string;
}
export declare function addSwarm(e: SwarmRunEntry): void;
export declare function getSwarm(id: string): SwarmRunEntry | undefined;
export declare function listSwarms(): SwarmRunEntry[];
export declare function getSwarmCount(): number;
export interface SwarmRunRequest {
    prompt: string;
    mode?: SwarmMode;
    workers?: number;
    fake?: boolean;
    real?: boolean;
    workdir?: string;
}
export interface SwarmRunResponse {
    id: string;
    mode: string;
    workerCount: number;
    status: string;
    startedAt: string;
    completedAt: string;
    wardenStatus?: string;
    reportPath?: string;
    promptSummary: string;
}
export declare function runSwarm(request: SwarmRunRequest, workdir: string): Promise<SwarmRunResponse>;
export declare function swarmListDTO(): SwarmRunResponse[];
export declare function swarmDetailDTO(e: SwarmRunEntry): Record<string, unknown>;
//# sourceMappingURL=swarmRuntime.d.ts.map