/**
 * @tripp-reason/providers — OpenAI-compatible provider
 *
 * Implements ProviderAdapter for any OpenAI-shaped chat/completions endpoint.
 * Supports Ollama Cloud, OpenRouter, or any OpenAI-compatible API.
 *
 * Design decisions:
 * - Uses native fetch() (no axios/got dependency)
 * - Streaming via SSE parser (streaming.ts)
 * - Model allowlist enforced at stream() entry
 * - listModels() tries /v1/models endpoint, falls back to allowedModels/defaultModel
 * - Finish events are NOT emitted by this provider (ReasonLoop owns them in Phase 1F)
 */
import type { ProviderAdapter, ProviderRequest, StreamEvent } from "@tripp-reason/shared";
import type { OpenAICompatibleConfig } from "./config.js";
/**
 * OpenAI-compatible provider adapter.
 *
 * Translates shared ProviderRequest into OpenAI chat/completions format,
 * streams responses back as StreamEvent chunks (message/error only).
 */
export declare class OpenAICompatibleProvider implements ProviderAdapter {
    readonly name: string;
    private readonly baseUrl;
    private readonly apiKey?;
    private readonly defaultModel?;
    private readonly allowedModels?;
    private readonly headers;
    constructor(config: OpenAICompatibleConfig);
    /**
     * Stream a response from the provider.
     *
     * Translates ProviderRequest → OpenAI chat/completions request,
     * parses SSE response → StreamEvent chunks.
     *
     * Important: This method emits message/error events only.
     * Finish events are emitted by ReasonLoop (Phase 1F) because
     * only ReasonLoop knows the runId.
     */
    stream(request: ProviderRequest): AsyncIterable<StreamEvent>;
    /**
     * List available models.
     *
     * Tries GET /v1/models endpoint. If it fails or returns nothing,
     * falls back to allowedModels or defaultModel.
     */
    listModels(): Promise<string[]>;
}
//# sourceMappingURL=openaiCompatibleProvider.d.ts.map