# 03 — Reading, Dictionary, Style

更新日: 2026-09-05
状態: Draft 0.1 / user + Sol consensus

## 1. Reading Providerの位置づけ

語境界を決めるTokenizerと、読み候補を出すReading Providerを分離する。

Tokenizerは展示制作上のルビ単位を決める。Reading Providerは、その単位に対して読み候補を返す。

Reading Providerの結果は候補であり、固有名詞、地名、歴史用語、専門語等を無確認で確定しない。

## 2. MVPでの読み取得

IMEのnative APIを直接呼び出す方式はMVP必須としない。配布、Windows依存、native helper、Mac対応等の複雑さを本体へ持ち込まない。

MVPでは次を優先する。

- 手入力
- 文書内で確定した読みの再利用
- 案件辞書
- 共通辞書
- 必要なら比較的単純に導入できる一般読み候補

Reading Providerは差し替え可能な境界として設計し、将来IME、形態素解析器、外部helper等を追加できるようにする。

## 3. 辞書の優先順位

将来的な基本順序:

1. document-local override
2. project / exhibition dictionary
3. shared museum/common dictionary
4. generic reading provider
5. unresolved / review

同じ表記に複数読みがあり得るため、辞書一致も文脈や案件によってreview可能にする。

## 4. 修正の適用範囲

読みを修正した際、将来的に次の範囲へ反映できる設計を希望する。

- この出現箇所だけ
- この文書
- この案件
- 共通辞書

実案件固有の辞書データは公開リポジトリへコミットしない。

## 5. Ruby Style

ルビ書式はstyle presetとして扱える構造を希望する。

初期候補:

- 展示本文
- キャプション
- 小学生向け総ルビ

特定フォントを必須依存にしない。親文字の書式を基本に、設定・presetで上書きできること。

基本的に扱いたい値:

- font
- color
- ruby size ratio
- gap ratio
- tracking policy
- long-reading policy
- horizontal / vertical placement policy

可能な限り絶対値より親文字に対する比率を利用する。

## 6. 長い読み

読みが親文字幅より長い場合、一律縮小だけにしない。

段階的な候補:

1. 標準サイズ・標準字間
2. トラッキング調整
3. 設定された下限まで縮小
4. 許容する場合は親文字側への進入・はみ出し
5. それでも不適切ならreview

最終的な日本語組版ルールはLayout Engineの責務として検討する。

## 7. 総ルビと学年別

将来、総ルビモードでは個々の漢字を手動で選ぶことを前提にしない。

- 漢字を含む語候補をまとめて抽出
- 読み候補を付与
- 要確認だけ重点確認
- 一括描画

現行の学習漢字データは、学年別にルビを省略する機能の参考・再利用候補とする。
