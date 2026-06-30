/** HTTP helpers for Phase 3 server API. */
export interface ServerClient {
    serverUrl: string;
    health(): Promise<{
        status: string;
        uptimeMs: number;
        phase: string;
    }>;
    postReply(body: Record<string, unknown>): Promise<Response>;
    getApprovals(): Promise<{
        approvals: Array<{
            id: string;
            toolName: string;
            riskLevel: string;
            status: string;
            argsSummary: string;
        }>;
    }>;
    resolveApproval(id: string, approved: boolean, reason?: string): Promise<any>;
}
export declare function createServerClient(serverUrl: string): ServerClient;
//# sourceMappingURL=serverClient.d.ts.map