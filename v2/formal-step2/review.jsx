function FormalStep2Review(context, decision) {
    var w = new Window("dialog", "v2 Formal Step 2");
    w.preferredSize = [500, -1];
    w.add("statictext", undefined, "読み");
    var reading = w.add("edittext", undefined, context.bundle.annotation.reading);
    reading.preferredSize = [440, 24];
    w.add("statictext", undefined, "折返し境界（本文後,読み後）");
    var initialParts = [], boundaries = decision.boundaries || [], reusable = decision.reusableHints || [], i, j, reused;
    for (i = 0; i < boundaries.length; i++) {
        reused = null;
        for (j = 0; j < reusable.length; j++) if (reusable[j].baseBoundaryAfter === boundaries[i]) reused = reusable[j];
        initialParts.push(String(boundaries[i]) + "," + (reused ? String(reused.readingBoundaryAfter) : ""));
    }
    var initial = initialParts.join(",");
    var boundary = w.add("edittext", undefined, initial);
    boundary.preferredSize = [440, 24];
    var buttons = w.add("group");
    var save = buttons.add("button", undefined, "保存して適用", {name: "ok"});
    var cancel = buttons.add("button", undefined, "閉じる", {name: "cancel"});
    w.defaultElement = save;
    w.cancelElement = cancel;
    if (w.show() !== 1) return null;
    var hints = [], parts = boundary.text.split(","), reusableNow = (reading.text === context.bundle.annotation.reading) ? (decision.reusableHints || []) : [], i;
    for (i = 0; i < reusableNow.length; i++) hints.push(reusableNow[i]);
    for (i = 0; i < parts.length - 1; i += 2) if (parts[i] !== "" && parts[i + 1] !== "") {
        var baseBoundary = Number(parts[i]), alreadyReusable = false, k;
        for (k = 0; k < reusableNow.length; k++) if (reusableNow[k].baseBoundaryAfter === baseBoundary) alreadyReusable = true;
        if (!alreadyReusable) hints.push({
            baseBoundaryAfter: baseBoundary, readingBoundaryAfter: Number(parts[i + 1]),
            baseText: context.snapshot.text, reading: reading.text,
            baseRevision: context.bundle.revision, readingRevision: context.bundle.revision
        });
    }
    hints.sort(function (a, b) { return a.baseBoundaryAfter - b.baseBoundaryAfter; });
    return {reading: reading.text, enabled: context.bundle.annotation.enabled,
        readingConfirmed: true, placementMode: "auto", splitHints: hints};
}
