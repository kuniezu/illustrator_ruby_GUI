# Astra follow-up backlog — 2026-09-07

## Purpose

This document turns Astra's 24-item repository audit into a product-scoped follow-up list. It is not an implementation checklist by itself. Each item is assigned to one of four buckets:

- **NOW** — required for the current `Formal Multi Step2.jsx` completion line.
- **SCOPE DECISION** — decide whether to support or explicitly exclude before implementation.
- **DEFER** — valid concern outside the current supported checkpoint.
- **REVIEW / RETIRE** — diagnostic, legacy, or documentation work to clean up before branch completion.

Primary reference: `astra-secondary-audit-2026-09-07.md`.
Roadmap reference: `completion-roadmap.md`.

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

### #10 Projection invariant

Disposition: **NOW / Gate 3**.

Reason: occurrence and generated Annotation cannot remain contradictory on shared state. Choose an authoritative layer or reject inconsistent bundles.

### #11 Save state independent of renderability

Disposition: **NOW / Gate 1**.

Reason: the long-text editor must be able to preserve editing state even when a particular ruby cannot currently render. `saved`, `render unresolved`, and `render failed` are different facts.

### #19 Pending-save dirty/saved boundary

Disposition: **NOW / Gate 1**.

Reason: asynchronous host save cannot allow later edits to be reported as included in an earlier completed request.

### #20 Request-scoped heartbeat / BridgeTalk diagnostics

Disposition: **NOW only while hang investigation is active / Gate 1**.

Reason: the next hang investigation needs reliable per-request staging. This is temporary diagnostic infrastructure and should be pruned after the host issue is understood.

### #24 Current entry/manual mismatch

Disposition: **NOW before runtime / Gates 0, 4, 6**.

Reason: the user checkpoint must name the actual supported entry and not rely on stale legacy instructions.

## SCOPE DECISION — do not implement until the supported boundary is chosen

### #6 Temporary observe-object cleanup failure

Disposition: **SCOPE DECISION, default = fail closed**.

Recommended current-cycle rule: if renderer-created measurement/outline objects cannot be removed, do not report clean render/save success. Do not spend time building generalized cleanup recovery unless real host behavior requires it.

### #8 Logical split/merge preservation across source edits

Disposition: **SCOPE DECISION, default = defer advanced split/merge from next checkpoint**.

Reason: preserving an edited logical segmentation topology across arbitrary source edits is a real design problem, but not necessary for the first practical multi-ruby completion line.

If split/merge is kept out of the runtime checkpoint, the UI/manual must not imply that it is production-ready.

### #9 Merge leaves retired child Annotation

Disposition: **SCOPE DECISION tied to #8**.

If split/merge remains supported in the current model API, fix before claiming that feature stable. If advanced split/merge is excluded from this cycle, record the defect and do not use split/merge as a runtime gate.

### #12 PointText partial-success persistence

Disposition: **SCOPE DECISION, default = exclude PointText from next completion checkpoint**.

Reason: PointText visible rendering is already outside the current renderer contract. Avoid spending runtime/debug budget on a secondary persistence-only path until the AreaText product path is stable.

### #16 Validator inconsistency

Disposition: **SCOPE DECISION / tighten when exposing the corresponding input**.

Current requirement: reject malformed values at public/current entry boundaries. A complete shared validation framework can wait until split/hint editing is promoted.

### #17 Supplementary-plane Kanji / IVS

Disposition: **SCOPE DECISION, current result = explicitly unsupported**.

Reason: the current extractor is BMP-oriented. This is a valid limitation, not a mandate to build full Unicode/IVS support now.

Current product action:

- reading input should be constrained to the intended kana-oriented character set;
- source extraction limitations should be documented;
- unsupported sequences should not be silently advertised as fully supported Kanji handling.

Promote only when actual user material shows a practical need.

### #23 Custom style / mixed typography propagation

Disposition: **SCOPE DECISION, current result = narrow supported style contract**.

Reason: full mixed-font/layout support is outside the current completion line. The current path should either honor the renderer-owned basic style contract or explicitly reject/ignore unsupported custom styling without pretending complete support.

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

Current completion checkpoint should require an explicitly selected TextFrame/AreaText. Fix before TextRange selection is advertised as supported.

## REVIEW / RETIRE — gate and cleanup debt

### #21 Gate D diagnostic can dirty the document

Disposition: **REVIEW / RETIRE before reuse**.

If Gate D is no longer needed, retire it from completion evidence. If reused, fix cleanup first and verify baseline restoration.

### #22 Diagnostic PASS does not prove all advertised properties

Disposition: **REVIEW / RETIRE before reuse**.

PASS labels must be narrowed to the facts actually asserted. Production-path gate tests should replace proxy diagnostics where possible.

## Cross-cutting product decisions already made

For the next completion checkpoint, use these assumptions unless explicitly changed:

1. Primary product path is **`Formal Multi Step2.jsx`**.
2. Visible ruby target is **horizontal AreaText**.
3. PointText is not part of the next visible-render checkpoint.
4. Direct TextRange selection is not a supported checkpoint requirement.
5. Supplementary-plane Kanji / IVS are not full-support requirements for this cycle.
6. Full mixed typography/custom styling is not a completion requirement.
7. Advanced logical split/merge across source edits is not required for the first practical completion checkpoint.
8. Reading input should be kana-oriented rather than arbitrary text; exact allowed characters should be specified when the UI validation is implemented.
9. Ordinary source edits and repeated-surface no-guess behavior remain in scope.
10. Save-state integrity, ownership safety, idempotent rendering, and basic correct placement are non-negotiable.

## When a deferred item should be promoted

Promote a deferred/scope item to NOW only when at least one of the following is true:

- the supported user workflow actually reaches it;
- a real document demonstrates it is common enough to block practical use;
- another NOW fix depends on its contract;
- the UI currently accepts the condition and misleadingly reports success rather than rejecting it.

Do not promote an item merely because the implementation could theoretically support it.

## Next handoff to Codex/Luna

Codex/Luna should not receive all 24 findings as one repair prompt. Work should follow `completion-roadmap.md` gate by gate. The first implementation cycle should be **Gate 0 only** unless a very small adjacent fix is necessary to make its tests meaningful.

After each gate:

- ChatGPT reviews the actual production execution path;
- A–J mutual audit and branch-pruning audit run;
- the Astra backlog disposition is updated only if scope or evidence changes;
- runtime stays closed until Gates 0–4 required items are satisfied.
