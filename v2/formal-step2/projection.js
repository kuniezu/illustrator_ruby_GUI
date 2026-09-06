/* Pure projection from logical occurrences to renderable v2 annotations. */
var FormalMultiProjection = (function () {
    var prefix = "v2-occurrence-";
    function context(text, start, end) { var limit=16; return {beforeContext:text.substring(Math.max(0,start-limit),start),afterContext:text.substring(end,Math.min(text.length,end+limit))}; }
    function idForKey(sourceFrameId, occurrenceId) { var text=sourceFrameId+":"+occurrenceId, hash=0, i; for(i=0;i<text.length;i++) hash=(hash*31+text.charCodeAt(i))%1000000000; return prefix+hash+"-0"; }
    function id(bundle, occurrence) { return idForKey(bundle.sourceFrameId, occurrence.occurrenceId); }
    function eligible(occurrence) { return occurrence.enabled && occurrence.readingConfirmed && occurrence.reading.length > 0; }
    function find(annotations, annotationId) { var i; for(i=0;i<annotations.length;i++) if(annotations[i].annotationId===annotationId) return annotations[i]; return null; }
    function create(bundle, occurrence) { var a=FormalStep1.create(bundle.textSnapshot).annotation, c=context(bundle.textSnapshot,occurrence.start,occurrence.end); a.annotationId=id(bundle,occurrence); a.sourceFrameId=bundle.sourceFrameId; a.anchor={baseText:occurrence.surface,startHint:occurrence.start,beforeContext:c.beforeContext,afterContext:c.afterContext}; a.reading=occurrence.reading; a.readingConfirmed=true; a.enabled=true; a.reviewReasons=[]; a.splitHints=[]; return a; }
    function project(bundle) {
        var next=FormalMulti.clone(bundle), annotations=[], occurrence, existing, generated={}, known={}, i, j;
        if(bundle.occurrences===undefined) return next;
        for(i=0;i<bundle.occurrences.length;i++) { occurrence=bundle.occurrences[i]; known[id(bundle,occurrence)]=true; for(j=0;j<occurrence.lineage.length;j++) known[idForKey(bundle.sourceFrameId,occurrence.lineage[j])]=true; if(!eligible(occurrence)) continue; existing=find(next.annotations,id(bundle,occurrence)); if(existing) { if(existing.anchor.baseText!==occurrence.surface||existing.anchor.startHint!==occurrence.start||existing.reading!==occurrence.reading) { existing.anchor.baseText=occurrence.surface; existing.anchor.startHint=occurrence.start; existing.reading=occurrence.reading; existing.readingConfirmed=true; existing.splitHints=[]; existing.reviewReasons=[]; } annotations.push(existing); generated[existing.annotationId]=true; } else annotations.push(create(bundle,occurrence)); }
        for(i=0;i<bundle.annotations.length;i++) if(bundle.annotations[i].annotationId.indexOf(prefix)!==0||!known[bundle.annotations[i].annotationId]) annotations.push(bundle.annotations[i]);
        next.annotations=annotations; return FormalMulti.validate(next);
    }
    return {project:project,eligible:eligible,id:id};
}());
if(typeof module!=="undefined")module.exports=FormalMultiProjection;
