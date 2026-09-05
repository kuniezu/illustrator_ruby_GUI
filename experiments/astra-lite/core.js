/* Issue #10 only. ES3-style code; no Illustrator DOM in Domain/Store. */
var AstraLite = (function () {
    var BEGIN = "[astra-lite-gate-ab:v1]\n";
    var END = "\n[/astra-lite-gate-ab]";
    var NS = "[astra-lite-gate-ab";
    var TAG = "astra-lite-output:v1;";
    var seq = 0;
    function fail(message) { throw new Error(message); }
    function integer(n) { return typeof n === "number" && isFinite(n) && Math.floor(n) === n && n >= 0; }
    function number(n) { return typeof n === "number" && isFinite(n); }
    function id(s) { return typeof s === "string" && /^[a-zA-Z0-9_-]+$/.test(s); }
    function uid(role) { seq++; return "al-" + role + "-" + new Date().getTime() + "-" + Math.floor(Math.random() * 1000000000) + "-" + seq; }
    function requireString(s) { if (typeof s !== "string") fail("invalid-string"); }
    function validate(b) {
        if (!b || b.schemaVersion !== 1 || !integer(b.revision) || !id(b.sourceFrameId)) fail("invalid-bundle-version-or-id");
        if (!/^(complete|pending|unresolved|failed)$/.test(b.renderStatus)) fail("invalid-render-status");
        requireString(b.textSnapshot);
        var a = b.annotation;
        if (!a || !id(a.annotationId) || a.sourceFrameId !== b.sourceFrameId) fail("invalid-annotation-id");
        if (!a.anchor || !integer(a.anchor.startHint) || !a.anchor.baseText) fail("invalid-anchor");
        requireString(a.anchor.baseText); requireString(a.anchor.beforeContext); requireString(a.anchor.afterContext);
        if (b.textSnapshot.substr(a.anchor.startHint, a.anchor.baseText.length) !== a.anchor.baseText) fail("invalid-snapshot-anchor");
        requireString(a.reading); requireString(a.userReview);
        if (typeof a.enabled !== "boolean" || typeof a.readingConfirmed !== "boolean") fail("invalid-boolean");
        if (!/^(auto|auto_offset|manual)$/.test(a.placementMode)) fail("invalid-placement-mode");
        if (!(a.reviewReasons instanceof Array)) fail("invalid-review-reasons");
        for (var i = 0; i < a.reviewReasons.length; i++) requireString(a.reviewReasons[i]);
        if (!a.style || !number(a.style.sizeRatio) || a.style.sizeRatio < 0.1 || a.style.sizeRatio > 1 ||
            !number(a.style.gapRatio) || a.style.gapRatio < 0 || a.style.gapRatio > 2) fail("invalid-style");
        if (!a.offset || !number(a.offset.inlineEm) || !number(a.offset.blockEm) ||
            Math.abs(a.offset.inlineEm) > 10 || Math.abs(a.offset.blockEm) > 10) fail("invalid-offset");
        return b;
    }
    function create(text) {
        if (!text) fail("empty-source");
        var sourceId = uid("source");
        return validate({schemaVersion: 1, revision: 0, sourceFrameId: sourceId, textSnapshot: text, renderStatus: "unresolved",
            annotation: {annotationId: uid("annotation"), sourceFrameId: sourceId,
                anchor: {baseText: text, startHint: 0, beforeContext: "", afterContext: ""},
                reading: "", enabled: true, placementMode: "auto", reviewReasons: ["reading-unconfirmed"],
                readingConfirmed: false, userReview: "", style: {sizeRatio: 0.5, gapRatio: 0.1}, offset: {inlineEm: 0, blockEm: 0}}});
    }
    // Fixed versioned fields: no eval, JSON global, prototype modification, or external dependency.
    var keys = "schemaVersion revision sourceFrameId textSnapshot renderStatus annotationId baseText startHint beforeContext afterContext reading enabled placementMode reviewReasons readingConfirmed userReview sizeRatio gapRatio inlineEm blockEm".split(" ");
    function pack(b) {
        validate(b);
        var a = b.annotation, h = a.anchor, reasons = [], i;
        for (i = 0; i < a.reviewReasons.length; i++) reasons.push(encodeURIComponent(a.reviewReasons[i]));
        var values = [b.schemaVersion, b.revision, b.sourceFrameId, b.textSnapshot, b.renderStatus, a.annotationId,
            h.baseText, h.startHint, h.beforeContext, h.afterContext, a.reading, a.enabled, a.placementMode,
            reasons.join(","), a.readingConfirmed, a.userReview, a.style.sizeRatio, a.style.gapRatio, a.offset.inlineEm, a.offset.blockEm];
        var lines = [];
        for (i = 0; i < keys.length; i++) lines.push(keys[i] + "=" + encodeURIComponent(String(values[i])));
        return lines.join("\n");
    }
    function unpack(payload) {
        var lines = payload.split("\n"), f = {}, i, eq;
        if (lines.length !== keys.length) fail("invalid-store-field-count");
        for (i = 0; i < keys.length; i++) {
            eq = lines[i].indexOf("=");
            if (lines[i].substr(0, eq) !== keys[i]) fail("invalid-store-field");
            try { f[keys[i]] = decodeURIComponent(lines[i].substr(eq + 1)); } catch (e) { fail("invalid-store-encoding"); }
        }
        function num(key) { if (!/^-?(0|[1-9][0-9]*)(\.[0-9]+)?(e[+-]?[0-9]+)?$/.test(f[key])) fail("invalid-store-number"); return Number(f[key]); }
        function bool(key) { if (f[key] !== "true" && f[key] !== "false") fail("invalid-store-boolean"); return f[key] === "true"; }
        var reasons = [], parts = f.reviewReasons ? f.reviewReasons.split(",") : [];
        for (i = 0; i < parts.length; i++) reasons.push(decodeURIComponent(parts[i]));
        return validate({schemaVersion: num("schemaVersion"), revision: num("revision"), sourceFrameId: f.sourceFrameId,
            textSnapshot: f.textSnapshot, renderStatus: f.renderStatus,
            annotation: {annotationId: f.annotationId, sourceFrameId: f.sourceFrameId,
                anchor: {baseText: f.baseText, startHint: num("startHint"), beforeContext: f.beforeContext, afterContext: f.afterContext},
                reading: f.reading, enabled: bool("enabled"), placementMode: f.placementMode,
                reviewReasons: reasons, readingConfirmed: bool("readingConfirmed"), userReview: f.userReview,
                style: {sizeRatio: num("sizeRatio"), gapRatio: num("gapRatio")}, offset: {inlineEm: num("inlineEm"), blockEm: num("blockEm")}}});
    }
    function envelope(note) {
        requireString(note);
        var start = note.indexOf(NS), end;
        if (start < 0) { if (note.indexOf("[/astra-lite-gate-ab") >= 0) fail("orphan-store-marker"); return null; }
        if (note.substr(start, BEGIN.length) !== BEGIN || note.indexOf(NS, start + 1) >= 0) fail("unknown-or-duplicate-store-marker");
        end = note.indexOf(END, start + BEGIN.length);
        if (end < 0 || note.indexOf("[/astra-lite-gate-ab", end + END.length) >= 0 || note.indexOf("[/astra-lite-gate-ab") !== end + 1) fail("broken-store-envelope");
        return {start: start, end: end + END.length, payload: note.substring(start + BEGIN.length, end)};
    }
    function read(note) { var e = envelope(note); return e ? unpack(e.payload) : null; }
    function replace(note, b) {
        var e = envelope(note), block = BEGIN + pack(b) + END;
        if (e) { unpack(e.payload); return note.substring(0, e.start) + block + note.substring(e.end); }
        return note + block; // Do not normalize or add/remove other users' whitespace.
    }
    function clone(b) { return unpack(pack(b)); }
    function tag(b) { return TAG + b.sourceFrameId + ";" + b.annotation.annotationId + ";whole"; }
    function parseTag(note) {
        if (note.indexOf("astra-lite-output:") < 0) return null;
        if (note.indexOf(TAG) !== 0) fail("unknown-output-tag");
        var p = note.substr(TAG.length).split(";");
        if (p.length !== 3 || !id(p[0]) || !id(p[1]) || p[2] !== "whole") fail("invalid-output-tag");
        return {sourceFrameId: p[0], annotationId: p[1]};
    }
    function resolve(text, snapshot, anchor) {
        var base = anchor.baseText, candidates = [], pos = -1;
        if (text === snapshot && text.substr(anchor.startHint, base.length) === base) return {status: "complete", start: anchor.startHint};
        while ((pos = text.indexOf(base, pos + 1)) >= 0) {
            var before = anchor.beforeContext, after = anchor.afterContext;
            if (pos >= before.length && text.substring(pos - before.length, pos) === before &&
                text.substr(pos + base.length, after.length) === after) candidates.push(pos);
        }
        return candidates.length === 1 ? {status: "complete", start: candidates[0]} :
            {status: "unresolved", reasons: [candidates.length ? "anchor-ambiguous" : "anchor-missing"]};
    }
    function plan(b, text, observation) {
        validate(b);
        var a = b.annotation, r, reasons = [];
        if (!a.enabled) return {status: "complete", desired: []};
        if (!a.reading || !a.readingConfirmed) reasons.push("reading-unconfirmed");
        if (/[\r\n\t]/.test(a.reading)) reasons.push("reading-must-be-one-line");
        if (a.userReview) reasons.push("user-review: " + a.userReview);
        if (a.placementMode === "manual") reasons.push("manual-placement-protected");
        r = resolve(text, b.textSnapshot, a.anchor);
        if (r.status !== "complete") reasons = reasons.concat(r.reasons);
        if (reasons.length) return {status: "unresolved", reasons: reasons};
        if (observation.status !== "complete") return {status: observation.status, reasons: observation.reasons};
        if (r.start !== 0 || a.anchor.baseText !== text) return {status: "unresolved", reasons: ["gate-ab-whole-frame-only"]};
        return {status: "complete", desired: [{reading: a.reading, style: a.style, offset: a.offset, mode: a.placementMode, metrics: observation.metrics}]};
    }
    // Port supplies all host reads/writes. Failed and unresolved plans never mean delete.
    function open(port) {
        var s = port.snapshot(), b = read(s.note) || create(s.text);
        port.inspect(b);
        return {snapshot: s, bundle: b};
    }
    function apply(port, context, edit) {
        var current = port.snapshot(), b = clone(context.bundle), a = b.annotation, observation, p;
        if (current.note !== context.snapshot.note || current.text !== context.snapshot.text) fail("source-changed-reopen-review");
        port.inspect(b);
        a.reading = edit.reading; a.enabled = edit.enabled; a.readingConfirmed = edit.readingConfirmed;
        a.placementMode = edit.placementMode; a.userReview = edit.userReview;
        a.style = edit.style; a.offset = edit.offset;
        validate(b);
        try { observation = a.enabled ? port.observe() : {status: "complete"}; }
        catch (e) { observation = {status: "failed", reasons: ["measurement-failed: " + e.message]}; }
        p = plan(b, current.text, observation);
        var afterObservation = port.snapshot();
        if (afterObservation.text !== current.text || afterObservation.note !== current.note) fail("source-changed-during-observation");
        b.revision++;
        a.reviewReasons = p.status === "complete" ? [] : p.reasons;
        b.renderStatus = p.status === "complete" ? "pending" : p.status;
        // Intent is saved even when rendering is unresolved. Outputs never hold the only copy.
        var saved = replace(current.note, b);
        port.writeNote(current.note, saved);
        if (p.status !== "complete") return {bundle: b, plan: p, observation: observation};
        try {
            port.inspect(b);
            port.reconcile(b, p);
            b.renderStatus = "complete";
        } catch (error) {
            b.renderStatus = "failed";
            a.reviewReasons = ["render-failed: " + error.message];
        }
        port.writeNote(saved, replace(saved, b));
        return {bundle: b, plan: p, observation: observation};
    }
    return {Domain: {create: create, validate: validate, resolve: resolve, plan: plan},
        Store: {read: read, replace: replace, clone: clone, tag: tag, parseTag: parseTag},
        Application: {open: open, apply: apply}};
}());
if (typeof module !== "undefined" && module.exports) module.exports = AstraLite;
