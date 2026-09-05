# Luna Medium Gate A/B 実機確認手順

実験ブランチ `experiment/luna-medium-gate-ab` の `Luna Medium Gate AB.jsx` だけを使い、人工の新規AIで確認する。既存の本文・案件辞書・現行GUIは使わない。

- [ ] 通常レイヤー直下に、回転・拡縮なしの横書きポイント文字 `日本庭園` を作り、本文だけを直接選択して起動する。
- [ ] ダイアログで `にほんていえん` と確認済みを入力して保存・適用し、managed rubyが1件になる。AIを保存する。
- [ ] 同じ操作を3回繰り返し、rubyが増殖せず同じ管理対象が更新される。
- [ ] readingを変更して確認をやり直し、1件のまま内容が更新される。
- [ ] 描画をオフにして適用し、managed rubyが0件、source noteのreading/IDが残る。再度オンにすると1件へ戻る。
- [ ] AIを閉じて再オープンし、再実行してAnnotation、sourceFrameId、reading、enabled、revisionが復元される。
- [ ] source TextFrameを複製して同じnoteを持たせ、どちらを選んでも `source-id-collision` で停止する。片方を自動採用しない。
- [ ] 同レイヤーの無印TextFrameを置き、適用・抑制しても無印物が消えない。managed outputを複製した場合は `output-id-collision` で停止する。
- [ ] 他者note（日本語、改行、`%=;`）を先に入れ、初回/再保存後も前後が保持される。
- [ ] area text、複数行、縦書き、回転、group内、threaded、`𠮷`/IVS/結合濁点を試し、成功扱いにせず理由付きで保留する。

記録: Illustrator完全version/build、OS、font、AI保存形式、commit SHA、実行したJSXのローカル差分、各ケースのmanaged数とnote。実機確認が未実施でも、Nodeテスト合格を実機合格とみなさない。
