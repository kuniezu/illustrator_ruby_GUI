/* Isolated durable coordinator. It is not wired into production persistence. */
var FormalAreaTextNativeTransactionCoordinator = (function () {
    function fail(message) { throw Error(message); }
    function own(object, key) { return Object.prototype.hasOwnProperty.call(object, key); }
    function persist(source, expectedContents, expectedNote, operation, args) {
        var snapshot = FormalAreaTextNativePersistenceFacade.read(source), state, callArgs, i, next;
        if (snapshot.sourceContents !== String(expectedContents)) fail("concurrent-source-change");
        if (snapshot.note !== String(expectedNote)) fail("concurrent-note-change");
        state = snapshot.manifest;
        if (!state) {
            if (operation === "beginOperation") state = FormalAreaTextNative.createManifest();
            else fail("native-coordinator-manifest-missing");
        }
        callArgs = [state];
        if (!own(FormalAreaTextNative, operation)) fail("native-coordinator-operation-invalid");
        for (i = 0; i < (args || []).length; i++) callArgs.push(args[i]);
        next = FormalAreaTextNative[operation].apply(null, callArgs);
        return FormalAreaTextNativePersistenceFacade.update(source, expectedContents, expectedNote, next);
    }
    function begin(source, expectedContents, expectedNote, requestId, candidateIds) {
        return persist(source, expectedContents, expectedNote, "beginOperation", [requestId, candidateIds]);
    }
    function verify(source, expectedContents, expectedNote, requestId) {
        return persist(source, expectedContents, expectedNote, "markVerified", [requestId]);
    }
    function activate(source, expectedContents, expectedNote, requestId, bindings, records, retireIds, discardedIds) {
        return persist(source, expectedContents, expectedNote, "activate", [requestId, bindings, records, retireIds, discardedIds]);
    }
    function retire(source, expectedContents, expectedNote, removedIds) {
        return persist(source, expectedContents, expectedNote, "markRetired", [removedIds]);
    }
    function finish(source, expectedContents, expectedNote, requestId) {
        return persist(source, expectedContents, expectedNote, "finishOperation", [requestId]);
    }
    return { begin: begin, verify: verify, activate: activate, retire: retire, finish: finish };
}());
if (typeof module !== "undefined") module.exports = FormalAreaTextNativeTransactionCoordinator;
