/* Exploratory ruby appearance state. DOM application remains adapter-owned. */
var FormalAppearance = (function () {
    function finite(value) { return typeof value === "number" && isFinite(value); }
    function defaults(baseSize, sourceFontName) {
        return {fontName: typeof sourceFontName === "string" ? sourceFontName : "", fontSize: finite(baseSize) && baseSize > 0 ? baseSize * .5 : null, manualDeltaX: 0, widthScale: 1, gapEm: .15};
    }
    function normalize(state, baseSize, sourceFontName) {
        var out = defaults(baseSize, sourceFontName), value;
        if (!state) return out;
        if (typeof state.fontName === "string" && state.fontName.length) out.fontName = state.fontName;
        value = state.fontSize; if (finite(value) && value > 0) out.fontSize = value;
        value = state.manualDeltaX; if (finite(value)) out.manualDeltaX = value;
        value = state.widthScale; if (finite(value) && value > 0) out.widthScale = value;
        value = state.gapEm; if (finite(value) && value >= 0) out.gapEm = value;
        return out;
    }
    function reapply(autoLeft, autoWidth, state, baseSize, sourceFontName) {
        var appearance = normalize(state, baseSize, sourceFontName);
        return {left: autoLeft + appearance.manualDeltaX, width: autoWidth * appearance.widthScale, appearance: appearance};
    }
    function captureAdjustment(actualLeft, actualWidth, autoLeft, autoWidth, state, baseSize, sourceFontName) {
        var appearance = normalize(state, baseSize, sourceFontName);
        if (finite(actualLeft) && finite(autoLeft)) appearance.manualDeltaX = actualLeft - autoLeft;
        if (finite(actualWidth) && finite(autoWidth) && autoWidth > 0) appearance.widthScale = actualWidth / autoWidth;
        return appearance;
    }
    return {defaults: defaults, normalize: normalize, reapply: reapply, captureAdjustment: captureAdjustment};
}());
if (typeof module !== "undefined") module.exports = FormalAppearance;
