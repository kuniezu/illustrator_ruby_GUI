/* Minimal area-text adapter using observed line geometry. */
var FORMAL_STEP2_TRACKING_FLOOR = -400;
function FormalStep2Adapter(doc, source) {
    var trace = [], cleanupFailed = false;
    function mark(stage, detail) { trace.push(stage + (detail ? ":" + detail : "")); }
    function markCleanupFailure(stage, error) { cleanupFailed = true; mark(stage, "cleanup-failed" + (error ? ":" + (error.message || error) : "")); }
    function snapshot() { if (app.activeDocument !== doc) throw Error("document-changed"); return {text: String(source.contents), note: String(source.note)}; }
    function inspect(bundle) {
        var out = [], seen = {}, i, item, parts, note;
        for (i = 0; i < doc.textFrames.length; i++) {
            item = doc.textFrames[i]; note = String(item.note);
            if (note.indexOf("formal-step2-output:v1;") !== 0) continue;
            parts = note.split(";");
            if (parts.length !== 4) throw Error("output-id-collision");
            if (parts[1] !== bundle.sourceFrameId || parts[2] !== bundle.annotation.annotationId) continue;
            if (seen[parts[3]]) throw Error("output-id-collision");
            seen[parts[3]] = true;
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
    function measure(text, sample) {
        var probe;
        try {
            probe = source.layer.textFrames.add();
            probe.kind = TextType.POINTTEXT;
            probe.contents = text;
            probe.textRange.characterAttributes.textFont = sample.characterAttributes.textFont;
            probe.textRange.characterAttributes.size = sample.characterAttributes.size;
            probe.textRange.characterAttributes.tracking = sample.characterAttributes.tracking;
            probe.position = [source.left, source.top];
            var bounds = probe.visibleBounds;
            if (!bounds || bounds.length < 4) bounds = probe.geometricBounds;
            if (!bounds || bounds.length < 4) return null;
            var result = {left: bounds[0], top: bounds[1], width: bounds[2] - bounds[0], height: bounds[1] - bounds[3]};
            if (typeof result.width !== "number" || !isFinite(result.width) || result.width <= 0) return null;
            return result;
        } catch (e) {
            mark("observe.measurement", "failed:" + (e.message || e));
            return null;
        } finally {
            if (probe) try { probe.remove(); } catch (ignore) { markCleanupFailure("observe.measurement", ignore); }
        }
    }
    function outlineLines(leading) {
        var duplicate, outline, items = [], clusters = [], i, j, bounds, glyph, center, placed, outlined = false;
        try {
            duplicate = source.duplicate(source.layer, ElementPlacement.PLACEATEND);
            outline = duplicate.createOutline(); outlined = true;
            for (i = 0; i < outline.pageItems.length; i++) {
                bounds = outline.pageItems[i].visibleBounds;
                if (!bounds || bounds.length < 4) bounds = outline.pageItems[i].geometricBounds;
                if (!bounds || bounds.length < 4) continue;
                glyph = {left: bounds[0], top: bounds[1], right: bounds[2], bottom: bounds[3], center: (bounds[1] + bounds[3]) / 2};
                items.push(glyph);
            }
            items.sort(function (a, b) { return b.center - a.center; });
            for (i = 0; i < items.length; i++) {
                glyph = items[i]; placed = false;
                for (j = 0; j < clusters.length; j++) if (Math.abs(glyph.center - clusters[j].center) <= leading * .5) {
                    clusters[j].left = Math.min(clusters[j].left, glyph.left); clusters[j].top = Math.max(clusters[j].top, glyph.top); clusters[j].right = Math.max(clusters[j].right, glyph.right); clusters[j].bottom = Math.min(clusters[j].bottom, glyph.bottom); clusters[j].center = (clusters[j].center * clusters[j].count + glyph.center) / (clusters[j].count + 1); clusters[j].count++; placed = true; break;
                }
                if (!placed) clusters.push({left: glyph.left, top: glyph.top, right: glyph.right, bottom: glyph.bottom, center: glyph.center, count: 1});
            }
            mark("observe.outline", "items=" + items.length + ",clusters=" + clusters.length + ",sourceLines=" + source.textRange.lines.length);
            return clusters.length === source.textRange.lines.length ? clusters : null;
        } catch (e) { mark("observe.outline", "failed:" + (e.message || e)); return null; }
        finally {
            if (outline && outline.parent) try { outline.remove(); } catch (ignore) { markCleanupFailure("observe.outline", ignore); }
            if (!outlined && duplicate && duplicate.parent) try { duplicate.remove(); } catch (ignoreDuplicate) { markCleanupFailure("observe.outline", ignoreDuplicate); }
        }
    }
    function observe() {
        mark("observe:start", "kind=" + String(source.kind) + ",orientation=" + String(source.orientation));
        if (source.kind !== TextType.AREATEXT || source.orientation !== TextOrientation.HORIZONTAL) return {status: "unresolved", reasons: ["area-text-horizontal-only"]};
        var range = source.textRange, lines = [], i, line, total = String(source.contents).length, leading = range.characters[0].characterAttributes.leading;
        if (typeof leading !== "number" || !isFinite(leading)) return {status: "unresolved", reasons: ["leading-unavailable"]};
        var visualLines = outlineLines(leading);
        if (!visualLines) return {status: "unresolved", reasons: ["outline-line-geometry-unavailable"]};
        if (cleanupFailed) return {status: "unresolved", reasons: ["temporary-object-cleanup-failed"]};
        for (i = 0; i < range.lines.length; i++) {
            line = range.lines[i];
            var start = line.start - range.start, end = line.end - range.start;
            if (start < 0 || end <= start || end > total || !line.characters.length) return {status: "unresolved", reasons: ["line-map-unverified"]};
            var first = line.characters[0], measured = measure(String(source.contents).substring(start, end), first), charWidths = [], c, charMeasured;
            if (!measured) return {status: "unresolved", reasons: ["measurement-unavailable"]};
            if (cleanupFailed) return {status: "unresolved", reasons: ["temporary-object-cleanup-failed"]};
            for (c = start; c < end; c++) { charMeasured = measure(String(source.contents).charAt(c), first); if (!charMeasured) return {status: "unresolved", reasons: ["character-measurement-unavailable"]}; charWidths.push(charMeasured.width); }
            var gap = first.characterAttributes.size * .15, visual = visualLines[i];
            var rubyTop = visual.top + gap; /* Illustrator document Y increases upward for this horizontal AreaText. */
            mark("observe.measurement", "line=" + i + ",left=" + visual.left + ",glyphTop=" + visual.top + ",rubyTop=" + rubyTop + ",width=" + measured.width + ",baseSize=" + first.characterAttributes.size + ",leading=" + leading + ",gap=" + gap + ",cleanup=required");
            lines.push({start: start, end: end, geometry: {left: visual.left, top: rubyTop, width: measured.width, baseSize: first.characterAttributes.size, measuredLeft: measured.left, measuredTop: visual.top, measuredWidth: measured.width, leading: leading, gap: gap, visualRight: visual.right, charWidths: charWidths}});
        }
        mark("observe.line-map", "complete"); return {status: "complete", kind: source.kind, orientation: source.orientation, lines: lines};
    }
    function reconcile(bundle, decision, created) {
        var old = inspect(bundle), wanted = decision.segments || [], i, item, geometry, count, delta, tracking;
        for (i = old.length - 1; i >= wanted.length; i--) old[i].remove();
        for (i = 0; i < wanted.length; i++) {
            item = old[i] || source.layer.textFrames.add(); if (!old[i] && created) created.push(item); geometry = wanted[i].geometry;
            if (!geometry) throw Error("segment-geometry-unavailable");
            item.note = "formal-step2-output:v1;" + bundle.sourceFrameId + ";" + bundle.annotation.annotationId + ";" + wanted[i].renderSegmentId;
            item.contents = wanted[i].reading;
            item.textRange.characterAttributes.size = geometry.baseSize * .5;
            item.textRange.characterAttributes.tracking = 0;
            count = String(wanted[i].reading).length; delta = geometry.width - item.width;
            tracking = count > 1 && geometry.baseSize > 0 ? delta / (geometry.baseSize * .5 * (count - 1)) * 1000 : 0;
            if (tracking < FORMAL_STEP2_TRACKING_FLOOR) tracking = FORMAL_STEP2_TRACKING_FLOOR; if (tracking > 400) tracking = 400;
            item.textRange.characterAttributes.tracking = tracking;
            if (tracking) mark("render.width-fit", "tracking=" + tracking);
            item.left = geometry.left + (geometry.width - item.width) / 2; item.top = geometry.top;
            var rubyBounds = item.visibleBounds;
            if (!rubyBounds || rubyBounds.length < 4) rubyBounds = item.geometricBounds;
            if (!rubyBounds || rubyBounds.length < 4 || typeof geometry.measuredTop !== "number") throw Error("ruby-bounds-unavailable");
            var desiredBottom = geometry.measuredTop + geometry.gap, deltaY = desiredBottom - rubyBounds[3];
            mark("render.vertical-fit.before", "rubyBottom=" + rubyBounds[3] + ",desiredBottom=" + desiredBottom + ",deltaY=" + deltaY + ",itemTop=" + item.top);
            item.top += deltaY;
            rubyBounds = item.visibleBounds;
            if (!rubyBounds || rubyBounds.length < 4) rubyBounds = item.geometricBounds;
            if (!rubyBounds || rubyBounds.length < 4) throw Error("ruby-bounds-unavailable-after-fit");
            var residual = rubyBounds[3] - desiredBottom;
            mark("render.vertical-fit.after", "rubyBottom=" + rubyBounds[3] + ",desiredBottom=" + desiredBottom + ",residual=" + residual + ",itemTop=" + item.top);
            if (Math.abs(residual) > .5) throw Error("ruby-bottom-gap-unverified");
            mark("render.vertical-fit", "glyphTop=" + geometry.measuredTop + ",rubyBottom=" + rubyBounds[3] + ",desiredBottom=" + desiredBottom + ",gap=" + geometry.gap);
        }
        mark("render:update", "complete");
    }
    function managedItems(sourceFrameId) {
        var result = [], i, item, note, parts;
        for (i = 0; i < doc.textFrames.length; i++) {
            item = doc.textFrames[i]; note = String(item.note);
            if (note.indexOf("formal-step2-output:v1;") !== 0) continue;
            parts = note.split(";");
            if (parts.length === 4 && parts[1] === sourceFrameId) result.push(item);
        }
        return result;
    }
    function snapshotManaged(sourceFrameId, owned) {
        var result = [], items = managedItems(sourceFrameId), i, item, parts;
        for (i = 0; i < items.length; i++) {
            item = items[i];
            parts = String(item.note).split(";");
            if (owned && !owned[parts[2]]) continue;
            result.push({note: String(item.note), contents: String(item.contents), size: item.textRange.characterAttributes.size, tracking: item.textRange.characterAttributes.tracking, left: item.left, top: item.top});
        }
        return result;
    }
    function removeStaleManaged(sourceFrameId, plans) {
        var desired = {}, owned = {}, items = managedItems(sourceFrameId), i, j, plan, segment, key, parts;
        for (i = 0; i < plans.length; i++) {
            plan = plans[i];
            owned[plan.annotationId] = true;
            for (j = 0; j < (plan.decision.segments || []).length; j++) {
                segment = plan.decision.segments[j];
                desired[plan.annotationId + ";" + segment.renderSegmentId] = true;
            }
        }
        for (i = items.length - 1; i >= 0; i--) {
            parts = String(items[i].note).split(";");
            key = parts.length === 4 ? parts[2] + ";" + parts[3] : "";
            if (owned[parts[2]] && !desired[key]) items[i].remove();
        }
    }
    function restoreManaged(sourceFrameId, saved, owned) {
        var items = managedItems(sourceFrameId), i, item, parts, restored;
        for (i = items.length - 1; i >= 0; i--) { parts = String(items[i].note).split(";"); if (!owned || owned[parts[2]]) items[i].remove(); }
        for (i = 0; i < saved.length; i++) {
            restored = source.layer.textFrames.add();
            restored.note = saved[i].note;
            restored.contents = saved[i].contents;
            restored.textRange.characterAttributes.size = saved[i].size;
            restored.textRange.characterAttributes.tracking = saved[i].tracking;
            restored.left = saved[i].left;
            restored.top = saved[i].top;
        }
    }
    function transaction(sourceFrameId, plans, commit) {
        var owned = {}, saved, savedNote = String(source.note), created = [], i, plan, proxy, rollbackErrors = [];
        for (i = 0; i < plans.length; i++) owned[plans[i].annotationId] = true;
        saved = snapshotManaged(sourceFrameId, owned);
        try {
            for (i = 0; i < plans.length; i++) {
                plan = plans[i];
                proxy = {sourceFrameId: sourceFrameId, annotation: {annotationId: plan.annotationId}};
                reconcile(proxy, plan.decision, created);
            }
            removeStaleManaged(sourceFrameId, plans);
            if (commit) commit();
        } catch (error) {
            for (i = created.length - 1; i >= 0; i--) try { if (created[i].parent) created[i].remove(); } catch (createdError) { rollbackErrors.push("created=" + (createdError.message || createdError)); }
            try { restoreManaged(sourceFrameId, saved, owned); } catch (rollbackError) { rollbackErrors.push("outputs=" + (rollbackError.message || rollbackError)); }
            try { source.note = savedNote; if (String(source.note) !== savedNote) throw Error("source-note-readback-mismatch"); } catch (rollbackNoteError) { rollbackErrors.push("note=" + (rollbackNoteError.message || rollbackNoteError)); }
            if (rollbackErrors.length) mark("render:rollback-failed", rollbackErrors.join(" | ")); else mark("render:rollback", "complete");
            if (rollbackErrors.length) throw Error((error.message || error) + " / rollback-failed: " + rollbackErrors.join(" | "));
            throw error;
        }
    }
    function renderAndStoreTransaction(sourceFrameId, plans, commit) { transaction(sourceFrameId, plans, commit); }
    return {snapshot: snapshot, inspect: inspect, store: store, observe: observe, reconcile: reconcile, renderAndStoreTransaction: renderAndStoreTransaction, diagnostics: function() { return trace.slice(); }};
}
