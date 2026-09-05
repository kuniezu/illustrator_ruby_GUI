# Atlas — candidate architecture

分析日: 2026-09-05 / 全て比較・PoC用の設計提案。specの未決事項を確定しない。

## 1. 最小の責務境界

最初から多数のservice/classを作らず、次の5境界を関数とplain dataで表せばよい。ソース分割と単一JSXへの配布は別問題である。

```text
Review UI → Application（校正コマンド、再照合、保存/描画の手順）
                 ↕
           Domain（Annotation、境界、anchor、hint、配置計画）
                 ↕
           Store（意味データの読み書き、schema検査）
                 ↕
           Illustrator Adapter（選択、計測、タグ、DOM更新）
```

Reading ProviderはDomainへ候補を返す関数境界にする。RendererはApplicationが計画をAdapterへ適用する責務であり、DomainからIllustratorオブジェクトを直接操作しない。初期実装は1回のコマンドで1source frameを更新する。文書全体のreview一覧は各frameを集めて構成できる。

## 2. RubyAnnotationと状態

以下は型契約の例であり、採用済みschemaではない。

```text
SourceBundle
  schemaVersion, sourceFrameId, revision
  textSnapshot（原文をそのまま保持）、indexConvention
  annotations[], manualBoundaryOverrides[], styleSnapshots[]

RubyAnnotation
  annotationId, sourceFrameId
  anchor: startHint, baseText, beforeContext, afterContext
  reading, readingRevision, readingProvenance
  grouping: word（必要なら明示的monoを将来追加）
  enabled: true / false                 ← falseがsuppressed
  placementMode: auto / auto_offset / manual
  reviewReasons[], readingConfirmed
  stylePresetId, styleSnapshotVersion
  offset: inlineEm, blockEm
  splitHints[]
```

`suppressed` と `manual` と `review` を一つの排他的enumに詰め込まない。抑制中でも本文アンカーが曖昧になり得るし、読み確定済みでも新しい折り返しだけが要確認になり得る。specの状態候補を失わず直交する属性へ写像する。

一つの確認済み範囲に競合するAnnotationを自動で重ねない。ID、範囲、baseText、reading/hintの整合、schema versionをload時とcommit前に検査する。未知version・壊れたpayloadは読み取り専用の診断へ送り、空データ扱いで再保存しない。

## 3. Persistence Storeの比較

| 媒体・単位 | 利点 | 主要な不利益 | 初期判断 |
|---|---|---|---|
| 本文TextFrame.noteに1frame分のBundle | 本文と意味が同居。全ルビ削除後も復元可能。専用object不要 | 容量・コピー時のID衝突・本文削除による喪失・大きなnote更新 | **最初に検証する候補** |
| sourceにはIDのみ、文書内専用metadata containerに集中保存 | 全文書の整合・style共有・orphan管理がしやすい | 保存場所自体の実機検証、sourceコピー時のStore欠落、専用物の削除・非表示管理 | frame noteが容量等で不適なら次候補 |
| generated objectにAnnotation本体 | 配置物から読める | suppressed/未描画/削除で意味が失われる。segmentごとの複製競合 | 正本として不採用。v1移行の入力だけ |
| sourceから独立した各Annotationの専用object | 個別保存しやすい | 非描画object数・走査・孤児管理が増える | MVPでは非推奨 |
| 隠しTextFrameのcontents等 | 大きいpayloadを置ける可能性 | export・アウトライン化・検索・ユーザー編集への混入を検証要 | note/container PoCと比較 |
| sidecar JSON | 大容量、バックアップ、外部helper連携 | AI単体受渡し・別名保存・移動で外れやすい | 補助export/import。唯一の正本にしない |

Storeのinterfaceは `load(source)` / `save(source, expectedRevision, bundle)` 程度に抑える。frame noteが合格すれば物理保存単位もframeとし、文書内の一時indexは起動時に再構築する。案件・共通辞書は外部でも、確定済み読み・使用style値はAI内に残し、別PCで外部ファイルがなくても読みを失わない。

noteは他者の内容をそのまま保持するnamespaced envelopeとし、区切り文字を含む本文、複数marker、破損markerを検出する。書込み後read-back一致を要求する。長文の容量・save/reopen保持が未検証なので、分割保存や圧縮を最初から実装せずPoCで媒体を決める。

本文削除後にも復旧用意味データを残す要件が強い場合、frame note単独では足りない。文書Storeまたは明示backup exportへ判断を変える。これは現在のopen questionsの比較事項である。

## 4. Source identityと複製

tool-owned sourceFrameIdを初回登録時に作って永続化し、以降native UUIDは同一実行中の探索補助に限定する。ID生成は衝突しにくい値に加えて文書内の重複検査を行う。nameや現在の本文一致だけでframeを決定しない。

