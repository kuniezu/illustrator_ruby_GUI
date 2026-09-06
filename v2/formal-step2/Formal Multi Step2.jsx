#target illustrator
#targetengine "formal-multi-step2"
#include "multi.js"
#include "occurrences.js"
#include "projection.js"
#include "multi-store.js"
#include "workflow.js"
#include "selection-adapter.jsx"

/* Minimal long-text ScriptUI shell. Logical occurrences stay separate from render segments. */
(function () {
    function fail(message) { throw Error(message); }
    function statusText(occurrence) {
        return FormalMultiWorkflow.occurrenceStatus(occurrence);
    }

    function run() {
        var documentRef, picked, source, stored, bundle, dialog, list, rows = [];
        var info, saveButton, closeButton, stateText, i, occurrence, row;
        var label, reading, enabled, confirmed, status;

        if (!app.documents.length) fail("AIファイルを開いてください");
        documentRef = app.activeDocument;
        picked = FormalMultiSelectionAdapter.resolveFrame(documentRef.selection, TextType, TextOrientation);
        source = picked.sourceFrame;
        stored = FormalMultiStore.read(source.note);
        if (stored && stored.textSnapshot !== picked.text) fail("source-snapshot-mismatch");
        bundle = stored || FormalMulti.createFrame(picked.text);
        if (!bundle.occurrences) bundle.occurrences = FormalLongText.extract(picked.text).occurrences;
        bundle = FormalMulti.validate(bundle);

        dialog = new Window("palette", "Formal Step 2 - Long Text");
        dialog.orientation = "column";
        dialog.alignChildren = ["fill", "top"];
        dialog.preferredSize = [760, 520];
        info = dialog.add("statictext", undefined, "TextFrame認識: AREA TEXT / 横書き    候補: " + bundle.occurrences.length + "件");
        info.characters = 90;
        var hint = dialog.add("statictext", undefined, "surfaceごとに occurrence を保持。reading入力後、確認済みを選び保存してください。");
        hint.characters = 90;
        list = dialog.add("panel", undefined, "Logical occurrences");
        list.orientation = "column";
        list.alignChildren = ["fill", "top"];
        list.preferredSize = [720, 390];

        for (i = 0; i < bundle.occurrences.length; i++) {
            occurrence = bundle.occurrences[i];
            row = list.add("group");
            row.orientation = "row";
            row.alignment = ["fill", "top"];
            label = row.add("statictext", undefined, occurrence.start + ".." + occurrence.end + "  " + occurrence.surface + "  [" + occurrence.occurrenceId + "]");
            label.preferredSize = [300, 24];
            reading = row.add("edittext", undefined, occurrence.reading);
            reading.preferredSize = [170, 24];
            reading.helpTip = "reading";
            enabled = row.add("checkbox", undefined, "enabled");
            enabled.value = occurrence.enabled;
            confirmed = row.add("checkbox", undefined, "確認済み");
            confirmed.value = occurrence.readingConfirmed;
            status = row.add("statictext", undefined, statusText(occurrence));
            status.preferredSize = [90, 24];
            rows.push({id: occurrence.occurrenceId, reading: reading, enabled: enabled, confirmed: confirmed, status: status});
            reading.onChanging = (function (view, check) {
                return function () { check.value = false; view.status.text = "unresolved"; };
            }(rows[rows.length - 1], confirmed));
        }

        var actions = dialog.add("group");
        actions.orientation = "row";
        saveButton = actions.add("button", undefined, "保存");
        closeButton = actions.add("button", undefined, "閉じる");
        stateText = dialog.add("statictext", undefined, "状態: 読み込み完了");
        stateText.characters = 90;

        function save() {
            var j, current;
            for (j = 0; j < rows.length; j++) {
                current = rows[j];
                bundle = FormalMultiWorkflow.setOccurrenceReading(bundle, current.id, current.reading.text, current.confirmed.value);
                bundle = FormalMultiWorkflow.setOccurrenceEnabled(bundle, current.id, current.enabled.value);
            }
            bundle = FormalMultiProjection.project(bundle);
            source.note = FormalMultiStore.write(source.note, bundle);
            for (j = 0; j < rows.length; j++) {
                rows[j].status.text = statusText(bundle.occurrences[j]);
            }
            stateText.text = "状態: 保存完了 / Annotation=" + bundle.annotations.length + "件（再実行で復元）";
        }

        saveButton.onClick = function () {
            try { save(); } catch (error) { stateText.text = "状態: error / " + (error.message || error); }
        };
        closeButton.onClick = function () { dialog.close(); };
        dialog.show();
    }

    try { run(); } catch (error) { alert("Formal Step 2 Long Textを停止しました。\n" + (error.message || error)); }
}());
