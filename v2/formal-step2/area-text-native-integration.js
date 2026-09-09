/* Production-adjacent Gate D integration seam. No UI or production persistence wiring. */
var FormalAreaTextNativeIntegration = (function () {
    function fail(message) { throw Error(message); }
    function create(orchestration, host, coordinator) {
        if (!orchestration || typeof orchestration.planAll !== "function") fail("native-integration-orchestration-required");
        if (!host || typeof host.prepareAll !== "function" || typeof host.verifyAll !== "function") fail("native-integration-host-required");
        if (!coordinator || typeof coordinator.activate !== "function") fail("native-integration-coordinator-required");
        function planAndPrepare(bundle, sourceText, observation, renderSpecs) {
            var plan = orchestration.planAll(bundle, sourceText, observation), batch;
            if (!plan || plan.status !== "complete") return { status: plan && plan.status || "failed", plan: plan, batch: null };
            batch = host.prepareAll(renderSpecs);
            return { status: "prepared", plan: plan, batch: batch };
        }
        function verify(prepared) {
            if (!prepared || !prepared.batch || prepared.batch.status !== "prepared") fail("native-integration-not-prepared");
            prepared.batch = host.verifyAll(prepared.batch);
            if (!prepared.batch || prepared.batch.status !== "verified") fail("native-integration-not-verified");
            prepared.status = "verified";
            return prepared;
        }
        function activate(source, expectedContents, expectedNote, requestId, verified, retireIds, discardedIds) {
            var batch, bindings, records;
            if (!verified || verified.status !== "verified" || !verified.batch || verified.batch.status !== "verified") fail("native-integration-activation-before-verify");
            batch = verified.batch;
            bindings = host.bindingsByLogicalSegmentId(batch);
            records = host.recordsByPhysicalId(batch);
            return coordinator.activate(source, expectedContents, expectedNote, requestId, bindings, records, retireIds || [], discardedIds || []);
        }
        return { planAndPrepare: planAndPrepare, verify: verify, activate: activate };
    }
    return { create: create };
}());
if (typeof module !== "undefined") module.exports = FormalAreaTextNativeIntegration;
