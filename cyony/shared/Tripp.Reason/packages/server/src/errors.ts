/**
 * @tripp-reason/server — Server Error Helpers
 *
 * Controlled JSON error responses. No raw stack traces exposed.
 */
import type { FastifyReply } from "fastify";

export function badRequest(reply: FastifyReply, message: string): void {
  reply.status(400).send({ error: "bad_request", message });
}

export function notFound(reply: FastifyReply, message: string): void {
  reply.status(404).send({ error: "not_found", message });
}

export function tooLarge(reply: FastifyReply, message: string): void {
  reply.status(413).send({ error: "too_large", message });
}

export function internalError(reply: FastifyReply, message: string): void {
  reply.status(500).send({ error: "internal_error", message });
}
