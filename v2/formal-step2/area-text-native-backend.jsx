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

    function applyTypography(candidate, spec) {
        var frame = candidate.frame, range, appearance = spec.appearance || {}, size;
        frame.contents = text(spec.reading);
        range = frame.textRange;
        size = requiredNumber(appearance.fontSize, "candidate-font-size", true);
        range.characterAttributes.size = size;
        if (appearance.fontName) range.characterAttributes.textFont = app.textFonts.getByName(appearance.fontName);
        range.characterAttributes.tracking = 0;
        try { range.characterAttributes.horizontalScale = 100; } catch (ignoreHorizontalScale) {}
        try { range.characterAttributes.verticalScale = 100; } catch (ignoreVerticalScale) {}
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
            frameLeft: frame.left,
            frameTop: frame.top,
            frameWidth: frame.width,
            frameHeight: frame.height,
            textPathLeft: frame.textPath.left,
            textPathTop: frame.textPath.top,
            textPathWidth: frame.textPath.width,
            textPathHeight: frame.textPath.height,
            fontName: range.characterAttributes.textFont ? range.characterAttributes.textFont.name : "",
            fontSize: range.characterAttributes.size,
            tracking: range.characterAttributes.tracking,
            horizontalScale: range.characterAttributes.horizontalScale,
            verticalScale: range.characterAttributes.verticalScale,
            justification: range.paragraphAttributes.justification,
            singleWordJustification: range.paragraphAttributes.singleWordJustification
        };
    }

    function stableObservation(candidate) {
        var first, second;
        app.redraw();
        first = observeCandidate(candidate);
        app.redraw();
        second = observeCandidate(candidate);
        second.stable = first.frameContents === second.frameContents &&
            first.rangeContents === second.rangeContents &&
            first.rangeStart === second.rangeStart &&
            first.rangeEnd === second.rangeEnd &&
            first.lines.length === second.lines.length &&
            lineSetEqual(first.lines, second.lines);
        return second;
    }

    function lineSetEqual(a, b) {
        var i;
        if (!a || !b || a.length !== b.length) return false;
        for (i = 0; i < a.length; i++) {
            if (a[i].start !== b[i].start || a[i].end !== b[i].end || a[i].contents !== b[i].contents) return false;
        }
        return true;
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
        observeCandidate: observeCandidate,
        verifyCandidate: verifyCandidate,
        tryTracking: tryTracking,
        disposeCandidate: disposeCandidate
    };
}
