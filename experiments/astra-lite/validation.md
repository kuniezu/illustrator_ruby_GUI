# Gate A/B 検証記録

実施日: 2026-09-05。共通基点: `32adf76be708dcb475ad4fd9f2872f9cb8c9f214`。

## 実施した検証

- Nodeによる純粋処理・Application・実Adapter＋host mock・UI command mock・静的構文/依存確認: **21件合格、失敗0件**。
- 追加依存なし。実行コマンド: `node experiments/astra-lite/tests/run.cjs`。
- 変更範囲: `experiments/astra-lite/` 配下のみ。既存production JSX、spec、findings、Sol/Atlas分析は編集していない。

初回テストで、小さいoffsetが指数表記でserializeされた時の読込拒否、計測中の本文変更を適用前に検出していない点を検出し修正した。テストfixtureのreview状態使い回しも修正した。未知のmatrix値がNaN比較ですり抜けないよう、有限値検査を追加して確認した。

## Issue #10との対応

| 契約 | 実装・検証 | 実機で残ること |
|---|---|---|
| tool-owned ID、frame-local note | Store往復、UUID非依存、sourceコピー衝突のmock | AI保存・再開後のnote/ID保持 |
| 他者note非破壊、schema/version | 前後文字列保持、不正入力拒否、read-back失敗からの復元 | 実際のnote長・Unicode・保存形式 |
| actual line / source index | Adapterで各Characterと行の範囲を照合。不一致・未対応を保留 | TextRange/linesの実値、版・OSごとの差 |
| 1Annotation往復 | 全意味フィールド保存、最小review UI、独立入口 | ScriptUI/IMEと実際のsave/reopen |
| reconcile / 反復 | 実Adapter mockで同じobjectを3回更新。reading変更も1件 | IllustratorのTextFrame属性・再実行結果 |
| complete desired=0 | 明示抑制で所有出力のみ削除、意味保持、再有効化 | 実機のremoveと再保存 |
| failed / unresolved | Rendererに渡さず旧出力保持。intentは保存 | DOM例外・古い描画の視覚的確認 |
| managed ownership | 厳密タグ、未知タグ/ID衝突で停止、一般物を保護 | native collection・別object判定 |
| 失敗時 | 計測cleanup、生成/更新復元、抑制失敗、pending再試行 | rollback/cleanup自体が失敗する実機状態 |

## 未実施・判定の限界

Illustrator実機、ExtendScript実パーサ、ScriptUIの描画・入力、save/close/reopen、Windows/macOS差は **未実施**。Nodeの構文検査はES3完全適合の証明ではない。host mockのboundsやcollectionは合成値であり、見た目・組版・Adobe DOMの実際の仕様を検証したものではない。

したがって、Gate A/Bの実機合格・製品対応は宣言しない。[manual-check.md](manual-check.md) の結果を比較実験の次の入力にする。Gate C以降、辞書、panel、legacy migration、host方式確定、配布改善には進んでいない。
