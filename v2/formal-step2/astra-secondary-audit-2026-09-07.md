# Astra secondary audit — 2026-09-07

## Purpose

This document records ChatGPT's second-pass review of the 24 findings reported by Astra against:

- branch: `v2/formal-step2-render-segments`
- reviewed code HEAD: `cfe39a5d9aeee611c049e444622b0f1fa13d017b`
- source of truth: Issue #14

Astra's report is treated as a set of review hypotheses, not as an automatic implementation backlog. The purpose of this pass is to separate confirmed current-route defects from specification decisions, deferred/unsupported features, and claims whose severity depends on product scope.

No runtime gate should be opened from this document alone. Code fixes and gate tests must be reviewed separately.

## Classification vocabulary

- **Confirmed defect**: the reviewed source itself is sufficient to establish the defect or contract violation on the current route.
- **Likely defect**: the source strongly supports the concern, but the exact Illustrator/ExtendScript manifestation or failure mode still needs targeted verification.
- **Specification decision**: the reported behavior is real or plausible, but whether it is a defect depends on the supported product boundary.
- **Deferred / out of scope**: not required for the current Multi Step2 checkpoint if the entry/feature is explicitly excluded.
- **Rejected / overstated**: the report would not be accepted in its stated form. None of the 24 findings is fully rejected in this pass, but several severities are narrowed.

## Executive conclusion

Astra's audit is materially valuable, but it should **not** become a 24-item mandatory implementation list.

For the current `Formal Multi Step2.jsx` path, the highest-confidence blockers are:

1. JSX parse failure from an orphaned `else if`.
2. Annotation-local geometry is not derived from line geometry, so separate annotations on one line can share the same placement box.
3. Reconcile width fitting is not idempotent because the next tracking value is derived from an already-tracked object's current width.
4. Managed-output cleanup uses an ownership set broader than the save target.
5. Transaction rollback does not cover all renderer side effects; in particular, an object created before the managed note is established can escape rollback.
6. Re-resolution does not yet satisfy the intended global no-guess contract for repeated surfaces.
7. Logical split/merge and projection normalization have concrete state-consistency gaps.
8. Persistence and visible rendering are too tightly coupled for the intended long-text editor: one unresolved render plan can block saving unrelated edits.
9. Async save does not define a saved-revision/dirty-state boundary.
10. Current runtime diagnostics are not yet reliable enough to treat a hang as recoverably staged.

Other findings should be handled by **explicitly reducing scope** rather than implementing everything now: normal Step2 legacy entry, TextRange fallback, supplementary-plane Kanji/IVS, mixed typography/style propagation, and advanced split/merge UI can be marked unsupported/deferred for the next checkpoint.

## Finding-by-finding disposition

