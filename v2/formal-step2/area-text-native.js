/* Pure AreaText-native renderer state and fit helpers. No Illustrator DOM access. */
var FormalAreaTextNative = (function () {
    var MODE = "area-text-native";
    var TRACKING_CANDIDATES = [0, -25, -50, -75, -100];

    function own(obj, key) { return Object.prototype.hasOwnProperty.call(obj, key); }
    function finite(value) { return typeof value === "number" && isFinite(value); }
    function integer(value) { return finite(value) && Math.floor(value) === value; }

    function copyArray(source) {
        var out = [], i;
        source = source || [];
        for (i = 0; i < source.length; i++) out.push(source[i]);
        return out;
    }

    function copyMap(source) {
        var out = {}, key;
        source = source || {};
        for (key in source) if (own(source, key)) out[key] = source[key];
        return out;
    }

    function contains(items, value) {
        var i;
        for (i = 0; i < items.length; i++) if (items[i] === value) return true;
        return false;
    }

    function unique(items) {
        var out = [], i;
        items = items || [];
        for (i = 0; i < items.length; i++) if (!contains(out, items[i])) out.push(items[i]);
        return out;
    }

    function createManifest() {
        return {
            rendererMode: MODE,
            manifestRevision: 0,
            activeBindings: {},
            renderRecords: {},
            operation: null,
            retirementQueue: []
        };
    }

    function cloneManifest(state) {
        state = state || createManifest();
        return {
            rendererMode: state.rendererMode || MODE,
            manifestRevision: integer(state.manifestRevision) && state.manifestRevision >= 0 ? state.manifestRevision : 0,
            activeBindings: copyMap(state.activeBindings),
            renderRecords: copyMap(state.renderRecords),
            operation: state.operation ? {
                requestId: String(state.operation.requestId),
                baseRevision: state.operation.baseRevision,
                phase: state.operation.phase || "prepare",
                candidateIds: copyArray(state.operation.candidateIds)
            } : null,
            retirementQueue: copyArray(state.retirementQueue)
        };
    }

    function beginOperation(state, requestId, candidateIds) {
        var out = cloneManifest(state), id = String(requestId || "");
        if (!id) throw Error("request-id-required");
        if (out.operation && out.operation.requestId !== id) throw Error("operation-already-active");
        if (!out.operation) {
            out.operation = {
                requestId: id,
                baseRevision: out.manifestRevision,
                phase: "prepare",
                candidateIds: unique(candidateIds || [])
            };
        }
        return out;
    }

    function activate(state, requestId, bindings, records, retireIds) {
        var out = cloneManifest(state), id = String(requestId || ""), key, i, physical, record, current, seen = {}, retire = unique(retireIds || []);
        if (!out.operation || out.operation.requestId !== id) throw Error("operation-request-mismatch");
        if (out.operation.phase !== "verified") throw Error("operation-not-verified");
        bindings = bindings || {};
        records = records || {};
        for (key in records) if (own(records, key) && !contains(out.operation.candidateIds, key)) throw Error("activation-record-not-owned");
        for (key in bindings) if (own(bindings, key)) {
            physical = bindings[key];
            current = state.activeBindings && state.activeBindings[key];
            if (!physical || (current !== physical && !contains(out.operation.candidateIds, physical))) throw Error("activation-binding-not-owned");
            if (own(seen, physical)) throw Error("activation-physical-duplicate");
            seen[physical] = true;
            if (current !== physical) {
                if (!own(records, physical)) throw Error("activation-binding-record-missing");
                record = records[physical];
                if (!record || record.physicalId !== physical || record.requestId !== id || record.logicalSegmentId !== key) throw Error("activation-record-mismatch");
            }
        }
        for (key in state.activeBindings) if (own(state.activeBindings, key) && !own(bindings, key)) {
            physical = state.activeBindings[key];
            if (own(seen, physical)) throw Error("activation-physical-duplicate");
            seen[physical] = true;
        }
        for (key in records) if (own(records, key)) {
            if (!contains(out.operation.candidateIds, key)) throw Error("activation-record-not-owned");
            record = records[key];
            if (!record || record.physicalId !== key || record.requestId !== id || !record.logicalSegmentId) throw Error("activation-record-mismatch");
            if (!own(bindings, record.logicalSegmentId) || bindings[record.logicalSegmentId] !== key) throw Error("activation-binding-record-mismatch");
        }
        for (key in out.activeBindings) if (own(out.activeBindings, key) && contains(out.operation.candidateIds, out.activeBindings[key]) && !own(records, out.activeBindings[key]) && (!state.activeBindings || state.activeBindings[key] !== out.activeBindings[key])) throw Error("activation-binding-record-missing");
        for (key in bindings) if (own(bindings, key)) out.activeBindings[key] = bindings[key];
        for (key in records) if (own(records, key)) out.renderRecords[key] = records[key];
        for (i = 0; i < retire.length; i++) {
            for (key in out.activeBindings) if (own(out.activeBindings, key) && out.activeBindings[key] === retire[i]) throw Error("cannot-activate-retired-physical");
        }
        out.retirementQueue = unique(out.retirementQueue.concat(retire));
        out.manifestRevision++;
        out.operation.phase = "activated";
        return out;
    }

    function markVerified(state, requestId) {
        var out = cloneManifest(state), id = String(requestId || "");
        if (!out.operation || out.operation.requestId !== id) throw Error("operation-request-mismatch");
        if (out.operation.phase !== "prepare") throw Error("operation-not-preparable");
        out.operation.phase = "verified";
        return out;
    }

    function markRetired(state, removedIds) {
        var out = cloneManifest(state), removed = unique(removedIds || []), next = [], i, key;
        for (i = 0; i < removed.length; i++) {
            for (key in out.activeBindings) if (own(out.activeBindings, key) && out.activeBindings[key] === removed[i]) throw Error("cannot-retire-active-physical");
        }
        for (i = 0; i < out.retirementQueue.length; i++) {
            if (!contains(removed, out.retirementQueue[i])) next.push(out.retirementQueue[i]);
        }
        out.retirementQueue = next;
        for (i = 0; i < removed.length; i++) {
            for (key in out.renderRecords) if (own(out.renderRecords, key) && key === removed[i]) delete out.renderRecords[key];
        }
        return out;
    }

    function finishOperation(state, requestId) {
        var out = cloneManifest(state), id = String(requestId || "");
        if (!out.operation || out.operation.requestId !== id) throw Error("operation-request-mismatch");
        if (out.operation.phase !== "activated") throw Error("operation-not-activated");
        out.operation = null;
        return out;
    }

    function activePhysicalId(state, logicalSegmentId) {
        state = state || createManifest();
        return own(state.activeBindings || {}, logicalSegmentId) ? state.activeBindings[logicalSegmentId] : null;
    }

    function physicalStatus(state, physicalId) {
        var key, operation;
        state = state || createManifest();
        for (key in (state.activeBindings || {})) if (own(state.activeBindings, key) && state.activeBindings[key] === physicalId) return "active";
        if (contains(state.retirementQueue || [], physicalId)) return "cleanup-pending";
        operation = state.operation;
        if (operation && contains(operation.candidateIds || [], physicalId)) return "pending";
        return "unreferenced";
    }

    function fitFailure(reason) { return { ok: false, reason: reason, retryable: isRetryableFitReason(reason) }; }

    function classifyThreading(frame) {
        var previous = null, next = null, previousSelf = false, nextSelf = false;
        try { previous = frame && frame.previousFrame ? frame.previousFrame : null; } catch (e1) { return { ok: false, reason: "threading-unverified" }; }
        try { next = frame && frame.nextFrame ? frame.nextFrame : null; } catch (e2) { return { ok: false, reason: "threading-unverified" }; }
        try { previousSelf = previous === frame; } catch (e3) { return { ok: false, reason: "threading-unverified" }; }
        try { nextSelf = next === frame; } catch (e4) { return { ok: false, reason: "threading-unverified" }; }
        if (previousSelf || nextSelf) return { ok: false, nonThreaded: false, reason: "threading-self-reference" };
        return { ok: true, nonThreaded: !previous && !next, previous: previous, next: next };
    }

    function isRetryableFitReason(reason) {
        return reason === "fit-line-count" || reason === "fit-line-coverage-mismatch";
    }

    function verifyOneLineFit(observation, requestedReading) {
        var reading = String(requestedReading == null ? "" : requestedReading), line, rangeSpan;
        if (!observation) return fitFailure("fit-observation-missing");
        if (observation.horizontal !== true) return fitFailure("fit-horizontal-unverified");
        if (observation.rectangular !== true) return fitFailure("fit-rectangle-unverified");
        if (observation.nonThreaded !== true) return fitFailure("fit-nonthreaded-unverified");
        if (observation.stable !== true) return fitFailure("fit-observation-unstable");
        if (String(observation.frameContents) !== reading) return fitFailure("fit-frame-contents-mismatch");
        if (String(observation.rangeContents) !== reading) return fitFailure("fit-range-contents-mismatch");
        if (!integer(observation.rangeStart) || !integer(observation.rangeEnd) || observation.rangeEnd < observation.rangeStart) return fitFailure("fit-range-invalid");
        rangeSpan = observation.rangeEnd - observation.rangeStart;
        if (rangeSpan !== reading.length) return fitFailure("fit-range-span-mismatch");
        if (!observation.lines || observation.lines.length !== 1) return fitFailure("fit-line-count");
        line = observation.lines[0];
        if (!integer(line.start) || !integer(line.end)) return fitFailure("fit-line-range-invalid");
        if (line.start !== observation.rangeStart || line.end !== observation.rangeEnd) return fitFailure("fit-line-coverage-mismatch");
        if (String(line.contents) !== reading) return fitFailure("fit-line-contents-mismatch");
        return { ok: true, reason: "fit-one-line-covered", rangeStart: observation.rangeStart, rangeEnd: observation.rangeEnd };
    }

    function trackingCandidates() { return copyArray(TRACKING_CANDIDATES); }

    function sameNumber(a, b, tolerance) {
        tolerance = finite(tolerance) && tolerance >= 0 ? tolerance : 0.01;
        return finite(a) && finite(b) && Math.abs(a - b) <= tolerance;
    }

    function captureManualAdjustment(actual, baseline, previous, tolerance) {
        var out = {
            manualDeltaX: previous && finite(previous.manualDeltaX) ? previous.manualDeltaX : 0,
            widthScale: previous && finite(previous.widthScale) && previous.widthScale > 0 ? previous.widthScale : 1,
            captured: false,
            reason: "baseline-unverified"
        };
        if (!actual || !baseline) return out;
        if (actual.generationId !== baseline.generationId || actual.rendererVersion !== baseline.rendererVersion || actual.geometryVersion !== baseline.geometryVersion) return out;
        if (!finite(baseline.autoLeft) || !finite(baseline.autoWidth) || baseline.autoWidth <= 0 || !finite(baseline.appliedLeft) || !finite(baseline.appliedWidth)) return out;
        if (!finite(actual.left) || !finite(actual.width) || actual.width <= 0) return out;
        if (sameNumber(actual.left, baseline.appliedLeft, tolerance) && sameNumber(actual.width, baseline.appliedWidth, tolerance)) {
            out.reason = "unchanged";
            return out;
        }
        out.manualDeltaX = actual.left - baseline.autoLeft;
        out.widthScale = actual.width / baseline.autoWidth;
        out.captured = true;
        out.reason = "captured";
        return out;
    }

    return {
        MODE: MODE,
        createManifest: createManifest,
        cloneManifest: cloneManifest,
        beginOperation: beginOperation,
        markVerified: markVerified,
        activate: activate,
        markRetired: markRetired,
        finishOperation: finishOperation,
        activePhysicalId: activePhysicalId,
        physicalStatus: physicalStatus,
        verifyOneLineFit: verifyOneLineFit,
        trackingCandidates: trackingCandidates,
        classifyThreading: classifyThreading,
        isRetryableFitReason: isRetryableFitReason,
        captureManualAdjustment: captureManualAdjustment
    };
}());
if (typeof module !== "undefined") module.exports = FormalAreaTextNative;
