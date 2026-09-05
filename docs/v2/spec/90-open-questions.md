# 90 — Open Questions

更新日: 2026-09-05
状態: Draft 0.1

この文書は要求仕様を未確定のまま残している論点を列挙する。AI分析側は勝手に仕様へ昇格させず、比較案と根拠を提示する。

## Persistence

- RubyAnnotation本体をどこへ保存するか。
  - source TextFrame.note
  - generated object note
  - 文書内専用metadata object
  - 隠しレイヤー／専用TextFrame
  - 外部sidecar
  - 複合方式
- 1Annotationごとに分散保存するか、文書単位のstoreを持つか。
- データversioning / migrationをどうするか。

## Physical layout / transform coupling

- 本文を選択・移動した瞬間にルビも追従させるには、managed GroupItemが必要か。
- 本文とルビを物理的に一体化しない場合、再render前のズレをどう扱うか。
- 1つの安定したhost groupをv2の最初から作る方式は、PR #8の後付けwrapper方式と何が違うか。
- clipping、複雑な既存group、locked object、threaded textをどこまでMVP対応するか。

## 行・折り返し検出

- ExtendScriptで実際の行境界をどのDOM情報から安定して取得するか。
- point text / area text / path textで同じ方式が使えるか。
- 明示改行と自動折り返しをどこまで区別できるか。
- 1語が3行以上へ分かれた場合のsplit hint UIをどうするか。

## Tokenizer

- カタカナ、数字、英字を含む語をどう扱うか。
- `第3展示室` のような混在表記を自動でどこまでまとめるか。
- 括弧内がかな交じりの場合の初期分割規則。
- 送り仮名を含む語の扱いを単純な「ひらがなで分割」でよいか。
- 人名等で漢字列を自動分割する必要があるケースをどう扱うか。

## UI

- ScriptUIでMVPを作るか。
- persistent panel等へ移行可能なUI/domain境界を最初から設けるか。
- Illustrator上のcaret / TextRange selectionをどこまで安定して取得できるか。
- 長文review一覧と局所編集をどう結びつけるか。

## Reading

- MVPで一般読み候補を導入するか、まず辞書＋手入力に限定するか。
- 将来の形態素解析器／外部helperをどのプロセス境界へ置くか。
- 辞書ファイル形式、案件辞書の保存場所、共有方法。

## Compatibility

- Illustrator対応バージョンの下限。
- ExtendScript単一JSXをどこまで維持するか。
- Windows / macOS差異。

## Repository strategy

- A. 現行実装の延長
- B. 同一リポジトリ内でlegacyを固定しv2を再実装
- C. 別リポジトリで新規実装

Sol分析とAtlas分析を比較した後に決定する。
