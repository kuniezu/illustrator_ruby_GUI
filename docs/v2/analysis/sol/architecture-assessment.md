# Sol Analysis — Architecture Assessment

更新日: 2026-09-05
状態: Sol independent analysis / non-normative

この文書は `docs/v2/spec/` を要求として読み、現行実装とPhase 1実験結果からSolが独立に行った設計分析である。要求仕様そのものではない。

## 1. 結論の要約

現行実装の主モデルは「GUI入力値から一度ルビを生成するスクリプト」であり、v2の主モデルは「本文にひもづくRubyAnnotationを長期間管理し、必要に応じて描画を更新するシステム」である。

両者は処理の中心が異なる。そのため、現行GUI・rubyData・Rubyレイヤー・placeRubys()の制御フローを中心に拡張し続けるより、**現行コードをreference implementationとして固定し、v2のdomain / persistence / renderer / UI境界を先に作る**方が安全と考える。

## 2. 最も大きいアーキテクチャ差

現行:

```text
selection
  -> character-index GUI
  -> transient rubyData
  -> placeRubys()
  -> Illustrator objects
```

v2候補:

```text
Illustrator Source Text
  <-> DOM Adapter
  <-> Annotation Store
       |-> Tokenizer / Word Boundary Rules
       |-> Anchor Resolver
       |-> Reading Provider
       |-> Review State
       v
     Layout Analyzer
       v
     Layout Engine
       v
     Renderer
       v
Illustrator Managed Ruby Objects

UI <-> application services <-> domain model
```

生成オブジェクトから意味を推測して戻すのではなく、Annotation Storeを正本にする点が本質的に異なる。

## 3. 推奨する責務境界

### Illustrator DOM Adapter

Illustrator固有DOMへのアクセスを隔離する。

責務候補:

- selection取得
- TextFrame内容・orientation・line情報取得
- note等metadata read/write
- create/move/remove PageItem
- `createOutline()`を使う測定
- locked / hidden / clipped等の安全判定

上位層へ生のDOM objectを極力漏らさない。

### Ruby Annotation Model

Illustratorオブジェクト階層と独立した意味データ。

中心情報:

- annotationId
- sourceFrameId
- baseText
- anchor descriptor
- reading
- logical grouping
- manual segmentation overrides
- state
- style preset
- relative offset
- split hints

### Persistence Store

AnnotationとsourceFrameのtool-owned identityを保存・version管理する。

`note`が実機で使えることは分かったが、全文書データを各object.noteへ分散させるかは別問題である。v2では「IDタグ」と「Annotation Store本体」を分ける案を比較すべき。

### Tokenizer / Ruby Unit Resolver

展示制作上のルビ候補単位を決める。

一般形態素解析とは別責務とする。初期は仕様にある連続漢字列、かな境界、括弧、manual split/merge等の決定的ルールを優先する。

### Anchor Resolver

保存済みAnnotationを現在本文へ再対応させる。

frame ID + baseText + context + approximate positionを使い、一意でない場合はreviewへ送る。

### Layout Analyzer

現在のIllustrator組版から、論理語がどのvisual line / segmentへ分かれているかを取得する。

ここで初めて行折り返しを扱う。

### Ruby Layout Engine

DOMから独立した計算ロジックとして、親文字bounds、ruby metrics、orientation、style、split hint等から標準配置を計算する。

`createOutline()`等の実測はDOM Adapter / measurement layerで行い、Layout Engineには正規化したmetricsを渡す方がテストしやすい。

### Renderer

Annotation + layout resultをmanaged Illustrator objectsへ投影する。

重要要件:

- create/update/deleteの明確化
- idempotent
- stale segment cleanup
- 他オブジェクト非破壊
- generated objectはprojectionであり正本ではない

### UI / Review Workflow

UIはdomain stateを編集する。直接ruby TextFrameを生成する責務を持たせない。

長文向けには:

- current annotation
- reading
- split / merge
- suppress
- review state
- next / previous review
- local offset

を中心にする。

### Reading Provider

Tokenizerとは独立し、辞書・将来の解析器等からreading candidateを返す。

## 4. 「論理語」と「Render Segment」の分離

v2の特徴として重要なのは、1語=1生成TextFrameを固定しないことだと考える。

```text
Logical Annotation:
一張羅 / いっちょうら
```

は正本として1件のまま保持する。

現在の組版が:

```text
一張 | 羅
```

ならRenderer入力では2 segmentへ展開する。

```text
segment A: 一張 / いっちょう
segment B: 羅   / ら
```

この分離により、テキストフレーム幅変更で一行に戻ってもAnnotationを破壊・mergeし直す必要がない。

全文字alignmentを保持せず、実際に必要になった読み境界だけsplit hintとして追加する設計は、データ量と編集負担の両方を小さくできる。

## 5. Physical groupingはsemantic modelから分離する

PR #8では、本文とルビを一体移動させる要求と、本文identity、metadata読込、再編集構造がwrapperへ集中した。

v2では:

- semantic identity = Annotation Store / sourceFrameId
- rendering identity = annotationId / renderSegmentId
- transform coupling = physical host/group strategy

を別問題として扱うべき。

本文とルビを即時一体移動させる必要が強い場合、v2で最初から**source frameごとにちょうど1つのmanaged host**を設ける案は再評価できる。ただしhost名や階層をAnnotationの正本にはしない。Rendererがhostを新規生成する条件と再利用する条件を明示し、nested hostを構造上作れないようにする。

一方、groupingを使わずrerender追従する案も比較する必要がある。特に既存複雑groupとの互換性、ユーザーの通常移動操作、persistent panelの有無によって最適解が変わる。

## 6. v2で最初に作るべきもの

コード実装へ進む場合、最初に完成GUIを作るのではなく、次の小さいvertical sliceが適切と考える。

1. 1つのTextFrameへtool-owned sourceFrameIdを保存
2. 1つのLogical RubyAnnotationをStoreへ保存
3. save/reopen後にAnnotationを再取得
4. Anchor Resolverで同じbaseTextへ再対応
5. Layout Analyzerで1行か折り返しか判定
6. Rendererがmanaged objectをcreate/update/delete
7. 同じ処理を3回実行してobject数不変を確認
8. その後に最小review UIを接続

つまり、**GUIより先にround-trip persistence + idempotent rendering contractを確立する**。

## 7. Repository strategyの暫定評価

Solの暫定推奨はB:

**同一リポジトリ内で現行版をreference/legacyとして固定し、v2を新しい構造として再実装する。**

理由:

- 現行コードとupstreamのlayout知見を参照しやすい。
- Phase 0/1の実機知見を同じ履歴で追える。
- ライセンス由来を明確に保ちやすい。
- v2で実際に再利用率が低いと判明してから別repoへ分離できる。

ただしこれはSol分析であり、Atlasには独立にA/B/Cを比較してもらう。
