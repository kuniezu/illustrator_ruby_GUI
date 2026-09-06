# Formal Multi Step2 completion roadmap

## Goal

This roadmap defines the practical completion line for the current v2 long-text workflow. It is intentionally narrower than the complete Astra audit. The product goal is not to solve every possible Japanese-text, Illustrator DOM, or typography case before the tool becomes useful.

Current primary entry:

- `v2/formal-step2/Formal Multi Step2.jsx`

Current working completion line:

> For horizontal AreaText, the user can split or merge the currently handled Kanji run into the desired reading units, assign hiragana readings only to the units that need ruby, save and reopen the state, repeat save/render without drift or duplication, make ordinary source-text edits without silent reading transfer, and avoid damaging unrelated text or ruby outputs.

The next runtime checkpoint must not include features explicitly marked unsupported or deferred below.

## Product decisions fixed on 2026-09-07

- Reading input accepts **hiragana only**. Small kana such as `っ` / `ゃ` / `ゅ` / `ょ` are allowed; the tool does not enforce editorial pronunciation rules beyond the script restriction.
- Visible ruby rendering is **horizontal AreaText only**. PointText is outside this cycle's supported product path.
- Split/Merge are **required local editing operations**. They act only on the currently handled contiguous Kanji run or its local child units. They must not automatically repartition unrelated occurrences elsewhere in the document.
- If an unsupported supplementary-plane Kanji / IVS occurs inside a candidate Kanji run, the **whole run is treated as unsupported and warned about** rather than silently splitting around the character.
- Persisted reading state and visible rendering are separate outcomes. When persistence succeeds but rendering does not, the user-facing message is: **「ルビの描画に問題がありました。読みの情報は保持しています」**.

## Gate 0 — Repair the executable and test gate

Purpose: make sure the program being reviewed is actually the program being tested.

Work:

- Fix the current entry-script syntax error.
- Add a parse/syntax gate for the actual entry after include preprocessing or an equivalent faithful build step.
- Parse generated BridgeTalk bodies used by the production path.
- Stop using string-presence tests or unrelated pure wrappers as evidence that the production entry is executable.

Completion criteria:

- `Formal Multi Step2.jsx` passes the agreed static syntax gate.
- Generated host bodies parse under the supported ExtendScript-compatible syntax subset.
- Tests fail when an orphaned branch or malformed generated body is introduced.

Astra findings primarily covered: #1, #22, #24.

## Gate 1 — Safe save and side-effect boundary

Purpose: prevent a failed save/render attempt from leaving the Illustrator document in a misleading or partially modified state.

Work:

- Separate persisted editor state from visible-render success.
- Define managed-output ownership by physical source identity plus logical ownership; do not delete every output sharing only `sourceFrameId`.
- Make renderer rollback cover newly created objects before managed tagging as well as already-managed objects.
- Fail closed when temporary measurement/outline cleanup cannot be verified.
- Define pending-save request identity and saved-vs-dirty revision state.
- Keep heartbeat request-scoped, initialized before send, and verifiably writable when hang diagnostics are enabled.

Completion criteria:

- Reading/enabled edits can be saved even if one annotation is not renderable.
- A failed transaction leaves no unmanaged residue and does not delete unrelated managed output.
- UI distinguishes saved state, unsaved later edits, render-unresolved, render-failed, and rollback-failed.
- Pending operations cannot silently report later edits as already saved.
- Persistence success + rendering failure surfaces the agreed message while retaining the reading information.

Astra findings primarily covered: #4, #5, #6, #11, #19, #20.

## Gate 2 — Correct and repeatable basic ruby rendering

Purpose: make ordinary multi-ruby output visibly correct and stable.

Work:

- Derive geometry for the actual annotation-local source range rather than reusing whole-line geometry.
- Make width fitting/tracking idempotent on reused managed TextFrames.
- Verify multiple annotations on the same line receive distinct positions.
- Preserve non-target managed output and foreign/unmanaged text.

Completion criteria:

- Two or more annotations on one line render at their correct individual positions.
- Repeating save/render leaves managed count, tracking, width, left/top and reading unchanged.
- Deleting/disabling one supported annotation removes only its managed output.

Astra findings primarily covered: #2, #3, #4.

## Gate 3 — Stable logical state, local Split/Merge, and ordinary source edits

Purpose: preserve the user's reading-unit decisions when the source text changes, without guessing or rewriting unrelated units.

Work:

