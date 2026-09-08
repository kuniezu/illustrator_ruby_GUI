#target illustrator
#include "../formal-step2/area-text-native-store.js"
#include "../formal-step2/area-text-native-note-adapter.js"

(function () {
    var report = [], doc = null, reopened = null, tempFile = null;
    var PREFIX = "native-check-prefix|", SUFFIX = "|native-check-suffix";
    var MULTI = "[v2-formal-step2-multi:v1]\nschemaVersion=1\nrevision=0\nsourceFrameId=fixture\ntextSnapshot=%E7%94%B2\nrenderStatus=complete\nmanagedAnnotationIds=\n[/v2-formal-step2-multi]";

    function emit(status, stage, detail) { report.push(status + " " + stage + (detail ? " | " + detail : "")); }
    function fail(message) { throw Error(message); }
    function has(text, part) { return text.indexOf(part) >= 0; }
    function safe(value) { return value === undefined || value === null ? "" : String(value); }
    function nowToken() { return String((new Date()).getTime()); }
    function findTextFrame(document, name) {
        var i, item;
        for (i = 0; i < document.textFrames.length; i++) {
            item = document.textFrames[i];
            if (safe(item.name) === name) return item;
        }
        return null;
    }
    function record(physicalId, logicalSegmentId, requestId) {
        return {
            physicalId: physicalId, logicalSegmentId: logicalSegmentId,
            generationId: "diag-generation-1", requestId: requestId,
            rendererVersion: "area-text-native-v1", geometryVersion: "geometry-v1",
            autoLeft: 10, autoWidth: 40, appliedLeft: 10, appliedWidth: 40,
            appliedTop: 20, appliedHeight: 12, tracking: 0,
            fontName: "diagnostic-font", fontSize: 8,
            justification: "full", singleWordJustification: "full",
            fitReason: "fit-one-line-covered", evidence: { source: "diagnostic" }
        };
    }
    function activatedManifest() {
        var p1 = record("diag-active", "s1", "diag-activated");
        return {
            rendererMode: "area-text-native", manifestRevision: 4,
            activeBindings: { s1: "diag-active" },
            renderRecords: { "diag-active": p1, "diag-retired": record("diag-retired", "s-old", "old") },
            operation: { requestId: "diag-activated", baseRevision: 3, phase: "activated", candidateIds: ["diag-active"] },
            retirementQueue: ["diag-retired"]
        };
    }
    function verifiedManifest() {
        return {
            rendererMode: "area-text-native", manifestRevision: 7,
            activeBindings: { s2: "diag-verified" },
            renderRecords: { "diag-verified": record("diag-verified", "s2", "diag-verified") },
            operation: { requestId: "diag-verified", baseRevision: 7, phase: "verified", candidateIds: ["diag-verified"] },
            retirementQueue: []
        };
    }
    function createFixture(name, contents, manifest) {
        var frame = doc.textFrames.add(), before, expected;
        frame.name = name;
        frame.contents = contents;
        frame.note = PREFIX + MULTI + SUFFIX;
        before = String(frame.note);
        expected = FormalAreaTextNativeNoteAdapter.update(frame, before, manifest);
        if (!expected || !has(String(frame.note), PREFIX) || !has(String(frame.note), SUFFIX) || !has(String(frame.note), MULTI)) fail("fixture-note-coexistence-failed");
        return { name: name, contents: contents, before: before, manifest: manifest, frame: frame };
    }
    function assertManifest(actual, expected) {
        var plan;
        if (!actual || !expected) fail("manifest-missing");
        if (FormalAreaTextNativeStore.serialize(actual) !== FormalAreaTextNativeStore.serialize(expected)) fail("manifest-exact-readback-mismatch");
        plan = FormalAreaTextNativeStore.restartPlan(actual);
        if (expected.operation.phase === "activated" && plan.action !== "cleanup-retirement") fail("restart-plan-cleanup-mismatch");
        if (expected.operation.phase === "verified" && (plan.action !== "reprepare-reverify" || plan.requestId !== expected.operation.requestId)) fail("restart-plan-reverify-mismatch");
        return plan.action;
    }
    function verifyFixture(fixture) {
        var frame = findTextFrame(reopened, fixture.name), actual, plan, uuid = "";
        if (!frame) fail("fixture-not-found:" + fixture.name);
        if (safe(frame.contents) !== fixture.contents) fail("source-contents-changed:" + fixture.name);
        actual = FormalAreaTextNativeStore.read(String(frame.note));
        plan = assertManifest(actual, fixture.manifest);
        try { uuid = safe(frame.uuid); } catch (e) { uuid = "unavailable"; }
        emit("PASS", fixture.name + ":readback", "restartPlan=" + plan + ";typename=" + safe(frame.typename) + ";uuid=" + uuid);
        if (!has(String(frame.note), PREFIX) || !has(String(frame.note), SUFFIX) || !has(String(frame.note), MULTI)) fail("note-coexistence-lost:" + fixture.name);
        emit("PASS", fixture.name + ":coexistence", "prefix/multi/suffix preserved");
        return frame;
    }
    function cleanup() {
        var removed = true;
        try {
            if (reopened) { reopened.close(SaveOptions.DONOTSAVECHANGES); reopened = null; }
            if (doc) { doc.close(SaveOptions.DONOTSAVECHANGES); doc = null; }
        } catch (e) { emit("FAIL", "cleanup-close", e.message || e); removed = false; }
        if (tempFile) {
            try { if (tempFile.exists) removed = tempFile.remove() && removed; } catch (e2) { emit("FAIL", "cleanup-delete", tempFile.fsName + " | " + (e2.message || e2)); removed = false; }
            if (!removed && tempFile.exists) emit("FAIL", "cleanup-file", tempFile.fsName);
        }
        if (removed) emit("PASS", "cleanup", "disposable document closed and temporary file removed");
    }
    try {
        var primary, secondary, unmanaged, primaryAfter, secondaryAfter;
        if (app.documents.length) fail("existing-document-open; refusing to touch user document");
        doc = app.documents.add();
        primary = createFixture("FormalStep2NativeCheck-activated", "一張羅", activatedManifest());
        secondary = createFixture("FormalStep2NativeCheck-verified", "二文字", verifiedManifest());
        unmanaged = doc.textFrames.add(); unmanaged.name = "FormalStep2NativeCheck-foreign"; unmanaged.contents = "foreign";
        emit("PASS", "before-save", "native store/adapter wrote both disposable fixtures");
        tempFile = new File(Folder.temp.fsName + "/FormalStep2NativePersistence-" + nowToken() + ".ai");
        doc.saveAs(tempFile);
        emit("PASS", "save", tempFile.fsName);
        doc.close(SaveOptions.DONOTSAVECHANGES); doc = null;
        reopened = app.open(tempFile);
        primaryAfter = verifyFixture(primary);
        secondaryAfter = verifyFixture(secondary);
        if (!findTextFrame(reopened, unmanaged.name)) fail("foreign-frame-missing");
        emit("PASS", "foreign-frame", "unmanaged disposable TextFrame remains present");
        emit("PASS", "application", "version=" + safe(app.version));
    } catch (e) { emit("FAIL", "runtime", e.message || e); }
    cleanup();
    $.writeln(report.join("\n"));
    alert("Formal Step 2 AreaText-native persistence checkpoint\n" + report.join("\n"));
}());
