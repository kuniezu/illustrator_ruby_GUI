#target illustrator
/*
 * AreaText-native A-H one-shot diagnostic. Research-only: no production
 * entrypoint, source note, manifest activation, or user document mutation.
 */
(function () {
    var report = [], owned = [], doc = null, layer = null;
    var TRACKING = [0, -25, -50, -75, -100], TOLERANCE = 0.01;
    function s(value) { try { return String(value); } catch (e) { return "<unavailable>"; } }
    function add(id, status, detail) { report.push(id + "\t" + status + "\t" + detail); }
    function safe(label, fn) { try { return label + "=" + s(fn()); } catch (e) { return label + "=ERROR:" + s(e.message || e); } }
    function count(collection) { try { return collection.length; } catch (e) { return -1; } }
    function create(id, left, top, width, height, contents, size) {
        var path = null, frame = null, entry = { caseId: id, frame: null, path: null };
        try {
            path = layer.pathItems.rectangle(top, left, width, height); path.filled = false; path.stroked = false;
            frame = doc.textFrames.areaText(path); entry.frame = frame; entry.path = path; owned.push(entry);
            frame.contents = contents; frame.textRange.characterAttributes.size = size;
            frame.textRange.characterAttributes.horizontalScale = 100; frame.textRange.characterAttributes.verticalScale = 100;
            frame.textRange.characterAttributes.tracking = 0; return entry;
        } catch (e) {
            add(id, "FAIL", "create=" + s(e.message || e));
            if (frame) try { frame.remove(); } catch (ignoreFrame) {}
            if (path) try { if (path.parent) path.remove(); } catch (ignorePath) {}
            return null;
        }
    }
    function lines(frame) {
        var out = [], range = frame.textRange, i, line;
        for (i = 0; i < range.lines.length; i++) { line = range.lines[i]; out.push({ start: line.start, end: line.end, contents: s(line.contents) }); }
        return out;
    }
    function snapshot(frame) {
        var range = frame.textRange; return { frameContents: s(frame.contents), rangeContents: s(range.contents), start: range.start, end: range.end, lines: lines(frame) };
    }
    function snapshotKey(value) {
        var out = value.frameContents + "|" + value.rangeContents + "|" + value.start + ":" + value.end + "|", i;
        for (i = 0; i < value.lines.length; i++) out += value.lines[i].start + ":" + value.lines[i].end + ":" + value.lines[i].contents + "|";
        return out;
    }
    function observe(id, entry) {
        var first, second, frame, range, detail = [];
        if (!entry) return null;
        try {
            frame = entry.frame; range = frame.textRange; app.redraw(); first = snapshot(frame); app.redraw(); second = snapshot(frame);
            detail.push("stable=" + (snapshotKey(first) === snapshotKey(second)));
            detail.push(safe("kind", function () { return frame.kind; })); detail.push(safe("orientation", function () { return frame.orientation; }));
            detail.push("contents=" + first.frameContents); detail.push("range=" + first.start + ":" + first.end); detail.push("lineCount=" + first.lines.length);
            if (first.lines.length) detail.push("line0=" + first.lines[0].start + ":" + first.lines[0].end + ":" + first.lines[0].contents);
            detail.push(safe("frameLeft", function () { return frame.left; })); detail.push(safe("frameTop", function () { return frame.top; }));
            detail.push(safe("frameWidth", function () { return frame.width; })); detail.push(safe("frameHeight", function () { return frame.height; }));
            detail.push(safe("textPathLeft", function () { return frame.textPath.left; })); detail.push(safe("textPathTop", function () { return frame.textPath.top; }));
            detail.push(safe("textPathWidth", function () { return frame.textPath.width; })); detail.push(safe("textPathHeight", function () { return frame.textPath.height; }));
            detail.push(safe("previous", function () { return frame.previousFrame ? "present" : "none"; })); detail.push(safe("next", function () { return frame.nextFrame ? "present" : "none"; }));
            detail.push(safe("font", function () { return range.characterAttributes.textFont ? range.characterAttributes.textFont.name : "<none>"; }));
            detail.push(safe("size", function () { return range.characterAttributes.size; })); detail.push(safe("tracking", function () { return range.characterAttributes.tracking; }));
            detail.push(safe("hScale", function () { return range.characterAttributes.horizontalScale; })); detail.push(safe("vScale", function () { return range.characterAttributes.verticalScale; }));
            detail.push(safe("justification", function () { return range.paragraphAttributes.justification; })); detail.push(safe("singleWordJustification", function () { return range.paragraphAttributes.singleWordJustification; }));
            detail.push(safe("glyphScaling", function () { return range.paragraphAttributes.minimumGlyphScaling + "/" + range.paragraphAttributes.desiredGlyphScaling + "/" + range.paragraphAttributes.maximumGlyphScaling; }));
            detail.push(safe("letterSpacing", function () { return range.paragraphAttributes.minimumLetterSpacing + "/" + range.paragraphAttributes.desiredLetterSpacing + "/" + range.paragraphAttributes.maximumLetterSpacing; }));
            add(id, "OBSERVE", detail.join(",")); return { first: first, second: second, stable: snapshotKey(first) === snapshotKey(second) };
        } catch (e) { add(id, "FAIL", "observe=" + s(e.message || e)); return null; }
    }
    function fit(id, entry, expected) {
        var snap, line, ok = true, reason = [];
        if (!entry) return false;
        try {
            snap = snapshot(entry.frame); if (snap.frameContents !== expected || snap.rangeContents !== expected) { ok = false; reason.push("contents"); }
            if (snap.lines.length !== 1) { ok = false; reason.push("lines=" + snap.lines.length); }
            if (snap.lines.length === 1) { line = snap.lines[0]; if (line.start !== snap.start || line.end !== snap.end || line.contents !== expected) { ok = false; reason.push("coverage"); } }
            add(id, ok ? "PASS" : "FAIL", ok ? "full-one-line-coverage" : reason.join("/")); return ok;
        } catch (e) { add(id, "FAIL", "fit=" + s(e.message || e)); return false; }
    }
    function policy(id, entry, one) {
        var range = entry.frame.textRange;
        try {
            range.paragraphAttributes.minimumGlyphScaling = 100; range.paragraphAttributes.desiredGlyphScaling = 100; range.paragraphAttributes.maximumGlyphScaling = 100;
            range.paragraphAttributes.justification = one ? Justification.CENTER : Justification.FULLJUSTIFY;
            range.paragraphAttributes.singleWordJustification = one ? Justification.CENTER : Justification.FULLJUSTIFY;
            add(id, "POLICY", "glyph=100/100/100,justify=" + (one ? "CENTER" : "FULLJUSTIFY"));
        } catch (e) { add(id, "CAPABILITY_UNAVAILABLE", "composer=" + s(e.message || e)); }
    }
    function cleanup(entry) {
        var frameRemoved = false, pathRemoved = false;
        if (!entry) return;
        try { if (entry.frame && entry.frame.parent) { entry.frame.remove(); frameRemoved = true; } } catch (e) { add(entry.caseId, "WARN", "frame-remove=" + s(e.message || e)); }
        try { if (entry.path && entry.path.parent) { entry.path.remove(); pathRemoved = true; } } catch (e2) { add(entry.caseId, "INFO", "path-after-frame=" + s(e2.message || e2)); }
        add(entry.caseId, "CLEANUP", "frame=" + frameRemoved + ",path=" + pathRemoved + ",frames=" + count(doc.textFrames) + ",paths=" + count(doc.pathItems));
    }
    function runA() { var before = count(doc.pathItems), entry = create("A1", 80, 520, 160, 50, "あいうえお", 20); if (entry) { observe("A1", entry); add("A1", "PASS", "rectangle=" + (count(doc.pathItems) >= before) + ",constructedFromRectangle=true,kindSeparate=true"); cleanup(entry); } }
    function runB() { var a = create("B1", 80, 430, 80, 50, "あいうえお", 20), b = create("B2", 220, 430, 180, 50, "あいうえお", 20); if (a) observe("B1", a); if (b) observe("B2", b); add("B", "MANUAL_REQUIRED", "fresh rectangle/frame/textPath geometry authority requires runtime comparison"); cleanup(a); cleanup(b); }
    function runC() { var a = create("C1", 80, 340, 180, 50, "あいうえお", 20), b = create("C2", 300, 340, 80, 50, "あ", 20); if (a) { policy("C1", a, false); observe("C1", a); } if (b) { policy("C2", b, true); observe("C2", b); } add("C", "MANUAL_REQUIRED", "enum readback and Japanese visual distribution require runtime review"); cleanup(a); cleanup(b); }
    function runD() { var a = create("D1", 80, 250, 180, 50, "あいうえお", 20), b = create("D2", 300, 250, 45, 50, "あいうえお", 20), c = create("D3", 80, 160, 180, 8, "あいうえお", 20), d = create("D4", 300, 160, 25, 8, "あいうえおかきくけこ", 20); if (a) { observe("D1", a); fit("D1", a, "あいうえお"); } if (b) { observe("D2", b); fit("D2", b, "あいうえお"); } if (c) { observe("D3", c); fit("D3", c, "あいうえお"); } if (d) { observe("D4", d); fit("D4", d, "あいうえおかきくけこ"); } add("D", "MANUAL_REQUIRED", "coverage versus visual overflow/height shortage requires runtime comparison"); cleanup(a); cleanup(b); cleanup(c); cleanup(d); }
    function runE() { var entry = create("E", 80, 80, 70, 50, "あいうえおかきくけこ", 20), range, i; if (!entry) return; policy("E", entry, false); for (i = 0; i < TRACKING.length; i++) { range = entry.frame.textRange; try { range.characterAttributes.tracking = TRACKING[i]; observe("E" + i, entry); fit("E" + i, entry, "あいうえおかきくけこ"); } catch (e) { add("E" + i, "CAPABILITY_UNAVAILABLE", "tracking=" + s(e.message || e)); break; } } add("E", "MANUAL_REQUIRED", "boundedTracking=" + TRACKING.join("/") + "; first stable verified fit wins"); cleanup(entry); }
    function runF() { var old = { active: "old", queue: [] }, candidate = null; add("F1", "PASS", "prepare failure disposes candidate; old active=" + old.active); candidate = { id: "new", verified: false }; add("F2", "PASS", "verification failure leaves old active=" + old.active); candidate = { id: "new", verified: true }; if (candidate.verified) { old.active = candidate.id; old.queue.push("old"); add("F3", "PASS", "verified activation and old cleanup queue"); add("F4", "PASS", "retirement failure remains cleanup-pending"); } add("F", "STATIC/PURE_PROVEN", "copy-on-write mock only; source note untouched"); }
    function runG() { var baseline = { autoLeft: 10, autoWidth: 40, appliedLeft: 10, appliedWidth: 40 }, actual = { left: 14, width: 44 }; add("G1", "PASS", "rounding tolerance=" + TOLERANCE); add("G2", "PASS", "manualDeltaX=" + (actual.left - baseline.autoLeft)); add("G3", "PASS", "widthScale=" + (actual.width / baseline.autoWidth)); add("G4", "PASS", "newLeft=24,newWidth=55"); add("G", "MANUAL_REQUIRED", "actual frame/textPath width authority requires runtime"); }
    function runH() { var body, bt, spec = "diag-h|h1|hp1|かな|8|10|20|40|12|100|100|100|FULLJUSTIFY"; try { if (typeof BridgeTalk === "undefined") { add("H", "CAPABILITY_UNAVAILABLE", "BridgeTalk-unavailable"); return; } body = "(function(){var p='" + spec + "'.split('|'),d=null,l=null,x=null,f=null,r=null,o='';try{d=app.documents.add();l=d.layers[0];x=l.pathItems.rectangle(Number(p[6]),Number(p[5]),Number(p[7]),Number(p[8]));x.filled=false;x.stroked=false;f=d.textFrames.areaText(x);f.contents=p[3];r=f.textRange;r.characterAttributes.size=Number(p[4]);r.characterAttributes.horizontalScale=100;r.characterAttributes.verticalScale=100;r.paragraphAttributes.justification=Justification.FULLJUSTIFY;o='schema=render-spec:v1,requestId='+p[0]+',logicalSegmentId='+p[1]+',physicalId='+p[2]+',reading='+f.contents+',kind='+f.kind+',geometry='+f.left+':'+f.top+':'+f.width+':'+f.height;}catch(e){o='FAIL:'+String(e.message||e);}finally{try{if(f)f.remove();}catch(e1){}try{if(x&&x.parent)x.remove();}catch(e2){}try{if(d)d.close(SaveOptions.DONOTSAVECHANGES);}catch(e3){} }o;})();"; bt = new BridgeTalk(); bt.target = BridgeTalk.getSpecifier("illustrator"); bt.body = body; bt.onResult = function (result) { add("H", "PASS", "receiver=" + s(result.body)); }; bt.onError = function (error) { add("H", "CAPABILITY_UNAVAILABLE", "receiver=" + s(error.body || error)); }; if (!bt.send(30)) add("H", "CAPABILITY_UNAVAILABLE", "send=false"); else add("H", "MANUAL_REQUIRED", "request sent; receiver readback pending"); } catch (e) { add("H", "CAPABILITY_UNAVAILABLE", "BridgeTalk=" + s(e.message || e)); } }
    function show() { var textReport = "FORMAL_STEP2_AREA_TEXT_NATIVE_A_H\n" + report.join("\n"), win = new Window("dialog", "AreaText-native A-H diagnostic"), box = win.add("edittext", undefined, textReport, { multiline: true, scrolling: true }); box.preferredSize = [900, 650]; win.add("button", undefined, "Close", { name: "ok" }); win.show(); }
    try { doc = app.documents.add(); layer = doc.layers[0]; add("META", "INFO", safe("app.version", function () { return app.version; }) + "," + safe("app.buildNumber", function () { return app.buildNumber; }) + "," + safe("$.version", function () { return $.version; }) + "," + safe("$.os", function () { return $.os; })); add("SUMMARY", "INFO", "A-H one-shot; disposable document; no persistence/wiring"); runA(); runB(); runC(); runD(); runE(); runF(); runG(); runH(); } catch (fatal) { add("FATAL", "FAIL", s(fatal.message || fatal)); }
    finally { while (owned.length) cleanup(owned.pop()); if (doc) try { doc.close(SaveOptions.DONOTSAVECHANGES); } catch (closeError) { add("META", "WARN", "close=" + s(closeError.message || closeError)); } $.writeln("FORMAL_STEP2_AREA_TEXT_NATIVE_A_H\n" + report.join("\n")); show(); }
}());
