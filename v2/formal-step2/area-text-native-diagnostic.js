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
    function completionGate(finalize) {
        var done = false;
        return {
            complete: function (value) { if (done) return false; done = true; finalize(value); return true; },
            isDone: function () { return done; }
        };
    }
    function startsWith(value, prefix) {
        value = String(value || "");
        return value.substring(0, prefix.length) === prefix;
    }
    function parseReceiverResult(body, expected) {
        var text = String(body || ""), prefix, detail, parts, fields = {}, i, pair, key;
        if (startsWith(text, "CAPABILITY_UNAVAILABLE:")) {
            return { status: "CAPABILITY_UNAVAILABLE", reason: text.substring("CAPABILITY_UNAVAILABLE:".length) || "receiver-capability-unavailable" };
        }
        if (!startsWith(text, "PASS:")) return { status: "FAIL", reason: "unexpected-receiver-result" };
        detail = text.substring("PASS:".length);
        parts = detail.split(",");
        for (i = 0; i < parts.length; i++) {
            pair = parts[i].split("=");
            key = pair.shift();
            if (key) fields[key] = pair.join("=");
        }
        for (key in expected) {
            if (expected.hasOwnProperty(key) && String(fields[key]) !== String(expected[key])) {
                return { status: "FAIL", reason: "receiver-mismatch-" + key };
            }
        }
        if (!fields.verify || !fields.fontName) return { status: "FAIL", reason: "receiver-verification-incomplete" };
        return { status: "PASS", detail: detail, fields: fields };
    }
    function buildReceiverBody(specLiteral, rootLiteral) {
        return "(function(){var receivedSpec=" + specLiteral + ";var root=" + rootLiteral + ";var rs=null;var backend=null;var candidate=null;var disposable=null;var result='';var fontName='';try{$.evalFile(File(root+'/formal-step2/area-text-render-spec.js'));$.evalFile(File(root+'/formal-step2/area-text-native.js'));$.evalFile(File(root+'/formal-step2/area-text-native-backend.jsx'));rs=FormalAreaTextRenderSpec.validate(receivedSpec);if(!rs.ok)throw Error('received-spec-invalid:'+rs.reason);var backendSpec=FormalAreaTextRenderSpec.backendSpec(receivedSpec);disposable=app.documents.add();backend=FormalAreaTextNativeBackend(disposable,disposable.layers[0]);candidate=backend.prepareCandidate(backendSpec);rs=backend.verifyCandidate(candidate,backendSpec);if(!rs.ok&&rs.retryable!==false)rs=backend.tryTracking(candidate,backendSpec);if(!rs.ok)throw Error('candidate-unverified:'+rs.reason);fontName=String(candidate.frame.textRange.characterAttributes.textFont.name);result='PASS:schema='+receivedSpec.schema+',rendererMode='+receivedSpec.rendererMode+',rendererVersion='+receivedSpec.rendererVersion+',geometryVersion='+receivedSpec.geometryVersion+',requestId='+receivedSpec.requestId+',sourceFrameId='+receivedSpec.sourceFrameId+',annotationId='+receivedSpec.annotationId+',logicalSegmentId='+receivedSpec.logicalSegmentId+',generationId='+receivedSpec.generationId+',physicalId='+receivedSpec.physicalId+',reading='+receivedSpec.reading+',singleCharacter='+receivedSpec.singleCharacter+',finalGeometry='+receivedSpec.finalLeft+':'+receivedSpec.finalTop+':'+receivedSpec.finalWidth+':'+receivedSpec.finalHeight+',verify='+rs.reason+',fontName='+fontName;}catch(e){result='CAPABILITY_UNAVAILABLE:'+String(e.message||e);}finally{try{if(backend&&candidate)backend.disposeCandidate(candidate);}catch(e1){}try{if(disposable)disposable.close(SaveOptions.DONOTSAVECHANGES);}catch(e2){}}result;})();";
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
    return { runTracking: runTracking, buildSummary: buildSummary, reportGate: reportGate, completionGate: completionGate, parseReceiverResult: parseReceiverResult, buildReceiverBody: buildReceiverBody, cleanupOnce: cleanupOnce, transaction: transaction };
}());
if (typeof module !== "undefined") module.exports = FormalAreaTextNativeDiagnostic;
