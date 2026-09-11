/* Production-adjacent Gate D integration seam. No UI or production persistence wiring. */
var FormalAreaTextNativeIntegration = (function () {
    function fail(message) { throw Error(message); }
    function advanceExpectedState(transaction, result) {
        if (!result || result.status !== "success" || typeof result.note !== "string" || typeof result.sourceContents !== "string") fail("native-integration-durable-readback-invalid");
        if (result.sourceContents !== transaction.expectedContents) fail("native-integration-source-readback-mismatch");
        transaction.expectedNote = result.note;
    }
    function requireTransaction(transaction) {
        if (!transaction || !transaction.source || typeof transaction.source.contents !== "string" || typeof transaction.source.note !== "string") fail("native-integration-transaction-required");
        if (typeof transaction.requestId !== "string" || !transaction.requestId) fail("native-integration-request-required");
        if (typeof transaction.expectedContents !== "string" || typeof transaction.expectedNote !== "string") fail("native-integration-expected-state-required");
    }
    function candidateIds(renderSpecs) {
        var out = [], i, spec;
        renderSpecs = renderSpecs || [];
        for (i = 0; i < renderSpecs.length; i++) {
            spec = renderSpecs[i];
            if (!spec || typeof spec.physicalId !== "string" || !spec.physicalId) fail("native-integration-physical-id-required");
            out.push(spec.physicalId);
        }
        return out;
    }
    function create(orchestration, host, coordinator) {
        if (!orchestration || typeof orchestration.planAll !== "function") fail("native-integration-orchestration-required");
        if (!host || typeof host.prepareAll !== "function" || typeof host.verifyAll !== "function") fail("native-integration-host-required");
        if (!coordinator || typeof coordinator.begin !== "function" || typeof coordinator.verify !== "function" || typeof coordinator.activate !== "function") fail("native-integration-coordinator-required");
        function planAndPrepare(bundle, sourceText, observation, renderSpecs, transaction) {
            var plan = orchestration.planAll(bundle, sourceText, observation), batch, tx, begun;
            if (!plan || plan.status !== "complete") return { status: plan && plan.status || "failed", plan: plan, batch: null };
            requireTransaction(transaction);
            tx = transaction;
            begun = coordinator.begin(tx.source, tx.expectedContents, tx.expectedNote, tx.requestId, candidateIds(renderSpecs));
            advanceExpectedState(tx, begun);
            batch = host.prepareAll(renderSpecs);
            return { status: "prepared", plan: plan, batch: batch, transaction: tx, durableBegin: begun };
        }
        function verify(prepared) {
            var tx, durable;
            if (!prepared || !prepared.batch || prepared.batch.status !== "prepared") fail("native-integration-not-prepared");
            requireTransaction(prepared.transaction);
            tx = prepared.transaction;
            prepared.batch = host.verifyAll(prepared.batch);
            if (!prepared.batch || prepared.batch.status !== "verified") fail("native-integration-not-verified");
            durable = coordinator.verify(tx.source, tx.expectedContents, tx.expectedNote, tx.requestId);
            advanceExpectedState(tx, durable);
            prepared.durableVerify = durable;
            prepared.status = "verified";
            return prepared;
        }
        function activate(source, expectedContents, expectedNote, requestId, verified, retireIds, discardedIds, removedLogicalSegmentIds) {
            var batch, bindings, records, tx, actualSource, actualContents, actualNote, actualRequest, i, logicalSegmentId;
            if (!verified || verified.status !== "verified" || !verified.batch || verified.batch.status !== "verified") fail("native-integration-activation-before-verify");
            requireTransaction(verified.transaction);
            tx = verified.transaction;
            actualSource = source || tx.source;
            actualContents = expectedContents == null ? tx.expectedContents : String(expectedContents);
            actualNote = expectedNote == null ? tx.expectedNote : String(expectedNote);
            actualRequest = requestId == null ? tx.requestId : String(requestId);
            if (actualSource !== tx.source || actualContents !== tx.expectedContents || actualNote !== tx.expectedNote || actualRequest !== tx.requestId) fail("native-integration-transaction-mismatch");
            batch = verified.batch;
            bindings = host.bindingsByLogicalSegmentId(batch);
            records = host.recordsByPhysicalId(batch);
            removedLogicalSegmentIds = removedLogicalSegmentIds || [];
            for (i = 0; i < removedLogicalSegmentIds.length; i++) {
                logicalSegmentId = removedLogicalSegmentIds[i];
                if (typeof logicalSegmentId !== "string" || !logicalSegmentId) fail("native-integration-removal-logical-id-required");
                if (Object.prototype.hasOwnProperty.call(bindings, logicalSegmentId)) fail("native-integration-removal-conflicts-with-binding");
                bindings[logicalSegmentId] = null;
            }
            return coordinator.activate(actualSource, actualContents, actualNote, actualRequest, bindings, records, retireIds || [], discardedIds || []);
        }
        function reconcileExisting(bundle, sourceText, observation, manifest) {
            var plan = orchestration.planAll(bundle, sourceText, observation), active = {}, physicalIds = [], key;
            if (!plan || plan.status !== "complete") return { status: plan && plan.status || "failed", plan: plan };
            if (!manifest || manifest.operation !== null) fail("native-integration-reconcile-manifest-not-finished");
            for (key in manifest.activeBindings) if (Object.prototype.hasOwnProperty.call(manifest.activeBindings, key)) { active[key] = manifest.activeBindings[key]; physicalIds.push(manifest.activeBindings[key]); }
            return { status: "reused", plan: plan, activeBindings: active, physicalIds: physicalIds };
        }
        return { planAndPrepare: planAndPrepare, verify: verify, activate: activate, reconcileExisting: reconcileExisting };
    }
    return { create: create };
}());
if (typeof module !== "undefined") module.exports = FormalAreaTextNativeIntegration;
