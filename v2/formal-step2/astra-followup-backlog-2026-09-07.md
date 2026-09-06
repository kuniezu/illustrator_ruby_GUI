# Astra follow-up backlog — 2026-09-07

## Purpose

This document turns Astra's 24-item repository audit into a product-scoped follow-up list. It is not an implementation checklist by itself. Each item is assigned to one of four buckets:

- **NOW** — required for the current `Formal Multi Step2.jsx` completion line.
- **SCOPE DECISION** — decide whether to support or explicitly exclude before implementation.
- **DEFER** — valid concern outside the current supported checkpoint.
- **REVIEW / RETIRE** — diagnostic, legacy, or documentation work to clean up before branch completion.

Primary reference: `astra-secondary-audit-2026-09-07.md`.
Roadmap reference: `completion-roadmap.md`.

## Product decisions fixed on 2026-09-07

1. Reading input is **hiragana only**. Small kana are allowed; the tool does not normalize them to larger kana or enforce editorial pronunciation style.
2. Product target is **horizontal AreaText only** for this cycle. PointText is unsupported.
3. Split/Merge are **required**, but their scope is deliberately local: they operate only on the currently handled contiguous Kanji run / its adjacent local child units. They do not automatically repartition unrelated words elsewhere.
4. If a supplementary-plane Kanji / IVS occurs inside a candidate Kanji run, the **whole run is marked unsupported with a warning** rather than silently split around the character.
5. Saving reading state and drawing ruby are separate outcomes. If persistence succeeds but rendering fails, show: **「ルビの描画に問題がありました。読みの情報は保持しています」**.

## NOW — current Multi path blockers

### #1 Entry JSX syntax error

Disposition: **NOW / Gate 0**.

Reason: plain startup blocker. Add a real syntax gate so this class cannot recur unnoticed.

### #2 Annotation-local geometry

Disposition: **NOW / Gate 2**.

Reason: basic visible correctness. Multiple words on one line cannot share the whole-line placement geometry.

### #3 Tracking/width idempotence

Disposition: **NOW / Gate 2**.

Reason: repeated save/render must not move or oscillate ruby output.

### #4 Managed-output ownership and deletion set

Disposition: **NOW / Gates 1–2**.

Reason: saving one source/annotation must not delete or reuse unrelated output. Physical source identity and logical target set need a clear contract.

### #5 Rollback side-effect leakage

Disposition: **NOW / Gate 1**.

Reason: failed renderer transaction must not leave newly created untagged output or falsely report rollback complete.

Scope note: full preservation of every arbitrary Illustrator object property is not automatically required for this cycle; restore guarantees should cover the properties/objects the renderer owns and document any narrower contract.

### #7 Re-resolution global no-guess

Disposition: **NOW / Gate 3**.

Reason: repeated surfaces must not inherit readings according to processing order when the mapping is globally ambiguous.

### #8 Logical split preservation across source edits

Disposition: **NOW, narrowed to local-run semantics / Gate 3**.

Reason: Split is required for practical use because a long contiguous Kanji run may contain only some units that need ruby. The product does **not** need global automatic resegmentation.

Current contract:

- Split affects only the currently handled run.
- Unrelated runs and readings are untouched.
- If source edits occur elsewhere and the split run still resolves unambiguously, preserve that run's local segmentation.
- If the source edit changes the contents of the split run so the old boundaries cannot be mapped safely, mark that run unresolved; do not guess and do not discard unrelated runs' state.

### #9 Merge leaves retired child Annotation

Disposition: **NOW, narrowed to local merge / Gate 3**.

Reason: Merge is required as the local inverse of Split. It only recombines adjacent local units explicitly chosen by the user. Merging one local group must retire those child Annotations/outputs cleanly and must not alter other occurrences.

### #10 Projection invariant

Disposition: **NOW / Gate 3**.

Reason: occurrence and generated Annotation cannot remain contradictory on shared state. Choose an authoritative layer or reject inconsistent bundles.

### #11 Save state independent of renderability

Disposition: **NOW / Gate 1**.

Reason: the long-text editor must be able to preserve editing state even when a particular ruby cannot currently render. `saved`, `render unresolved`, and `render failed` are different facts.

User-facing contract on persistence success + render problem:

> ルビの描画に問題がありました。読みの情報は保持しています

### #19 Pending-save dirty/saved boundary

Disposition: **NOW / Gate 1**.

Reason: asynchronous host save cannot allow later edits to be reported as included in an earlier completed request.

### #20 Request-scoped heartbeat / BridgeTalk diagnostics

Disposition: **NOW only while hang investigation is active / Gate 1**.

Reason: the next hang investigation needs reliable per-request staging. This is temporary diagnostic infrastructure and should be pruned after the host issue is understood.

### #24 Current entry/manual mismatch

