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
            frame = layer.textFrames.areaText(path);
            return { frame: frame, path: path, spec: spec, physicalId: spec.physicalId || "" };
        } catch (e) {
            if (frame) try { frame.remove(); } catch (ignoreFrame) {}
            if (path) try { if (path.parent) path.remove(); } catch (ignorePath) {}
            throw e;
        }
    }

    function applyComposerPolicy(range, policy) {
        policy = policy || {};
        try { range.characterAttributes.horizontalScale = 100; } catch (ignoreHorizontalScale) {}
        try { range.characterAttributes.verticalScale = 100; } catch (ignoreVerticalScale) {}
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
        range.paragraphAttributes.justification = spec.singleCharacter ? Justification.CENTER : Justification.FULLJUSTIFY;
        try { range.paragraphAttributes.singleWordJustification = spec.singleCharacter ? Justification.CENTER : Justification.FULLJUSTIFY; } catch (ignoreSingleWord) {}
        try { range.paragraphAttributes.leftIndent = 0; range.paragraphAttributes.rightIndent = 0; range.paragraphAttributes.firstLineIndent = 0; } catch (ignoreIndent) {}
        try { range.paragraphAttributes.spaceBefore = 0; range.paragraphAttributes.spaceAfter = 0; } catch (ignoreSpace) {}
        return range;
    }

    function observeCandidate(candidate) {
        var frame = candidate.frame, range = frame.textRange, lines = [], i, line;
        for (i = 0; i < range.lines.length; i++) {
            line = range.lines[i];
            lines.push({ start: line.start, end: line.end, contents: text(line.contents) });
        }
        return {
            horizontal: frame.orientation === TextOrientation.HORIZONTAL,
            rectangular: true,
            nonThreaded: !frame.previousFrame && !frame.nextFrame,
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

    function verifyCandidate(candidate, spec) {
        var observation = stableObservation(candidate), fit;
        if (typeof FormalAreaTextNative === "undefined") throw Error("area-text-native-core-unavailable");
        fit = FormalAreaTextNative.verifyOneLineFit(observation, text(spec.reading));
        return { ok: fit.ok, reason: fit.reason, observation: observation, fit: fit };
    }

    function tryTracking(candidate, spec) {
        var values, i, result, range = candidate.frame.textRange;
        if (typeof FormalAreaTextNative === "undefined") throw Error("area-text-native-core-unavailable");
        if (spec.singleCharacter) return verifyCandidate(candidate, spec);
        values = FormalAreaTextNative.trackingCandidates();
        for (i = 0; i < values.length; i++) {
            range = candidate.frame.textRange;
            range.characterAttributes.tracking = values[i];
            result = verifyCandidate(candidate, spec);
            if (result.ok) { result.tracking = values[i]; return result; }
        }
        result.tracking = values[values.length - 1];
        return result;
    }

    function disposeCandidate(candidate) {
        var frameRemoved = false, pathRemoved = false;
        if (!candidate) return { frameRemoved: false, pathRemoved: false };
        try { if (candidate.frame && candidate.frame.parent) { candidate.frame.remove(); frameRemoved = true; } } catch (ignoreFrame) {}
        try { if (candidate.path && candidate.path.parent) { candidate.path.remove(); pathRemoved = true; } } catch (ignorePath) {}
        return { frameRemoved: frameRemoved, pathRemoved: pathRemoved };
    }

    function prepareCandidate(spec) {
        var candidate = createCandidate(spec);
        try {
            applyTypography(candidate, spec);
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
