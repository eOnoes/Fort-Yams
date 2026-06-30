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
/**
 * ModelRouter: registry + selection for ProviderAdapter instances.
 */
export declare class ModelRouter {
    private readonly providers;
    private readonly defaultProviderName?;
    constructor(config?: ModelRouterConfig);
    /**
     * Register a provider adapter.
     * Replaces any existing provider with the same name.
     */
    register(provider: ProviderAdapter): void;
    /**
     * Get a provider by name.
     * Throws ProviderRequestError if not found.
     */
    getProvider(name: string): ProviderAdapter;
    /**
     * Get the default provider.
     * Uses defaultProviderName from config, or the first registered provider.
     * Throws ProviderRequestError if no providers are registered.
     */
    getDefaultProvider(): ProviderAdapter;
    /**
     * List all registered provider names.
     */
    listProviders(): string[];
    /**
     * Stream from a provider selected by name or default.
     * Convenience wrapper around getProvider + stream.
     */
    stream(request: ProviderRequest, providerName?: string): AsyncIterable<StreamEvent>;
}
//# sourceMappingURL=modelRouter.d.ts.map