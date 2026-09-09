# AreaText-native architecture review packet for Astra

## Review scope and current revision

- Repository: `kuniezu/illustrator_ruby_GUI`
- Branch: `v2/area-text-native-one-shot-diagnostic`
- HEAD: `3803be2acfda514cebde42da513e6381e3cfde1b`
- Dispatch: Issue #14 comment [5594559311](https://github.com/kuniezu/illustrator_ruby_GUI/issues/14#issuecomment-5594559311)
- Base requested by the dispatch: `3803be2a`
- Production renderer, production persistence adapter, UI, activation wiring, main, PR, and Issue state remain untouched.

The relevant sequence after the original AreaText scaffold review is:

`8432e1c` A-H evidence hardening → `531ea69` shared diagnostic contracts → `1bf792d` retry semantics → `d55ef1e` BridgeTalk timeout path → `09ec083` visual checkpoint/spec escaping → `c60b584` restart scaffold → `9ac073a` recovery boundaries → `1edb5c6` retirement transition restriction → `fd456e1` activation hardening → `215fb77` manifest invariants → `520cbb3` persistence checkpoint → `0c52d86` exact manifest readback → `3ee6077` reopen reacquisition → `4bfd066` persistence facade → `f83c244` durable coordinator → `91d6414` persisted-state authority → `89fe41c` native output identity → `c811ce9` immutable identity → `0f56714` identity save/reopen checkpoint → `3803be2` source identity replacement regression.

This packet is an independent review input. It does not authorize production wiring.

## A-H runtime evidence and current meaning

The user-run AreaText A-H report was on Illustrator 30.8.1 build 1R, ExtendScript 4.5.6, Windows 64.

| Case | Current evidence | What it proves | What it does not prove |
|---|---|---|---|
| A | Fresh rectangle → `textFrames.areaText(path)` succeeded; AreaText readback; frame removal invalidated the original path reference; disposable counts returned to zero | The supported fresh creation path and observed ownership boundary work on this target | All failure-injection and all Illustrator versions |
| B | Fresh requested bounds matched frame/textPath readback within 0.01 | Fresh rectangle geometry is a viable initial authority on this target | Existing frame/textPath writes as a safe reflow authority |
| C | Multi-character FULLJUSTIFY, single-character CENTER, and glyph scale 100/100/100 read back | The selected enum/style writes are accepted | Japanese visual distribution and readability across fonts/composer versions |
| D | Wide cases had full line coverage; width shortage had partial coverage; height shortage had zero lines | The range/line proof rejects the observed shortage cases | Ink bounds, baseline/vertical gap, and every overset shape |
| E | The first run stopped because fresh AreaText exposed `nextFrame === frame`; the current pure/backend classification accepts strict self-next and rejects foreign links | The correction addresses the observed DOM semantic | The corrected fallback sequence has not yet been rerun in Illustrator |
| F | Pure copy-on-write manifest transitions pass | The pure state machine has the intended phase shape | Illustrator persistence, crash recovery, or partial retirement failure |
| G | Geometry and manual adjustment/version guards were observed or proven in pure state | The baseline formulas and version guard are coherent | Durable per-segment baseline persistence and real user edits after reopen |
| H | BridgeTalk returned a concrete `CAPABILITY_UNAVAILABLE` before the self-next correction; transport, structured result, and receiver return were exercised | Result/error/timeout and receiver return paths are observable; RenderSpec reaches the disposable receiver | A successful native fit after the corrected threading semantics |

The separate identity checkpoint at HEAD `3803be2` was run once by the user and reported PASS for before-save stamping, unique resolution, save, close/reopen resolution, unrelated-frame preservation, identity-based removal, and cleanup. It also exercised identical restamping and both physicalId and sourceFrameId replacement rejection without note mutation.

## Authority and durable state model

The source note contains an isolated native manifest block. Its authority is the persisted source snapshot, not a ruby object note or a transient DOM reference.

The manifest contains `rendererMode`, `manifestRevision`, `activeBindings` (logical segment → physical ID), `renderRecords` (physical ID → verified record), `operation` (`requestId`, `baseRevision`, phase, candidate IDs), and `retirementQueue`. Active and retirement physical IDs must be disjoint; active records must match their logical binding; candidate records must be operation-owned. Lifecycle state is not duplicated in the native output identity note.

The native output identity note contains only:

```text
sourceFrameId
physicalId
```

The identity marker is versioned, encoded, immutable after first write, idempotent for the exact same pair, and fail-closed for malformed, duplicate, unknown, or replacement markers. Resolution scans all text frames and returns `found` only for one exact pair, `missing` for none, and a duplicate error for more than one. Collection order and geometry are not authority.

## Durable transition sequence

The isolated coordinator reads the current persisted source state first, validates the expected source contents and note bytes, applies one pure transition, writes the new native block optimistically, and reads it back canonically.

1. `begin`: persist a `prepare` operation with the base revision and candidate IDs.
2. `verify`: persist `verified` only from `prepare`.
3. `activate`: require `verified`, an unchanged base revision, complete candidate consumption or explicit owned discard, exact binding/record/request identity, and a non-intersecting retirement queue. Switch active bindings and queue retired physical IDs in one new manifest revision.
4. `retire`: remove only IDs already in the retirement queue and never an active ID.
5. `finish`: allowed only after `activated` with an empty retirement queue; clears the operation.

