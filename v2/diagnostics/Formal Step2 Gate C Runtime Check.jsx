#target illustrator
#include "../formal-step1/core.js"
#include "../formal-step1/store.js"
#include "../formal-step2/segments.js"
#include "../formal-step2/store.js"
#include "../formal-step2/adapter.jsx"

(function () {
    var report = [], source, adapter, bundle, observation, decision, reading, boundary, unmanaged, original, baselineFrames, originalManaged = [];
    function result(label, ok, detail) { report.push((ok ? "PASS " : "FAIL ") + label + (detail ? ": " + detail : "")); }
    function manual(label) { report.push("MANUAL_REQUIRED " + label); }
    function managedCount() { return adapter.inspect(bundle).length; }
    function findManaged() {
        var found = [], i, item, parts, note;
        for (i = 0; i < source.parent.textFrames.length; i++) {
            item = source.parent.textFrames[i]; note = String(item.note);
            if (note.indexOf("formal-step2-output:v1;") !== 0) continue;
            parts = note.split(";");
            if (parts.length === 4 && bundle && parts[1] === bundle.sourceFrameId && parts[2] === bundle.annotation.annotationId) found.push(item);
        }
        return found;
    }
    function cleanup() {
        try { if (adapter && bundle) { var items = findManaged(), i, j, known; for (i = items.length - 1; i >= 0; i--) { known = false; for (j = 0; j < originalManaged.length; j++) if (items[i] === originalManaged[j].item) known = true; if (!known) items[i].remove(); } for (j = 0; j < originalManaged.length; j++) { var saved = originalManaged[j], target = saved.item; try { target.contents = saved.contents; target.note = saved.note; target.left = saved.left; target.top = saved.top; target.width = saved.width; } catch (restoreManaged) { target = source.layer.textFrames.add(); target.contents = saved.contents; target.note = saved.note; target.left = saved.left; target.top = saved.top; target.width = saved.width; } } } } catch (e) { result("managed cleanup", false, e.message || e); }
        try { if (unmanaged) unmanaged.remove(); } catch (ignore) { result("unmanaged cleanup", false, ignore.message || ignore); }
        try { if (source && original) { source.contents = original.contents; source.note = original.note; source.width = original.width; } } catch (restoreError) { result("source restore", false, restoreError.message || restoreError); }
    }
    try {
        if (!app.documents.length) throw Error("AIファイルを開いてください");
        var doc = app.activeDocument, selection = doc.selection;
        if (!selection || selection.length !== 1 || selection[0].typename !== "TextFrame") throw Error("Area TextFrameを1個だけ選択してください");
        source = selection[0]; baselineFrames = doc.textFrames.length; original = {contents: String(source.contents), note: String(source.note), width: source.width};
        adapter = FormalStep2Adapter(doc, source);
        var existing = FormalStep2Store.read(original.note), existingItems = [], existingIndex, existingNote;
        if (existing && existing.textSnapshot === original.contents) bundle = existing;
        else {
            for (existingIndex = 0; existingIndex < doc.textFrames.length; existingIndex++) { existingNote = String(doc.textFrames[existingIndex].note); if (existingNote.indexOf("formal-step2-output:v1;") === 0) existingItems.push(doc.textFrames[existingIndex]); }
            if (existingItems.length) throw Error("existing-managed-output; clean test document or use its valid SourceBundle");
            bundle = FormalStep1.create(original.contents);
        }
        var existingManaged = findManaged();
        for (existingIndex = 0; existingIndex < existingManaged.length; existingIndex++) originalManaged.push({item: existingManaged[existingIndex], contents: String(existingManaged[existingIndex].contents), note: String(existingManaged[existingIndex].note), left: existingManaged[existingIndex].left, top: existingManaged[existingIndex].top, width: existingManaged[existingIndex].width});
        reading = prompt("読みを入力してください", bundle.annotation.reading || "いっちょうら");
        if (reading === null || !reading) throw Error("reading-cancelled");
        observation = adapter.observe();
        result("observe complete", observation.status === "complete", (observation.reasons || []).join("/"));
        if (observation.status !== "complete" || observation.lines.length < 2) throw Error("two-line Area Textが必要です");
        var geometryOk = true, geometryIndex;
        for (geometryIndex = 0; geometryIndex < observation.lines.length; geometryIndex++) if (!observation.lines[geometryIndex].geometry || observation.lines[geometryIndex].geometry.measuredWidth <= 0 || typeof observation.lines[geometryIndex].geometry.measuredTop !== "number") geometryOk = false;
        result("measured geometry", geometryOk, adapter.diagnostics().join(" | "));
        boundary = Number(prompt("本文の折返し境界（本文文字数）", String(observation.lines[0].end)));
        if (!(boundary > 0 && boundary < original.contents.length)) throw Error("invalid-boundary");
        bundle.annotation.reading = String(reading); bundle.annotation.readingConfirmed = true; bundle.annotation.enabled = true;
        bundle.splitHints = [{baseBoundaryAfter: boundary, readingBoundaryAfter: Number(prompt("読みの折返し境界（読み文字数）", String(Math.floor(String(reading).length / 2)))), baseText: original.contents, reading: String(reading), baseRevision: 0, readingRevision: 0}];
        decision = FormalSegments.plan(original.contents, String(reading), observation.lines, bundle.splitHints, 0, 0);
        result("initial 2-segment plan", decision.status === "complete");
        if (decision.status !== "complete") throw Error((decision.reasons || []).join("/"));
        unmanaged = source.layer.textFrames.add(); unmanaged.note = "gate-c-unmanaged"; unmanaged.contents = "keep";
        adapter.reconcile(bundle, decision);
        var firstCount = managedCount(); result("2 segment reconcile", firstCount === 2, "count=" + firstCount);
        var j; for (j = 0; j < 2; j++) { adapter.reconcile(bundle, decision); result("same desired reconcile " + (j + 2), managedCount() === firstCount, "count=" + managedCount()); }
        source.width = original.width * 10;
        var wideObservation = adapter.observe(), wideDecision;
        result("AreaText width reflow to one line", wideObservation.status === "complete" && wideObservation.lines.length === 1, "lines=" + wideObservation.lines.length);
        if (wideObservation.status !== "complete" || wideObservation.lines.length !== 1) throw Error("width-reflow-to-one-line-failed");
        wideDecision = FormalSegments.plan(original.contents, String(reading), wideObservation.lines, bundle.splitHints, 0, 0);
        adapter.reconcile(bundle, wideDecision); result("2 to 1 after actual reflow", managedCount() === 1, "count=" + managedCount());
        source.width = original.width;
        observation = adapter.observe();
        decision = FormalSegments.plan(original.contents, String(reading), observation.lines, bundle.splitHints, 0, 0);
        result("AreaText width restored to two lines", observation.status === "complete" && observation.lines.length === 2, "lines=" + observation.lines.length);
        if (decision.status !== "complete") throw Error((decision.reasons || []).join("/"));
        adapter.reconcile(bundle, decision); result("same SplitHint restored", managedCount() === 2, "count=" + managedCount());
        app.redraw();
        result("visual placement", confirm("2本のルビが各本文segmentの上方に正しく配置されていますか？"));
        var stale = FormalSegments.plan(original.contents, String(reading) + "変更", observation.lines, bundle.splitHints, 0, 0); result("reading change stale", stale.status === "unresolved" && stale.reasons[0] === "split-hint-stale");
        result("unmanaged preserved", String(unmanaged.note) === "gate-c-unmanaged");
        result("temporary measurement frames cleaned", doc.textFrames.length === (baselineFrames + managedCount() - originalManaged.length + 1), "textFrames=" + doc.textFrames.length);
        manual("save/close/reopen");
    } catch (e) { result("runtime gate", false, e.message || e); }
    cleanup();
    var output = report.join("\n"); $.writeln(output); alert("Gate C Runtime Check完了。Debug Consoleのレポート全文を確認してください。\n" + report.join("\n"));
}());
