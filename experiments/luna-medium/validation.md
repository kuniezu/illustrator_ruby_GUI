# Gate A/B 検証記録

`node experiments/luna-medium/tests/run.cjs` で、Store往復・破損拒否・anchor曖昧性・desired=0/failed/unresolvedの区別・3回reconcile・suppression・静的entry検査を実施する。mockはIllustrator DOMやScriptUIを再現しない。

Illustrator実機でのsave/reopen、note容量、TextRange/linesの実値、Windows/macOS、見た目、フォント、DOM例外は未検証である。未対応ケースは描画せず意味データを保持する。
