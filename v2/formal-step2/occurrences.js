/* Pure long-text occurrence and lexeme grouping model. */
var FormalLongText = (function () {
    function fail(message) { throw Error(message); }
    function isKanji(character) {
        var code = character.charCodeAt(0);
        return (code >= 0x3400 && code <= 0x4dbf) ||
            (code >= 0x4e00 && code <= 0x9fff) ||
            (code >= 0xf900 && code <= 0xfaff) ||
            (code >= 0x3005 && code <= 0x3007);
    }
    function variationSelectorLength(text,index) { var source=String(text), code=source.charCodeAt(index), next=source.charCodeAt(index+1), point; if(code>=0xfe00&&code<=0xfe0f) return 1; if(code>=0xd800&&code<=0xdbff&&next>=0xdc00&&next<=0xdfff) { point=(code-0xd800)*0x400+(next-0xdc00)+0x10000; if(point>=0xe0100&&point<=0xe01ef) return 2; } return 0; }
    function hasUnsupportedSequence(text) {
        var source=String(text),i,code,next,point,previous,selectorLength;
        for(i=0;i<source.length;i++) { code=source.charCodeAt(i); next=i+1<source.length?source.charCodeAt(i+1):0; previous=i>0?source.charCodeAt(i-1):0; if(code>=0xd800&&code<=0xdbff&&next>=0xdc00&&next<=0xdfff) { point=(code-0xd800)*0x400+(next-0xdc00)+0x10000; if(point>=0x20000&&point<=0x323af) return true; selectorLength=variationSelectorLength(source,i); if(selectorLength&&isKanji(String.fromCharCode(previous))) return true; i+=selectorLength||1; } else if(code>=0xfe00&&code<=0xfe0f && isKanji(String.fromCharCode(previous))) return true; }
        return false;
    }
    function unsupportedKanjiAt(text,index) {
        var source=String(text),high=source.charCodeAt(index),low=source.charCodeAt(index+1),point;
        if(high<0xd800||high>0xdbff||low<0xdc00||low>0xdfff) return false;
        point=(high-0xd800)*0x400+(low-0xdc00)+0x10000;
        return point>=0x20000&&point<=0x323af;
    }
    function cloneOccurrence(occurrence) {
        var guard=occurrence.splitGuard;
        return {occurrenceId: occurrence.occurrenceId, start: occurrence.start, end: occurrence.end,
            surface: occurrence.surface, groupId: occurrence.groupId, visible: occurrence.visible,
            enabled: occurrence.enabled, reading: occurrence.reading, readingConfirmed: occurrence.readingConfirmed,
            lineage: occurrence.lineage.slice(0), unsupported: !!occurrence.unsupported,
            renderStatus: occurrence.renderStatus || "pending", renderReasons: (occurrence.renderReasons || []).slice(0),
            renderBoundaries: (occurrence.renderBoundaries || []).slice(0),
            renderUnresolvedBoundaries: (occurrence.renderUnresolvedBoundaries || []).slice(0),
            splitGuard: guard ? {reason:guard.reason,boundaries:(guard.boundaries||[]).slice(0),unresolvedBoundaries:(guard.unresolvedBoundaries||[]).slice(0)} : null};
    }
    function knownSplitGuard(occurrence) {
        var reasons=occurrence.renderReasons||[], i;
        if (occurrence.splitGuard && occurrence.splitGuard.reason) return {reason:occurrence.splitGuard.reason,boundaries:(occurrence.splitGuard.boundaries||[]).slice(0),unresolvedBoundaries:(occurrence.splitGuard.unresolvedBoundaries||[]).slice(0)};
        if (occurrence.renderStatus!=="unresolved" || !occurrence.renderBoundaries || !occurrence.renderBoundaries.length) return null;
        for(i=0;i<reasons.length;i++) if(reasons[i]==="split-hint-required") return {reason:"split-hint-required",boundaries:occurrence.renderBoundaries.slice(0),unresolvedBoundaries:(occurrence.renderUnresolvedBoundaries||[]).slice(0)};
        return null;
    }
    function clone(bundle) {
        var occurrences = [], i;
        for (i = 0; i < bundle.occurrences.length; i++) occurrences.push(cloneOccurrence(bundle.occurrences[i]));
        return {schemaVersion: 1, textSnapshot: bundle.textSnapshot, occurrences: occurrences};
    }
    function validate(bundle) {
        var seen = {}, lastEnd = 0, i, occurrence;
        if (!bundle || bundle.schemaVersion !== 1 || typeof bundle.textSnapshot !== "string" || !(bundle.occurrences instanceof Array)) fail("invalid-long-text-bundle");
        for (i = 0; i < bundle.occurrences.length; i++) {
            occurrence = bundle.occurrences[i];
            if (!occurrence || typeof occurrence.occurrenceId !== "string" || seen[occurrence.occurrenceId] ||
                typeof occurrence.start !== "number" || typeof occurrence.end !== "number" ||
                occurrence.start < lastEnd || occurrence.end <= occurrence.start || occurrence.end > bundle.textSnapshot.length ||
                occurrence.surface !== bundle.textSnapshot.substring(occurrence.start, occurrence.end) ||
                typeof occurrence.groupId !== "string" || typeof occurrence.visible !== "boolean" || typeof occurrence.enabled !== "boolean" ||
                !(occurrence.lineage instanceof Array) || !occurrence.lineage.length) fail("invalid-long-text-occurrence");
            seen[occurrence.occurrenceId] = true;
            lastEnd = occurrence.end;
        }
        return bundle;
    }
    function extract(text) {
        var source = String(text), occurrences = [], i = 0, start, end, surface, groups = {}, groupId, unsupported;
        while (i < source.length) {
            if (!isKanji(source.charAt(i)) && !unsupportedKanjiAt(source,i)) { i++; continue; }
            start = i;
            while (i < source.length && (isKanji(source.charAt(i)) || unsupportedKanjiAt(source,i) || variationSelectorLength(source,i))) i += unsupportedKanjiAt(source,i) ? 2 : (variationSelectorLength(source,i) || 1);
            end = i;
            surface = source.substring(start, end); unsupported=hasUnsupportedSequence(surface);
            groupId = groups[surface];
            if (!groupId) { groupId = "lexeme-" + occurrences.length; groups[surface] = groupId; }
            occurrences.push({occurrenceId: "occurrence-" + occurrences.length, start: start, end: end,
                surface: surface, groupId: groupId, visible: true, enabled: true, reading: "", readingConfirmed: false,
                lineage: ["occurrence-" + occurrences.length], unsupported:unsupported});
        }
        return validate({schemaVersion: 1, textSnapshot: source, occurrences: occurrences});
    }
    function splitAt(bundle, occurrenceId, boundaries) {
        var next = clone(bundle), index = -1, source, points = [0], pieces = [], i, start, end, part;
        if (!boundaries || !boundaries.length) fail("empty-split-boundaries");
        for (i = 0; i < next.occurrences.length; i++) if (next.occurrences[i].occurrenceId === occurrenceId) index = i;
        if (index < 0) fail("occurrence-missing");
        source = next.occurrences[index];
        if(source.unsupported) fail("unsupported-occurrence-cannot-split");
        for (i = 0; i < boundaries.length; i++) { if (typeof boundaries[i] !== "number" || !isFinite(boundaries[i]) || Math.floor(boundaries[i]) !== boundaries[i] || boundaries[i] <= points[points.length - 1] || boundaries[i] >= source.end - source.start) fail("invalid-split-boundary"); points.push(boundaries[i]); }
        points.push(source.end - source.start);
        for (i = 0; i < points.length - 1; i++) {
            start = source.start + points[i]; end = source.start + points[i + 1];
            part = cloneOccurrence(source); part.occurrenceId = occurrenceId + "-split-" + i; part.start = start; part.end = end; part.surface = next.textSnapshot.substring(start, end); part.groupId = "occurrence-group-" + part.occurrenceId; part.lineage = source.lineage.concat([source.occurrenceId]); if (source.reading) { part.reading = source.reading; part.readingConfirmed = false; } else { part.reading = ""; part.readingConfirmed = false; } part.renderStatus="pending"; part.renderReasons=[]; part.renderBoundaries=[]; part.renderUnresolvedBoundaries=[]; part.splitGuard=knownSplitGuard(source); pieces.push(part);
        }
        next.occurrences.splice.apply(next.occurrences, [index, 1].concat(pieces));
        return validate(next);
    }
    function mergeAdjacentInternal(bundle, occurrenceIds) {
        var next = clone(bundle), ids = {}, selected = [], i, j, merged;
        if (!occurrenceIds || occurrenceIds.length < 2) fail("merge-requires-adjacent-occurrences");
        for (i = 0; i < occurrenceIds.length; i++) ids[occurrenceIds[i]] = true;
        for (i = 0; i < next.occurrences.length; i++) if (ids[next.occurrences[i].occurrenceId]) selected.push(next.occurrences[i]);
        if (selected.length !== occurrenceIds.length) fail("occurrence-missing");
        for (i = 1; i < selected.length; i++) if (selected[i - 1].end !== selected[i].start) fail("merge-requires-contiguous-ranges");
        merged = cloneOccurrence(selected[0]); merged.end = selected[selected.length - 1].end; merged.surface = next.textSnapshot.substring(merged.start, merged.end); merged.groupId = selected[0].groupId; merged.lineage = [];
        for (i = 0; i < selected.length; i++) merged.lineage = merged.lineage.concat(selected[i].lineage);
        merged.reading = ""; merged.readingConfirmed = false; merged.renderStatus="pending"; merged.renderReasons=[]; merged.renderBoundaries=[]; merged.renderUnresolvedBoundaries=[];
        for (i = 0; i < selected.length; i++) merged.reading += selected[i].reading;
        for (i = next.occurrences.length - 1; i >= 0; i--) if (ids[next.occurrences[i].occurrenceId]) next.occurrences.splice(i, 1);
        next.occurrences.push(merged); next.occurrences.sort(function (a, b) { return a.start - b.start; });
        return validate(next);
    }
    function mergeAdjacent(bundle, occurrenceIds) {
        var i, ids={}, occurrence;
        if (occurrenceIds) for(i=0;i<occurrenceIds.length;i++) ids[occurrenceIds[i]]=true;
        for(i=0;i<bundle.occurrences.length;i++) if(ids[bundle.occurrences[i].occurrenceId]) { occurrence=bundle.occurrences[i]; if(occurrence.splitGuard && occurrence.splitGuard.reason==="split-hint-required") fail("merge-would-restore-split-blocker"); }
        return mergeAdjacentInternal(bundle, occurrenceIds);
    }
    function mergeAdjacentCandidate(bundle, occurrenceIds) {
        var candidate, i, ids={}, confirmed=true;
        for(i=0;i<(occurrenceIds||[]).length;i++) ids[occurrenceIds[i]]=true;
        for(i=0;i<bundle.occurrences.length;i++) if(ids[bundle.occurrences[i].occurrenceId] && (bundle.occurrences[i].readingConfirmed!==true || !bundle.occurrences[i].reading)) confirmed=false;
        candidate=mergeAdjacentInternal(bundle, occurrenceIds);
        if(candidate.occurrences.length===1 && confirmed) { candidate.occurrences[0].readingConfirmed=true; candidate=validate(candidate); }
        return candidate;
    }
    function mergeAdjacentWithPlan(bundle, occurrenceIds, plan) {
        var candidate, projected, expectedId;
        if(!plan || plan.status!=="complete" || !plan.results || plan.results.length!==1 || plan.results[0].status!=="complete" || !plan.results[0].decision || plan.results[0].decision.status!=="complete") fail("merge-current-plan-not-complete");
        candidate=FormalMulti.replaceOccurrences(bundle, mergeAdjacentCandidate(bundle, occurrenceIds).occurrences); projected=FormalMultiProjection.project(candidate); expectedId=FormalMultiProjection.id(projected,projected.occurrences[0]);
        if(plan.results[0].annotationId!==expectedId) fail("merge-current-plan-identity-mismatch");
        return candidate;
    }
    function wouldRestoreSplitBlocker(bundle, occurrenceIds) {
        var i, j, ids={}, occurrence;
        if (!occurrenceIds || occurrenceIds.length<2) return false;
        for(i=0;i<occurrenceIds.length;i++) ids[occurrenceIds[i]]=true;
        for(i=0;i<bundle.occurrences.length;i++) if(ids[bundle.occurrences[i].occurrenceId]) { occurrence=bundle.occurrences[i]; if(occurrence.splitGuard && occurrence.splitGuard.reason==="split-hint-required") return true; }
        return false;
    }
    function setGroupReading(bundle, groupId, reading, confirmed) {
        var next = clone(bundle), i, occurrence;
        for (i = 0; i < next.occurrences.length; i++) if (next.occurrences[i].groupId === groupId) {
            occurrence = next.occurrences[i]; occurrence.reading = String(reading); occurrence.readingConfirmed = confirmed !== false && occurrence.reading.length > 0;
        }
        return validate(next);
    }
    return {extract: extract, validate: validate, clone: clone, splitAt: splitAt, mergeAdjacent: mergeAdjacent, mergeAdjacentCandidate:mergeAdjacentCandidate, mergeAdjacentWithPlan:mergeAdjacentWithPlan, wouldRestoreSplitBlocker:wouldRestoreSplitBlocker, setGroupReading: setGroupReading, hasUnsupportedSequence:hasUnsupportedSequence, unsupportedKanjiAt:unsupportedKanjiAt, variationSelectorLength:variationSelectorLength};
}());
if (typeof module !== "undefined") module.exports = FormalLongText;
