/* Isolated optimistic note adapter. It is not wired into production persistence. */
var FormalAreaTextNativeNoteAdapter = (function () {
    function update(target, expectedNote, manifest) {
        if (typeof FormalAreaTextNativeStore === "undefined") throw Error("native-store-unavailable");
        return FormalAreaTextNativeStore.update(target, expectedNote, manifest);
    }
    return { update: update };
}());
if (typeof module !== "undefined") module.exports = FormalAreaTextNativeNoteAdapter;
