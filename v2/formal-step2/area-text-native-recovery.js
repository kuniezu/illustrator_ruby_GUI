/* Isolated restart, discarded-candidate, and source-identity coordination. */
var FormalAreaTextNativeRecovery = (function () {
    function own(object, key) { return Object.prototype.hasOwnProperty.call(object, key); }
    function fail(message) { throw Error(message); }
    function copy(values) { var out = [], i; values = values || []; for (i = 0; i < values.length; i++) out.push(values[i]); return out; }
    function contains(values, value) { var i; for (i = 0; i < values.length; i++) if (values[i] === value) return true; return false; }
    function unique(values) { var out = [], i; for (i = 0; i < values.length; i++) if (!contains(out, values[i])) out.push(values[i]); return out; }
    function resolution(resolver, sourceFrameId, physicalId) {
        var result = resolver(sourceFrameId, physicalId);
        if (!result || (result.status !== "found" && result.status !== "missing" && result.status !== "duplicate")) fail("native-recovery-resolution-invalid");
        return result;
    }
    function candidateResolution(candidateIds, sourceFrameId, resolver) {
        var found = [], missing = [], i, result;
        candidateIds = unique(candidateIds || []);
        for (i = 0; i < candidateIds.length; i++) {
            result = resolution(resolver, sourceFrameId, candidateIds[i]);
            if (result.status === "duplicate") fail("native-recovery-duplicate-candidate:" + candidateIds[i]);
            if (result.status === "found") found.push(candidateIds[i]);
            else missing.push(candidateIds[i]);
        }
        return { found: found, missing: missing };
    }
    function restart(state, sourceFrameId, resolver) {
        var operation, candidates, retirement, i, result;
        if (!state || !state.operation) {
            retirement = candidateResolution(state && state.retirementQueue || [], sourceFrameId, resolver);
            return retirement.found.length || retirement.missing.length ? { action: "cleanup-retirement", found: retirement.found, missing: retirement.missing } : { action: "idle", found: [], missing: [] };
        }
        operation = state.operation;
        candidates = candidateResolution(operation.candidateIds || [], sourceFrameId, resolver);
        if (operation.phase === "prepare") return { action: "prepare-candidates", requestId: operation.requestId, found: candidates.found, missing: candidates.missing };
        if (operation.phase === "verified") return { action: "reverify-candidates", requestId: operation.requestId, found: candidates.found, missing: candidates.missing };
        if (operation.phase === "activated") {
            retirement = candidateResolution(state.retirementQueue || [], sourceFrameId, resolver);
            return { action: retirement.found.length || retirement.missing.length ? "cleanup-retirement" : "finish-operation", requestId: operation.requestId, found: retirement.found, missing: retirement.missing };
        }
        fail("native-recovery-operation-phase");
    }
    function validateActivation(sourceFrameId, records, resolver) {
        var key, record, result, checked = [];
        records = records || {};
        for (key in records) if (own(records, key)) {
            record = records[key];
            if (!record || record.physicalId !== key || record.sourceFrameId !== sourceFrameId) fail("native-recovery-source-mismatch:" + key);
            result = resolution(resolver, sourceFrameId, key);
            if (result.status === "duplicate") fail("native-recovery-duplicate-candidate:" + key);
            if (result.status !== "found") fail("native-recovery-candidate-missing:" + key);
            checked.push(key);
        }
        return { sourceFrameId: sourceFrameId, physicalIds: checked };
    }
    function discardedCleanup(discardedIds, sourceFrameId, resolver, remove) {
        var pending = [], removed = [], i, id, before, result;
        discardedIds = unique(discardedIds || []);
        for (i = 0; i < discardedIds.length; i++) {
            id = discardedIds[i];
            result = resolution(resolver, sourceFrameId, id);
            if (result.status === "duplicate") fail("native-recovery-duplicate-candidate:" + id);
            if (result.status === "missing") { removed.push(id); continue; }
            before = remove(id);
            if (before !== true) { pending.push(id); continue; }
            result = resolution(resolver, sourceFrameId, id);
            if (result.status === "duplicate") fail("native-recovery-duplicate-candidate:" + id);
            if (result.status === "missing") removed.push(id); else pending.push(id);
        }
        return { removed: removed, pending: pending, complete: pending.length === 0 };
    }
    function canFinish(state, cleanupIds, sourceFrameId, resolver) {
        var pending = discardedCleanup(cleanupIds || [], sourceFrameId, resolver, function () { return false; });
        if (!state || !state.operation || state.operation.phase !== "activated") return false;
        return state.retirementQueue.length === 0 && pending.pending.length === 0;
    }
    return { restart: restart, validateActivation: validateActivation, discardedCleanup: discardedCleanup, canFinish: canFinish };
}());
if (typeof module !== "undefined") module.exports = FormalAreaTextNativeRecovery;
