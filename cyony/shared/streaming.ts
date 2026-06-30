/**
 * @tripp-reason/providers — streaming helpers
 *
 * Utilities for parsing OpenAI-compatible SSE streams and translating
 * chunks into shared StreamEvent types.
 *
 * Important: This module does NOT emit StreamEventFinish. Providers stream
 * message/error chunks only. ReasonLoop (Phase 1F) owns finish event emission
 * because only ReasonLoop knows the runId.
 */
import type { StreamEvent } from "@tripp-reason/shared";
import { ProviderStreamError } from "./errors.js";

/**
 * Parse an OpenAI-compatible SSE stream into StreamEvent chunks.
 *
 * OpenAI SSE format:
 *   data: {"id":"...", "choices":[{"delta":{"content":"Hello"}, "index":0, "finish_reason":null}]}
 *   data: {"id":"...", "choices":[{"delta":{"content":" world"}, "index":0, "finish_reason":null}]}
 *   data: {"id":"...", "choices":[{"delta":{}, "index":0, "finish_reason":"stop"}]}
 *   data: [DONE]
 *
 * Translation rules:
 * - delta.content present → emit StreamEventMessage
 * - finish_reason present → do NOT emit StreamEventFinish (ReasonLoop owns that)
 * - error in chunk → emit StreamEventError
 */
export async function* parseSSEStream(
  response: Response
): AsyncGenerator<StreamEvent> {
  if (!response.body) {
    throw new ProviderStreamError("Response body is null");
  }

  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  let buffer = "";

  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      buffer += decoder.decode(value, { stream: true });
      const lines = buffer.split("\n");
      buffer = lines.pop() ?? ""; // Keep incomplete line in buffer

      for (const line of lines) {
        if (!line.startsWith("data: ")) continue;

        const data = line.slice(6).trim();
        if (data === "[DONE]") return;

        const event = parseSSEChunk(data);
        if (event) yield event;
      }
    }
  } catch (err) {
    throw new ProviderStreamError(
      `Stream read failed: ${err instanceof Error ? err.message : String(err)}`,
      { cause: err }
    );
  }
}

/**
 * Parse a single SSE data line into a StreamEvent.
 * Returns null if the chunk should be skipped (e.g. finish_reason without runId).
 */
function parseSSEChunk(data: string): StreamEvent | null {
  try {
    const chunk = JSON.parse(data);

    // Check for error in chunk
    if (chunk.error) {
      return {
        type: "error",
        message: chunk.error.message ?? "Unknown provider error",
        recoverable: true,
      };
    }

    // Extract content from delta
    const choice = chunk.choices?.[0];
    if (choice?.delta?.content) {
      return {
        type: "message",
        content: choice.delta.content,
        role: "assistant",
      };
    }

    // finish_reason present but no runId → skip (ReasonLoop emits finish later)
    // This is intentional: provider does not know runId, so cannot emit finish event.
    return null;
  } catch (err) {
    throw new ProviderStreamError(
      `Failed to parse SSE chunk: ${data}`,
      { cause: err }
    );
  }
}
