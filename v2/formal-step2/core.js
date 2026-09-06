/* Formal Step 2 orchestration: one logical annotation, several render segments. */
function FormalStep2Apply(port, context, edit, hints) {
    function trace(message) { if (typeof $ !== "undefined" && $.writeln) $.writeln(message); }
    var before = port.snapshot();
    var bundle = FormalStep1.clone(context.bundle);
    var annotation = bundle.annotation;
    var observation, decision, saved;
    if (before.text !== context.snapshot.text || before.note !== context.snapshot.note) throw Error("stale-source");
    port.inspect(bundle);
    annotation.reading = edit.reading;
    annotation.enabled = edit.enabled;
    annotation.readingConfirmed = edit.readingConfirmed;
    annotation.placementMode = edit.placementMode;
    bundle.splitHints = hints || context.bundle.splitHints || [];
    trace("formal-step2 apply:start");
    try {
        observation = annotation.enabled ? port.observe() : {status: "complete", lines: [{start: 0, end: before.text.length}]};
    } catch (e) {
        observation = {status: "failed", reasons: ["observation-failed:" + (e.message || e)]};
    }
    trace("formal-step2 observe:status=" + observation.status);
    if (observation.status !== "complete" && port.diagnostics) {
        var observationDiagnostics = port.diagnostics(), diagnosticIndex;
        for (diagnosticIndex = 0; diagnosticIndex < observationDiagnostics.length; diagnosticIndex++) trace("formal-step2 observe:diagnostic=" + observationDiagnostics[diagnosticIndex]);
    }
    if (observation.status === "failed") {
        bundle.renderStatus = "failed";
        bundle.annotation.reviewReasons = observation.reasons;
        port.store(before.note, bundle);
        return {bundle: bundle, decision: {status: "failed", reasons: observation.reasons}, observation: observation};
    }
    if (observation.status !== "complete") {
        bundle.revision++;
        bundle.renderStatus = "unresolved";
        bundle.annotation.reviewReasons = observation.reasons || ["observation-unavailable"];
        port.store(before.note, bundle);
        return {bundle: bundle, decision: {status: "unresolved", reasons: bundle.annotation.reviewReasons}, observation: observation};
    }
    decision = FormalSegments.plan(before.text, annotation.reading, observation.lines, bundle.splitHints, bundle.revision, bundle.revision);
    trace("formal-step2 plan:status=" + decision.status);
    bundle.revision++;
    if (!annotation.enabled) decision = {status: "complete", segments: []};
    if (decision.status !== "complete") {
        bundle.renderStatus = "unresolved";
        bundle.annotation.reviewReasons = decision.reasons;
        port.store(before.note, bundle);
        return {bundle: bundle, decision: decision};
    }
    bundle.renderStatus = "pending";
    bundle.annotation.reviewReasons = [];
    saved = port.store(before.note, bundle);
    trace("formal-step2 store:pending-written");
    try {
        trace("formal-step2 reconcile:start");
        port.reconcile(bundle, decision);
        bundle.renderStatus = "complete";
        trace("formal-step2 reconcile:complete");
    } catch (e2) {
        bundle.renderStatus = "failed";
        bundle.annotation.reviewReasons = ["render-failed:" + (e2.message || e2)];
    }
    port.store(saved, bundle);
    trace("formal-step2 store:final-written");
    return {bundle: bundle, decision: decision};
}
if (typeof module !== "undefined") module.exports = FormalStep2Apply;
