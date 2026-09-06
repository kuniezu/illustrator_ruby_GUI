#target illustrator

/* Read-only research probe. It does not change selection, source text, or document state. */
(function () {
    var report = [], candidates = [], candidateNames = [];

    function emit(text) { report.push(String(text)); }
    function printable(value) {
        try { return String(value); } catch (error) { return "<string-error:" + (error.message || error) + ">"; }
    }
    function read(path, getter) {
        try { var result = getter(); emit(path + "=PASS value=" + printable(result)); return result; }
        catch (error) { emit(path + "=ERROR " + (error.message || error)); return null; }
    }
    function value(object, key) {
        try { return object[key]; } catch (error) { throw Error(key + ": " + (error.message || error)); }
    }
    function numberValue(valueToConvert) {
        try { return Number(valueToConvert); } catch (error) { return "<number-error:" + (error.message || error) + ">"; }
    }
    function compare(path, left, right, label) {
        try { emit(path + "." + label + ".loose=" + (left == right)); }
        catch (error) { emit(path + "." + label + ".loose=ERROR " + (error.message || error)); }
        try { emit(path + "." + label + ".strict=" + (left === right)); }
        catch (error) { emit(path + "." + label + ".strict=ERROR " + (error.message || error)); }
    }
    function addCandidate(name, frame) {
        var i;
        if (!frame) return;
        try { if (frame.typename !== "TextFrame") return; } catch (error) { emit(name + ".typename=ERROR " + (error.message || error)); return; }
        for (i = 0; i < candidates.length; i++) if (candidates[i] === frame) return;
        candidates.push(frame); candidateNames.push(name);
    }
    function probeFrame(name, frame) {
        var range, story, frames, i, area, path, kind, orientation, typeConstants, orientationConstants;
        emit("candidate=" + name);
        read(name + ".typename", function () { return value(frame, "typename"); });
        kind = read(name + ".kind.raw", function () { return value(frame, "kind"); });
        read(name + ".kind.String", function () { return printable(value(frame, "kind")); });
        read(name + ".kind.Number", function () { return numberValue(value(frame, "kind")); });
        typeConstants = [{name:"AREATEXT", value:TextType.AREATEXT}, {name:"POINTTEXT", value:TextType.POINTTEXT}, {name:"PATHTEXT", value:TextType.PATHTEXT}];
        for (i = 0; i < typeConstants.length; i++) {
            read(name + ".TextType." + typeConstants[i].name + ".raw", (function (constant) { return function () { return constant.value; }; }(typeConstants[i])));
            read(name + ".TextType." + typeConstants[i].name + ".String", (function (constant) { return function () { return printable(constant.value); }; }(typeConstants[i])));
            compare(name + ".kind", kind, typeConstants[i].value, "TextType." + typeConstants[i].name);
        }
        orientation = read(name + ".orientation.raw", function () { return value(frame, "orientation"); });
        read(name + ".orientation.String", function () { return printable(value(frame, "orientation")); });
        read(name + ".orientation.Number", function () { return numberValue(value(frame, "orientation")); });
        orientationConstants = [{name:"HORIZONTAL", value:TextOrientation.HORIZONTAL}, {name:"VERTICAL", value:TextOrientation.VERTICAL}];
        for (i = 0; i < orientationConstants.length; i++) {
            read(name + ".TextOrientation." + orientationConstants[i].name + ".raw", (function (constant) { return function () { return constant.value; }; }(orientationConstants[i])));
            read(name + ".TextOrientation." + orientationConstants[i].name + ".String", (function (constant) { return function () { return printable(constant.value); }; }(orientationConstants[i])));
            compare(name + ".orientation", orientation, orientationConstants[i].value, "TextOrientation." + orientationConstants[i].name);
        }
        read(name + ".contents.length", function () { return String(value(frame, "contents")).length; });
        range = read(name + ".textRange", function () { return value(frame, "textRange"); });
        if (range) {
            read(name + ".textRange.start", function () { return value(range, "start"); });
            read(name + ".textRange.end", function () { return value(range, "end"); });
        }
        path = read(name + ".textPath", function () { return value(frame, "textPath"); });
        if (path) read(name + ".textPath.typename", function () { return value(path, "typename"); });
        read(name + ".rowCount", function () { return value(frame, "rowCount"); });
        read(name + ".columnCount", function () { return value(frame, "columnCount"); });
        story = read(name + ".story", function () { return value(frame, "story"); });
        if (story) {
            read(name + ".story.typename", function () { return value(story, "typename"); });
            frames = read(name + ".story.textFrames", function () { return value(story, "textFrames"); });
            if (frames) {
                read(name + ".story.textFrames.length", function () { return value(frames, "length"); });
                if (typeof frames.length === "number") for (i = 0; i < frames.length; i++) {
                    read(name + ".story.textFrames[" + i + "].typename", (function (item) { return function () { return value(item, "typename"); }; }(frames[i])));
                    addCandidate(name + ".story.textFrames[" + i + "]", frames[i]);
                }
            }
        }
        area = numberValue(value(frame, "rowCount"));
        emit(name + ".structural-area-evidence=" + (typeof area === "number" && !isNaN(area) ? "PASS rowCount-numeric" : "INCONCLUSIVE rowCount-not-numeric"));
    }
    function strategy(name, frame, strict) {
        var kind, orientation, kindMatch, orientationMatch;
        if (!frame) { emit("strategy." + name + "=INCONCLUSIVE no-frame-candidate"); return; }
        try { kind = frame.kind; orientation = frame.orientation; kindMatch = strict ? kind === TextType.AREATEXT : kind == TextType.AREATEXT; orientationMatch = strict ? orientation === TextOrientation.HORIZONTAL : orientation == TextOrientation.HORIZONTAL; emit("strategy." + name + "=" + (kindMatch && orientationMatch ? "PASS" : "FAIL") + " kind=" + kindMatch + " orientation=" + orientationMatch); }
        catch (error) { emit("strategy." + name + "=ERROR " + (error.message || error)); }
    }
    function run() {
        var documentRef, selection, first, firstType, parent, story, frames, i, directFrame = null, derivedFrame = null, structuralKind;
        if (!app.documents.length) throw Error("AIファイルを開いてください");
        documentRef = app.activeDocument;
        emit("probe=Formal Step 2 TextFrame Multi-Path Probe");
        read("app.version", function () { return app.version; });
        read("$.os", function () { return $.os; });
        selection = read("document.selection", function () { return documentRef.selection; });
        read("document.selection.typename", function () { return selection && selection.typename; });
        read("document.selection.length", function () { return selection && selection.length; });
        if (selection && selection.typename === "TextFrame") { directFrame = selection; addCandidate("selection-direct", selection); }
        if (selection && typeof selection.length === "number") for (i = 0; i < selection.length; i++) {
            read("selection[" + i + "].typename", (function (item) { return function () { return value(item, "typename"); }; }(selection[i])));
            addCandidate("selection[" + i + "]", selection[i]);
        }
        if (selection && typeof selection.length === "number" && selection.length) {
            first = selection[0];
            read("selection[0].start", function () { return value(first, "start"); });
            read("selection[0].end", function () { return value(first, "end"); });
            firstType = read("selection[0].typename", function () { return value(first, "typename"); });
            if (firstType === "TextFrame") directFrame = first;
            if (firstType === "TextRange") {
                parent = read("selection[0].parent", function () { return value(first, "parent"); });
                if (parent) { derivedFrame = parent; addCandidate("selection[0].parent", parent); }
                story = read("selection[0].story", function () { return value(first, "story"); });
                if (story) {
                    frames = read("selection[0].story.textFrames", function () { return value(story, "textFrames"); });
                    if (frames && typeof frames.length === "number") for (i = 0; i < frames.length; i++) addCandidate("selection[0].story.textFrames[" + i + "]", frames[i]);
                }
            }
        }
        for (i = 0; i < candidates.length; i++) {
            try { probeFrame(candidateNames[i], candidates[i]); }
            catch (error) { emit("candidate=" + candidateNames[i] + "=ERROR " + (error.message || error)); }
        }
        strategy("A-direct-strict", directFrame, true);
        strategy("B-direct-loose", directFrame, false);
        strategy("C-derived-strict", derivedFrame, true);
        if (candidates.length) {
            read("strategy.D.rowCount", function () { return value(candidates[0], "rowCount"); });
            read("strategy.D.columnCount", function () { return value(candidates[0], "columnCount"); });
            read("strategy.D.textPath.typename", function () { return value(value(candidates[0], "textPath"), "typename"); });
            try { structuralKind = candidates[0].kind; emit("strategy.D=" + (structuralKind == TextType.AREATEXT ? "PASS area-kind-structural-evidence" : "INCONCLUSIVE structural-only")); }
            catch (error) { emit("strategy.D=ERROR " + (error.message || error)); }
        } else emit("strategy.D=INCONCLUSIVE no-frame-candidate");
    }
    try { run(); } catch (error) { emit("probe=ERROR " + (error.message || error)); }
    var output = report.join("\n");
    $.writeln(output);
    alert("TextFrame Multi-Path Probe完了。Debug Consoleの同じレポートを保存してください。\n\n" + output);
}());
