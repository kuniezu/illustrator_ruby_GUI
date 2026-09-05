# Atlas — v2 architecture assessment

分析日: 2026-09-05（JST） / 非規範的な独立分析。実装・実機検証は行っていない。

## 1. 結論

推奨は **B: 同一repoでlegacyを固定し、v2を再実装する**。現行GUIの拡張より、本文に付随するAnnotationの保存・再解決・校正・描画更新を一つの通常経路にする方が、仕様に直接対応する。

ただし、大きな文書管理基盤から作り始める必要はない。最初は単一本文フレームの意味データを保存する小さなStore、実際の行を測るAdapter、純粋な配置計画、所有権を確認して更新するRenderer、要確認を巡回するUIでよい。文書全体の集中Storeと常駐パネルは比較候補に残す。

これはPR #8を完成・統合する提案ではない。spec、findings、Sol分析は変更しない。本書と同じディレクトリの4文書だけが今回の成果物である。

## 2. 調査範囲と根拠の固定

最初にGitHub Contents APIで対象ブランチの `docs/v2/analysis/` を列挙し、`sol/` のみで `atlas/` が存在しないことを確認した。既存ローカルcheckoutはcleanだった。対象リモートブランチをfetchし、その既存ブランチをローカルで追跡して使用した。職場PCの未push成果物は参照していない。

