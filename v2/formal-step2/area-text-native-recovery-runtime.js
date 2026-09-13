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
    function classifyFailure(error, readAuthoritative) {
        var reason = error && error.message ? String(error.message) : String(error), snapshot = null;
        if (typeof readAuthoritative === "function") {
            try { snapshot = readAuthoritative(); } catch (ignore) { snapshot = null; }
        }
        if (snapshot && snapshot.noteVerified === true) return {kind: "recovery", reason: reason, note: snapshot.note, noteVerified: true, retrySafe: false};
        return {kind: "transport-uncertain", reason: "recovery-state-uncertain:" + reason, note: null, noteVerified: false, retrySafe: false};
    }
    return { converge: converge, classifyFailure: classifyFailure };
}());
if (typeof module !== "undefined") module.exports = FormalAreaTextNativeRecoveryRuntime;
