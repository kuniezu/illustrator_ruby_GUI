/* Minimal area-text adapter using observed line geometry. */
function FormalStep2Adapter(doc, source) {
    var trace = [];
    function mark(stage, detail) { trace.push(stage + (detail ? ":" + detail : "")); }
    function snapshot() { if (app.activeDocument !== doc) throw Error("document-changed"); return {text: String(source.contents), note: String(source.note)}; }
    function inspect(bundle) {
        var out = [], i, item, parts, note;
        for (i = 0; i < doc.textFrames.length; i++) {
            item = doc.textFrames[i]; note = String(item.note);
            if (note.indexOf("formal-step2-output:v1;") !== 0) continue;
            parts = note.split(";");
            if (parts.length !== 4 || parts[1] !== bundle.sourceFrameId || parts[2] !== bundle.annotation.annotationId) throw Error("output-id-collision");
            out.push(item);
        }
        return out;
    }
    function store(expected, bundle) {
        if (String(source.note) !== String(expected)) throw Error("store-concurrent-change");
        var next = FormalStep2Store.write(expected, bundle); source.note = next;
        if (String(source.note) !== String(next)) throw Error("store-readback-mismatch");
        return next;
    }
    function observe() {
        mark("observe:start", "kind=" + String(source.kind) + ",orientation=" + String(source.orientation));
        if (source.kind !== TextType.AREATEXT || source.orientation !== TextOrientation.HORIZONTAL) return {status: "unresolved", reasons: ["area-text-horizontal-only"]};
        var range = source.textRange, lines = [], i, line, total = String(source.contents).length, leading = range.characters[0].characterAttributes.leading;
        if (typeof leading !== "number" || !isFinite(leading)) return {status: "unresolved", reasons: ["leading-unavailable"]};
        for (i = 0; i < range.lines.length; i++) {
            line = range.lines[i];
            var start = line.start - range.start, end = line.end - range.start;
            if (start < 0 || end <= start || end > total || !line.characters.length) return {status: "unresolved", reasons: ["line-map-unverified"]};
            lines.push({start: start, end: end, geometry: {left: source.left, top: source.top - i * leading, width: source.width * (end - start) / total, baseSize: line.characters[0].characterAttributes.size}});
        }
        mark("observe.line-map", "complete"); return {status: "complete", lines: lines};
    }
    function reconcile(bundle, decision) {
        var old = inspect(bundle), wanted = decision.segments || [], i, item, geometry, count, delta, tracking;
        for (i = old.length - 1; i >= wanted.length; i--) old[i].remove();
        for (i = 0; i < wanted.length; i++) {
            item = old[i] || source.layer.textFrames.add(); geometry = wanted[i].geometry;
            if (!geometry) throw Error("segment-geometry-unavailable");
            item.note = "formal-step2-output:v1;" + bundle.sourceFrameId + ";" + bundle.annotation.annotationId + ";" + wanted[i].renderSegmentId;
            item.contents = wanted[i].reading;
            item.textRange.characterAttributes.size = geometry.baseSize * .5;
            count = String(wanted[i].reading).length; delta = geometry.width - item.width;
            tracking = count > 1 && geometry.baseSize > 0 ? delta / (geometry.baseSize * .5 * (count - 1)) * 1000 : 0;
            if (tracking < -400) tracking = -400; if (tracking > 400) tracking = 400;
            item.textRange.characterAttributes.tracking = tracking;
            if (tracking) mark("render.width-fit", "tracking=" + tracking);
            item.left = geometry.left + (geometry.width - item.width) / 2; item.top = geometry.top;
        }
        mark("render:update", "complete");
    }
    return {snapshot: snapshot, inspect: inspect, store: store, observe: observe, reconcile: reconcile, diagnostics: function() { return trace.slice(); }};
}
