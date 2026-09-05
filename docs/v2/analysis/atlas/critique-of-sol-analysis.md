# Atlas — critique of Sol analysis

分析日: 2026-09-05 / 非規範的な比較意見。

対象は `fabccb8ef072d58a5a54367ad357ce69092d30a5` のSol全4文書。specとfindings、current main、Issue/PR、upstreamを先に読み、現行のcreate-only flow、実行行の未取得、生成物保存の制約から暫定結論を作ってからSol案と比較した。Sol文書は変更していない。

## 1. 同意する点と独立した根拠

| Solの判断 | Atlasの評価 | 根拠 |
|---|---|---|
| 一回生成からAnnotation管理へ中心を移す（architecture §1–2） | 同意 | mainの復元はGUI値へ戻すだけでrecordIdを保持せず、再実行は新規生成する |
| Logical AnnotationとRender Segmentを分離（architecture §4） | 同意 | specの1語→複数行→1語への復帰を、読み・校正判断を失わず表現できる |
| native UUIDの永続利用をやめる（reuse表） | 同意 | PR #8デバッガで旧wrapper/recordと現本文UUIDの不一致が確認された |
| physical groupをsemantic identityから分離（architecture §5） | 同意 | groupedでも読み保存/更新安全性は保証されず、逆にStoreはgroupを必須にしない |
| 同一repoでv2再実装B（architecture §7） | 同意 | 現行の小変更ではGUI index・旧生成構造の互換を抱える。履歴と実機根拠は同repoで残したい |
| 読みproviderとTokenizerを分離、IMEをMVP必須にしない | 同意 | specの展示用語単位と手動境界は解析器の分かち書きと一致を要しない |
| 行境界取得と永続化を初期PoCに置く（risks §1–2） | 同意 | ここが成立しないとv2のsave/reopenと折り返しを実現できない |

大枠で同じ結論になっても、以下の選択・契約はSol案からそのまま採用しない。

## 2. 異論・異なる優先順位

### 2.1 文書集中Storeを第一候補として固定しない

Sol candidate §3の「source noteにはID、Annotationは文書内専用container」は妥当な比較案だが、初手としては媒体・専用物探索・copy時の分断を増やす。Atlasは、単一frameのSourceBundleを本文noteへ保存するPoCから始める案を推す。生成物を全て消しても意味が残り、sourceコピー時の局所的な可搬性も検証しやすい。

これはnoteの容量を保証する主張ではない。集中Storeは大容量、source削除後のorphan保護、文書共有styleに有利であり、POC-2の結果または復旧要求で採用を変える。二方式の完全ミラーは正本競合を増やすため最初から採らない。

### 2.2 UIを最後に回し過ぎない

Sol candidate §9はV2-3のhintの後にV2-4 review UIを置く。完成GUIを先に作らない点には同意するが、最小reviewは最初のround tripへ接続したい。曖昧anchorや不自然な読み分割を、人が特定・解決・保留できることが製品成立条件だからである。純粋関数とobject数だけの成功では、長文の校正負担を評価できない。

### 2.3 複雑frameの「安全なfallback」を自明にしない

Sol candidate §6のhost化できない場合のfallbackは、技術的にはnon-groupが考えられる。しかし再renderまでルビが取り残される挙動は、通常host移動と同じではない。Atlasは対象範囲外の明示停止、または利用者が選ぶ同期方式とし、暗黙fallbackを推奨しない。

最初からhostを設ければ後付けより責務は整理できるが、同じIllustrator DOMのreparent、z-order、clippingリスクは残る。またhost内の本文だけをdirect-selectして動かす操作には追従を保証できない。

### 2.4 sparse hint共有を早く増やさない

Sol risks §4の同じ語のhint共有・将来辞書化は候補として理解できる。ただし同表記異読、読みrevision、manual merge、別出現での判断を持ち込む。MVPはAnnotation単位のhintに限定し、base/readingの版と複数hint全体の整合を先に成立させる。

## 3. 補うべき具体的な見落とし・不足

### 3.1 実機成功の証拠強度と現在のmain

Solはfindingsを適切に参照しているが、PR #8のGUI成功報告には実行ファイルのM表示とPR head一致未確認という留保がある。最新 `1f148d898...` は初回grouping回帰が報告されている。成功した途中版の観測を、最新PR全経路の合格へ広げない記録が必要である。

さらにcurrent mainの `readRubyFrameId` は依然UUID優先で、note優先の修正はPR #8側にある。「Phase 1でnote方式へ改善した」という説明だけでは、現行mainで何が使えるか曖昧になる。

### 3.2 再利用率とanchorの具体的限界

Sol reuse表は概念分類として有用だが、現行コードの実再利用率は示していない。Atlasでは1722物理行に対し62行、約3.6%をas-is候補と数えた。最終採用率や工数削減率とは区別する。

`isKanji("𠮷")` がfalse、`日日日` の `日日` を一意と誤判定する純粋関数実行例から、文字分類とanchorをそのまま持ち込めないことを確認した。UTF-16、表示文字、Illustrator Characters、outline indexの四者の対応を設計契約へ加える必要がある。

