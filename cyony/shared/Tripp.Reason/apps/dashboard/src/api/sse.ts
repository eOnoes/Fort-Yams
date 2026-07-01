// Dashboard SSE client — parses text/event-stream from POST /reply
//
// Uses native fetch + ReadableStream. No dependencies required.

import type { SseEvent, SseFrame, ReplyRequest } from "./types";

const API_BASE = import.meta.env.VITE_TRIPP_API_BASE ?? "http://127.0.0.1:3030";

export interface SseCallbacks {
  onEvent: (event: SseEvent) => void;
  onDone: () => void;
  onError: (message: string) => void;
  /** Called when a heartbeat comment is received — optional, for connection liveness. */
  onHeartbeat?: () => void;
}

/**
 * Open an SSE connection to POST /reply.
 * Returns an AbortController the caller can use to cancel the stream.
 */
export function connectReplySse(
  body: ReplyRequest,
  callbacks: SseCallbacks
): AbortController {
  const controller = new AbortController();

  (async () => {
    try {
      const res = await fetch(`${API_BASE}/reply`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(body),
        signal: controller.signal,
      });

      if (!res.ok) {
        const errBody = await res.text().catch(() => "");
        let msg = `${res.status} ${res.statusText}`;
        try {
          const j = JSON.parse(errBody);
          msg = j.message ?? j.error ?? msg;
        } catch { /* not JSON */ }
        callbacks.onError(msg);
        return;
      }

      if (!res.body) {
        callbacks.onError("No response body");
        return;
      }

      await parseSseStream(res.body, callbacks);
      callbacks.onDone();
    } catch (err: unknown) {
      if (err instanceof DOMException && err.name === "AbortError") {
        // User cancelled — don't show error
        callbacks.onDone();
        return;
      }
      const msg = err instanceof Error ? err.message : String(err);
      callbacks.onError(`Connection error: ${msg}`);
    }
  })();

  return controller;
}

/**
 * Parse an SSE text/event-stream from a ReadableStream<Uint8Array>.
 *
 * Format:
 *   event: <type>\n
 *   data: <json>\n
 *   \n
 *   : heartbeat\n\n   ← comment (skip)
 */
async function parseSseStream(
  stream: ReadableStream<Uint8Array>,
  callbacks: SseCallbacks
): Promise<void> {
  const reader = stream.getReader();
  const decoder = new TextDecoder();
  let buffer = "";

  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      buffer += decoder.decode(value, { stream: true });

      // Process complete frames (separated by double newline)
      const parts = buffer.split("\n\n");
      // Last part may be incomplete — keep in buffer
      buffer = parts.pop() ?? "";

      for (const part of parts) {
        const trimmed = part.trim();
        if (!trimmed) continue;

        // Skip heartbeat comments (lines starting with ":")
        if (trimmed.startsWith(":")) {
          callbacks.onHeartbeat?.();
          continue;
        }

        const frame = parseSseFrame(trimmed);
        if (!frame) {
          // Malformed frame — warn but don't crash
          console.warn("[SSE] malformed frame:", trimmed.slice(0, 100));
          continue;
        }

        const event = parseEvent(frame);
        if (event) {
          callbacks.onEvent(event);
        }
      }
    }

    // Process any remaining buffer
    if (buffer.trim() && !buffer.trim().startsWith(":")) {
      const frame = parseSseFrame(buffer.trim());
      if (frame) {
        const event = parseEvent(frame);
        if (event) callbacks.onEvent(event);
      }
    }
  } finally {
    reader.releaseLock();
  }
}

/**
 * Parse a single SSE frame (between \n\n separators).
 * Returns { event, data } or null if malformed.
 */
function parseSseFrame(raw: string): SseFrame | null {
  let event = "message"; // default event type
  let data = "";

  for (const line of raw.split("\n")) {
    const l = line.trim();
    if (!l || l.startsWith(":")) continue;
    const colon = l.indexOf(":");
    if (colon === -1) continue;
    const field = l.slice(0, colon).trim();
    const value = l.slice(colon + 1).replace(/^ /, "");
    if (field === "event") event = value;
    else if (field === "data") data += value;
  }

  if (!data) return null;
  return { event, data };
}

/**
 * Parse JSON data from an SSE frame into an SseEvent.
 * Returns null if JSON is invalid or event type is unknown.
 */
function parseEvent(frame: SseFrame): SseEvent | null {
  try {
    const obj = JSON.parse(frame.data);
    // Ensure we have a recognized event type
    if (
      obj.type === "message" ||
      obj.type === "tool_request" ||
      obj.type === "tool_result" ||
      obj.type === "finish" ||
      obj.type === "error"
    ) {
      return obj as SseEvent;
    }
    console.warn("[SSE] unknown event type:", obj.type);
    return null;
  } catch {
    console.warn("[SSE] invalid JSON in frame:", frame.data.slice(0, 100));
    return null;
  }
}
