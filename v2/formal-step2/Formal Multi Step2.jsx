#target illustrator
#targetengine "formal-multi-step2"
#include "../formal-step1/core.js"
#include "../formal-step1/store.js"
#include "appearance.js"
#include "multi.js"
#include "occurrences.js"
#include "split-boundaries.js"
#include "projection.js"
#include "segments.js"
#include "orchestration.js"
#include "multi-renderer.js"
#include "re-resolution.js"
#include "multi-store.js"
#include "workflow.js"
#include "ui-refresh.js"
#include "selection-adapter.jsx"
#include "persistence-adapter.jsx"

/* Minimal scalable long-text shell. Logical occurrences stay separate from render segments. */
(function () {
    function fail(message) { throw Error(message); }
    function statusText(occurrence) { return occurrence.unsupported ? "unsupported" : FormalMultiWorkflow.occurrenceStatus(occurrence); }
    function sourceKindText(source) { return source.kind === TextType.POINTTEXT ? "POINTTEXT" : "AREATEXT"; }
    function listText(occurrence) {
        return occurrence.start + ".." + occurrence.end + "  " + occurrence.surface + "  [" + statusText(occurrence) + "]";
    }
    function runtimeSources() {
        var here = File($.fileName).parent;
        return {
            step1: File(here.parent + "/formal-step1/core.js").fsName,
            segments: File(here + "/segments.js").fsName,
            orchestration: File(here + "/orchestration.js").fsName,
            appearance: File(here + "/appearance.js").fsName,
            multi: File(here + "/multi.js").fsName,
            projection: File(here + "/projection.js").fsName,
            multiRenderer: File(here + "/multi-renderer.js").fsName,
            nativeRenderer: File(here + "/native-renderer.js").fsName,
            renderSpec: File(here + "/area-text-render-spec.js").fsName,
            nativeCore: File(here + "/area-text-native.js").fsName,
            nativeStore: File(here + "/area-text-native-store.js").fsName,
            nativeNoteAdapter: File(here + "/area-text-native-note-adapter.js").fsName,
            nativePersistence: File(here + "/area-text-native-persistence-facade.js").fsName,
            nativeCoordinator: File(here + "/area-text-native-transaction-coordinator.js").fsName,
            nativeIdentity: File(here + "/area-text-native-output-identity.js").fsName,
            nativeBackend: File(here + "/area-text-native-backend.jsx").fsName,
            nativeHost: File(here + "/area-text-native-host.jsx").fsName,
            nativeIntegration: File(here + "/area-text-native-integration.js").fsName,
            adapter: File(here + "/adapter.jsx").fsName
        };
    }

    function run() {
        var documentRef, picked, source, sourceIdentity, cachedNote, stored, bundle, reResolution, dialog, list, info, hint, renderSources, stageFile;
        var editor, readingInput, enabledCheck, confirmedCheck, selectedText, debugText, debugLines = [];
        var saveButton, closeButton, splitButton, mergeButton, previousReviewButton, nextReviewButton, suppressButton, reenableButton, stateText, savePending = false, currentIndex = -1, editRevision, activeSaveRequestId = 0, activeSaveRequestToken = "", i;

        if (!app.documents.length) fail("AIファイルを開いてください");
        documentRef = app.activeDocument;
        picked = FormalMultiSelectionAdapter.resolveMultiFrame(documentRef.selection, TextType, TextOrientation);
        source = picked.sourceFrame;
        renderSources = runtimeSources();
        stageFile = File(Folder.temp.fsName + "/formal-multi-host-" + new Date().getTime() + ".log");
        sourceIdentity = FormalMultiPersistenceAdapter.captureIdentity(source, documentRef);
        if (!sourceIdentity.uuid || !sourceIdentity.documentPath) fail("save-document-first-for-long-text-persistence");
        cachedNote = String(source.note);
        stored = FormalMultiStore.read(cachedNote);
        if (stored && stored.textSnapshot !== picked.text) { reResolution=FormalLongTextReResolution.reconcile(stored,picked.text); bundle=reResolution.bundle; }
        else bundle = stored || FormalMulti.createFrame(picked.text);
        if (!bundle.occurrences) bundle.occurrences = FormalLongText.extract(picked.text).occurrences;
        bundle = FormalMulti.validate(bundle);
        editRevision = bundle.revision;

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
        splitButton = actions.add("button", undefined, "局所分割");
        mergeButton = actions.add("button", undefined, "隣接結合");
        previousReviewButton = actions.add("button", undefined, "前の未解決");
        nextReviewButton = actions.add("button", undefined, "次の未解決");
        suppressButton = actions.add("button", undefined, "抑制");
        reenableButton = actions.add("button", undefined, "再有効化");
        saveButton = actions.add("button", undefined, "保存");
        closeButton = actions.add("button", undefined, "閉じる");
        stateText = dialog.add("statictext", undefined, reResolution ? "状態: source変更を再解決済み / unresolved=" + reResolution.unresolved.length + "件（保存で新snapshotを確定）" : "状態: 読み込み完了");
        stateText.characters = 90;
        debugText = dialog.add("edittext", undefined, "debug console: copyable / max 40 records", {multiline: true, scrolling: true});
        debugText.preferredSize = [720, 90];
        debugText.readonly = true;

        function showDiagnostics(values) {
            var j, item;
            if (values instanceof Array) for (j = 0; j < values.length; j++) debugLines.push(String(values[j]));
            else if (values !== undefined && values !== null) debugLines.push(String(values));
            while (debugLines.length > 40) debugLines.shift();
            debugText.text = debugLines.join("\n");
        }

        function saveEditor() {
            var occurrence;
            if (currentIndex < 0) return;
            occurrence = bundle.occurrences[currentIndex];
            bundle = FormalMultiWorkflow.setOccurrenceReading(bundle, occurrence.occurrenceId, readingInput.text, confirmedCheck.value);
            bundle = FormalMultiWorkflow.setOccurrenceEnabled(bundle, occurrence.occurrenceId, enabledCheck.value);
            editRevision++;
            bundle.revision = editRevision;
        }

        function loadEditor(index) {
            var occurrence = bundle.occurrences[index];
            currentIndex = index;
            selectedText.text = "対象: " + occurrence.start + ".." + occurrence.end + "  " + occurrence.surface + "  [" + occurrence.occurrenceId + "]";
            readingInput.text = occurrence.reading;
            enabledCheck.value = occurrence.enabled;
            confirmedCheck.value = occurrence.readingConfirmed;
            updateReviewControls();
        }

        function currentOccurrenceId() { return currentIndex < 0 ? null : bundle.occurrences[currentIndex].occurrenceId; }
        function reviewResults() {
            var results = [], occurrence;
            for (var j = 0; j < bundle.occurrences.length; j++) {
                occurrence = bundle.occurrences[j];
                results.push({ annotationId: occurrence.occurrenceId, status: FormalMultiWorkflow.occurrenceStatus(occurrence) });
            }
            return results;
        }
        function reviewQueue() { return FormalMultiWorkflow.reviewQueue(bundle, reviewResults()); }
        function findOccurrenceIndex(occurrenceId) {
            var j;
            for (j = 0; j < bundle.occurrences.length; j++) if (bundle.occurrences[j].occurrenceId === occurrenceId) return j;
            return -1;
        }
        function updateReviewControls() {
            var occurrence = currentIndex < 0 ? null : bundle.occurrences[currentIndex];
            var queue = reviewQueue();
            previousReviewButton.enabled = !savePending && queue.length > 0;
            nextReviewButton.enabled = !savePending && queue.length > 0;
            suppressButton.enabled = !savePending && !!occurrence && occurrence.enabled && !occurrence.unsupported;
            reenableButton.enabled = !savePending && !!occurrence && !occurrence.enabled && !occurrence.unsupported;
        }
        function selectOccurrence(occurrenceId) {
            var index = findOccurrenceIndex(occurrenceId);
            if (index < 0) return false;
            list.selection = index;
            loadEditor(index);
            return true;
        }
        function navigateReview(direction) {
            var target;
            try {
                if (savePending) return;
                saveEditor();
                target = FormalMultiWorkflow.navigate(reviewQueue(), currentOccurrenceId(), direction);
                if (target && selectOccurrence(target)) stateText.text = "状態: 未解決レビュー / " + (direction < 0 ? "前" : "次") + "へ移動しました";
                else stateText.text = "状態: 未解決レビュー / これ以上ありません";
            } catch (error) { stateText.text = "状態: レビュー移動失敗 / " + (error.message || error); }
        }
        function setCurrentEnabled(enabled) {
            var id;
            try {
                if (savePending || currentIndex < 0) return;
                saveEditor(); id = currentOccurrenceId();
                bundle = FormalMultiWorkflow.setOccurrenceEnabled(bundle, id, enabled);
                editRevision++; bundle.revision = editRevision;
                refreshList(); selectOccurrence(id);
                stateText.text = enabled ? "状態: 再有効化しました。未解決ならレビュー対象へ戻ります" : "状態: 抑制しました。未解決レビューから除外しました";
            } catch (error) { stateText.text = "状態: 抑制状態変更失敗 / " + (error.message || error); }
        }

        var listRefreshGuard = { suppress: false };
        function refreshList() {
            currentIndex = FormalMultiUiRefresh.refresh(list, bundle.occurrences, currentIndex, listRefreshGuard, loadEditor, listText);
        }
        function sameLocalRoot(first, second) {
            var j;
            if(!first||!second||first.end!==second.start) return false;
            for(j=0;j<first.lineage.length;j++) if(first.lineage[j]===second.lineage[0]) return true;
            for(j=0;j<second.lineage.length;j++) if(second.lineage[j]===first.lineage[0]) return true;
            return first.lineage[0]===second.lineage[0];
        }
        splitButton.onClick = function () {
            var occurrence, boundaries;
            try {
                if(savePending || currentIndex<0) return;
                saveEditor(); occurrence=bundle.occurrences[currentIndex];
                if(occurrence.unsupported) fail("unsupported-occurrence-cannot-split");
                boundaries=FormalSplitBoundaryUi.choose(occurrence.surface);
                if(boundaries===null) return;
                if(!boundaries.length) fail("分割境界を1つ以上選択してください");
                bundle=FormalMulti.replaceOccurrences(bundle, FormalLongText.splitAt(bundle, occurrence.occurrenceId, boundaries).occurrences); editRevision++; bundle.revision=editRevision; currentIndex=Math.min(currentIndex,bundle.occurrences.length-1); refreshList(); stateText.text="状態: occurrenceを局所分割しました。各readingを確認して保存してください";
            } catch(error) { stateText.text="状態: 分割失敗 / "+(error.message||error); }
        };
        mergeButton.onClick = function () {
            var first, second;
            try {
                if(savePending || currentIndex<0 || currentIndex+1>=bundle.occurrences.length) return;
                saveEditor(); first=bundle.occurrences[currentIndex]; second=bundle.occurrences[currentIndex+1];
                if(!sameLocalRoot(first,second)) fail("隣接する同一local lineageだけ結合できます");
                bundle=FormalMulti.replaceOccurrences(bundle, FormalLongText.mergeAdjacent(bundle,[first.occurrenceId,second.occurrenceId]).occurrences); editRevision++; bundle.revision=editRevision; refreshList(); stateText.text="状態: occurrenceを局所結合しました。readingを確認して保存してください";
            } catch(error) { stateText.text="状態: 結合失敗 / "+(error.message||error); }
        }

        list.onChange = function () {
            try {
                if (FormalMultiUiRefresh.ignoreChange(listRefreshGuard, savePending)) return;
                saveEditor();
                if (list.selection) loadEditor(list.selection.index);
            } catch (error) { stateText.text = "状態: error / " + (error.message || error); }
        };
        function setSavePending(value) {
            savePending = value;
            saveButton.enabled = !value;
            closeButton.enabled = !value;
            list.enabled = !value;
            readingInput.enabled = !value;
            enabledCheck.enabled = !value;
            confirmedCheck.enabled = !value;
            splitButton.enabled = !value;
            mergeButton.enabled = !value;
            updateReviewControls();
        }
        previousReviewButton.onClick = function () { navigateReview(-1); };
        nextReviewButton.onClick = function () { navigateReview(1); };
        suppressButton.onClick = function () { setCurrentEnabled(false); };
        reenableButton.onClick = function () { setCurrentEnabled(true); };
        saveButton.onClick = function () {
            var result, requestId, requestRevision = null;
            if (savePending) return;
            setSavePending(true);
            requestId = "save-" + new Date().getTime() + "-" + (++activeSaveRequestId);
            activeSaveRequestToken = requestId;
            try {
                saveEditor();
                requestRevision = bundle.revision;
                stageFile = File(Folder.temp.fsName + "/formal-multi-host-" + new Date().getTime() + "-" + requestId + ".log");
                bundle = FormalMultiProjection.project(bundle);
                bundle.renderStatus = "complete";
                result = FormalMultiPersistenceAdapter.saveRendered(bundle.textSnapshot, cachedNote, bundle, sourceIdentity, FormalMultiRenderer.specifications(bundle), renderSources, {
                    pending: function (diagnostics) { if (requestId !== activeSaveRequestToken || requestRevision !== bundle.revision) return; showDiagnostics(diagnostics); stateText.text = "状態: 保存経路Bを実行中 / stage=" + stageFile.fsName + " / " + diagnostics.join(" | "); },
                    success: function (value) { if (requestId !== activeSaveRequestToken || requestRevision !== bundle.revision) return; setSavePending(false); showDiagnostics(value.diagnostics); if (value.reason) showDiagnostics("reason=" + value.reason); if (value.noteVerified !== true) { stateText.text = "状態: 保存失敗 / persisted note readback未確認"; return; } cachedNote = value.note; refreshList(); stateText.text = value.renderStatus === "failed" ? "状態: " + (value.reason || "render-failed") + " / 読みの情報は保持しています" : "状態: 保存完了 / " + value.strategy + " / Annotation=" + bundle.annotations.length + "件（再実行で復元）"; },
                    failure: function (diagnostics) { if (requestId !== activeSaveRequestToken || requestRevision !== bundle.revision) return; setSavePending(false); showDiagnostics(diagnostics); stateText.text = "状態: 保存失敗 / " + diagnostics.join(" | "); alert("Formal Step 2 保存に失敗しました。\n" + diagnostics.join("\n")); }
                }, undefined, stageFile.fsName, requestId);
                if(result.status === "success" && requestId === activeSaveRequestToken && requestRevision === bundle.revision) { setSavePending(false); showDiagnostics(result.diagnostics); if (result.noteVerified !== true) { stateText.text = "状態: 保存失敗 / persisted note readback未確認"; return; } cachedNote = result.note; refreshList(); stateText.text = "状態: 保存完了 / " + result.strategy + " / Annotation=" + bundle.annotations.length + "件（再実行で復元）"; }
                else if(result.status === "failed" && requestId === activeSaveRequestToken && requestRevision === bundle.revision) { setSavePending(false); showDiagnostics(result.diagnostics); stateText.text = "状態: 保存失敗 / " + result.diagnostics.join(" | "); alert("Formal Step 2 保存に失敗しました。\n" + result.diagnostics.join("\n")); }
            } catch (error) { if (requestId === activeSaveRequestToken) { setSavePending(false); showDiagnostics("palette=" + (error.message || error)); stateText.text = "状態: error / " + (error.message || error); } }
        };
        closeButton.onClick = function () { dialog.close(); };
        if (bundle.occurrences.length) { list.selection = 0; loadEditor(0); }
        dialog.show();
    }

    try { run(); } catch (error) { alert("Formal Step 2 Long Textを停止しました。\n" + (error.message || error)); }
}());
