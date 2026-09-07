/* Pure projection from logical occurrences to renderable v2 annotations. */
var FormalMultiProjection = (function () {
    var prefix = "v2-occurrence-";
    function context(text, start, end) { var limit=16; return {beforeContext:text.substring(Math.max(0,start-limit),start),afterContext:text.substring(end,Math.min(text.length,end+limit))}; }
    function idForKey(sourceFrameId, occurrenceId) { var text=String(occurrenceId), encoded="", i, code; for(i=0;i<text.length;i++){code=text.charCodeAt(i);encoded+=("00000"+code).slice(-5);} return prefix+text.length+encoded+"-0"; }
    function id(bundle, occurrence) { return idForKey(bundle.sourceFrameId, occurrence.occurrenceId); }
    function eligible(occurrence) { return !occurrence.unsupported && occurrence.enabled && occurrence.readingConfirmed && occurrence.reading.length > 0; }
    function find(annotations, annotationId) { var i; for(i=0;i<annotations.length;i++) if(annotations[i].annotationId===annotationId) return annotations[i]; return null; }
    function contains(values, value) { var i; for(i=0;i<values.length;i++) if(values[i]===value) return true; return false; }
    function create(bundle, occurrence) { var a=FormalStep1.create(bundle.textSnapshot).annotation, c=context(bundle.textSnapshot,occurrence.start,occurrence.end); a.annotationId=id(bundle,occurrence); a.sourceFrameId=bundle.sourceFrameId; a.anchor={baseText:occurrence.surface,startHint:occurrence.start,beforeContext:c.beforeContext,afterContext:c.afterContext}; a.reading=occurrence.reading; a.readingConfirmed=true; a.enabled=true; a.reviewReasons=[]; a.splitHints=[]; return a; }
    function project(bundle) {
        var next=FormalMulti.clone(bundle), annotations=[], occurrence, existing, generated={}, currentIds={}, ancestorIds={}, history=next.managedAnnotationIds||[], retired=[], retiredSeen={}, i, j, c;
        if(bundle.occurrences===undefined) return next;
        for(i=0;i<bundle.occurrences.length;i++) {
            occurrence=bundle.occurrences[i];
            currentIds[id(bundle,occurrence)]=true;
            if (!contains(history,id(bundle,occurrence))) history.push(id(bundle,occurrence));
            for(j=0;j<occurrence.lineage.length;j++) ancestorIds[idForKey(bundle.sourceFrameId,occurrence.lineage[j])]=true;
            if(!eligible(occurrence)) continue;
            existing=find(next.annotations,id(bundle,occurrence));
            if(existing) {
                if(existing.anchor.baseText!==occurrence.surface||existing.anchor.startHint!==occurrence.start||existing.reading!==occurrence.reading) { existing.anchor.baseText=occurrence.surface; existing.anchor.startHint=occurrence.start; existing.reading=occurrence.reading; existing.splitHints=[]; }
                existing.enabled=true; existing.readingConfirmed=occurrence.readingConfirmed; existing.reviewReasons=[]; c=context(bundle.textSnapshot,occurrence.start,occurrence.end); existing.anchor.beforeContext=c.beforeContext; existing.anchor.afterContext=c.afterContext; annotations.push(existing); generated[existing.annotationId]=true;
            } else annotations.push(create(bundle,occurrence));
        }
        for(i=0;i<bundle.annotations.length;i++) {
            if(bundle.annotations[i].annotationId.indexOf(prefix)!==0) { annotations.push(bundle.annotations[i]); continue; }
            if(generated[bundle.annotations[i].annotationId]) continue;
            if(currentIds[bundle.annotations[i].annotationId]) continue;
            if(ancestorIds[bundle.annotations[i].annotationId]) { if(!retiredSeen[bundle.annotations[i].annotationId]) { retired.push(bundle.annotations[i].annotationId); retiredSeen[bundle.annotations[i].annotationId]=true; } } else annotations.push(bundle.annotations[i]);
        }
        for(i=0;i<history.length;i++) if(!currentIds[history[i]]&&!retiredSeen[history[i]]) { retired.push(history[i]); retiredSeen[history[i]]=true; }
        next.annotations=annotations; next.managedAnnotationIds=history; next.retiredAnnotationIds=retired; return FormalMulti.validate(next);
    }
    return {project:project,eligible:eligible,id:id};
}());
if(typeof module!=="undefined")module.exports=FormalMultiProjection;
