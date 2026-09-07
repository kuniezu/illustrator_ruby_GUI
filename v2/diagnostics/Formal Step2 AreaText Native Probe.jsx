#target illustrator
/*
 * AreaText-native capability probe scaffold.
 * Creates and closes its own unsaved document. It does not touch the user's source document.
 * Runtime evidence remains user-owned; this file is not part of the production renderer.
 */
(function () {
    var report = [], probeDoc = null, layer = null, created = [];
    var TRACKING = [0, -25, -50, -75, -100];

    function text(value) { try { return String(value); } catch (ignore) { return "<unavailable>"; } }
    function log(caseId, status, detail) { report.push(caseId + "\t" + status + "\t" + detail); }
    function count(collection) { try { return collection.length; } catch (ignore) { return -1; } }
    function safe(label, fn) { try { return label + "=" + text(fn()); } catch (e) { return label + "=ERROR:" + text(e.message || e); } }
    function finiteInteger(value) { return typeof value === "number" && isFinite(value) && Math.floor(value) === value; }

    function createCandidate(caseId, left, top, width, height, contents, size) {
        var path = null, frame = null, beforeFrames = count(probeDoc.textFrames), beforePaths = count(probeDoc.pathItems);
        try {
            path = layer.pathItems.rectangle(top, left, width, height);
            path.filled = false;
            path.stroked = false;
            frame = layer.textFrames.areaText(path);
            frame.contents = contents;
            frame.textRange.characterAttributes.size = size;
            frame.textRange.characterAttributes.tracking = 0;
            created.push({caseId:caseId, frame:frame, path:path});
            log(caseId, "CREATE", "beforeFrames=" + beforeFrames + ",afterFrames=" + count(probeDoc.textFrames) + ",beforePaths=" + beforePaths + ",afterPaths=" + count(probeDoc.pathItems) + "," + safe("kind", function(){return frame.kind;}) + "," + safe("orientation", function(){return frame.orientation;}));
            return {caseId:caseId, frame:frame, path:path};
        } catch (e) {
            log(caseId, "FAIL", "create:" + text(e.message || e));
            if (frame) try { frame.remove(); } catch (ignoreFrame) {}
            if (path) try { if (path.parent) path.remove(); } catch (ignorePath) {}
            return null;
        }
    }

    function lineSnapshot(frame) {
        var range = frame.textRange, lines = [], i, line;
        for (i = 0; i < range.lines.length; i++) {
            line = range.lines[i];
            lines.push({start:line.start,end:line.end,contents:text(line.contents)});
        }
        return {
            frameContents:text(frame.contents),
            rangeContents:text(range.contents),
            rangeStart:range.start,
            rangeEnd:range.end,
            lines:lines
        };
    }

    function snapshotKey(snapshot) {
        var out = snapshot.frameContents + "|" + snapshot.rangeContents + "|" + snapshot.rangeStart + ":" + snapshot.rangeEnd + "|", i;
        for (i = 0; i < snapshot.lines.length; i++) out += snapshot.lines[i].start + ":" + snapshot.lines[i].end + ":" + snapshot.lines[i].contents + "|";
        return out;
    }

    function observe(caseId, frame) {
        var a, b, range, details = [];
        try {
            app.redraw();
            a = lineSnapshot(frame);
            app.redraw();
            b = lineSnapshot(frame);
            range = frame.textRange;
            details.push("stable=" + (snapshotKey(a) === snapshotKey(b)));
            details.push("frameContents=" + a.frameContents);
            details.push("range=" + a.rangeStart + ":" + a.rangeEnd);
            details.push("lines=" + a.lines.length);
            details.push(safe("frameLeft",function(){return frame.left;}));
            details.push(safe("frameTop",function(){return frame.top;}));
            details.push(safe("frameWidth",function(){return frame.width;}));
            details.push(safe("frameHeight",function(){return frame.height;}));
            details.push(safe("textPathLeft",function(){return frame.textPath.left;}));
            details.push(safe("textPathTop",function(){return frame.textPath.top;}));
            details.push(safe("textPathWidth",function(){return frame.textPath.width;}));
            details.push(safe("textPathHeight",function(){return frame.textPath.height;}));
            details.push(safe("previousFrame",function(){return frame.previousFrame ? "present" : "none";}));
            details.push(safe("nextFrame",function(){return frame.nextFrame ? "present" : "none";}));
            details.push(safe("horizontalScale",function(){return range.characterAttributes.horizontalScale;}));
            details.push(safe("verticalScale",function(){return range.characterAttributes.verticalScale;}));
            details.push(safe("tracking",function(){return range.characterAttributes.tracking;}));
            details.push(safe("justification",function(){return range.paragraphAttributes.justification;}));
            details.push(safe("singleWordJustification",function(){return range.paragraphAttributes.singleWordJustification;}));
            details.push(safe("minGlyph",function(){return range.paragraphAttributes.minimumGlyphScaling;}));
            details.push(safe("desiredGlyph",function(){return range.paragraphAttributes.desiredGlyphScaling;}));
            details.push(safe("maxGlyph",function(){return range.paragraphAttributes.maximumGlyphScaling;}));
            details.push(safe("minLetter",function(){return range.paragraphAttributes.minimumLetterSpacing;}));
            details.push(safe("desiredLetter",function(){return range.paragraphAttributes.desiredLetterSpacing;}));
            details.push(safe("maxLetter",function(){return range.paragraphAttributes.maximumLetterSpacing;}));
            log(caseId, "OBSERVE", details.join(","));
            return {first:a, second:b, stable:snapshotKey(a) === snapshotKey(b)};
        } catch (e) {
            log(caseId, "FAIL", "observe:" + text(e.message || e));
            return null;
        }
    }

    function applyJustification(caseId, frame) {
        var range = frame.textRange;
        try { range.characterAttributes.horizontalScale = 100; range.characterAttributes.verticalScale = 100; } catch (scaleError) { log(caseId, "WARN", "glyph-scale:" + text(scaleError.message || scaleError)); }
        try { range.paragraphAttributes.justification = Justification.FULLJUSTIFY; } catch (justifyError) { log(caseId, "WARN", "justify:" + text(justifyError.message || justifyError)); }
        try { range.paragraphAttributes.singleWordJustification = Justification.FULLJUSTIFY; } catch (singleError) { log(caseId, "WARN", "single-word:" + text(singleError.message || singleError)); }
        try {
            range.paragraphAttributes.leftIndent = 0;
            range.paragraphAttributes.rightIndent = 0;
            range.paragraphAttributes.firstLineIndent = 0;
            range.paragraphAttributes.spaceBefore = 0;
            range.paragraphAttributes.spaceAfter = 0;
        } catch (paragraphError) { log(caseId, "WARN", "paragraph-zero:" + text(paragraphError.message || paragraphError)); }
    }

    function fitEvidence(caseId, frame, reading) {
        var snap, line, ok = true, reasons = [];
        try {
            snap = lineSnapshot(frame);
            if (snap.frameContents !== reading) { ok=false; reasons.push("frame-contents"); }
            if (snap.rangeContents !== reading) { ok=false; reasons.push("range-contents"); }
            if (!finiteInteger(snap.rangeStart) || !finiteInteger(snap.rangeEnd) || snap.rangeEnd - snap.rangeStart !== reading.length) { ok=false; reasons.push("range-span"); }
            if (snap.lines.length !== 1) { ok=false; reasons.push("line-count=" + snap.lines.length); }
            if (snap.lines.length === 1) {
                line = snap.lines[0];
                if (line.start !== snap.rangeStart || line.end !== snap.rangeEnd) { ok=false; reasons.push("line-coverage"); }
                if (line.contents !== reading) { ok=false; reasons.push("line-contents"); }
            }
            log(caseId, ok ? "FIT" : "NOFIT", ok ? "full-one-line-coverage" : reasons.join(","));
            return ok;
        } catch (e) {
            log(caseId, "FAIL", "fit-evidence:" + text(e.message || e));
            return false;
        }
    }

    function disposeOne(entry) {
        var frameRemoved = false, pathRemoved = false;
        if (!entry) return;
        try { if (entry.frame && entry.frame.parent) { entry.frame.remove(); frameRemoved = true; } } catch (frameError) { log(entry.caseId, "WARN", "frame-remove:" + text(frameError.message || frameError)); }
        try { if (entry.path && entry.path.parent) { entry.path.remove(); pathRemoved = true; } } catch (pathError) { log(entry.caseId, "INFO", "path-after-frame:" + text(pathError.message || pathError)); }
        log(entry.caseId, "CLEANUP", "frameRemoved=" + frameRemoved + ",pathRemoved=" + pathRemoved + ",frames=" + count(probeDoc.textFrames) + ",paths=" + count(probeDoc.pathItems));
    }

    function runCreationAndFreshGeometry() {
        var a = createCandidate("A1", 100, 500, 160, 50, "あいうえお", 20);
        if (a) { observe("A1", a.frame); fitEvidence("A1", a.frame, "あいうえお"); }
        var b1 = createCandidate("B1", 100, 400, 70, 50, "あいうえお", 20);
        var b2 = createCandidate("B2", 220, 400, 180, 50, "あいうえお", 20);
        if (b1) observe("B1", b1.frame);
        if (b2) observe("B2", b2.frame);
    }

    function runJustification() {
        var many = createCandidate("C1", 100, 300, 160, 50, "あいうえお", 20), one = createCandidate("C2", 300, 300, 160, 50, "あ", 20);
        if (many) { applyJustification("C1", many.frame); observe("C1", many.frame); fitEvidence("C1", many.frame, "あいうえお"); }
        if (one) { applyJustification("C2", one.frame); try { one.frame.textRange.paragraphAttributes.justification = Justification.CENTER; one.frame.textRange.paragraphAttributes.singleWordJustification = Justification.CENTER; } catch (centerError) { log("C2", "WARN", "center:" + text(centerError.message || centerError)); } observe("C2", one.frame); fitEvidence("C2", one.frame, "あ"); }
    }

    function runTracking() {
        var i, entry, reading = "あいうえおかきくけこ";
        for (i = 0; i < TRACKING.length; i++) {
            entry = createCandidate("E" + i, 100 + i * 130, 200, 100, 50, reading, 20);
            if (!entry) continue;
            applyJustification("E" + i, entry.frame);
            try { entry.frame.textRange.characterAttributes.tracking = TRACKING[i]; } catch (trackingError) { log("E" + i, "WARN", "tracking-write:" + text(trackingError.message || trackingError)); }
            observe("E" + i, entry.frame);
            fitEvidence("E" + i, entry.frame, reading);
        }
    }

    try {
        probeDoc = app.documents.add();
        layer = probeDoc.layers[0];
        log("META", "INFO", safe("app.version",function(){return app.version;}) + "," + safe("app.buildNumber",function(){return app.buildNumber;}) + "," + safe("$.version",function(){return $.version;}) + "," + safe("$.os",function(){return $.os;}));
        runCreationAndFreshGeometry();
        runJustification();
        runTracking();
    } catch (fatal) {
        log("FATAL", "FAIL", text(fatal.message || fatal));
    } finally {
        while (created.length) disposeOne(created.pop());
        if (probeDoc) try { probeDoc.close(SaveOptions.DONOTSAVECHANGES); } catch (closeError) { log("META", "WARN", "doc-close:" + text(closeError.message || closeError)); }
        $.writeln("FORMAL_STEP2_AREA_TEXT_NATIVE_PROBE\n" + report.join("\n"));
        alert("AreaText Native Probe 完了。\nExtendScript Console の FORMAL_STEP2_AREA_TEXT_NATIVE_PROBE をコピーしてください。\n\nこのprobeはproduction rendererではありません。");
    }
}());
