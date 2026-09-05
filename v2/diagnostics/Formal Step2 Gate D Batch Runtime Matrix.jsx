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
        var layer = app.activeDocument.activeLayer, path = layer.pathItems.rectangle(0, 0, width, 800), item = app.activeDocument.textFrames.areaText(path);
        item.contents = text; item.textRange.characterAttributes.size = 70; item.textRange.characterAttributes.tracking = 0; item.note = "gate-d-fixture:" + caseId; fixtures.push({item: item, path: path}); return item;
    }
    function fitFixture(item, target) { var i, o, entry, old, nextWidth, next, newEntry, k; for (i = 0; i < 6; i++) { o = FormalStep2Adapter(app.activeDocument, item).observe(); if (o.status === "complete" && o.lines.length === target) return item; nextWidth = item.width * (o.lines && o.lines.length > target ? 1.35 : .7); for (k = 0; k < fixtures.length; k++) if (fixtures[k].item === item) entry = fixtures[k]; old = item; next = fixture(String(item.note).split(":")[1] || "retry", String(item.contents), nextWidth); newEntry = fixtures[fixtures.length - 1]; if (entry) { entry.item = newEntry.item; entry.path = newEntry.path; fixtures.pop(); } try { if (old.parent) old.remove(); } catch (ignore) {} item = next; app.redraw(); } return item; }
    function details(observation) {
        var out = [], i, line, g;
        out.push("kind=" + String(observation.kind || "observed") + ";orientation=" + String(observation.orientation || "observed")); out.push("lines=" + (observation.lines ? observation.lines.length : "?") + ";geometryClusters=" + (observation.lines ? observation.lines.length : "?"));
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
        for (i = fixtures.length - 1; i >= 0; i--) { try { if (fixtures[i].item && fixtures[i].item.parent) fixtures[i].item.remove(); } catch (e2) { emit("CLEANUP", "FAIL", "fixture", e2.message || e2); } try { if (fixtures[i].path && fixtures[i].path.parent) fixtures[i].path.remove(); } catch (ignorePath) {} }
    }
    function run(caseId, fn) { try { fn(); } catch (e) { exception(caseId, "runtime", e); } }
    try {
        if (!app.documents.length) throw Error("AIファイルを開いてください");
        run("A1", function () { var source = fitFixture(fixture("A", "一張羅", 500), 1), a = FormalStep2Adapter(app.activeDocument, source), o = a.observe(), b = bundle("一張羅", "いっちょうら", []); emit("A1", o.status === "complete" && o.lines.length === 1 ? "PASS" : "FAIL", "observe", details(o) + ";fontSize=70"); var d = planAndRender("A2", a, b, o, "いっちょうら", []); if (d.status === "complete") { a.reconcile(b, d); emit("A2", managedCount(a, b) === 1 ? "PASS" : "FAIL", "idempotent", "managed=" + managedCount(a, b)); } });
        run("B1", function () { var source = fitFixture(fixture("B", "一張羅", 120), 2), a = FormalStep2Adapter(app.activeDocument, source), o = a.observe(), h = [{baseBoundaryAfter: 2, readingBoundaryAfter: 5, baseText: "一張羅", reading: "いっちょうら"}], b = bundle("一張羅", "いっちょうら", h); emit("B1", o.status === "complete" && o.lines.length === 2 ? "PASS" : "MANUAL_REQUIRED", "geometry", details(o) + ";fontSize=70"); if (o.status === "complete" && o.lines.length === 2) planAndRender("B2", a, b, o, "いっちょうら", h); });
        run("C1", function () { var source = fixture("C", "一張羅", 120), a = FormalStep2Adapter(app.activeDocument, source), o = a.observe(), h = [{baseBoundaryAfter: 2, readingBoundaryAfter: 5, baseText: "一張羅", reading: "いっちょうら"}], b = bundle("一張羅", "いっちょうら", h), d; if (o.status === "complete" && o.lines.length === 2) d = planAndRender("C1", a, b, o, "いっちょうら", h); source.width = 1000; app.redraw(); var one = a.observe(); if (one.status === "complete" && one.lines.length === 1) { d = FormalSegments.plan("一張羅", "いっちょうら", one.lines, h, 0, 0); a.reconcile(b, d); emit("C2", "PASS", "reflow", "lines=1;managed=" + managedCount(a, b)); } else emit("C2", "MANUAL_REQUIRED", "actual-reflow", details(one)); source.width = 120; app.redraw(); var two = a.observe(); d = FormalSegments.plan("一張羅", "いっちょうら", two.lines, h, 0, 0); if (d.status === "complete") { a.reconcile(b, d); emit("C3", "PASS", "restore", "lines=" + two.lines.length + ";managed=" + managedCount(a, b)); } else emit("C3", "FAIL", "restore", (d.reasons || []).join("/")); });
        run("D1", function () { var source = fitFixture(fixture("D", "一二三四", 100), 3), a = FormalStep2Adapter(app.activeDocument, source), o = a.observe(), b = bundle("一二三四", "いちにさんよん", []); emit("D1", o.status === "complete" && o.lines.length === 3 ? "PASS" : "MANUAL_REQUIRED", "geometry", details(o) + ";fontSize=70"); if (o.status === "complete" && o.lines.length === 3) { var hints = [{baseBoundaryAfter:o.lines[0].end,readingBoundaryAfter:2,baseText:"一二三四",reading:"いちにさんよん"},{baseBoundaryAfter:o.lines[1].end,readingBoundaryAfter:4,baseText:"一二三四",reading:"いちにさんよん"}]; emit("D2", hints[0].readingBoundaryAfter < hints[1].readingBoundaryAfter ? "PASS" : "FAIL", "hint-fixture", "readingBoundaries=2,4"); b.splitHints = hints; planAndRender("D3", a, b, o, "いちにさんよん", hints); } });
        run("E1", function () { var source = fixture("E1", "A一B張C羅123", 180), a = FormalStep2Adapter(app.activeDocument, source), o = a.observe(); emit("E1", o.status === "complete" && o.lines.length ? "PASS" : "MANUAL_REQUIRED", "proportional-mixed-observe", details(o) + ";font=available-via-DOM"); });
        run("E2", function () { var source = fixture("E2", "A一B張C羅123", 180), a = FormalStep2Adapter(app.activeDocument, source); source.textRange.characterAttributes.tracking = 200; app.redraw(); var o = a.observe(); emit("E2", o.status === "complete" ? "PASS" : "MANUAL_REQUIRED", "tracking-observe", details(o) + ";tracking=200"); });
        run("E3", function () { var source = fixture("E3", "一張羅", 180), a = FormalStep2Adapter(app.activeDocument, source), o = a.observe(), chars = source.textRange.characters, leading = chars.length ? chars[0].characterAttributes.leading : undefined, autoLeading = chars.length ? chars[0].characterAttributes.autoLeading : undefined; emit("E3", o.status === "complete" && typeof leading === "number" ? "PASS" : "MANUAL_REQUIRED", "auto-leading", details(o) + ";leading=" + leading + ";autoLeading=" + autoLeading); });
        run("E4", function () { var source = fixture("E4", "一", 200), a = FormalStep2Adapter(app.activeDocument, source), o = a.observe(), reading = "いちょうらながいよみ", b = bundle("一", reading, []); if (o.status === "complete") { var d = FormalSegments.plan("一", reading, o.lines, [], 0, 0); a.reconcile(b, d); var items = a.inspect(b), tracking = items.length ? items[0].textRange.characterAttributes.tracking : undefined; emit("E4", tracking <= -400 ? "PASS" : "FAIL", "tracking-clamp", details(o) + ";tracking=" + tracking); } else emit("E4", "MANUAL_REQUIRED", "tracking-clamp", details(o)); });
        emit("PERSISTENCE", "MANUAL_REQUIRED", "save-reopen", "via normal Formal Step2.jsx");
    } catch (e) { exception("BATCH", "startup", e); }
    finally { cleanup(); }
    $.writeln(report.join("\n")); alert("Gate D batch runtime matrix完了。Debug Consoleの一覧を確認してください。\n" + report.join("\n"));
}());
