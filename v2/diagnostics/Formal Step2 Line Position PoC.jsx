#target illustrator

(function () {
    var report = [], temporary = [], source;
    function line(text) { report.push(String(text)); }
    function read(label, fn) { try { line(label + "=" + String(fn())); } catch (e) { line(label + "=ERROR: " + (e.message || e)); } }
    function bounds(prefix, item) {
        read(prefix + ".position", function () { return item.position; });
        read(prefix + ".anchor", function () { return item.anchor; });
        read(prefix + ".visibleBounds", function () { return item.visibleBounds; });
        read(prefix + ".geometricBounds", function () { return item.geometricBounds; });
    }
    try {
        if (!app.documents.length) throw Error("AIファイルを開いてください");
        var doc = app.activeDocument, selection = doc.selection;
        if (!selection || selection.length !== 1 || selection[0].typename !== "TextFrame") throw Error("TextFrameを1個だけ選択してください");
        source = selection[0];
        line("Formal Step 2 line position PoC");
        bounds("source", source);
        read("source.textPath", function () { return source.textPath; });
        read("source.textPath.width", function () { return source.textPath.width; });
        read("source.textPath.geometricBounds", function () { return source.textPath.geometricBounds; });
        var range = source.textRange, i, current, text, point, duplicate;
        for (i = 0; i < range.lines.length; i++) {
            current = range.lines[i]; text = String(source.contents).substring(current.start - range.start, current.end - range.start);
            line("line[" + i + "]=" + current.start + "/" + current.end + ",text=" + text);
            point = source.layer.textFrames.add(); temporary.push(point); point.kind = TextType.POINTTEXT; point.contents = text;
            point.textRange.characterAttributes.textFont = current.characters[0].characterAttributes.textFont;
            point.textRange.characterAttributes.size = current.characters[0].characterAttributes.size;
            point.textRange.characterAttributes.tracking = current.characters[0].characterAttributes.tracking;
            point.position = [source.left, source.top];
            bounds("line[" + i + "].temporaryPoint", point);
            duplicate = source.duplicate(source.layer, ElementPlacement.PLACEATEND); temporary.push(duplicate); duplicate.contents = text;
            bounds("line[" + i + "].duplicateArea", duplicate);
            read("line[" + i + "].leading", function () { return current.characters[0].characterAttributes.leading; });
        }
    } catch (e) { line("probe=ERROR: " + (e.message || e)); }
    finally {
        for (var j = temporary.length - 1; j >= 0; j--) try { temporary[j].remove(); } catch (ignore) { line("cleanup=ERROR: " + (ignore.message || ignore)); }
    }
    var output = report.join("\n"); $.writeln(output); alert("Line position PoC完了。Debug Consoleからレポート全文をコピーしてください。\n取得行数: " + report.length);
}());
