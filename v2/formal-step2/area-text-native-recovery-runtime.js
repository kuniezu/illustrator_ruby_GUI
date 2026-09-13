/* ES3-safe production recovery orchestration shared by the BridgeTalk path and tests. */
var FormalAreaTextNativeRecoveryRuntime = (function () {
    function fail(message) { throw Error(message); }
    function converge(state, sourceFrameId, resolver, step, report, limit) {
        if (typeof FormalAreaTextNativeRecovery === "undefined") fail("native-recovery-core-unavailable");
        if (typeof step !== "function") fail("native-recovery-runtime-step-required");
        return FormalAreaTextNativeRecovery.converge(state, sourceFrameId, resolver, function (action, current) {
            if (typeof report === "function") report(action, current);
            return step(action, current);
        }, limit == null ? 8 : limit);
    }
    return { converge: converge };
}());
if (typeof module !== "undefined") module.exports = FormalAreaTextNativeRecoveryRuntime;
