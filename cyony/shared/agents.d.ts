/**
 * Phase 7G — Agent Bus API routes.
 *
 * Read-only access to inbox, outbox, reviews, and trace ledger.
 * All paths are validated against .tripp/agents boundary.
 */
import type { FastifyInstance } from "fastify";
export declare function agentsStatusRoute(app: FastifyInstance, workdir: string): void;
export declare function agentsInboxRoute(app: FastifyInstance, workdir: string): void;
export declare function agentsOutboxRoute(app: FastifyInstance, workdir: string): void;
export declare function agentsReviewsRoute(app: FastifyInstance, workdir: string): void;
export declare function agentsTraceRoute(app: FastifyInstance, workdir: string): void;
export declare function agentsTraceChainRoute(app: FastifyInstance, workdir: string): void;
export declare function agentsReadRoute(app: FastifyInstance, workdir: string): void;
export declare function agentsArchiveRoute(app: FastifyInstance, workdir: string): void;
export declare function agentsRejectRoute(app: FastifyInstance, workdir: string): void;
//# sourceMappingURL=agents.d.ts.map