/* Isolated native persistence facade. It is not wired into production persistence. */
var FormalAreaTextNativePersistenceFacade = (function () {
    function fail(message) { throw Error(message); }
    function text(value) { return value === undefined || value === null ? "" : String(value); }
    function target(source) {
        if (!source || typeof source.note !== "string") fail("native-facade-source-invalid");
        if (typeof source.contents !== "string") fail("native-facade-contents-invalid");
    }
    function read(source) {
        var note, manifest;
        target(source);
        note = String(source.note);
        manifest = FormalAreaTextNativeStore.read(note);
        return {
            sourceContents: String(source.contents),
            note: note,
            manifest: manifest,
            restartPlan: manifest ? FormalAreaTextNativeStore.restartPlan(manifest) : { action: "idle" }
        };
    }
    function update(source, expectedContents, expectedNote, manifest) {
        var beforeContents, beforeNote, parsed, result;
        target(source);
        beforeContents = String(source.contents);
        beforeNote = String(source.note);
        if (beforeContents !== String(expectedContents)) fail("concurrent-source-change");
        if (beforeNote !== String(expectedNote)) fail("concurrent-note-change");
        parsed = FormalAreaTextNativeNoteAdapter.update(source, beforeNote, manifest);
        result = read(source);
        if (result.sourceContents !== beforeContents) fail("native-facade-contents-readback-mismatch");
        if (!result.manifest || FormalAreaTextNativeStore.serialize(result.manifest) !== FormalAreaTextNativeStore.serialize(parsed)) fail("native-facade-manifest-readback-mismatch");
        return { status: "success", sourceContents: result.sourceContents, note: result.note, manifest: result.manifest, restartPlan: result.restartPlan };
    }
    return { read: read, update: update };
}());
if (typeof module !== "undefined") module.exports = FormalAreaTextNativePersistenceFacade;
