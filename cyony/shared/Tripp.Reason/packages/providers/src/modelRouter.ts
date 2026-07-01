/**
 * @tripp-reason/providers — ModelRouter
 *
 * Registry for multiple ProviderAdapter instances. Selects provider by name
 * or model name. Defaults to the configured primary provider.
 *
 * Design decisions:
 * - No multi-provider fanout (Phase 1 is single-provider)
 * - No fallback chains (keep it simple)
 * - Future phases can add tier-based routing (e.g. "Fast Builder" → Ollama, "Heavy Thinking" → OpenRouter)
 */
import type { ProviderAdapter, ProviderRequest, StreamEvent } from "@tripp-reason/shared";
import type { ModelRouterConfig } from "./config.js";
import { ProviderRequestError } from "./errors.js";

/**
 * ModelRouter: registry + selection for ProviderAdapter instances.
 */
export class ModelRouter {
  private readonly providers = new Map<string, ProviderAdapter>();
  private readonly defaultProviderName?: string;

  constructor(config?: ModelRouterConfig) {
    this.defaultProviderName = config?.defaultProvider;
  }

  /**
   * Register a provider adapter.
   * Replaces any existing provider with the same name.
   */
  register(provider: ProviderAdapter): void {
    this.providers.set(provider.name, provider);
  }

  /**
   * Get a provider by name.
   * Throws ProviderRequestError if not found.
   */
  getProvider(name: string): ProviderAdapter {
    const provider = this.providers.get(name);
    if (!provider) {
      throw new ProviderRequestError(`Provider "${name}" not registered`);
    }
    return provider;
  }

  /**
   * Get the default provider.
   * Uses defaultProviderName from config, or the first registered provider.
   * Throws ProviderRequestError if no providers are registered.
   */
  getDefaultProvider(): ProviderAdapter {
    if (this.defaultProviderName) {
      return this.getProvider(this.defaultProviderName);
    }

    const first = this.providers.values().next().value;
    if (!first) {
      throw new ProviderRequestError("No providers registered");
    }
    return first;
  }

  /**
   * List all registered provider names.
   */
  listProviders(): string[] {
    return Array.from(this.providers.keys());
  }

  /**
   * Stream from a provider selected by name or default.
   * Convenience wrapper around getProvider + stream.
   */
  async *stream(
    request: ProviderRequest,
    providerName?: string
  ): AsyncIterable<StreamEvent> {
    const provider = providerName
      ? this.getProvider(providerName)
      : this.getDefaultProvider();
    yield* provider.stream(request);
  }
}
