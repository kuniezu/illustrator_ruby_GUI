/* Pure helpers used by the A-H diagnostic tests. ES3-compatible on purpose. */
var FormalAreaTextNativeDiagnostic = (function () {
    function runTracking(values, verify) {
        var trials = [], i, result;
        for (i = 0; i < values.length; i++) {
            result = verify(values[i]);
            trials.push({ tracking: values[i], result: result });
            if (result && result.ok) return { ok: true, tracking: values[i], trials: trials };
            if (result && result.retryable === false) return { ok: false, reason: result.reason, trials: trials, stopped: true };
        }
        return { ok: false, reason: "no-fit", trials: trials, stopped: true };
    }
    function buildSummary(outcomes, order) {
        var out = [], i, id;
        for (i = 0; i < order.length; i++) { id = order[i]; out.push(id + " " + (outcomes[id] || "CAPABILITY_UNAVAILABLE")); }
        return out.join("\n");
    }
    function reportGate() {
        var complete = false, lines = [];
        return {
            add: function (line) { if (complete) throw Error("report-already-finalized"); lines.push(line); },
            finalize: function () { complete = true; return lines.join("\n"); },
            isComplete: function () { return complete; }
        };
    }
    function cleanupOnce(entry, remove) {
        if (!entry || entry.cleaned) return false;
        entry.cleaned = true; remove(entry); return true;
    }
    function transaction(state, action) {
        var copy = { active: state.active, queue: [], phase: state.phase }, result;
        for (var i = 0; i < state.queue.length; i++) copy.queue.push(state.queue[i]);
        try { result = action(copy); return result; } catch (e) { return { state: state, failed: true, reason: e.message || String(e) }; }
    }
    return { runTracking: runTracking, buildSummary: buildSummary, reportGate: reportGate, cleanupOnce: cleanupOnce, transaction: transaction };
}());
if (typeof module !== "undefined") module.exports = FormalAreaTextNativeDiagnostic;
