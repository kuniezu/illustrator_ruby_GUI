/* Pure bridge from Formal Multi plans to the validated AreaText-native render contract. */
var FormalMultiNativeRenderer = (function () {
    function own(object, key) { return Object.prototype.hasOwnProperty.call(object, key); }
    function fail(message) { throw Error(message); }
    function annotation(bundle, annotationId) {
        var i;
        for (i = 0; i < bundle.annotations.length; i++) if (bundle.annotations[i].annotationId === annotationId) return bundle.annotations[i];
        return null;
    }
    function contains(values, value) {
        var i;
        for (i = 0; i < values.length; i++) if (values[i] === value) return true;
        return false;
    }
    function logicalId(annotationId, renderSegmentId) { return annotationId + ":" + renderSegmentId; }
    function tunedGap(geometry, appearance) {
        var legacyGapEm = .15, nativeDefaultGapEm = .1, gapEm;
        if (!geometry || typeof geometry.gap !== "number" || typeof geometry.baseSize !== "number" || geometry.baseSize <= 0) return geometry ? geometry.gap : null;
        gapEm = appearance && typeof appearance.gapEm === "number" && appearance.gapEm >= 0 ? appearance.gapEm : legacyGapEm;
        return gapEm === legacyGapEm ? geometry.baseSize * nativeDefaultGapEm : geometry.gap * gapEm / legacyGapEm;
    }
    function physicalId(requestId, index, occupied) {
        var base = "formal-native-" + requestId + "-" + index, candidate = base, suffix = 1;
        while (occupied[candidate]) { candidate = base + "-" + suffix; suffix++; }
        occupied[candidate] = true;
        return candidate;
    }
    function occupyManifestIds(manifest, occupied) {
        var key, i, operation = manifest && manifest.operation;
        manifest = manifest || {};
        for (key in (manifest.activeBindings || {})) if (own(manifest.activeBindings, key)) occupied[manifest.activeBindings[key]] = true;
        for (i = 0; i < (manifest.retirementQueue || []).length; i++) occupied[manifest.retirementQueue[i]] = true;
        for (i = 0; i < (manifest.cleanupQueue || []).length; i++) occupied[manifest.cleanupQueue[i]] = true;
        for (key in (manifest.renderRecords || {})) if (own(manifest.renderRecords, key)) occupied[key] = true;
        for (i = 0; operation && i < (operation.candidateIds || []).length; i++) occupied[operation.candidateIds[i]] = true;
    }
    function geometryOf(segment) {
        var geometry = segment && segment.geometry, height;
        if (!geometry || typeof geometry.left !== "number" || typeof geometry.top !== "number" || typeof geometry.width !== "number" || geometry.width <= 0) fail("native-render-geometry-unavailable");
        height = geometry.leading > 0 ? geometry.leading : (geometry.baseSize > 0 ? geometry.baseSize : 1);
        return { autoLeft: geometry.left, autoTop: geometry.top, autoWidth: geometry.width, boxHeight: height, baseSize: geometry.baseSize, measuredTop: typeof geometry.measuredTop === "number" ? geometry.measuredTop : null, gap: typeof geometry.gap === "number" ? geometry.gap : null };
    }
    function rubyWidth(geometry, reading, fontSize) {
        var estimated = String(reading == null ? "" : reading).length * fontSize;
        return estimated > geometry.autoWidth ? estimated : geometry.autoWidth;
    }
    function createSpecs(bundle, plan, requestId, sourceFontName, previousManifest) {
        var specs = [], desiredLogicalSegmentIds = [], occupied = {}, results = plan && (plan.results || plan.plans) || [], i, j, result, a, segment, id, geometry, appearance;
        if (!plan || plan.status !== "complete") return { status: plan && plan.status || "failed", specs: [], desiredLogicalSegmentIds: [] };
        occupyManifestIds(previousManifest, occupied);
        for (i = 0; i < results.length; i++) {
            result = results[i];
            if (result.status !== "complete") fail("native-render-plan-incomplete");
            if (!result.decision || !result.decision.segments || !result.decision.segments.length) continue;
            a = annotation(bundle, result.annotationId);
            if (!a) fail("native-render-annotation-missing");
            for (j = 0; j < (result.decision.segments || []).length; j++) {
                segment = result.decision.segments[j];
                id = logicalId(result.annotationId, segment.renderSegmentId);
                geometry = geometryOf(segment);
                appearance = FormalAppearance.normalize(a.appearance, geometry.baseSize > 0 ? geometry.baseSize : geometry.boxHeight, sourceFontName);
                geometry.gap = tunedGap(geometry, appearance);
                if (rubyWidth(geometry, segment.reading, appearance.fontSize) > geometry.autoWidth) {
                    geometry.autoLeft -= (rubyWidth(geometry, segment.reading, appearance.fontSize) - geometry.autoWidth) / 2;
                    geometry.autoWidth = rubyWidth(geometry, segment.reading, appearance.fontSize);
                }
                specs.push(FormalAreaTextRenderSpec.create({
                    sourceFrameId: bundle.sourceFrameId,
                    annotationId: result.annotationId,
                    logicalSegmentId: id,
                    reading: segment.reading,
                    appearance: appearance,
                    geometry: geometry,
                    meta: { requestId: requestId, generationId: "generation-" + requestId, physicalId: physicalId(requestId, specs.length, occupied) }
                }));
                desiredLogicalSegmentIds.push(id);
            }
        }
        return { status: "complete", specs: specs, desiredLogicalSegmentIds: desiredLogicalSegmentIds };
    }
    function transition(previousManifest, desiredLogicalSegmentIds, specs) {
        var desired = {}, bindings = {}, retired = [], removedLogicalSegmentIds = [], key, i, physical;
        previousManifest = previousManifest || FormalAreaTextNative.createManifest();
        for (i = 0; i < desiredLogicalSegmentIds.length; i++) desired[desiredLogicalSegmentIds[i]] = true;
        for (i = 0; i < specs.length; i++) bindings[specs[i].logicalSegmentId] = specs[i].physicalId;
        for (key in previousManifest.activeBindings) if (own(previousManifest.activeBindings, key)) {
            physical = previousManifest.activeBindings[key];
            if (!desired[key]) { removedLogicalSegmentIds.push(key); retired.push(physical); }
            else if (bindings[key] !== physical) { retired.push(physical); }
        }
        return { bindings: bindings, retiredPhysicalIds: retired, removedLogicalSegmentIds: removedLogicalSegmentIds };
    }
    return { createSpecs: createSpecs, transition: transition, logicalId: logicalId };
}());
if (typeof module !== "undefined") module.exports = FormalMultiNativeRenderer;
