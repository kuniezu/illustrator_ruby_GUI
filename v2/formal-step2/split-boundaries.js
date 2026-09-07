/* ScriptUI boundary picker; model boundaries remain UTF-16 offsets. */
var FormalSplitBoundaryUi = (function () {
    function boundaryItems(text) {
        var source = String(text), result = [], i = 0, next, character;
        while (i < source.length) {
            next = i + 1 < source.length ? source.charCodeAt(i + 1) : 0;
            character = source.charCodeAt(i) >= 0xd800 && source.charCodeAt(i) <= 0xdbff && next >= 0xdc00 && next <= 0xdfff ? source.substring(i, i + 2) : source.charAt(i);
            i += character.length;
            if (i < source.length) result.push({character: character, offset: i});
        }
        return result;
    }
    function choose(text) {
        var dialog = new Window("dialog", "局所分割境界"), list, actions, ok, cancel, items, result = [], i;
        list = dialog.add("listbox", undefined, [], {multiselect: true});
        list.preferredSize = [520, 360];
        items = boundaryItems(text);
        for (i = 0; i < items.length; i++) list.add("item", "「" + items[i].character + "」の後");
        actions = dialog.add("group");
        ok = actions.add("button", undefined, "決定", {name: "ok"});
        cancel = actions.add("button", undefined, "キャンセル", {name: "cancel"});
        dialog.defaultElement = ok;
        dialog.cancelElement = cancel;
        if (dialog.show() !== 1) return null;
        if (!list.selection) return [];
        if (list.selection instanceof Array) {
            for (i = 0; i < list.selection.length; i++) result.push(items[list.selection[i].index].offset);
        } else result.push(items[list.selection.index].offset);
        result.sort(function (a, b) { return a - b; });
        return result;
    }
    return {boundaryItems: boundaryItems, choose: choose};
}());
if (typeof module !== "undefined") module.exports = FormalSplitBoundaryUi;
