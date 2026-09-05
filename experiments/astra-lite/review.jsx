/* UI returns commands and plain values only. It never creates Illustrator objects. */
function AstraLiteReview(context, feedback, draft) {
    var b = context.bundle, a = draft || b.annotation;
    var w = new Window("dialog", "Astra Lite — Gate A/B (実験)");
    w.orientation = "column"; w.alignChildren = ["fill", "top"];
    w.add("statictext", undefined, "1行の横書きポイント文字全体 / 本文とルビは別オブジェクト");
    w.add("statictext", undefined, "Annotation: " + b.annotation.annotationId);
    w.add("statictext", undefined, "revision=" + b.revision + " / 描画状態=" + b.renderStatus);
    var base = w.add("edittext", undefined, b.annotation.anchor.baseText, {multiline: true, readonly: true});
    base.preferredSize = [540, 55];
    function input(label, value) {
        var row = w.add("group"); row.add("statictext", undefined, label);
        var field = row.add("edittext", undefined, String(value)); field.characters = 30; return field;
    }
    var reading = input("読み", a.reading);
    var enabled = w.add("checkbox", undefined, "ルビを描画する（オフ＝抑制。意味データは保存）"); enabled.value = a.enabled;
    var confirmed = w.add("checkbox", undefined, "この読みを確認済みにする"); confirmed.value = a.readingConfirmed;
    reading.onChanging = function () { confirmed.value = false; };
    var row = w.add("group"); row.add("statictext", undefined, "配置");
    var mode = row.add("dropdownlist", undefined, ["auto", "auto_offset", "manual"]);
    mode.selection = a.placementMode === "auto_offset" ? 1 : a.placementMode === "manual" ? 2 : 0;
    w.add("statictext", undefined, "manualは保存のみで自動描画しません。抑制操作は適用できます。");
    var userReview = input("要確認メモ（空欄で解除）", a.userReview);
    var size = input("ルビサイズ比（0.1〜1）", a.style.sizeRatio);
    var gap = input("間隔比（0〜2）", a.style.gapRatio);
    var inline = input("横方向補正 em（-10〜10）", a.offset.inlineEm);
    var block = input("上方向補正 em（-10〜10）", a.offset.blockEm);
    var report = "要確認理由: " + (b.annotation.reviewReasons.join(" / ") || "なし") + "\n" + (feedback || "");
    var status = w.add("edittext", undefined, report, {multiline: true, readonly: true}); status.preferredSize = [540, 100];
    var buttons = w.add("group"), result = null;
    var observe = buttons.add("button", undefined, "行情報を観測");
    var apply = buttons.add("button", undefined, "保存して適用");
    buttons.add("button", undefined, "閉じる", {name: "cancel"});
    function values() {
        function numeric(field) {
            if (!/^\s*-?([0-9]+(\.[0-9]*)?|\.[0-9]+)(e[+-]?[0-9]+)?\s*$/.test(field.text)) throw new Error("数値欄を確認してください");
            return Number(field.text);
        }
        return {reading: reading.text, enabled: enabled.value, readingConfirmed: confirmed.value,
            placementMode: mode.selection.text, userReview: userReview.text,
            style: {sizeRatio: numeric(size), gapRatio: numeric(gap)},
            offset: {inlineEm: numeric(inline), blockEm: numeric(block)}};
    }
    function command(action) {
        try { result = {action: action, edit: values()}; w.close(1); }
        catch (e) { alert(e.message); }
    }
    observe.onClick = function () { command("observe"); };
    apply.onClick = function () { command("apply"); };
    if (w.show() !== 1) return null;
    return result;
}
