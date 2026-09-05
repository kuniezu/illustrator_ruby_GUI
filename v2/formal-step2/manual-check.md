# Formal Step 2 実機確認

横書きArea Textで `一張羅` が `一張 | 羅` に折れる幅を作り、`Formal Step2.jsx` を実行します。読み `いっちょうら` を入力し、初回の確認UIで `いっちょう | ら` を指定します。2つのmanaged segment、同じ適用3回での非増殖、幅を広げた1 segmentへの復帰、同じ位置で折り返した際のhint再利用、reading変更時のstale再確認、save/close/reopen後のhint復元を確認してください。失敗時はアラートの診断全文を記録します。
