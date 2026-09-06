/* Conservative bridge from Illustrator TextRange selection to plain indices. */
var FormalMultiSelectionAdapter = (function () {
    function fail(message) { throw Error(message); }
    function storyFrame(selected) {
        var frames = selected.story && selected.story.textFrames, matches = [], i, frame, range;
        if(!frames || typeof frames.length !== "number" || !frames.length) fail("text-range-source-unavailable");
        for(i=0;i<frames.length;i++) {
            frame=frames[i];
            range=frame.textRange;
            if(frame.typename === "TextFrame" && range && selected.start >= range.start && selected.end <= range.start + String(frame.contents).length) matches.push(frame);
        }
        if(matches.length === 1) return matches[0];
        if(frames.length === 1 && frames[0].typename === "TextFrame") return frames[0];
        fail("threaded-text-not-supported");
    }
    function resolve(selection, TextTypeRef, TextOrientationRef) {
        var selected, source, range, start, end;
        if(!selection)fail("single-text-selection-required");
        if(selection.typename === "TextRange") selected=selection;
        else { if(selection.length!==1)fail("single-text-selection-required"); selected=selection[0]; }
        if(selected.typename!=="TextRange")fail("text-range-selection-required");
        source=selected.parent;
        if(!source||source.typename!=="TextFrame") source=storyFrame(selected);
        if(!source||source.typename!=="TextFrame")fail("text-range-source-unavailable");
        if(source.kind!==TextTypeRef.AREATEXT||source.orientation!==TextOrientationRef.HORIZONTAL)fail("area-text-horizontal-only");
        range=source.textRange;
        start=selected.start-range.start; end=selected.end-range.start;
        if(typeof start!=="number"||typeof end!=="number"||!isFinite(start)||!isFinite(end)||Math.floor(start)!==start||Math.floor(end)!==end||start<0||end<=start||end>String(source.contents).length)fail("invalid-text-selection");
        return {sourceFrame:source,start:start,end:end,text:String(source.contents).substring(start,end)};
    }
    function validateSourceFrame(candidate, TextTypeRef, TextOrientationRef) {
        var kind, text;
        if (!candidate || candidate.typename !== "TextFrame") fail("single-text-frame-selection-required");
        if (candidate.orientation!==TextOrientationRef.HORIZONTAL) fail("text-frame-vertical-unsupported");
        kind=candidate.kind;
        if (kind!==TextTypeRef.AREATEXT && kind!==TextTypeRef.POINTTEXT) fail("text-frame-kind-unsupported");
        text=String(candidate.contents);
        return {sourceFrame:candidate,text:text};
    }
    function trySourceFrameStrategy(name, getter, TextTypeRef, TextOrientationRef, diagnostics) {
        try {
            var result=validateSourceFrame(getter(), TextTypeRef, TextOrientationRef);
            result.strategy=name;
            diagnostics.push(name + ": success");
            return result;
        } catch(error) {
            diagnostics.push(name + ": " + (error.message || error));
            return null;
        }
    }
    function resolveFrame(selection, TextTypeRef, TextOrientationRef) {
        var diagnostics=[], result;
        result=trySourceFrameStrategy("A-direct-selection", function () {
            if (selection && selection.typename === "TextFrame") return selection;
            fail("selection-is-not-text-frame");
        }, TextTypeRef, TextOrientationRef, diagnostics);
        if(result)return result;
        result=trySourceFrameStrategy("B-selection-array-first", function () {
            if (!selection || typeof selection.length !== "number" || selection.length !== 1) fail("single-text-frame-selection-required");
            if (!selection[0] || selection[0].typename !== "TextFrame") fail("selection-item-is-not-text-frame");
            return selection[0];
        }, TextTypeRef, TextOrientationRef, diagnostics);
        if(result)return result;
        result=trySourceFrameStrategy("C-text-range-parent", function () {
            var selected=selection;
            if (selection && typeof selection.length === "number") {
                if(selection.length!==1) fail("single-text-frame-selection-required");
                selected=selection[0];
            }
            if(!selected || selected.typename!=="TextRange" || !selected.parent) fail("text-range-parent-unavailable");
            return selected.parent;
        }, TextTypeRef, TextOrientationRef, diagnostics);
        if(result)return result;
        result=trySourceFrameStrategy("D-text-range-story-frame", function () {
            var selected=selection;
            if (selection && typeof selection.length === "number") {
                if(selection.length!==1) fail("single-text-frame-selection-required");
                selected=selection[0];
            }
            if(!selected || selected.typename!=="TextRange") fail("text-range-selection-required");
            return storyFrame(selected);
        }, TextTypeRef, TextOrientationRef, diagnostics);
        if(result)return result;
        fail("source-frame-resolution-failed: " + diagnostics.join(" | "));
    }
    return {resolve:resolve,resolveFrame:resolveFrame};
}());
if(typeof module!=="undefined")module.exports=FormalMultiSelectionAdapter;
