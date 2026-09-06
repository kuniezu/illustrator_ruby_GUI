#target illustrator
#include "../formal-step1/core.js"
#include "../formal-step1/store.js"
#include "../formal-step2/segments.js"
#include "../formal-step2/store.js"
#include "../formal-step2/adapter.jsx"

(function () {
    var report = [];
    function emit(status, stage, detail) { report.push(status + " " + stage + (detail ? " | " + detail : "")); }
    try {
        if (!app.documents.length) throw Error("AIファイルを開いてください");
        var doc = app.activeDocument, selection = doc.selection;
        if (!selection || selection.length !== 1 || selection[0].typename !== "TextFrame") throw Error("保存済みFormal Step 2のArea TextFrameを1個だけ選択してください");
        var source = selection[0], adapter = FormalStep2Adapter(doc, source), snapshot = adapter.snapshot(), bundle = FormalStep2Store.read(snapshot.note);
        if (!bundle) { emit("FAIL", "stored-bundle", "v2 Formal Step 2 store is absent"); }
        else {
            emit("PASS", "stored-bundle", "revision=" + bundle.revision + ";renderStatus=" + bundle.renderStatus + ";readingConfirmed=" + bundle.annotation.readingConfirmed);
            var items = adapter.inspect(bundle), seen = {}, i, note, parts;
            for (i = 0; i < items.length; i++) {
                note = String(items[i].note); parts = note.split(";");
                if (parts.length !== 4 || parts[1] !== bundle.sourceFrameId || parts[2] !== bundle.annotation.annotationId || seen[parts[3]]) throw Error("managed-output-ownership-invalid");
                seen[parts[3]] = true;
            }
            emit("PASS", "managed-ownership", "count=" + items.length + ";uniqueSegmentIds=true");
            emit("MANUAL_REQUIRED", "close-reopen", "save, close, reopen, select the same Area Text, then rerun this check");
        }
    } catch (e) { emit("FAIL", "runtime", e.message || e); }
    $.writeln(report.join("\n"));
    alert("Formal Step 2 persistence checkpoint\n" + report.join("\n"));
}());
