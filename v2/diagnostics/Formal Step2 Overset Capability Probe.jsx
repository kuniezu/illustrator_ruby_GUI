#target illustrator

/* Read-only probe for Illustrator's observable AreaText/Story range contract. */
(function () {
    var report = [];
    function emit(value) { report.push(String(value)); }
    function read(label, getter) { try { emit(label + "=PASS " + String(getter())); } catch (error) { emit(label + "=ERROR " + (error.message || error)); } }
    function lineInfo(label, line, range) {
        read(label + ".start", function () { return line.start; });
        read(label + ".end", function () { return line.end; });
        read(label + ".characters.length", function () { return line.characters.length; });
        read(label + ".visibleBounds", function () { return line.visibleBounds; });
        read(label + ".contents.length", function () { return String(range.contents).length; });
    }
    try {
        if (!app.documents.length) throw Error("AIファイルを開いてください");
        var documentRef = app.activeDocument, selection = documentRef.selection, source, range, story, storyRange, i, currentLine;
        if (!selection || selection.length !== 1 || selection[0].typename !== "TextFrame") throw Error("AreaTextを1個だけ選択してください");
        source = selection[0];
        if (source.kind !== TextType.AREATEXT || source.orientation !== TextOrientation.HORIZONTAL) throw Error("横書きAreaTextを選択してください");
        emit("MANUAL_REQUIRED Formal Step 2 overset capability probe");
        read("frame.contents.length", function () { return String(source.contents).length; });
        read("frame.textRange.start", function () { return source.textRange.start; });
        read("frame.textRange.end", function () { return source.textRange.end; });
        range = source.textRange;
        read("frame.lines.length", function () { return range.lines.length; });
        for (i = 0; i < range.lines.length; i++) { currentLine = range.lines[i]; lineInfo("frame.lines[" + i + "]", currentLine, range); }
        story = source.story;
        read("story.textRange.start", function () { return story.textRange.start; });
        read("story.textRange.end", function () { return story.textRange.end; });
        storyRange = story.textRange;
        read("story.textRange.contents.length", function () { return String(storyRange.contents).length; });
        read("story.lines.length", function () { return storyRange.lines.length; });
        emit("hidden-start=INCONCLUSIVE no documented Illustrator overset property or visible-range contract");
        emit("partial-overset=INCONCLUSIVE inspect frame/story line and character ranges above");
        emit("full-overset=INCONCLUSIVE inspect zero visible lines versus nonzero contents above");
        emit("empty-line=INCONCLUSIVE inspect line entries with zero characters above");
    } catch (error) { emit("probe=ERROR " + (error.message || error)); }
    var output = report.join("\n");
    $.writeln(output);
    alert("Overset capability probe完了。Debug Consoleのレポートを保存してください。\n\n" + output);
}());
