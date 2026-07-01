/**
 * @tripp-reason/providers — error types
 *
 * Provider-specific errors. Minimal taxonomy:
 * - Config errors (invalid baseUrl, missing apiKey)
 * - Request errors (model not allowed, malformed request)
 * - Stream errors (network failure, invalid SSE chunk)
 */

/** Base error for provider operations. */
export class ProviderError extends Error {
  constructor(message: string, options?: ErrorOptions) {
    super(message, options);
    this.name = "ProviderError";
  }
}

/** Thrown when provider configuration is invalid. */
export class ProviderConfigError extends ProviderError {
  constructor(message: string, options?: ErrorOptions) {
    super(`Provider config error: ${message}`, options);
    this.name = "ProviderConfigError";
  }
}

/** Thrown when a provider request fails (model not allowed, bad input). */
export class ProviderRequestError extends ProviderError {
  constructor(message: string, options?: ErrorOptions) {
    super(`Provider request error: ${message}`, options);
    this.name = "ProviderRequestError";
  }
}

/** Thrown when streaming fails (network error, invalid chunk). */
export class ProviderStreamError extends ProviderError {
  constructor(message: string, options?: ErrorOptions) {
    super(`Provider stream error: ${message}`, options);
    this.name = "ProviderStreamError";
  }
}
