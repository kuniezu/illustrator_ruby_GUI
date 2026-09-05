# Atlas — risks, PoCs, and development gates

分析日: 2026-09-05 / 未実施PoCの提案。現行コードの静的確認と小さな純粋関数検証を、実機合格とは扱わない。

## 1. 先に潰す不確実性

最初のリスクは「読み候補が出せるか」より、**正しい本文範囲と現在の行を取得できるか、校正判断が保存後に残るか、安全に更新できるか** である。未解決時の動作も受け入れ条件に含める。

| 優先度 | リスク | 根拠 | 採用判断 |
|---|---|---|---|
| P0 | 実組版行と原文indexの対応が不確か | 現行GUIのvisualLinesは画面幅。outline逆順対応も前提依存 | POC-1を通らない範囲は自動renderしない |
| P0 | noteに保存できても容量・再保存・複製が未検証 | findingsの成功は限られた実機例 | POC-2でframe note/集中Storeを選ぶ |
| P0 | 更新失敗で意味データか旧描画を失う | PR #8の回帰、増殖、群削除の範囲 | POC-4で正常・空・失敗を分離 |
| P0 | 別frameや別出現へ誤結合 | UUID変更の実値、anchorの重複候補取り漏れ | POC-2/3で衝突と曖昧性を保護 |
| P1 | host操作が本文階層・重なり順を壊す | PR #8の初回grouping回帰 | POC-5で使用可能な階層を限定 |
| P1 | hintが読み編集や複数行で矛盾 | sparse hintは整数2個だけでは安全性を表せない | POC-3でrevision・境界単位・単調性を検証 |
| P1 | 要確認が多く校正が進まない | 長文reviewが主目的 | POC-6を早期に実施。件数だけのalertでは不合格 |
| P1 | 語幅、長い読み、混在書式の誤測定 | 現行は先頭size×文字数と字形端を併用 | POC-7で画像とmetricsを照合 |
| P2 | 辞書/helper/UI基盤の配布が重い | 現段階の未決事項 | コアの成立後に比較。IMEは必須化しない |

## 2. 共通の記録方法

将来のPoCは本番原稿ではなく人工例を使い、コードSHA、実行ファイルのhash/ローカル差分有無、Illustratorの完全なversion/build、OS、フォント名、text kind/orientation、選択方法、保存形式と手順を残す。PR #8のM表示付き成功報告を踏まえ、GitHubのheadだけで実行版を証明したことにしない。

各ケースでbefore/afterの本文contents・書式・座標・親子関係・z-order・タグ・管理物個数・無関係物の残存を記録する。実機生ログ、画面、期待値と実値、失敗箇所を対応付ける。実資料や辞書は公開repoへ置かない。合格は「初回表示がよい」だけでなく、保存・再開・再実行・失敗復旧の不変条件で判定する。

## 3. POC-1: actual line map / source index（最初の技術gate）

**問い:** Illustratorの行範囲を原文へ一意に対応付けられるか。

入力は `日本庭園`、`一張羅`、同語反復、空白・タブ、明示改行、補助面漢字 `𠮷`、異体字selector・結合濁点を含む人工文。point/area、横/縦、幅変更、字間・混在size、oversetを分けて試す。path/threadedは対応可能性調査として別行に記録し、単純frameの合格を流用しない。

方法は `lines` / TextRangeの範囲情報候補をread-onlyで取得し、画面の実行境界と照合する。start/end、Charactersのcontents、JS原文offset、非表示overflowの扱いを同時に記録する。単なる文字列再検索では同語反復で曖昧になるので、範囲として取得・対応する。

合格条件:

- 同一語の1→2→3→1行化で、各segmentの本文範囲に重複・欠落がなく、Annotationは1件のまま。
- 明示改行と自動折り返しを混同せず、空行・行末空白も原文indexへ整合する。
- oversetは「見えていない範囲」と認識し、旧位置・推定フレーム位置へ描画しない。
- Unicode対応が成立しないケースを誤った位置へ通さず、未対応として特定できる。

不合格なら計測方式を比較し直す。area textの実折り返しが取れないまま「v2の折り返し対応完成」として先へ進めない。対応kindの限定が必要なら仕様へ黙って追記せず、判断事項として提示する。

## 4. POC-2: Store / stable identity / copy

frame note Bundleと、source noteにID＋文書専用containerの二案を同じpayloadで比較する。初期payloadは1/100/1000 Annotation、10k/100k/1M code units等の段階的な容量試験とし、これらを対応保証値とはしない。Unicode、改行、区切り文字、既存の他者noteを含める。

