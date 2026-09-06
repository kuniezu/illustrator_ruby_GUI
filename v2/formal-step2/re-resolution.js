/* Deterministic source-edit re-resolution. Ambiguous or missing matches never inherit state. */
var FormalLongTextReResolution = (function () {
    var contextLimit=16;

    function context(text,start,end) {
        return {before:text.substring(Math.max(0,start-contextLimit),start),after:text.substring(end,Math.min(text.length,end+contextLimit))};
    }
    function annotationFor(bundle,occurrence) {
        var id=FormalMultiProjection.id(bundle,occurrence),i;
        for(i=0;i<bundle.annotations.length;i++) if(bundle.annotations[i].annotationId===id) return bundle.annotations[i];
        return null;
    }
    function evidenceFor(bundle,old) {
        var annotation=annotationFor(bundle,old),c=context(bundle.textSnapshot,old.start,old.end);
        if(annotation && annotation.anchor) { c.before=annotation.anchor.beforeContext; c.after=annotation.anchor.afterContext; }
        return c;
    }
    function sameContext(candidateText,candidate,evidence) {
        var c=context(candidateText,candidate.start,candidate.end);
        return (evidence.before.length>0 && c.before===evidence.before) || (evidence.after.length>0 && c.after===evidence.after);
    }
    function preservesUncontextedPrefix(bundle,old,current,candidate) {
        return bundle.textSnapshot.substring(0,old.end)===old.surface && candidate.start===old.start && candidate.end===old.end && current.textSnapshot.substring(0,bundle.textSnapshot.length)===bundle.textSnapshot;
    }
    function matchesFor(bundle,old,current) {
        var candidates=[],contextMatches=[],evidence=evidenceFor(bundle,old),i,candidate;
        for(i=0;i<current.occurrences.length;i++) {
            candidate=current.occurrences[i];
            if(candidate.surface===old.surface) candidates.push(candidate);
        }
        for(i=0;i<candidates.length;i++) if(candidates[i].start===old.start) {
            if(current.textSnapshot===bundle.textSnapshot || sameContext(current.textSnapshot,candidates[i],evidence) || (candidates.length===1 && preservesUncontextedPrefix(bundle,old,current,candidates[i]))) contextMatches.push(candidates[i]);
        }
        if(contextMatches.length===1) return contextMatches;
        contextMatches=[];
        for(i=0;i<candidates.length;i++) if(sameContext(current.textSnapshot,candidates[i],evidence)) contextMatches.push(candidates[i]);
        return contextMatches;
    }
    function copyOccurrence(occurrence) {
        return {occurrenceId:occurrence.occurrenceId,start:occurrence.start,end:occurrence.end,surface:occurrence.surface,groupId:occurrence.groupId,visible:occurrence.visible,enabled:occurrence.enabled,reading:occurrence.reading,readingConfirmed:occurrence.readingConfirmed,lineage:occurrence.lineage.slice(0)};
    }
    function inheritedOccurrence(old,current) {
        var result=copyOccurrence(current);
        result.occurrenceId=old.occurrenceId; result.groupId=old.groupId; result.visible=old.visible; result.enabled=old.enabled; result.reading=old.reading; result.readingConfirmed=old.readingConfirmed; result.lineage=old.lineage.slice(0);
        return result;
    }
    function allocateNewIdentity(current,usedIds,usedGroups,groupIds,index) {
        var id=current.occurrenceId,group=current.groupId;
        if(usedIds[id]) { id="reconciled-occurrence-"+index; while(usedIds[id]) id+="-next"; }
        if(!groupIds[group]) { groupIds[group]="reconciled-group-"+index; while(usedGroups[groupIds[group]]) groupIds[group]+="-next"; }
        group=groupIds[group]; usedIds[id]=true; usedGroups[group]=true;
        return {occurrenceId:id,groupId:group};
    }
    function buildOccurrences(current,mapping,usedIds) {
        var finalOccurrences=[],groupIds={},usedGroups={},i,currentOccurrence,oldId,identity,copy,mappedId;
        for(mappedId in mapping.oldToNew) if(mapping.oldToNew[mappedId]) usedGroups[mapping.oldToNew[mappedId].groupId]=true;
        for(i=0;i<current.occurrences.length;i++) {
            currentOccurrence=current.occurrences[i]; oldId=mapping.currentToOld[currentOccurrence.occurrenceId];
            if(oldId) finalOccurrences.push(mapping.oldToNew[oldId]);
            else { copy=copyOccurrence(currentOccurrence); identity=allocateNewIdentity(currentOccurrence,usedIds,usedGroups,groupIds,i); copy.occurrenceId=identity.occurrenceId; copy.groupId=identity.groupId; finalOccurrences.push(copy); }
        }
        return finalOccurrences;
    }
    function updateAnnotations(next,previousBundle,previousOccurrences,mapping,currentText,unresolved) {
        var annotations=[],i,j,annotation,old,updated,cc,keep;
        for(i=0;i<next.annotations.length;i++) {
            annotation=next.annotations[i]; keep=true;
            for(j=0;j<previousOccurrences.length;j++) {
                old=previousOccurrences[j];
                if(annotation.annotationId!==FormalMultiProjection.id(previousBundle,old)) continue;
                updated=mapping.oldToNew[old.occurrenceId]; keep=!!updated;
                if(keep) { annotation.anchor.baseText=updated.surface; annotation.anchor.startHint=updated.start; cc=context(currentText,updated.start,updated.end); annotation.anchor.beforeContext=cc.before; annotation.anchor.afterContext=cc.after; }
                break;
            }
            if(keep && annotation.anchor && currentText.substring(annotation.anchor.startHint,annotation.anchor.startHint+annotation.anchor.baseText.length)!==annotation.anchor.baseText) { keep=false; unresolved.push({annotationId:annotation.annotationId,surface:annotation.anchor.baseText,reason:"annotation-not-found"}); }
            if(keep) annotations.push(annotation);
        }
        next.annotations=annotations;
    }
    function reconcile(previousBundle,currentText) {
        var previousOccurrences=previousBundle.occurrences||[], current=FormalLongText.extract(currentText), next=FormalMulti.clone(previousBundle), mapping={oldToNew:{},currentToOld:{},oldReason:{}},unresolved=[],usedCurrent={},reservedIds={},i,j,old,matches,available,chosen,inherited;
        for(i=0;i<previousOccurrences.length;i++) {
            old=previousOccurrences[i]; matches=matchesFor(previousBundle,old,current); available=[];
            for(j=0;j<matches.length;j++) if(!usedCurrent[matches[j].occurrenceId]) available.push(matches[j]);
            if(available.length===1) { chosen=available[0]; usedCurrent[chosen.occurrenceId]=true; inherited=inheritedOccurrence(old,chosen); mapping.oldToNew[old.occurrenceId]=inherited; mapping.currentToOld[chosen.occurrenceId]=old.occurrenceId; reservedIds[old.occurrenceId]=true; }
            else { mapping.oldToNew[old.occurrenceId]=null; mapping.oldReason[old.occurrenceId]=available.length?"ambiguous":"not-found"; unresolved.push({occurrenceId:old.occurrenceId,surface:old.surface,reason:mapping.oldReason[old.occurrenceId]}); }
        }
        next.textSnapshot=current.textSnapshot; next.occurrences=buildOccurrences(current,mapping,reservedIds); next.renderStatus="unresolved";
        updateAnnotations(next,previousBundle,previousOccurrences,mapping,current.textSnapshot,unresolved); FormalMulti.validate(next); return {bundle:next,unresolved:unresolved};
    }
    return {reconcile:reconcile};
}());
if(typeof module!=="undefined")module.exports=FormalLongTextReResolution;
