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
            enabled: occurrence.enabled, reading: occurrence.reading, readingConfirmed: occurrence.readingConfirmed};
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
                typeof occurrence.groupId !== "string" || typeof occurrence.visible !== "boolean" || typeof occurrence.enabled !== "boolean") fail("invalid-long-text-occurrence");
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
                surface: surface, groupId: groupId, visible: true, enabled: true, reading: "", readingConfirmed: false});
        }
        return validate({schemaVersion: 1, textSnapshot: source, occurrences: occurrences});
    }
    function merge(bundle, occurrenceIds, groupId) {
        var next = clone(bundle), ids = {}, chosen = groupId || null, i, j, occurrence;
        if (!occurrenceIds || !occurrenceIds.length) fail("empty-merge-selection");
        for (i = 0; i < occurrenceIds.length; i++) ids[occurrenceIds[i]] = true;
        for (i = 0; i < next.occurrences.length; i++) if (ids[next.occurrences[i].occurrenceId]) { chosen = chosen || next.occurrences[i].groupId; break; }
        if (!chosen) fail("occurrence-missing");
        for (i = 0; i < next.occurrences.length; i++) if (ids[next.occurrences[i].occurrenceId]) next.occurrences[i].groupId = chosen;
        return validate(next);
    }
    function split(bundle, occurrenceIds) {
        var next = clone(bundle), ids = {}, i, occurrence;
        if (!occurrenceIds || !occurrenceIds.length) fail("empty-split-selection");
        for (i = 0; i < occurrenceIds.length; i++) ids[occurrenceIds[i]] = true;
        for (i = 0; i < next.occurrences.length; i++) if (ids[next.occurrences[i].occurrenceId]) {
            occurrence = next.occurrences[i];
            occurrence.groupId = "occurrence-group-" + occurrence.occurrenceId;
        }
        return validate(next);
    }
    return {extract: extract, validate: validate, clone: clone, merge: merge, split: split};
}());
if (typeof module !== "undefined") module.exports = FormalLongText;
