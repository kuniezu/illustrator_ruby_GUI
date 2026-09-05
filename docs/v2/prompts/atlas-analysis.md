# Atlas Analysis Handoff

対象ブランチ: `docs/v2-spec-sol-analysis`

このリポジトリのv2再設計について、**実装はまだ行わず、独立した設計分析**をしてください。

## 文書の扱い

最初に必ず以下を読んでください。

### 要求仕様 — 正本候補・変更禁止

- `docs/v2/spec/00-product-goals.md`
- `docs/v2/spec/01-workflow-and-ruby-rules.md`
- `docs/v2/spec/02-reedit-layout-persistence.md`
- `docs/v2/spec/03-reading-dictionary-style.md`
- `docs/v2/spec/90-open-questions.md`

これらはユーザーとSolの対話で合意した要求です。

**分析の都合で勝手に書き換えないでください。**

矛盾、技術的問題、曖昧さを発見した場合は、仕様を書き換えず、分析文書の中で指摘してください。

### 実機・現行実装のfindings — 観測事実として扱う

- `docs/v2/findings/current-and-phase1-findings.md`

加えて以下を自分で確認してください。

- `README.md`
- `requirements.md`
- `docs/exhibition-ruby-spec.md`
- `docs/phase0-architecture-review.md`
- current `main` implementation
- Issue #2, #4, #6, #7, #9
- PR #5
- PR #8 と全実機検証コメント
- upstream由来の設計・layout code

### Sol分析 — 参考意見であり正解ではない

- `docs/v2/analysis/sol/architecture-assessment.md`
- `docs/v2/analysis/sol/reuse-vs-rewrite.md`
- `docs/v2/analysis/sol/candidate-architecture.md`
- `docs/v2/analysis/sol/risks-and-decision-points.md`

Sol分析は参照して構いませんが、**追認しないでください。**

まず現行コード、仕様、findingsから自分の結論を作り、その後Sol案と比較してください。Solと異なる設計を推奨する場合は、その方が有益です。

## 最終的な製品像

これは「選択した文字に一度ルビを配置するスクリプト」ではありません。

展示パネル、博物館解説文、教材等の長文について、Illustrator文書内でルビを意味データとして管理し、保存・再オープン後も生成・確認・修正・再編集・再配置できるツールを目指します。

特に重要:

- 基本は単語・語句単位のRubyAnnotation
- 全漢字へ常時reading alignmentを持たせない
- 連続漢字列を基本語候補とし、かな等で分割
- 括弧のまとまり
- manual split / merge
- visual line wrap時だけreading split位置を確認
- sparse split hintを保存して再利用
- 一行に戻れば元の1語1ルビへ戻す
- generated TextFrameを正本にしない
- save/reopen後も再編集
- native Illustrator uuidを永続IDとして信用しない
- ambiguous anchorは自動確定しない
- rendererは冪等
- 現行GUI、Ruby layer、wrapper方式を維持する前提にしない
- IME native API連携はMVP必須ではない
- 長文review型UXを重視

## 分析してほしい論点

1. 現行アーキテクチャの責務とデータフロー
2. v2要求との根本的な不一致点
3. 現行コードの実際の再利用可能率
4. `reuse as-is` / `reuse concept & rewrite` / `discard` の分類
5. RubyAnnotation domain model
6. Persistence Store
7. source frame stable identity
8. Anchor Resolver
9. Tokenizer / manual boundaries
10. actual visual line boundary detection
11. Logical AnnotationとRender Segmentの分離
12. sparse split hint方式の妥当性・弱点
13. Layout Engine
14. idempotent Renderer
15. body move時のtransform coupling
16. managed host/group方式とnon-group方式の比較
17. long-text review UI
18. Reading Provider / dictionariesの境界
19. ScriptUI / persistent panel等の選択
20. legacy migration方針
21. Illustrator version / Windows / macOSリスク
22. 実装前に必要なPoC
23. 開発順序
24. repo戦略:
   - A: 現行実装を拡張
   - B: 同一repoでlegacyを固定しv2再実装
   - C: 別repoで新規実装

## 成果物

次を新規作成してください。

```text
docs/v2/analysis/atlas/
  architecture-assessment.md
  reuse-vs-rewrite.md
  candidate-architecture.md
  risks-and-poc.md
  critique-of-sol-analysis.md
```

`critique-of-sol-analysis.md` では、Sol分析について:

- 同意する点
- 異論がある点
- 見落とし
- 過剰設計と思う点
- もっと単純化できる点

を具体的に示してください。

## Git運用

- `docs/v2-spec-sol-analysis` ブランチをそのまま使用
- 新しいbranch / PR / worktreeは作らない
- PR #8をマージしない
- production codeを変更しない
- `docs/v2/spec/` を変更しない
- Solのanalysisを変更しない
- Atlasのanalysisファイルだけ追加する
- 分析文書作成後、commit・pushして停止する

## 重要

技術的に実装可能かどうかだけではなく、長期的な保守性、Illustrator DOMの不安定さ、展示制作の実際の校正フローを考慮してください。

設計を複雑にすること自体を目的にせず、より単純で堅牢な案があれば積極的に提案してください。
