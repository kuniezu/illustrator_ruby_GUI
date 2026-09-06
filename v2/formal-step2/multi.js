/* Pure frame-level model for the later multi-annotation workflow. */
var FormalMulti = (function () {
    function fail(message) { throw Error(message); }
    function number(value) { return typeof value === "number" && isFinite(value); }
    function copyHint(h) { return {baseBoundaryAfter:h.baseBoundaryAfter,readingBoundaryAfter:h.readingBoundaryAfter,baseText:h.baseText,reading:h.reading,baseRevision:h.baseRevision,readingRevision:h.readingRevision}; }
    function copyAnnotation(a) {
        var h = a.anchor;
        return {annotationId:a.annotationId,sourceFrameId:a.sourceFrameId,anchor:{baseText:h.baseText,startHint:h.startHint,beforeContext:h.beforeContext,afterContext:h.afterContext},reading:a.reading,enabled:a.enabled,placementMode:a.placementMode,reviewReasons:a.reviewReasons.slice(0),readingConfirmed:a.readingConfirmed,style:{sizeRatio:a.style.sizeRatio,gapRatio:a.style.gapRatio},offset:{inlineEm:a.offset.inlineEm,blockEm:a.offset.blockEm},splitHints:(a.splitHints || []).map(copyHint)};
    }
    function validateAnnotation(bundle, annotation) {
        FormalStep1.validate({schemaVersion:1,revision:bundle.revision,sourceFrameId:bundle.sourceFrameId,textSnapshot:bundle.textSnapshot,renderStatus:bundle.renderStatus,annotation:annotation});
        if (!annotation.splitHints || !(annotation.splitHints instanceof Array)) fail("invalid-multi-split-hints");
        for (var i=0;i<annotation.splitHints.length;i++) {
            var h=annotation.splitHints[i];
            if (!number(h.baseBoundaryAfter)||!number(h.readingBoundaryAfter)||h.baseBoundaryAfter<=0||h.readingBoundaryAfter<=0||h.baseBoundaryAfter>=annotation.anchor.baseText.length||h.readingBoundaryAfter>=annotation.reading.length||h.baseText!==annotation.anchor.baseText||h.reading!==annotation.reading||!number(h.baseRevision)||h.baseRevision<0||!number(h.readingRevision)||h.readingRevision<0) fail("invalid-multi-split-hint");
        }
    }
    function validate(bundle) {
        if (!bundle||bundle.schemaVersion!==1||!number(bundle.revision)||bundle.revision<0||typeof bundle.sourceFrameId!=="string"||typeof bundle.textSnapshot!=="string"||!/^(complete|pending|unresolved|failed)$/.test(bundle.renderStatus)||!(bundle.annotations instanceof Array)||!bundle.annotations.length) fail("invalid-multi-bundle");
        var seen={};
        for (var i=0;i<bundle.annotations.length;i++) {
            var a=bundle.annotations[i];
            if (seen[a.annotationId]) fail("duplicate-multi-annotation-id");
            seen[a.annotationId]=true;
            if (a.sourceFrameId!==bundle.sourceFrameId) fail("multi-source-frame-mismatch");
            validateAnnotation(bundle,a);
        }
        return bundle;
    }
    function create(text) { var one=FormalStep1.create(String(text)); var a=copyAnnotation(one.annotation); a.splitHints=[]; return validate({schemaVersion:1,revision:0,sourceFrameId:one.sourceFrameId,textSnapshot:one.textSnapshot,renderStatus:"unresolved",annotations:[a]}); }
    function clone(bundle) { validate(bundle); var annotations=[]; for(var i=0;i<bundle.annotations.length;i++) annotations.push(copyAnnotation(bundle.annotations[i])); return validate({schemaVersion:bundle.schemaVersion,revision:bundle.revision,sourceFrameId:bundle.sourceFrameId,textSnapshot:bundle.textSnapshot,renderStatus:bundle.renderStatus,annotations:annotations}); }
    function add(bundle, annotation) { var next=clone(bundle); var a=copyAnnotation(annotation); next.annotations.push(a); return validate(next); }
    function update(bundle, annotationId, edit) { var next=clone(bundle), found=false; for(var i=0;i<next.annotations.length;i++) if(next.annotations[i].annotationId===annotationId){for(var key in edit) if(edit.hasOwnProperty(key)&&key!=="annotationId"&&key!=="sourceFrameId") next.annotations[i][key]=key==="splitHints"?(edit[key]||[]).map(copyHint):edit[key]; found=true; break;} if(!found) fail("multi-annotation-missing"); return validate(next); }
    return {create:create,validate:validate,clone:clone,add:add,update:update};
}());
if(typeof module!=="undefined")module.exports=FormalMulti;
