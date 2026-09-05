# Astra Lite — Gate A/B 実験（Issue #10）

共通基点: `32adf76be708dcb475ad4fd9f2872f9cb8c9f214`。
使用ブランチ: `experiment/astra-lite-gate-ab`。
使い捨て比較実験であり、本線へマージ・正式採用する実装ではない。

## 起動

1. このディレクトリの4つのruntimeファイルを同じ場所に置く。個別のJSXだけをコピーしない。
2. Illustratorの新規実験用AIに、通常レイヤー直下の横書きポイント文字で `日本庭園` を作る。回転・拡縮・連結・混在書式を使わない。
3. 本文TextFrameを1個だけ直接選択する。
4. **ファイル → スクリプト → その他のスクリプト** から [Astra Lite Gate AB.jsx](Astra%20Lite%20Gate%20AB.jsx) を実行する。既存の `Illustrator Ruby GUI.jsx` は使用しない。
5. 読みに `にほんていえん` を入力し、「この読みを確認済みにする」をオンにして「保存して適用」を押す。

ここでの「保存」は本文noteへの意味データ保存であり、AIファイルをディスクに保存する操作ではない。AIの保存はIllustratorで行う。

「行情報を観測」は行範囲とAdapter判定を表示する。対応候補では一時複製をoutline化して計測・撤去するが、SourceBundleや生成ルビを更新しない。ダイアログを開いただけ／閉じただけではnoteを書かない。

## 実装した範囲

| 境界 | ファイル | 責務 |
|---|---|---|
| Domain | [core.js](core.js) の `Domain` | 単一Annotation、schema/値検査、全候補anchor解決、complete/unresolved/failedの計画 |
| Store | core.js の `Store` | frame-local Bundle、固定versionのpercent-encoded形式、他者note保持、所有タグ |
| Application | core.js の `Application` と入口のコマンドループ | preflight、校正入力、意味保存、reconcile、状態再読込 |
| Illustrator Adapter | [illustrator.jsx](illustrator.jsx) | ID衝突走査、文字/行照合、計測、所有物だけのcreate/update/remove、read-back |
| UI | [review.jsx](review.jsx) | 現Annotation・reading・確認・抑制・reviewメモ・配置/補正。plain commandを返す |

意味データはsource noteに保存する。`annotationId`、native UUIDと無関係な `sourceFrameId`、元本文snapshotとanchor、reading、enabled、placementMode、reviewReasons、readingConfirmed、userReview、size/gap比、em補正、schemaVersion/revision/renderStatusを保持する。JSON globalやevalに依存しない固定schemaで、未知version・欠落/重複field・壊れたmarker・不正値は拒否する。

生成物は `astra-lite-output:v1;sourceId;annotationId;whole` の厳密なnoteタグで識別する。layer/groupの名前で所有権を判定しない。source IDのコピー、同じ出力IDの別objectは衝突として停止する。同一DOM objectの再訪だけを除外し、IDの重複をdedupeで隠さない。未知・破損した実験用タグは保護のため処理を停止する（同文書の別箇所の未知タグも停止要因になる）。一般の無印objectは対象外。

## 描画と保存の状態

| 状態 | 意味保存 | Renderer |
|---|---|---|
| `complete` / 1件 | 保存する | 同じ所有objectをupdate。未生成なら1件create |
| `complete desired=0` / enabled=false | reading等を残して保存する | 所有objectがあればそれだけ削除。計測は不要 |
| `unresolved` | 校正入力と理由を保存する | 既存出力を保持。空配列として削除しない |
| `failed` | 可能な限り入力と失敗理由を保存する | 失敗を表示。更新失敗は退避値の復元、新規作成失敗は今回の物の撤去を試みる |
| `pending` | 意味データは保存済み | 描画完了/最終note更新が確定していない。再起動して状態を読み、同じ「保存して適用」で再試行 |

描画前に新しい意味データをpendingとして保存するため、描画失敗でreadingが生成物にしか残らない状態を避ける。最後にcomplete/failedを書き戻す。最終note更新失敗ではpendingが残り得る。DOM操作とnote書込みは原子的transactionではない。復元/cleanup自体が失敗した場合は `recovery-required` 等を表示するので、生成物を無条件に手動削除せず、実験AIの状態を記録する。

UIを開いた後、または計測中に本文contents/noteが変わった場合は適用前に停止する。reopen後に本文が変わった場合は保存済みanchorを再評価する。旧位置が近いという理由だけで複数候補を選ばず、重なる候補も列挙する。

## 意図的な制限・未検証事項

- **Illustrator実機未検証。** Adapterの`complete`はコード内の照合を通過した意味であり、バージョン互換性や見た目の合格を意味しない。UIにもこの区別を表示する。
- 初期Annotationは本文フレーム全体の1件。描画は通常レイヤー直下・1行・横書きポイント文字・回転拡縮なし・同一font/sizeに限定する。group配下、area/path、threaded、複数行、部分範囲は自動描画しない。
- `textRange.characters` の各contents/start/endとUTF-16文字列の各位置を照合し、`textRange.lines` のstart/end/contentsが原文を連続して覆うか検査する。不一致・API例外・未取得・overset等を成功扱いにしない。補助面漢字、IVS、結合濁点等は未対応として止め、意味データは保持する。
- 文字ごとのoutline対応を推測しない。本文全体の一時outline boundsを使い、親字の先頭font/colorを継承してルビを中央配置する。フォントのink boundsや実際の位置・間隔は実機で確認する。長いreadingの最適組版、両端ぞろえ、split hintは本実験の対象外。
- 本文とルビは別オブジェクト。本文の移動直後には追従しない。再実行で現在位置を計測する。host/groupを作らず、本文を再parentしない。
- `auto_offset` は保存したem補正を再適用する。`manual` は保存のみで自動描画を保留する。ただし利用者が明示する抑制操作は適用する。直接ドラッグの自動取込みや生成物の手動書式編集保護は未実装。
- 読みを変更するとUIの確認済みチェックを外す。要確認メモが非空なら描画を保留する。抑制中もreading・確認・メモ・補正は保存し、再有効化時に再評価する。
- source自体を削除すると、そのnoteにある意味も失う。大容量・破損復旧・外部backup・legacy migration・辞書・配布改善は対象外。
- source/outputへの名前空間タグの偽造・手動移植は想定しない。利用者がタグを編集した場合、所有権の根拠が失われるため手動確認が必要。

## 自動検証

追加依存はない。Node.js 18以降でrepoルートから実行する。

```sh
node experiments/astra-lite/tests/run.cjs
```

[tests/run.cjs](tests/run.cjs) は以下を検証する。

- Store全フィールド往復、他者noteの前後保持、不正schema/値/markerの拒否。
- 重なるanchorの曖昧性、未確認/手動/未対応範囲、desired=0と失敗/未解決の区別。
- Applicationの3回反復、reading更新、抑制→再open→再有効化、stale UI、計測中の本文変更。
- **実Adapterをhost mock上で実行**し、同じ出力objectの更新、source/output ID衝突、未知タグ、一般物保護、文字/行map不一致を確認。
- 計測失敗の一時複製cleanup、作成/更新/削除/Store書込み失敗、pendingからの再試行。
- runtimeファイルのJavaScript構文、include解決、現行GUI非依存、保守的な現代構文混入チェック。

Node構文チェックとhost mockはExtendScript実機・ScriptUI・ファイル保存後のDOMを再現しない。実行結果と残る確認は [validation.md](validation.md)、短い実機チェックは [manual-check.md](manual-check.md) を参照。
