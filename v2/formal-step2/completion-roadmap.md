# Formal Multi Step2 completion roadmap

## Goal

This roadmap defines the practical completion line for the current v2 long-text workflow. It is intentionally narrower than the complete Astra audit. The product goal is not to solve every possible Japanese-text, Illustrator DOM, or typography case before the tool becomes useful.

Current primary entry:

- `v2/formal-step2/Formal Multi Step2.jsx`

Current working completion line:

> For horizontal AreaText, the user can assign kana readings to multiple Kanji occurrences, save and reopen the state, repeat save/render without drift or duplication, make ordinary source-text edits without silent reading transfer, and avoid damaging unrelated text or managed ruby outputs.

The next runtime checkpoint must not include features explicitly marked unsupported or deferred below.

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

## Gate 3 — Stable logical state and ordinary source edits

Purpose: preserve the user's reading decisions when the source text changes, without guessing.

Work:

- Make repeated-surface re-resolution a global ambiguity decision rather than old-occurrence processing order.
- Define the authoritative occurrence/Annotation fields and make projection normalize or reject inconsistent state.
- Support ordinary source edits needed for the checkpoint: additions/deletions that leave an unambiguous existing occurrence match.

Completion criteria:

- Repeated surfaces never inherit reading when more than one globally plausible mapping remains.
- Projection is idempotent and has one explicit source of truth for shared fields.
- Ordinary prefix/suffix/nearby edits preserve unambiguous readings and report ambiguous/missing cases without guessing.

Astra findings primarily covered: #7, #10.

## Gate 4 — Freeze the supported product boundary

Purpose: prevent the repair cycle from becoming an open-ended Japanese typography/Unicode project.

Supported for the next completion checkpoint:

- horizontal AreaText
- the current Multi entry only
- multiple logical occurrences
- kana-oriented reading input under an explicitly defined allowed-character policy
- ordinary source editing with safe/no-guess re-resolution
- basic renderer-owned ruby appearance used by the current adapter

Explicitly unsupported or deferred unless separately promoted:

- PointText visible ruby rendering
- direct TextRange selection fallback
- supplementary-plane Kanji / IVS as fully supported extraction targets
- arbitrary mixed-font / mixed-size / custom style propagation
- advanced logical split/merge editing across source edits
- legacy single-annotation `Formal Step2.jsx` as a production gate
- legacy hint editor/store as evidence for the Multi path

Completion criteria:

- Unsupported input/entry paths are rejected, disabled, or clearly labeled instead of being accepted and returning a misleading `complete`.
- The runtime manual names only the supported path and limitations.

Astra findings primarily covered: #8, #9, #12–#18, #23, #24.

## Gate 5 — One batched Illustrator runtime checkpoint

Purpose: spend real-machine time only after pure/static blockers are closed.

Required runtime scope:

- saved horizontal AreaText
- several Kanji occurrences, including at least two on one line
- set readings, confirm, save
- rerun and verify persistence
- save again and verify no duplication or position/tracking drift
- add and delete ordinary source text and verify safe re-resolution
- disable/clear one reading and verify only its ruby is removed
- preserve foreign/unmanaged text and unrelated managed output
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

This cycle is done when the current Multi workflow is a dependable practical Illustrator ruby tool for its explicitly supported horizontal-AreaText use case. It is **not** contingent on complete Unicode Kanji coverage, a general Japanese layout engine, full mixed typography support, or preservation of every legacy/prototype entry.
