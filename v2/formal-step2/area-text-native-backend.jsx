/*
 * AreaText-native candidate backend scaffold.
 * Not wired into production. It never activates or retires managed output;
 * source manifest ownership remains coordinator responsibility.
 */
function FormalAreaTextNativeBackend(doc, layer) {
    function finite(value) { return typeof value === "number" && isFinite(value); }
    function requiredNumber(value, name, positive) {
        if (!finite(value) || (positive && value <= 0)) throw Error(name + "-invalid");
        return value;
    }
    function text(value) { return String(value == null ? "" : value); }
    function readOptional(fn) { try { return fn(); } catch (ignore) { return null; } }
    function glyphInkBounds(candidate) {
        var duplicate = null, outline = null, value = null, cleanupFailure = null, error;
        if (!candidate || !candidate.frame || typeof candidate.frame.duplicate !== "function") throw Error("ruby-glyph-measurement-unavailable");
        try {
            duplicate = candidate.frame.duplicate();
            if (!duplicate || typeof duplicate.createOutline !== "function") throw Error("ruby-glyph-outline-unavailable");
            outline = duplicate.createOutline();
            value = readOptional(function () { return outline.visibleBounds; });
            if (!value || value.length < 4) value = readOptional(function () { return outline.geometricBounds; });
            if (!value || value.length < 4) throw Error("ruby-glyph-bounds-unavailable");
            return value;
        } finally {
            try { if (outline && outline.parent && typeof outline.remove === "function") outline.remove(); } catch (outlineError) { cleanupFailure = outlineError; }
            try { if (duplicate && duplicate.parent && typeof duplicate.remove === "function") duplicate.remove(); } catch (duplicateError) { cleanupFailure = duplicateError; }
            if (cleanupFailure) {
                error = Error("ruby-glyph-cleanup-failed");
                error.cleanupPendingIds = [candidate.physicalId || "temporary-glyph-measurement"];
                error.cleanupEvidence = String(cleanupFailure);
                throw error;
            }
        }
    }
    function applyVerticalPlacement(candidate, spec) {
        var value, desiredBottom, deltaY, after, residual;
        if (spec.measuredTop === null || spec.gap === null) return { applied: false, residual: null };
        value = glyphInkBounds(candidate);
        desiredBottom = spec.measuredTop + spec.gap;
        deltaY = desiredBottom - value[3];
        candidate.frame.top += deltaY;
        after = glyphInkBounds(candidate);
        residual = after[3] - desiredBottom;
        if (Math.abs(residual) > .5) throw Error("ruby-bottom-gap-unverified");
        return { applied: true, desiredBottom: desiredBottom, residual: residual, measuredTop: spec.measuredTop, gap: spec.gap, measurement: "glyph-ink-outline" };
    }

    function createCandidate(spec) {
        var path = null, frame = null;
        if (!spec) throw Error("render-spec-required");
        requiredNumber(spec.left, "candidate-left", false);
        requiredNumber(spec.top, "candidate-top", false);
        requiredNumber(spec.width, "candidate-width", true);
        requiredNumber(spec.height, "candidate-height", true);
        try {
            path = layer.pathItems.rectangle(spec.top, spec.left, spec.width, spec.height);
            path.filled = false;
            path.stroked = false;
            frame = doc.textFrames.areaText(path);
            if (!frame || frame.kind !== TextType.AREATEXT) throw Error("candidate-kind-unverified");
            if (typeof FormalAreaTextNativeOutputIdentity === "undefined") throw Error("native-output-identity-unavailable");
            FormalAreaTextNativeOutputIdentity.stamp(frame, { sourceFrameId: spec.sourceFrameId, physicalId: spec.physicalId });
            return { frame: frame, path: path, spec: spec, physicalId: spec.physicalId || "", constructedFromRectangle: true, areaTextKindVerified: true };
        } catch (e) {
            if (frame) try { frame.remove(); } catch (ignoreFrame) {}
            if (path) try { if (path.parent) path.remove(); } catch (ignorePath) {}
            throw e;
        }
    }

    function applyComposerPolicy(range, policy) {
        policy = policy || {};
        range.characterAttributes.horizontalScale = 100;
        range.characterAttributes.verticalScale = 100;
        if (finite(policy.minimumGlyphScaling)) range.paragraphAttributes.minimumGlyphScaling = policy.minimumGlyphScaling;
        if (finite(policy.desiredGlyphScaling)) range.paragraphAttributes.desiredGlyphScaling = policy.desiredGlyphScaling;
        if (finite(policy.maximumGlyphScaling)) range.paragraphAttributes.maximumGlyphScaling = policy.maximumGlyphScaling;
        if (finite(policy.minimumLetterSpacing)) range.paragraphAttributes.minimumLetterSpacing = policy.minimumLetterSpacing;
        if (finite(policy.desiredLetterSpacing)) range.paragraphAttributes.desiredLetterSpacing = policy.desiredLetterSpacing;
        if (finite(policy.maximumLetterSpacing)) range.paragraphAttributes.maximumLetterSpacing = policy.maximumLetterSpacing;
        if (finite(policy.minimumWordSpacing)) range.paragraphAttributes.minimumWordSpacing = policy.minimumWordSpacing;
        if (finite(policy.desiredWordSpacing)) range.paragraphAttributes.desiredWordSpacing = policy.desiredWordSpacing;
        if (finite(policy.maximumWordSpacing)) range.paragraphAttributes.maximumWordSpacing = policy.maximumWordSpacing;
    }

    function applyTypography(candidate, spec) {
        var frame = candidate.frame, range, appearance = spec.appearance || {}, size;
        frame.contents = text(spec.reading);
        range = frame.textRange;
        size = requiredNumber(appearance.fontSize, "candidate-font-size", true);
        range.characterAttributes.size = size;
        if (appearance.fontName) range.characterAttributes.textFont = app.textFonts.getByName(appearance.fontName);
        range.characterAttributes.tracking = 0;
        applyComposerPolicy(range, spec.composerPolicy);
        if (spec.singleCharacter && spec.composerPolicy.oneCharacterPolicy !== "center") throw Error("candidate-one-character-policy-unsupported");
        range.paragraphAttributes.justification = spec.singleCharacter ? Justification.CENTER : justificationValue(spec.composerPolicy.justification);
        range.paragraphAttributes.singleWordJustification = spec.singleCharacter ? Justification.CENTER : justificationValue(spec.composerPolicy.singleWordJustification);
        try { range.paragraphAttributes.leftIndent = 0; range.paragraphAttributes.rightIndent = 0; range.paragraphAttributes.firstLineIndent = 0; } catch (ignoreIndent) {}
        try { range.paragraphAttributes.spaceBefore = 0; range.paragraphAttributes.spaceAfter = 0; } catch (ignoreSpace) {}
        return range;
    }

    function justificationValue(name) {
        if (name === "full") return Justification.FULLJUSTIFY;
        if (name === "center") return Justification.CENTER;
        throw Error("candidate-justification-unsupported");
    }

    function observeCandidate(candidate) {
        var frame = candidate.frame, range = frame.textRange, lines = [], i, line;
        for (i = 0; i < range.lines.length; i++) {
            line = range.lines[i];
            lines.push({ start: line.start, end: line.end, contents: text(line.contents) });
        }
        var threading = FormalAreaTextNative.classifyThreading ? FormalAreaTextNative.classifyThreading(frame) : { ok: true, nonThreaded: !frame.previousFrame && !frame.nextFrame };
        return {
            horizontal: frame.orientation === TextOrientation.HORIZONTAL,
            rectangular: candidate.constructedFromRectangle === true,
            areaTextKind: frame.kind,
            threading: threading,
            nonThreaded: threading.ok && threading.nonThreaded === true,
            frameContents: text(frame.contents),
            rangeContents: text(range.contents),
            rangeStart: range.start,
            rangeEnd: range.end,
            lines: lines,
            frameLeft: readOptional(function () { return frame.left; }),
            frameTop: readOptional(function () { return frame.top; }),
            frameWidth: readOptional(function () { return frame.width; }),
            frameHeight: readOptional(function () { return frame.height; }),
            textPathLeft: readOptional(function () { return frame.textPath.left; }),
            textPathTop: readOptional(function () { return frame.textPath.top; }),
            textPathWidth: readOptional(function () { return frame.textPath.width; }),
            textPathHeight: readOptional(function () { return frame.textPath.height; }),
            fontName: readOptional(function () { return range.characterAttributes.textFont ? range.characterAttributes.textFont.name : ""; }),
            fontSize: readOptional(function () { return range.characterAttributes.size; }),
            tracking: readOptional(function () { return range.characterAttributes.tracking; }),
            horizontalScale: readOptional(function () { return range.characterAttributes.horizontalScale; }),
            verticalScale: readOptional(function () { return range.characterAttributes.verticalScale; }),
            justification: readOptional(function () { return range.paragraphAttributes.justification; }),
            singleWordJustification: readOptional(function () { return range.paragraphAttributes.singleWordJustification; }),
            minimumGlyphScaling: readOptional(function () { return range.paragraphAttributes.minimumGlyphScaling; }),
            desiredGlyphScaling: readOptional(function () { return range.paragraphAttributes.desiredGlyphScaling; }),
            maximumGlyphScaling: readOptional(function () { return range.paragraphAttributes.maximumGlyphScaling; }),
            minimumLetterSpacing: readOptional(function () { return range.paragraphAttributes.minimumLetterSpacing; }),
            desiredLetterSpacing: readOptional(function () { return range.paragraphAttributes.desiredLetterSpacing; }),
            maximumLetterSpacing: readOptional(function () { return range.paragraphAttributes.maximumLetterSpacing; })
            ,minimumWordSpacing: readOptional(function () { return range.paragraphAttributes.minimumWordSpacing; })
            ,desiredWordSpacing: readOptional(function () { return range.paragraphAttributes.desiredWordSpacing; })
            ,maximumWordSpacing: readOptional(function () { return range.paragraphAttributes.maximumWordSpacing; })
        };
    }

    function lineSetEqual(a, b) {
        var i;
        if (!a || !b || a.length !== b.length) return false;
        for (i = 0; i < a.length; i++) {
            if (a[i].start !== b[i].start || a[i].end !== b[i].end || a[i].contents !== b[i].contents) return false;
        }
        return true;
    }

    function sameOptionalNumber(a, b) {
        if (a === null || b === null) return a === b;
        return finite(a) && finite(b) && Math.abs(a - b) <= 0.01;
    }

    function sameObservation(a, b) {
        return a.frameContents === b.frameContents &&
            a.rangeContents === b.rangeContents &&
            a.rangeStart === b.rangeStart &&
            a.rangeEnd === b.rangeEnd &&
            a.lines.length === b.lines.length &&
            lineSetEqual(a.lines, b.lines) &&
            sameOptionalNumber(a.frameLeft, b.frameLeft) &&
            sameOptionalNumber(a.frameTop, b.frameTop) &&
            sameOptionalNumber(a.frameWidth, b.frameWidth) &&
            sameOptionalNumber(a.frameHeight, b.frameHeight) &&
            sameOptionalNumber(a.textPathLeft, b.textPathLeft) &&
            sameOptionalNumber(a.textPathTop, b.textPathTop) &&
            sameOptionalNumber(a.textPathWidth, b.textPathWidth) &&
            sameOptionalNumber(a.textPathHeight, b.textPathHeight) &&
            a.fontName === b.fontName &&
            sameOptionalNumber(a.fontSize, b.fontSize) &&
            sameOptionalNumber(a.tracking, b.tracking) &&
            sameOptionalNumber(a.horizontalScale, b.horizontalScale) &&
            sameOptionalNumber(a.verticalScale, b.verticalScale) &&
            a.justification === b.justification &&
            a.singleWordJustification === b.singleWordJustification;
    }

    function stableObservation(candidate) {
        var first, second;
        app.redraw();
        first = observeCandidate(candidate);
        app.redraw();
        second = observeCandidate(candidate);
        second.stable = sameObservation(first, second);
        return second;
    }

    function sameNumber(a, b) { return finite(a) && finite(b) && Math.abs(a - b) <= 0.01; }

    function sameConfiguredNumber(actual, expected) { return expected === null ? true : sameNumber(actual, expected); }

    function verifyReadback(observation, spec, expectedTracking, vertical) {
        var expectedJustification = spec.singleCharacter ? Justification.CENTER : justificationValue(spec.composerPolicy.justification), expectedSingle = spec.singleCharacter ? Justification.CENTER : justificationValue(spec.composerPolicy.singleWordJustification), observedWidth = observation.textPathWidth !== null ? observation.textPathWidth : observation.frameWidth, observedHeight = observation.textPathHeight !== null ? observation.textPathHeight : observation.frameHeight;
        if (observation.areaTextKind !== TextType.AREATEXT) return { ok: false, reason: "style-area-text-kind-mismatch", retryable: false };
        if (observation.fontName === null || (spec.appearance.fontName && observation.fontName !== spec.appearance.fontName)) return { ok: false, reason: "style-font-mismatch", retryable: false };
        if (!sameNumber(observation.fontSize, spec.appearance.fontSize)) return { ok: false, reason: "style-size-mismatch", retryable: false };
        if (!sameNumber(observation.horizontalScale, 100) || !sameNumber(observation.verticalScale, 100)) return { ok: false, reason: "style-glyph-scale-mismatch", retryable: false };
        if (observation.justification !== expectedJustification || observation.singleWordJustification !== expectedSingle) return { ok: false, reason: "style-justification-mismatch", retryable: false };
        if (!sameConfiguredNumber(observation.minimumGlyphScaling, spec.composerPolicy.minimumGlyphScaling) || !sameConfiguredNumber(observation.desiredGlyphScaling, spec.composerPolicy.desiredGlyphScaling) || !sameConfiguredNumber(observation.maximumGlyphScaling, spec.composerPolicy.maximumGlyphScaling) || !sameConfiguredNumber(observation.minimumLetterSpacing, spec.composerPolicy.minimumLetterSpacing) || !sameConfiguredNumber(observation.desiredLetterSpacing, spec.composerPolicy.desiredLetterSpacing) || !sameConfiguredNumber(observation.maximumLetterSpacing, spec.composerPolicy.maximumLetterSpacing) || !sameConfiguredNumber(observation.minimumWordSpacing, spec.composerPolicy.minimumWordSpacing) || !sameConfiguredNumber(observation.desiredWordSpacing, spec.composerPolicy.desiredWordSpacing) || !sameConfiguredNumber(observation.maximumWordSpacing, spec.composerPolicy.maximumWordSpacing)) return { ok: false, reason: "style-composer-mismatch", retryable: false };
        if (!sameNumber(observation.tracking, expectedTracking)) return { ok: false, reason: "style-tracking-mismatch", retryable: false };
        if (!sameNumber(observation.frameLeft, spec.left) || (!vertical.applied && !sameNumber(observation.frameTop, spec.top)) || !sameNumber(observedWidth, spec.width) || !sameNumber(observedHeight, spec.height)) return { ok: false, reason: "geometry-readback-mismatch", retryable: false };
        return { ok: true, reason: "readback-match", retryable: false };
    }

    function verifyCandidate(candidate, spec, expectedTracking) {
        var observation = stableObservation(candidate), fit, readback, vertical = candidate.verticalPlacement || { applied: false, residual: null }, fresh, desiredBottom;
        if (typeof FormalAreaTextNative === "undefined") throw Error("area-text-native-core-unavailable");
        expectedTracking = expectedTracking == null ? 0 : expectedTracking;
        if (vertical.applied) {
            fresh = glyphInkBounds(candidate);
            desiredBottom = spec.measuredTop + spec.gap;
            vertical.residual = fresh[3] - desiredBottom;
            if (Math.abs(vertical.residual) > .5) throw Error("ruby-bottom-gap-unverified");
        }
        readback = verifyReadback(observation, spec, expectedTracking, vertical);
        if (!readback.ok) { readback.observation = observation; return readback; }
        fit = FormalAreaTextNative.verifyOneLineFit(observation, text(spec.reading));
        return { ok: fit.ok, reason: fit.reason, retryable: fit.retryable === true, observation: observation, readback: readback, fit: fit, verticalPlacement: vertical };
    }

    function tryTracking(candidate, spec) {
        var values, i, result, range = candidate.frame.textRange;
        if (typeof FormalAreaTextNative === "undefined") throw Error("area-text-native-core-unavailable");
        if (spec.singleCharacter) return verifyCandidate(candidate, spec);
        values = (spec.composerPolicy && spec.composerPolicy.trackingCandidates) || FormalAreaTextNative.trackingCandidates();
        for (i = 0; i < values.length; i++) {
            range = candidate.frame.textRange;
            range.characterAttributes.tracking = values[i];
            result = verifyCandidate(candidate, spec, values[i]);
            if (result.ok) { result.tracking = values[i]; return result; }
            if (result.retryable === false) return result;
        }
        result.tracking = values[values.length - 1];
        return result;
    }

    function disposeCandidate(candidate) {
        var frameRemoved = false, pathRemoved = false, pathAlreadyGone = false, cleanupFailed = false;
        if (!candidate) return { frameRemoved: false, pathRemoved: false, pathAlreadyGone: true, cleanupFailed: false };
        try { if (candidate.frame && candidate.frame.parent) { candidate.frame.remove(); frameRemoved = true; } } catch (ignoreFrame) { cleanupFailed = true; }
        if (!frameRemoved) return { frameRemoved: false, pathRemoved: false, pathAlreadyGone: true, cleanupFailed: cleanupFailed };
        /* areaText(path) consumes the path; after frame removal a stale path ref is not owned. */
        try { pathAlreadyGone = !candidate.path || !candidate.path.parent; } catch (ignorePathState) { pathAlreadyGone = true; }
        return { frameRemoved: true, pathRemoved: false, pathAlreadyGone: pathAlreadyGone, cleanupFailed: cleanupFailed };
    }

    function prepareCandidate(spec) {
        var candidate = createCandidate(spec);
        try {
            applyTypography(candidate, spec);
            candidate.verticalPlacement = applyVerticalPlacement(candidate, spec);
            return candidate;
        } catch (e) {
            disposeCandidate(candidate);
            throw e;
        }
    }

    return {
        prepareCandidate: prepareCandidate,
        applyTypography: applyTypography,
        applyComposerPolicy: applyComposerPolicy,
        observeCandidate: observeCandidate,
        verifyCandidate: verifyCandidate,
        tryTracking: tryTracking,
        disposeCandidate: disposeCandidate
    };
}
