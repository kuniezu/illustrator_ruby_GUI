# Atlas — reuse vs rewrite

分析日: 2026-09-05 / 設計提案。対象SHAと観測の範囲は [architecture-assessment](architecture-assessment.md) を参照。

## 1. 「再利用率」の分母

v2をまだ実装していないため、最終的な採用コード率・工数削減率は測定できない。ここでは **現行mainの物理行数に対する、そのまま移せる候補の比率** と、概念を再利用できる範囲を分ける。空行・コメントを含む物理行数であり、行数の多いGUIや1行に長く書かれた漢字データの影響を受ける。

| main JSXの領域 | 行 | 行数 | 判断 |
|---|---|---:|---|
| ヘッダー・ライセンス・注意書き | 1–48 | 48 | 著作権表示は継承。機能再利用率の加点にしない |
| 小さな処理・データ | 49–134 | 86 | このうちL49–81、L103–131の計62行をas-is候補と数える |
| 選択取得 | 135–154 | 20 | 書き直し |
| GUI | 155–1038 | 884 | 主UIとして破棄 |
| 生成統括 | 1039–1211 | 173 | 作り直し |
| metadata/anchor | 1212–1478 | 267 | 概念継承、実装再設計 |
| 配置・補助index | 1479–1684 | 206 | 測定・計算・DOM更新へ分離して書き直し |
| main | 1685–1722 | 38 | 新しいapplication flowへ |

as-is候補は `62 / 1722 ≈ 3.6%`（ヘッダー48行を除くと約3.7%）。分類上の候補値であり、62行を採用・試験済みという意味ではない。APIの薄い数行をさらに抽出できても、全体を高率再利用できるとの根拠にはならない。逆に、この数値は実機経験や組版知見の価値を測らない。

## 2. 部品ごとの分類

`reuse as-is` は振る舞いを変えず移せる候補、`reuse concept & rewrite` は設計・計算の知見を残して実装し直すもの、`discard` はv2の中心設計へ持ち込まないもの。

| 要素 | 分類 | 根拠・持ち込み条件 |
|---|---|---|
| 捨て仮名表と `convertSutegana` | reuse as-is | DOM非依存。元readingを変更せず、描画時の表示変換として使う。hintの添字は変換前readingへ付ける |
| `gakushuKanji` / `getKanjiGrade` | reuse as-is | データとlookupは独立。現在収録内容の再利用であり、最新教育基準の検証ではない。学年から語全体を抑制する方針は別途決定 |
| `isKanji` / `kanjiCodes` | reuse concept & rewrite | BMP分類・々等の知見は使うが、`𠮷` をfalseにするUTF-16処理を修正。Unicode表の出典・版も別途確認 |
| frameIdのnamespaced note | reuse concept & rewrite | 既存note保持とread-backは有用。UUID優先・行単位marker抽出・ID衝突未検出は再設計 |
| `resolveBaseAnchor` | reuse concept & rewrite | contextと一意性を継承。重なる候補の取り漏れ、長さ検査、衝突・複数Annotationの競合を解消 |
| v1 serializer/parser | reuse concept & rewrite | legacy importerの仕様資料として残す。v2は型・schema version・範囲・破損を検査し、未知形式を黙って解釈しない |
| source font/color、size/gap比率 | reuse concept & rewrite | DOM測定値とstyle policyを分離。色オブジェクトやTextFont参照をそのまま永続JSONにしない |
| 1フレーム1回outline計測 | reuse concept & rewrite | 長文でDOM呼出しを抑える方針は有用。生成前失敗を含むcleanupと文字対応検証が必要 |
| `visibleIndexMap` | reuse concept & rewrite | 空白は字形を持たないという知見。固定除外文字＋パス逆順を普遍的な文字対応として信用しない |
| 縦横配置、字形補正 | reuse concept & rewrite | 軸と仮想ボディの考え方を継承。隣字参照は同一行・同一書式を保証してから使う |
| tracking / narrow | reuse concept & rewrite | 実字幅の測定・下限・衝突・reviewを伴うpolicyへ。`size×文字数` のみでは混在書式に不十分 |
| `getSelectedTextFrames` | reuse concept & rewrite | TextFrame直接選択は入口の一つ。source/generatedの役割判定、TextRange、重複選択を追加 |
| 本文＋ルビの物理group | reuse concept & rewrite | 一体移動は実機知見。初回登録と再renderを分離し、host名をID正本にしない |
| PR #8のcollection重複対策 | reuse concept & rewrite | 同一DOM objectの再訪と、異なるobjectのID衝突を別に扱う。recordId dedupeだけではコピーを隠す |
| GUI全文字グリッド、leader/member | discard | 永続Annotationへ変換する設計に置換。ページ状態を意味上の語境界にしない |
| `placeRubys` のcreate-only流れ | discard | 新規と再編集を共通のplan/applyへ。desired=0も正常な更新 |
| fixed Ruby layerとgroup名検索による正本復元 | discard | 同名ユーザー物との区別が弱い。生成物は所有タグ付きprojection |
| native UUIDを永続IDにする方針 | discard | findingsとPR #8実値で不成立のケースが確認された |
| PR #8のwrapper再生成・群ごと削除コード | discard | 初回回帰、全抑制未処理、混在物削除の安全性を継承できない |
| `getVisibleCharacterIndex` の重複補助実装 | discard | 対応表はAdapterで一つにし、食い違う除外規則を増やさない |

## 3. Layoutの「知見を使う」と「コードを使う」は違う

現行 `placeOneRuby` は、outline先頭・末尾からの範囲、`baseSize * baseLength` の幅、先頭文字書式、中央揃え、固定tracking範囲を同時に使う。語が行をまたいでも一つの範囲として末尾を参照するため、複数行segmentへ分割する前提にはなっていない。

cleanupも「finallyがあるので安全」としない。`placeRubys` は `frameGroup` と `tempFrame` を先に作り、outline化失敗時はoutlineだけを削除してcontinueする。元の複製や空groupが残り得る静的経路がある。Adapterは作成した一時物全てを記録し、どの段階の失敗でも後始末する必要がある。

upstreamの次の境界は再利用を限定する。

- `RubyInfo` はTextFontと絶対座標を含む描画データであり、永続RubyAnnotationそのものにはしない。
- `[親文字|読み]` のparserは明示記法用。通常本文の連続漢字候補を切るTokenizerへ流用しない。
- `convertJukugoRubys` の各字reading配列と探索は、sparse split hintの代替ではない。
- `adjustAki` / `convertJukugoRubys` による本文書式変更を、ルビだけの再配置へ混ぜない。本文を変更する組版モードを将来採るなら、別の明示的な設計判断と循環再測定対策が必要。
- `jis` の1-2-1配分とIssue #9の同幅両端ぞろえは別policy。名称を変えただけで同じ実装にしない。
- upstreamの毎ルビoutline化、polyfill前提を現行GUIの安全対策と混在させない。

## 4. 継承する検証資産

PR #5/#8の成功例と失敗例、実行SHA不明の報告、WindowsでのLayer/GroupItem差、生成物混在時の危険を、再現手順とAdapter契約へ変換する。最低限、初回・3回再実行・save/reopen・desired=0・部分失敗・複製・無関係物混在のケースが必要である。

将来のB戦略ではlegacyの確定SHAを比較基準にし、v2の入力モデルへ旧実装を包み込む互換層を先に作らない。importerだけに旧schema知識を閉じ込める。上流由来コードやデータを採用するときは既存の著作権・ライセンス表示を保持する。今回、legacyの移動やコード変更は行っていない。
