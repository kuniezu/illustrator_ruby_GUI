/* Isolated ES3-safe source.note store for the AreaText-native scaffold. */
var FormalAreaTextNativeStore = (function () {
    var OPEN = "[v2-formal-step2-native:v1]", CLOSE = "[/v2-formal-step2-native]";
    var RECORD_NUMBERS = ["autoLeft", "autoWidth", "appliedLeft", "appliedWidth", "appliedTop", "appliedHeight", "tracking", "fontSize"];
    var RECORD_STRINGS = ["physicalId", "logicalSegmentId", "generationId", "requestId", "rendererVersion", "geometryVersion", "fontName", "justification", "singleWordJustification", "fitReason"];

    function own(object, key) { return Object.prototype.hasOwnProperty.call(object, key); }
    function fail(message) { throw Error(message); }
    function finite(value) { return typeof value === "number" && isFinite(value); }
    function integer(value) { return finite(value) && Math.floor(value) === value; }
    function object(value) { return value && typeof value === "object" && !(value instanceof Array); }
    function copyArray(values) { var out = [], i; for (i = 0; i < values.length; i++) out.push(values[i]); return out; }
    function contains(values, value) { var i; for (i = 0; i < values.length; i++) if (values[i] === value) return true; return false; }
    function keys(value) { var out = [], key; for (key in value) if (own(value, key)) out.push(key); out.sort(); return out; }
    function decode(value, reason) { try { return decodeURIComponent(value); } catch (e) { fail(reason || "native-store-malformed-encoding"); } }

    function pack(value) {
        var names, out, i, key;
        if (value === null) return "n;";
        if (typeof value === "string") return "s" + encodeURIComponent(value) + ";";
        if (typeof value === "boolean") return "b" + (value ? "1" : "0") + ";";
        if (typeof value === "number") { if (!finite(value)) fail("native-store-nonfinite-value"); return "d" + String(value) + ";"; }
        if (!object(value) && !(value instanceof Array)) fail("native-store-unsupported-value");
        if (value instanceof Array) { out = "a" + value.length + "["; for (i = 0; i < value.length; i++) out += pack(value[i]); return out + "]"; }
        names = keys(value); out = "o" + names.length + "{";
        for (i = 0; i < names.length; i++) { key = names[i]; out += "k" + encodeURIComponent(key) + ";" + pack(value[key]); }
        return out + "}";
    }

    function readToken(text, state, delimiter) {
        var end = text.indexOf(delimiter, state.pos), value;
        if (end < 0) fail("native-store-truncated");
        value = text.substring(state.pos, end); state.pos = end + delimiter.length; return value;
    }

    function unpack(text) {
        var state = { text: String(text), pos: 0 };
        function value() {
            var tag, raw, count, i, result, key;
            if (state.pos >= state.text.length) fail("native-store-truncated");
            tag = state.text.charAt(state.pos++);
            if (tag === "n") { if (state.text.charAt(state.pos++) !== ";") fail("native-store-null"); return null; }
            if (tag === "s") return decode(readToken(state.text, state, ";"));
            if (tag === "b") { raw = readToken(state.text, state, ";"); if (raw !== "0" && raw !== "1") fail("native-store-boolean"); return raw === "1"; }
            if (tag === "d") { raw = readToken(state.text, state, ";"); result = Number(raw); if (!finite(result)) fail("native-store-number"); return result; }
            if (tag === "a" || tag === "o") {
                raw = readToken(state.text, state, tag === "a" ? "[" : "{"); count = Number(raw);
                if (!integer(count) || count < 0) fail("native-store-count");
                result = tag === "a" ? [] : {};
                for (i = 0; i < count; i++) {
                    if (tag === "o") { if (state.text.charAt(state.pos++) !== "k") fail("native-store-key"); key = decode(readToken(state.text, state, ";")); if (own(result, key)) fail("native-store-duplicate-key"); result[key] = value(); }
                    else result.push(value());
                }
                if (state.text.charAt(state.pos++) !== (tag === "a" ? "]" : "}")) fail("native-store-container");
                return result;
            }
            fail("native-store-type");
        }
        var result = value();
        if (state.pos !== state.text.length) fail("native-store-trailing-data");
        return result;
    }

    function validateRecord(record, key) {
        var i, field;
        if (!object(record)) fail("native-store-record-invalid");
        if (record.physicalId !== key) fail("native-store-record-key-mismatch");
        for (i = 0; i < RECORD_STRINGS.length; i++) { field = RECORD_STRINGS[i]; if (typeof record[field] !== "string") fail("native-store-record-field:" + field); }
        for (i = 0; i < RECORD_NUMBERS.length; i++) { field = RECORD_NUMBERS[i]; if (!finite(record[field])) fail("native-store-record-field:" + field); }
        if (record.autoWidth <= 0 || record.appliedWidth <= 0) fail("native-store-record-width");
    }

    function validateManifest(manifest) {
        var seen = {}, activePhysical = {}, key, physical, record, i, operation;
        if (!object(manifest) || manifest.rendererMode !== "area-text-native" || !integer(manifest.manifestRevision) || manifest.manifestRevision < 0) fail("native-store-manifest-invalid");
        if (!object(manifest.activeBindings) || !object(manifest.renderRecords) || !(manifest.retirementQueue instanceof Array)) fail("native-store-manifest-shape");
        if (!own(manifest, "cleanupQueue")) manifest.cleanupQueue = [];
        else if (!(manifest.cleanupQueue instanceof Array)) fail("native-store-cleanup-invalid");
        for (key in manifest.activeBindings) if (own(manifest.activeBindings, key)) {
            physical = manifest.activeBindings[key];
            if (typeof key !== "string" || typeof physical !== "string" || !physical || own(seen, physical)) fail("native-store-active-ownership");
            if (!own(manifest.renderRecords, physical) || !object(manifest.renderRecords[physical])) fail("native-store-active-record-missing");
            if (manifest.renderRecords[physical].physicalId !== physical || manifest.renderRecords[physical].logicalSegmentId !== key) fail("native-store-active-record-mismatch");
            seen[physical] = true;
            activePhysical[physical] = true;
        }
        for (key in manifest.renderRecords) if (own(manifest.renderRecords, key)) validateRecord(manifest.renderRecords[key], key);
        seen = {};
        for (i = 0; i < manifest.retirementQueue.length; i++) {
            physical = manifest.retirementQueue[i];
            if (typeof physical !== "string" || !physical || own(seen, physical) || !own(manifest.renderRecords, physical) || own(activePhysical, physical)) fail("native-store-retirement-invalid");
            seen[physical] = true;
        }
        seen = {};
        for (i = 0; i < manifest.cleanupQueue.length; i++) {
            physical = manifest.cleanupQueue[i];
            if (typeof physical !== "string" || !physical || own(seen, physical) || own(activePhysical, physical) || contains(manifest.retirementQueue, physical)) fail("native-store-cleanup-invalid");
            seen[physical] = true;
        }
        operation = manifest.operation;
        if (operation !== null) {
            if (!object(operation) || typeof operation.requestId !== "string" || !operation.requestId || !integer(operation.baseRevision) || operation.baseRevision < 0 || (operation.phase !== "prepare" && operation.phase !== "verified" && operation.phase !== "activated") || !(operation.candidateIds instanceof Array)) fail("native-store-operation-invalid");
            if ((operation.phase === "prepare" || operation.phase === "verified") && operation.baseRevision !== manifest.manifestRevision) fail("native-store-operation-revision-mismatch");
            if (operation.phase === "activated" && manifest.manifestRevision !== operation.baseRevision + 1) fail("native-store-operation-revision-mismatch");
            seen = {};
            for (i = 0; i < operation.candidateIds.length; i++) { physical = operation.candidateIds[i]; if (typeof physical !== "string" || !physical || own(seen, physical)) fail("native-store-candidate-invalid"); seen[physical] = true; }
        }
        return manifest;
    }

    function locate(note) {
        var text = String(note), prefix = "[v2-formal-step2-native:", start = -1, cursor = 0, end, version, open, close, second;
        while ((start = text.indexOf(prefix, cursor)) >= 0) {
            end = text.indexOf("]", start + prefix.length); if (end < 0) fail("native-store-broken-open-marker");
            version = text.substring(start + prefix.length, end); if (version !== "v1") fail("native-store-unknown-version");
            if (cursor > 0) fail("native-store-duplicate-block");
            cursor = end + 1;
        }
        if (cursor === 0) { if (text.indexOf(CLOSE) >= 0) fail("native-store-orphan-close-marker"); if (text.indexOf("[v2-formal-step2-native:") >= 0) fail("native-store-unknown-version"); return null; }
        open = OPEN; close = CLOSE; start = text.indexOf(open); end = text.indexOf(close, start + open.length);
        if (text.indexOf(close) >= 0 && text.indexOf(close) < start) fail("native-store-orphan-close-marker");
        if (end < 0) fail("native-store-broken-close-marker");
        second = text.indexOf(close, end + close.length); if (second >= 0) fail("native-store-duplicate-block");
        return { start: start, end: end + close.length, payload: text.substring(start + open.length, end) };
    }

    function block(manifest) { validateManifest(manifest); return OPEN + "\npayload=" + pack(manifest) + "\n" + CLOSE; }

    function read(note) {
        var located = locate(note), payload, lines, i, p, parsed;
        if (!located) return null;
        payload = located.payload; if (payload.charAt(0) !== "\n" || payload.charAt(payload.length - 1) !== "\n") fail("native-store-malformed-block");
        lines = payload.substring(1, payload.length - 1).split("\n"); if (lines.length !== 1 || lines[0].substring(0, 8) !== "payload=") fail("native-store-malformed-payload");
        p = lines[0].substring(8); if (!p) fail("native-store-empty-payload"); parsed = unpack(p); return validateManifest(parsed);
    }

    function write(note, manifest) {
        var text = String(note), located = locate(text), replacement = block(manifest);
        return located ? text.substring(0, located.start) + replacement + text.substring(located.end) : text + replacement;
    }

    function update(target, expectedNote, manifest) {
        var current, next, parsed;
        if (!target || typeof target.note !== "string") fail("native-store-note-target-invalid");
        current = target.note; if (current !== String(expectedNote)) fail("concurrent-change");
        next = write(current, manifest); target.note = next;
        if (target.note !== next) fail("note-readback-mismatch");
        parsed = read(target.note); if (!parsed || block(parsed) !== block(manifest)) fail("note-manifest-readback-mismatch");
        return parsed;
    }

    function restartPlan(manifest) {
        try { validateManifest(manifest); } catch (e) { return { action: "manual-recovery-required", reason: e.message || String(e) }; }
        if (!manifest.operation) {
            if (manifest.cleanupQueue.length) return { action: "cleanup-discarded", candidateIds: copyArray(manifest.cleanupQueue) };
            return manifest.retirementQueue.length ? { action: "cleanup-retirement" } : { action: "idle" };
        }
        if (manifest.operation.phase === "prepare") return { action: "reprepare", requestId: manifest.operation.requestId, candidateIds: copyArray(manifest.operation.candidateIds) };
        if (manifest.operation.phase === "verified") return { action: "reprepare-reverify", requestId: manifest.operation.requestId, candidateIds: copyArray(manifest.operation.candidateIds) };
        if (manifest.operation.phase === "activated") return manifest.retirementQueue.length ? { action: "cleanup-retirement" } : (manifest.cleanupQueue.length ? { action: "cleanup-discarded", candidateIds: copyArray(manifest.cleanupQueue) } : { action: "finish-operation", requestId: manifest.operation.requestId });
        return { action: "manual-recovery-required", reason: "native-store-operation-phase" };
    }

    return { validate: validateManifest, serialize: block, read: read, write: write, update: update, restartPlan: restartPlan };
}());
if (typeof module !== "undefined") module.exports = FormalAreaTextNativeStore;
