# 02 — Re-edit, Layout, and Persistence

更新日: 2026-09-05
状態: Draft 0.1 / user + Sol consensus

## 1. 再編集を前提にする

一度ルビを配置して終わりではない。AIファイルを保存・閉じる・再オープンした後も、同じAnnotationを再取得し、読み、ルビ有無、語境界、配置を修正できることを必須要件とする。

再実行のたびにRubyレイヤー、wrapper、ruby group、ルビTextFrame等が増殖してはいけない。描画更新は冪等であること。

## 2. Persistent ID

Illustrator実機検証でnative `TextFrame.uuid` が保存・再オープン後に変化するケースを確認したため、native uuidを永続識別子の正本として使用しない。

- tool-owned IDを文書内へ保存する。
- どこへ保存するかは設計段階で比較する。
- object `note`、文書内ストア、専用メタデータオブジェクト等を候補として評価する。
- native uuidは一時的なruntime識別補助として使う余地はあるが、永続対応の根拠にしない。

## 3. Anchor Resolver

絶対文字位置だけに依存しない。

Annotationは少なくとも次の手掛かりを保持し、本文編集後に再解決する。

- tool-owned sourceFrameId
- baseText
- approximate position
- beforeContext
- afterContext
- 必要に応じて既知の語境界情報

一意に解決できるときのみ自動追従する。複数候補、消失、大幅編集等で一意に決まらない場合は、推測で移動せず `review` / `unresolved` とする。

## 4. 本文移動・拡大縮小

通常ルビは本文の移動、文字サイズ変更、縦横組等に追従したい。

ただし「本文とルビを必ず物理的に1つのGroupItemにする」こと自体は要求ではない。

設計時に少なくとも次を比較する。

- 本文＋ルビを1つのmanaged host/groupに置き、変形を物理的に連動させる。
- 本文とルビを別オブジェクトとして保持し、再描画時に位置を同期する。
- 両者を組み合わせ、semantic identityとphysical groupingを分離する。

重要なのは、group/wrapper構造そのものを正本にしないこと。

## 5. LayoutとRender Segment

RubyAnnotationは論理的な語単位を保持する。

Rendererは現在のIllustrator組版を解析し、必要に応じて1Annotationから複数のRender Segmentを生成する。

例:

```text
Annotation:
日本庭園 / にほんていえん

current layout:
日本 | 庭園

Render Segments:
日本 / にほん
庭園 / ていえん
```

同じAnnotationでも、テキストフレーム幅や文字サイズが変わればRender Segment数は変わってよい。

## 6. 標準位置と手動補正

通常はRendererが本文から標準位置を再計算する。

最終位置は原則:

```text
standard position + relative manual offset
```

とする。

状態候補:

- `auto`: 標準位置のみ
- `auto_offset`: 標準位置 + 保存された相対補正
- `manual`: 完全手動扱い
- `suppressed`: この出現箇所では描画しない

本文サイズが変わっても再利用しやすいよう、offsetは可能なら親文字サイズ/em基準の相対値で保持する。

## 7. 削除と抑制

「生成物を削除した」と「この箇所ではルビ不要」を区別する。

`suppressed` Annotationは再解析・再描画しても勝手に復活させない。

## 8. 冪等Renderer

Rendererは少なくとも以下を満たす。

- 同じAnnotation集合を何度renderしても管理対象の個数が増えない。
- 既存render objectをannotationId / renderSegmentId等で識別してupdateできる。
- 不要になった古いsegmentを安全に削除できる。
- 他のユーザーオブジェクトを誤って削除しない。
- 途中失敗時に可能な限り中途半端な管理構造を残さない。

生成物の階層はRendererの実装詳細とし、ドメインデータから独立させる。
