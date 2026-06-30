import type { ServerClient } from "./serverClient.js";
export interface ApprovalPromptOptions {
    approve: boolean;
    denyAll: boolean;
}
export declare function watchApprovals(client: ServerClient, opts: ApprovalPromptOptions, signal?: AbortSignal): Promise<void>;
//# sourceMappingURL=httpApprovalPrompt.d.ts.map