- Make repeated-surface re-resolution a global ambiguity decision rather than old-occurrence processing order.
- Define the authoritative occurrence/Annotation fields and make projection normalize or reject inconsistent state.
- Keep Split/Merge local to the currently handled Kanji run. Split divides that run into local reading units; Merge recombines only adjacent local units selected by the user.
- Preserve unrelated occurrences and their readings exactly; Split/Merge on one run must not trigger automatic repartitioning elsewhere.
- When ordinary source edits occur outside a locally split run, preserve that run's segmentation if the run itself still resolves unambiguously.
- When the edited source changes inside a previously split run so that its old local segmentation can no longer be mapped safely, mark only that affected run unresolved rather than guessing or discarding other runs' state.

Completion criteria:

- Repeated surfaces never inherit reading when more than one globally plausible mapping remains.
- Projection is idempotent and has one explicit source of truth for shared fields.
- Split/Merge changes only the selected/local run and does not modify unrelated occurrences.
- A split run survives unrelated prefix/suffix/nearby edits when its own source mapping remains unambiguous.
- If a source edit invalidates a local split, that run alone becomes unresolved; unrelated readings remain intact.
- Merge retires the merged child units cleanly without leaving stale child Annotations or ruby outputs.

Astra findings primarily covered: #7, #8, #9, #10.

## Gate 4 — Freeze the supported product boundary

Purpose: prevent the repair cycle from becoming an open-ended Japanese typography/Unicode project.

Supported for the next completion checkpoint:

- horizontal AreaText
- the current Multi entry only
- multiple logical occurrences
- local Split/Merge of the currently handled Kanji run
- hiragana-only reading input
- ordinary source editing with safe/no-guess re-resolution
- basic renderer-owned ruby appearance used by the current adapter

Explicitly unsupported or deferred unless separately promoted:

- PointText
- direct TextRange selection fallback
- supplementary-plane Kanji / IVS as supported extraction targets; a run containing them is warned and treated as unsupported
- arbitrary mixed-font / mixed-size / custom style propagation
- automatic/global resegmentation of other words when one run is split or merged
- legacy single-annotation `Formal Step2.jsx` as a production gate
- legacy hint editor/store as evidence for the Multi path

Completion criteria:

- Unsupported input/entry paths are rejected, disabled, or clearly labeled instead of being accepted and returning a misleading `complete`.
- The runtime manual names only the supported path and limitations.

Astra findings primarily covered: #12–#18, #23, #24.

## Gate 5 — One batched Illustrator runtime checkpoint

Purpose: spend real-machine time only after pure/static blockers are closed.

Required runtime scope:

- saved horizontal AreaText
- several Kanji occurrences, including at least two on one line
- split one longer Kanji run into local reading units; assign hiragana only to selected units
- merge adjacent local units and verify unrelated units/readings remain untouched
- set readings, confirm, save
- rerun and verify persistence
- save again and verify no duplication or position/tracking drift
- add and delete ordinary source text and verify safe re-resolution
- disable/clear one reading and verify only its ruby is removed
- preserve foreign/unmanaged text and unrelated managed output
- if a render-only problem occurs, verify reading information remains and the agreed user-facing message is shown
- if a hang occurs, recover the request-specific heartbeat stage

Runtime is a verification gate, not a debugging loop. New pure/static defects found during review return the work to the appropriate earlier gate.

## Gate 6 — Cleanup and completion decision

Purpose: finish the branch without carrying experimental scaffolding indefinitely.

Work:

- Remove or demote temporary heartbeat/probe code once its diagnostic purpose is complete.
- Retire obsolete direct-save/fallback/probe paths not part of the supported workflow.
- Update `manual-multi-check.md` or replace it with one current runtime procedure.
- Make tests and docs clearly distinguish production path, legacy path, diagnostics, and research probes.
- Review Issue #14 against this roadmap.

Completion criteria:

- No known current-scope P1/P2 defect remains open.
- Deferred items are recorded as deferred rather than silently accepted.
- Runtime checkpoint passes.
- Branch-pruning audit finds no obvious obsolete experimental branch that should be removed before PR consideration.

## What “done” means for this cycle

This cycle is done when the current Multi workflow is a dependable practical Illustrator ruby tool for its explicitly supported horizontal-AreaText use case: local Split/Merge, hiragana readings on only the units that need ruby, stable save/reopen/re-render behavior, safe ordinary source edits, and no collateral damage to unrelated text or ruby outputs.

It is **not** contingent on complete Unicode Kanji coverage, a general Japanese layout engine, full mixed typography support, PointText, automatic global resegmentation, or preservation of every legacy/prototype entry.
