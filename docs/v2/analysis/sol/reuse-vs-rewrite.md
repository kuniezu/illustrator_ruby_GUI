# Sol Analysis — Reuse vs Rewrite

更新日: 2026-09-05
状態: Sol independent analysis / non-normative

分類:

- `reuse as-is`: ほぼそのまま持ち込める
- `reuse concept / rewrite implementation`: 知見・アルゴリズムは使うがv2責務へ合わせて書き直す
- `discard`: v2中心設計には持ち込まない

| 現行要素 | 分類 | 理由 |
|---|---|---|
| 学習漢字データ | reuse as-is | 純粋データとして独立性が高い。学年別ルビ方針へ再利用可能。 |
| 捨て仮名変換表・変換関数 | reuse as-is / 軽微整理 | domainから独立した純粋処理にしやすい。 |
| 親文字font / color継承 | reuse concept / rewrite implementation | 要求は継承できるが、DOM取得とstyle policyを分離したい。 |
| ruby size / gapの親文字比率 | reuse concept / rewrite implementation | v2 style presetへ移す。 |
| `createOutline()`による実字形測定 | reuse concept / rewrite implementation | 有用だが、配置本体からDOM measurementを分離し、一時object cleanupをAdapter責務にする。 |
| 横書き／縦書き配置計算 | reuse concept / rewrite implementation | upstream/現行の知見をテスト可能なLayout Engineへ移植する。 |
| 長い読みのtracking / scale処理 | reuse concept / rewrite implementation | policy化し、段階処理・reviewへ拡張する。 |
| upstream由来のgroup/jukugo rubyアルゴリズム | reuse concept / rewrite implementation | 日本語組版知見として重要。v2のLogical Annotation / Render Segmentへ適合させる。 |
| 現行ScriptUIの全文字グリッド | discard as primary UI | 長文review型UXと合わない。必要ならlegacy/manual detailed modeとして参考に留める。 |
| `rubyData` transient配列 | discard | 永続Annotation Modelと責務が異なる。 |
| GUIイベントから直接`placeRubys()`へ進む制御フロー | discard | UIとdomain/renderingを分離する必要がある。 |
| 固定`Ruby`レイヤー前提 | discard | source identity / persistence / renderingをlayer構造へ依存させない。 |
| 生成TextFrame名を意味データの主な手掛かりにする方式 | discard | generated objectはprojectionにする。 |
| native `TextFrame.uuid`を永続IDとする考え | discard | 実機で保存後変化を確認済み。 |
| Phase 1Aのnamespaced note marker | reuse concept / rewrite implementation | tool-owned taggingの実機成立は有用。Store全体の方式は再設計する。 |
| Phase 1AのbaseText/context anchor方針 | reuse concept / rewrite implementation | Anchor Resolverの中心知見として再利用する。 |
| PR #8の`rubyPair_` wrapper実装 | discard as current implementation | 後付け状態遷移が複雑化。コードをそのままv2へ持ち込まない。 |
| 「本文＋ルビを物理的に一体移動」する発想 | reuse concept / compare alternatives | UX要求として価値がある。semantic modelから分離したmanaged host案等を再評価する。 |
| `readRubyRecords()`のdocument再帰走査 | discard | generated object探索を正本復元の中心にしない。Storeから読む方へ転換する。 |
| `recordId` dedupeの知見 | reuse concept | DOM collectionが重複を生み得る実機知見としてAdapter/Rendererで活かす。 |
| 現行の単一JSXファイル構成 | discard as architectural constraint | 配布形態が最終的に単一JSXでも、ソース責務は分割して考えるべき。 |

## 特に残すべき「コードではない資産」

現行repoで最も価値が高いのは、必ずしも現在の制御フローではない。

- Illustrator DOMの実機挙動
- 日本語ルビ配置の測定知見
- upstreamアルゴリズム
- 横書き／縦書きの差異
- createOutlineの癖
- Phase 1A/1Bで判明した永続化・grouping制約
- ユーザーが実際に必要とする展示制作ワークフロー

v2では、これらを仕様・tests・Adapter contractへ変換して継承するのが望ましい。