### 3.3 ID dedupeはコピー衝突解決ではない

Sol reuse表のrecordId dedupeの知見は、同一object再訪に限れば有用。別objectへコピーされた同じrecordIdを一件に潰すと、複製・矛盾・消してはいけない生成物を隠す。runtime object再訪とpersistent ID衝突を別データで検出する必要がある。

### 3.4 hintの失効と複数境界の整合

Sol candidate §7の境界2個だけの説明には、読み変更時の失効、複数hintを同時利用したときの単調性、3行以上で空読み/逆順になる場合、Unicode境界の規約が不足している。`readingRevision` と `baseTextRevision` を確認し、hintを再利用できない理由をreviewへ渡す契約を足す。

「語が折れたら人に聞けば分けられる」とも限らない。熟字訓など自然な分割がない場合の保留・本文組み直しを明記する必要がある。

### 3.5 Rendererの空・失敗・未解決と所有権

Sol candidate §5のdesired/current比較は必要だが、これだけでは失敗時に旧描画を消す危険を防げない。complete desired=0と、計測失敗の空配列、未解決で出力を作れなかったケースを区別する必要がある。

PR #8では非空allRubies条件で旧群を削除するため、全件消した場合の経路が欠ける。一致recordを含む群全体の削除も、混在するユーザー物の保護を保証しない。削除対象の所有権はleafとcontainer両方で検査し、未知・manual・競合を自動削除しない契約が必要である。

Store保存とDOM適用は一つの原子的操作ではない。更新途中の例外、旧群削除失敗、途中状態を保存後に再openした場合を、PoCと復旧プロトコルに含めるべきである。

### 3.6 upstream layoutは副作用ごと移植できない

Sol reuse表のupstreamアルゴリズム再利用は方向として賛成だが、具体的な持込禁止境界が必要。`adjustAki` と `convertJukugoRubys` は本文のkerning/akiを変更する。これをそのまま使うと本文行が再変化してhintとlayoutが循環し得る。

`determinePositions` は毎ルビoutline化、jukugoは各字reading、`jis` は1-2-1であり、現行の1frame1回計測、v2 sparse hint、Issue #9の同幅両端ぞろえとはそのまま一致しない。抽象的に「layout知見を移植」だけで作業を開始しない。

### 3.7 読み確認と描画状態、手動境界の保存場所

Sol candidateのstate案はreviewStatus併記まで示しているが、UI例ではconfirmed/review/suppressedが同じ欄に並ぶ。抑制中でもanchor reviewが必要になり得るので、enabled、placementMode、reviewReasons、readingConfirmedを分離したい。

manual overridesをAnnotation内部にだけ置くと、再tokenizeで元Annotationが消える時に判断が消えやすい。frame側に原文アンカー付き境界判断を保持し、再解決→保護→新候補の順序を明示する方がよい。

### 3.8 手動補正と直接編集の競合

相対offsetを持つだけでは、本文移動とruby dragの区別、一行から複数行へ分かれた時の補正継承、manual物の削除保護は決まらない。初期はUIで確定した補正を基準とし、直接編集の取込みは旧標準位置・source変形が判別できる時だけ行う案を推す。

## 4. 過剰設計になり得る点と単純化

Solのmodule mapは責務一覧として有用で、全moduleを独立serviceにする要求とは読まない。ただし、そのまま実装ディレクトリ・interface・classを全て先行作成すると、小さなJSXの配布・デバッグに不要な配線を増やす。

初期は次まででよい。

- 5境界（UI/Application/Domain/Store/Adapter）とplain data、決定的なplan関数。
- 1コマンド1source frame。全文書indexは一時的に構築し、永続的な依存グラフや差分cacheは性能が必要とするまで作らない。
- 手入力＋文書内確定読み＋辞書のprovider境界。汎用plugin登録機構やnative helper配布は先に作らない。
- frame単位の完全な再計測。文字単位の常時reading alignmentを導入しない。
- runtime line keyとAnnotation相対baseRangeによるsegment key。画面行番号やgeneration連番を永続意味IDにしない。
- 少数のreview理由と具体的な復旧操作。自動修復を広く実装して曖昧性を隠さない。

一方、version検査、衝突検出、hint失効、所有権、安全な失敗は後回しにすべき複雑さではない。誤った本文へ確定読みを付ける、他者物を消す、校正判断を失うことを防ぐ最小の契約である。

## 5. 比較後の推奨

B戦略、Annotation正本、Logical/Render分離、DOM隔離、native UUID不採用という大枠は維持する。実装を始める前に、保存単位はPOC-2で比較し、actual line map、ID衝突、hint整合、Rendererの空/失敗/所有権、最小reviewの校正体験を先に検証する。

Sol案を否定するために別構造を増やすのではなく、未実証の集中Storeや常駐基盤への投資を遅らせ、その分を具体的な失敗条件の検証に回す。判断変更条件と試験手順は [risks-and-poc](risks-and-poc.md)、設計の具体案は [candidate-architecture](candidate-architecture.md) に記載した。
