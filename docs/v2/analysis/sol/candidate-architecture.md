# Sol Analysis — Candidate Architecture

更新日: 2026-09-05
状態: Sol independent analysis / non-normative

## 1. Candidate module map

```text
src/v2/
  domain/
    ruby-annotation
    ruby-style
    review-state
    split-hint

  application/
    analyze-selection
    reconcile-document
    update-annotation
    render-document
    review-navigation

  illustrator/
    dom-adapter
    metadata-adapter
    measurement-adapter
    selection-adapter
    layout-analyzer

  persistence/
    annotation-store
    migration

  tokenizer/
    rule-tokenizer
    manual-boundary-overrides

  anchors/
    anchor-resolver

  layout/
    ruby-layout-engine
    render-segment-builder

  renderer/
    managed-object-reconciler
    render-object-tags

  reading/
    dictionary-provider
    manual-provider
    provider-chain

  ui/
    review-ui
```

実際のExtendScript配布形態が単一JSXであっても、設計・ソース責務はこのように分離しておく。

## 2. Domain model候補

```text
RubyAnnotation
- annotationId: tool-owned stable ID
- sourceFrameId: tool-owned stable ID
- baseText
- anchor
  - approximateStart
  - beforeContext
  - afterContext
- reading
- segmentation
  - logical grouping
  - manualSplit / manualMerge overrides
- state
  - auto / auto_offset / manual / suppressed
  - reviewStatus
- stylePresetId
- offset
- splitHints[]
- schemaVersion
```

`RenderSegment`は永続domainの中心に置かず、現在のlayoutから導出するprojectionとする。

```text
RenderSegment
- annotationId
- segmentIndex
- baseRange
- baseText
- readingSlice
- measuredBounds
- standardPlacement
```

## 3. Persistence candidate

Solの第一候補は、**小さなobject tagと文書単位Annotation Storeを分離する複合方式**。

例:

- source TextFrame.note: `sourceFrameId`だけをnamespaced markerとして保持
- generated ruby object.note: `annotationId` / `renderSegmentId`等のmanaged tag
- Annotation Store本体: 文書内の専用metadata containerにversioned serialization

利点:

- 各生成TextFrameへ全Annotation JSONを複製しなくてよい。
- generated objectが壊れてもAnnotation Storeから再生成しやすい。
- source frame identityだけは対象TextFrame自身へ残る。
- store migrationを文書単位で管理しやすい。

ただし「文書内metadata containerを何で実現するか」は実機PoCが必要。`note`のみで完結する案、専用hidden object案、sidecar案と比較する。

## 4. Document reconciliation flow

AIを開いてv2を実行したとき:

```text
load store
  -> discover tagged source frames
  -> read current source text/layout
  -> resolve saved anchors
  -> tokenize current text
  -> apply manual boundary overrides
  -> compare current logical units with saved annotations
  -> preserve exact matches
  -> propose merges/splits where source changed
  -> unresolved -> review
  -> build render segments from current line layout
  -> reconcile managed render objects
```

ここで「再編集」はspecial modeではなく、通常のreconcile処理になる。

## 5. Renderer candidate

Rendererはcreate-only APIではなくreconcilerとする。

入力:

- desired render segments
- current managed objects

処理:

- desired/currentのkeyを比較
- 存在しないものcreate
- 存在するものupdate
- staleなものdelete

managed key例:

```text
annotationId + layoutGeneration-independent segment key
```

segmentの位置が変わっても可能な限り同じmanaged objectを更新する。ただし1segment→2segment等ではcreate/deleteを行う。

同じdesired stateを何回適用してもobject数が変わらないことを自動テスト対象にする。

## 6. Physical host candidate

本文移動時にルビが即時追従するUXを優先するなら、1 source frameにつき最大1個のmanaged hostをv2開始時から導入する案を検討する。

```text
rubyHost_<sourceFrameId>
  source body TextFrame
  managed ruby container
    render objects...
```

ただし以下を設計契約にする。

- hostは1個のみ。host内にhostを作らない。
- host existenceはsemantic identityではない。
- Storeからhostを修復・再構築できる。
- complex parent / clipping / threaded text等ではhost化せず、安全なfallbackを使える。
- Rendererの更新時にbodyを再parentし直さない。

この案はPR #8コードの再利用ではなく、「transform couplingだけを担当するpresentation mechanism」として新規評価する。

別案としてbodyを移動せずrubyだけsiblingsに置き、tool実行時にrerenderする方式もPoC比較する。

## 7. Fold / split hint flow

1. Annotation `日本庭園 / にほんていえん` を保持。
2. Layout Analyzerが現在のbase rangeを `日本 | 庭園` と2 visual segmentsに検出。
3. `baseBoundaryAfter=2` に対応するsplit hintを検索。
4. hintがあればreadingを自動slice。
5. なければUIへ「読みをどこで分けますか？」を1回だけ出す。
6. `readingBoundaryAfter`を保存。
7. 再layoutで一行になれば1segmentへ戻す。hintは保存したまま未使用。

これにより単漢字reading mappingを導入せずに済む。

## 8. Minimal review UI candidate

最初のUIは大画面の全文字グリッドより、小さいreview dialog / panelでよい。

表示候補:

```text
本文: 日本庭園
読み: にほんていえん
状態: confirmed / review / suppressed
語境界: [split] [merge]
配置: auto / offset reset
[前の要確認] [次の要確認]
```

行折り返し時だけreading split dialogを追加する。

完成後、document overviewやfilterを増やす。

## 9. Development sequence candidate

### V2-0 — Architecture PoC

- storage方式の比較
- stable sourceFrameId round trip
- actual line boundary取得
- managed renderer idempotency
- physical hostあり/なしのtransform test

### V2-1 — Single annotation round trip

- 1TextFrame
- 1Logical Annotation
- save/reopen
- current anchor resolve
- render/re-render x3で増殖なし

### V2-2 — Word tokenizer + manual boundaries

- continuous kanji candidate
- hiragana boundary
- parentheses
- manual split/merge

### V2-3 — Fold split hints

- 1→2 segment
- split dialog
- saved hint reuse
- 2→1 segment restoration

### V2-4 — Review UI

- reading edit
- suppress
- next/previous review
- local offset

### V2-5 — Dictionaries / bulk review

- document/project/common layers
- total-ruby workflow

この順序なら、現行Phase 1で最も苦戦したpersistence / lifecycle / idempotencyを先に固定できる。
