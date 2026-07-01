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
import { parseSSEStream } from "./streaming.js";
import { ProviderConfigError, ProviderRequestError } from "./errors.js";

/**
 * OpenAI-compatible provider adapter.
 *
 * Translates shared ProviderRequest into OpenAI chat/completions format,
 * streams responses back as StreamEvent chunks (message/error only).
 */
export class OpenAICompatibleProvider implements ProviderAdapter {
  public readonly name: string;
  private readonly baseUrl: string;
  private readonly apiKey?: string;
  private readonly defaultModel?: string;
  private readonly allowedModels?: string[];
  private readonly headers: Record<string, string>;

  constructor(config: OpenAICompatibleConfig) {
    this.name = config.name ?? "openai-compatible";
    this.baseUrl = config.baseUrl.replace(/\/$/, ""); // Strip trailing slash
    this.apiKey = config.apiKey;
    this.defaultModel = config.defaultModel;
    this.allowedModels = config.allowedModels;
    this.headers = config.headers ?? {};

    // Validate config
    if (!this.baseUrl) {
      throw new ProviderConfigError("baseUrl is required");
    }
  }

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
  async *stream(request: ProviderRequest): AsyncIterable<StreamEvent> {
    const model = request.model ?? this.defaultModel;
    if (!model) {
      throw new ProviderRequestError(
        "No model specified and no defaultModel configured"
      );
    }

    // Enforce allowlist
    if (this.allowedModels && !this.allowedModels.includes(model)) {
      throw new ProviderRequestError(
        `Model "${model}" not in allowedModels: ${this.allowedModels.join(", ")}`
      );
    }

    // Build OpenAI-compatible request
    const url = `${this.baseUrl}/chat/completions`;
    const headers: Record<string, string> = {
      "Content-Type": "application/json",
      ...this.headers,
    };
    if (this.apiKey) {
      headers["Authorization"] = `Bearer ${this.apiKey}`;
    }

    const body = JSON.stringify({
      model,
      messages: request.messages.map((m) => ({
        role: m.role,
        content: m.content,
      })),
      stream: true,
      ...(request.maxTokens && { max_tokens: request.maxTokens }),
      ...(request.temperature !== undefined && { temperature: request.temperature }),
      ...(request.tools && { tools: request.tools }),
    });

    // Make request
    let response: Response;
    try {
      response = await fetch(url, {
        method: "POST",
        headers,
        body,
      });
    } catch (err) {
      throw new ProviderRequestError(
        `Network error: ${err instanceof Error ? err.message : String(err)}`,
        { cause: err }
      );
    }

    if (!response.ok) {
      const text = await response.text();
      throw new ProviderRequestError(
        `HTTP ${response.status}: ${text}`,
        { cause: new Error(`HTTP ${response.status}`) }
      );
    }

    // Parse SSE stream and yield events
    yield* parseSSEStream(response);
  }

  /**
   * List available models.
   *
   * Tries GET /v1/models endpoint. If it fails or returns nothing,
   * falls back to allowedModels or defaultModel.
   */
  async listModels(): Promise<string[]> {
    // Try /v1/models endpoint
    const url = `${this.baseUrl}/models`;
    const headers: Record<string, string> = { ...this.headers };
    if (this.apiKey) {
      headers["Authorization"] = `Bearer ${this.apiKey}`;
    }

    try {
      const response = await fetch(url, { method: "GET", headers });
      if (response.ok) {
        const data = await response.json();
        if (data.data && Array.isArray(data.data)) {
          return data.data.map((m: { id: string }) => m.id);
        }
      }
    } catch {
      // Endpoint not supported, fall through to fallback
    }

    // Fallback: return configured models
    if (this.allowedModels && this.allowedModels.length > 0) {
      return this.allowedModels;
    }
    if (this.defaultModel) {
      return [this.defaultModel];
    }
    return [];
  }
}
