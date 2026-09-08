/* Immutable identity codec/resolver for native managed output only. */
var FormalAreaTextNativeOutputIdentity = (function () {
    var OPEN = "[v2-formal-step2-native-output:v1]", CLOSE = "[/v2-formal-step2-native-output]", PREFIX = "[v2-formal-step2-native-output:";
    function fail(message) { throw Error(message); }
    function own(object, key) { return Object.prototype.hasOwnProperty.call(object, key); }
    function required(value, name) { if (typeof value !== "string" || !value) fail("native-output-identity-" + name); return value; }
    function decode(value) { try { return decodeURIComponent(value); } catch (e) { fail("native-output-identity-encoding"); } }
    function locate(note) {
        var text = String(note), start = text.indexOf(PREFIX), end, close, second;
        if (start < 0) { if (text.indexOf(CLOSE) >= 0) fail("native-output-identity-orphan-close"); return null; }
        if (text.indexOf(PREFIX, start + PREFIX.length) >= 0) fail("native-output-identity-duplicate");
        end = text.indexOf("]", start + PREFIX.length); if (end < 0) fail("native-output-identity-broken-open");
        if (text.substring(start, end + 1) !== OPEN) fail("native-output-identity-unknown-version");
        close = text.indexOf(CLOSE, end + 1); if (close < 0) fail("native-output-identity-broken-close");
        second = text.indexOf(CLOSE, close + CLOSE.length); if (second >= 0) fail("native-output-identity-duplicate");
        return { start: start, end: close + CLOSE.length, payload: text.substring(end + 1, close) };
    }
    function validate(identity) {
        if (!identity || typeof identity !== "object") fail("native-output-identity-invalid");
        return { sourceFrameId: required(identity.sourceFrameId, "source"), physicalId: required(identity.physicalId, "physical") };
    }
    function serialize(identity) {
        var value = validate(identity);
        return OPEN + "\nsourceFrameId=" + encodeURIComponent(value.sourceFrameId) + "\nphysicalId=" + encodeURIComponent(value.physicalId) + "\n" + CLOSE;
    }
    function parse(note) {
        var located = locate(note), lines, i, parts, values = {}, key;
        if (!located) return null;
        if (located.payload.charAt(0) !== "\n" || located.payload.charAt(located.payload.length - 1) !== "\n") fail("native-output-identity-malformed");
        lines = located.payload.substring(1, located.payload.length - 1).split("\n");
        if (lines.length !== 2) fail("native-output-identity-fields");
        for (i = 0; i < lines.length; i++) {
            parts = lines[i].split("="); if (parts.length !== 2) fail("native-output-identity-field");
            key = parts[0]; if ((key !== "sourceFrameId" && key !== "physicalId") || own(values, key)) fail("native-output-identity-field");
            values[key] = decode(parts[1]);
        }
        validate(values);
        return values;
    }
    function write(note, identity) {
        var text = String(note), located = locate(text), value = validate(identity), existing;
        if (!located) return text + serialize(value);
        existing = parse(text);
        if (existing.sourceFrameId !== value.sourceFrameId || existing.physicalId !== value.physicalId) fail("native-output-identity-immutable");
        return text;
    }
    function stamp(frame, identity) {
        var next, parsed;
        if (!frame || typeof frame.note !== "string") fail("native-output-identity-target-invalid");
        next = write(frame.note, identity); frame.note = next;
        if (String(frame.note) !== next) fail("native-output-identity-readback");
        parsed = parse(frame.note);
        if (!parsed || parsed.sourceFrameId !== identity.sourceFrameId || parsed.physicalId !== identity.physicalId) fail("native-output-identity-readback");
        return parsed;
    }
    function resolve(textFrames, sourceFrameId, physicalId) {
        var matches = [], i, frame, identity;
        required(sourceFrameId, "source"); required(physicalId, "physical");
        if (!textFrames || typeof textFrames.length !== "number") fail("native-output-identity-inventory-invalid");
        for (i = 0; i < textFrames.length; i++) {
            frame = textFrames[i]; identity = parse(frame.note);
            if (identity && identity.sourceFrameId === sourceFrameId && identity.physicalId === physicalId) matches.push(frame);
        }
        if (matches.length > 1) fail("native-output-identity-duplicate-match");
        return matches.length ? { status: "found", frame: matches[0] } : { status: "missing" };
    }
    return { serialize: serialize, parse: parse, write: write, stamp: stamp, resolve: resolve };
}());
if (typeof module !== "undefined") module.exports = FormalAreaTextNativeOutputIdentity;
