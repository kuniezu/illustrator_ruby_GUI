# Formal Step 2 実機確認

横書きArea Textで `一張羅` が `一張 | 羅` に折れる幅を作り、`Formal Step2.jsx` を実行します。読み `いっちょうら` を入力し、初回の確認UIで `いっちょう | ら` を指定します。2つのmanaged segment、同じ適用3回での非増殖、幅を広げた1 segmentへの復帰、同じ位置で折り返した際のhint再利用、reading変更時のstale再確認、save/close/reopen後のhint復元を確認してください。アダプタは各本文行を一時Point Textで計測し、計測オブジェクトを削除します。`TextFrame.position` が取得できない場合は `text-frame-anchor-unavailable` で停止し、座標を推測しません。失敗時はアラートの診断全文を記録し、`observe.measurement` の行幅・cleanup記録と unresolved理由を確認してください。

実行前に `node tests/gate-c.cjs` を実行し、純粋処理のPASS一覧と `MANUAL_REQUIRED` を確認します。Illustratorでは同じ処理を3回適用し、2→1のmanaged segment削除、unmanaged TextFrame保持、一時計測TextFrame残存なしを確認してください。保存・再開・再実行は手動確認です。
