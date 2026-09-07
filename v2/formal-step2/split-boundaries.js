/* ScriptUI boundary picker; model boundaries remain UTF-16 offsets. */
var FormalSplitBoundaryUi = (function () {
    function labels(text) {
        var source = String(text), result = [], i;
        for (i = 1; i < source.length; i++) result.push(source.substring(0, i) + " | " + source.substring(i));
        return result;
    }
    function choose(text) {
        var dialog = new Window("dialog", "局所分割境界"), list, actions, ok, cancel, items, result = [], i;
        list = dialog.add("listbox", undefined, [], {multiselect: true});
        list.preferredSize = [520, 360];
        items = labels(text);
        for (i = 0; i < items.length; i++) list.add("item", (i + 1) + "  " + items[i]);
        actions = dialog.add("group");
        ok = actions.add("button", undefined, "決定", {name: "ok"});
        cancel = actions.add("button", undefined, "キャンセル", {name: "cancel"});
        dialog.defaultElement = ok;
        dialog.cancelElement = cancel;
        if (dialog.show() !== 1) return null;
        if (!list.selection) return [];
        if (list.selection instanceof Array) {
            for (i = 0; i < list.selection.length; i++) result.push(list.selection[i].index + 1);
        } else result.push(list.selection.index + 1);
        result.sort(function (a, b) { return a - b; });
        return result;
    }
    return {labels: labels, choose: choose};
}());
if (typeof module !== "undefined") module.exports = FormalSplitBoundaryUi;
