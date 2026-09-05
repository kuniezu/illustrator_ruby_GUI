# ExtendScript runtime / ScriptUI 基本ルール

この文書は v2 の正式実装で常に適用する実装制約をまとめる。

## 1. ExtendScript 実機互換を優先する

Illustrator で動かす `.jsx` / `.js` は、Node.js や現代ブラウザの JavaScript 実行環境を前提にしない。

- Node.js のテストで通ることだけを根拠に、Illustrator 実機でも使えると判断しない。
- ExtendScript で存在が保証できない標準オブジェクト・APIは、実機確認なしに使用しない。
- 特に `JSON`、`Promise`、`Map`、`Set`、modern Array/String helpers などは自動的に利用可能と仮定しない。
- 必要な処理は ES3/ExtendScript 互換の小さな関数で実装することを基本とする。
- 互換性上の理由で polyfill を入れる場合は、必要最小限・名前衝突を避ける・既存globalを上書きしない。

### JSON について

2026-09-05 の macOS Illustrator 実機で、`JSON` が未定義となる環境を確認した。

したがって正式コードでは `JSON.parse(JSON.stringify(...))` を clone 手段として使用しない。SourceBundle の複製・serialize/deserialize は ExtendScript 互換の明示的処理を使う。

Node 側のテストでは、`global.JSON` が利用できない条件も追加して、Illustrator 実機との差を早期に検出する。

## 2. Illustrator DOM は未確認 property を安全扱いしない

Illustrator DOM は object type によって property access 自体が例外になることがある。

- 未確認 property は存在確認だけで安全とみなさない。
- 対応対象の object type を先に判定し、不要な property を読まない。
- 実機で例外になった property は再現テストを残す。
- 例: `TextType.POINTTEXT` では `nextFrame` / `previousFrame` を読まない。

## 3. 実機診断を残す

DOM依存処理は、失敗時にどこまで進んだか分かる軽量 trace を維持する。

最低限:
- source kind / orientation
- character/index
- line map
- measurement
- render create/update/remove
- Illustrator の実例外 message

大規模 logging framework は不要。

## 4. ScriptUI の基本可用性

実験用UIであっても、入力できないほど狭い control をデフォルトサイズ任せにしない。

- 読みなど主要な1行入力欄は `preferredSize` / `characters` 等で十分な幅を確保する。
- 目安として読み入力欄は 360–500 px 程度を確保する。
- 長い診断や理由を表示する場合、画面外に切れないよう適切にwrap/sizeする。
- 見た目の作り込みより、入力・確認・再編集が無理なくできることを優先する。

## 5. テスト方針

純粋処理は Node 側でもテストするが、Node は ExtendScript の代替ではない。

正式機能の完了判定は、少なくとも以下を分けて扱う。

1. pure/static test
2. Illustrator DOM mock test
3. Illustrator 実機 runtime test

Node だけ通っている機能を Gate 完了扱いしない。
