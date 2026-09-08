/* Isolated durable coordinator. It is not wired into production persistence. */
var FormalAreaTextNativeTransactionCoordinator = (function () {
    function fail(message) { throw Error(message); }
    function own(object, key) { return Object.prototype.hasOwnProperty.call(object, key); }
    function persist(source, expectedContents, expectedNote, state, operation, args) {
        var callArgs = [state], i, next;
        if (!own(FormalAreaTextNative, operation)) fail("native-coordinator-operation-invalid");
        for (i = 0; i < (args || []).length; i++) callArgs.push(args[i]);
        next = FormalAreaTextNative[operation].apply(null, callArgs);
        return FormalAreaTextNativePersistenceFacade.update(source, expectedContents, expectedNote, next);
    }
    function begin(source, expectedContents, expectedNote, state, requestId, candidateIds) {
        return persist(source, expectedContents, expectedNote, state, "beginOperation", [requestId, candidateIds]);
    }
    function verify(source, expectedContents, expectedNote, state, requestId) {
        return persist(source, expectedContents, expectedNote, state, "markVerified", [requestId]);
    }
    function activate(source, expectedContents, expectedNote, state, requestId, bindings, records, retireIds, discardedIds) {
        return persist(source, expectedContents, expectedNote, state, "activate", [requestId, bindings, records, retireIds, discardedIds]);
    }
    function retire(source, expectedContents, expectedNote, state, removedIds) {
        return persist(source, expectedContents, expectedNote, state, "markRetired", [removedIds]);
    }
    function finish(source, expectedContents, expectedNote, state, requestId) {
        return persist(source, expectedContents, expectedNote, state, "finishOperation", [requestId]);
    }
    return { begin: begin, verify: verify, activate: activate, retire: retire, finish: finish };
}());
if (typeof module !== "undefined") module.exports = FormalAreaTextNativeTransactionCoordinator;
