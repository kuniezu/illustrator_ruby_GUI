#target illustrator
#include "../formal-step2/area-text-render-spec.js"
#include "../formal-step2/area-text-native.js"
#include "../formal-step2/area-text-native-output-identity.js"
#include "../formal-step2/area-text-native-backend.jsx"

(function () {
    var report = [], doc = null, reopened = null, tempFile = null;
    var sourceFrameId = "identity-check-source-" + String((new Date()).getTime());
    var activePhysicalId = "identity-check-active", retiredPhysicalId = "identity-check-retired";
    var foreignName = "FormalStep2NativeIdentityCheck-foreign", foreignContents = "foreign";
    function emit(status, stage, detail) { report.push(status + " " + stage + (detail ? " | " + detail : "")); }
    function fail(message) { throw Error(message); }
    function safe(value) { return value === undefined || value === null ? "" : String(value); }
    function fontName() {
        var i, name;
        for (i = 0; i < app.textFonts.length; i++) { try { name = String(app.textFonts[i].name || ""); } catch (ignore) { name = ""; } if (name) return name; }
        fail("no-font-available");
    }
    function spec(physicalId, reading, font) {
        return FormalAreaTextRenderSpec.create({
            sourceFrameId: sourceFrameId, annotationId: "identity-annotation-" + physicalId,
            logicalSegmentId: "identity-segment-" + physicalId, reading: reading,
            appearance: { fontName: font, fontSize: 8, manualDeltaX: 0, widthScale: 1, gapEm: 0.15 },
            geometry: { autoLeft: 50, autoTop: 500, autoWidth: 60, boxHeight: 20 },
            meta: { requestId: "identity-request", generationId: "identity-generation", physicalId: physicalId }
        });
    }
    function candidate(physicalId, reading, font) {
        var backend = FormalAreaTextNativeBackend(doc, doc.layers[0]);
        return backend.prepareCandidate(FormalAreaTextRenderSpec.backendSpec(spec(physicalId, reading, font)));
    }
    function resolve(physicalId) { return FormalAreaTextNativeOutputIdentity.resolve(reopened ? reopened.textFrames : doc.textFrames, sourceFrameId, physicalId); }
    function verifyIdentity(frame, physicalId, expectedNote, expectedContents) {
        var parsed = FormalAreaTextNativeOutputIdentity.parse(String(frame.note));
        if (!parsed || parsed.sourceFrameId !== sourceFrameId || parsed.physicalId !== physicalId) fail("identity-mismatch-" + physicalId);
        if (String(frame.note) !== expectedNote || safe(frame.contents) !== expectedContents) fail("identity-readback-mismatch-" + physicalId);
    }
    function cleanup() {
        var ok = true;
        try { if (reopened) { reopened.close(SaveOptions.DONOTSAVECHANGES); reopened = null; } if (doc) { doc.close(SaveOptions.DONOTSAVECHANGES); doc = null; } } catch (e) { emit("FAIL", "cleanup-close", e.message || e); ok = false; }
        if (tempFile) { try { if (tempFile.exists) ok = tempFile.remove() && ok; } catch (e2) { emit("FAIL", "cleanup-delete", tempFile.fsName + " | " + (e2.message || e2)); ok = false; } }
        if (ok) emit("PASS", "cleanup", "disposable document closed and temporary file removed");
    }
    try {
        var font, active, retired, foreign, activeNote, retiredNote, activeContents, retiredContents, found, foreignAfter, i;
        if (app.documents.length) fail("existing-document-open; refusing to touch user document");
        font = fontName(); doc = app.documents.add();
        active = candidate(activePhysicalId, "かな", font); retired = candidate(retiredPhysicalId, "カナ", font);
        foreign = doc.textFrames.add(); foreign.name = foreignName; foreign.contents = foreignContents;
        activeNote = String(active.frame.note); retiredNote = String(retired.frame.note); activeContents = String(active.frame.contents); retiredContents = String(retired.frame.contents);
        verifyIdentity(active.frame, activePhysicalId, activeNote, activeContents); verifyIdentity(retired.frame, retiredPhysicalId, retiredNote, retiredContents);
        if (resolve(activePhysicalId).status !== "found" || resolve(retiredPhysicalId).status !== "found") fail("before-save-resolve-failed");
        FormalAreaTextNativeOutputIdentity.stamp(active.frame, { sourceFrameId: sourceFrameId, physicalId: activePhysicalId });
        if (String(active.frame.note) !== activeNote) fail("restamp-not-byte-identical");
        try { FormalAreaTextNativeOutputIdentity.stamp(active.frame, { sourceFrameId: sourceFrameId, physicalId: "replacement" }); fail("replacement-accepted"); } catch (replaceError) { if (String(replaceError.message || replaceError) !== "native-output-identity-immutable") throw replaceError; }
        if (String(active.frame.note) !== activeNote) fail("replacement-mutated-note");
        try { FormalAreaTextNativeOutputIdentity.stamp(active.frame, { sourceFrameId: sourceFrameId + "-replacement", physicalId: activePhysicalId }); fail("source-replacement-accepted"); } catch (sourceReplaceError) { if (String(sourceReplaceError.message || sourceReplaceError) !== "native-output-identity-immutable") throw sourceReplaceError; }
        if (String(active.frame.note) !== activeNote) fail("source-replacement-mutated-note");
        emit("PASS", "before-save", "font=" + font + "; sourceFrameId=" + sourceFrameId);
        emit("PASS", "before-save-resolve", "active and retirement identities resolve uniquely");
        tempFile = new File(Folder.temp.fsName + "/FormalStep2NativeIdentityPersistence-" + String((new Date()).getTime()) + ".ai"); doc.saveAs(tempFile); emit("PASS", "save", tempFile.fsName);
        doc.close(SaveOptions.DONOTSAVECHANGES); doc = null; reopened = app.open(tempFile);
        found = resolve(activePhysicalId); if (found.status !== "found") fail("after-reopen-active-missing"); verifyIdentity(found.frame, activePhysicalId, activeNote, activeContents);
        found = resolve(retiredPhysicalId); if (found.status !== "found") fail("after-reopen-retired-missing"); verifyIdentity(found.frame, retiredPhysicalId, retiredNote, retiredContents);
        foreignAfter = null; for (i = 0; i < reopened.textFrames.length; i++) if (safe(reopened.textFrames[i].name) === foreignName) foreignAfter = reopened.textFrames[i];
        if (!foreignAfter || safe(foreignAfter.contents) !== foreignContents) fail("foreign-frame-missing-or-changed");
        emit("PASS", "after-reopen-resolve", "both identities parse and resolve uniquely"); emit("PASS", "foreign-frame", "unrelated TextFrame remains unrelated");
        found.frame.remove(); if (resolve(retiredPhysicalId).status !== "missing") fail("retired-remove-still-resolves"); if (resolve(activePhysicalId).status !== "found") fail("active-resolve-lost");
        emit("PASS", "identity-removal", "retirement candidate resolves missing while active identity remains found");
    } catch (e) { emit("FAIL", "runtime", e.message || e); }
    cleanup(); $.writeln(report.join("\n")); alert("Formal Step 2 AreaText-native identity persistence checkpoint\n" + report.join("\n"));
}());
