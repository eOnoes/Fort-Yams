/**
 * Environment variable handling for CLI
 */
export interface CLIEnv {
    baseUrl?: string;
    apiKey?: string;
    model?: string;
    providerName?: string;
    dbPath?: string;
}
export declare function loadEnv(): CLIEnv;
export declare function validateRequiredEnv(env: CLIEnv): void;
//# sourceMappingURL=env.d.ts.map