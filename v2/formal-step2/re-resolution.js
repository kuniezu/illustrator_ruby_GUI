/* Deterministic source-edit re-resolution. Ambiguous or missing matches never inherit state. */
var FormalLongTextReResolution = (function () {
    var limit=16;
    function context(text,start,end) { return {before:text.substring(Math.max(0,start-limit),start),after:text.substring(end,Math.min(text.length,end+limit))}; }
    function occurrenceAnnotation(bundle,occurrence) { var id=FormalMultiProjection.id(bundle,occurrence),i; for(i=0;i<bundle.annotations.length;i++) if(bundle.annotations[i].annotationId===id) return bundle.annotations[i]; return null; }
    function candidateMatches(previousBundle,old,current) {
        var oldContext=context(previousBundle.textSnapshot,old.start,old.end), annotation, matches=[],i,candidate,c;
        annotation=occurrenceAnnotation(previousBundle,old);
        if(annotation && annotation.anchor) oldContext={before:annotation.anchor.beforeContext,after:annotation.anchor.afterContext};
        for(i=0;i<current.occurrences.length;i++) { candidate=current.occurrences[i]; if(candidate.surface!==old.surface) continue; if(candidate.start===old.start) matches.push(candidate); }
        if(matches.length===1) return matches;
        matches=[];
        for(i=0;i<current.occurrences.length;i++) { candidate=current.occurrences[i]; c=context(current.textSnapshot,candidate.start,candidate.end); if(candidate.surface===old.surface && (c.before===oldContext.before||c.after===oldContext.after)) matches.push(candidate); }
        return matches;
    }
    function cloneOccurrenceState(old,current) { current.occurrenceId=old.occurrenceId; current.groupId=old.groupId; current.visible=old.visible; current.enabled=old.enabled; current.reading=old.reading; current.readingConfirmed=old.readingConfirmed; current.lineage=old.lineage.slice(0); return current; }
    function reconcile(previousBundle,currentText) {
        var previousOccurrences=previousBundle.occurrences||[], current=FormalLongText.extract(currentText), next=FormalMulti.clone(previousBundle), mapping={},unresolved=[],used={},i,j,old,matches,chosen,a,c,available;
        for(i=0;i<previousOccurrences.length;i++) { old=previousOccurrences[i]; matches=candidateMatches(previousBundle,old,current); available=[]; for(j=0;j<matches.length;j++) if(!used[matches[j].occurrenceId]) available.push(matches[j]); matches=available; if(matches.length===1) { chosen=matches[0]; used[chosen.occurrenceId]=true; mapping[old.occurrenceId]=cloneOccurrenceState(old,chosen); } else { mapping[old.occurrenceId]=null; unresolved.push({occurrenceId:old.occurrenceId,surface:old.surface,reason:matches.length?"ambiguous":"not-found"}); } }
        for(i=0;i<current.occurrences.length;i++) { if(!used[current.occurrences[i].occurrenceId]) continue; for(j=0;j<previousOccurrences.length;j++) if(mapping[previousOccurrences[j].occurrenceId]===current.occurrences[i]) current.occurrences[i]=mapping[previousOccurrences[j].occurrenceId]; }
        next.textSnapshot=current.textSnapshot; next.occurrences=current.occurrences; next.renderStatus="unresolved"; a=[];
        for(i=0;i<previousBundle.annotations.length;i++) { var keep=true,annotation=previousBundle.annotations[i]; for(j=0;j<previousOccurrences.length;j++) if(annotation.annotationId===FormalMultiProjection.id(previousBundle,previousOccurrences[j])) { keep=!!mapping[previousOccurrences[j].occurrenceId]; if(keep) { c=mapping[previousOccurrences[j].occurrenceId]; annotation.anchor.baseText=c.surface; annotation.anchor.startHint=c.start; var cc=context(current.textSnapshot,c.start,c.end); annotation.anchor.beforeContext=cc.before; annotation.anchor.afterContext=cc.after; } break; } if(keep && annotation.anchor && current.textSnapshot.substring(annotation.anchor.startHint,annotation.anchor.startHint+annotation.anchor.baseText.length)!==annotation.anchor.baseText) { keep=false; unresolved.push({annotationId:annotation.annotationId,surface:annotation.anchor.baseText,reason:"annotation-not-found"}); } if(keep) a.push(annotation); }
        next.annotations=a; FormalMulti.validate(next); return {bundle:next,unresolved:unresolved};
    }
    return {reconcile:reconcile};
}());
if(typeof module!=="undefined")module.exports=FormalLongTextReResolution;
