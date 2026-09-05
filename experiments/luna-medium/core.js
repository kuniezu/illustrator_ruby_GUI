/* Luna Medium Gate A/B: portable ES5 domain, store and application core. */
var LunaMedium = (function () {
    var OPEN = "[luna-medium-gate-ab:v1]\n", CLOSE = "\n[/luna-medium-gate-ab]", OUTPUT = "luna-medium-output:v1;";
    var sequence = 0;
    function fail(message) { throw new Error(message); }
    function uid(kind) { sequence++; return "lm-" + kind + "-" + new Date().getTime() + "-" + Math.floor(Math.random() * 1000000000) + "-" + sequence; }
    function finite(n) { return typeof n === "number" && isFinite(n); }
    function validId(v) { return typeof v === "string" && /^lm-[a-z]+-[0-9]+-[0-9]+-[0-9]+$/.test(v); }
    function validate(bundle) {
        var a = bundle && bundle.annotation;
        if (!bundle || bundle.schemaVersion !== 1 || !validId(bundle.sourceFrameId) || !finite(bundle.revision) || bundle.revision < 0 ||
            !/^(complete|pending|unresolved|failed)$/.test(bundle.renderStatus) || typeof bundle.textSnapshot !== "string") fail("invalid-bundle");
        if (!a || !validId(a.annotationId) || a.sourceFrameId !== bundle.sourceFrameId || !a.anchor || !finite(a.anchor.startHint) ||
            a.anchor.startHint < 0 || Math.floor(a.anchor.startHint) !== a.anchor.startHint || typeof a.anchor.baseText !== "string" ||
            !a.anchor.baseText || typeof a.anchor.beforeContext !== "string" || typeof a.anchor.afterContext !== "string" ||
            typeof a.reading !== "string" || typeof a.enabled !== "boolean" || typeof a.readingConfirmed !== "boolean" ||
            !/^(auto|auto_offset|manual)$/.test(a.placementMode) || !(a.reviewReasons instanceof Array) || typeof a.userReview !== "string") fail("invalid-annotation");
        if (bundle.textSnapshot.substr(a.anchor.startHint, a.anchor.baseText.length) !== a.anchor.baseText) fail("snapshot-anchor-mismatch");
        if (!a.style || !finite(a.style.sizeRatio) || a.style.sizeRatio < 0.1 || a.style.sizeRatio > 1 || !finite(a.style.gapRatio) || a.style.gapRatio < 0 || a.style.gapRatio > 2 ||
            !a.offset || !finite(a.offset.inlineEm) || !finite(a.offset.blockEm) || Math.abs(a.offset.inlineEm) > 10 || Math.abs(a.offset.blockEm) > 10) fail("invalid-style");
        for (var i = 0; i < a.reviewReasons.length; i++) if (typeof a.reviewReasons[i] !== "string") fail("invalid-review-reason");
        return bundle;
    }
    function create(text) {
        if (typeof text !== "string" || !text) fail("empty-source");
        var sid = uid("source");
        return validate({schemaVersion: 1, revision: 0, sourceFrameId: sid, textSnapshot: text, renderStatus: "unresolved", annotation: {
            annotationId: uid("annotation"), sourceFrameId: sid, anchor: {baseText: text, startHint: 0, beforeContext: "", afterContext: ""}, reading: "", enabled: true,
            placementMode: "auto", reviewReasons: ["reading-unconfirmed"], readingConfirmed: false, userReview: "", style: {sizeRatio: 0.5, gapRatio: 0.1}, offset: {inlineEm: 0, blockEm: 0}
        }});
    }
    function pack(bundle) {
        validate(bundle); var a = bundle.annotation, h = a.anchor, vals = [bundle.schemaVersion, bundle.revision, bundle.sourceFrameId, bundle.textSnapshot, bundle.renderStatus,
            a.annotationId, h.baseText, h.startHint, h.beforeContext, h.afterContext, a.reading, a.enabled, a.placementMode, a.reviewReasons.join("\u0001"), a.readingConfirmed, a.userReview,
            a.style.sizeRatio, a.style.gapRatio, a.offset.inlineEm, a.offset.blockEm], names = ["schemaVersion","revision","sourceFrameId","textSnapshot","renderStatus","annotationId","baseText","startHint","beforeContext","afterContext","reading","enabled","placementMode","reviewReasons","readingConfirmed","userReview","sizeRatio","gapRatio","inlineEm","blockEm"], lines = [];
        for (var i = 0; i < names.length; i++) lines.push(names[i] + "=" + encodeURIComponent(String(vals[i])));
        return lines.join("\n");
    }
    function unpack(payload) {
        var names = ["schemaVersion","revision","sourceFrameId","textSnapshot","renderStatus","annotationId","baseText","startHint","beforeContext","afterContext","reading","enabled","placementMode","reviewReasons","readingConfirmed","userReview","sizeRatio","gapRatio","inlineEm","blockEm"], lines = payload.split("\n"), f = {}, i, eq;
        if (lines.length !== names.length) fail("invalid-store-fields");
        for (i = 0; i < names.length; i++) { eq = lines[i].indexOf("="); if (eq < 1 || lines[i].substr(0, eq) !== names[i]) fail("invalid-store-field"); try { f[names[i]] = decodeURIComponent(lines[i].substr(eq + 1)); } catch (e) { fail("invalid-store-encoding"); } }
        function n(k) { if (!/^-?[0-9]+(\.[0-9]+)?$/.test(f[k])) fail("invalid-store-number"); return Number(f[k]); }
        function b(k) { if (f[k] !== "true" && f[k] !== "false") fail("invalid-store-boolean"); return f[k] === "true"; }
        var reasons = f.reviewReasons ? f.reviewReasons.split("\u0001") : [];
        return validate({schemaVersion:n("schemaVersion"), revision:n("revision"), sourceFrameId:f.sourceFrameId, textSnapshot:f.textSnapshot, renderStatus:f.renderStatus, annotation:{annotationId:f.annotationId, sourceFrameId:f.sourceFrameId, anchor:{baseText:f.baseText,startHint:n("startHint"),beforeContext:f.beforeContext,afterContext:f.afterContext},reading:f.reading,enabled:b("enabled"),placementMode:f.placementMode,reviewReasons:reasons,readingConfirmed:b("readingConfirmed"),userReview:f.userReview,style:{sizeRatio:n("sizeRatio"),gapRatio:n("gapRatio")},offset:{inlineEm:n("inlineEm"),blockEm:n("blockEm")}}});
    }
    function locate(note) { var s = note.indexOf(OPEN), e; if (s < 0) { if (note.indexOf("[luna-medium-gate-ab:") >= 0) fail("unknown-store-version"); return null; } if (note.indexOf(OPEN, s + 1) >= 0) fail("duplicate-store"); e = note.indexOf(CLOSE, s + OPEN.length); if (e < 0 || note.indexOf("[/luna-medium-gate-ab", e + CLOSE.length) >= 0) fail("broken-store"); return {start:s,end:e+CLOSE.length,payload:note.substring(s+OPEN.length,e)}; }
    function read(note) { var x = locate(String(note)); return x ? unpack(x.payload) : null; }
    function write(note, bundle) { var x = locate(String(note)), block = OPEN + pack(bundle) + CLOSE; return x ? String(note).substring(0,x.start) + block + String(note).substring(x.end) : String(note) + block; }
    function clone(bundle) { return unpack(pack(bundle)); }
    function tag(bundle) { validate(bundle); return OUTPUT + bundle.sourceFrameId + ";" + bundle.annotation.annotationId + ";whole"; }
    function parseTag(note) { if (String(note).indexOf("luna-medium-output:") < 0) return null; if (String(note).indexOf(OUTPUT) !== 0) fail("unknown-output-tag"); var p=String(note).substring(OUTPUT.length).split(";"); if (p.length!==3 || !validId(p[0]) || !validId(p[1]) || p[2]!=="whole") fail("invalid-output-tag"); return {sourceFrameId:p[0],annotationId:p[1]}; }
    function resolve(text, snapshot, anchor) { var p=-1, found=[]; if (text===snapshot && text.substr(anchor.startHint,anchor.baseText.length)===anchor.baseText) return {status:"complete",start:anchor.startHint}; while ((p=text.indexOf(anchor.baseText,p+1))>=0) if (p>=anchor.beforeContext.length && text.substring(p-anchor.beforeContext.length,p)===anchor.beforeContext && text.substr(p+anchor.baseText.length,anchor.afterContext.length)===anchor.afterContext) found.push(p); return found.length===1?{status:"complete",start:found[0]}:{status:"unresolved",reasons:[found.length?"anchor-ambiguous":"anchor-missing"]}; }
    function plan(bundle, text, observation) { validate(bundle); var a=bundle.annotation,reasons=[],r; if(!a.enabled)return{status:"complete",desired:[]}; if(!a.readingConfirmed||!a.reading)reasons.push("reading-unconfirmed"); if(a.userReview)reasons.push("user-review"); if(a.placementMode==="manual")reasons.push("manual-placement"); r=resolve(text,bundle.textSnapshot,a.anchor); if(r.status!=="complete")reasons=reasons.concat(r.reasons); if(observation.status==="failed")return{status:"failed",reasons:(observation.reasons||["observation-unavailable"]).concat(reasons)}; if(observation.status!=="complete")reasons=reasons.concat(observation.reasons||["observation-unavailable"]); if(reasons.length)return{status:"unresolved",reasons:reasons}; return{status:"complete",desired:[{reading:a.reading,style:a.style,offset:a.offset,mode:a.placementMode,metrics:observation.metrics}]}; }
    function open(port) { var s=port.snapshot(), b=read(s.note)||create(s.text); port.inspect(b); return {snapshot:s,bundle:b}; }
    function apply(port, context, edit) { var before=port.snapshot(), b=clone(context.bundle), a=b.annotation, obs, p, after, trace=[]; if(before.text!==context.snapshot.text||before.note!==context.snapshot.note)fail("stale-source"); port.inspect(b); a.reading=edit.reading;a.enabled=edit.enabled;a.readingConfirmed=edit.readingConfirmed;a.placementMode=edit.placementMode;a.userReview=edit.userReview;a.style=edit.style;a.offset=edit.offset; validate(b); try{obs=a.enabled?port.observe():{status:"complete"};}catch(e){obs={status:"failed",reasons:["observation-failed:"+(e.message||String(e))]};} if(port.diagnostics)trace=port.diagnostics(); after=port.snapshot(); if(after.text!==before.text||after.note!==before.note)fail("source-changed-during-observation"); p=plan(b,before.text,obs); if(trace.length&&p.status!=="complete")p.reasons=(p.reasons||[]).concat(trace); b.revision++; b.annotation.reviewReasons=p.status==="complete"?[]:p.reasons; b.renderStatus=p.status==="complete"?"pending":p.status; var saved=write(before.note,b); port.writeNote(before.note,saved); if(p.status!=="complete")return{bundle:b,plan:p,observation:obs}; try{port.reconcile(b,p);b.renderStatus="complete";}catch(err){trace=port.diagnostics?port.diagnostics():[];b.renderStatus="failed";b.annotation.reviewReasons=["render-failed:"+(err.message||String(err))].concat(trace);} port.writeNote(saved,write(saved,b)); return{bundle:b,plan:p,observation:obs}; }
    return {Domain:{create:create,validate:validate,resolve:resolve,plan:plan},Store:{read:read,write:write,clone:clone,tag:tag,parseTag:parseTag},Application:{open:open,apply:apply}};
}());
if (typeof module !== "undefined" && module.exports) module.exports = LunaMedium;