| # | Astra finding | Secondary disposition | Current checkpoint decision |
|---|---|---|---|
| 1 | Orphaned `else if` prevents JSX startup | **Confirmed defect** | **Fix now.** Add an actual parse gate for the entry script/generated bodies. |
| 2 | Different annotations on one line receive the same line geometry | **Confirmed defect** | **Fix now.** Geometry must correspond to the annotation-local source range, not merely intersecting line membership. |
| 3 | Reconcile tracking/width oscillates across repeated saves | **Confirmed defect** | **Fix now.** Reconcile must be idempotent with respect to tracking, width and left position. |
| 4 | Managed ownership/cleanup deletes outputs outside the save target | **Confirmed defect** | **Fix now.** Define physical source identity and explicit deletion set. Do not equate `same sourceFrameId` with `safe to delete`. |
| 5 | Rollback is incomplete and can leak newly created output | **Confirmed defect, severity narrowed** | **Fix now for side-effect leakage.** Full preservation of every arbitrary Illustrator property is a broader contract decision, but objects created before managed tagging must not escape rollback and `rollback:complete` must not be reported when state is not restored. |
| 6 | Observe cleanup failure can still produce successful observation | **Likely defect** | **Fix or fail closed before runtime.** If temporary objects cannot be removed, the host transaction must not report a clean success. Exact Illustrator cleanup behavior remains runtime-sensitive. |
| 7 | Re-resolution no-guess behavior is local/order-dependent | **Confirmed defect** | **Fix before source-edit runtime.** Resolve repeated occurrences as a global matching problem or leave ambiguous mappings unresolved. |
| 8 | Re-resolution loses saved logical split/merge assets | **Confirmed design gap** | **Do not silently lose them.** Either support preserving logical segmentation across unrelated edits or explicitly exclude source editing after logical split for this checkpoint. |
| 9 | Merge leaves retired child Annotation behind | **Confirmed defect** | **Fix if split/merge remains in supported model.** Otherwise mark split/merge deferred and keep it out of current runtime. |
| 10 | Projection does not normalize shared occurrence/Annotation state | **Confirmed defect** | **Fix current model invariant.** Projection must define which layer is authoritative or reject inconsistent bundles. |
| 11 | Renderability controls whether editor state can be saved | **Confirmed specification conflict** | **Resolve now at product-contract level.** Long-text editor state should be persistable independently of whether every visible annotation can currently render. Rendering failure/unresolved state must be recorded separately. |
| 12 | PointText persistence can report failure after partial note change | **Likely defect** | **Either make bridge-only note write atomic/rollback-aware or declare PointText persistence outside the next checkpoint.** Do not spend runtime budget on PointText until this boundary is explicit. |
| 13 | Normal `Formal Step2.jsx` bypasses Multi semantic guards | **Confirmed for that entry, but out of current main route** | **Deferred / disable from gate.** Do not treat old single-annotation entry tests as evidence for Multi. Decide later whether to retire, repair or merge it. |
| 14 | Normal Step2 hint editor cannot replace/delete reusable hint | **Confirmed for legacy entry** | **Deferred** with #13. |
| 15 | Normal Step2 hint store has malformed/duplicate/version edge cases | **Confirmed for legacy store** | **Deferred** with #13; do not use this store as a current Multi gate. |
| 16 | Numeric/string validation differs between models | **Confirmed gap, current severity limited** | **Tighten shared validators before exposing split/hint editing.** Not a reason by itself to expand the current UI. |
| 17 | Supplementary-plane Kanji/IVS are not extracted correctly | **Specification decision** | **Explicitly unsupported for the current checkpoint.** Do not build a full Unicode/IVS engine now. Record the BMP-oriented extraction limitation and fail/flag unsupported sequences rather than silently claiming full Kanji coverage. |
| 18 | Direct TextRange with a numeric `.length` is treated as an array | **Confirmed fallback bug** | **Deferred for current TextFrame-selection checkpoint.** Fix before TextRange selection is advertised as supported. |
| 19 | User can edit while async save is pending and UI cannot distinguish saved vs dirty state | **Confirmed defect** | **Fix now.** Freeze editing while pending or track request revision + dirty revision and report them distinctly. |
| 20 | Heartbeat/BridgeTalk lifecycle does not guarantee recoverable stage data | **Confirmed diagnostic deficiency; runtime details still host-specific** | **Fix minimally before next hang investigation.** Per-request log identity, initial truncation/write verification, and meaningful stage granularity are required. Do not treat `timeout=30` as execution cancellation. |
| 21 | Gate D diagnostic can leave generated objects behind | **Likely/confirmed diagnostic bug depending on injected failure point** | **Retire or repair before reusing Gate D.** A diagnostic that dirties the test document cannot serve as a gate. |
| 22 | Diagnostic PASS conditions do not prove the asserted property | **Confirmed review/gate weakness** | **Fix gate semantics before reusing results.** PASS must describe only facts actually asserted. |
| 23 | Stored style/offset and mixed source typography are not propagated/measured consistently | **Specification decision with a real propagation gap** | **Do not implement full mixed typography now.** For current checkpoint, define and enforce a narrow supported style contract; reject/ignore unsupported custom values explicitly rather than pretending they are honored. |
| 24 | Manual/docs/old entry descriptions no longer match current workflow | **Confirmed documentation debt** | **Update before next user runtime.** Also label legacy/probe/diagnostic paths so their tests are not used as production-path evidence. |

## Evidence notes from second-pass source review

### Entry-script syntax

The current Multi save callback contains `else if (result.status === "failed")` immediately after the `saveBridgeOnly(...)` call with no matching local `if`. This is a plain parse blocker, not an Illustrator-specific uncertainty.

### Geometry contract

`FormalMultiOrchestration.localLines()` clips source `start/end` to the annotation range but passes `lines[i].geometry` through unchanged. Therefore range membership becomes annotation-local while geometry remains line-global. This is sufficient to accept Astra's core criticism in finding 2 even without adopting its exact fixture.

### Reconcile idempotence

`adapter.jsx` computes `delta = geometry.width - item.width`, then derives a fresh absolute tracking value from that delta. On a reused TextFrame, `item.width` already reflects the previous tracking. The algorithm therefore has no stable zero/reference-width contract. The exact numeric oscillation depends on the host/mock width model, but the idempotence flaw is real.

### Ownership and rollback

