#target illustrator
#targetengine "formal-multi-step2"
#include "../formal-step1/core.js"
#include "../formal-step1/store.js"
#include "multi.js"
#include "occurrences.js"
#include "projection.js"
#include "re-resolution.js"
#include "multi-store.js"
#include "workflow.js"
#include "selection-adapter.jsx"
#include "persistence-adapter.jsx"

/* Minimal scalable long-text shell. Logical occurrences stay separate from render segments. */
(function () {
    function fail(message) { throw Error(message); }
    function statusText(occurrence) { return FormalMultiWorkflow.occurrenceStatus(occurrence); }
    function sourceKindText(source) { return source.kind === TextType.POINTTEXT ? "POINTTEXT" : "AREATEXT"; }
    function listText(occurrence) {
        return occurrence.start + ".." + occurrence.end + "  " + occurrence.surface + "  [" + statusText(occurrence) + "]";
    }

    function run() {
        var documentRef, picked, source, sourceIdentity, cachedNote, stored, bundle, reResolution, dialog, list, info, hint;
        var editor, readingInput, enabledCheck, confirmedCheck, selectedText;
        var saveButton, closeButton, stateText, savePending = false, currentIndex = -1, i;

        if (!app.documents.length) fail("AIファイルを開いてください");
        documentRef = app.activeDocument;
        picked = FormalMultiSelectionAdapter.resolveFrame(documentRef.selection, TextType, TextOrientation);
        source = picked.sourceFrame;
        sourceIdentity = FormalMultiPersistenceAdapter.captureIdentity(source, documentRef);
        if (!sourceIdentity.uuid || !sourceIdentity.documentPath) fail("save-document-first-for-long-text-persistence");
        cachedNote = String(source.note);
        stored = FormalMultiStore.read(cachedNote);
        if (stored && stored.textSnapshot !== picked.text) { reResolution=FormalLongTextReResolution.reconcile(stored,picked.text); bundle=reResolution.bundle; }
        else bundle = stored || FormalMulti.createFrame(picked.text);
        if (!bundle.occurrences) bundle.occurrences = FormalLongText.extract(picked.text).occurrences;
        bundle = FormalMulti.validate(bundle);

        dialog = new Window("palette", "Formal Step 2 - Long Text");
        dialog.orientation = "column";
        dialog.alignChildren = ["fill", "top"];
        dialog.preferredSize = [760, 520];
        info = dialog.add("statictext", undefined, "TextFrame認識: " + sourceKindText(source) + " / 横書き / " + picked.strategy + "    候補: " + bundle.occurrences.length + "件");
        info.characters = 90;
        hint = dialog.add("statictext", undefined, "一覧からoccurrenceを選び、下のeditorでreading/enabled/確認済みを編集してください。");
        hint.characters = 90;

        list = dialog.add("listbox", undefined, [], {multiselect: false});
        list.preferredSize = [720, 300];
        for (i = 0; i < bundle.occurrences.length; i++) list.add("item", listText(bundle.occurrences[i]));

        editor = dialog.add("panel", undefined, "Selected occurrence");
        editor.orientation = "column";
        editor.alignChildren = ["fill", "top"];
        selectedText = editor.add("statictext", undefined, "対象: -");
        readingInput = editor.add("edittext", undefined, "");
        readingInput.helpTip = "reading";
        readingInput.preferredSize = [300, 24];
        enabledCheck = editor.add("checkbox", undefined, "enabled");
        confirmedCheck = editor.add("checkbox", undefined, "確認済み");
        readingInput.onChanging = function () { confirmedCheck.value = false; };

        var actions = dialog.add("group");
        actions.orientation = "row";
        saveButton = actions.add("button", undefined, "保存");
        closeButton = actions.add("button", undefined, "閉じる");
        stateText = dialog.add("statictext", undefined, reResolution ? "状態: source変更を再解決済み / unresolved=" + reResolution.unresolved.length + "件（保存で新snapshotを確定）" : "状態: 読み込み完了");
        stateText.characters = 90;

        function saveEditor() {
            var occurrence;
            if (currentIndex < 0) return;
            occurrence = bundle.occurrences[currentIndex];
            bundle = FormalMultiWorkflow.setOccurrenceReading(bundle, occurrence.occurrenceId, readingInput.text, confirmedCheck.value);
            bundle = FormalMultiWorkflow.setOccurrenceEnabled(bundle, occurrence.occurrenceId, enabledCheck.value);
        }

        function loadEditor(index) {
            var occurrence = bundle.occurrences[index];
            currentIndex = index;
            selectedText.text = "対象: " + occurrence.start + ".." + occurrence.end + "  " + occurrence.surface + "  [" + occurrence.occurrenceId + "]";
            readingInput.text = occurrence.reading;
            enabledCheck.value = occurrence.enabled;
            confirmedCheck.value = occurrence.readingConfirmed;
        }

        function refreshList() {
            var j;
            for (j = 0; j < bundle.occurrences.length; j++) list.items[j].text = listText(bundle.occurrences[j]);
        }

        list.onChange = function () {
            try {
                saveEditor();
                if (list.selection) loadEditor(list.selection.index);
                refreshList();
            } catch (error) { stateText.text = "状態: error / " + (error.message || error); }
        };
        saveButton.onClick = function () {
            var result;
            if (savePending) return;
            savePending = true;
            saveButton.enabled = false;
            closeButton.enabled = false;
            try {
                saveEditor();
                bundle = FormalMultiProjection.project(bundle);
                result = FormalMultiPersistenceAdapter.save(source, cachedNote, bundle, sourceIdentity, {
                    pending: function (diagnostics) { stateText.text = "状態: 保存経路Bを実行中 / " + diagnostics.join(" | "); },
                    success: function (value) { savePending = false; saveButton.enabled = true; closeButton.enabled = true; cachedNote = value.note; refreshList(); stateText.text = "状態: 保存完了 / " + value.strategy + " / Annotation=" + bundle.annotations.length + "件（再実行で復元）"; },
                    failure: function (diagnostics) { savePending = false; saveButton.enabled = true; closeButton.enabled = true; stateText.text = "状態: 保存失敗 / " + diagnostics.join(" | "); alert("Formal Step 2 保存に失敗しました。\n" + diagnostics.join("\n")); }
                });
                if(result.status === "success") { savePending = false; saveButton.enabled = true; closeButton.enabled = true; cachedNote = result.note; refreshList(); stateText.text = "状態: 保存完了 / " + result.strategy + " / Annotation=" + bundle.annotations.length + "件（再実行で復元）"; }
                else if(result.status === "failed") { savePending = false; saveButton.enabled = true; closeButton.enabled = true; stateText.text = "状態: 保存失敗 / " + result.diagnostics.join(" | "); alert("Formal Step 2 保存に失敗しました。\n" + result.diagnostics.join("\n")); }
            } catch (error) { savePending = false; saveButton.enabled = true; closeButton.enabled = true; stateText.text = "状態: error / " + (error.message || error); }
        };
        closeButton.onClick = function () { dialog.close(); };
        if (bundle.occurrences.length) { list.selection = 0; loadEditor(0); }
        dialog.show();
    }

    try { run(); } catch (error) { alert("Formal Step 2 Long Textを停止しました。\n" + (error.message || error)); }
}());