手順は書込read-back→AI保存→close→Illustrator再起動→open→load→再保存。別名保存、同一文書duplicate、sourceだけの別文書copy、host全体copy、生成物全削除、source削除、container削除、破損/未知versionも調べる。

合格条件:

- 確定reading、suppressed、manual boundaries、hint、style、offsetを全て復元できる。
- native UUIDが変化しても正本IDで復元し、他者noteが同一内容で残る。
- 同一source IDの別objectを衝突として報告し、片方を黙って採用しない。
- payload切断・未知schemaを空Storeとして上書きしない。
- 生成物を削除しても意味データは残り、source削除/Store削除時の喪失範囲が説明できる。

frame noteが実用容量とコピー運用で合格なら、簡単な方を採る。容量・耐久性・source削除からの復旧要求を満たさなければ集中Storeへ移る。二媒体への常時完全ミラーを先に作らない。

## 5. POC-3: anchor / manual boundary / sparse hint（純粋処理＋実機入力）

| ケース | 期待する判定 |
|---|---|
| 本文先頭挿入、同語複数、`日日日` 中の `日日` | 全候補を取り漏らさず、一意な根拠なしならreview |
| 複数Annotationが同範囲へ解決 | 自動確定せず競合表示 |
| 前後context片側/両側変更、語内部編集 | 旧判断を保持し、候補と要確認理由を提示 |
| suppressedの前に挿入、manual merge後の再解析 | 人の判断が自動候補に上書きされない |
| 明示改行の追加/削除 | 語候補を再評価し、旧readingの継承は候補として提示 |
| `日本庭園` の折り位置2→別位置→2→一行 | 新境界のみ確認、既知境界再利用、一行で全reading |
| `一張 | 羅` の `(2,5)` | `いっちょう` と `ら`。全字alignment不要 |
| reading変更、baseText変更、manual split/merge | 旧hintをそのまま有効にしない |
| 3行以上でhintの読み位置が逆順/同位置 | 矛盾または空segmentをreview。黙ってsliceしない |
| `𠮷`、IVS、結合濁点 | UI境界と保存offset/DOM位置の対応が明確 |

熟字訓に自然な分割がない場合の「保留→本文組み直し」も実際に操作する。出現箇所をまたぐhint共有は、このPoCの成立条件にしない。

## 6. POC-4: Renderer / failure recovery

対象は1sourceに複数Annotation、管理外TextFrame/GroupItemと同名の物、管理群へ手動追加した物を混在させる。

試験系列:

1. 初回render→同じplanを3回→save/reopen→再render。
2. 読み・style・offset変更、1↔複数segment、1件抑制、全件抑制、抑制解除。
3. 生成物の直接移動・内容変更・削除、同じIDの別objectコピー、タグ破損。
4. 計測、生成、タグ書込、既存update、stale remove、Store保存、cleanupの各段階へ失敗を注入。
5. pending状態のまま保存されたAIを再オープンして復旧動作を確認。

合格条件は、正常時に件数・意味・書式・階層が収束し、complete desired=0で管理対象の旧描画がなくなること。unresolved/failedを空planとして削除しないこと。他者物、manual扱い、未知タグを削除しないこと。失敗時は最後の確定状態に戻るか、旧データを保護して理由付き復旧状態になり、成功表示や盲目的な自動再試行をしないこと。

同じrecordIdの別物をdedupeして片方を隠す実装や、managed recordを一つ含むだけの群を丸ごと削除する実装は不合格。DOMの原子性は前提にせず、この結果でstaging/退避/復旧記録の必要範囲を決める。

## 7. POC-5: managed hostとnon-groupの比較

同じ本文・rubyで、通常host選択移動、本文のみdirect-selection移動、group全体の等倍/拡縮、字サイズ変更、area幅変更、縦横切替、回転・非等方変形を比較する。既存group、sublayer、clipping、locked/hidden、連結frameは独立ケースにする。

host案の合格条件は、初回登録で元本文が複製されず、本文内容・見た目・z-orderが保たれること、再renderで再parentしないこと、sourceあたりhost最大1、保存再開後に選択から同じsourceへ解決すること。登録の途中失敗で元の階層を復元できることも含む。

non-group案は、再render前のズレが明示され、再render後に正しく戻ることと、展示制作担当者がその運用を許容するかを判定する。技術的な同期成功だけでhostと同じUXとはしない。複雑な親で非groupへ黙ってfallbackする案は採らない。

