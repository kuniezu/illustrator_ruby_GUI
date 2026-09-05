#target illustrator
#include "../formal-step1/core.js"
#include "../formal-step1/store.js"
#include "../formal-step2/segments.js"
#include "../formal-step2/store.js"
#include "../formal-step2/adapter.jsx"

(function () {
    var report = [], source, adapter, bundle, observation, decision, reading, boundary, unmanaged, original, baselineFrames;
    function result(label, ok, detail) { report.push((ok ? "PASS " : "FAIL ") + label + (detail ? ": " + detail : "")); }
    function manual(label) { report.push("MANUAL_REQUIRED " + label); }
    function managedCount() { return adapter.inspect(bundle).length; }
    function cleanup() {
        try { if (adapter && bundle) { var items = adapter.inspect(bundle), i; for (i = items.length - 1; i >= 0; i--) items[i].remove(); } } catch (e) { result("managed cleanup", false, e.message || e); }
        try { if (unmanaged) unmanaged.remove(); } catch (ignore) { result("unmanaged cleanup", false, ignore.message || ignore); }
        try { if (source && original) { source.contents = original.contents; source.note = original.note; source.width = original.width; } } catch (restoreError) { result("source restore", false, restoreError.message || restoreError); }
    }
    try {
        if (!app.documents.length) throw Error("AIファイルを開いてください");
        var doc = app.activeDocument, selection = doc.selection;
        if (!selection || selection.length !== 1 || selection[0].typename !== "TextFrame") throw Error("Area TextFrameを1個だけ選択してください");
        source = selection[0]; baselineFrames = doc.textFrames.length; original = {contents: String(source.contents), note: String(source.note), width: source.width};
        adapter = FormalStep2Adapter(doc, source);
        reading = prompt("読みを入力してください", "いっちょうら");
        if (reading === null || !reading) throw Error("reading-cancelled");
        observation = adapter.observe();
        result("observe complete", observation.status === "complete", (observation.reasons || []).join("/"));
        if (observation.status !== "complete" || observation.lines.length < 2) throw Error("two-line Area Textが必要です");
        result("measured geometry", observation.lines.every(function (x) { return x.geometry && x.geometry.measuredWidth > 0 && typeof x.geometry.measuredTop === "number"; }), adapter.diagnostics().join(" | "));
        boundary = Number(prompt("本文の折返し境界（本文文字数）", String(observation.lines[0].end)));
        if (!(boundary > 0 && boundary < original.contents.length)) throw Error("invalid-boundary");
        bundle = FormalStep1.create(original.contents); bundle.annotation.reading = String(reading); bundle.annotation.readingConfirmed = true; bundle.annotation.enabled = true;
        bundle.splitHints = [{baseBoundaryAfter: boundary, readingBoundaryAfter: Number(prompt("読みの折返し境界（読み文字数）", String(Math.floor(String(reading).length / 2)))), baseText: original.contents, reading: String(reading), baseRevision: 0, readingRevision: 0}];
        decision = FormalSegments.plan(original.contents, String(reading), observation.lines, bundle.splitHints, 0, 0);
        result("initial 2-segment plan", decision.status === "complete");
        if (decision.status !== "complete") throw Error((decision.reasons || []).join("/"));
        unmanaged = source.layer.textFrames.add(); unmanaged.note = "gate-c-unmanaged"; unmanaged.contents = "keep";
        adapter.reconcile(bundle, decision);
        var firstCount = managedCount(); result("2 segment reconcile", firstCount === 2, "count=" + firstCount);
        var j; for (j = 0; j < 2; j++) { adapter.reconcile(bundle, decision); result("same desired reconcile " + (j + 2), managedCount() === firstCount, "count=" + managedCount()); }
        var oneDecision = {status: "complete", segments: [decision.segments[0]]}; adapter.reconcile(bundle, oneDecision); result("2 to 1 managed removal", managedCount() === 1, "count=" + managedCount());
        adapter.reconcile(bundle, decision); result("hint wrap restored", managedCount() === 2, "count=" + managedCount());
        var stale = FormalSegments.plan(original.contents, String(reading) + "変更", observation.lines, bundle.splitHints, 0, 0); result("reading change stale", stale.status === "unresolved" && stale.reasons[0] === "split-hint-stale");
        result("unmanaged preserved", String(unmanaged.note) === "gate-c-unmanaged");
        result("temporary measurement frames cleaned", doc.textFrames.length === (baselineFrames + managedCount() + 1), "textFrames=" + doc.textFrames.length);
        manual("save/close/reopen");
    } catch (e) { result("runtime gate", false, e.message || e); }
    cleanup();
    var output = report.join("\n"); $.writeln(output); alert("Gate C Runtime Check完了。Debug Consoleのレポート全文を確認してください。\n" + report.join("\n"));
}());
