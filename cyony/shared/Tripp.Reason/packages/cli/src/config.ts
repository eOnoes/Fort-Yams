/**
 * CLI configuration resolution
 */

import type { CLIEnv } from './env.js';

export interface CLIOptions {
  workdir: string;
  db: string;
  baseUrl?: string;
  apiKeyEnv?: string;
  model?: string;
  providerName?: string;
  title?: string;
}

export interface ResolvedConfig {
  workdir: string;
  dbPath: string;
  baseUrl: string;
  apiKey: string;
  model: string;
  providerName: string;
  title?: string;
}

export function resolveConfig(options: CLIOptions, env: CLIEnv): ResolvedConfig {
  // CLI flags take precedence over env vars
  const baseUrl = options.baseUrl ?? env.baseUrl;
  if (!baseUrl) {
    throw new Error('Base URL not configured. Set TRIPP_OPENAI_COMPATIBLE_BASE_URL or use --base-url.');
  }

  // API key: check specified env var name, then default env, then CLI flag
  const apiKeyEnvName = options.apiKeyEnv ?? 'TRIPP_OPENAI_COMPATIBLE_API_KEY';
  const apiKey = process.env[apiKeyEnvName] ?? env.apiKey;
  if (!apiKey) {
    throw new Error(`API key not found in ${apiKeyEnvName}. Set the environment variable or configure.`);
  }

  const model = options.model ?? env.model;
  if (!model) {
    throw new Error('Model not configured. Set TRIPP_MODEL or use --model.');
  }

  const providerName = options.providerName ?? env.providerName ?? 'openai-compatible';
  const dbPath = options.db ?? env.dbPath ?? '.tripp/reason.sqlite';

  return {
    workdir: options.workdir,
    dbPath,
    baseUrl,
    apiKey,
    model,
    providerName,
    title: options.title,
  };
}
