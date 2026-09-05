# Formal Step 1 実機確認

1. macOS版Illustratorで新規AIを作り、横書き `POINTTEXT` に `日本庭園` と入力する。
2. 本文TextFrameだけを直接選択し、`v2/formal-step1/Formal Step1.jsx` を実行する。
3. 読み `にほんていえん`、読み確認済みをオンにして適用し、状態が `complete`、managed rubyが1個であることを確認する。
   ルビの左右端が本文字界付近に収まり、極端に狭く見えたり大きくはみ出したりしないことも確認する。
4. 同じ操作を合計3回行い、rubyが増えないことを確認する。
5. 読みを変更して既存rubyが更新されること、描画オフでmanaged rubyだけ消えることを確認する。
6. 再度有効化し、AIを保存・閉じる・再オープンして読みとsuppression状態が復元されることを確認する。
7. 管理外TextFrameが残ることを確認する。失敗時はアラートの診断全文（stage/property/message）を記録する。

対象は一行の横書きPointTextのみ。縦書き、エリア文字、threaded frame、長文分割は今回の非目標です。
