function FormalStep2Review(context, decision) {
    var w = new Window("dialog", "v2 Formal Step 2");
    w.preferredSize = [500, -1];
    w.add("statictext", undefined, "読み");
    var reading = w.add("edittext", undefined, context.bundle.annotation.reading);
    reading.preferredSize = [440, 24];
    w.add("statictext", undefined, "折返し境界（本文後,読み後）");
    var initial = decision.boundaries && decision.boundaries.length ? String(decision.boundaries[0]) + "," : "";
    var boundary = w.add("edittext", undefined, initial);
    boundary.preferredSize = [440, 24];
    var buttons = w.add("group");
    var save = buttons.add("button", undefined, "保存して適用", {name: "ok"});
    var cancel = buttons.add("button", undefined, "閉じる", {name: "cancel"});
    w.defaultElement = save;
    w.cancelElement = cancel;
    if (w.show() !== 1) return null;
    var hints = [], parts = boundary.text.split(","), i;
    if (reading.text === context.bundle.annotation.reading && decision.status === "complete") hints = context.bundle.splitHints || [];
    else for (i = 0; i < parts.length - 1; i++) if (parts[i] !== "") hints.push({
        baseBoundaryAfter: Number(parts[i]), readingBoundaryAfter: Number(parts[i + 1]),
        baseText: context.snapshot.text, reading: reading.text,
        baseRevision: context.bundle.revision, readingRevision: context.bundle.revision
    });
    return {reading: reading.text, enabled: context.bundle.annotation.enabled,
        readingConfirmed: true, placementMode: "auto", splitHints: hints};
}
