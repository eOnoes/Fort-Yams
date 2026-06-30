/** @tripp-reason/swarm — lightweight ID generator */
let counter = 0;
export function createId(prefix) {
    return `${prefix}_${Date.now().toString(36)}_${(counter++).toString(36)}`;
}
//# sourceMappingURL=ids.js.map