The transition coordinator and persistence facade are isolated modules. They are not called by the production `persistence-adapter.jsx`, renderer, UI, or normal entrypoint.

## Restart and recovery semantics

The persisted manifest derives the recovery action:

- no operation, empty queue → `idle` / finished-recoverable;
- no operation, non-empty queue → cleanup retirement;
- `prepare` → reprepare the same request/candidate set;
- `verified` → reprepare and reverify the same request/candidate set;
- `activated` with a queue → cleanup retirement while keeping the new active generation;
- `activated` with no queue → finish the operation;
- malformed or unknown phase → manual recovery required.

An unknown BridgeTalk result is not treated as cancellation. The intended next step is persisted-state reread and request reconciliation. The actual DOM recovery driver, retry scheduling, and crash-safe cleanup remain unwired.

## Production boundaries intentionally untouched

The following remain explicitly outside this branch's production path:

- `v2/formal-step2/persistence-adapter.jsx` and its existing BridgeTalk save/render path;
- `Formal Multi Step2.jsx`, palette/UI startup, selection and orchestration wiring;
- production renderer replacement and managed ruby activation;
- source manifest writes from normal save/reconcile;
- retirement of existing managed output;
- production PointText/AreaText compatibility selection;
- durable DOM identity lookup in normal re-edit/recovery;
- manual adjustment persistence and segment inheritance;
- main branch, PR, and Issue closure.

The AreaText backend stamps identity on a disposable candidate as a production-adjacent diagnostic step. It does not activate that candidate or retire an old output.

## Original Astra blocker mapping

| Finding | Status at `3803be2` | Evidence / remaining boundary |
|---|---|---|
| B1 fresh AreaText construction and no `kind` mutation | CLOSED for diagnostic/native scaffold | `areaText(path)` and no kind assignment; runtime A/B evidence |
| B2 path ownership and disposal | PARTIALLY CLOSED | Runtime lifecycle and ownership-aware disposal are recorded; production failure injection and all cleanup errors remain unproven |
| B3 self/foreign threading semantics | PARTIALLY CLOSED | `classifyThreading()` accepts none/self and rejects foreign links; the corrected E/H path still needs one Illustrator rerun |
| B4 fit proof / geometry | PARTIALLY CLOSED | Contents/range/line/full-coverage, style, and geometry readback are checked; visual ink bounds and vertical placement remain runtime-only |
| H1 stale revision, binding removal, candidate reconciliation | PARTIALLY CLOSED | Isolated store/coordinator now enforce persisted authority, base revision, removal, discard, and candidate consumption; no production caller or crash driver uses them |
| H2 retry and bounded tracking | CLOSED in the isolated contract | Only line-count/coverage shortage is retryable; zero-lines/style/identity failures stop |
| H3 fit proof overclaim | PARTIALLY CLOSED | Diagnostic labels distinguish runtime/manual evidence; the proof still cannot establish ink-bound containment |
| H4 RenderSpec/receiver strictness | MOSTLY CLOSED | Versions, identities, derived geometry, finite dimensions, fixed glyph scale, null spacing, and tracking policy are validated; real successful H after self-next correction remains open |
| P2 shallow manifest copies | STILL OPEN for production hardening | Isolated pure code retains shallow map values; callers must treat records immutable or deep-copy them |
| P2 manual baseline completeness | STILL OPEN | Generation/renderer/geometry checks exist; segment identity, finite output, and persisted baseline lifecycle remain to be wired |
| P2 serializer/BridgeTalk Unicode and cleanup | PARTIALLY CLOSED | encoded fields, generated parsing, receiver return, timeout and cleanup paths are tested; full runtime path/Unicode/cleanup failure matrix remains open |

## Remaining risks before production wiring

1. Illustrator or process crash can occur between candidate creation, source activation, and retirement cleanup. The persisted phase model describes recovery, but no production driver performs it.
2. A post-activation deletion failure must leave the new active generation and a durable cleanup-pending queue. This is pure/state-tested, not runtime-tested against actual managed objects.
3. Duplicate identity, missing output after reopen, and unrelated-frame filtering are proven for the isolated identity checkpoint, but production inventory and recovery are not wired to use the resolver.
4. Source contents/note optimistic concurrency is implemented in the isolated facade only. Normal save paths can still use the legacy adapter and do not share this authority boundary.
5. Manual adjustment inheritance across split/merge, reflow, generation changes, and reopen is not durable. Array-index or annotation-wide inheritance must not be introduced by wiring convenience.
6. A successful identity save/reopen run does not establish native fit, composer behavior, or production renderer idempotence.
7. The existing production adapter still contains the legacy PointText/kind/tracking path. Native scaffold presence must not be mistaken for normal renderer migration.

## Questions for Astra

Please independently review the packet and current HEAD. May production wiring proceed after the identity checkpoint, or are the following still blocking?

- Is the isolated manifest/coordinator contract sufficient for crash and post-activation cleanup recovery, or is a specific transition still missing?
- Is identity-only resolution sufficient once the production inventory is wired, including duplicate and missing-output handling?
- Is one corrected Illustrator E/H rerun required before accepting self-next threading semantics and native fit in the receiver?
- What is the minimum additional proof required for manual baseline persistence and split/merge correspondence?

Please report only the minimum blocking issues if the answer is not yet GO. Do not broaden the review into a renderer rewrite.