| 対象 | 調査時点 | 読み方 |
|---|---|---|
| [対象ブランチの資料](https://github.com/kuniezu/illustrator_ruby_GUI/tree/fabccb8ef072d58a5a54367ad357ce69092d30a5/docs/v2) | `fabccb8ef072d58a5a54367ad357ce69092d30a5` | prompts、spec全5本、findingsを先に読む。要求は変更不可 |
| [current main](https://github.com/kuniezu/illustrator_ruby_GUI/tree/4f6ff0b77c22ae3c983dcd530cabc423217980e6) | `4f6ff0b77c22ae3c983dcd530cabc423217980e6` | 対象ブランチのproduction JSXと同一。Phase 1A統合済み |
| [PR #5](https://github.com/kuniezu/illustrator_ruby_GUI/pull/5) | closed / merged、head `42ed50036226b8f18bc48b797a76a01fd807f8b0` | 本文・差分相当のGit履歴・全4コメントを確認 |
| [PR #8](https://github.com/kuniezu/illustrator_ruby_GUI/pull/8) | open / unmerged、head `1f148d898ffda6cfec77dda4317f60019c2b3267` | headのコード、mainとの差分、全11コメントを確認。mainと混同しない |
| [upstream](https://github.com/inaniwaudon/illustrator-ruby/tree/30d157901b7b5406aa7cac747f873fdb92075218) | `30d157901b7b5406aa7cac747f873fdb92075218` | README、src/main.ts、ruby.ts、character.ts、main.test.ts、docs/attribute.mdを参照 |

さらにREADME、requirements、旧展示仕様、Phase 0分析、Issue [#2](https://github.com/kuniezu/illustrator_ruby_GUI/issues/2)、[#4](https://github.com/kuniezu/illustrator_ruby_GUI/issues/4)、[#6](https://github.com/kuniezu/illustrator_ruby_GUI/issues/6)、[#7](https://github.com/kuniezu/illustrator_ruby_GUI/issues/7)、[#9](https://github.com/kuniezu/illustrator_ruby_GUI/issues/9)と存在するコメントを確認した。Issue #2/#4はclosed、#6/#7/#9はopenだった。Sol全4文書は、コード・要求・観測から暫定結論を作った後に比較した。

以下の「コード」は静的に確認した事実、「観測」はfindingsまたは実機コメント、「提案」はAtlasの判断を示す。現行・upstreamの一般的な動作保証、実機PoC合格を意味しない。

## 3. 現行mainの責務とデータフロー

コードの行番号は上記mainの `Illustrator Ruby GUI.jsx` に固定する。

| 責務 | 関数・行 | 実際の挙動 |
|---|---|---|
| 対象取得 | `getSelectedTextFrames` L135、`main` L1685 | TextFrame直接選択のみ。複数なら先頭1件。caret/範囲指定の経路はない |
| 復元 | `readRubyRecords` L1357、`rubyDataFromRecords` L1428 | Rubyレイヤー内の生成TextFrameからrecordを読み、文字indexのGUIデータへ戻す |
| UI | `showRubyGUI` L155–1038 | `rubyData[f][characterIndex]`、leader/member、ページ・選択状態を管理 |
| 生成統括 | `placeRubys` L1039 | 毎回frameGroupを追加。フレーム複製を1回outline化、文字とパスを対応させて配置 |
| 計測・配置・保存 | `placeOneRuby` L1479 | 書式取得、幅推定、tracking/scale、TextFrame作成、座標変更、record保存を同じ関数で実行 |
| ID・アンカー | L1212–1478 | native UUID優先のframeId、baseTextと前後8文字、旧位置、生成ごとの新recordId |

```text
selection → source TextFrame
               ↑ frameId + baseText/context照合
Ruby layer → generated records → transient rubyData → ScriptUI
                                                       ↓ 実行
                     新frameGroup ← placeRubys / placeOneRuby
                                       ↓
                         新TextFrame + 新recordId
```

復元できても、その後の実行が既存recordの更新にはならない。`rubyDataFromRecords` はrecordId、スタイル、補正、抑制などを永続モデルとして引き継がず、`placeOneRuby` は新IDと `state:auto` を書く。生成物を消せば、その生成物にしかない情報も消える。

GUIの `allVisualLines`（L272–313）は `contentWidth / (charWidth + charSpacing)` で作る画面内の行であり、Illustratorの実組版行ではない。横書き配置後の5pt toleranceによるY位置集約（L1150付近）も、生成ルビを後から揃える処理であって、本文範囲の行帰属を提供しない。

## 4. 要求との根本的不一致

| v2の要求 | 現行の不足 | v2で必要な契約 |
|---|---|---|
| 語・語句の意味データ | indexとGUI leaderが中心 | stable annotationIdと本文範囲、読みを独立保存 |
| 手動split/merge、suppressed保持 | GUI空欄・member状態に依存 | 再tokenizeから保護する永続判断 |
| 語が折れた時だけ読み分割 | 範囲の先頭・末尾パスで一つの幅を計算 | actual line map → Render Segment → hint照合 |
| save/reopen後の再編集 | mainはUUID優先。生成物が正本に近い | tool-owned ID、Store、衝突検出 |
| 冪等・非破壊更新 | 新規生成中心 | 完全なdesired planと所有権付きcurrentの照合 |
| 長文の重点校正 | 全文字セル＋警告件数 | 理由付きreview queueと局所編集 |
| 本文移動・組み直し追従 | mainは別Rubyレイヤー | 物理移動と再組版時の再計算を区別 |

旧展示仕様の「既存GUIを土台に段階拡張」、Issue #9の「Phase 1B wrapperと両立」は当時の実装範囲の要求である。v2 specはGUI/wrapper維持を目的にしていないため、旧方針をv2へ無条件に持ち込まない。一方、Issue #9の同幅両端ぞろえは重要な比較用受け入れ例として残す。v2全体の既定組版規則へ勝手に昇格しない。

## 5. PR #8の観測とコードを分ける

| 証拠 | 確認できること | 確認できないこと |
|---|---|---|
| [#5 最終実機報告](https://github.com/kuniezu/illustrator_ruby_GUI/pull/5#issuecomment-5547674928) | 新規AI、unnamed単一本文、1件のsave/reopen成功 | 全環境のID永続性、複製・縦組の保証 |
| [#8 grouping成功](https://github.com/kuniezu/illustrator_ruby_GUI/pull/8#issuecomment-5548575190) | `bdd5283f...` で本文とルビの一体構造が成立 | 最新headの初回/更新両経路の合格 |
| [#8 デバッガ実値](https://github.com/kuniezu/illustrator_ruby_GUI/pull/8#issuecomment-5549695355) | selectionはGroupItem。wrapper/recordの `uuid:728` と本文の `uuid:661` が不一致 | selection型を変える修正が必要という推測 |
| [#8 GUI復元成功](https://github.com/kuniezu/illustrator_ruby_GUI/pull/8#issuecomment-5549809943) | 外側wrapperからGUIへ入り読みが復元された | 実行ファイルにM表示があり、PR headとの一致・再保存後の再試験は未確認 |
| [#8 増殖](https://github.com/kuniezu/illustrator_ruby_GUI/pull/8#issuecomment-5549826587) | 再実行でwrapperネストとruby group追加を観測 | 生成・復元できれば更新も安全という判断 |
| [#8 最新headの回帰](https://github.com/kuniezu/illustrator_ruby_GUI/pull/8#issuecomment-5549899572) | `1f148d898...` の新規AIで再び一体化しない | 原因となる個別DOM呼出しの断定 |

findingsのnote利用・非破壊marker・UUID変更・grouping成立は観測事実として受け取る。ただし、noteが使えることと、任意容量のStoreが安全であることは別である。

PR headを読むと、旧群削除は `allRubies.length > 0` に依存する。読みを全て消したdesired=0は旧群置換へ進まない。また `groupContainsRubyRecordsForFrame` は一致recordを一つ含めば真となり、`removeRubyGroups` は群全体を削除する。ユーザー物が混在した群を安全に消せる証明にはならない。これらは静的な経路評価であり、最新実機回帰の原因と断定しない。

## 6. 独立した小さなコード検証

mainから `isKanji` と `resolveBaseAnchor` の実コードを抜き出し、通常JavaScript環境で実行した。Illustrator DOMやExtendScript互換性の検証ではない。

| 入力 | 実結果 | 意味 |
|---|---|---|
| `isKanji("日")` / `isKanji("𠮷")` | true / false | `charCodeAt(0)` はサロゲート先頭を読むため、定義済み補助面漢字範囲を活用できない |
| 本文 `日日日`、base `日日`、start=0、context空 | index=0、needsReview=false | 探索位置をbaseText.lengthだけ進めるため、重なる候補index=1を見落とす |
| 本文 `日本・日本`、base `日本`、context空 | needsReview=true | 非重複の複数候補では安全停止する |
| 本文 `新日本庭園`、base `日本`、before=`旧`、after=`庭園` | needsReview=true | 両側完全一致が必須であり、一意な表記でもcontext変更時は止まる |

従ってアンカー方針は継承できても、現在の関数を「曖昧なら必ず止まる」v2部品としてそのまま採用できない。

## 7. upstreamから分かった境界

upstreamは `base` / `finish` の2フレームと明示ルビ記法を入力にし、mono/groupと各字reading配列のjukugoを分ける。これはv2の通常本文からの候補抽出とは異なる。

`src/main.ts` の `convertJukugoRubys` は各字readingを前提に配分を探索し、本文のakiを変更する。`adjustAki` も本文kerningを書き換える。`determinePositions` はルビごとに本文を複製してoutline化する。`addRubys` の `jis` は資料で1-2-1と定義されており、Issue #9の同幅両端ぞろえと同義ではない。

再利用するのは、文字クラス別の進入制約、縦横軸、実字形と仮想ボディの差、スタイル指定、検証用の組版例である。本文の字間を変える副作用、常時各字alignment、毎ルビoutline化を輸入しない。upstreamテストは単位変換・記法tokenize・属性適用が中心で、Illustrator DOM配置やv2の永続化の合格証拠にはならない。

## 8. A/B/Cの比較と判断変更条件

| 戦略 | 利点 | 負担・リスク | Atlas判断 |
|---|---|---|---|
| A 現行拡張 | 初期差分と起動手順が小さい | GUI index、生成物保存、wrapper互換を同時に抱え続ける | Phase 1Aの限定実験には合理的。v2中心設計には非推奨 |
| B 同一repoでv2再実装 | Issue/観測/ライセンスの履歴を保ち、旧版比較が容易 | 将来の入口・配布状態表示が必要 | 暫定推奨。今回その構造変更はしない |
| C 別repo | 別ランタイム・別製品として運営しやすい | 根拠と不具合履歴が分散、二重保守 | 配布・権限・所有者・実行基盤が独立する必要が実証された時に再検討 |

純粋処理の設計だけでBを成功扱いにしない。行測定と保存・失敗復旧が実機で成立しなければ、対応範囲・実行基盤を比較し直す。[候補設計](candidate-architecture.md)、[再利用評価](reuse-vs-rewrite.md)、[PoCと開発順序](risks-and-poc.md)、[Sol批評](critique-of-sol-analysis.md)にその条件を示す。
