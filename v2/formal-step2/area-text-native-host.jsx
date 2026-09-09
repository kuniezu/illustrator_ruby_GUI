/*
 * AreaText-native host batch scaffold.
 * Requires FormalAreaTextRenderSpec, FormalAreaTextNative and FormalAreaTextNativeBackend.
 * Does not mutate source persistence, activate generations, or retire old output.
 */
function FormalAreaTextNativeHost(doc, layer) {
    var backend = FormalAreaTextNativeBackend(doc, layer);

    function validateBatch(renderSpecs) {
        var requestId = null, sourceFrameId = null, physical = {}, logical = {}, i, spec;
        if (!renderSpecs || typeof renderSpecs.length !== "number") throw Error("native-render-specs-required");
        for (i = 0; i < renderSpecs.length; i++) {
            spec = renderSpecs[i];
            if (!FormalAreaTextRenderSpec.validate(spec).ok) throw Error("render-spec-invalid:" + i);
            if (requestId === null) requestId = spec.requestId;
            if (sourceFrameId === null) sourceFrameId = spec.sourceFrameId;
            if (requestId !== spec.requestId) throw Error("render-spec-request-mismatch");
            if (sourceFrameId !== spec.sourceFrameId) throw Error("render-spec-source-mismatch");
            if (physical[spec.physicalId]) throw Error("render-spec-physical-duplicate");
            if (logical[spec.logicalSegmentId]) throw Error("render-spec-logical-duplicate");
            physical[spec.physicalId] = true;
            logical[spec.logicalSegmentId] = true;
        }
    }

    function prepareAll(renderSpecs) {
        var batch = { candidates: [], records: [], status: "prepared" }, i, spec, backendSpec, candidate, backendSpecs = [];
        try {
            validateBatch(renderSpecs);
            for (i = 0; i < renderSpecs.length; i++) {
                spec = renderSpecs[i];
                backendSpec = FormalAreaTextRenderSpec.backendSpec(spec);
                backendSpecs.push(backendSpec);
            }
            for (i = 0; i < renderSpecs.length; i++) {
                spec = renderSpecs[i];
                backendSpec = backendSpecs[i];
                candidate = backend.prepareCandidate(backendSpec);
                batch.candidates.push({ spec: spec, backendSpec: backendSpec, candidate: candidate });
            }
            return batch;
        } catch (e) {
            disposeAll(batch);
            throw e;
        }
    }

    function verifyAll(batch) {
        var i, entry, result, observation, records = [];
        if (!batch || batch.status !== "prepared") throw Error("native-batch-not-prepared");
        try {
            for (i = 0; i < batch.candidates.length; i++) {
                entry = batch.candidates[i];
                result = backend.verifyCandidate(entry.candidate, entry.backendSpec);
                if (!result.ok && result.retryable !== false) result = backend.tryTracking(entry.candidate, entry.backendSpec);
                if (!result.ok) throw Error("native-fit-failed:" + result.reason);
                observation = result.observation;
                records.push({
                    physicalId: entry.spec.physicalId,
                    sourceFrameId: entry.spec.sourceFrameId,
                    logicalSegmentId: entry.spec.logicalSegmentId,
                    generationId: entry.spec.generationId,
                    requestId: entry.spec.requestId,
                    rendererVersion: entry.spec.rendererVersion,
                    geometryVersion: entry.spec.geometryVersion,
                    autoLeft: entry.spec.geometry.autoLeft,
                    autoWidth: entry.spec.geometry.autoWidth,
                    appliedLeft: observation.frameLeft,
                    appliedWidth: observation.textPathWidth !== null ? observation.textPathWidth : observation.frameWidth,
                    appliedTop: observation.frameTop,
                    appliedHeight: observation.textPathHeight !== null ? observation.textPathHeight : observation.frameHeight,
                    tracking: result.tracking == null ? observation.tracking : result.tracking,
                    fontName: observation.fontName,
                    fontSize: observation.fontSize,
                    justification: observation.justification,
                    singleWordJustification: observation.singleWordJustification,
                    fitReason: result.reason
                });
            }
            batch.records = records;
            batch.status = "verified";
            return batch;
        } catch (e) {
            disposeAll(batch);
            throw e;
        }
    }

    function candidateIds(batch) {
        var out = [], i;
        if (!batch) return out;
        for (i = 0; i < batch.candidates.length; i++) out.push(batch.candidates[i].spec.physicalId);
        return out;
    }

    function recordsByPhysicalId(batch) {
        var out = {}, i;
        if (!batch) return out;
        for (i = 0; i < batch.records.length; i++) out[batch.records[i].physicalId] = batch.records[i];
        return out;
    }

    function bindingsByLogicalSegmentId(batch) {
        var out = {}, i, spec;
        if (!batch) return out;
        for (i = 0; i < batch.candidates.length; i++) {
            spec = batch.candidates[i].spec;
            out[spec.logicalSegmentId] = spec.physicalId;
        }
        return out;
    }

    function disposeAll(batch) {
        var i;
        if (!batch || !batch.candidates) return;
        for (i = batch.candidates.length - 1; i >= 0; i--) backend.disposeCandidate(batch.candidates[i].candidate);
        batch.status = "disposed";
    }

    return {
        prepareAll: prepareAll,
        verifyAll: verifyAll,
        candidateIds: candidateIds,
        recordsByPhysicalId: recordsByPhysicalId,
        bindingsByLogicalSegmentId: bindingsByLogicalSegmentId,
        disposeAll: disposeAll
    };
}
