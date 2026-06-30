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

import { resolveSafePath } from "./pathSafety.js";

// ── Chaining / Control Operators ──────────────────────────────────────

/**
 * Exact-match chaining operators. With shell: false, these are only dangerous
 * if passed as literal standalone args (e.g., `args: ["&&", "rm", "-rf"]`).
 * Embedded in text (e.g., arrow functions `() => {}`) is safe under spawn.
 */
const CHAINING_OPERATORS = new Set([
  "&&",
  "||",
  ";",
  "|",
  ">",
  ">>",
  "<",
  "2>",
  "&",
  "`",
]);

/**
 * Check if a value is a standalone chaining/control operator.
 * Only exact matches are rejected — operators embedded in code are safe
 * because we use spawn (shell: false).
 */
export function detectChaining(value: string): string | null {
  if (CHAINING_OPERATORS.has(value)) {
    return `Chaining operator rejected: "${value}"`;
  }

  // Also reject $() and backtick subshells as standalone patterns
  if (/^\$\(.*\)$/.test(value.trim())) {
    return `Command substitution rejected: ${value}`;
  }
  if (/^`.*`$/.test(value.trim())) {
    return `Backtick subshell rejected: ${value}`;
  }

  return null;
}

// ── Allowed Commands ──────────────────────────────────────────────────

/**
 * Allowed top-level commands. Everything else is rejected.
 */
const ALLOWED_COMMANDS = new Set([
  "node",
  "npm",
  "pnpm",
  "npx",
  "tsc",
  "git",
  "echo",
  "cat",
  "ls",
  "pwd",
  "which",
  "env",
]);

/**
 * Denied dangerous commands — rejected regardless of context.
 */
const DANGEROUS_COMMANDS = new Set([
  "rm",
  "rmdir",
  "del",
  "erase",
  "format",
  "shutdown",
  "reboot",
  "mkfs",
  "dd",
  "diskpart",
  "curl",
  "wget",
  "chmod",
  "chown",
  "sudo",
  "su",
  "kill",
  "killall",
  "pkill",
  "powershell",
  "cmd",
]);

// ── Package Manager Restrictions ──────────────────────────────────────

/**
 * Denied subcommands for package managers (npm, pnpm, yarn, bun).
 * These prevent dependency installation/modification.
 */
const DENIED_PACKAGE_SUBCOMMANDS = new Set([
  "install",
  "add",
  "remove",
  "uninstall",
  "update",
  "upgrade",
  "i",  // npm i shorthand
]);

/**
 * Allowed subcommands for package managers.
 */
const ALLOWED_PACKAGE_SUBCOMMANDS = new Set([
  "test",
  "run",
  "typecheck",
  "build",
  "lint",
  "check",
]);

// ── Git Restrictions ─────────────────────────────────────────────────

/**
 * Denied git subcommands (mutating/repo-modifying).
 */
const DENIED_GIT_SUBCOMMANDS = new Set([
  "add",
  "commit",
  "reset",
  "clean",
  "checkout",
  "switch",
  "pull",
  "push",
  "merge",
  "rebase",
  "stash",
  "fetch",
  "config",
  "init",
  "clone",
]);

/**
 * Allowed git subcommands (read-only).
 */
const ALLOWED_GIT_SUBCOMMANDS = new Set([
  "status",
  "diff",
  "log",
  "show",
  "branch",
  "rev-parse",
  "describe",
  "tag",
]);

// ── Validation ────────────────────────────────────────────────────────

export interface CommandValidation {
  safe: boolean;
  error?: string;
}

/**
 * Validate a command + args array for safety.
 * Returns { safe: true } if valid, { safe: false, error: "..." } if rejected.
 */
export function validateCommand(
  command: string,
  args: string[]
): CommandValidation {
  // 1. Extract the base command name (strip path)
  const baseName = command.split("/").pop() ?? command;

  // 2. Reject dangerous commands
  if (DANGEROUS_COMMANDS.has(baseName)) {
    return { safe: false, error: `Dangerous command rejected: ${baseName}` };
  }

  // 3. Check allowlist
  if (!ALLOWED_COMMANDS.has(baseName)) {
    return {
      safe: false,
      error: `Command not in allowlist: ${baseName}. Allowed: ${[...ALLOWED_COMMANDS].join(", ")}`,
    };
  }

  // 4. Check command string itself for chaining
  const cmdChain = detectChaining(command);
  if (cmdChain) {
    return { safe: false, error: cmdChain };
  }

  // 5. Check each arg for chaining
  for (const arg of args) {
    const argChain = detectChaining(arg);
    if (argChain) {
      return { safe: false, error: `Arg rejected: ${argChain}` };
    }
  }

  // 6. Package manager restrictions
  if (baseName === "npm" || baseName === "pnpm" || baseName === "yarn" || baseName === "bun") {
    if (args.length > 0) {
      const sub = args[0];
      if (DENIED_PACKAGE_SUBCOMMANDS.has(sub)) {
        return {
          safe: false,
          error: `Package manager operation denied: ${baseName} ${sub}. Install/add/remove/update are not allowed.`,
        };
      }
    }
  }

  // 7. Git restrictions
  if (baseName === "git") {
    if (args.length > 0) {
      const sub = args[0];
      if (DENIED_GIT_SUBCOMMANDS.has(sub)) {
        return {
          safe: false,
          error: `Git operation denied: git ${sub}. Mutating git commands are not allowed.`,
        };
      }
      if (!ALLOWED_GIT_SUBCOMMANDS.has(sub)) {
        return {
          safe: false,
          error: `Git subcommand not in allowlist: git ${sub}. Allowed: ${[...ALLOWED_GIT_SUBCOMMANDS].join(", ")}`,
        };
      }
    } else {
      return { safe: false, error: "git requires a subcommand" };
    }
  }

  return { safe: true };
}

/**
 * Resolve cwd for command execution — must be inside workdir.
 */
export function resolveCwd(
  cwdInput: string | undefined,
  workdir: string
): { safe: boolean; cwd?: string; error?: string } {
  if (!cwdInput || cwdInput === ".") {
    return { safe: true, cwd: workdir };
  }

  const result = resolveSafePath(cwdInput, workdir);
  if (!result.safe) {
    return { safe: false, error: `cwd rejected: ${result.error}` };
  }
  return { safe: true, cwd: result.resolvedPath };
}
