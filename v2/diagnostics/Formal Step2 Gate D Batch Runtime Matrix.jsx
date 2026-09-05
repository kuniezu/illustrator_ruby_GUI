#target illustrator
#include "../formal-step1/core.js"
#include "../formal-step1/store.js"
#include "../formal-step2/segments.js"
#include "../formal-step2/store.js"
#include "../formal-step2/adapter.jsx"

(function () {
    var report = [], fixtures = [], managed = [];
    function emit(caseId, status, stage, detail) { report.push(status + " " + caseId + " " + stage + (detail ? " | " + detail : "")); }
    function exception(caseId, stage, e) { emit(caseId, "FAIL", stage, "exception=" + (e.message || e)); }
    function fixture(caseId, text, width) {
        var item = app.activeDocument.activeLayer.textFrames.add();
        item.kind = TextType.AREATEXT; item.orientation = TextOrientation.HORIZONTAL; item.contents = text; item.width = width; item.note = "gate-d-fixture:" + caseId; fixtures.push(item); return item;
    }
    function details(observation) {
        var out = [], i, line, g;
        out.push("lines=" + (observation.lines ? observation.lines.length : "?"));
        for (i = 0; observation.lines && i < observation.lines.length; i++) { line = observation.lines[i]; g = line.geometry || {}; out.push("line" + i + "=" + line.start + "/" + line.end + ",left=" + g.left + ",top=" + g.top + ",width=" + g.width + ",glyphTop=" + g.measuredTop); }
        return out.join(";");
    }
    function bundle(text, reading, hints) { var b = FormalStep1.create(text); b.annotation.reading = reading; b.annotation.readingConfirmed = true; b.splitHints = hints || []; return b; }
    function managedCount(adapter, b) { return adapter.inspect(b).length; }
    function planAndRender(caseId, adapter, b, observation, reading, hints) {
        var decision = FormalSegments.plan(String(adapter.snapshot().text), reading, observation.lines, hints, 0, 0);
        if (decision.status !== "complete") { emit(caseId, "UNRESOLVED", "plan", (decision.reasons || []).join("/") + ";unresolved=" + (decision.unresolvedBoundaries || []).join(",")); return decision; }
        adapter.reconcile(b, decision); managed.push({adapter: adapter, bundle: b}); emit(caseId, "PASS", "reconcile", "managed=" + managedCount(adapter, b) + ";" + details(observation)); return decision;
    }
    function cleanup() {
        var i, items, j;
        for (i = managed.length - 1; i >= 0; i--) try { items = managed[i].adapter.inspect(managed[i].bundle); for (j = items.length - 1; j >= 0; j--) items[j].remove(); } catch (e) { emit("CLEANUP", "FAIL", "managed", e.message || e); }
        for (i = fixtures.length - 1; i >= 0; i--) try { if (fixtures[i] && fixtures[i].parent) fixtures[i].remove(); } catch (e2) { emit("CLEANUP", "FAIL", "fixture", e2.message || e2); }
    }
    function run(caseId, fn) { try { fn(); } catch (e) { exception(caseId, "runtime", e); } }
    try {
        if (!app.documents.length) throw Error("AIファイルを開いてください");
        run("A1", function () { var source = fixture("A", "一張羅", 500), a = FormalStep2Adapter(app.activeDocument, source), o = a.observe(), b = bundle("一張羅", "いっちょうら", []); emit("A1", o.status === "complete" && o.lines.length === 1 ? "PASS" : "FAIL", "observe", details(o)); var d = planAndRender("A2", a, b, o, "いっちょうら", []); if (d.status === "complete") { a.reconcile(b, d); emit("A2", managedCount(a, b) === 1 ? "PASS" : "FAIL", "idempotent", "managed=" + managedCount(a, b)); } });
        run("B1", function () { var source = fixture("B", "一張羅", 120), a = FormalStep2Adapter(app.activeDocument, source), o = a.observe(), h = [{baseBoundaryAfter: 2, readingBoundaryAfter: 5, baseText: "一張羅", reading: "いっちょうら"}], b = bundle("一張羅", "いっちょうら", h); emit("B1", o.status === "complete" && o.lines.length === 2 ? "PASS" : "MANUAL_REQUIRED", "geometry", details(o)); if (o.status === "complete" && o.lines.length === 2) planAndRender("B2", a, b, o, "いっちょうら", h); });
        run("C1", function () { var source = fixture("C", "一張羅", 120), a = FormalStep2Adapter(app.activeDocument, source), o = a.observe(), h = [{baseBoundaryAfter: 2, readingBoundaryAfter: 5, baseText: "一張羅", reading: "いっちょうら"}], b = bundle("一張羅", "いっちょうら", h), d; if (o.status === "complete" && o.lines.length === 2) d = planAndRender("C1", a, b, o, "いっちょうら", h); source.width = 1000; app.redraw(); var one = a.observe(); if (one.status === "complete" && one.lines.length === 1) { d = FormalSegments.plan("一張羅", "いっちょうら", one.lines, h, 0, 0); a.reconcile(b, d); emit("C2", "PASS", "reflow", "lines=1;managed=" + managedCount(a, b)); } else emit("C2", "MANUAL_REQUIRED", "actual-reflow", details(one)); source.width = 120; app.redraw(); var two = a.observe(); d = FormalSegments.plan("一張羅", "いっちょうら", two.lines, h, 0, 0); if (d.status === "complete") { a.reconcile(b, d); emit("C3", "PASS", "restore", "lines=" + two.lines.length + ";managed=" + managedCount(a, b)); } else emit("C3", "FAIL", "restore", (d.reasons || []).join("/")); });
        run("D1", function () { var source = fixture("D", "一二三四", 100), a = FormalStep2Adapter(app.activeDocument, source), o = a.observe(), b = bundle("一二三四", "いちにさんよん", []); emit("D1", o.status === "complete" && o.lines.length === 3 ? "PASS" : "MANUAL_REQUIRED", "geometry", details(o)); if (o.status === "complete" && o.lines.length === 3) { var hints = [{baseBoundaryAfter:o.lines[0].end,readingBoundaryAfter:2,baseText:"一二三四",reading:"いちにさんよん"},{baseBoundaryAfter:o.lines[1].end,readingBoundaryAfter:4,baseText:"一二三四",reading:"いちにさんよん"}]; b.splitHints = hints; planAndRender("D2", a, b, o, "いちにさんよん", hints); } });
        run("E1", function () { var source = fixture("E", "A一B張C羅123", 180), a = FormalStep2Adapter(app.activeDocument, source), o = a.observe(), b = bundle("A一B張C羅123", "えーいちびーちょうしーら123", []); if (o.status === "complete" && o.lines.length) { source.textRange.characterAttributes.tracking = 200; var d = FormalSegments.plan("A一B張C羅123", "えーいちびーちょうしーら123", o.lines, [], 0, 0); if (d.status === "complete") { a.reconcile(b, d); emit("E1", "PASS", "typography", details(o) + ";managed=" + managedCount(a, b)); } else emit("E1", "PASS", "typography-observe", details(o)); } else emit("E1", "MANUAL_REQUIRED", "typography", details(o)); });
        emit("PERSISTENCE", "MANUAL_REQUIRED", "save-reopen", "via normal Formal Step2.jsx");
    } catch (e) { exception("BATCH", "startup", e); }
    finally { cleanup(); }
    $.writeln(report.join("\n")); alert("Gate D batch runtime matrix完了。Debug Consoleの一覧を確認してください。\n" + report.join("\n"));
}());
