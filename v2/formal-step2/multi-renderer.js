/* Multi-annotation bridge to the existing observed geometry and renderer contract. */
var FormalMultiRenderer = (function () {
    function findAnnotation(bundle, annotationId) {
        var i;
        for (i = 0; i < bundle.annotations.length; i++) {
            if (bundle.annotations[i].annotationId === annotationId) return bundle.annotations[i];
        }
        return null;
    }

    function proxyBundle(bundle, annotationId, appearance) {
        return {
            sourceFrameId: bundle.sourceFrameId,
            annotation: { annotationId: annotationId, appearance: appearance }
        };
    }

    function plan(bundle, sourceText, observation) {
        var plans = [], i, occurrence, annotation, result, hasFailed = false, hasUnresolved = false;
        for (i = 0; i < bundle.occurrences.length; i++) {
            occurrence = bundle.occurrences[i];
            annotation = findAnnotation(bundle, FormalMultiProjection.id(bundle, occurrence));
            if (!annotation || !annotation.enabled) {
                plans.push({ annotationId: FormalMultiProjection.id(bundle, occurrence), status: "complete", decision: { status: "complete", segments: [] }, suppressed: true, reasons: [] });
                continue;
            }
            result = FormalMultiOrchestration.planOne(bundle, annotation.annotationId, sourceText, observation);
            result.occurrenceId = occurrence.occurrenceId;
            result.appearance = annotation.appearance;
            plans.push(result);
            if (result.status === "failed") hasFailed = true;
            else if (result.status !== "complete" && result.status !== "hidden") hasUnresolved = true;
        }
        return { status: hasFailed ? "failed" : (hasUnresolved ? "unresolved" : "complete"), plans: plans };
    }

    function render(bundle, sourceText, observation, adapter) {
        var planned = plan(bundle, sourceText, observation), i, item;
        if (planned.status !== "complete") return planned;
        for (i = 0; i < planned.plans.length; i++) {
            item = planned.plans[i];
            adapter.reconcile(proxyBundle(bundle, item.annotationId, item.appearance), item.decision);
        }
        return planned;
    }

    function specifications(bundle) {
        var result = [], seen = {}, i, occurrence, annotation, annotationId, retired = bundle.retiredAnnotationIds || [];
        for (i = 0; i < bundle.occurrences.length; i++) {
            occurrence = bundle.occurrences[i];
            annotationId = FormalMultiProjection.id(bundle, occurrence);
            if (seen[annotationId]) continue;
            seen[annotationId] = true;
            annotation = findAnnotation(bundle, annotationId);
            result.push({
                annotationId: annotationId,
                annotation: annotation ? {
                    annotationId: annotation.annotationId,
                    sourceFrameId: annotation.sourceFrameId,
                    anchor: annotation.anchor,
                    reading: annotation.reading,
                    readingConfirmed: annotation.readingConfirmed,
                    enabled: annotation.enabled,
                    placementMode: annotation.placementMode,
                    appearance: typeof FormalAppearance!=="undefined" ? FormalAppearance.normalize(annotation.appearance, null, "") : (annotation.appearance || {fontName:"",fontSize:null,manualDeltaX:0,widthScale:1,gapEm:.15}),
                    splitHints: annotation.splitHints || []
                } : null
            });
        }
        for (i = 0; i < retired.length; i++) if (!seen[retired[i]]) { seen[retired[i]] = true; result.push({ annotationId: retired[i], annotation: null, cleanup: true }); }
        return result;
    }

    return { plan: plan, render: render, specifications: specifications };
}());

if (typeof module !== "undefined") module.exports = FormalMultiRenderer;
