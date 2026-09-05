#target illustrator

(function () {
    var report = [];
    function line(text) { report.push(String(text)); }
    function read(label, fn) {
        try { line(label + "=" + String(fn())); }
        catch (e) { line(label + "=ERROR: " + (e.message || e)); }
    }
    function probeObject(prefix, object, names) {
        var i;
        for (i = 0; i < names.length; i++) read(prefix + "." + names[i], (function (name) {
            return function () { return object[name]; };
        }(names[i])));
    }
    try {
        if (!app.documents.length) throw Error("AIファイルを開いてください");
        var documentRef = app.activeDocument, selection = documentRef.selection;
        if (!selection || selection.length !== 1 || selection[0].typename !== "TextFrame") throw Error("TextFrameを1個だけ選択してください");
        var source = selection[0], range = source.textRange;
        line("Formal Step 2 DOM capability probe");
        probeObject("frame", source, ["typename", "kind", "orientation", "left", "top", "width", "height", "geometricBounds", "visibleBounds"]);
        probeObject("textRange", range, ["start", "end"]);
        read("textRange.lines.length", function () { return range.lines.length; });
        var i, currentLine, firstCharacter;
        for (i = 0; i < range.lines.length; i++) {
            currentLine = range.lines[i];
            probeObject("line[" + i + "]", currentLine, ["start", "end", "left", "top", "width", "height", "geometricBounds", "visibleBounds", "characters"]);
            read("line[" + i + "].characters.length", function () { return currentLine.characters.length; });
            if (currentLine.characters.length) {
                firstCharacter = currentLine.characters[0];
                probeObject("line[" + i + "].firstCharacter", firstCharacter, ["contents", "position", "geometricBounds", "visibleBounds"]);
                read("line[" + i + "].firstCharacter.characterAttributes.size", function () { return firstCharacter.characterAttributes.size; });
                read("line[" + i + "].firstCharacter.characterAttributes.tracking", function () { return firstCharacter.characterAttributes.tracking; });
                read("line[" + i + "].firstCharacter.characterAttributes.baselineShift", function () { return firstCharacter.characterAttributes.baselineShift; });
            }
        }
    } catch (e) { line("probe=ERROR: " + (e.message || e)); }
    var output = report.join("\n");
    $.writeln(output);
    alert("DOM probe完了。Debug Consoleからレポート全文をコピーしてください。\n取得行数: " + report.length);
}());
