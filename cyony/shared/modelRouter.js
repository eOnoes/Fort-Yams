import { ProviderRequestError } from "./errors.js";
/**
 * ModelRouter: registry + selection for ProviderAdapter instances.
 */
export class ModelRouter {
    providers = new Map();
    defaultProviderName;
    constructor(config) {
        this.defaultProviderName = config?.defaultProvider;
    }
    /**
     * Register a provider adapter.
     * Replaces any existing provider with the same name.
     */
    register(provider) {
        this.providers.set(provider.name, provider);
    }
    /**
     * Get a provider by name.
     * Throws ProviderRequestError if not found.
     */
    getProvider(name) {
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
    getDefaultProvider() {
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
    listProviders() {
        return Array.from(this.providers.keys());
    }
    /**
     * Stream from a provider selected by name or default.
     * Convenience wrapper around getProvider + stream.
     */
    async *stream(request, providerName) {
        const provider = providerName
            ? this.getProvider(providerName)
            : this.getDefaultProvider();
        yield* provider.stream(request);
    }
}
//# sourceMappingURL=modelRouter.js.map