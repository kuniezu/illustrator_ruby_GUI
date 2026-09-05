#target illustrator

(function () {
    var report = [], temporary = [];
    function line(text) { report.push(String(text)); }
    function read(label, fn) { try { line(label + "=" + String(fn())); } catch (e) { line(label + "=ERROR: " + (e.message || e)); } }
    try {
        if (!app.documents.length) throw Error("AIファイルを開いてください");
        var doc = app.activeDocument, selection = doc.selection;
        if (!selection || selection.length !== 1 || selection[0].typename !== "TextFrame") throw Error("TextFrameを1個だけ選択してください");
        var source = selection[0], duplicate = source.duplicate(source.layer, ElementPlacement.PLACEATEND), outline, i, child;
        temporary.push(duplicate);
        line("Formal Step 2 outline position PoC");
        outline = duplicate.createOutline(); temporary.push(outline);
        read("outline.typename", function () { return outline.typename; });
        read("outline.visibleBounds", function () { return outline.visibleBounds; });
        read("outline.geometricBounds", function () { return outline.geometricBounds; });
        read("outline.pageItems.length", function () { return outline.pageItems.length; });
        for (i = 0; i < outline.pageItems.length; i++) {
            child = outline.pageItems[i];
            read("outline.pageItems[" + i + "].typename", function () { return child.typename; });
            read("outline.pageItems[" + i + "].visibleBounds", function () { return child.visibleBounds; });
            read("outline.pageItems[" + i + "].geometricBounds", function () { return child.geometricBounds; });
        }
    } catch (e) { line("probe=ERROR: " + (e.message || e)); }
    finally { for (var j = temporary.length - 1; j >= 0; j--) try { if (temporary[j] && temporary[j].parent) temporary[j].remove(); } catch (ignore) { line("cleanup=ERROR: " + (ignore.message || ignore)); } }
    var output = report.join("\n"); $.writeln(output); alert("Outline position PoC完了。Debug Consoleからレポート全文をコピーしてください。\n取得行数: " + report.length);
}());
