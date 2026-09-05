#target illustrator
#include "core.js"
#include "illustrator.jsx"
#include "review.jsx"

/* Standalone experimental entry. Never loads or changes the legacy script. */
(function () {
    function describe(observation) {
        if (!observation) return "";
        var text = "Adapter: " + observation.status + " / Illustrator実機の合否は未検証\n";
        if (observation.reasons) text += observation.reasons.join(" / ") + "\n";
        if (observation.lines) {
            for (var i = 0; i < observation.lines.length; i++) {
                var line = observation.lines[i]; text += "line " + (i + 1) + ": [" + line.start + ", " + line.end + ")\n";
            }
        }
        return text;
    }
    try {
        if (!app.documents.length) throw new Error("実験用AIを開いてください。");
        var doc = app.activeDocument, selection = doc.selection;
        if (!selection || selection.length !== 1 || selection[0].typename !== "TextFrame")
            throw new Error("本文TextFrameを1個だけ直接選択してください。");
        var port = AstraLiteIllustrator(doc, selection[0]);
        var context = AstraLite.Application.open(port), feedback = "", draft = null, command, result;
        while (true) {
            command = AstraLiteReview(context, feedback, draft);
            if (!command) break;
            try {
                if (command.action === "observe") {
                    feedback = describe(port.observe()) + "意味データ・生成ルビは更新していません。";
                    draft = command.edit;
                } else {
                    result = AstraLite.Application.apply(port, context, command.edit);
                    feedback = describe(result.observation) + "描画状態: " + result.bundle.renderStatus +
                        " / managed TextFrame数: " + port.inspect(result.bundle).length +
                        "\nAIファイルの保存はIllustratorで実行してください。";
                    context = AstraLite.Application.open(port); draft = null;
                }
            } catch (operationError) {
                alert("処理を完了できませんでした。\n" + operationError.message + "\n既存物を手作業で消さず、状態を確認してください。");
                context = AstraLite.Application.open(port); draft = null;
                feedback = "前回エラー: " + operationError.message;
            }
        }
    } catch (error) { alert("Astra Liteを停止しました。\n" + error.message); }
}());
