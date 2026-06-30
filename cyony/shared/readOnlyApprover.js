export class ReadOnlyApprover {
    async requestApproval(request) {
        return {
            approved: false,
            reason: `Tool "${request.toolName}" requires approval. HTTP approval queue is not available in Phase 3B (read-only mode). Use CLI for mutations.`,
        };
    }
}
//# sourceMappingURL=readOnlyApprover.js.map