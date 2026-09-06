#target illustrator
#include "multi.js"
#include "multi-store.js"
#include "workflow.js"
#include "selection-adapter.jsx"

/* Minimal Gate D multi-annotation editor. Rendering remains a separate step. */
(function () {
    function fail(message) { throw Error(message); }

    function unresolvedResults(bundle) {
        var results = [], annotation, status, i;
        for (i = 0; i < bundle.annotations.length; i++) {
            annotation = bundle.annotations[i];
            status = annotation.enabled && annotation.reviewReasons.length ? "unresolved" : "complete";
            results.push({annotationId: annotation.annotationId, status: status});
        }
        return results;
    }

    function reasonText(annotation) {
        if (!annotation) return "注釈を選択してください";
        return annotation.reviewReasons.length ? annotation.reviewReasons.join(" / ") : "問題なし";
    }

    function findAnnotation(bundle, annotationId) {
        var i;
        for (i = 0; i < bundle.annotations.length; i++) {
            if (bundle.annotations[i].annotationId === annotationId) return bundle.annotations[i];
        }
        return null;
    }

    function run() {
        var documentRef, picked, source, bundle, stored, currentId = null;
        var dialog, selectedText, readingInput, statusText, reasonTextView;
        var addButton, applyButton, suppressButton, restoreButton, previousButton, nextButton;

        if (!app.documents.length) fail("AIファイルを開いてください");
        documentRef = app.activeDocument;
        picked = FormalMultiSelectionAdapter.resolve(documentRef.selection, TextType, TextOrientation);
        source = picked.sourceFrame;
        stored = FormalMultiStore.read(source.note);
        bundle = stored || FormalMulti.createFrame(String(source.contents));
        if (bundle.textSnapshot !== String(source.contents)) fail("source-snapshot-mismatch");

        dialog = new Window("dialog", "Formal Step 2 Multi");
        dialog.orientation = "column";
        dialog.alignChildren = ["fill", "top"];

        selectedText = dialog.add("statictext", undefined, "選択: " + picked.text);
        selectedText.characters = 42;
        readingInput = dialog.add("edittext", undefined, "");
        readingInput.helpTip = "選択語の読みを入力";
        readingInput.characters = 32;

        var actions = dialog.add("group");
        actions.orientation = "row";
        addButton = actions.add("button", undefined, "Add");
        applyButton = actions.add("button", undefined, "Apply");
        suppressButton = actions.add("button", undefined, "Suppress");
        restoreButton = actions.add("button", undefined, "Re-enable");

        var navigation = dialog.add("group");
        navigation.orientation = "row";
        previousButton = navigation.add("button", undefined, "Previous unresolved");
        nextButton = navigation.add("button", undefined, "Next unresolved");

        statusText = dialog.add("statictext", undefined, "状態: ready");
        reasonTextView = dialog.add("statictext", undefined, "理由: -");
        statusText.characters = 48;
        reasonTextView.characters = 48;

        function save() {
            source.note = FormalMultiStore.write(source.note, bundle);
        }

        function refresh() {
            var annotation = findAnnotation(bundle, currentId);
            if (!annotation) {
                statusText.text = "状態: 注釈なし";
                reasonTextView.text = "理由: -";
                return;
            }
            readingInput.text = annotation.reading;
            statusText.text = "状態: " + (annotation.enabled ? bundle.renderStatus : "suppressed");
            reasonTextView.text = "理由: " + reasonText(annotation);
        }

        function selectNext(direction) {
            var queue = FormalMultiWorkflow.reviewQueue(bundle, unresolvedResults(bundle));
            currentId = FormalMultiWorkflow.navigate(queue, currentId, direction);
            refresh();
        }

        addButton.onClick = function () {
            bundle = FormalMultiWorkflow.addSelection(bundle, bundle.textSnapshot, picked.start, picked.end);
            currentId = bundle.annotations[bundle.annotations.length - 1].annotationId;
            save();
            refresh();
        };
        applyButton.onClick = function () {
            if (!currentId) fail("multi-annotation-missing");
            bundle = FormalMultiWorkflow.setReading(bundle, currentId, readingInput.text, true);
            save();
            refresh();
        };
        suppressButton.onClick = function () {
            if (!currentId) fail("multi-annotation-missing");
            bundle = FormalMultiWorkflow.setEnabled(bundle, currentId, false);
            save();
            refresh();
        };
        restoreButton.onClick = function () {
            if (!currentId) fail("multi-annotation-missing");
            bundle = FormalMultiWorkflow.setEnabled(bundle, currentId, true);
            save();
            refresh();
        };
        previousButton.onClick = function () { selectNext(-1); };
        nextButton.onClick = function () { selectNext(1); };

        refresh();
        dialog.show();
    }

    try { run(); } catch (error) { alert("Formal Multi Step 2を停止しました。\n" + (error.message || error)); }
}());