`removeStaleManaged()` builds a desired set only from the current plans, then removes all managed items for the same `sourceFrameId` that are absent from the set. Separately, `restoreManaged()` removes all currently managed items and recreates snapshot items with only note/contents/size/tracking/left/top. This confirms that ownership scope and rollback scope are currently broader/narrower respectively than the logical save operation.

The strongest immediate rollback defect is not merely missing font/color data: a newly created TextFrame can exist before its managed note has been successfully assigned, so a rollback scan based only on managed notes cannot necessarily discover it.

### Re-resolution and logical segmentation

The intended design note states that logical split/merge is persisted and lineage should make ancestry explicit. Current re-resolution begins from fresh contiguous-run extraction and matches old occurrences into that fresh set. That does not preserve an existing split topology by itself. Current `mergeAdjacent()` also builds merged lineage from child lineage arrays but not necessarily the child occurrence IDs themselves, while projection uses lineage to decide whether old generated annotations are known/retired. These are genuine model-consistency issues if split/merge is kept in scope.

### Save vs render

The current host bridge performs observation/planning before the note commit. Any unresolved observation/plan throws before persistence. This conflicts with the long-text editor goal if a user should be able to save reading/enabled state even when one annotation lacks enough layout information to render. The correct fix is primarily a state-machine/product-contract decision: persisted editor state and rendered-output status must be separable.

## Scope decision proposed for the next repair cycle

### A. Must fix before the next `Formal Multi Step2.jsx` runtime

- #1 syntax / parse gate
- #2 annotation-local geometry
- #3 reconcile idempotence
- #4 managed ownership deletion set
- #5 transactional side-effect leakage
- #7 repeated-surface no-guess mapping
- #10 projection invariant
- #11 save/render state separation
- #19 async saved-vs-dirty state
- #20 reliable request-scoped heartbeat if hang investigation continues
- #24 current runtime manual/entry map

### B. Decide explicitly before coding; implementation can be avoided by narrowing scope

- #6 observe cleanup: fail closed if cleanup cannot be proven
- #8/#9 logical split/merge across source edits: either support it or keep split/merge out of this checkpoint
- #12 PointText: persistence-only support may be postponed
- #16 malformed numeric/split input: strengthen before exposing those inputs
- #17 supplementary Kanji/IVS: explicitly unsupported for now
- #18 TextRange fallback: explicitly unsupported for now
- #21/#22 old diagnostics: repair only if reused; otherwise retire from gate evidence
- #23 custom style/mixed typography: narrow and document supported styling rather than generalize renderer now

### C. Deferred legacy path

- #13 normal `Formal Step2.jsx`
- #14 normal review editor
- #15 normal hint store

These should not block the Multi checkpoint as long as they are explicitly excluded from the current supported entry and their tests are not cited as proof of Multi safety.

## Reading-input and character-scope note

For the current Illustrator-ruby product goal, the next checkpoint should stay narrow. The reading field should accept the intended Japanese reading character set (hiragana/katakana plus deliberately allowed marks as decided by UI specification) rather than becoming a general arbitrary-text field.

This does **not** make supplementary-plane source Kanji technically supported. Instead, source extraction should state its current supported character range and flag unsupported sequences. Full IVS/supplementary-plane normalization is deferred unless real user material demonstrates that it is a practical requirement.

## Required gates before returning to Illustrator

1. Entry JSX and generated host bodies parse in a test that follows the actual include/generation route.
2. Two annotations on the same line receive distinct, range-correct geometry.
3. Repeating the same reconcile leaves managed count, tracking, width and position unchanged.
4. Transaction failure at each creation/tag/content/attribute/placement/commit boundary leaves no unmanaged residue and does not delete unrelated outputs.
5. Repeated-surface re-resolution cannot inherit state when the global mapping is ambiguous.
6. Occurrence/Annotation projection has one explicit authoritative state contract.
7. Saving editor state is possible independently from successful visible rendering, with render status persisted/reported separately.
8. Pending save has a request/snapshot revision and the UI cannot silently present later edits as already saved.
9. The next runtime procedure names exactly one supported entry (`Formal Multi Step2.jsx`), source frame kind, character limitations, and the diagnostics to collect.

## Review policy after fixes

- Do not convert every Astra finding into code work automatically.
- For each repair, state which supported product contract it satisfies.
- Keep unsupported/deferred features visibly unsupported rather than accepting them and returning `complete`.
- Re-run this secondary audit classification when scope changes, especially if PointText, TextRange, split/merge editing, custom style, or full Unicode Kanji handling becomes a supported feature.
