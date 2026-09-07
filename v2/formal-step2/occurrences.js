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
    function cloneOccurrence(occurrence) {
        return {occurrenceId: occurrence.occurrenceId, start: occurrence.start, end: occurrence.end,
            surface: occurrence.surface, groupId: occurrence.groupId, visible: occurrence.visible,
            enabled: occurrence.enabled, reading: occurrence.reading, readingConfirmed: occurrence.readingConfirmed,
            lineage: occurrence.lineage.slice(0)};
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
        var source = String(text), occurrences = [], i = 0, start, end, surface, groups = {}, groupId;
        while (i < source.length) {
            if (!isKanji(source.charAt(i))) { i++; continue; }
            start = i;
            while (i < source.length && isKanji(source.charAt(i))) i++;
            end = i;
            surface = source.substring(start, end);
            groupId = groups[surface];
            if (!groupId) { groupId = "lexeme-" + occurrences.length; groups[surface] = groupId; }
            occurrences.push({occurrenceId: "occurrence-" + occurrences.length, start: start, end: end,
                surface: surface, groupId: groupId, visible: true, enabled: true, reading: "", readingConfirmed: false,
                lineage: ["occurrence-" + occurrences.length]});
        }
        return validate({schemaVersion: 1, textSnapshot: source, occurrences: occurrences});
    }
    function splitAt(bundle, occurrenceId, boundaries) {
        var next = clone(bundle), index = -1, source, points = [0], pieces = [], i, start, end, part;
        if (!boundaries || !boundaries.length) fail("empty-split-boundaries");
        for (i = 0; i < next.occurrences.length; i++) if (next.occurrences[i].occurrenceId === occurrenceId) index = i;
        if (index < 0) fail("occurrence-missing");
        source = next.occurrences[index];
        for (i = 0; i < boundaries.length; i++) { if (typeof boundaries[i] !== "number" || !isFinite(boundaries[i]) || Math.floor(boundaries[i]) !== boundaries[i] || boundaries[i] <= points[points.length - 1] || boundaries[i] >= source.end - source.start) fail("invalid-split-boundary"); points.push(boundaries[i]); }
        points.push(source.end - source.start);
        for (i = 0; i < points.length - 1; i++) {
            start = source.start + points[i]; end = source.start + points[i + 1];
            part = cloneOccurrence(source); part.occurrenceId = occurrenceId + "-split-" + i; part.start = start; part.end = end; part.surface = next.textSnapshot.substring(start, end); part.groupId = "occurrence-group-" + part.occurrenceId; part.lineage = source.lineage.concat([source.occurrenceId]); if (source.reading || source.readingConfirmed) { part.reading = ""; part.readingConfirmed = false; } pieces.push(part);
        }
        next.occurrences.splice.apply(next.occurrences, [index, 1].concat(pieces));
        return validate(next);
    }
    function mergeAdjacent(bundle, occurrenceIds) {
        var next = clone(bundle), ids = {}, selected = [], i, j, merged;
        if (!occurrenceIds || occurrenceIds.length < 2) fail("merge-requires-adjacent-occurrences");
        for (i = 0; i < occurrenceIds.length; i++) ids[occurrenceIds[i]] = true;
        for (i = 0; i < next.occurrences.length; i++) if (ids[next.occurrences[i].occurrenceId]) selected.push(next.occurrences[i]);
        if (selected.length !== occurrenceIds.length) fail("occurrence-missing");
        for (i = 1; i < selected.length; i++) if (selected[i - 1].end !== selected[i].start) fail("merge-requires-contiguous-ranges");
        merged = cloneOccurrence(selected[0]); merged.end = selected[selected.length - 1].end; merged.surface = next.textSnapshot.substring(merged.start, merged.end); merged.groupId = selected[0].groupId; merged.lineage = [];
        for (i = 0; i < selected.length; i++) merged.lineage = merged.lineage.concat(selected[i].lineage);
        for (i = 0; i < selected.length; i++) if (selected[i].reading || selected[i].readingConfirmed) { merged.reading = ""; merged.readingConfirmed = false; break; }
        for (i = next.occurrences.length - 1; i >= 0; i--) if (ids[next.occurrences[i].occurrenceId]) next.occurrences.splice(i, 1);
        next.occurrences.push(merged); next.occurrences.sort(function (a, b) { return a.start - b.start; });
        return validate(next);
    }
    function setGroupReading(bundle, groupId, reading, confirmed) {
        var next = clone(bundle), i, occurrence;
        for (i = 0; i < next.occurrences.length; i++) if (next.occurrences[i].groupId === groupId) {
            occurrence = next.occurrences[i]; occurrence.reading = String(reading); occurrence.readingConfirmed = confirmed !== false && occurrence.reading.length > 0;
        }
        return validate(next);
    }
    return {extract: extract, validate: validate, clone: clone, splitAt: splitAt, mergeAdjacent: mergeAdjacent, setGroupReading: setGroupReading};
}());
if (typeof module !== "undefined") module.exports = FormalLongText;
