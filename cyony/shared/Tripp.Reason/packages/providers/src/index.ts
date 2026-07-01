/**
 * @tripp-reason/providers — barrel export
 *
 * Public API surface for the providers package:
 * - OpenAICompatibleProvider — provider adapter for OpenAI-shaped APIs
 * - ModelRouter — registry + selection for multiple providers
 * - Config types for provider construction
 * - Error classes for typed catches
 *
 * Dependencies:
 * - @tripp-reason/shared (ProviderAdapter, ProviderRequest, StreamEvent)
 */

// ── Provider implementations ─────────────────────────────────────────
export { OpenAICompatibleProvider } from "./openaiCompatibleProvider.js";

// ── Router ──────────────────────────────────────────────────────────
export { ModelRouter } from "./modelRouter.js";

// ── Config types ────────────────────────────────────────────────────
export type {
  OpenAICompatibleConfig,
  ModelRouterConfig,
} from "./config.js";

// ── Errors ──────────────────────────────────────────────────────────
export {
  ProviderError,
  ProviderConfigError,
  ProviderRequestError,
  ProviderStreamError,
} from "./errors.js";
