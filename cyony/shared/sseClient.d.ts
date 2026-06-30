/** SSE client: parses text/event-stream from a ReadableStream. */
export interface SseEvent {
    event: string;
    data: string;
}
export declare function parseSse(body: ReadableStream<Uint8Array> | null): AsyncGenerator<SseEvent>;
//# sourceMappingURL=sseClient.d.ts.map