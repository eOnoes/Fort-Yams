/**
 * @tripp-reason/providers — configuration types
 *
 * Provider configuration shapes. Kept minimal for Phase 1.
 */

/** Configuration for an OpenAI-compatible provider. */
export interface OpenAICompatibleConfig {
  /** Provider name (e.g. "ollama", "openrouter"). Default: "openai-compatible" */
  name?: string;

  /** Base URL for the OpenAI-compatible API (e.g. "https://ollama.com/v1") */
  baseUrl: string;

  /** API key for authentication (optional for some endpoints) */
  apiKey?: string;

  /** Default model to use when request.model is not specified */
  defaultModel?: string;

  /**
   * Allowed models. If specified, requests with models not in this list
   * are rejected with ProviderRequestError.
   */
  allowedModels?: string[];

  /** Additional headers to include in requests */
  headers?: Record<string, string>;
}

/** Configuration for the ModelRouter. */
export interface ModelRouterConfig {
  /** Default provider name to use when no provider is specified */
  defaultProvider?: string;
}
