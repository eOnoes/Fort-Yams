/**
 * Command Safety Module (Phase 2D)
 *
 * Validates commands against allowlist/denylist before execution.
 * Prevents shell chaining, dangerous commands, and dependency installs.
 *
 * Design:
 * - Allowlist-first strategy: only whitelisted commands run
 * - Denylist second: blocked subcommands even within allowed commands
 * - Chaining detection: reject any arg containing control operators
 * - No shell: true — all execution is via spawn/execFile with args arrays
 */
/**
 * Check if a value is a standalone chaining/control operator.
 * Only exact matches are rejected — operators embedded in code are safe
 * because we use spawn (shell: false).
 */
export declare function detectChaining(value: string): string | null;
export interface CommandValidation {
    safe: boolean;
    error?: string;
}
/**
 * Validate a command + args array for safety.
 * Returns { safe: true } if valid, { safe: false, error: "..." } if rejected.
 */
export declare function validateCommand(command: string, args: string[]): CommandValidation;
/**
 * Resolve cwd for command execution — must be inside workdir.
 */
export declare function resolveCwd(cwdInput: string | undefined, workdir: string): {
    safe: boolean;
    cwd?: string;
    error?: string;
};
//# sourceMappingURL=commandSafety.d.ts.map