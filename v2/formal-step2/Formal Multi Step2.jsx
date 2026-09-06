#target illustrator
#targetengine "formal-multi-step2"
#include "multi.js"
#include "multi-store.js"
#include "workflow.js"
#include "selection-adapter.jsx"

/* Minimal Gate D multi-annotation editor. Rendering remains a separate step. */
(function () {
    function fail(message) { throw Error(message); }

    function diagnosticValue(object, key) {
        try { return object && object[key]; } catch (error) { return "<error>"; }
    }

    function writeSelectionDiagnostic(selection) {
        var selected, story, frames, i, frame, range;
        $.writeln("[formal-multi-selection] selection typename=" + diagnosticValue(selection, "typename") + " length=" + diagnosticValue(selection, "length"));
        if (selection && selection.typename === "TextRange") selected = selection;
        else if (selection && selection.length === 1) selected = selection[0];
        else return;
        $.writeln("[formal-multi-selection] selected typename=" + diagnosticValue(selected, "typename") + " start=" + diagnosticValue(selected, "start") + " end=" + diagnosticValue(selected, "end"));
        $.writeln("[formal-multi-selection] parent typename=" + diagnosticValue(diagnosticValue(selected, "parent"), "typename"));
        story = diagnosticValue(selected, "story");
        frames = diagnosticValue(story, "textFrames");
        $.writeln("[formal-multi-selection] story exists=" + (!!story) + " textFrames.length=" + diagnosticValue(frames, "length"));
        if (frames && typeof frames.length === "number") for (i = 0; i < frames.length; i++) {
            frame = frames[i];
            range = diagnosticValue(frame, "textRange");
            $.writeln("[formal-multi-selection] frame[" + i + "] typename=" + diagnosticValue(frame, "typename") + " kind=" + diagnosticValue(frame, "kind") + " orientation=" + diagnosticValue(frame, "orientation") + " range=" + diagnosticValue(range, "start") + ".." + diagnosticValue(range, "end"));
        }
    }

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
        writeSelectionDiagnostic(documentRef.selection);
        picked = FormalMultiSelectionAdapter.resolve(documentRef.selection, TextType, TextOrientation);
        source = picked.sourceFrame;
        stored = FormalMultiStore.read(source.note);
        bundle = stored || FormalMulti.createFrame(String(source.contents));
        if (bundle.textSnapshot !== String(source.contents)) fail("source-snapshot-mismatch");
        currentId = FormalMultiWorkflow.findSelection(bundle, bundle.sourceFrameId, bundle.textSnapshot, picked.start, picked.end);

        dialog = new Window("palette", "Formal Step 2 Multi");
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

        function captureSelection() {
            var candidate = FormalMultiSelectionAdapter.resolve(documentRef.selection, TextType, TextOrientation);
            if (candidate.sourceFrame !== source) fail("source-frame-switch-not-allowed");
            if (candidate.start !== picked.start || candidate.end !== picked.end || candidate.text !== picked.text) {
                picked = candidate;
                selectedText.text = "選択: " + picked.text;
            }
            return candidate;
        }

        function annotationStatus(annotation) {
            if (!annotation.enabled) return "suppressed";
            return annotation.reviewReasons.length ? "unresolved" : "complete";
        }

        function refresh() {
            var annotation = findAnnotation(bundle, currentId);
            if (!annotation) {
                statusText.text = "状態: 注釈なし";
                reasonTextView.text = "理由: -";
                return;
            }
            readingInput.text = annotation.reading;
            statusText.text = "状態: " + annotationStatus(annotation);
            reasonTextView.text = "理由: " + reasonText(annotation);
        }

        function guard(action) {
            try { action(); } catch (error) {
                statusText.text = "状態: error";
                reasonTextView.text = "理由: " + (error.message || error);
            }
        }

        function selectNext(direction) {
            var queue = FormalMultiWorkflow.reviewQueue(bundle, unresolvedResults(bundle));
            currentId = FormalMultiWorkflow.navigate(queue, currentId, direction);
            refresh();
        }

        addButton.onClick = function () {
            guard(function () {
                var current = captureSelection();
                var existing = FormalMultiWorkflow.findSelection(bundle, bundle.sourceFrameId, bundle.textSnapshot, current.start, current.end);
                if (existing) { currentId = existing; refresh(); return; }
                bundle = FormalMultiWorkflow.addSelection(bundle, bundle.textSnapshot, current.start, current.end);
                currentId = bundle.annotations[bundle.annotations.length - 1].annotationId;
                save();
                refresh();
            });
        };
        applyButton.onClick = function () {
            guard(function () {
                if (!currentId) fail("multi-annotation-missing");
                bundle = FormalMultiWorkflow.setReading(bundle, currentId, readingInput.text, true);
                save();
                refresh();
            });
        };
        suppressButton.onClick = function () {
            guard(function () {
                if (!currentId) fail("multi-annotation-missing");
                bundle = FormalMultiWorkflow.setEnabled(bundle, currentId, false);
                save();
                refresh();
            });
        };
        restoreButton.onClick = function () {
            guard(function () {
                if (!currentId) fail("multi-annotation-missing");
                bundle = FormalMultiWorkflow.setEnabled(bundle, currentId, true);
                save();
                refresh();
            });
        };
        previousButton.onClick = function () { guard(function () { selectNext(-1); }); };
        nextButton.onClick = function () { guard(function () { selectNext(1); }); };

        refresh();
        dialog.show();
    }

    try { run(); } catch (error) { alert("Formal Multi Step 2を停止しました。\n" + (error.message || error)); }
}());