同じnoteを持つコピーが現れる場合を想定する。`sourceFrameId → object[]` のindexで0件/1件/複数件を区別し、複数件をdedupeで隠さない。ユーザーが「独立したコピー」と確認した時だけ、そのframe、annotations、render tagsを整合する新IDへ付け替える。別文書へのsourceだけのコピーは、意味データが同居していれば読みを回収しやすいが、コピー時保持はPoC対象である。

実行中のDOM object再訪はruntime identityで一度だけ走査する。一方、別objectの同じIDは衝突である。ソースIDの一意性確認前に「最も近い本文」を選ばない。store欠落・タグのみ・本文のみを別の復旧状態として見せる。

## 5. Anchor Resolverと再tokenizeの順序

1. Storeのschemaとsource identityを確認し、現在本文をsnapshotとして取得する。
2. 本文が完全一致なら保存範囲のbaseText一致と範囲内性を検証して復用する。
3. 本文が変わった場合、既存Annotationとmanual boundaryを先に再解決する。baseTextの全候補を、重なる出現も含め列挙する。
4. context、旧snapshotとの対応、既知の手動境界から一意に裏付けられる候補だけ自動解決する。旧startへの近さは候補表示順の補助とし、同点や矛盾を自動確定しない。
5. 複数Annotationが同じ範囲を奪い合う場合もreview。0候補、context変更、語内部編集、source消失は理由付きで残す。
6. 確定した手動範囲を保護した上で、未対応部分へTokenizerを適用する。旧範囲が失われても抑制・手動境界を黙って捨てず、未解決の旧判断としてreviewに残す。

一般的な曖昧文字列検索や全文diff基盤はMVP必須にしない。初期は厳密候補＋人間確認で始め、実測した要確認率が高い時だけ照合方式を広げる。正規化比較を導入する場合も、正規化後のindexを原文のDOM添字へ直接渡さない。

`indexConvention` は明示する。初期候補は原文UTF-16 code unit offsetを保存し、UIの表示文字境界とIllustrator Charactersの対応表をAdapterが持つ方式。補助面漢字・IVS・結合文字の途中を選べないようにする。Charactersが常にJS文字列と同数という旧requirementsの説明を、未検証の入力へ一般化しない。対応が証明できない範囲は描画を止め、理由を表示する。

## 6. Tokenizerと手動境界

連続漢字列、かな・句読点・空白の境界、括弧内外の独立というspecの規則を決定的に実装する。括弧には対応関係を持つ小さなstackを使う案とし、閉じ忘れ・入れ子も原文を変更せず扱う。括弧自体をルビ親文字に含めるかはUIで明示する。数字・英字・カタカナ・送り仮名混在の統合は未決のまま候補と手動mergeへ渡す。

manual splitは境界の両側context、manual mergeは保護する範囲と内部境界の統合判断を保存する。元Annotationの中だけに判断を埋めると、再tokenizeでそのAnnotationが消えた時に判断も消えるため、SourceBundleにoverrideを保持する。

明示改行は強い境界。削除されたら新しい連続語候補を提示できるが、旧readingの単純連結を確定にしない。自動折り返しではAnnotationをsplit/mergeしない。

## 7. 実際の行とRender Segment

Adapter候補はTextFrame/textRangeの `lines` 等から各行のTextRangeを取得し、そのstart/endを原文範囲へ対応させる方式。プロパティ名が存在するだけでは十分でなく、実際の折り返し・改行文字・overset・縦組で範囲が一致することをPoCで確認する。

返却例:

```text
LayoutSnapshot
  sourceRevision, layoutFingerprint
  indexMap
  lines: [{ runtimeLineKey, sourceStart, sourceEnd, orientation, metrics }]
  unavailableRanges[], measurementErrors[]
```

Annotation範囲と各実行範囲の交差をRender Segmentにする。point textの明示改行、area textの自動折り返し、path text、threaded storyは同じと仮定しない。テキスト内容だけのhashでは幅・フォント・行送り変更を検出できないので、コマンド開始時にレイアウトを再取得する。UI編集中に文書が変わった場合は適用前にもsnapshotの整合を確認する。

DOM行範囲取得が不十分なら、文字/挿入位置測定とoutlineの照合を比較する。ただし字形Yの近さだけを行判定の正解にせず、混在サイズ・回転・縦組・空白で検証する。未対応の組版に推定座標を出して成功扱いにしない。

## 8. Sparse split hintの成立条件

```text
SplitHint
  baseTextRevision, readingRevision
  baseBoundaryAfter, readingBoundaryAfter
  confirmedByUser

RenderSegment（導出値）
  annotationId, key = annotationId + relativeBaseStart + relativeBaseEnd
  baseRange, readingRange, lineKey, standardPlacement
```

