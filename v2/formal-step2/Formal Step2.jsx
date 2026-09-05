#target illustrator
#include "../formal-step1/core.js"
#include "../formal-step1/store.js"
#include "segments.js"
#include "store.js"
#include "adapter.jsx"
#include "core.js"
#include "review.jsx"

(function () {
    try {
        if (!app.documents.length) throw Error("AIファイルを開いてください");
        var documentRef = app.activeDocument;
        var selection = documentRef.selection;
        if (!selection || selection.length !== 1 || selection[0].typename !== "TextFrame") throw Error("Area TextFrameを1個だけ選択してください");
        var adapter = FormalStep2Adapter(documentRef, selection[0]);
        var snapshot = adapter.snapshot();
        var stored = FormalStep2Store.read(snapshot.note);
        var context = {snapshot: snapshot, bundle: stored || FormalStep1.create(snapshot.text)};
        var observation = adapter.observe();
        var decision = FormalSegments.plan(snapshot.text, context.bundle.annotation.reading, observation.lines, context.bundle.splitHints || [], context.bundle.revision, context.bundle.revision);
        var edit = FormalStep2Review(context, decision);
        if (edit) {
            var result = FormalStep2Apply(adapter, context, edit, edit.splitHints);
            var reasons = result.bundle.annotation.reviewReasons;
            alert("状態: " + result.bundle.renderStatus + (reasons.length ? "\n診断: " + reasons.join(" / ") : "") + "\n保存してください。");
        }
    } catch (e) {
        alert("Formal Step 2を停止しました。\n" + (e.message || e));
    }
}());
