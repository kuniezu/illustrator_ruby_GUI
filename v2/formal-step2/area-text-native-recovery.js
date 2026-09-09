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
        var operation, candidates, retirement, discarded;
        if (!state || !state.operation) {
            discarded = candidateResolution(state && state.cleanupQueue || [], sourceFrameId, resolver);
            if (discarded.found.length || discarded.missing.length) return { action: "cleanup-discarded", found: discarded.found, missing: discarded.missing };
            retirement = candidateResolution(state && state.retirementQueue || [], sourceFrameId, resolver);
            return retirement.found.length || retirement.missing.length ? { action: "cleanup-retirement", found: retirement.found, missing: retirement.missing } : { action: "idle", found: [], missing: [] };
        }
        operation = state.operation;
        candidates = candidateResolution(operation.candidateIds || [], sourceFrameId, resolver);
        if (operation.phase === "prepare") return { action: "prepare-candidates", requestId: operation.requestId, found: candidates.found, missing: candidates.missing };
        if (operation.phase === "verified") return { action: "reverify-candidates", requestId: operation.requestId, found: candidates.found, missing: candidates.missing };
        if (operation.phase === "activated") {
            discarded = candidateResolution(state.cleanupQueue || [], sourceFrameId, resolver);
            if (discarded.found.length || discarded.missing.length) return { action: "cleanup-discarded", requestId: operation.requestId, found: discarded.found, missing: discarded.missing };
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
    function validateOperationCandidates(sourceFrameId, state, resolver) {
        var ids, i, result;
        if (!state || !state.operation) fail("native-recovery-operation-missing");
        ids = unique(state.operation.candidateIds || []);
        for (i = 0; i < ids.length; i++) {
            result = resolution(resolver, sourceFrameId, ids[i]);
            if (result.status === "duplicate") fail("native-recovery-duplicate-candidate:" + ids[i]);
            if (result.status !== "found") fail("native-recovery-candidate-missing:" + ids[i]);
        }
        return { sourceFrameId: sourceFrameId, physicalIds: ids };
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
    function canFinish(state, sourceFrameId, resolver) {
        var pending = discardedCleanup(state && state.cleanupQueue || [], sourceFrameId, resolver, function () { return false; });
        if (!state || !state.operation || state.operation.phase !== "activated") return false;
        return state.retirementQueue.length === 0 && (!state.cleanupQueue || state.cleanupQueue.length === 0) && pending.pending.length === 0;
    }
    function activate(sourceFrameId, state, requestId, bindings, records, retireIds, discardedIds, resolver, transition) {
        validateOperationCandidates(sourceFrameId, state, resolver);
        validateActivation(sourceFrameId, records, resolver);
        return transition(state, requestId, bindings, records, retireIds, discardedIds);
    }
    function resume(state, sourceFrameId, resolver, materialize) {
        var plan = restart(state, sourceFrameId, resolver), entries;
        if (plan.action === "prepare-candidates" || plan.action === "reverify-candidates") {
            entries = materialize(plan.found, plan.missing, plan.action === "reverify-candidates");
            if (!entries || entries.length !== plan.found.length + plan.missing.length) fail("native-recovery-materialization-incomplete");
            return { action: plan.action === "prepare-candidates" ? "ready-for-verification" : "ready-for-activation", requestId: plan.requestId, reused: plan.found, created: plan.missing, entries: entries };
        }
        return plan;
    }
    function execute(state, sourceFrameId, requestId, resolver, materialize, verify, markVerified, activation) {
        var plan = restart(state, sourceFrameId, resolver), prepared, nextState;
        if (plan.action !== "prepare-candidates" && plan.action !== "reverify-candidates") return plan;
        prepared = materialize(plan.found, plan.missing, plan.action === "reverify-candidates");
        if (!prepared || !prepared.entries || prepared.entries.length !== plan.found.length + plan.missing.length) fail("native-recovery-materialization-incomplete");
        if (verify(prepared.entries, plan.action === "reverify-candidates") !== true) fail("native-recovery-verification-failed");
        nextState = state;
        if (plan.action === "prepare-candidates") nextState = markVerified(state, requestId);
        return activate(sourceFrameId, nextState, requestId, prepared.bindings, prepared.records, prepared.retireIds || [], prepared.discardedIds || [], resolver, activation);
    }
    return { restart: restart, resume: resume, execute: execute, validateActivation: validateActivation, validateOperationCandidates: validateOperationCandidates, discardedCleanup: discardedCleanup, canFinish: canFinish, activate: activate };
}());
if (typeof module !== "undefined") module.exports = FormalAreaTextNativeRecovery;