## 8. POC-6: long-text review / ScriptUI / Windows・macOS

人工の数百〜数千文字に、複数読みの固有名詞、抑制、手動境界、新hint、曖昧anchorを混ぜる。次/前、理由別filter、context表示、読み確定、split/merge、抑制、補正、保存再開、キャンセルを試す。

操作回数、初回表示時間、次の要確認への待ち時間、本文確認のためにdialogを閉じる回数を記録する。UIインスタンス数が全文字数に比例しない構造を確認する。性能の合格閾値は、基準PCと利用者の校正作業で測って合意する。根拠なく秒数を保証しない。

Windows/macOS双方で日本語IMEの確定、Tab/Shift+Tab、DPI/画面サイズ、フォント不在、ファイルパスとUnicodeを確認する。caret/TextRange、modal中の本文選択・ハイライトが使えない場合、frame＋context検索の代替操作で校正できることを確認する。

ScriptUIで本文との往復が過大なら常駐パネルを比較する。その時点でAdobe公式の対応host/version/bridgeを確認し、配布・署名・OS別導入を小さく試す。UI基盤の選択でDomainを作り直さないことを設計条件にする。

## 9. POC-7: layout / style / performance

`日本庭園 → にほんていえん` をIssue #9の同幅両端ぞろえ比較例とし、短い/長いreading、reading1文字、`一二三`、かな混在、proportional font、混在size、縦組を試す。字形端と文字送り領域のどちらを端とするか、画像と数値で示す。

親文字のcontents・字間・aki・フォント・色が変更されていないことを確認する。進入範囲、隣接ruby/上下行衝突、縮小下限、欠落フォントの扱いはreviewに露出させる。JIS/JLReq適合はupstreamの説明を借りて宣言せず、採用policyと検証範囲を限定する。

1frameのAnnotation数を増やし、outline回数、DOM呼出し、経過時間、一時物残存、メモリ傾向を記録する。初期目標は全frame再計測の正しさ。差分cacheは性能問題が実測されてから追加する。本文不変でもfont/幅/変形でcacheを無効にできることが条件。

## 10. 対応範囲と開発順序

READMEにあるCC2023以降・CS6・CS5の動作報告は旧GUIに関する報告であり、v2の永続化・TextRange・行測定の対応表ではない。実機コメントの「Windows / Illustrator」も完全なbuild番号を補わず、その範囲で読む。v2下限はspecの未決事項のままである。

推奨順序:

1. **Gate A: 観測契約。** POC-1/2で行・文字対応と保存媒体を確認。小さな純粋処理でPOC-3の曖昧性・hint不変条件を検証。
2. **Gate B: 一本の往復経路。** 1frame、1語、reading手入力、Store、再解決、render/re-render、抑制、save/reopen、失敗復旧（POC-4）。最小review画面をここで接続する。
3. **Gate C: 実組版の往復。** 1→2→3→1segment、未知hint確認、reading編集後の再確認。POC-5の一体移動・登録/更新分離とPOC-7の横組配置を併せて通す。
4. **Gate D: 長文。** Tokenizer、manual split/merge、review巡回、文書内確定読み再利用、縦組/互換性ケース、性能を検証する（POC-6）。
5. **Gate E: 導入。** 案件・共通辞書、適用範囲の差分確認、launcher、legacy inventory/明示import、配布の識別を整える。
6. 一般読みhelper・常駐UI・高度な組版・複雑frame・差分最適化は、前段の観測で必要性を確認して追加する。

PoCの結果で限定的な試作範囲を選ぶことと、製品要求を削ることは別である。MVP候補を単純point/area・非連結frameから始めても、未対応kind・未合格OSを明示し、製品としての対応範囲は比較レビュー後に決める。

## 11. 実装前に残す判断事項

- frame noteの採用可否、source削除後の復旧要求、集中Storeへ移る条件。
- 実測した行API・index convention、overset/path/threadedの対応範囲。
- 同幅両端ぞろえの端の定義と、v2既定styleにするか。
- 自然なreading splitがない場合、空segmentの可否、組み直しとの役割分担。
- hostの既定範囲、direct-selection移動時の説明、非group同期の許容。
- 直接編集・manual状態・複数segment補正をどう保護するか。
- StoreとDOMの版ずれからの復旧方法、partial applyの必要性。
- Illustrator下限とWindows/macOSの実機対応表、ScriptUIの校正体験。

今回実施したのはGitHub/コード/資料調査、純粋関数の限定検証、分析文書作成まで。PoC実装、実機操作、PR #8変更・マージは行っていない。
