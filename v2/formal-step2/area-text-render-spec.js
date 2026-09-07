/* Serializable AreaText-native RenderSpec. Pure data only; no Illustrator DOM values. */
var FormalAreaTextRenderSpec = (function () {
    var SCHEMA = "formal-area-text-render-spec:v1";
    var RENDERER_VERSION = "area-text-native-v1";
    var GEOMETRY_VERSION = "area-text-rectangle-v1";

    function finite(value) { return typeof value === "number" && isFinite(value); }
    function string(value) { return value == null ? "" : String(value); }
    function number(value, name, positive) {
        if (!finite(value) || (positive && value <= 0)) throw Error(name + "-invalid");
        return value;
    }
    function copyArray(values) {
        var out = [], i;
        values = values || [];
        for (i = 0; i < values.length; i++) out.push(values[i]);
        return out;
    }
    function validPolicyValue(value, allowed) {
        var i;
        if (typeof value !== "string") return false;
        for (i = 0; i < allowed.length; i++) if (value === allowed[i]) return true;
        return false;
    }
    function validOptionalNumber(value) { return value === null || finite(value); }
    function validComposer(policy) {
        var i, values;
        if (!policy || typeof policy !== "object") return "render-spec-composer-policy";
        if (!validPolicyValue(policy.justification, ["full", "center"])) return "render-spec-justification";
        if (!validPolicyValue(policy.singleWordJustification, ["full", "center"])) return "render-spec-single-word-justification";
        if (!validPolicyValue(policy.oneCharacterPolicy, ["center"])) return "render-spec-one-character-policy";
        if (!policy.glyphScaling || !finite(policy.glyphScaling.minimum) || !finite(policy.glyphScaling.desired) || !finite(policy.glyphScaling.maximum)) return "render-spec-glyph-scaling";
        if (!policy.letterSpacing || !validOptionalNumber(policy.letterSpacing.minimum) || !validOptionalNumber(policy.letterSpacing.desired) || !validOptionalNumber(policy.letterSpacing.maximum)) return "render-spec-letter-spacing";
        if (!policy.wordSpacing || !validOptionalNumber(policy.wordSpacing.minimum) || !validOptionalNumber(policy.wordSpacing.desired) || !validOptionalNumber(policy.wordSpacing.maximum)) return "render-spec-word-spacing";
        values = policy.trackingCandidates;
        if (!values || typeof values.length !== "number" || values.length === 0) return "render-spec-tracking-candidates";
        for (i = 0; i < values.length; i++) if (!finite(values[i]) || values[i] < -100 || values[i] > 0) return "render-spec-tracking-candidate-range";
        return null;
    }
    function copyComposer(policy) {
        policy = policy || {};
        if (policy.justification != null && policy.justification !== "full" && policy.justification !== "center") throw Error("render-spec-justification-unsupported");
        if (policy.singleWordJustification != null && policy.singleWordJustification !== "full" && policy.singleWordJustification !== "center") throw Error("render-spec-single-word-justification-unsupported");
        if (policy.oneCharacterPolicy != null && policy.oneCharacterPolicy !== "center") throw Error("render-spec-one-character-policy-unsupported");
        return {
            justification: policy.justification || "full",
            singleWordJustification: policy.singleWordJustification || "full",
            oneCharacterPolicy: policy.oneCharacterPolicy || "center",
            glyphScaling: {
                minimum: finite(policy.minimumGlyphScaling) ? policy.minimumGlyphScaling : 100,
                desired: finite(policy.desiredGlyphScaling) ? policy.desiredGlyphScaling : 100,
                maximum: finite(policy.maximumGlyphScaling) ? policy.maximumGlyphScaling : 100
            },
            letterSpacing: {
                minimum: finite(policy.minimumLetterSpacing) ? policy.minimumLetterSpacing : null,
                desired: finite(policy.desiredLetterSpacing) ? policy.desiredLetterSpacing : null,
                maximum: finite(policy.maximumLetterSpacing) ? policy.maximumLetterSpacing : null
            },
            wordSpacing: {
                minimum: finite(policy.minimumWordSpacing) ? policy.minimumWordSpacing : null,
                desired: finite(policy.desiredWordSpacing) ? policy.desiredWordSpacing : null,
                maximum: finite(policy.maximumWordSpacing) ? policy.maximumWordSpacing : null
            },
            trackingCandidates: copyArray(policy.trackingCandidates || [0, -25, -50, -75, -100])
        };
    }

    function create(input) {
        var appearance, geometry, meta, reading, spec;
        if (!input) throw Error("render-spec-input-required");
        appearance = input.appearance || {};
        geometry = input.geometry || {};
        meta = input.meta || {};
        reading = string(input.reading);
        if (!reading) throw Error("render-spec-reading-required");
        spec = {
            schema: SCHEMA,
            rendererMode: "area-text-native",
            rendererVersion: meta.rendererVersion || RENDERER_VERSION,
            geometryVersion: meta.geometryVersion || GEOMETRY_VERSION,
            requestId: string(meta.requestId),
            sourceFrameId: string(input.sourceFrameId),
            annotationId: string(input.annotationId),
            logicalSegmentId: string(input.logicalSegmentId),
            generationId: string(meta.generationId),
            physicalId: string(meta.physicalId),
            reading: reading,
            singleCharacter: reading.length === 1,
            appearance: {
                fontName: string(appearance.fontName),
                fontSize: number(appearance.fontSize, "render-spec-font-size", true),
                manualDeltaX: finite(appearance.manualDeltaX) ? appearance.manualDeltaX : 0,
                widthScale: finite(appearance.widthScale) && appearance.widthScale > 0 ? appearance.widthScale : 1,
                gapEm: finite(appearance.gapEm) && appearance.gapEm >= 0 ? appearance.gapEm : .15
            },
            geometry: {
                autoLeft: number(geometry.autoLeft, "render-spec-auto-left", false),
                autoTop: number(geometry.autoTop, "render-spec-auto-top", false),
                autoWidth: number(geometry.autoWidth, "render-spec-auto-width", true),
                boxHeight: number(geometry.boxHeight, "render-spec-box-height", true)
            },
            composerPolicy: copyComposer(input.composerPolicy)
        };
        spec.finalLeft = spec.geometry.autoLeft + spec.appearance.manualDeltaX;
        spec.finalTop = spec.geometry.autoTop;
        spec.finalWidth = spec.geometry.autoWidth * spec.appearance.widthScale;
        spec.finalHeight = spec.geometry.boxHeight;
        if (!spec.sourceFrameId || !spec.annotationId || !spec.logicalSegmentId || !spec.requestId || !spec.generationId || !spec.physicalId) throw Error("render-spec-identity-required");
        return spec;
    }

    function validate(spec) {
        var composerError;
        if (!spec || spec.schema !== SCHEMA) return {ok:false,reason:"render-spec-schema"};
        if (spec.rendererMode !== "area-text-native") return {ok:false,reason:"render-spec-renderer-mode"};
        if (!spec.requestId || !spec.sourceFrameId || !spec.annotationId || !spec.logicalSegmentId || !spec.generationId || !spec.physicalId) return {ok:false,reason:"render-spec-identity"};
        if (!spec.reading) return {ok:false,reason:"render-spec-reading"};
        if (typeof spec.singleCharacter !== "boolean" || spec.singleCharacter !== (String(spec.reading).length === 1)) return {ok:false,reason:"render-spec-single-character"};
        if (!spec.appearance || typeof spec.appearance.fontName !== "string" || !spec.appearance.fontName || !finite(spec.appearance.fontSize) || spec.appearance.fontSize <= 0 || !finite(spec.appearance.manualDeltaX) || !finite(spec.appearance.widthScale) || spec.appearance.widthScale <= 0 || !finite(spec.appearance.gapEm) || spec.appearance.gapEm < 0) return {ok:false,reason:"render-spec-appearance"};
        if (!finite(spec.finalLeft) || !finite(spec.finalTop) || !finite(spec.finalWidth) || spec.finalWidth <= 0 || !finite(spec.finalHeight) || spec.finalHeight <= 0) return {ok:false,reason:"render-spec-geometry"};
        composerError = validComposer(spec.composerPolicy);
        if (composerError) return {ok:false,reason:composerError};
        return {ok:true,reason:"render-spec-valid"};
    }

    function backendSpec(spec) {
        var result = validate(spec);
        if (!result.ok) throw Error(result.reason);
        return {
            physicalId: spec.physicalId,
            reading: spec.reading,
            singleCharacter: spec.singleCharacter,
            left: spec.finalLeft,
            top: spec.finalTop,
            width: spec.finalWidth,
            height: spec.finalHeight,
            appearance: {
                fontName: spec.appearance.fontName,
                fontSize: spec.appearance.fontSize
            },
            composerPolicy: {
                minimumGlyphScaling: spec.composerPolicy.glyphScaling.minimum,
                desiredGlyphScaling: spec.composerPolicy.glyphScaling.desired,
                maximumGlyphScaling: spec.composerPolicy.glyphScaling.maximum,
                minimumLetterSpacing: spec.composerPolicy.letterSpacing.minimum,
                desiredLetterSpacing: spec.composerPolicy.letterSpacing.desired,
                maximumLetterSpacing: spec.composerPolicy.letterSpacing.maximum,
                minimumWordSpacing: spec.composerPolicy.wordSpacing.minimum,
                desiredWordSpacing: spec.composerPolicy.wordSpacing.desired,
                maximumWordSpacing: spec.composerPolicy.wordSpacing.maximum,
                trackingCandidates: copyArray(spec.composerPolicy.trackingCandidates),
                oneCharacterPolicy: spec.composerPolicy.oneCharacterPolicy,
                justification: spec.composerPolicy.justification,
                singleWordJustification: spec.composerPolicy.singleWordJustification
            }
        };
    }

    return {
        SCHEMA: SCHEMA,
        RENDERER_VERSION: RENDERER_VERSION,
        GEOMETRY_VERSION: GEOMETRY_VERSION,
        create: create,
        validate: validate,
        backendSpec: backendSpec
    };
}());
if (typeof module !== "undefined") module.exports = FormalAreaTextRenderSpec;
