# Formal Step 2 実機確認

横書きArea Textで `一張羅` が `一張 | 羅` に折れる幅を作り、`Formal Step2.jsx` を実行します。読み `いっちょうら` を入力し、初回の確認UIで `いっちょう | ら` を指定します。2つのmanaged segment、同じ適用3回での非増殖、幅を広げた1 segmentへの復帰、同じ位置で折り返した際のhint再利用、reading変更時のstale再確認、save/close/reopen後のhint復元を確認してください。アダプタは各本文行を一時Point Textで計測し、計測オブジェクトを削除します。`TextFrame.position` が取得できない場合は `text-frame-anchor-unavailable` で停止し、座標を推測しません。失敗時はアラートの診断全文を記録し、`observe.measurement` の行幅・cleanup記録と unresolved理由を確認してください。

実行前に `node tests/gate-c.cjs` を実行し、純粋処理のPASS一覧と `MANUAL_REQUIRED` を確認します。Runtime Checkは幅を一時的に広げてAreaTextを実際に2行から1行へreflowし、managed 1件を確認した後、元の幅へ戻して同じSplitHintで2行・managed 2件へ復帰します。visual確認後、診断用に生成したmanaged rubyはcleanupで削除されます。通常の `Formal Step2.jsx` を別途実行してpersistent stateを作成し、`一張羅 / いっちょうら / 本文境界2 / 読み境界5` を適用した後、rubyが残ること、save→close→reopen後にSplitHintが復元・再利用されることを確認してください。

行位置はduplicateをoutline化したglyph boundsのYクラスタから測定します。クラスタ数が本文行数と一致しない場合は推測配置せず unresolved で停止します。

Gate Dでは `v2/diagnostics/Formal Step2 Gate D Batch Runtime Matrix.jsx` を一度実行し、A〜Eの一覧をDebug Consoleから保存します。fixtureとmanaged outputは終了時にcleanupされます。`MANUAL_REQUIRED save/reopen via normal Formal Step2.jsx` は通常UIでpersistent stateを作成してから確認します。
