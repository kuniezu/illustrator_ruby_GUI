# Current Implementation and Phase 1 Findings

更新日: 2026-09-05
状態: Observed findings / design input

この文書は要求仕様ではなく、現行コード・GitHub履歴・Illustrator実機検証から得た事実と、そこから直接確認できる制約をまとめる。

## 1. 現行実装の中心

現行 `Illustrator Ruby GUI.jsx` は単一JSXにGUI、文字選択状態、ルビ入力データ、配置計算、Illustrator DOM操作をまとめた構造である。

README / requirements.md上の基本フローは:

1. 単一TextFrameを選択
2. 全文字をScriptUIへ展開
3. 文字単位またはグループ単位で読みを入力
4. 実行時にルビTextFrameを生成
5. 生成ルビをRubyレイヤー配下にまとめる

という一回生成型である。

## 2. 現行コードで有用な要素

- `createOutline()` を一時的に使った実字形位置の測定
- 横書き／縦書きの配置計算
- 親文字からのfont / color取得
- 親文字サイズ比率によるruby size / gap
- 長い読みへのtracking / scale処理の考え方
- 学習漢字データ
- 捨て仮名変換
- group rubyの入力・配置概念
- upstream `illustrator-ruby` に由来する日本語ルビ配置知見

## 3. 現行アーキテクチャ上の結合

- GUIの文字indexと配置処理のcharacterIndexが強く結合している。
- `rubyData` は実行中メモリの入力状態として設計され、永続ドメインモデルではなかった。
- 配置結果のTextFrame/groupが意味データと分離されていない。
- Rubyレイヤー構造が読込・生成ロジックの前提になっていた。
- GUI再実行が「既存Annotationを編集」ではなく「もう一度生成する」経路へ入りやすい。

## 4. Phase 0

Phase 0では、再編集対応のためには単純な絶対文字indexだけでなく、本文識別＋baseText＋前後context＋approximate positionを組み合わせる必要があるという方向が整理された。

曖昧なanchorは自動決定せずreviewへ送る方針が妥当とされた。

## 5. Phase 1A — 永続化実験

PR #5で、ルビrecordとsource frame identityをIllustratorオブジェクトへ保存し、保存・閉じる・再オープン後に1件のルビを再読込する実験を行った。

実機で確認できた点:

- 新規AI、unnamed単一TextFrame、ルビ1件でsave / reopen / rerun後の再読込は成功した。
- `TextFrame.note` をtool-owned metadataの保存先として利用できた。
- 既存noteを保持しながらnamespaced markerを追加することは可能だった。

後のPhase 1B実機検証で重要な追加事実が判明した。

- native `TextFrame.uuid` は保存・再オープン後に同一値を維持しないケースがあった。
- したがってnative uuidを永続IDの正本として扱う設計は安全ではない。

## 6. Phase 1B — wrapper / grouping実験

Issue #6 / PR #8では、本文TextFrameと生成ルビを一体移動できるよう、`rubyPair_<frameId>` wrapper GroupItemを作る実験を行った。

実機で確認できた点:

- 本文TextFrameとruby groupを同一wrapperへ入れ、Illustrator上で一体構造にすること自体は可能だった。
- source parentやLayerのDOMプロパティは、PageItemと同じ感覚で扱うと例外になる箇所があった。
- 生成物を本文側へ移した後、旧Rubyレイヤー前提が残ると空レイヤー等の副作用が出た。
- wrapper全体を選択した場合、selection自体は正常に `GroupItem` として取得できた。
- wrapper選択失敗の主因はselection型ではなく、保存後にnative uuidが変化しwrapperの旧IDと本文のcurrent uuidが一致しなくなったことだった。
- `GroupItem.textFrames` 等のDOM collectionと再帰走査の組合せでは、同一recordを重複回収する危険がある。
- tool-owned note IDをnative uuidより優先する修正で、保存後wrapperから本文を再解決できる経路は改善した。

## 7. Phase 1Bで発生した再編集問題

再編集時に現行の `placeRubys()` をそのまま通すと、既存wrapper内へ新規wrapper / ruby groupを追加してしまい、構造が増殖した。

例:

```text
rubyPair
  rubyPair
    body
    ruby_frame
  ruby_frame
```

このため「既存wrapperを再利用し、旧ruby groupを置換する」修正を追加したが、次の実機確認では初回生成時のgroupingが成立しなくなる回帰が発生した。

この経緯から、現行の一回生成型フローへ永続化・再編集・wrapper再利用を局所的に後付けすると、初回生成と再編集で責務・状態遷移が衝突しやすいことが分かった。

## 8. PR #8の扱い

PR #8はv2の完成コードとしてマージするより、次の実機知見を残した実験として価値がある。

- Illustrator DOMでのreparent / GroupItem挙動
- native uuidの非永続性
- selectionとgroup内TextFrame解決
- nested collectionの走査注意
- 一回生成型コードへ再編集を後付けした場合の冪等性問題
- physical groupingとsemantic persistenceを同一問題として扱う危険

v2分析ではPR #8を参考資料とし、wrapper方式を唯一の前提としない。