同じ `日本庭園 / にほんていえん` が `日本 | 庭園` へ折れた時だけ `(2,3)` を確認・保存する。一行なら未使用にして保持、同じ境界へ戻れば再利用する。行番号やsegmentIndexだけを永続keyにしない。

有効なhintは次を全て満たす必要がある。

- baseTextとreadingの版が一致し、両境界が文字の途中でない。
- 内部境界は範囲内で、本文境界の順と読み境界の順が整合する。
- 複数のhintを組み合わせた全segmentが読みを重複・欠落なく覆う。
- readingを変更した場合は数値位置をそのまま再利用しない。旧hintを履歴候補として無効化し、再確認する。
- manual split/merge後も旧hintを無条件移植しない。新範囲との対応とreadingを確認する。

3行以上では全ての実境界を同じreview画面で見せ、新しい境界だけ入力させる。別の折り返しで確認したhint同士が逆順になる場合、個別には確定済みでも全体は未解決とする。

熟字訓など、ある折り位置に自然な読み分割を与えられない可能性がある。文字数按分で埋めず、そのAnnotationの描画を保留し「本文の組み直し」または「人が分割・語単位を再検討」を選べるようにする。空reading segmentを許すかも未決として残す。同表記でも読み・出現文脈が違い得るので、hintの文書内共有や辞書化はMVPでは行わない。

## 9. Layout Engineと手動補正

Layout Engineには原文範囲のadvance/bounds、line軸、rubyの実測幅、style、隣接segment情報を渡す。フォント・色の取得と適用はAdapter側で行う。outlineはink boundsの補助であり、advanceや空白を完全に表すものとはしない。

同幅両端ぞろえを選ぶ場合は、親文字の何を左右端とするか（字形端/文字送り領域）を校正画像で決める。N個の文字間gapへ `(対象幅 - ruby実測幅)/(N-1)` を配る考え方は候補だが、Illustratorのtrackingとboundsにそのまま一致する保証はない。N=1は両端を同時に揃えられないため、中央配置等のpolicyを別に決める。

長い読みは標準→tracking調整→下限まで縮小→許可された進入→reviewの順で評価する。上下行や隣接ルビとの衝突も評価し、本文のkerning/akiを黙って変更しない。横組・縦組をinline/block軸へ正規化し、回転・非等方変形はPoC後に対応範囲を決める。

手動補正はinline/blockのem値を正本にし、標準位置から再適用する。GUIで補正を確定する経路を初期基準にする。直接ドラッグの検出には前回標準位置とsource変形の記録が必要で、単純な文書座標差では本文移動を補正と誤認する。本文とルビが両方変わって判別不能なら自動取込みしない。

一行の補正を複数segmentへどう継承するかは未決である。初期候補はAnnotation共通の補正、個別segment補正はそのbaseRangeに限定し、分割構造変更時はreview。`manual` は自動上書き・削除から保護し、構造変更が必要ならユーザー判断へ戻す。

## 10. Rendererの不変条件と更新手順

同じ入力では、同じ意味データと管理構造へ収束する。単なるobject数不変に加え、reading・style・suppressed・offset・tag・親子関係の一致を検証する。

所有タグは少なくともtool/schema、sourceFrameId、annotationId、segment key、生成revisionを含む。タグのない同名objectは変更しない。一つのmanaged descendantがあることだけを理由に祖先groupを削除しない。異なるobjectの同一keyは衝突として停止する。

1. read-only preflightでsource・Store・既存生成物・対応範囲・locked/hidden/clipping/所有権を検査する。
2. 全desired planを計算する。`complete`、`blocked`、`failed` を区別する。**completeで0件** は抑制/削除を反映する有効な計画、失敗して得られた空配列は削除命令ではない。
3. 追加objectをstagingへ作り、更新する既存objectの値を退避する。変更なしのkeyは再利用し、正常な既存segmentはupdateする。タグ・metrics・件数を検証する。
4. expectedRevisionと現在sourceを再検査し、更新計画に沿って適用する。stale削除は新結果を検証した後に限定する。未知・manual・競合objectは保護する。
5. 意味データと描画revisionを整合させ、結果をread-backする。途中失敗なら退避値の復元と今回作成物の撤去を試み、復元不能は「復旧要」と明示して自動再試行を止める。

安全判定はLayer/GroupItem/TextFrameごとのAPIに分ける。プロパティ読取り例外を一律false（安全）に変換せず、必須条件を判定できない場合はunknownとして停止する。直接選択されたTextFrameもrole/tagを調べ、生成ルビを新しい本文として登録しない。

