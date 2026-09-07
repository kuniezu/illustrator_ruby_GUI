/* Pure Annotation-level planning; observation and rendering stay outside. */
var FormalMultiOrchestration = (function () {
    function unresolved(id, reasons) { return {annotationId:id,status:"unresolved",reasons:reasons}; }
    function hasRenderableSuffix(text, start, end) { var source=String(text),i,code; for(i=Math.max(0,start);i<Math.min(source.length,end);i++){code=source.charCodeAt(i);if(code!==0x0d&&code!==0x0a&&code!==0x2028&&code!==0x2029)return true;} return false; }
    function textualVisibleEnd(lines, baseStart) { var result=0,i,end; for(i=0;i<(lines||[]).length;i++){end=lines[i].end-baseStart;if(end>result)result=end;} return result; }
    function sourceCoordinateContract(rangeStart, rangeEnd, rangeContents, sourceContents) { var span; if(typeof rangeStart!=="number"||!isFinite(rangeStart)||Math.floor(rangeStart)!==rangeStart||typeof rangeEnd!=="number"||!isFinite(rangeEnd)||Math.floor(rangeEnd)!==rangeEnd)return false;span=rangeEnd-rangeStart;return span>=0&&span===String(sourceContents).length&&String(rangeContents)===String(sourceContents); }
    function authoritativeVisibleEnd(observation, sourceLength) { var evidence=observation&&observation.overflowEvidence, visibleEnd, sourceEnd; if(!observation||observation.overflow!==true||!evidence||evidence.suffixHasText!==true)return null; visibleEnd=evidence.visibleEnd;sourceEnd=evidence.sourceEnd;if(typeof visibleEnd!=="number"||!isFinite(visibleEnd)||Math.floor(visibleEnd)!==visibleEnd||typeof sourceEnd!=="number"||!isFinite(sourceEnd)||Math.floor(sourceEnd)!==sourceEnd||sourceEnd!==sourceLength||visibleEnd<0||visibleEnd>=sourceEnd)return null;return visibleEnd; }
    function find(bundle, annotationId) { for(var i=0;i<bundle.annotations.length;i++) if(bundle.annotations[i].annotationId===annotationId)return bundle.annotations[i]; return null; }
    function slicedGeometry(geometry, offset, length) {
        var widths=geometry&&geometry.charWidths, prefix=0, width=0, i, result;
        if (!widths || widths.length < offset + length) return geometry;
        for (i=0;i<offset;i++) prefix += widths[i];
        for (i=offset;i<offset+length;i++) width += widths[i];
        result={left:geometry.left+prefix,top:geometry.top,width:width,baseSize:geometry.baseSize,measuredTop:geometry.measuredTop,leading:geometry.leading,gap:geometry.gap,visualRight:geometry.visualRight};
        result.measuredLeft=result.left; result.measuredWidth=width; return result;
    }
    function localLines(baseStart, baseLength, lines) { var out=[], expected=0, i, start, end, overlapStart, overlapEnd; for(i=0;i<lines.length;i++){overlapStart=Math.max(baseStart,lines[i].start);overlapEnd=Math.min(baseStart+baseLength,lines[i].end);if(overlapEnd>overlapStart){start=overlapStart-baseStart;end=overlapEnd-baseStart;if(start!==expected)return null;out.push({start:start,end:end,geometry:slicedGeometry(lines[i].geometry,overlapStart-lines[i].start,overlapEnd-overlapStart)});expected=end;}} return expected===baseLength?out:null; }
    function planOne(bundle, annotationId, sourceText, observation) {
        var annotation=find(bundle,annotationId), resolved, lineMap, decision, reasons=[], visibleEnd;
        if(!annotation)return {annotationId:annotationId,status:"failed",reasons:["multi-annotation-missing"]};
        if(!annotation.enabled)return {annotationId:annotationId,status:"complete",decision:{status:"complete",segments:[]},suppressed:true,reasons:[]};
        if(!annotation.readingConfirmed||!annotation.reading)reasons.push("reading-unconfirmed");
        if(annotation.placementMode==="manual")reasons.push("manual-placement");
        resolved=FormalStep1.resolve(sourceText,bundle.textSnapshot,annotation);
        if(resolved.status!=="complete")reasons=reasons.concat(resolved.reasons);
        if(!observation||observation.status==="failed")return {annotationId:annotationId,status:"failed",reasons:(observation&&observation.reasons||["observation-failed"]).concat(reasons)};
        if(observation.status!=="complete")return unresolved(annotationId,(observation.reasons||["observation-unavailable"]).concat(reasons));
        if(reasons.length)return unresolved(annotationId,reasons);
        lineMap=localLines(resolved.start,annotation.anchor.baseText.length,observation.lines||[]);
        if(!lineMap){
            visibleEnd=authoritativeVisibleEnd(observation,String(sourceText).length);
            if(visibleEnd!==null && resolved.start>=visibleEnd) return {annotationId:annotationId,status:"hidden",outcome:"hidden-confirmed",sourceStart:resolved.start,sourceEnd:resolved.start+annotation.anchor.baseText.length,decision:{status:"complete",segments:[]},reasons:["source-overset-hidden"]};
            return unresolved(annotationId,["annotation-line-intersection-unavailable"]);
        }
        decision=FormalSegments.plan(annotation.anchor.baseText,annotation.reading,lineMap,annotation.splitHints||[],bundle.revision,bundle.revision);
        return {annotationId:annotationId,status:decision.status,sourceStart:resolved.start,sourceEnd:resolved.start+annotation.anchor.baseText.length,decision:decision,reasons:decision.reasons||[]};
    }
    function planAll(bundle, sourceText, observation) { var results=[],i,hasFailed=false,hasUnresolved=false; FormalMulti.validate(bundle); for(i=0;i<bundle.annotations.length;i++){results.push(planOne(bundle,bundle.annotations[i].annotationId,sourceText,observation));if(results[i].status==="failed")hasFailed=true;else if(results[i].status!=="complete")hasUnresolved=true;} return {status:hasFailed?"failed":(hasUnresolved?"unresolved":"complete"),results:results}; }
    function projectAndPlanAll(bundle, sourceText, observation) { var projected=FormalMultiProjection.project(bundle); return {bundle:projected,plan:planAll(projected,sourceText,observation)}; }
    return {planOne:planOne,planAll:planAll,projectAndPlanAll:projectAndPlanAll,localLines:localLines,hasRenderableSuffix:hasRenderableSuffix,textualVisibleEnd:textualVisibleEnd,authoritativeVisibleEnd:authoritativeVisibleEnd,sourceCoordinateContract:sourceCoordinateContract};
}());
if(typeof module!=="undefined")module.exports=FormalMultiOrchestration;
