export function createServerClient(serverUrl) {
    const base = serverUrl.replace(/\/$/, "");
    return {
        serverUrl: base,
        async health() { return fetch(`${base}/health`).then(r => r.json()); },
        async postReply(body) { return fetch(`${base}/reply`, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(body) }); },
        async getApprovals() { return fetch(`${base}/approvals`).then(r => r.json()); },
        async resolveApproval(id, approved, reason) {
            const r = await fetch(`${base}/approvals/${id}/resolve`, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ approved, reason }) });
            if (!r.ok)
                throw new Error(`HTTP ${r.status}`);
            return r.json();
        },
    };
}
//# sourceMappingURL=serverClient.js.map