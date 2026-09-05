/* Illustrator Adapter: deliberately limited to one horizontal, untransformed point frame. */
function AstraLiteIllustrator(doc, source) {
    var Store = AstraLite.Store;
    function fail(s) { throw new Error(s); }
    function finite(n) { return typeof n === "number" && isFinite(n); }
    function editable(item) {
        var p = item;
        while (p && p.typename !== "Document") {
            if (p.typename === "Layer") {
                if (p.locked || !p.visible) fail("locked-or-hidden-layer");
            } else {
                if (p.locked || p.hidden) fail("locked-or-hidden-item");
                if (p.typename === "GroupItem" && p.clipped) fail("clipping-not-supported");
            }
            p = p.parent; // Property failures propagate; unknown is not treated as safe.
        }
    }
    function snapshot() {
        if (app.activeDocument !== doc) fail("active-document-changed");
        editable(source);
        return {text: String(source.contents), note: String(source.note)};
    }
    function inspect(b) {
        snapshot();
        var frames = doc.textFrames, seen = [], sources = [], outputs = [], i, j, item, note, bundle, t, repeated;
        for (i = 0; i < frames.length; i++) {
            item = frames[i]; repeated = false;
            for (j = 0; j < seen.length; j++) if (seen[j] === item) repeated = true;
            if (repeated) continue; // Object revisit only. Never dedupe by persistent ID.
            seen.push(item); note = String(item.note);
            bundle = Store.read(note); t = Store.parseTag(note);
            if (item === source && t) fail("generated-ruby-is-not-source");
            if (bundle && bundle.sourceFrameId === b.sourceFrameId) sources.push(item);
            if (t && t.sourceFrameId === b.sourceFrameId) {
                if (t.annotationId !== b.annotation.annotationId || note !== Store.tag(b)) fail("conflicting-output-identity");
                outputs.push(item);
            }
        }
        if (sources.length > 1 || (sources.length === 1 && sources[0] !== source)) fail("source-id-collision");
        if (outputs.length > 1) fail("output-id-collision");
        for (i = 0; i < outputs.length; i++) editable(outputs[i]);
        return outputs;
    }
    function writeNote(expected, next) {
        if (String(source.note) !== expected) fail("store-concurrent-change");
        try {
            source.note = next;
            if (String(source.note) !== next) fail("store-readback-mismatch");
        } catch (e) {
            try { source.note = expected; if (String(source.note) !== expected) fail("restore-mismatch"); }
            catch (restore) { fail("store-recovery-required: " + e.message + "; " + restore.message); }
            fail("store-write-failed-restored: " + e.message);
        }
    }
    function observe() {
        var s = snapshot(), range = source.textRange, chars = range.characters, i, c, lines = [], cursor = 0, line;
        if (source.nextFrame || source.previousFrame) return {status: "unresolved", reasons: ["threaded-text-not-supported"]};
        // Conservative supported subset. Unicode outside it remains stored, never mis-indexed.
        if (/[\uD800-\uDFFF\u0300-\u036f\u3099\u309a\uFE00-\uFE0F]/.test(s.text)) return {status: "unresolved", reasons: ["unicode-index-map-unverified"]};
        if (chars.length !== s.text.length || range.end - range.start !== chars.length) return {status: "unresolved", reasons: ["character-count-mismatch"]};
        for (i = 0; i < chars.length; i++) {
            c = chars[i];
            if (String(c.contents) !== s.text.charAt(i) || c.start !== range.start + i || c.end !== range.start + i + 1)
                return {status: "unresolved", reasons: ["character-index-mismatch"]};
        }
        for (i = 0; i < range.lines.length; i++) {
            line = range.lines[i];
            var start = line.start - range.start, end = line.end - range.start;
            if (start !== cursor || end < start || end > s.text.length || String(line.contents) !== s.text.substring(start, end))
                return {status: "unresolved", reasons: ["line-map-unverified"]};
            lines.push({start: start, end: end, contents: String(line.contents)}); cursor = end;
        }
        if (cursor !== s.text.length) return {status: "unresolved", reasons: ["line-map-gap-or-overset"]};
        var result = {status: "unresolved", reasons: [], lines: lines, indexCheck: "runtime-checked; real-machine-unverified"};
        if (source.parent.typename !== "Layer") {
            result.reasons = ["gate-ab-direct-layer-only"]; return result;
        }
        if (source.kind !== TextType.POINTTEXT || source.orientation !== TextOrientation.HORIZONTAL || lines.length !== 1 || /[\r\n\t]/.test(s.text)) {
            result.reasons = ["gate-ab-horizontal-single-line-point-text-only"]; return result;
        }
        var m = source.matrix, tolerance = 0.00001;
        if (!finite(m.mValueA) || !finite(m.mValueB) || !finite(m.mValueC) || !finite(m.mValueD) ||
            Math.abs(m.mValueA - 1) > tolerance || Math.abs(m.mValueD - 1) > tolerance || Math.abs(m.mValueB) > tolerance || Math.abs(m.mValueC) > tolerance) {
            result.reasons = ["transformed-source-not-supported"]; return result;
        }
        var attr = chars[0].characterAttributes, baseSize = attr.size;
        for (i = 0; i < chars.length; i++) {
            c = chars[i].characterAttributes;
            if (c.size !== baseSize || c.textFont.name !== attr.textFont.name || c.baselineShift !== 0 || c.rotation !== 0 || c.horizontalScale !== 100 || c.verticalScale !== 100) {
                result.reasons = ["mixed-or-transformed-characters-not-supported"]; return result;
            }
        }
        var temp = null, outline = null, bounds, cleanup = "";
        try {
            temp = source.duplicate(); outline = temp.createOutline(); temp = null;
            bounds = outline.geometricBounds;
            if (!finite(bounds[0]) || !finite(bounds[1]) || !finite(bounds[2]) || !finite(bounds[3]) ||
                !(bounds[2] > bounds[0]) || !(bounds[1] > bounds[3]) || !finite(baseSize) || !(baseSize > 0)) fail("empty-or-invalid-measurement");
            result.metrics = {left: bounds[0], top: bounds[1], width: bounds[2] - bounds[0], baseSize: baseSize,
                fontName: attr.textFont.name};
            result.status = "complete";
        } finally {
            if (outline) try { outline.remove(); } catch (e1) { cleanup += "outline-cleanup-failed;"; }
            if (temp) try { temp.remove(); } catch (e2) { cleanup += "duplicate-cleanup-failed;"; }
            if (cleanup) fail(cleanup);
        }
        return result;
    }
    function capture(item) {
        var a = item.textRange.characterAttributes;
        return {contents: item.contents, note: item.note, left: item.left, top: item.top,
            size: a.size, font: a.textFont, color: a.fillColor, tracking: a.tracking,
            orientation: item.orientation, justification: item.textRange.paragraphs[0].justification};
    }
    function restore(item, old) {
        item.contents = old.contents;
        var a = item.textRange.characterAttributes;
        a.size = old.size; a.textFont = old.font; a.fillColor = old.color; a.tracking = old.tracking;
        item.orientation = old.orientation; item.textRange.paragraphs[0].justification = old.justification;
        item.left = old.left; item.top = old.top; item.note = old.note;
    }
    function reconcile(b, p) {
        if (p.status !== "complete") fail("refuse-incomplete-plan");
        var outputs = inspect(b), item = outputs.length ? outputs[0] : null;
        if (p.desired.length === 0) {
            if (item) item.remove();
            if (inspect(b).length !== 0) fail("suppress-readback-failed");
            return;
        }
        if (p.desired.length !== 1) fail("gate-ab-one-output-only");
        var d = p.desired[0], old = item ? capture(item) : null, created = false;
        try {
            if (!item) { item = source.layer.textFrames.add(); created = true; }
            item.note = Store.tag(b);
            if (String(item.note) !== Store.tag(b)) fail("output-tag-readback-failed");
            item.contents = d.reading; item.orientation = TextOrientation.HORIZONTAL;
            var a = item.textRange.characterAttributes, size = d.metrics.baseSize * d.style.sizeRatio;
            a.size = size; a.textFont = app.textFonts.getByName(d.metrics.fontName);
            a.fillColor = source.textRange.characters[0].characterAttributes.fillColor; a.tracking = 0;
            item.textRange.paragraphs[0].justification = Justification.LEFT;
            var offset = d.mode === "auto_offset" ? d.offset : {inlineEm: 0, blockEm: 0};
            var left = d.metrics.left + (d.metrics.width - item.width) / 2 + offset.inlineEm * d.metrics.baseSize;
            var top = d.metrics.top + size + d.metrics.baseSize * (d.style.gapRatio + offset.blockEm);
            item.left = left; item.top = top;
            if (String(item.contents) !== d.reading || Math.abs(item.left - left) > 0.01 || Math.abs(item.top - top) > 0.01 || Math.abs(a.size - size) > 0.01) fail("output-readback-failed");
            if (inspect(b).length !== 1) fail("output-count-mismatch");
        } catch (e) {
            try { if (created && item) item.remove(); else if (item && old) restore(item, old); }
            catch (recovery) { fail("render-recovery-required: " + e.message + "; " + recovery.message); }
            throw e;
        }
    }
    return {snapshot: snapshot, inspect: inspect, writeNote: writeNote, observe: observe, reconcile: reconcile};
}
