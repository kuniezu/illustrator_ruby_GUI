# Illustrator実機チェック — 未実施

Issue #10 / `experiment/astra-lite-gate-ab` の人工例のみを使う。現行GUIやPR #8を実行しない。

記録欄: 実験commit / JSXのローカル差分有無 / Illustrator完全version・build / OS / font名 / 保存形式。
各結果を「合格・不合格・未実施」で記録し、失敗時はUIの理由とレイヤーパネルの状態を残す。

## 基本7項目

- [ ] 新規AIにレイヤー直下の横書きポイント文字 `日本庭園` を作り、本文だけを直接選択して `Astra Lite Gate AB.jsx` を起動。「行情報を観測」で `[0,4)` が1行と表示されるか。実機未検証表示とAdapter判定を混同しない。
- [ ] reading=`にほんていえん`、描画オン、確認済みオンで適用。本文1＋managed ruby 1で、読み・位置が適切か。同じ「保存して適用」をさらに2回押してもrubyが1個のままか。
- [ ] readingを別の値に変更。確認済みが自動で外れるか。再確認して適用し、同じrubyが更新されて増えないか。
- [ ] 「ルビを描画する」をオフにして適用。managed数が0になり、reading・ID・補正がUIに残るか。オンに戻すと1件だけ復元するか。
- [ ] 抑制中と描画中の双方で、閉じる→**AI保存**→close→reopen→本文選択→スクリプト再実行。Annotation/source ID、reading、enabled、配置/補正、要確認メモが保持されるか。必要ならIllustratorも再起動する。
- [ ] 保存済みsourceをコピーして別objectを同じAIに置く。どちらを選んでも `source-id-collision` で止まり、片方を自動採用せず、両方のnoteと既存rubyが変わらないか。出力コピーでは `output-id-collision` になるか。
- [ ] 別の無印TextFrame/GroupItemを同レイヤーへ置いて再適用・抑制。一般物が消えないか。別の実験AIで、出力noteを `astra-lite-output:v99;unknown` に変更して再実行すると停止し、未知タグ物が残るか。

note確認・変更はExtendScript Debugger等で、選択した**人工例**の `.note` を確認する。既存案件AIでは行わない。実験タグを削った物は自動管理へ戻せないため、正常系は別の新規AIで試す。

## 安全性と境界の追加確認

- [ ] source noteへ事前に他者メモ（日本語・改行・`%=;`等）を入れ、初回/再保存後にも同じ文字列が残るか。
- [ ] 「要確認メモ」を入力、または確認済みオフで適用。unresolvedとして入力が保存され、既存rubyが削除・増殖しないか。メモを解除して確認すると再適用できるか。
- [ ] 最初に生成した後でarea化・複数行化・回転・group内移動等を行う。unsupported/failed/unresolvedが表示され、空結果による旧ruby削除が起きないか。抑制を明示すると所有rubyだけが0件になるか。
- [ ] `𠮷`、IVS、結合濁点の人工例は `unicode-index-map-unverified` で描画されないか。内容が保存されることと描画対応を区別する。
- [ ] 生成rubyだけを直接選択して起動すると、sourceとして登録されず停止するか。locked/hidden対象は自動解除されないか。
- [ ] 本文を移動し、再実行でルビが現在位置へ戻るか。移動直後の即時追従は本実験にない。`auto_offset` の補正を保存・再適用して保持されるか。
- [ ] ダイアログを閉じるだけでは新しいsource noteやrubyが作られないか。日本語IME確定、読み変更時の確認チェック、数値入力、画面サイズをWindows/macOSで確認する。

Store/Rendererの失敗注入は自動テストで検証する。実機で `pending` / `failed` / `recovery-required` が出た場合は成功扱いにせず、AIを別名で保全して状態を記録する。pendingで有効なBundleが読める場合のみ再起動して同じ適用を試し、増殖しないか確認する。壊れたStoreや衝突IDを自動修復する機能はない。
