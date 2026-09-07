/* Pure ScriptUI refresh guard; it owns event suppression only, not editor state. */
var FormalMultiUiRefresh = (function () {
    function refresh(list, occurrences, currentIndex, guard, loadEditor, label) {
        var i;
        guard.suppress = true;
        try {
            list.removeAll();
            for (i = 0; i < occurrences.length; i++) list.add("item", label(occurrences[i]));
            if (occurrences.length) { if (currentIndex < 0 || currentIndex >= occurrences.length) currentIndex = 0; list.selection = currentIndex; loadEditor(currentIndex); }
        } finally { guard.suppress = false; }
        return currentIndex;
    }
    function ignoreChange(guard, pending) { return guard.suppress || pending; }
    return { refresh: refresh, ignoreChange: ignoreChange };
}());
if (typeof module !== "undefined") module.exports = FormalMultiUiRefresh;
