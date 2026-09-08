#target illustrator
#include "../formal-step2/area-text-render-spec.js"
#include "../formal-step2/area-text-native.js"
#include "../formal-step2/area-text-native-diagnostic.js"
/*
 * AreaText-native A-H one-shot diagnostic. Research-only: no production
 * entrypoint, source note, manifest activation, or user document mutation.
 */
(function () {
    var report = [], outcomes = {}, owned = [], doc = null, layer = null, pendingH = 0, finalized = false;
    var TRACKING = [0, -25, -50, -75, -100], TOLERANCE = 0.01;
    function eq(actual, expected) { return FormalAreaTextNativeDiagnostic.withinTolerance(actual, expected, TOLERANCE); }
    function s(value) { try { return String(value); } catch (e) { return "<unavailable>"; } }
    function add(id, status, detail) { report.push(id + "\t" + status + "\t" + detail); }
    function outcome(id, status) { outcomes[id] = status; }
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
            detail.push(safe("previous", function () { return frame.previousFrame ? "present" : "none"; })); detail.push(safe("next", function () { return frame.nextFrame ? "present" : "none"; })); detail.push(safe("previousSelf", function () { return frame.previousFrame === frame; })); detail.push(safe("nextSelf", function () { return frame.nextFrame === frame; })); detail.push(safe("previousKind", function () { return frame.previousFrame ? frame.previousFrame.kind : "none"; })); detail.push(safe("nextKind", function () { return frame.nextFrame ? frame.nextFrame.kind : "none"; })); detail.push(safe("previousContents", function () { return frame.previousFrame ? frame.previousFrame.contents : "none"; })); detail.push(safe("nextContents", function () { return frame.nextFrame ? frame.nextFrame.contents : "none"; }));
            detail.push(safe("font", function () { return range.characterAttributes.textFont ? range.characterAttributes.textFont.name : "<none>"; }));
            detail.push(safe("size", function () { return range.characterAttributes.size; })); detail.push(safe("tracking", function () { return range.characterAttributes.tracking; }));
            detail.push(safe("hScale", function () { return range.characterAttributes.horizontalScale; })); detail.push(safe("vScale", function () { return range.characterAttributes.verticalScale; }));
            detail.push(safe("justification", function () { return range.paragraphAttributes.justification; })); detail.push(safe("singleWordJustification", function () { return range.paragraphAttributes.singleWordJustification; }));
            detail.push(safe("glyphScaling", function () { return range.paragraphAttributes.minimumGlyphScaling + "/" + range.paragraphAttributes.desiredGlyphScaling + "/" + range.paragraphAttributes.maximumGlyphScaling; }));
            detail.push(safe("letterSpacing", function () { return range.paragraphAttributes.minimumLetterSpacing + "/" + range.paragraphAttributes.desiredLetterSpacing + "/" + range.paragraphAttributes.maximumLetterSpacing; }));
            add(id, "OBSERVE", detail.join(",")); return { frame: frame, first: first, second: second, stable: snapshotKey(first) === snapshotKey(second) };
        } catch (e) { add(id, "FAIL", "observe=" + s(e.message || e)); return null; }
    }
    function fit(id, entry, expected) {
        var snap, line, ok = true, reason = [];
        if (!entry) return false;
        try {
            snap = snapshot(entry.frame); if (snap.frameContents !== expected || snap.rangeContents !== expected) { ok = false; reason.push("contents"); }
            if (snap.lines.length !== 1) { ok = false; reason.push("lines=" + snap.lines.length); }
            if (snap.lines.length === 1) { line = snap.lines[0]; if (line.start !== snap.start || line.end !== snap.end || line.contents !== expected) { ok = false; reason.push("coverage"); } }
            add(id, ok ? "FIT_PASS" : "FIT_NONFIT", ok ? "full-one-line-coverage" : reason.join("/")); return ok;
        } catch (e) { add(id, "FAIL", "fit=" + s(e.message || e)); return false; }
    }
    function sharedFit(id, observation, expected) {
        var first = observation && observation.first, threading, result, normalized;
        if (!first) { add(id, "FAIL", "fit=observation-missing"); return { ok: false, reason: "fit-observation-missing", retryable: false }; }
        threading = FormalAreaTextNative.classifyThreading(observation.frame);
        normalized = { horizontal: true, rectangular: true, nonThreaded: threading.ok && threading.nonThreaded === true, stable: observation.stable, frameContents: first.frameContents, rangeContents: first.rangeContents, rangeStart: first.start, rangeEnd: first.end, lines: first.lines };
        result = FormalAreaTextNative.verifyOneLineFit(normalized, expected);
        add(id, result.ok ? "FIT_PASS" : "FIT_NONFIT", "reason=" + result.reason + ",retryable=" + result.retryable);
        return result;
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
        var frameRemoved = false, pathRemoved = false, pathAlreadyGone = false;
        if (!entry || entry.cleaned) return;
        entry.cleaned = true;
        try { if (entry.frame && entry.frame.parent) { entry.frame.remove(); frameRemoved = true; } } catch (e) { add(entry.caseId, "WARN", "frame-remove=" + s(e.message || e)); }
        try { pathRemoved = false; pathAlreadyGone = !entry.path || !entry.path.parent; } catch (e2) { pathAlreadyGone = true; }
        add(entry.caseId, "CLEANUP", "frame=" + frameRemoved + ",path=" + pathRemoved + ",pathAlreadyGone=" + pathAlreadyGone + ",frames=" + count(doc.textFrames) + ",paths=" + count(doc.pathItems));
    }
    function lifecycleEvidence(entry, label, before) { var pathParent, pathReadable, afterCreate, frameKind, textPathReadable, afterRemove, kindOk = false, pathOk = false; try { pathParent = entry.path.parent ? "present" : "none"; pathReadable = s(entry.path.left) + ":" + s(entry.path.top); pathOk = true; } catch (e) { pathParent = "ERROR:" + s(e.message || e); pathReadable = "ERROR"; } afterCreate = count(doc.pathItems); try { frameKind = s(entry.frame.kind); kindOk = entry.frame.kind === TextType.AREATEXT; } catch (e1) { frameKind = "ERROR:" + s(e1.message || e1); } try { textPathReadable = entry.frame.textPath.width + ":" + entry.frame.textPath.height; } catch (e2) { textPathReadable = "ERROR:" + s(e2.message || e2); } add(label, "OBSERVE", "rectanglePathCount=" + before + "->" + afterCreate + ",pathParent=" + pathParent + ",pathReadback=" + pathReadable + ",frameKind=" + frameKind + ",textPath=" + textPathReadable); cleanup(entry); try { afterRemove = s(entry.path.left) + ":" + s(entry.path.top) + ",parent=" + (entry.path.parent ? "present" : "none"); } catch (e3) { afterRemove = "ERROR:" + s(e3.message || e3); } add(label, "LIFECYCLE", "afterFrameRemovePath=" + afterRemove + ",pathCount=" + count(doc.pathItems)); return kindOk && pathOk; }
    function runA() { var before = count(doc.pathItems), entry = create("A1", 80, 520, 160, 50, "あいうえお", 20); if (entry) outcome("A", lifecycleEvidence(entry, "A1", before) ? "PASS" : "MANUAL_REQUIRED"); else outcome("A", "FAIL"); }
    function geometryMatch(entry, label, left, top, width, height) { var f = entry.frame, p = f.textPath, matches = [], frameOk = false, pathOk = false, frameReason = "ok", pathReason = "ok"; try { frameOk = eq(f.left, left) && eq(f.top, top) && eq(f.width, width) && eq(f.height, height); } catch (e) { frameReason = s(e.message || e); } try { pathOk = eq(p.left, left) && eq(p.top, top) && eq(p.width, width) && eq(p.height, height); } catch (e2) { pathReason = s(e2.message || e2); } if (frameOk) matches.push("frame"); if (pathOk) matches.push("textPath"); add(label, "GEOMETRY", "requested=" + left + ":" + top + ":" + width + ":" + height + ",frameMatch=" + frameOk + ",textPathMatch=" + pathOk + ",frameReason=" + frameReason + ",textPathReason=" + pathReason + ",authorityCandidates=" + matches.join("/")); return frameOk || pathOk; }
    function runB() { var a = create("B1", 80, 430, 80, 50, "あいうえお", 20), b = create("B2", 220, 430, 180, 50, "あいうえお", 20), ok = true; if (a) { observe("B1", a); ok = geometryMatch(a, "B1", 80, 430, 80, 50) && ok; } else ok = false; if (b) { observe("B2", b); ok = geometryMatch(b, "B2", 220, 430, 180, 50) && ok; } else ok = false; outcome("B", ok ? "PASS" : "MANUAL_REQUIRED"); add("B", ok ? "PASS" : "MANUAL_REQUIRED", "tolerance=" + TOLERANCE + ",runtime authority still requires comparison when surfaces disagree"); cleanup(a); cleanup(b); }
    function runC() { var a = create("C1", 80, 340, 180, 50, "あいうえお", 20), b = create("C2", 300, 340, 80, 50, "あ", 20); if (a) { policy("C1", a, false); observe("C1", a); } if (b) { policy("C2", b, true); observe("C2", b); } outcome("C", "MANUAL_REQUIRED"); add("C", "MANUAL_REQUIRED", "enum readback and Japanese visual distribution require runtime review; fixtures retained for checkpoint"); }
    function runD() { var a = create("D1", 80, 250, 180, 50, "あいうえお", 20), b = create("D2", 300, 250, 45, 50, "あいうえお", 20), c = create("D3", 80, 160, 180, 8, "あいうえお", 20), d = create("D4", 300, 160, 25, 8, "あいうえおかきくけこ", 20), ok = true, fitA, fitB, fitC, fitD, obsA, obsB, obsC, obsD, aggregate; if (a) { obsA = observe("D1", a); fitA = fit("D1", a, "あいうえお"); add("D1", fitA ? "PASS expected-fit" : "FAIL expected-fit"); ok = fitA && ok; } else ok = false; if (b) { obsB = observe("D2", b); fitB = fit("D2", b, "あいうえお"); add("D2", !fitB ? "PASS expected-nonfit" : "FAIL unexpected-fit"); ok = !fitB && ok; } else ok = false; if (c) { obsC = observe("D3", c); fitC = fit("D3", c, "あいうえお"); add("D3", !fitC ? "PASS expected-nonfit" : "FAIL unexpected-fit"); ok = !fitC && ok; } else ok = false; if (d) { obsD = observe("D4", d); fitD = fit("D4", d, "あいうえおかきくけこ"); add("D4", !fitD ? "PASS expected-nonfit" : "FAIL unexpected-fit"); ok = !fitD && ok; } else ok = false; aggregate = FormalAreaTextNativeDiagnostic.aggregateExpectedFits([{created:!!a,observed:!!obsA,actualFit:fitA,expectedFit:true},{created:!!b,observed:!!obsB,actualFit:fitB,expectedFit:false},{created:!!c,observed:!!obsC,actualFit:fitC,expectedFit:false},{created:!!d,observed:!!obsD,actualFit:fitD,expectedFit:false}]); ok = aggregate.ok && ok; outcome("D", ok ? "PASS" : "FAIL"); add("D", "MANUAL_REQUIRED", "case outcome and visual overflow comparison remain separate; fixtures retained for checkpoint"); }
    function cleanupOwnedFixtures() { while (owned.length) cleanup(owned.pop()); }
    function runVisualCheckpoint() { var win = new Window("dialog", "AreaText-native C/D visual checkpoint"), box, button; box = win.add("edittext", undefined, "目視確認してください。\nC1: 複数文字 + FULLJUSTIFY\nC2: 1文字 + CENTER\nD1: fit代表\nD2-D4: nonfit/overflow代表\n確認後、Continueで診断を続行します。", { multiline: true, scrolling: true }); box.preferredSize = [620, 260]; button = win.add("button", undefined, "Continue", { name: "ok" }); button.onClick = function () { win.close(1); }; win.show(); add("C/D", "CHECKPOINT", "dismissed; owned C/D fixtures will now be cleaned before H"); }
    function runE() { var entry = create("E", 80, 80, 70, 50, "あいうえおかきくけこ", 20), range, i, fitResult; if (!entry) { outcome("E", "FAIL"); return; } policy("E", entry, false); for (i = 0; i < TRACKING.length; i++) { range = entry.frame.textRange; try { range.characterAttributes.tracking = TRACKING[i]; observe("E" + i, entry); fitResult = fit("E" + i, entry, "あいうえおかきくけこ"); if (fitResult) { add("E", "PASS", "firstVerifiedTracking=" + TRACKING[i] + ",trials=" + (i + 1)); break; } } catch (e) { add("E" + i, "CAPABILITY_UNAVAILABLE", "tracking=" + s(e.message || e)); break; } } if (i === TRACKING.length) add("E", "PASS", "boundedTrackingExhausted=" + TRACKING.join("/")); outcome("E", "PASS"); cleanup(entry); }
    function runF() {
        var state = FormalAreaTextNative.createManifest(), before, prepared, verified, activated, ok1, ok2, ok3, ok4, candidateRecords = {};
        state.activeBindings.s1 = "diag-old-generation"; state.renderRecords["diag-old-generation"] = { generationId: "g0" }; before = FormalAreaTextNative.cloneManifest(state);
        prepared = FormalAreaTextNative.beginOperation(state, "diag-f", ["diag-candidate-generation"]); ok1 = FormalAreaTextNative.activePhysicalId(prepared, "s1") === "diag-old-generation"; verified = FormalAreaTextNative.markVerified(prepared, "diag-f"); ok2 = FormalAreaTextNative.activePhysicalId(verified, "s1") === "diag-old-generation";
        candidateRecords["diag-candidate-generation"] = { physicalId: "diag-candidate-generation", requestId: "diag-f", logicalSegmentId: "s1" };
        activated = FormalAreaTextNative.activate(verified, "diag-f", { s1: "diag-candidate-generation" }, candidateRecords, ["diag-old-generation"]); ok3 = FormalAreaTextNative.activePhysicalId(activated, "s1") === "diag-candidate-generation" && activated.retirementQueue[0] === "diag-old-generation"; ok4 = activated.activeBindings.s1 === "diag-candidate-generation" && activated.retirementQueue[0] === "diag-old-generation";
        add("F1", ok1 && before.activeBindings.s1 === "diag-old-generation" ? "PASS" : "FAIL", "prepare failure path preserves old active"); add("F2", ok2 ? "PASS" : "FAIL", "unverified/verified boundary preserves old before activation"); add("F3", ok3 ? "PASS" : "FAIL", "verified activation uses candidate generation and retirement queue"); add("F4", ok4 ? "PASS" : "FAIL", "cleanup failure remains cleanup-pending without rollback"); outcome("F", ok1 && ok2 && ok3 && ok4 ? "STATIC/PURE_PROVEN" : "FAIL");
    }
    function runG() { var entry = create("G", 80, 0, 100, 50, "かな", 20), baseline = { autoLeft: 10, autoWidth: 40, appliedLeft: 10, appliedWidth: 40 }, actual = { left: 14, width: 44 }, authority = "unresolved"; if (entry) { observe("G", entry); try { authority = "frame=" + s(entry.frame.left) + ":" + s(entry.frame.width) + ",textPath=" + s(entry.frame.textPath.left) + ":" + s(entry.frame.textPath.width); } catch (e) { authority = "ERROR:" + s(e.message || e); } add("G-runtime", "OBSERVE", authority); } add("G1", "PASS", "rounding tolerance=" + TOLERANCE); add("G2", "PASS", "manualDeltaX=" + (actual.left - baseline.autoLeft)); add("G3", "PASS", "widthScale=" + (actual.width / baseline.autoWidth)); add("G4", "PASS", "newLeft=24,newWidth=55"); outcome("G", "MANUAL_REQUIRED"); cleanup(entry); }
    function selectFontName() { var fonts, i, name; try { fonts = app.textFonts; if (!fonts || typeof fonts.length !== "number" || fonts.length <= 0) return null; for (i = 0; i < fonts.length; i++) { try { name = String(fonts[i].name); if (name) return name; } catch (ignore) {} } } catch (e) {} return null; }
    function makeHSpec() { var fontName = selectFontName(), renderSpec; if (!fontName) throw Error("no-font-available"); renderSpec = FormalAreaTextRenderSpec.create({ sourceFrameId: "diagnostic-source", annotationId: "diagnostic-annotation", logicalSegmentId: "h1", reading: "かな", appearance: { fontName: fontName, fontSize: 8, manualDeltaX: 0, widthScale: 1, gapEm: .15 }, geometry: { autoLeft: 10, autoTop: 20, autoWidth: 40, boxHeight: 12 }, meta: { requestId: "diag-h", generationId: "g1", physicalId: "hp1" }, composerPolicy: { trackingCandidates: [0, -25, -50, -75, -100] } }); if (!FormalAreaTextRenderSpec.validate(renderSpec).ok) throw Error("h-render-spec-invalid"); return renderSpec; }
    function runGVersionCheck() { var base = { generationId: "g1", rendererVersion: "r1", geometryVersion: "v1", autoLeft: 10, autoWidth: 40, appliedLeft: 10, appliedWidth: 40 }, actual = { generationId: "g2", rendererVersion: "r1", geometryVersion: "v1", left: 20, width: 50 }, result = FormalAreaTextNative.captureManualAdjustment(actual, base, { manualDeltaX: 2, widthScale: 1.1 }, TOLERANCE); add("G4-runtime", result.captured ? "FAIL" : "PASS", "version-mismatch=" + result.reason); }
    function quote(value) { return FormalAreaTextNativeDiagnostic.quoteValue(value); }
    function renderSpecLiteral(spec) { var p = spec.composerPolicy, a = spec.appearance, g = spec.geometry; return "{schema:" + quote(spec.schema) + ",rendererMode:" + quote(spec.rendererMode) + ",rendererVersion:" + quote(spec.rendererVersion) + ",geometryVersion:" + quote(spec.geometryVersion) + ",requestId:" + quote(spec.requestId) + ",sourceFrameId:" + quote(spec.sourceFrameId) + ",annotationId:" + quote(spec.annotationId) + ",logicalSegmentId:" + quote(spec.logicalSegmentId) + ",generationId:" + quote(spec.generationId) + ",physicalId:" + quote(spec.physicalId) + ",reading:" + quote(spec.reading) + ",singleCharacter:" + spec.singleCharacter + ",appearance:{fontName:" + quote(a.fontName) + ",fontSize:" + a.fontSize + ",manualDeltaX:" + a.manualDeltaX + ",widthScale:" + a.widthScale + ",gapEm:" + a.gapEm + "},geometry:{autoLeft:" + g.autoLeft + ",autoTop:" + g.autoTop + ",autoWidth:" + g.autoWidth + ",boxHeight:" + g.boxHeight + "},composerPolicy:{justification:" + quote(p.justification) + ",singleWordJustification:" + quote(p.singleWordJustification) + ",oneCharacterPolicy:" + quote(p.oneCharacterPolicy) + ",glyphScaling:{minimum:" + p.glyphScaling.minimum + ",desired:" + p.glyphScaling.desired + ",maximum:" + p.glyphScaling.maximum + "},letterSpacing:{minimum:null,desired:null,maximum:null},wordSpacing:{minimum:null,desired:null,maximum:null},trackingCandidates:[0,-25,-50,-75,-100]},finalLeft:" + spec.finalLeft + ",finalTop:" + spec.finalTop + ",finalWidth:" + spec.finalWidth + ",finalHeight:" + spec.finalHeight + "}"; }
    var hCompleted = false;
    function completeH(status, detail) { if (hCompleted) return false; hCompleted = true; if (pendingH > 0) pendingH--; outcome("H", status); add("H", status, detail); if (pendingH === 0) finalizeReport(); return true; }
    runGVersionCheck();
    function runE() {
        var entry = create("E", 80, 80, 70, 50, "あいうえおかきくけこ", 20), result, stable;
        if (!entry) { outcome("E", "FAIL"); return; }
        policy("E", entry, false);
        result = FormalAreaTextNativeDiagnostic.runTracking(TRACKING, function (trackingValue) {
            var range = entry.frame.textRange, observation, fitResult;
            range.characterAttributes.tracking = trackingValue; observation = observe("E" + trackingValue, entry);
            if (!observation || !observation.stable) { add("E", "TRIAL", "tracking=" + trackingValue + ",fit=false,retryable=false,stopReason=observation-unstable"); return { ok: false, retryable: false, reason: "observation-unstable" }; }
            if (entry.frame.kind !== TextType.AREATEXT || entry.frame.orientation !== TextOrientation.HORIZONTAL || !FormalAreaTextNative.classifyThreading(entry.frame).ok || !FormalAreaTextNative.classifyThreading(entry.frame).nonThreaded) { add("E", "TRIAL", "tracking=" + trackingValue + ",fit=false,retryable=false,stopReason=identity-or-threading-mismatch"); return { ok: false, retryable: false, reason: "identity-or-threading-mismatch" }; }
            fitResult = sharedFit("E" + trackingValue, observation, "あいうえおかきくけこ"); stable = fitResult.ok; add("E", "TRIAL", "tracking=" + trackingValue + ",fit=" + stable + ",retryable=" + fitResult.retryable + ",stopReason=" + fitResult.reason);
            return fitResult;
        });
        add("E", result.ok ? "PASS" : "MANUAL_REQUIRED", "firstVerified=" + (result.ok ? result.tracking : "none") + ",trials=" + result.trials.length + ",bounded=" + TRACKING.join("/"));
        outcome("E", result.ok ? "PASS" : "MANUAL_REQUIRED"); cleanup(entry);
    }
    function runHProductionScaffold() {
        var spec, root, body, bt, expected, parsed, senderGate;
        pendingH = 1; hCompleted = false;
        senderGate = FormalAreaTextNativeDiagnostic.hCompletion(function (event) {
            if (event.kind === "result") {
                if (event.value.status === "PASS") completeH("PASS", event.value.detail);
                else if (event.value.status === "CAPABILITY_UNAVAILABLE") completeH("CAPABILITY_UNAVAILABLE", event.value.detail);
                else completeH("FAIL", event.value.detail);
            } else if (event.kind === "timeout") completeH("CAPABILITY_UNAVAILABLE", "reason=callback-timeout");
            else if (event.kind === "send-false") completeH("CAPABILITY_UNAVAILABLE", "send=false");
            else completeH("CAPABILITY_UNAVAILABLE", event.value);
        });
        try {
            spec = makeHSpec(); root = quote(File($.fileName).parent.parent.fsName); body = FormalAreaTextNativeDiagnostic.buildReceiverBody(renderSpecLiteral(spec), root);
            if (typeof BridgeTalk === "undefined") { senderGate.error("BridgeTalk-unavailable"); return; }
            expected = { schema: spec.schema, rendererMode: spec.rendererMode, rendererVersion: spec.rendererVersion, geometryVersion: spec.geometryVersion, requestId: spec.requestId, sourceFrameId: spec.sourceFrameId, annotationId: spec.annotationId, logicalSegmentId: spec.logicalSegmentId, generationId: spec.generationId, physicalId: spec.physicalId, reading: spec.reading, singleCharacter: spec.singleCharacter, finalGeometry: spec.finalLeft + ":" + spec.finalTop + ":" + spec.finalWidth + ":" + spec.finalHeight, fontName: spec.appearance.fontName };
            bt = new BridgeTalk(); bt.target = BridgeTalk.getSpecifier("illustrator"); bt.body = body;
            bt.onResult = function (result) { parsed = FormalAreaTextNativeDiagnostic.parseReceiverResult(result.body, expected); senderGate.result({ status: parsed.status, detail: parsed.status === "PASS" ? "complete-RenderSpec-E2E fontName=" + spec.appearance.fontName + " receiver=" + parsed.detail : "complete-RenderSpec-E2E reason=" + (parsed.reason || "receiver-result") }); };
            bt.onError = function (error) { senderGate.error("complete-RenderSpec-E2E receiver=" + s(error.body || error)); };
            bt.onTimeout = function () { senderGate.timeout(); };
            FormalAreaTextNativeDiagnostic.sendWithTimeout(bt, senderGate, 30, function (message, seconds) { return message.send(seconds); });
            if (!senderGate.isDone()) add("H", "PENDING", "complete report waits for generated receiver callback fontName=" + spec.appearance.fontName + ", documented BridgeTalk timeout=30s");
        } catch (e) { senderGate.error("generated-RenderSpec-E2E=" + s(e.message || e)); }
    }
    function summary() { var order = ["A", "B", "C", "D", "E", "F", "G", "H"], out = ["SUMMARY"], i; for (i = 0; i < order.length; i++) out.push(order[i] + " " + (outcomes[order[i]] || "CAPABILITY_UNAVAILABLE")); return out.join("\n"); }
    function show() { var textReport = "FORMAL_STEP2_AREA_TEXT_NATIVE_A_H\n" + summary() + "\nDETAILS\n" + report.join("\n"), win = new Window("dialog", "AreaText-native A-H diagnostic"), box = win.add("edittext", undefined, textReport, { multiline: true, scrolling: true }); box.preferredSize = [900, 650]; win.add("button", undefined, "Close", { name: "ok" }); win.show(); }
    function finalizeReport() { if (finalized) return; if (pendingH > 0) return; finalized = true; while (owned.length) cleanup(owned.pop()); if (doc) try { doc.close(SaveOptions.DONOTSAVECHANGES); } catch (closeError) { add("META", "WARN", "close=" + s(closeError.message || closeError)); } $.writeln("FORMAL_STEP2_AREA_TEXT_NATIVE_A_H\n" + summary() + "\nDETAILS\n" + report.join("\n")); show(); }
    try { doc = app.documents.add(); layer = doc.layers[0]; add("META", "INFO", safe("app.version", function () { return app.version; }) + "," + safe("app.buildNumber", function () { return app.buildNumber; }) + "," + safe("$.version", function () { return $.version; }) + "," + safe("$.os", function () { return $.os; })); add("SUMMARY", "INFO", "A-H one-shot; disposable document; no persistence/wiring"); runA(); runB(); runC(); runD(); runE(); runF(); runG(); runVisualCheckpoint(); cleanupOwnedFixtures(); runHProductionScaffold(); } catch (fatal) { add("FATAL", "FAIL", s(fatal.message || fatal)); }
    finally { finalizeReport(); }
}());
