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
export declare function parseSSEStream(response: Response): AsyncGenerator<StreamEvent>;
//# sourceMappingURL=streaming.d.ts.map