/**
 * tripp swarm run command — Phase 5F
 *
 * Wires the swarm pipeline into CLI. Supports fake-mode (default)
 * and real mode (--real) with injected ReasonLoop dependencies.
 */
export interface SwarmOptions {
    mode?: string;
    workers?: number;
    fake?: boolean;
    real?: boolean;
    workdir: string;
    db?: string;
    baseUrl?: string;
    apiKeyEnv?: string;
    model?: string;
    providerName?: string;
    mcpConfig?: string;
    approve?: boolean;
    denyAll?: boolean;
    reportOnly?: boolean;
}
export declare function executeSwarm(prompt: string, options: SwarmOptions): Promise<void>;
//# sourceMappingURL=swarmCommand.d.ts.map