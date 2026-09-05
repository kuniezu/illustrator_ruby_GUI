# Sol Analysis — Risks and Decision Points

更新日: 2026-09-05
状態: Sol independent analysis / non-normative

## 1. Persistence risk

`TextFrame.note`へtool-owned IDを書けることはPhase 1Aで確認したが、文書全体のAnnotation Storeとして十分かは未検証。

特に確認すべき点:

- noteの実用的なサイズ上限
- Unicode / serialization
- duplicate / copy-paste時のID複製
- object削除・再作成時のidentity
- Illustrator version差
- Store破損時のrecovery

## 2. Line boundary risk

v2の特徴である「論理語は1語、折り返し時だけRender Segment分割」を実現するには、Illustrator DOMから実際のvisual line境界を安定して取得できる必要がある。

ここは実装前にPoCすべき最重要項目の一つ。

- area text
- point text
- vertical text
- explicit return
- automatic wrap
- letter spacing / mixed font size

で挙動を確認する。

## 3. Tokenization risk

「連続漢字列を基本語候補」「ひらがなで分割」はMVPとして分かりやすいが、日本語一般の形態素境界とは一致しない。

これは欠陥ではなく、展示制作上の初期候補ルールとして意図的に採用するもの。ただし送り仮名、数字混在、カタカナ混在等をどう扱うかはuser workflowを見ながら拡張する。

manual split / mergeが常に逃げ道として必要。

## 4. Reading split risk

折り返し時にreading split位置を人間へ聞く方式は、単漢字reading mappingを避けられる一方、長い語が頻繁に異なる位置で折れる文書では確認回数が増える。

軽減策候補:

- split hintの再利用
- 同じ語のhintを文書内で共有するオプション
- 将来辞書へsplit hintsを持たせる
- 自信が高い場合のみ自動候補を提示し、人間が承認

MVPではまず文書内hintのみで十分と考える。

## 5. Physical grouping risk

本文を動かした瞬間にルビも一体移動させるにはphysical groupingが最も単純だが、既存group / clipping / z-order / selection UXへ干渉する。

一方、groupingしない方式はsource textを侵襲しにくいが、tool再実行までルビが旧位置に残る可能性がある。

v2ではこの論点をsemantic persistenceとは別のPoCとして比較する必要がある。

## 6. ScriptUI / panel risk

ScriptUIは配布が容易だが、persistent review workflowやIllustrator selection連携には制約がある可能性がある。

最初のMVP UIをScriptUIで作るとしても、domain/application layerがScriptUIを直接参照しない構造にする。これにより将来panelへ移行しやすくする。

## 7. Legacy compatibility risk

v2が現行v1のgenerated Ruby layerやPhase 1A metadataを自動移行する必要があるかは未決。

初期v2では:

- legacy文書を読み取り専用で検出
- 明示的migration commandを用意

程度から始める方が安全な可能性がある。

PR #8の途中状態まで自動修復することはMVP非目標としてよい。

## 8. Repository strategy risk

同一repo v2の利点は知見継承だが、legacyとv2が混在すると利用者がどちらを使うべきか分かりにくくなる。

別repoは概念的に清潔だが、upstream license・履歴・Issue知見が分散する。

比較後にBを採る場合も、READMEでlegacy/v2 statusを明確に分ける必要がある。

## 9. Atlas比較で特に見たい論点

Atlasには次をSolと独立に判断してほしい。

- Annotation Storeの最適な保存単位と媒体
- physical host/groupingの必要性
- visual line boundaryの取得戦略
- Logical Annotation / Render Segment分離の妥当性
- sparse split hint方式の弱点
- ScriptUIをMVPで採る妥当性
- 同一repo v2 vs 別repo
- 現行layout codeの実際の再利用率

Sol案と異なる提案を歓迎する。
