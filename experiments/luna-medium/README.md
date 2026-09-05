# Luna Medium Gate A/B

Issue #11 の比較実験用、単一 TextFrame / 単一 Logical RubyAnnotation の縦切りです。`core.js` は Illustrator DOM に依存しない純粋処理、`illustrator.jsx` は安全確認と DOM 操作、`review.jsx` は最小の ScriptUI、`Luna Medium Gate AB.jsx` が実行 entry point です。

## 静的テスト

```sh
/Users/test/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/bin/node experiments/luna-medium/tests/run.cjs
```

## Illustrator での確認

Illustrator で新規 AI を作り、水平・横書き・ポイント文字の TextFrame を1個だけ選択して `Luna Medium Gate AB.jsx` を実行します。UI で読みを入力し「読みを確認済み」にして保存・適用します。`manual-check.md` の順に同じ処理を3回、読み変更、suppressed、保存・再起動、sourceFrameId 衝突、管理外オブジェクト保持を確認してください。実機確認は利用者の Illustrator 環境で行います。

描画対象は管理タグを持つ1オブジェクトだけです。`enabled=false` は desired=0 として既存の管理対象だけを削除し、本文 note の意味データは保持します。未解決・失敗・未知の DOM 状態は描画せず、既存オブジェクトを自動選択・削除しません。

失敗時は `reviewReasons` とentry pointのアラートに、`observe` の文字・行・計測段階、`render` の create/update/remove と対象property、Illustratorが返した例外messageが残ります。これを次回の実機確認記録に転記してください。