Illustrator DOMにDB的な原子的transactionがあるとは仮定しない。Store書込みとDOM更新の間で停止すれば版がずれ得る。PoCではpending/committed revisionと小さな復旧記録をAI内に残す案を比較する。途中で保存されたAIを再オープンした時にも、最後の確定状態か明示的な復旧状態へ到達できることが採用条件。旧生成物を先に全消去する方式は採らない。

未解決Annotationの古い生成物は「不要segment」とは別である。初期はframe単位の適用を保留して既存状態を保持し、要確認・未更新を表示する案を推奨する。長文で部分適用が必要になれば、完全な計画を作れたAnnotation単位に限定する。欠落生成物はsuppressedとは扱わず、再生成対象か直接編集競合として通知する。

## 11. Transform coupling: hostとnon-group

| 方式 | 移動直後 | 再組版 | リスク |
|---|---|---|---|
| managed hostにsource+output | host全体の通常移動で連動を期待 | 字幅・行送り変更は再計算が必要 | 既存階層・z-order・clippingへの干渉。本文だけをdirect-selectすれば連動しない |
| 別objectのまま同期 | 再renderまでズレる | コマンド時に再計算 | 更新を忘れたまま出力する危険。常駐UIだけでは監視実現の証明にならない |
| 状況別に選択 | 単純frameはhost、複雑frameは明示的同期 | 共通の意味モデルとlayout | 動作の違いを利用者へ伝える必要 |

Atlasは **検証済みの単純frameに限るmanaged hostを製品候補** とし、non-groupをPoC比較対象にする。どちらもPoC合格前に既定にしない。複雑frameで黙ってnon-groupへfallbackすると「本文を動かせば一緒に動く」という期待が崩れるため、未対応表示または明示選択が必要。

host導入は初回登録コマンドで一度だけ行う。再renderはsourceを再parentせず、既存host内の生成物だけを更新する。host数はsourceあたり最大1。初回登録の失敗時には元親・位置・重なり順を復元できるか検証する。sourceが手動で取り出された場合は構造不一致を通知し、名前だけから自動再収容しない。Storeから生成物は再構築できても、任意のユーザー階層まで自動修復できるとは約束しない。

## 12. 長文review、Reading Provider、UI基盤

review行は本文前後context、読み、出所、未確認理由を表示する。理由は `anchor-ambiguous`、`reading-unconfirmed`、`split-required`、`layout-unavailable`、`direct-edit-conflict` 等を区別する。次/前、フィルタ、読み変更、抑制、split/merge、補正、自動位置へ戻す操作を用意する。

最小UIでも件数だけのalertへ戻らず、確認済みから次の要確認へ進み、後日の再開時に未解決判断を失わないことを先に試す。caret/TextRangeが取得できれば初期位置に使い、不能ならframe選択＋context検索で一意なAnnotationを選ぶ。文字範囲はUTF-16/DOM対応を検査する。

Reading Providerは `baseText + context + scope` から `candidates + provenance + review理由` を返す。Tokenizerのmanual boundariesを上書きしない。文書内の確定読み→案件辞書→共通辞書→任意の一般候補を優先するが、出現箇所の明示指定・suppressedは辞書より保護する。同表記の複数読みは候補のまま提示する。

「この箇所/文書/案件/共通」への適用は別操作にし、既存の確認済み出現箇所の上書きは差分を示す。辞書が更新されても保存済みreadingを無言で変更しない。IME native API、外部形態素解析helperはMVP必須にせず、後日同じprovider境界へ追加する。

UI第一候補は小さなScriptUI review dialog。配布が軽く、現行で起動経路がある。ただしmodal中のIllustrator選択・ズーム・直接編集・IME確定・DPIはPoC対象。常駐パネルは局所編集に利点があるが、採用時点のAdobe公式対応情報と実機でDOM橋渡し・署名/配布・OS差を再確認し、製品名だけで利用可能と決めない。Issue #7の薄いランチャーは起動改善であり、常駐UIの代替ではない。

## 13. Legacy migration

最初はv1/Phase 1Bの構造をread-only inventoryとして検出する。通常load中に旧wrapper suffixを本文noteへ書くような暗黙移行はしない。明示importでは元AIのコピー上で、v1 schema/record、source候補、context、重複ID、直接編集・欠落を一覧にしてから新Bundleを作る。

元v1の1字ルビを、読みを連結して勝手に確認済み熟語へ変換しない。無印生成物は幾何位置だけで本文へ自動紐付けしない。native UUIDしか残らないrecord、本文候補複数、ネストwrapper、内容の違う同recordIdはreviewへ送る。v1由来IDは来歴として保持し、v2 IDと区別する。

MVPで過去のPR #8全途中版を自動修復する必要があるかは未決。推奨は検出・手動再関連付け・確認付きimportまでとし、旧生成物の一括削除・旧本文の再構造化は別の明示操作にする。
