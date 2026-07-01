/**
 * CLI main entry point — Phase 3D: tripp run, tripp serve, tripp chat
 * Phase 5F: tripp swarm run
 */
import { Command } from 'commander';
import { loadEnv, validateRequiredEnv } from './env.js';
import { resolveConfig } from './config.js';
import { executeRun } from './runCommand.js';
import { executeServe } from './serveCommand.js';
import { executeChat } from './chatCommand.js';
import { executeSwarm } from './swarmCommand.js';
import { registerAgentsCommands } from './agentsCommand.js';
import { printError } from './output.js';

export function createCLI(): Command {
  const program = new Command();
  program.name('tripp').description('Tripp.Reason CLI').version('0.1.0');

  // tripp run
  program.command('run')
    .description('Execute a reasoning task (local)')
    .argument('<prompt>', 'Prompt to execute')
    .option('--workdir <path>', 'Working directory', process.cwd())
    .option('--db <path>', 'Database path')
    .option('--base-url <url>', 'Provider base URL')
    .option('--api-key-env <name>', 'Env var for API key', 'TRIPP_OPENAI_COMPATIBLE_API_KEY')
    .option('--model <model>', 'Model name')
    .option('--provider-name <name>', 'Provider name')
    .option('--title <title>', 'Session title')
    .action(async (prompt: string, options: any) => {
      try {
        const env = loadEnv();
        validateRequiredEnv(env);
        const config = resolveConfig(options, env);
        await executeRun(prompt, config);
      } catch (error) {
        printError(error instanceof Error ? error.message : String(error));
        process.exit(1);
      }
    });

  // tripp serve
  program.command('serve')
    .description('Start the local HTTP/SSE server')
    .option('--host <host>', 'Bind host (default 127.0.0.1)')
    .option('--port <port>', 'Port (default 3030)')
    .option('--workdir <path>', 'Working directory')
    .option('--db <path>', 'Database path')
    .option('--base-url <url>', 'Provider base URL')
    .option('--api-key-env <name>', 'Env var for API key')
    .option('--model <model>', 'Model name')
    .option('--provider-name <name>', 'Provider name')
    .action(async (options: any) => {
      try {
        await executeServe(options);
      } catch (error) {
        printError(error instanceof Error ? error.message : String(error));
        process.exit(1);
      }
    });

  // tripp chat
  program.command('chat')
    .description('Chat via HTTP/SSE server')
    .option('--server <url>', 'Server URL (default http://127.0.0.1:3030)')
    .option('--session <id>', 'Continue existing session')
    .option('--title <title>', 'Session title')
    .option('--model <model>', 'Model override')
    .option('--provider <provider>', 'Provider override')
    .option('--workdir <path>', 'Workdir override')
    .option('--once <prompt>', 'Single prompt (non-interactive)')
    .option('--approve', 'Prompt terminal for approvals')
    .option('--deny-all', 'Auto-deny all approvals')
    .action(async (options: any) => {
      try {
        await executeChat(options);
      } catch (error) {
        printError(error instanceof Error ? error.message : String(error));
        process.exit(1);
      }
    });

  // tripp swarm run
  program.command('swarm')
    .description('Bounded multi-worker swarm orchestration')
    .command('run')
    .description('Execute a swarm run (fake mode default, --real for ReasonLoop)')
    .argument('<prompt>', 'Prompt to decompose and execute')
    .option('--mode <mode>', 'Swarm mode: solo, small, medium, large, max (default: small)')
    .option('--workers <n>', 'Worker count override')
    .option('--fake', 'Use deterministic fake workers (default)')
    .option('--real', 'Use ReasonLoop-backed real workers')
    .option('--workdir <path>', 'Working directory', process.cwd())
    .option('--db <path>', 'Database path')
    .option('--base-url <url>', 'Provider base URL')
    .option('--api-key-env <name>', 'Env var for API key', 'TRIPP_OPENAI_COMPATIBLE_API_KEY')
    .option('--model <model>', 'Model name')
    .option('--provider-name <name>', 'Provider name')
    .option('--mcp-config <path>', 'MCP config path')
    .option('--approve', 'Approve swarm startup and tool approvals')
    .option('--deny-all', 'Auto-deny all approvals')
    .option('--report-only', 'Generate report without worker execution')
    .action(async (prompt: string, options: any) => {
      try {
        await executeSwarm(prompt, {
          mode: options.mode,
          workers: options.workers ? parseInt(options.workers, 10) : undefined,
          fake: options.fake,
          real: options.real,
          workdir: options.workdir,
          db: options.db,
          baseUrl: options.baseUrl,
          apiKeyEnv: options.apiKeyEnv,
          model: options.model,
          providerName: options.providerName,
          mcpConfig: options.mcpConfig,
          approve: options.approve,
          denyAll: options.denyAll,
          reportOnly: options.reportOnly,
        });
      } catch (error) {
        printError(error instanceof Error ? error.message : String(error));
        process.exit(1);
      }
    });

  // tripp agents — Agent Bus commands (Phase 7D)
  registerAgentsCommands(program);

  return program;
}
