/* Pure Annotation-level planning; observation and rendering stay outside. */
var FormalMultiOrchestration = (function () {
    function unresolved(id, reasons) { return {annotationId:id,status:"unresolved",reasons:reasons}; }
    function find(bundle, annotationId) { for(var i=0;i<bundle.annotations.length;i++) if(bundle.annotations[i].annotationId===annotationId)return bundle.annotations[i]; return null; }
    function localLines(baseStart, baseLength, lines) { var out=[], expected=0, i, start, end; for(i=0;i<lines.length;i++){start=Math.max(baseStart,lines[i].start)-baseStart;end=Math.min(baseStart+baseLength,lines[i].end)-baseStart;if(end>start){if(start!==expected)return null;out.push({start:start,end:end,geometry:lines[i].geometry});expected=end;}} return expected===baseLength?out:null; }
    function planOne(bundle, annotationId, sourceText, observation) {
        var annotation=find(bundle,annotationId), resolved, lineMap, decision;
        if(!annotation)return {annotationId:annotationId,status:"failed",reasons:["multi-annotation-missing"]};
        if(!observation||observation.status==="failed")return {annotationId:annotationId,status:"failed",reasons:(observation&&observation.reasons)||["observation-failed"]};
        if(observation.status!=="complete")return unresolved(annotationId,(observation&&observation.reasons)||["observation-unavailable"]);
        resolved=FormalStep1.resolve(sourceText,bundle.textSnapshot,annotation);
        if(resolved.status!=="complete")return unresolved(annotationId,resolved.reasons);
        lineMap=localLines(resolved.start,annotation.anchor.baseText.length,observation.lines||[]);
        if(!lineMap)return unresolved(annotationId,["annotation-line-intersection-unavailable"]);
        decision=FormalSegments.plan(annotation.anchor.baseText,annotation.reading,lineMap,annotation.splitHints||[],bundle.revision,bundle.revision);
        return {annotationId:annotationId,status:decision.status,sourceStart:resolved.start,sourceEnd:resolved.start+annotation.anchor.baseText.length,decision:decision,reasons:decision.reasons||[]};
    }
    function planAll(bundle, sourceText, observation) { var results=[],i,hasFailed=false,hasUnresolved=false; FormalMulti.validate(bundle); for(i=0;i<bundle.annotations.length;i++){results.push(planOne(bundle,bundle.annotations[i].annotationId,sourceText,observation));if(results[i].status==="failed")hasFailed=true;else if(results[i].status!=="complete")hasUnresolved=true;} return {status:hasFailed?"failed":(hasUnresolved?"unresolved":"complete"),results:results}; }
    return {planOne:planOne,planAll:planAll,localLines:localLines};
}());
if(typeof module!=="undefined")module.exports=FormalMultiOrchestration;
