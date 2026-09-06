/* Conservative bridge from Illustrator TextRange selection to plain indices. */
var FormalMultiSelectionAdapter = (function () {
    function fail(message) { throw Error(message); }
    function resolve(selection, TextTypeRef, TextOrientationRef) {
        var selected, source, range, start, end;
        if(!selection||selection.length!==1)fail("single-text-selection-required");
        selected=selection[0];
        if(selected.typename!=="TextRange")fail("text-range-selection-required");
        source=selected.parent;
        if(!source||source.typename!=="TextFrame")fail("text-range-source-unavailable");
        if(source.kind!==TextTypeRef.AREATEXT||source.orientation!==TextOrientationRef.HORIZONTAL)fail("area-text-horizontal-only");
        range=source.textRange;
        start=selected.start-range.start; end=selected.end-range.start;
        if(typeof start!=="number"||typeof end!=="number"||!isFinite(start)||!isFinite(end)||Math.floor(start)!==start||Math.floor(end)!==end||start<0||end<=start||end>String(source.contents).length)fail("invalid-text-selection");
        return {sourceFrame:source,start:start,end:end,text:String(source.contents).substring(start,end)};
    }
    return {resolve:resolve};
}());
if(typeof module!=="undefined")module.exports=FormalMultiSelectionAdapter;
