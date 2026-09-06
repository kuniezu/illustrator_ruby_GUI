/* Multi-annotation bridge to the existing observed geometry and renderer contract. */
var FormalMultiRenderer = (function () {
    function findAnnotation(bundle, annotationId) {
        var i;
        for (i = 0; i < bundle.annotations.length; i++) {
            if (bundle.annotations[i].annotationId === annotationId) return bundle.annotations[i];
        }
        return null;
    }

    function proxyBundle(bundle, annotationId) {
        return {
            sourceFrameId: bundle.sourceFrameId,
            annotation: { annotationId: annotationId }
        };
    }

    function plan(bundle, sourceText, observation) {
        var plans = [], i, occurrence, annotation, result;
        for (i = 0; i < bundle.occurrences.length; i++) {
            occurrence = bundle.occurrences[i];
            annotation = findAnnotation(bundle, FormalMultiProjection.id(bundle, occurrence));
            if (!annotation || !annotation.enabled) {
                plans.push({ annotationId: FormalMultiProjection.id(bundle, occurrence), status: "complete", decision: { status: "complete", segments: [] }, suppressed: true, reasons: [] });
                continue;
            }
            result = FormalMultiOrchestration.planOne(bundle, annotation.annotationId, sourceText, observation);
            plans.push(result);
            if (result.status !== "complete") return { status: result.status, plans: plans };
        }
        return { status: "complete", plans: plans };
    }

    function render(bundle, sourceText, observation, adapter) {
        var planned = plan(bundle, sourceText, observation), i, item;
        if (planned.status !== "complete") return planned;
        for (i = 0; i < planned.plans.length; i++) {
            item = planned.plans[i];
            adapter.reconcile(proxyBundle(bundle, item.annotationId), item.decision);
        }
        return planned;
    }

    function specifications(bundle) {
        var result = [], i, occurrence, annotation, annotationId;
        for (i = 0; i < bundle.occurrences.length; i++) {
            occurrence = bundle.occurrences[i];
            annotationId = FormalMultiProjection.id(bundle, occurrence);
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
                    splitHints: annotation.splitHints || []
                } : null
            });
        }
        return result;
    }

    return { plan: plan, render: render, specifications: specifications };
}());

if (typeof module !== "undefined") module.exports = FormalMultiRenderer;