Disposition: **NOW before runtime / Gates 0, 4, 6**.

Reason: the user checkpoint must name the actual supported entry and not rely on stale legacy instructions.

## SCOPE DECISION — resolved for this cycle unless later evidence promotes work

### #6 Temporary observe-object cleanup failure

Disposition: **resolved = fail closed**.

If renderer-created measurement/outline objects cannot be removed, do not report clean render/save success. Do not build generalized recovery unless real host behavior proves it necessary.

### #12 PointText partial-success persistence

Disposition: **resolved = unsupported this cycle**.

AreaText only. PointText persistence-only behavior is not part of the completion contract and should not consume runtime/debug budget.

### #16 Validator inconsistency

Disposition: **narrow current requirement**.

Reject malformed values at current public boundaries. Split/Merge boundaries used by the supported local UI must be validated as finite integer UTF-16 positions inside the selected run. A general shared validation framework can follow later.

### #17 Supplementary-plane Kanji / IVS

Disposition: **resolved = whole-run unsupported warning**.

The extractor remains BMP-oriented for this cycle. If a candidate contiguous Kanji run contains an unsupported supplementary-plane/IVS sequence, do not silently split the run and treat fragments as normal candidates. Mark the whole run unsupported and warn the user.

### #23 Custom style / mixed typography propagation

Disposition: **resolved = narrow supported style contract**.

Full mixed-font/layout support is outside the completion line. The current path should honor the renderer-owned basic style contract; unsupported custom styling must not be advertised as fully supported.

## DEFER — valid issues outside the current primary entry

### #13 Legacy `Formal Step2.jsx` semantic guards

Disposition: **DEFER**.

Do not use legacy single-annotation success as evidence for Multi safety. Later decide whether to retire, repair, or merge the entry.

### #14 Legacy reusable SplitHint editor cannot replace/delete hints

Disposition: **DEFER with #13**.

### #15 Legacy Step2 hint store malformed/version edge cases

Disposition: **DEFER with #13**.

### #18 Direct TextRange fallback misreads `.length`

Disposition: **DEFER**.

Current completion checkpoint requires an explicitly selected horizontal AreaText TextFrame. Fix before TextRange selection is advertised as supported.

## REVIEW / RETIRE — gate and cleanup debt

### #21 Gate D diagnostic can dirty the document

Disposition: **REVIEW / RETIRE before reuse**.

If Gate D is no longer needed, retire it from completion evidence. If reused, fix cleanup first and verify baseline restoration.

### #22 Diagnostic PASS does not prove all advertised properties

Disposition: **REVIEW / RETIRE before reuse**.

PASS labels must be narrowed to the facts actually asserted. Production-path gate tests should replace proxy diagnostics where possible.

## Cross-cutting product contract

For the next completion checkpoint:

1. Primary product path is `Formal Multi Step2.jsx`.
2. Visible ruby target is horizontal AreaText only.
3. Reading input is hiragana only; small kana remain user-entered as-is.
4. Split/Merge are first-class local operations on the currently handled Kanji run.
5. Split/Merge never imply automatic editing of unrelated occurrences elsewhere.
6. A locally split run should survive unrelated source edits when its own identity remains unambiguous; changes inside that run may make only that run unresolved.
7. Merge of adjacent local children must remove/retire only those children and their managed outputs.
8. Supplementary-plane Kanji / IVS make the whole candidate run unsupported with a warning for this cycle.
9. Save-state integrity is independent from visible-render success; persistence success must survive a rendering problem.
10. PointText, direct TextRange, full mixed typography, and legacy single-annotation Step2 are outside the completion contract.
11. Ordinary source edits and repeated-surface no-guess behavior remain in scope.
12. Ownership safety, idempotent rendering, and basic correct placement are non-negotiable.

## When a deferred item should be promoted

Promote a deferred item to NOW only when at least one of the following is true:

- the supported user workflow actually reaches it;
- a real document demonstrates it is common enough to block practical use;
- another NOW fix depends on its contract;
- the UI currently accepts the condition and misleadingly reports success rather than rejecting it.

Do not promote an item merely because the implementation could theoretically support it.

## Next handoff to Codex/Luna

Codex/Luna should not receive all 24 findings as one repair prompt. Work should follow `completion-roadmap.md` gate by gate. The first implementation cycle should be **Gate 0 only** unless a very small adjacent fix is necessary to make its tests meaningful.

When Gate 3 is reached, implement Split/Merge according to the local-run contract above; do not solve arbitrary whole-document segmentation.

After each gate:

- ChatGPT reviews the actual production execution path;
- A–J mutual audit and branch-pruning audit run;
- the Astra backlog disposition is updated only if scope or evidence changes;
- runtime stays closed until Gates 0–4 required items are satisfied.
