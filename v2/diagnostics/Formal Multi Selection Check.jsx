#target illustrator

/* Read-only selection/API checkpoint for the Gate D multi workflow. */
(function () {
    function line(text) { $.writeln("[formal-multi-selection] " + text); }
    function value(object, key) {
        try { return object && object[key]; } catch (error) { return "<error:" + (error.message || error) + ">"; }
    }
    function describeFrame(frame, index) {
        var range = value(frame, "textRange");
        line("frame[" + index + "] typename=" + value(frame, "typename") +
            " kind=" + value(frame, "kind") + " orientation=" + value(frame, "orientation") +
            " range=" + value(range, "start") + ".." + value(range, "end"));
    }
    function run() {
        var documentRef, selection, selected, story, frames, i, source, range, start, end;
        if (!app.documents.length) throw Error("AIファイルを開いてください");
        documentRef = app.activeDocument;
        selection = documentRef.selection;
        line("selection typename=" + value(selection, "typename") + " length=" + value(selection, "length"));
        if (selection && selection.typename === "TextRange") selected = selection;
        else if (selection && selection.length === 1) selected = selection[0];
        else throw Error("single selection required");
        line("selected typename=" + value(selected, "typename") + " start=" + value(selected, "start") + " end=" + value(selected, "end"));
        line("selected parent typename=" + value(value(selected, "parent"), "typename"));
        story = value(selected, "story");
        line("story exists=" + (!!story));
        frames = value(story, "textFrames");
        line("story.textFrames.length=" + value(frames, "length"));
        if (frames && typeof frames.length === "number") for (i = 0; i < frames.length; i++) describeFrame(frames[i], i);
        source = value(selected, "parent");
        if (!source || value(source, "typename") !== "TextFrame") {
            if (!frames || frames.length !== 1) throw Error("source frame is ambiguous");
            source = frames[0];
        }
        range = value(source, "textRange");
        start = value(selected, "start") - value(range, "start");
        end = value(selected, "end") - value(range, "start");
        line("chosen source typename=" + value(source, "typename") + " kind=" + value(source, "kind") + " orientation=" + value(source, "orientation"));
        line("source-relative=" + start + ".." + end + " text=" + String(value(source, "contents")).substring(start, end));
    }
    try { run(); line("result=PASS"); } catch (error) { line("result=FAIL error=" + (error.message || error)); }
}());
